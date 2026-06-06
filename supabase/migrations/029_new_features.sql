-- ============================================================
-- SPORCU PANELİ — Migration 022
-- Yeni Özellikler: Fotoğraf, Vergi/KDV, Aktivite Logu,
--                  Push Bildirimleri, Şifre Sıfırlama
--
-- KULLANIM:
--   Supabase Dashboard → SQL Editor'e yapıştır ve çalıştır.
-- ============================================================

-- pgcrypto zaten yüklü olmalı (migration 013'ten)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. Sporcu fotoğrafı ──────────────────────────────────────
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS photo_url TEXT NOT NULL DEFAULT '';

-- ── 2. Vergi/KDV alanları ────────────────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tax_rate   NUMERIC(5,2)  NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- ── 3. Aktivite logu tablosu ─────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name   TEXT        NOT NULL DEFAULT '',
    user_role   TEXT        NOT NULL DEFAULT '',
    action      TEXT        NOT NULL,
    entity_type TEXT        NOT NULL DEFAULT '',
    entity_id   TEXT        NOT NULL DEFAULT '',
    details     TEXT        NOT NULL DEFAULT '',
    org_id      UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
-- Tüm roller (anon = sporcu/antrenör, authenticated = admin) ekleyebilir
CREATE POLICY "al_insert_anon"  ON activity_logs FOR INSERT TO anon        WITH CHECK (true);
CREATE POLICY "al_insert_auth"  ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);
-- Sadece admin görebilir
CREATE POLICY "al_select"       ON activity_logs FOR SELECT TO authenticated USING (true);
CREATE INDEX IF NOT EXISTS idx_al_org_date ON activity_logs (org_id, created_at DESC);

-- ── 4. Push abonelik tablosu ─────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name   TEXT        NOT NULL DEFAULT '',
    user_role   TEXT        NOT NULL DEFAULT '',
    endpoint    TEXT        NOT NULL UNIQUE,
    p256dh      TEXT        NOT NULL,
    auth_key    TEXT        NOT NULL,
    org_id      UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ps_insert_anon"  ON push_subscriptions FOR INSERT TO anon        WITH CHECK (true);
CREATE POLICY "ps_insert_auth"  ON push_subscriptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ps_delete_anon"  ON push_subscriptions FOR DELETE TO anon        USING (true);
CREATE POLICY "ps_delete_auth"  ON push_subscriptions FOR DELETE TO authenticated USING (true);
CREATE POLICY "ps_select"       ON push_subscriptions FOR SELECT TO authenticated USING (true);

-- ── 5. Şifre sıfırlama tokenleri ─────────────────────────────
CREATE TABLE IF NOT EXISTS password_resets (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tc          TEXT        NOT NULL,
    role        TEXT        NOT NULL CHECK (role IN ('sporcu', 'coach')),
    token       TEXT        NOT NULL UNIQUE,
    email       TEXT        NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN     NOT NULL DEFAULT false,
    org_id      UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
-- Sadece Edge Functions (service role) erişebilir — direkt istemci erişimi yok

-- ── 6. Şifre sıfırlama DB fonksiyonu ─────────────────────────
-- Edge Function bu fonksiyonu çağırarak şifreyi SHA-256 ile günceller
CREATE OR REPLACE FUNCTION reset_password_by_token(p_token TEXT, p_new_pass TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_reset password_resets%ROWTYPE;
    v_hashed TEXT;
BEGIN
    SELECT * INTO v_reset
    FROM password_resets
    WHERE token = p_token AND used = false AND expires_at > now();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'error', 'Token geçersiz veya süresi dolmuş.');
    END IF;

    v_hashed := encode(digest(p_new_pass, 'sha256'), 'hex');

    IF v_reset.role = 'coach' THEN
        UPDATE coaches SET coach_pass = v_hashed WHERE tc = v_reset.tc;
    ELSE
        UPDATE athletes SET sp_pass = v_hashed WHERE tc = v_reset.tc;
    END IF;

    UPDATE password_resets SET used = true WHERE token = p_token;

    RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION reset_password_by_token(TEXT, TEXT) TO authenticated;
