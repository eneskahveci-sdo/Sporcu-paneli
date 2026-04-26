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

    // merchant_oid: PayTR'a UUID'den tireler kaldırılarak gönderildi (32 alfanumerik)
    // DB'de id UUID formatında — tireler geri eklenerek eşleştirilir
    function toUuid(id: string): string {
      if (/^[0-9a-f]{32}$/i.test(id)) {
        return `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20)}`;
      }
      return id;
    }
    const dbId = toUuid(merchant_oid);

    if (status === "success") {
      // PayTR ödeme kaydında plan ID'lerini, sporcu adını ve org_id'yi oku
      const { data: paytrRec, error: recErr } = await sb
        .from("payments")
        .select("notif_status, aid, an, org_id")
        .eq("id", dbId)
        .maybeSingle();

      if (recErr) {
        console.warn("PayTR webhook: kayit okuma hatasi:", recErr.message);
      }

      const planIds: string[] = [];
      if (paytrRec?.notif_status?.startsWith("planids:")) {
        paytrRec.notif_status.slice(8).split(",").forEach((id: string) => {
          const trimmed = id.trim();
          if (trimmed) planIds.push(trimmed);
        });
      }

      // Bağlı plan kayıtlarını tamamlandı olarak işaretle
      if (paytrRec?.aid) {
        for (const pid of planIds) {
          const { error: planErr } = await sb.from("payments").update({
            st: "completed",
            notif_status: "approved",
            pay_method: "paytr",
          }).eq("id", pid).eq("aid", paytrRec.aid);
          if (planErr) {
            console.warn("Plan kaydi guncellenemedi:", pid, planErr.message);
          } else {
            console.log("Plan kaydi tamamlandi:", pid);
          }
        }
      }

      // Admin/antrenörlere push bildirimi gönder (VAPID yapılandırılmışsa)
      const orgId = paytrRec?.org_id;
      const athleteName = paytrRec?.an || "Sporcu";
      if (orgId) {
        try {
          await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_KEY}`,
              "apikey": SUPABASE_KEY,
            },
            body: JSON.stringify({
              orgId,
              title: "Ödeme Tamamlandı",
              body: `${athleteName} — online ödeme başarıyla alındı.`,
              url: "/",
            }),
          });
        } catch (pushErr) {
          console.warn("Push bildirimi gonderilemedi:", pushErr);
        }
      }

      // PayTR yardımcı kaydını sil — plan kayıtları canonical, duplikasyon önlenir
      const { error: delErr } = await sb.from("payments").delete().eq("id", dbId);
      if (delErr) {
        console.warn("PayTR webhook: yardimci kayit silinemedi:", delErr.message);
      }
      console.log("Odeme tamamlandi, paytr kaydi silindi:", dbId);

    } else {
      // Başarısız ödeme — yardımcı PayTR kaydını sil, plan kayıtları pending kalır
      const { error: failErr } = await sb.from("payments").delete().eq("id", dbId);
      if (failErr) {
        console.error("PayTR webhook: basarisiz kayit silinemedi:", failErr.message);
      }
      console.log("Odeme basarisiz (kayit silindi):", merchant_oid, failed_reason_code, failed_reason_msg);
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("paytr-webhook hatasi:", err);
    return new Response("OK", { status: 200 });
  }
});
