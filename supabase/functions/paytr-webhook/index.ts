// supabase/functions/paytr-webhook/index.ts
// PayTR ödeme sonucu webhook callback'i.
// PayTR bu endpoint'e POST yapar, hash doğrulaması yapılır, payments tablosu güncellenir.
//
// DÜZELTME: crypto.subtle.digest yerine HMAC-SHA256 kullanılıyor.

import { createHmac } from "node:crypto";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  // PayTR sadece POST yapar
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const formData = await req.formData();

    const merchant_oid = formData.get("merchant_oid")?.toString() ?? "";
    const status       = formData.get("status")?.toString()       ?? "";
    const total_amount = formData.get("total_amount")?.toString() ?? "";
    const hash         = formData.get("hash")?.toString()         ?? "";
    const failed_reason_code = formData.get("failed_reason_code")?.toString() ?? "";
    const failed_reason_msg  = formData.get("failed_reason_msg")?.toString()  ?? "";

    // Supabase Secrets
    const MERCHANT_KEY  = Deno.env.get("PAYTR_MERCHANT_KEY")  ?? "";
    const MERCHANT_SALT = Deno.env.get("PAYTR_MERCHANT_SALT") ?? "";
    const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")        ?? "";
    const SUPABASE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!MERCHANT_KEY || !MERCHANT_SALT) {
      console.error("PayTR webhook: Secrets eksik (PAYTR_MERCHANT_KEY / PAYTR_MERCHANT_SALT)");
      return new Response("OK", { status: 200 });
    }

    // ── Hash doğrulama (HMAC-SHA256) ──────────────────────
    // PayTR dokümantasyonu:
    //   hashStr = merchant_oid + MERCHANT_SALT + status + total_amount
    //   expectedHash = Base64( HMAC-SHA256( hashStr, MERCHANT_KEY ) )
    const hashStr = merchant_oid + MERCHANT_SALT + status + total_amount;
    const expectedHash = createHmac("sha256", MERCHANT_KEY)
      .update(hashStr)
      .digest("base64");

    if (hash !== expectedHash) {
      console.error("PayTR webhook: Hash doğrulaması başarısız!", {
        merchant_oid,
        hash,
        expectedHash,
      });
      return new Response("OK", { status: 200 });
    }

    // ── Supabase bağlantısı (service role — RLS bypass) ───
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

    if (status === "success") {
      const { error } = await sb
        .from("payments")
        .update({
          st: "completed",
          source: "paytr",
          notif_status: "approved",
          pay_method: "paytr",
        })
        .eq("id", merchant_oid);

      if (error) {
        console.error("PayTR webhook: DB update hatası (success):", error);
      } else {
        console.log("✅ Ödeme tamamlandı:", merchant_oid);
      }
    } else {
      const { error } = await sb
        .from("payments")
        .update({
          st: "failed",
          notif_status: "",
        })
        .eq("id", merchant_oid);

      if (error) {
        console.error("PayTR webhook: DB update hatası (fail):", error);
      } else {
        console.log(
          "❌ Ödeme başarısız:",
          merchant_oid,
          failed_reason_code,
          failed_reason_msg
        );
      }
    }

    // PayTR'ye mutlaka "OK" dönülmeli, aksi halde tekrar tekrar çağırır
    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("paytr-webhook hatası:", err);
    // Hata olsa bile PayTR'a OK dön
    return new Response("OK", { status: 200 });
  }
});
