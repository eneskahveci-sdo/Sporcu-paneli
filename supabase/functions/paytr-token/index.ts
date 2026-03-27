// PayTR Token Edge Function v12
// v12: merchant_notify_url zorunlu hale getirildi, credential fingerprint eklendi,
//      hata mesajlarına çözüm önerileri eklendi, IPv6 koruması eklendi
// v11: cleanSecret artık tırnak/BOM soyar, tüm body değerleri trim edilir,
//      HMAC sonucu boş kontrol eklendi, paytr-webhook ile aynı btoa deseni
// v10: node:crypto yerine native Web Crypto API kullanılıyor (paytr-webhook ile tutarlı)
// v9: fetch'e explicit Content-Type header ve body.toString() eklendi
// v8: FormData (multipart/form-data) yerine URLSearchParams (x-www-form-urlencoded) kullanılıyor

const ALLOWED_ORIGINS = [
  "https://sporcu-paneli.vercel.app",
  "https://dragosfutbolakademisi.com",
  "https://www.dragosfutbolakademisi.com",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5500",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function jsonResp(body: Record<string, unknown>, status: number, req?: Request) {
  const corsHeaders = req ? getCorsHeaders(req) : { "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0], "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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

// IPv6 → IPv4 dönüşümü (PayTR IPv6 desteklemiyor)
function normalizeIp(ip: string): string {
  if (!ip) return "1.2.3.4";
  // IPv4-mapped IPv6: ::ffff:192.168.1.1 → 192.168.1.1
  const v4mapped = ip.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (v4mapped) return v4mapped[1];
  // Pure IPv6 → PayTR desteklemiyor, fallback
  if (ip.includes(":")) {
    console.error("[v12] IPv6 tespit edildi, PayTR IPv4 gerektirir:", ip);
    return "1.2.3.4";
  }
  return ip;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }
  if (req.method !== "POST") {
    return jsonResp({ error: "Method not allowed" }, 405, req);
  }

  try {
    const rawBody = await req.text();
    if (!rawBody) return jsonResp({ error: "Request body boş." }, 400, req);

    let body: Record<string, string>;
    try { body = JSON.parse(rawBody); }
    catch (e) { return jsonResp({ error: "JSON parse hatası: " + String(e) }, 400, req); }

    // ─── Credential'ları oku ve temizle ───
    const rawMerchantId  = Deno.env.get("PAYTR_MERCHANT_ID")   ?? "";
    const rawMerchantKey = Deno.env.get("PAYTR_MERCHANT_KEY")  ?? "";
    const rawMerchantSalt = Deno.env.get("PAYTR_MERCHANT_SALT") ?? "";

    const MERCHANT_ID   = cleanSecret(rawMerchantId || "");
    const MERCHANT_KEY  = cleanSecret(rawMerchantKey);
    const MERCHANT_SALT = cleanSecret(rawMerchantSalt);

    console.error(`[v12] Credentials yüklendi — KEY len: ${MERCHANT_KEY.length}, SALT len: ${MERCHANT_SALT.length}`);

    // Temizlik sonrası uzunluk kontrolü — cleanSecret karakter kırpmış olabilir
    if (rawMerchantKey && MERCHANT_KEY.length !== rawMerchantKey.length) {
      console.error(`[v12] UYARI: MERCHANT_KEY temizlik sonrası kısaldı! Ham: ${rawMerchantKey.length} → Temiz: ${MERCHANT_KEY.length}`);
    }
    if (rawMerchantSalt && MERCHANT_SALT.length !== rawMerchantSalt.length) {
      console.error(`[v12] UYARI: MERCHANT_SALT temizlik sonrası kısaldı! Ham: ${rawMerchantSalt.length} → Temiz: ${MERCHANT_SALT.length}`);
    }

    if (!MERCHANT_ID || !MERCHANT_KEY || !MERCHANT_SALT) {
      return jsonResp({
        error: "PayTR credentials eksik. Supabase Secrets'ta PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY, PAYTR_MERCHANT_SALT tanımlı olmalı.",
        hint: "supabase secrets set PAYTR_MERCHANT_ID=XXXXXX PAYTR_MERCHANT_KEY=YYYYYYYYYYYYYYYY PAYTR_MERCHANT_SALT=ZZZZZZZZZZZZZZZZ",
        version: "v12",
      }, 503, req);
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
      if (!v) return jsonResp({ error: "Zorunlu alan eksik: " + k, version: "v12" }, 400, req);
    }

    // ─── User IP — IPv6 koruması ───
    const rawIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
               || req.headers.get("x-real-ip")?.trim()
               || "1.2.3.4";
    const userIp = normalizeIp(rawIp);

    // ─── merchant_notify_url — PayTR zorunlu alan ───
    const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "");
    const notifyUrl = Deno.env.get("PAYTR_NOTIFY_URL")
                   || (SUPABASE_URL ? SUPABASE_URL + "/functions/v1/paytr-webhook" : "");

    if (!notifyUrl) {
      console.error("[v12] HATA: merchant_notify_url oluşturulamadı.");
      return jsonResp({
        error: "merchant_notify_url oluşturulamadı. SUPABASE_URL veya PAYTR_NOTIFY_URL ayarlanmalı.",
        version: "v12",
      }, 503, req);
    }

    // ─── HASH — PayTR resmi PHP örneğiyle birebir aynı ───
    // PHP: $hash_str = $merchant_id.$user_ip.$merchant_oid.$email.$payment_amount
    //       .$user_basket.$no_installment.$max_installment.$currency.$test_mode;
    // PHP: $paytr_token = base64_encode(hash_hmac('sha256',$hash_str.$merchant_salt,$merchant_key,true));
    const hashStr = MERCHANT_ID + userIp + merchant_oid + email + payment_amount
                  + user_basket + no_installment + max_installment + currency + test_mode;

    const paytrToken = await paytrHmac(hashStr + MERCHANT_SALT, MERCHANT_KEY);

    if (!paytrToken) {
      console.error("[v12] HMAC hesaplama başarısız — token boş!");
      return jsonResp({ error: "HMAC hesaplama hatası — token oluşturulamadı", version: "v12" }, 500, req);
    }

    // Token oluşturuldu, PayTR'a gönderiliyor

    // ─── PayTR API POST (URLSearchParams — application/x-www-form-urlencoded) ───
    const formData = new URLSearchParams();
    formData.append("merchant_id", MERCHANT_ID);
    formData.append("user_ip", userIp);
    formData.append("merchant_oid", merchant_oid);
    formData.append("email", email);
    formData.append("payment_amount", payment_amount);
    formData.append("paytr_token", paytrToken);
    formData.append("user_basket", user_basket);
    formData.append("debug_on", "0");
    formData.append("no_installment", no_installment);
    formData.append("max_installment", max_installment);
    formData.append("user_name", (user_name || "Musteri").substring(0, 60));
    formData.append("user_address", (user_address || "Turkiye").substring(0, 200));
    formData.append("user_phone", user_phone || "05000000000");
    formData.append("merchant_ok_url", merchant_ok_url);
    formData.append("merchant_fail_url", merchant_fail_url);
    formData.append("merchant_notify_url", notifyUrl);
    formData.append("timeout_limit", "30");
    formData.append("currency", currency);
    formData.append("test_mode", test_mode);
    formData.append("lang", lang);

    // PayTR API isteği gönderiliyor

    const res = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const resText = await res.text();
    // PayTR yanıtı alındı

    let data: Record<string, string>;
    try { data = JSON.parse(resText); }
    catch (_e) {
      console.error("[v12] PayTR JSON parse hatası.");
      return jsonResp({ error: "PayTR JSON parse hatası", version: "v12" }, 502, req);
    }

    if (data.status === "success") {
      return jsonResp({ token: data.token, version: "v12" }, 200, req);
    }

    // ─── Hata durumunda detaylı diagnostik ───
    const reason = data.reason || "Token alınamadı";
    const isTokenError = reason.includes("paytr_token");

    console.error("[v12] PayTR token alınamadı:", reason);

    // Çözüm önerileri
    const troubleshooting: string[] = [];
    if (isTokenError) {
      troubleshooting.push(
        "1. Supabase Secrets'ta PAYTR_MERCHANT_KEY ve PAYTR_MERCHANT_SALT değerlerinin PayTR panelindeki değerlerle birebir aynı olduğunu kontrol edin.",
        "2. PayTR panelinden Merchant Key ve Salt'ı kopyalayıp tekrar ayarlayın: supabase secrets set PAYTR_MERCHANT_KEY=... PAYTR_MERCHANT_SALT=...",
        "3. PayTR panelinde test modunun aktif olduğundan emin olun.",
        "4. PayTR panelinde API entegrasyonunun aktif olduğundan ve IP kısıtlaması olmadığından emin olun.",
        "5. Credential fingerprint'leri PayTR panelindeki değerlerle karşılaştırın (aşağıda).",
      );
    }

    // Hata detayları sadece sunucu loglarına yazılır
    console.error("[v12] HATA DEBUG — key_len:", MERCHANT_KEY.length,
      "salt_len:", MERCHANT_SALT.length,
      "merchant_oid:", merchant_oid,
    );

    return jsonResp({
      error: reason,
      version: "v12",
      troubleshooting: isTokenError ? troubleshooting : undefined,
    }, 400, req);

  } catch (err) {
    console.error("[v12] EXCEPTION:", String(err));
    return jsonResp({ error: String(err), version: "v12" }, 500, req);
  }
});
