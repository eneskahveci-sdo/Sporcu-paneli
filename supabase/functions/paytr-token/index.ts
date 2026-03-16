const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResp(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function hmacSha256Base64(data, key) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResp({ error: "Method not allowed" }, 405);

  try {
    // Body'yi önce text olarak oku — debug için
    const rawBody = await req.text();
    console.log("Raw body length:", rawBody.length, "content:", rawBody.substring(0, 500));
    
    if (!rawBody || rawBody.length === 0) {
      return jsonResp({ error: "Request body bos geldi. Content-Type: application/json gonderdiginizden emin olun." }, 400);
    }

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseErr) {
      return jsonResp({ error: "JSON parse hatasi: " + String(parseErr), rawBodyPreview: rawBody.substring(0, 200) }, 400);
    }

    const MERCHANT_ID = Deno.env.get("PAYTR_MERCHANT_ID") ?? body.merchant_id ?? "";
    const MERCHANT_KEY = Deno.env.get("PAYTR_MERCHANT_KEY") ?? "";
    const MERCHANT_SALT = Deno.env.get("PAYTR_MERCHANT_SALT") ?? "";

    if (!MERCHANT_ID || !MERCHANT_KEY || !MERCHANT_SALT) {
      return jsonResp({ error: "PayTR credentials eksik." }, 503);
    }

    const { merchant_oid = "", email = "", payment_amount = "", user_name = "", user_address = "Turkiye", user_phone = "05000000000", merchant_ok_url = "", merchant_fail_url = "", user_basket = "", currency = "TL", test_mode = "0", no_installment = "1", max_installment = "0", lang = "tr" } = body;

    const required = { merchant_oid, email, payment_amount, user_name, user_basket, merchant_ok_url, merchant_fail_url };
    for (const [k, v] of Object.entries(required)) {
      if (!v) return jsonResp({ error: "Zorunlu alan eksik: " + k }, 400);
    }

    const userIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "1.1.1.1";

    const hashStr = MERCHANT_ID + userIp + merchant_oid + email + String(payment_amount) + user_basket + no_installment + max_installment + currency + test_mode;
    const paytrToken = await hmacSha256Base64(hashStr + MERCHANT_SALT, MERCHANT_KEY);

    const formData = new URLSearchParams({
      merchant_id: MERCHANT_ID, user_ip: userIp, merchant_oid, email,
      payment_amount: String(payment_amount), pay
