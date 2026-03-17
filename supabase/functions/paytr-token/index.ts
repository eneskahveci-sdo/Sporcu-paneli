// PayTR Token Edge Function v2
// Düzeltmeler:
// - Credential'lar trim ediliyor (başında/sonunda boşluk/newline olabilir)
// - Detaylı hash debug loglama (PayTR hash aracıyla karşılaştırma için)
// - user_name 60 karakter limiti
// - HMAC-SHA256 → Base64 (Deno Web Crypto API)

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

// PHP: base64_encode(hash_hmac('sha256', $data, $key, true))
// Bu fonksiyon bire bir aynı sonucu üretir.
async function hmacSha256Base64(data: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  const bytes = new Uint8Array(sig);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
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

    // KRİTİK: .trim() ile baştaki/sondaki boşluk/newline temizleniyor
    // Supabase Dashboard'dan secret eklerken yanlışlıkla boşluk eklenebilir
    const MERCHANT_ID = (Deno.env.get("PAYTR_MERCHANT_ID") ?? body.merchant_id ?? "").trim();
    const MERCHANT_KEY = (Deno.env.get("PAYTR_MERCHANT_KEY") ?? "").trim();
    const MERCHANT_SALT = (Deno.env.get("PAYTR_MERCHANT_SALT") ?? "").trim();

    if (!MERCHANT_ID || !MERCHANT_KEY || !MERCHANT_SALT) {
      console.error("PayTR credentials eksik!", {
        hasMerchantId: !!MERCHANT_ID,
        hasMerchantKey: !!MERCHANT_KEY,
        hasMerchantSalt: !!MERCHANT_SALT,
        merchantIdLen: MERCHANT_ID.length,
        merchantKeyLen: MERCHANT_KEY.length,
        merchantSaltLen: MERCHANT_SALT.length,
      });
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

    // user_ip: x-forwarded-for'dan al, yoksa x-real-ip dene
    const userIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")?.trim()
      || "1.1.1.1";

    // ─── PayTR Hash Hesaplama ───
    // PHP referans:
    //   $hash_str = $merchant_id . $user_ip . $merchant_oid . $email . $payment_amount
    //             . $user_basket . $no_installment . $max_installment . $currency . $test_mode;
    //   $paytr_token = base64_encode(hash_hmac('sha256', $hash_str . $merchant_salt, $merchant_key, true));
    const hashStr = MERCHANT_ID + userIp + merchant_oid + email + payment_amount + user_basket + no_installment + max_installment + currency + test_mode;

    const paytrToken = await hmacSha256Base64(hashStr + MERCHANT_SALT, MERCHANT_KEY);

    // ─── DETAYLI DEBUG LOG ───
    console.log("=== PAYTR HASH DEBUG v2 ===");
    console.log("MERCHANT_ID:", MERCHANT_ID, "(len:" + MERCHANT_ID.length + ")");
    console.log("userIp:", userIp);
    console.log("merchant_oid:", merchant_oid);
    console.log("email:", email);
    console.log("payment_amount:", payment_amount);
    console.log("user_basket (first 60):", user_basket.substring(0, 60));
    console.log("user_basket (decoded):", (() => { try { return atob(user_basket); } catch(_e) { return "DECODE_FAIL"; } })());
    console.log("no_installment:", no_installment);
    console.log("max_installment:", max_installment);
    console.log("currency:", currency);
    console.log("test_mode:", test_mode);
    console.log("MERCHANT_KEY length:", MERCHANT_KEY.length);
    console.log("MERCHANT_SALT length:", MERCHANT_SALT.length);
    console.log("hashStr length:", hashStr.length);
    console.log("hashStr+SALT length:", (hashStr + MERCHANT_SALT).length);
    console.log("paytr_token (first 20):", paytrToken.substring(0, 20));
    console.log("paytr_token (full):", paytrToken);
    console.log("=== END HASH DEBUG ===");

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
    formData.append("user_name", (user_name || "Musteri").substring(0, 60));
    formData.append("user_address", (user_address || "Turkiye").substring(0, 200));
    formData.append("user_phone", user_phone || "05000000000");
    formData.append("merchant_ok_url", merchant_ok_url);
    formData.append("merchant_fail_url", merchant_fail_url);
    formData.append("timeout_limit", "30");
    formData.append("currency", currency);
    formData.append("test_mode", test_mode);
    formData.append("lang", lang);

    console.log("PayTR API cagrilacak, form keys:", [...formData.keys()].join(", "));

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
      console.log("PayTR token BASARILI! Token length:", data.token?.length);
      return jsonResp({ token: data.token }, 200);
    }

    console.error("PayTR token BASARISIZ:", data.reason, data);
    return jsonResp({ error: data.reason || "Token alinamadi", detail: data }, 400);
  } catch (err) {
    console.error("paytr-token error:", err);
    return jsonResp({ error: String(err) }, 500);
  }
});
