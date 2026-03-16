const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResp(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function hmacSha256Base64(data: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);

  try {
    const rawBody = await req.text();
    console.log("Raw body length:", rawBody.length);

    if (!rawBody || rawBody.length === 0) {
      return jsonResp({ error: "Request body bos geldi." }, 400);
    }

    let body: Record<string, string>;
    try {
      body = JSON.parse(rawBody);
    } catch (parseErr) {
      return jsonResp({ error: "JSON parse hatasi: " + String(parseErr), raw: rawBody.substring(0, 200) }, 400);
    }

    const MERCHANT_ID = Deno.env.get("PAYTR_MERCHANT_ID") ?? body.merchant_id ?? "";
    const MERCHANT_KEY = Deno.env.get("PAYTR_MERCHANT_KEY") ?? "";
    const MERCHANT_SALT = Deno.env.get("PAYTR_MERCHANT_SALT") ?? "";

    if (!MERCHANT_ID || !MERCHANT_KEY || !MERCHANT_SALT) {
      return jsonResp({ error: "PayTR credentials eksik." }, 503);
    }

    const merchant_oid = body.merchant_oid ?? "";
    const email = body.email ?? "";
    const payment_amount = String(body.payment_amount ?? "");
    const user_name = body.user_name ?? "";
    const user_address = body.user_address ?? "Turkiye";
    const user_phone = body.user_phone ?? "05000000000";
    const merchant_ok_url = body.merchant_ok_url ?? "";
    const merchant_fail_url = body.merchant_fail_url ?? "";
    const user_basket = body.user_basket ?? "";
    const currency = body.currency ?? "TL";
    const test_mode = body.test_mode ?? "1";
    const no_installment = body.no_installment ?? "1";
    const max_installment = body.max_installment ?? "0";
    const lang = body.lang ?? "tr";

    const required: Record<string, string> = { merchant_oid, email, payment_amount, user_name, user_basket, merchant_ok_url, merchant_fail_url };
    for (const [k, v] of Object.entries(required)) {
      if (!v) return jsonResp({ error: "Zorunlu alan eksik: " + k }, 400);
    }

    const userIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "1.1.1.1";

    const hashStr = MERCHANT_ID + userIp + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode;
    const paytrToken = await hmacSha256Base64(hashStr + MERCHANT_SALT, MERCHANT_KEY);

    console.log("PayTR API cagrilacak, merchant_oid:", merchant_oid, "test_mode:", test_mode);

    const formData = new URLSearchParams();
    formData.append("merchant_id", MERCHANT_ID);
    formData.append("user_ip", userIp);
    formData.append("merchant_oid", merchant_oid);
    formData.append("email", email);
    formData.append("payment_amount", payment_amount);
    formData.append("paytr_token", paytrToken);
    formData.append("user_basket", user_basket);
    formData.append("debug_on", "1");
    formData.append("no_installment", no_installment);
    formData.append("max_installment", max_installment);
    formData.append("user_name", user_name.substring(0, 25));
    formData.append("user_address", (user_address || "Turkiye").substring(0, 200));
    formData.append("user_phone", user_phone || "05000000000");
    formData.append("merchant_ok_url", merchant_ok_url);
    formData.append("merchant_fail_url", merchant_fail_url);
    formData.append("timeout_limit", "30");
    formData.append("currency", currency);
    formData.append("test_mode", test_mode);
    formData.append("lang", lang);

    const res = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const resText = await res.text();
    console.log("PayTR API response status:", res.status, "body:", resText.substring(0, 500));

    let data: Record<string, string>;
    try {
      data = JSON.parse(resText);
    } catch (_e) {
      return jsonResp({ error: "PayTR API JSON parse hatasi", paytrStatus: res.status, paytrResponse: resText.substring(0, 300) }, 502);
    }

    if (data.status === "success") {
      return jsonResp({ token: data.token }, 200);
    }

    console.error("PayTR token hatasi:", data);
    return jsonResp({ error: data.reason || "Token alinamadi", detail: data }, 400);
  } catch (err) {
    console.error("paytr-token error:", err);
    return jsonResp({ error: String(err) }, 500);
  }
});
