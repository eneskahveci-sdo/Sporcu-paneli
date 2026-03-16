// supabase/functions/paytr-token/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Supabase Secrets'tan oku
    const MERCHANT_KEY  = Deno.env.get("PAYTR_MERCHANT_KEY")  ?? "";
    const MERCHANT_SALT = Deno.env.get("PAYTR_MERCHANT_SALT") ?? "";
    const MERCHANT_ID   = Deno.env.get("PAYTR_MERCHANT_ID")   ?? body.merchant_id ?? "";

    if (!MERCHANT_KEY || !MERCHANT_SALT || !MERCHANT_ID) {
      return new Response(
        JSON.stringify({ error: "PayTR credentials eksik. Supabase Secrets kontrol edin." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Frontend'den gelen alanlar
    const {
      merchant_oid,
      email,
      payment_amount,
      user_name,
      user_address,
      user_phone,
      merchant_ok_url,
      merchant_fail_url,
      user_basket,
      currency    = "TL",
      test_mode   = "1",
      no_installment = "0",
      max_installment = "0",
      lang        = "tr",
    } = body;

    // Zorunlu alan kontrolü
    const required = { merchant_oid, email, payment_amount, user_name, user_basket, merchant_ok_url, merchant_fail_url };
    for (const [key, val] of Object.entries(required)) {
      if (!val) {
        return new Response(
          JSON.stringify({ error: `Zorunlu alan eksik: ${key}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // PayTR hash hesaplama
    // Sıra PayTR dökümantasyonuna göre SABİTTİR
    const hashStr =
      MERCHANT_ID +
      user_name.substring(0, 25).replace(/ /g, "+") +
      (user_address || "Turkiye").substring(0, 200) +
      (user_phone || "05000000000") +
      email +
      merchant_oid +
      payment_amount +
      currency +
      test_mode +
      no_installment +
      max_installment +
      user_basket +
      "0" + // payment_type: 0 = sadece kartla
      lang +
      MERCHANT_SALT;

    const paytrToken = btoa(
      String.fromCharCode(
        ...new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(hashStr)
          )
        )
      )
    );

    // PayTR'a istek at
    const formData = new URLSearchParams({
      merchant_id:      MERCHANT_ID,
      user_ip:          "1.1.1.1", // Supabase edge'den geliyor, sabit bırak
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

    if (paytrData.status !== "success") {
      console.error("PayTR token hatası:", paytrData);
      return new Response(
        JSON.stringify({ error: paytrData.reason || "PayTR token alınamadı.", detail: paytrData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ token: paytrData.token }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("paytr-token function error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Sunucu hatası" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
