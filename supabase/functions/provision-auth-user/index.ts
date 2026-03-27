import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ALLOWED_ORIGINS = [
  'https://sporcu-paneli.vercel.app',
  'https://dragosfutbolakademisi.com',
  'https://www.dragosfutbolakademisi.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5500',
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function jsonResp(body: Record<string, unknown>, status = 200, req?: Request) {
  const corsHeaders = req ? getCorsHeaders(req) : { 'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0], 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: getCorsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return jsonResp({ error: 'Method not allowed' }, 405, req);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const authHeader = req.headers.get('Authorization') || '';

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResp({ error: 'Server configuration error' }, 500, req);
    }

    if (!authHeader.startsWith('Bearer ')) {
      return jsonResp({ error: 'Unauthorized' }, 401, req);
    }

    const requesterJwt = authHeader.replace('Bearer ', '').trim();

    const serviceSb = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: requesterData, error: requesterErr } = await serviceSb.auth.getUser(requesterJwt);
    if (requesterErr || !requesterData?.user) {
      return jsonResp({ error: 'Unauthorized' }, 401, req);
    }

    const requesterId = requesterData.user.id;
    const { data: requesterRow } = await serviceSb
      .from('users')
      .select('id, role')
      .eq('id', requesterId)
      .maybeSingle();

    if (!requesterRow || requesterRow.role !== 'admin') {
      return jsonResp({ error: 'Forbidden' }, 403, req);
    }

    const body = await req.json();
    const userType = String(body?.userType || '').trim();
    const tc = String(body?.tc || '').replace(/\D/g, '').slice(0, 11);
    const displayName = String(body?.displayName || '').trim();
    const orgId = String(body?.orgId || '').trim();
    const branchId = String(body?.branchId || '').trim();
    const sourceId = String(body?.sourceId || '').trim();

    let email = String(body?.email || '').trim().toLowerCase();
    const password = String(body?.password || '').trim();

    if (!tc || tc.length !== 11) {
      return jsonResp({ error: 'Geçersiz TC' }, 400, req);
    }
    if (userType !== 'athlete' && userType !== 'coach') {
      return jsonResp({ error: 'Geçersiz userType' }, 400, req);
    }
    if (!password || password.length < 6) {
      return jsonResp({ error: 'Şifre en az 6 karakter olmalı' }, 400, req);
    }

    if (!isValidEmail(email)) {
      email = `${tc}@dragosfk.com`;
    }

    const userMetadata: Record<string, unknown> = {
      tc,
      role: userType,
      full_name: displayName || undefined,
      org_id: orgId || undefined,
      branch_id: branchId || undefined,
    };

    if (userType === 'athlete' && sourceId) userMetadata.athlete_id = sourceId;
    if (userType === 'coach' && sourceId) userMetadata.coach_id = sourceId;

    const { data: createData, error: createErr } = await serviceSb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (createErr) {
      const msg = String(createErr.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
        return jsonResp({ ok: true, exists: true, email }, 200, req);
      }
      return jsonResp({ error: createErr.message || 'Auth user oluşturulamadı' }, 400, req);
    }

    return jsonResp({
      ok: true,
      created: true,
      email,
      authUserId: createData?.user?.id || null,
    }, 200, req);
  } catch (err) {
    console.error('provision-auth-user error:', err);
    return jsonResp({ error: 'Beklenmeyen sunucu hatası' }, 500, req);
  }
});
