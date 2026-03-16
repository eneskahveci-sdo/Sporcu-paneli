// supabase/functions/paytr-webhook/index.ts
// PayTR ödeme sonucu webhook callback'i.
// Deno-native Web Crypto API kullanılıyor (node:crypto yerine).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const formData = await req.formData();

    const merchant_oid       = formData.get("merchant_oid")?.toString() ?? "";
    const status             = formData.get("status")?.toString() ?? "";
    const total_amount       = formData.get("total_amount")?.toString() ?? "";
    const hash               = formData.get("hash")?.toString() ?? "";
    const failed_reason_code = formData.get("failed_reason_code")?.toString() ?? "";
    const failed_reason_msg  = formData.get("failed_reason_msg")?.toString() ?? "";

    const MERCHANT_KEY  = Deno.env.get("PAYTR_MERCHANT_KEY") ?? "";
    const MERCHANT_SALT = Deno.env.get("PAYTR_MERCHANT_SALT") ?? "";
    const SUPABASE_URL  = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!MERCHANT_KEY || !MERCHANT_SALT) {
      console.error("PayTR webhook: Secrets eksik");
      return new Response("OK", { status: 200 });
    }

    // Hash doğrulama (HMAC-SHA256)
    const hashStr = merchant_oid + MERCHANT_SALT + status + total_amount;
    const expectedHash = await hmacSha256Base64(hashStr, MERCHANT_KEY);

    if (hash !== expectedHash) {
      console.error("PayTR webhook: Hash doğrulaması başarısız!", {
        merchant_oid,
        hash,
        expectedHash,
      });
      return new Response("OK", { status: 200 });
    }

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
        console.error("PayTR webhook: DB update hatası:", error);
      } else {
        console.log("Ödeme tamamlandı:", merchant_oid);
      }
    } else {
      const { error } = await sb
        .from("payments")
        .update({ st: "failed", notif_status: "" })
        .eq("id", merchant_oid);

      if (error) {
        console.error("PayTR webhook: DB update hatası:", error);
      } else {
        console.log("Ödeme başarısız:", merchant_oid, failed_reason_code, failed_reason_msg);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("paytr-webhook hatası:", err);
    return new Response("OK", { status: 200 });
  }
});
