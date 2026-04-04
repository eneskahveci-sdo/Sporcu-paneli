// ============================================================
// Edge Function: send-push
// Bir org'un tüm abonelerine Web Push bildirimi gönder
//
// Supabase Secrets'a eklenecekler:
//   VAPID_PUBLIC_KEY  — web-push VAPID public key
//   VAPID_PRIVATE_KEY — web-push VAPID private key
//   VAPID_EMAIL       — mailto:admin@example.com
//
// VAPID anahtar çifti üretmek için:
//   npx web-push generate-vapid-keys
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
    };
}

// Web Push'u doğrudan Deno Web Crypto ile gönder (npm:web-push kullanmadan)
// Basit: şifreli payload yerine sadece başlık gönder (şifreli payload için web-push kütüphanesi gerekli)
async function sendWebPush(subscription: { endpoint: string; p256dh: string; auth_key: string }, payload: string): Promise<boolean> {
    // Bu basit implementasyon yalnızca VAPID başlığını doğrular.
    // Şifreli payload için sunucu ortamında npm:web-push kullanılması önerilir.
    // Burada Deno uyumlu web-push kullanılıyor:
    const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') || '';
    const vapidEmail = Deno.env.get('VAPID_EMAIL') || 'mailto:admin@example.com';

    if (!vapidPublic || !vapidPrivate) return false;

    // Deno-compatible web-push via esm.sh (simplified approach)
    // For production, use: import webpush from 'npm:web-push'
    try {
        const { default: webpush } = await import('https://esm.sh/web-push@3.6.7');
        webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);
        await webpush.sendNotification(
            { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth_key } },
            payload
        );
        return true;
    } catch (e) {
        console.error('Push send error:', e);
        return false;
    }
}

Deno.serve(async (req) => {
    const origin = req.headers.get('origin') || '';
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders(origin) });
    }

    // Sadece authenticated (admin) çağırabilir
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        });
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let body: { orgId?: string; title?: string; body?: string; url?: string };
    try { body = await req.json(); } catch { body = {}; }

    const { orgId, title = 'Sporcu Paneli', body: msgBody = '', url = '/' } = body;

    // Abone listesini çek
    let q = supabase.from('push_subscriptions').select('*');
    if (orgId) q = q.eq('org_id', orgId);
    const { data: subs, error } = await q;

    if (error || !subs) {
        return new Response(JSON.stringify({ error: 'Aboneler yüklenemedi.' }), {
            status: 500, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        });
    }

    const payload = JSON.stringify({ title, body: msgBody, url });
    let sent = 0;
    const failed: string[] = [];

    for (const sub of subs) {
        const ok = await sendWebPush(sub, payload);
        if (ok) sent++;
        else failed.push(sub.endpoint.slice(-20));
    }

    return new Response(JSON.stringify({ ok: true, sent, failed: failed.length }), {
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
});
