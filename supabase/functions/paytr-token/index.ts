// supabase/functions/paytr-token/index.ts
// PayTR iframe token'ı sunucu tarafında oluşturur.
// Deno-native Web Crypto API kullanılıyor (node:crypto yerine).

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResp(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// HMAC-SHA256 hesaplama (Deno Web Crypto API ile)
async function hmacSha256Base64(data: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    encoder.encode(data)
  );
  // Base64 encode
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

Deno.serve(async (req: Request) => {
  // ── CORS preflight ──────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResp({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();

    // ── Supabase Secrets ──────────────────────────────────
    const MERCHANT_ID   = Deno.env.get("PAYTR_MERCHANT_ID")   ?? body.merchant_id ?? "";
    const MERCHANT_KEY  = Deno.env.get("PAYTR_MERCHANT_KEY")  ?? "";
    const MERCHANT_SALT = Deno.env.get("PAYTR_MERCHANT_SALT") ?? "";

    if (!MERCHANT_ID || !MERCHANT_KEY || !MERCHANT_SALT) {
      return jsonResp(
        { error: "PayTR credentials eksik. Supabase Secrets kontrol edin (PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY, PAYTR_MERCHANT_SALT)." },
        503
      );
    }

    // ── Frontend'den gelen alanlar ────────────────────────
    const merchant_oid    = body.merchant_oid ?? "";
    const email           = body.email ?? "";
    const payment_amount  = String(body.payment_amount ?? "");
    const user_name       = body.user_name ?? "";
    const user_address    = body.user_address ?? "Turkiye";
    const user_phone      = body.user_phone ?? "05000000000";
    const merchant_ok_url = body.merchant_ok_url ?? "";
    const merchant_fail_url = body.merchant_fail_url ?? "";
    const user_basket     = body.user_basket ?? "";
    const currency        = body.currency ?? "TL";
    const test_mode       = body.test_mode ?? "0";
    const no_installment  = body.no_installment ?? "1";
    const max_installment = body.max_installment ?? "0";
    const lang            = body.lang ?? "tr";

    // ── Zorunlu alan kontrolü ─────────────────────────────
    const required: Record<string, string> = {
      merchant_oid,
      email,
      payment_amount,
      user_name,
      user_basket,
      merchant_ok_url,
      merchant_fail_url,
    };
    for (const [key, val] of Object.entries(required)) {
      if (!val) {
        return jsonResp({ error: `Zorunlu alan eksik: ${key}` }, 400);
      }
    }

    // ── user_ip ───────────────────────────────────────────
    const userIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "1.1.1.1";

    // ── PayTR HMAC token hesaplama ────────────────────────
    // PayTR dokümantasyonuna göre hash string sırası:
    //   merchant_id + user_ip + merchant_oid + email + payment_amount +
    //   user_basket + no_installment + max_installment + currency + test_mode
    //
    // Hash = Base64( HMAC-SHA256( hashStr + merchantSalt , merchantKey ) )
    const hashStr =
      MERCHANT_ID +
      userIp +
      merchant_oid +
      email +
      payment_amount +
      user_basket +
      no_installment +
      max_installment +
      currency +
      test_mode;

    const paytrToken = await hmacSha256Base64(hashStr + MERCHANT_SALT, MERCHANT_KEY);

    // ── PayTR API'ye token isteği ─────────────────────────
    const formData = new URLSearchParams({
      merchant_id:      MERCHANT_ID,
      user_ip:          userIp,
      merchant_oid,
      email,
      payment_amount,
      paytr_token:      paytrToken,
      user_basket,
      debug_on:         test_mode === "1" ? "1" : "0",
      no_installment,
      max_installment,
      user_name:        user_name.substring(0, 25),
      user_address:     (user_address || "Turkiye").substring(0, 200),
      user_phone:       user_phone || "05000000000",
      merchant_ok_url,
      merchant_fail_url,
      timeout_limit:    "30",
      currency,
      test_mode,
      lang,
    });

    const paytrRes = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });

    const paytrData = await paytrRes.json();

    if (paytrData.status === "success") {
      return jsonResp({ token: paytrData.token }, 200);
    } else {
      console.error("PayTR token hatası:", paytrData);
      return jsonResp(
        { error: paytrData.reason || "PayTR token alınamadı.", detail: paytrData },
        400
      );
    }
  } catch (err) {
    console.error("paytr-token function error:", err);
    return jsonResp(
      { error: err instanceof Error ? err.message : "Sunucu hatası: " + String(err) },
      500
    );
  }
});
