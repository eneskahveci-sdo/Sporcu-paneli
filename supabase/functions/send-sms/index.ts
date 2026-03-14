// Supabase Edge Function: send-sms
// NetGSM SMS gönderimini sunucu tarafında gerçekleştirir.
// Credentials Supabase environment variables'dan okunur.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Basit in-memory rate limiting (IP başına dakikada max 5 SMS)
// NOT: Serverless ortamda birden fazla instance çalışabilir.
// Üretim ortamında dağıtık rate limiting için Redis veya DB kullanılmalıdır.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 dakika

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }
  entry.count++;
  return true;
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                   req.headers.get('cf-connecting-ip') || 'unknown';
  if (!checkRateLimit(clientIp)) {
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
