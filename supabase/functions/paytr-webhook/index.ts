import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

async function hmacSha256Base64(data: string, key: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const formData = await req.formData();
    const merchant_oid = formData.get("merchant_oid")?.toString() ?? "";
    const status = formData.get("status")?.toString() ?? "";
    const total_amount = formData.get("total_amount")?.toString() ?? "";
    const hash = formData.get("hash")?.toString() ?? "";
    const failed_reason_code = formData.get("failed_reason_code")?.toString() ?? "";
    const failed_reason_msg = formData.get("failed_reason_msg")?.toString() ?? "";

    const MERCHANT_KEY = Deno.env.get("PAYTR_MERCHANT_KEY") ?? "";
    const MERCHANT_SALT = Deno.env.get("PAYTR_MERCHANT_SALT") ?? "";
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!MERCHANT_KEY || !MERCHANT_SALT) {
      console.error("PayTR webhook: Secrets eksik");
      return new Response("OK", { status: 200 });
    }

    const hashStr = merchant_oid + MERCHANT_SALT + status + total_amount;
    const expectedHash = await hmacSha256Base64(hashStr, MERCHANT_KEY);

    if (hash !== expectedHash) {
      console.error("Hash dogrulamasi basarisiz! merchant_oid:", merchant_oid);
      return new Response("INVALID_HASH", { status: 403 });
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

    if (status === "success") {
      // PayTR ödeme kaydında plan ID'lerini oku (notif_status = "planids:id1,id2,...")
      const { data: paytrRec, error: recErr } = await sb
        .from("payments")
        .select("notif_status, aid")
        .eq("id", merchant_oid)
        .maybeSingle();

      if (recErr) {
        console.warn("PayTR webhook: plan ID okuma hatasi:", recErr.message);
      }

      const planIds: string[] = [];
      if (paytrRec?.notif_status?.startsWith("planids:")) {
        paytrRec.notif_status.slice(8).split(",").forEach((id: string) => {
          const trimmed = id.trim();
          if (trimmed) planIds.push(trimmed);
        });
      }

      const { error: updateErr } = await sb.from("payments").update({
        st: "completed",
        source: "paytr",
        notif_status: "approved",
        pay_method: "paytr",
      }).eq("id", merchant_oid);
      if (updateErr) {
        console.error("PayTR webhook: ana kayit guncelleme hatasi:", updateErr.message);
      }
      console.log("Odeme tamamlandi:", merchant_oid);

      // Bağlı plan kayıtlarını da tamamlandı olarak işaretle
      if (paytrRec?.aid) {
        for (const pid of planIds) {
          const { error: planErr } = await sb.from("payments").update({
            st: "completed",
            notif_status: "approved",
            pay_method: "paytr",
          }).eq("id", pid).eq("source", "plan").eq("aid", paytrRec.aid);
          if (planErr) {
            console.warn("Plan kaydı guncellenemedi:", pid, planErr.message);
          } else {
            console.log("Plan kaydı tamamlandi:", pid);
          }
        }
      }
    } else {
      const { error: failErr } = await sb.from("payments").update({
        st: "failed",
        notif_status: "",
      }).eq("id", merchant_oid);
      if (failErr) {
        console.error("PayTR webhook: basarisiz kayit guncelleme hatasi:", failErr.message);
      }
      console.log("Odeme basarisiz:", merchant_oid, failed_reason_code, failed_reason_msg);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("paytr-webhook hatasi:", err);
    return new Response("OK", { status: 200 });
  }
});
