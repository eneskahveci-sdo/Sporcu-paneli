// supabase/functions/paytr-webhook/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  try {
    // PayTR webhook POST olarak gelir, form-encoded
    const formData = await req.formData();

    const merchant_oid  = formData.get("merchant_oid")?.toString()  ?? "";
    const status        = formData.get("status")?.toString()         ?? "";
    const total_amount  = formData.get("total_amount")?.toString()   ?? "";
    const hash          = formData.get("hash")?.toString()           ?? "";

    // Supabase Secrets
    const MERCHANT_KEY  = Deno.env.get("PAYTR_MERCHANT_KEY")  ?? "";
    const MERCHANT_SALT = Deno.env.get("PAYTR_MERCHANT_SALT") ?? "";
    const SUPABASE_URL  = Deno.env.get("SUPABASE_URL")        ?? "";
    const SUPABASE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!MERCHANT_KEY || !MERCHANT_SALT) {
      console.error("PayTR credentials eksik");
      return new Response("OK", { status: 200 }); // PayTR'a her zaman OK dön
    }

    // Hash doğrulama — PayTR dökümantasyonu
    const hashStr = merchant_oid + MERCHANT_SALT + status + total_amount + MERCHANT_KEY;
    const expectedHash = btoa(
      String.fromCharCode(
        ...new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(hashStr)
          )
        )
      )
    );

    if (hash !== expectedHash) {
      console.error("PayTR hash doğrulaması başarısız!", { hash, expectedHash });
      return new Response("PAYTR_HASH_ERROR", { status: 400 });
    }

    // Supabase bağlantısı (service role ile — webhook auth gerektirmez)
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

    if (status === "success") {
      await sb
        .from("payments")
        .update({
          st: "completed",
          source: "paytr",
          notif_status: "approved",
        })
        .eq("id", merchant_oid);

      console.log("✅ Ödeme tamamlandı:", merchant_oid);
    } else {
      await sb
        .from("payments")
        .update({ st: "failed" })
        .eq("id", merchant_oid);

      console.log("❌ Ödeme başarısız:", merchant_oid, status);
    }

    // PayTR, webhook'a mutlaka "OK" dönülmesini bekler
    return new Response("OK", { status: 200 });

  } catch (err) {
    console.error("paytr-webhook hatası:", err);
    // Hata olsa bile PayTR'a OK dön, yoksa tekrar tekrar çağırır
    return new Response("OK", { status: 200 });
  }
});
