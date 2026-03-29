// ============================================================
// Edge Function: reset-password
// Şifre sıfırlama e-postası gönder ve token doğrula
//
// Supabase Secrets'a eklenecekler:
//   RESEND_API_KEY  — Resend.com API anahtarı
//   SITE_URL        — https://sporcu-paneli.vercel.app
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
    'https://sporcu-paneli.vercel.app',
    'https://dragosfutbolakademisi.com',
    'https://www.dragosfutbolakademisi.com',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5500',
];

function corsHeaders(origin: string) {
    return {
        'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
}

function jsonResponse(data: unknown, status = 200, origin = '') {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
    });
}

// SHA-256 hash (Web Crypto API — Deno built-in)
async function sha256(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(text));
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Güvenli random token (hex)
function randomToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
    const origin = req.headers.get('origin') || '';
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders(origin) });
    }
    if (req.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405, origin);
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let body: Record<string, string>;
    try {
        body = await req.json();
    } catch {
        return jsonResponse({ error: 'Geçersiz JSON' }, 400, origin);
    }

    // ── 1. Token doğrula + şifre güncelle ─────────────────────────────────
    if (body.token && body.newPassword) {
        if (body.newPassword.length < 6) {
            return jsonResponse({ error: 'Şifre en az 6 karakter olmalı.' }, 400, origin);
        }
        const { data: result, error } = await supabase.rpc('reset_password_by_token', {
            p_token: body.token,
            p_new_pass: body.newPassword,
        });
        if (error) return jsonResponse({ error: error.message }, 500, origin);
        if (result && !result.ok) return jsonResponse({ error: result.error }, 400, origin);
        return jsonResponse({ ok: true }, 200, origin);
    }

    // ── 2. Sıfırlama e-postası gönder ─────────────────────────────────────
    if (body.tc && body.email && body.role) {
        const table = body.role === 'coach' ? 'coaches' : 'athletes';

        const { data: user } = await supabase
            .from(table)
            .select('id, fn, ln, em, pem')
            .eq('tc', body.tc.trim())
            .single();

        // Kullanıcı yok veya e-posta eşleşmiyor → aynı "başarılı" mesaj
        // (kullanıcı numaralandırma saldırısını önlemek için)
        const emailMatch = user && (
            (user.em && user.em.toLowerCase() === body.email.toLowerCase()) ||
            (user.pem && user.pem.toLowerCase() === body.email.toLowerCase())
        );

        if (user && emailMatch) {
            const token = randomToken();
            const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 saat

            await supabase.from('password_resets').insert({
                tc: body.tc.trim(),
                role: body.role,
                token,
                email: body.email.trim().toLowerCase(),
                expires_at: expiresAt,
            });

            const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
            const SITE_URL = Deno.env.get('SITE_URL') || 'https://sporcu-paneli.vercel.app';
            const resetUrl = `${SITE_URL}?reset=${token}`;
            const userName = user.fn ? `${user.fn} ${user.ln || ''}`.trim() : 'Kullanıcı';

            if (RESEND_API_KEY) {
                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: 'Sporcu Paneli <noreply@dragosfutbolakademisi.com>',
                        to: body.email.trim(),
                        subject: 'Şifre Sıfırlama Talebi',
                        html: `
                            <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
                                <h2>Merhaba ${userName},</h2>
                                <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın.</p>
                                <p>Bu bağlantı <strong>2 saat</strong> geçerlidir.</p>
                                <p><a href="${resetUrl}" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Şifremi Sıfırla</a></p>
                                <p style="color:#666;font-size:13px">Bu işlemi siz yapmadıysanız bu e-postayı görmezden gelin.</p>
                            </div>
                        `,
                    }),
                });
            }
        }

        // Her durumda aynı başarılı yanıt (kullanıcı numaralandırmasını önler)
        return jsonResponse({ ok: true }, 200, origin);
    }

    return jsonResponse({ error: 'Geçersiz istek parametreleri.' }, 400, origin);
});
