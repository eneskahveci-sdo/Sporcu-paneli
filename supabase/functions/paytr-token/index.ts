// PayTR Token Edge Function v11
// v11: cleanSecret artık tırnak/BOM soyar, tüm body değerleri trim edilir,
//      HMAC sonucu boş kontrol eklendi, paytr-webhook ile aynı btoa deseni
// v10: node:crypto yerine native Web Crypto API kullanılıyor (paytr-webhook ile tutarlı)
// v9: fetch'e explicit Content-Type header ve body.toString() eklendi
// v8: FormData (multipart/form-data) yerine URLSearchParams (x-www-form-urlencoded) kullanılıyor

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

// PayTR HMAC — Web Crypto API (paytr-webhook ile birebir aynı yöntem)
// PHP: base64_encode(hash_hmac('sha256', $data, $key, true))
async function paytrHmac(data: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  // paytr-webhook ile aynı desen: String.fromCharCode spread
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// Supabase secret'lardan gelen değerlerdeki tırnak, BOM ve boşluk karakterlerini temizler
function cleanSecret(val: string): string {
  return val
    .replace(/^["']|["']$/g, "")
    .replace(/[\s\u200B-\u200D\uFEFF\u00A0\r\n\t]/g, "");
}

function sanitizeEmail(email: string): string {
  if (!email) return "musteri@dragosakademi.com";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "musteri@dragosakademi.com";
  if (email.endsWith(".local")) return "musteri@dragosakademi.com";
  return email;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResp({ error: "Method not allowed" }, 405);
  }

  try {
    const rawBody = await req.text();
    if (!rawBody) return jsonResp({ error: "Request body boş." }, 400);

    let body: Record<string, string>;
    try { body = JSON.parse(rawBody); }
    catch (e) { return jsonResp({ error: "JSON parse hatası: " + String(e) }, 400); }

    const MERCHANT_ID   = cleanSecret(Deno.env.get("PAYTR_MERCHANT_ID")   ?? body.merchant_id ?? "");
    const MERCHANT_KEY  = cleanSecret(Deno.env.get("PAYTR_MERCHANT_KEY")  ?? "");
    const MERCHANT_SALT = cleanSecret(Deno.env.get("PAYTR_MERCHANT_SALT") ?? "");

    console.error("[v11] MERCHANT_ID:", MERCHANT_ID, "KEY len:", MERCHANT_KEY.length, "SALT len:", MERCHANT_SALT.length);

    if (!MERCHANT_ID || !MERCHANT_KEY || !MERCHANT_SALT) {
      return jsonResp({ error: "PayTR credentials eksik. Supabase Secrets'ta PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY, PAYTR_MERCHANT_SALT tanımlı olmalı." }, 503);
    }

    // Tüm body değerlerini trim et — boşluk hash uyumsuzluğuna neden olabilir
    const merchant_oid    = (body.merchant_oid ?? "").trim();
    const rawEmail        = (body.email ?? "").trim();
    const email           = sanitizeEmail(rawEmail);
    const payment_amount  = String(body.payment_amount ?? "").trim();
    const user_name       = (body.user_name ?? "").trim();
    const user_address    = (body.user_address ?? "Turkiye").trim();
    const user_phone      = (body.user_phone ?? "05000000000").trim();
    const merchant_ok_url = (body.merchant_ok_url ?? "").trim();
    const merchant_fail_url = (body.merchant_fail_url ?? "").trim();
    const user_basket     = (body.user_basket ?? "").trim();
    const currency        = (body.currency ?? "TL").trim();
    const test_mode       = (body.test_mode ?? "1").trim();
    const no_installment  = (body.no_installment ?? "1").trim();
    const max_installment = (body.max_installment ?? "0").trim();
    const lang            = (body.lang ?? "tr").trim();

    const required: Record<string, string> = {
      merchant_oid, email, payment_amount, user_name, user_basket, merchant_ok_url, merchant_fail_url
    };
    for (const [k, v] of Object.entries(required)) {
      if (!v) return jsonResp({ error: "Zorunlu alan eksik: " + k }, 400);
    }

    const userIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
                || req.headers.get("x-real-ip")?.trim()
                || "1.2.3.4";

    // ─── HASH — PayTR resmi PHP örneğiyle birebir aynı ───
    // PHP: $hash_str = $merchant_id.$user_ip.$merchant_oid.$email.$payment_amount
    //       .$user_basket.$no_installment.$max_installment.$currency.$test_mode;
    // PHP: $paytr_token = base64_encode(hash_hmac('sha256',$hash_str.$merchant_salt,$merchant_key,true));
    const hashStr = MERCHANT_ID + userIp + merchant_oid + email + payment_amount
                  + user_basket + no_installment + max_installment + currency + test_mode;

    const paytrToken = await paytrHmac(hashStr + MERCHANT_SALT, MERCHANT_KEY);

    // HMAC sonucu boş ise crypto hatası var demektir
    if (!paytrToken) {
      console.error("[v11] HMAC hesaplama başarısız — token boş!");
      return jsonResp({ error: "HMAC hesaplama hatası — token oluşturulamadı" }, 500);
    }

    console.error("[v11] hash_str:", hashStr.substring(0, 80) + "...");
    console.error("[v11] paytr_token:", paytrToken);

    // ─── PayTR API POST (URLSearchParams — application/x-www-form-urlencoded) ───
    // PayTR PHP örnekleri http_build_query / string CURLOPT_POSTFIELDS kullanır
    // FormData (multipart/form-data) gönderildiğinde PayTR alanları parse edemiyor
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

    const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
    const notifyUrl = Deno.env.get("PAYTR_NOTIFY_URL")
                   || (SUPABASE_URL ? SUPABASE_URL + "/functions/v1/paytr-webhook" : "");
    if (notifyUrl) formData.append("merchant_notify_url", notifyUrl);

    console.error("[v11] Sending to PayTR, notify_url:", notifyUrl || "(yok)");

    const res = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const resText = await res.text();
    console.error("[v11] PayTR response:", res.status, resText.substring(0, 300));

    let data: Record<string, string>;
    try { data = JSON.parse(resText); }
    catch (_e) { return jsonResp({ error: "PayTR JSON parse hatası", raw: resText.substring(0, 200) }, 502); }

    if (data.status === "success") {
      console.error("[v11] BAŞARILI! Token alındı.");
      return jsonResp({ token: data.token, version: "v11" }, 200);
    }

    console.error("[v11] BAŞARISIZ:", data.reason);
    return jsonResp({
      error: data.reason || "Token alınamadı",
      version: "v11",
      debug: {
        merchant_id: MERCHANT_ID, key_len: MERCHANT_KEY.length, salt_len: MERCHANT_SALT.length,
        user_ip: userIp, merchant_oid, email, payment_amount,
        user_basket_len: user_basket.length, no_installment, max_installment, currency, test_mode,
        hash_str_preview: hashStr.substring(0, 120) + "...",
        token_preview: paytrToken.substring(0, 20) + "...",
      },
      paytr_response: data,
    }, 400);

  } catch (err) {
    console.error("[v11] EXCEPTION:", String(err));
    return jsonResp({ error: String(err), version: "v11" }, 500);
  }
});
