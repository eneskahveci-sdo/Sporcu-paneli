// PayTR Token Edge Function v5
// v5 Düzeltmeler:
// - Hash sırası: PayTR resmi dokümanına birebir uyumlu
// - user_basket: Frontend'den gelen base64 değeri hash'te doğrudan kullanılıyor (doğru)
// - payment_amount: String olarak hash'e dahil (doğru)
// - no_installment / max_installment: String olarak hash'e dahil
// - test_mode: String olarak hash'e dahil
// - email sanitize: .local domain'ler fallback'e dönüyor
// - notify_url eklendi (webhook URL'i Supabase secret'tan okunuyor)
// - Detaylı hata mesajları ve debug logları

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

// PayTR resmi dokümanındaki PHP karşılığı:
// base64_encode(hash_hmac('sha256', $hash_str.$merchant_salt, $merchant_key, true))
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
  // Uint8Array → binary string → base64
  const bytes = new Uint8Array(sig);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Görünmez unicode karakterleri temizler (Supabase secrets'tan copy-paste sorunları için)
function cleanSecret(val: string): string {
  return val.replace(/[\s\u200B-\u200D\uFEFF\u00A0\r\n\t]/g, "");
}

// Email sanitize: .local veya geçersiz domain → fallback
function sanitizeEmail(email: string): string {
  if (!email) return "musteri@dragosakademi.com";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return "musteri@dragosakademi.com";
  // .local domain'ler PayTR tarafından reddediliyor olabilir
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
    if (!rawBody || rawBody.length === 0) {
      return jsonResp({ error: "Request body boş geldi." }, 400);
    }

    let body: Record<string, string>;
    try {
      body = JSON.parse(rawBody);
    } catch (parseErr) {
      return jsonResp({ error: "JSON parse hatası: " + String(parseErr) }, 400);
    }

    // Supabase Secrets'tan credential'ları oku
    const MERCHANT_ID   = cleanSecret(Deno.env.get("PAYTR_MERCHANT_ID")   ?? body.merchant_id ?? "");
    const MERCHANT_KEY  = cleanSecret(Deno.env.get("PAYTR_MERCHANT_KEY")  ?? "");
    const MERCHANT_SALT = cleanSecret(Deno.env.get("PAYTR_MERCHANT_SALT") ?? "");

    console.error("[v5] MERCHANT_ID:", MERCHANT_ID);
    console.error("[v5] KEY len:", MERCHANT_KEY.length, "SALT len:", MERCHANT_SALT.length);

    if (!MERCHANT_ID || !MERCHANT_KEY || !MERCHANT_SALT) {
      return jsonResp({
        error: "PayTR credentials eksik. Supabase Secrets'ta PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY, PAYTR_MERCHANT_SALT tanımlı olmalı.",
        debug: {
          hasMerchantId: !!MERCHANT_ID,
          hasMerchantKey: !!MERCHANT_KEY,
          hasMerchantSalt: !!MERCHANT_SALT,
          idLen: MERCHANT_ID.length,
          keyLen: MERCHANT_KEY.length,
          saltLen: MERCHANT_SALT.length,
        }
      }, 503);
    }

    // Request body'den değerleri oku
    const merchant_oid    = body.merchant_oid ?? "";
    const rawEmail        = body.email ?? "";
    const email           = sanitizeEmail(rawEmail);
    const payment_amount  = String(body.payment_amount ?? "");
    const user_name       = body.user_name ?? "";
    const user_address    = body.user_address ?? "Turkiye";
    const user_phone      = body.user_phone ?? "05000000000";
    const merchant_ok_url = body.merchant_ok_url ?? "";
    const merchant_fail_url = body.merchant_fail_url ?? "";
    const user_basket     = body.user_basket ?? "";
    const currency        = body.currency ?? "TL";
    const test_mode       = body.test_mode ?? "1";
    const no_installment  = body.no_installment ?? "1";
    const max_installment = body.max_installment ?? "0";
    const lang            = body.lang ?? "tr";

    // Zorunlu alan kontrolü
    const required: Record<string, string> = {
      merchant_oid, email, payment_amount, user_name, user_basket, merchant_ok_url, merchant_fail_url
    };
    for (const [k, v] of Object.entries(required)) {
      if (!v) return jsonResp({ error: "Zorunlu alan eksik: " + k }, 400);
    }

    // User IP — PayTR gerçek IP bekliyor, Edge Function'da req header'dan alınabilir
    // Test modda sabit IP kullanılabilir
    const userIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
                || req.headers.get("x-real-ip")
                || "1.2.3.4";

    // ─── HASH HESAPLAMA ───
    // PayTR resmi doküman (PHP):
    // $hash_str = $merchant_id . $user_ip . $merchant_oid . $email . $payment_amount
    //           . $user_basket . $no_installment . $max_installment . $currency . $test_mode;
    // $paytr_token = base64_encode(hash_hmac('sha256', $hash_str . $merchant_salt, $merchant_key, true));
    const hashStr = [
      MERCHANT_ID,
      userIp,
      merchant_oid,
      email,
      payment_amount,
      user_basket,       // base64 encoded (frontend'den geldiği gibi)
      no_installment,
      max_installment,
      currency,
      test_mode
    ].join("");

    const paytrToken = await hmacSha256Base64(hashStr + MERCHANT_SALT, MERCHANT_KEY);

    // Debug bilgisi — loglardan incelenebilir
    const debugInfo = {
      merchant_id: MERCHANT_ID,
      key_len: MERCHANT_KEY.length,
      salt_len: MERCHANT_SALT.length,
      user_ip: userIp,
      merchant_oid,
      email,
      email_original: rawEmail,
      payment_amount,
      user_basket_len: user_basket.length,
      user_basket_decoded: (() => {
        try { return atob(user_basket); } catch (_e) { return "DECODE_FAIL"; }
      })(),
      no_installment,
      max_installment,
      currency,
      test_mode,
      hash_str_preview: hashStr.substring(0, 120) + "...",
      token_preview: paytrToken.substring(0, 20) + "...",
    };

    console.error("[v5] DEBUG:", JSON.stringify(debugInfo));

    // ─── PayTR API'ye POST ───
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

    // v5: notify_url eklendi — PayTR webhook bildirimini bu URL'e gönderir
    // Supabase secret'tan okunuyor, yoksa otomatik oluşturuluyor
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const notifyUrl = Deno.env.get("PAYTR_NOTIFY_URL")
                   || (SUPABASE_URL ? SUPABASE_URL + "/functions/v1/paytr-webhook" : "");
    if (notifyUrl) {
      formData.append("merchant_notify_url", notifyUrl);
      console.error("[v5] notify_url:", notifyUrl);
    }

    console.error("[v5] PayTR API'ye istek gönderiliyor...");
    console.error("[v5] Form fields:", formData.toString().substring(0, 500));

    const res = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const resText = await res.text();
    console.error("[v5] PayTR API status:", res.status, "body:", resText.substring(0, 500));

    let data: Record<string, string>;
    try {
      data = JSON.parse(resText);
    } catch (_e) {
      return jsonResp({
        error: "PayTR API JSON parse hatası",
        paytrResponse: resText.substring(0, 300)
      }, 502);
    }

    if (data.status === "success") {
      console.error("[v5] BAŞARILI! Token alındı.");
      return jsonResp({ token: data.token }, 200);
    }

    console.error("[v5] BAŞARISIZ:", data.reason);
    return jsonResp({
      error: data.reason || "Token alınamadı",
      debug: debugInfo,
      paytr_response: data,
    }, 400);

  } catch (err) {
    console.error("[v5] EXCEPTION:", String(err));
    return jsonResp({ error: String(err) }, 500);
  }
});
