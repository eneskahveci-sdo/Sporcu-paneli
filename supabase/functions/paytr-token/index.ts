// PayTR Token Edge Function v12
// v12: merchant_notify_url zorunlu hale getirildi, credential fingerprint eklendi,
//      hata mesajlarına çözüm önerileri eklendi, IPv6 koruması eklendi
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
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

// Credential fingerprint — ilk 4 + son 4 karakter (güvenli kısmi gösterim)
function fingerprint(val: string): string {
  if (val.length <= 4) return "***";
  return val.substring(0, 2) + "..." + val.substring(val.length - 2);
}

// SHA-256 fingerprint of credential for verification without exposing the actual value
async function credentialHash(val: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(val));
  const hex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
  return hex.substring(0, 8);
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

    // ─── Credential'ları oku ve temizle ───
    const rawMerchantId  = Deno.env.get("PAYTR_MERCHANT_ID")   ?? "";
    const rawMerchantKey = Deno.env.get("PAYTR_MERCHANT_KEY")  ?? "";
    const rawMerchantSalt = Deno.env.get("PAYTR_MERCHANT_SALT") ?? "";

    const MERCHANT_ID   = cleanSecret(rawMerchantId || body.merchant_id || "");
    const MERCHANT_KEY  = cleanSecret(rawMerchantKey);
    const MERCHANT_SALT = cleanSecret(rawMerchantSalt);

    // Credential kaynağını logla
    const idSource = rawMerchantId ? "env" : "body";
    console.error(`[v12] MERCHANT_ID: ${MERCHANT_ID} (source: ${idSource}), KEY len: ${MERCHANT_KEY.length}, SALT len: ${MERCHANT_SALT.length}`);

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
      }, 503);
    }

    // Credential fingerprint — kullanıcı doğrulama için
    const keyHash = await credentialHash(MERCHANT_KEY);
    const saltHash = await credentialHash(MERCHANT_SALT);

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
      if (!v) return jsonResp({ error: "Zorunlu alan eksik: " + k, version: "v12" }, 400);
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
      console.error("[v12] HATA: merchant_notify_url oluşturulamadı! SUPABASE_URL:", SUPABASE_URL || "(boş)");
      return jsonResp({
        error: "merchant_notify_url oluşturulamadı. SUPABASE_URL veya PAYTR_NOTIFY_URL ayarlanmalı.",
        version: "v12",
      }, 503);
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
      return jsonResp({ error: "HMAC hesaplama hatası — token oluşturulamadı", version: "v12" }, 500);
    }

    // Self-test: bilinen test vektörü ile HMAC doğrulaması
    const selfTest = await paytrHmac("paytr_test_data" + MERCHANT_SALT, MERCHANT_KEY);
    console.error("[v12] HMAC self-test:", selfTest ? "OK" : "FAIL");
    console.error("[v12] hash_str:", hashStr.substring(0, 100) + "...");
    console.error("[v12] paytr_token:", paytrToken.substring(0, 20) + "...");
    console.error("[v12] notify_url:", notifyUrl);
    console.error("[v12] credential fingerprints — KEY:", fingerprint(MERCHANT_KEY), "SALT:", fingerprint(MERCHANT_SALT));

    // ─── PayTR API POST (URLSearchParams — application/x-www-form-urlencoded) ───
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
    formData.append("merchant_notify_url", notifyUrl);
    formData.append("timeout_limit", "30");
    formData.append("currency", currency);
    formData.append("test_mode", test_mode);
    formData.append("lang", lang);

    console.error("[v12] PayTR API'ye istek gönderiliyor...");

    const res = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const resText = await res.text();
    console.error("[v12] PayTR response:", res.status, resText.substring(0, 300));

    let data: Record<string, string>;
    try { data = JSON.parse(resText); }
    catch (_e) { return jsonResp({ error: "PayTR JSON parse hatası", raw: resText.substring(0, 200), version: "v12" }, 502); }

    if (data.status === "success") {
      console.error("[v12] BAŞARILI! Token alındı.");
      return jsonResp({ token: data.token, version: "v12" }, 200);
    }

    // ─── Hata durumunda detaylı diagnostik ───
    const reason = data.reason || "Token alınamadı";
    const isTokenError = reason.includes("paytr_token");

    console.error("[v12] BAŞARISIZ:", reason);

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

    return jsonResp({
      error: reason,
      version: "v12",
      debug: {
        merchant_id: MERCHANT_ID,
        merchant_id_source: idSource,
        key_len: MERCHANT_KEY.length,
        salt_len: MERCHANT_SALT.length,
        key_fingerprint: fingerprint(MERCHANT_KEY),
        salt_fingerprint: fingerprint(MERCHANT_SALT),
        key_hash: keyHash,
        salt_hash: saltHash,
        user_ip: userIp,
        raw_ip: rawIp !== userIp ? rawIp : undefined,
        merchant_oid,
        email,
        payment_amount,
        user_basket_len: user_basket.length,
        no_installment,
        max_installment,
        currency,
        test_mode,
        notify_url: notifyUrl,
        hash_str_preview: hashStr.substring(0, 120) + "...",
        token_preview: paytrToken.substring(0, 20) + "...",
        self_test: selfTest ? "OK" : "FAIL",
      },
      troubleshooting: isTokenError ? troubleshooting : undefined,
      paytr_response: data,
    }, 400);

  } catch (err) {
    console.error("[v12] EXCEPTION:", String(err));
    return jsonResp({ error: String(err), version: "v12" }, 500);
  }
});
