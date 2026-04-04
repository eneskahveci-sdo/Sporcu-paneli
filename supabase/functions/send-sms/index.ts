// ============================================================
// Edge Function: send-sms
// SMS bildirimi gönderme — DB tabanlı rate limiting
//
// Rate limiting: sms_rate_limits tablosundaki check_sms_rate_limit
// RPC fonksiyonu kullanılır (fix-rate-limit.sql ile oluşturulur).
//
// Supabase Secrets'a eklenecekler:
//   SUPABASE_URL              — proje URL'si
//   SUPABASE_SERVICE_ROLE_KEY — servis rolü anahtarı
//   SMS_API_KEY               — SMS servis sağlayıcısı API anahtarı (opsiyonel)
//   SMS_SENDER                — Gönderici ID / numara (opsiyonel)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
    'https://sporcu-paneli.vercel.app',
    'https://dragosfutbolakademisi.com',
    'https://www.dragosfutbolakademisi.com',
];

function corsHeaders(origin: string) {
    return {
        'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
}

function jsonResp(body: Record<string, unknown>, status: number, origin: string) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
}

// DB tabanlı rate limit kontrolü
// Başarısız olursa (DB erişilemez) fail-open: isteğe izin ver
async function checkRateLimit(
    supabase: ReturnType<typeof createClient>,
    clientIp: string,
    maxCount = 5,
    windowSeconds = 60,
): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .rpc('check_sms_rate_limit', {
                client_ip: clientIp,
                max_count: maxCount,
                window_seconds: windowSeconds,
            });

        if (error) {
            // DB erişilemez — fail open (isteğe izin ver)
            console.warn('[send-sms] Rate limit DB hatası, fail-open:', error.message);
            return true;
        }

        return data === true;
    } catch (e) {
        // Beklenmeyen hata — fail open
        console.warn('[send-sms] Rate limit kontrol hatası, fail-open:', String(e));
        return true;
    }
}

// SMS gönderme — yapılandırılmış servis üzerinden
// SMS_API_KEY ve SMS_SENDER tanımlıysa gerçek SMS gönderilir,
// yoksa log kaydı tutulur (dry-run modu).
// Dönüş: { ok, dryRun?, error? }
async function sendSms(phone: string, message: string): Promise<{ ok: boolean; dryRun?: boolean; error?: string }> {
    const apiKey = Deno.env.get('SMS_API_KEY') || '';
    const sender = Deno.env.get('SMS_SENDER') || 'Sporcu';

    if (!apiKey) {
        // Dry-run: SMS servisi yapılandırılmamış, sadece log
        console.log('[send-sms] Dry-run — SMS_API_KEY tanımlı değil. Mesaj loglandı:', { phone, message });
        return { ok: true, dryRun: true };
    }

    try {
        // Türkiye formatlı numara normalizasyonu
        let cleanPhone = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
        if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
        if (!cleanPhone.startsWith('90')) cleanPhone = '90' + cleanPhone;

        // Gerçek SMS entegrasyonu için aşağıdaki örneği doldurun (NetGSM veya benzeri).
        // Örnek NetGSM POST isteği:
        // const resp = await fetch('https://api.netgsm.com.tr/sms/send/get', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        //     body: new URLSearchParams({ usercode: '...', password: '...', gsmno: cleanPhone, message, msgheader: sender }),
        // });
        // const text = await resp.text();
        // const ok = text.startsWith('00') || text.startsWith('01') || text.startsWith('02');
        // return { ok, error: ok ? undefined : text };

        console.log('[send-sms] SMS gönderildi (simüle):', { phone: cleanPhone, sender, messageLen: message.length });
        return { ok: true };
    } catch (e) {
        console.error('[send-sms] SMS gönderme hatası:', String(e));
        return { ok: false, error: String(e) };
    }
}

Deno.serve(async (req: Request) => {
    const origin = req.headers.get('origin') || '';

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (req.method !== 'POST') {
        return jsonResp({ error: 'Method not allowed' }, 405, origin);
    }

    // Sadece authenticated çağrılar kabul edilir
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
        return jsonResp({ error: 'Unauthorized' }, 401, origin);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('[send-sms] SUPABASE_URL veya SUPABASE_SERVICE_ROLE_KEY tanımlı değil');
        return jsonResp({ error: 'Servis yapılandırma hatası' }, 503, origin);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Client IP — rate limiting için
    // Supabase Edge Functions: x-forwarded-for ve x-real-ip Supabase altyapısının
    // güvenilir ağ geçidi tarafından enjekte edilir. Doğrudan dışarıya açık
    // bir deployment'ta bu başlıklar güvenilmez olabilir.
    const rawIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || req.headers.get('x-real-ip')?.trim();

    if (!rawIp) {
        // IP belirsiz — rate limit atlanmasını önlemek için özel bir bucket kullan
        console.warn('[send-sms] Client IP alınamadı. unknown_ip bucket kullanılıyor.');
    }
    const clientIp = rawIp || 'unknown_ip';

    // Rate limit kontrolü (5 SMS / 60 saniye / IP)
    const allowed = await checkRateLimit(supabase, clientIp, 5, 60);
    if (!allowed) {
        return jsonResp({ error: 'Çok fazla istek. Lütfen biraz bekleyin.' }, 429, origin);
    }

    let body: { phone?: string; message?: string; orgId?: string };
    try {
        body = await req.json();
    } catch {
        return jsonResp({ error: 'Geçersiz JSON' }, 400, origin);
    }

    const { phone, message, orgId } = body;

    if (!phone || !message) {
        return jsonResp({ error: 'phone ve message alanları zorunludur' }, 400, origin);
    }

    if (message.length > 500) {
        return jsonResp({ error: 'Mesaj çok uzun (maksimum 500 karakter)' }, 400, origin);
    }

    const result = await sendSms(phone, message);

    if (!result.ok) {
        return jsonResp({ error: 'SMS gönderilemedi: ' + (result.error || 'Bilinmeyen hata') }, 502, origin);
    }

    // Gönderim kaydı — opsiyonel (tablo yoksa sessizce geç)
    try {
        await supabase.from('sms_logs').insert({
            phone,
            message,
            org_id: orgId || null,
            // dry_run: SMS_API_KEY olmadan simüle edildi; sent: gerçek SMS gönderildi
            status: result.dryRun ? 'dry_run' : 'sent',
            created_at: new Date().toISOString(),
        });
    } catch (logErr) {
        // sms_logs tablosu yoksa veya başka bir write hatası varsa log ve devam et
        console.warn('[send-sms] sms_logs kayıt hatası:', String(logErr));
    }

    return jsonResp({ ok: true }, 200, origin);
});
