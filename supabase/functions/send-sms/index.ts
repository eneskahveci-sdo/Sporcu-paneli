// Supabase Edge Function: send-sms
// NetGSM SMS gönderimini sunucu tarafında gerçekleştirir.
// Credentials Supabase environment variables'dan okunur.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// DB tabanlı rate limiting (IP başına dakikada max 5 SMS)
// Tüm serverless instance'lar aynı DB'yi kullandığından gerçek koruma sağlar.
// Gerekli: check_sms_rate_limit() fonksiyonu ve sms_rate_limits tablosu (fix-rate-limit.sql)
async function checkRateLimit(ip: string): Promise<boolean> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      console.warn('Rate limit: DB env vars eksik, istek geçiriliyor');
      return true;
    }
    const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/check_sms_rate_limit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ client_ip: ip, max_count: 5, window_seconds: 60 }),
    });
    if (!resp.ok) {
      console.warn('Rate limit RPC başarısız, istek geçiriliyor:', resp.status);
      return true;
    }
    const allowed = await resp.json();
    return allowed === true;
  } catch (e) {
    console.warn('Rate limit hatası, istek geçiriliyor:', e);
    return true;
  }
}

Deno.serve(async (req: Request) => {
  // CORS preflight — must respond before any auth check so browsers
  // receive proper CORS headers even when JWT verification is disabled.
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  // JWT doğrulama — sadece authenticated (giriş yapmış) kullanıcılar SMS gönderebilir.
  // Anon key ile çağrı reddedilir; admin panelinden yapılan çağrılar her zaman
  // authenticated JWT taşıdığından bu kontrol mevcut kullanımı bozmaz.
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Sunucu yapılandırma hatası' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  // Token'ın gerçek bir oturum JWT'si olduğunu doğrula (anon key değil)
  const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': serviceRoleKey,
    },
  });

  if (!userResp.ok) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   req.headers.get('cf-connecting-ip') || 'unknown';
  if (!await checkRateLimit(clientIp)) {
    return new Response(
      JSON.stringify({ error: 'Çok fazla istek. Lütfen bir dakika bekleyin.' }),
      { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { phone, message } = await req.json();

    if (!phone || !message) {
      return new Response(
        JSON.stringify({ error: 'phone ve message alanları zorunludur.' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const netgsmUser = Deno.env.get('NETGSM_USER');
    const netgsmPass = Deno.env.get('NETGSM_PASS');
    const netgsmHeader = Deno.env.get('NETGSM_HEADER') || 'BILGI';

    if (!netgsmUser || !netgsmPass) {
      return new Response(
        JSON.stringify({ error: 'SMS servisi yapılandırılmamış.' }),
        { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Telefon numarasını temizle
    const cleanPhone = phone.replace(/[\s\-()]/g, '').replace(/^(\+90|0090|90)/, '');

    const smsUrl = `https://api.netgsm.com.tr/sms/send/get/?usercode=${encodeURIComponent(netgsmUser)}&password=${encodeURIComponent(netgsmPass)}&gsmno=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(message)}&msgheader=${encodeURIComponent(netgsmHeader)}`;

    const smsResp = await fetch(smsUrl, { method: 'GET' });
    const smsText = await smsResp.text();

    return new Response(
      JSON.stringify({ ok: true, result: smsText }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('SMS gönderim hatası:', err);
    return new Response(
      JSON.stringify({ error: 'SMS gönderilemedi.' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
