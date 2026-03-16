// supabase/functions/paytr-token/index.ts
// PayTR iframe token'ı sunucu tarafında oluşturur.
// Merchant Key ve Salt yalnızca Supabase Secrets'tan okunur — frontend'e asla gönderilmez.
//
// DÜZELTME: crypto.subtle.digest (düz SHA-256) yerine HMAC-SHA-256 kullanılıyor.
// PayTR dokümantasyonuna göre hash = HMAC(hashStr + merchantSalt, merchantKey) → base64

import { createHmac } from "node:crypto";

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
    const {
      merchant_oid,
      email,
      payment_amount,
      user_name,
      user_address = "Turkiye",
      user_phone   = "05000000000",
      merchant_ok_url,
      merchant_fail_url,
      user_basket,
      currency       = "TL",
      test_mode      = "0",
      no_installment = "1",
      max_installment = "0",
      lang           = "tr",
    } = body;

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
      String(payment_amount) +
      user_basket +
      no_installment +
      max_installment +
      currency +
      test_mode;

    const paytrToken = createHmac("sha256", MERCHANT_KEY)
      .update(hashStr + MERCHANT_SALT)
      .digest("base64");

    // ── PayTR API'ye token isteği ─────────────────────────
    const formData = new URLSearchParams({
      merchant_id:      MERCHANT_ID,
      user_ip:          userIp,
      merchant_oid,
      email,
      payment_amount:   String(payment_amount),
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
      { error: err instanceof Error ? err.message : "Sunucu hatası" },
      500
    );
  }
});
