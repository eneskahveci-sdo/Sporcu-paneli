-- ================================================================
-- Migration 002: KVKK Hukuki Uyum
-- Tarih: 2026-03-18
-- Açıklama: deletion_requests tablosu + settings/on_kayitlar güncelleme
-- ================================================================

-- 1. deletion_requests tablosu
CREATE TABLE IF NOT EXISTS deletion_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    athlete_id TEXT,
    athlete_name TEXT,
    athlete_tc TEXT,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    org_id TEXT,
    branch_id TEXT
);

ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='deletion_requests' AND policyname='delreq_insert_anon') THEN
        CREATE POLICY "delreq_insert_anon" ON deletion_requests FOR INSERT TO anon WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='deletion_requests' AND policyname='delreq_select_auth') THEN
        CREATE POLICY "delreq_select_auth" ON deletion_requests FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='deletion_requests' AND policyname='delreq_update_auth') THEN
        CREATE POLICY "delreq_update_auth" ON deletion_requests FOR UPDATE TO authenticated USING (true);
    END IF;
END $$;

GRANT SELECT, INSERT ON deletion_requests TO anon;
GRANT ALL ON deletion_requests TO authenticated, service_role;

-- 2. settings tablosuna hukuki alanlar
ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS kvkk_text TEXT,
    ADD COLUMN IF NOT EXISTS terms_text TEXT,
    ADD COLUMN IF NOT EXISTS data_controller_name TEXT,
    ADD COLUMN IF NOT EXISTS data_controller_address TEXT,
    ADD COLUMN IF NOT EXISTS data_controller_phone TEXT,
    ADD COLUMN IF NOT EXISTS data_controller_email TEXT,
    ADD COLUMN IF NOT EXISTS data_controller_tax_no TEXT,
    ADD COLUMN IF NOT EXISTS data_retention_years INTEGER DEFAULT 5,
    ADD COLUMN IF NOT EXISTS breach_procedure TEXT,
    ADD COLUMN IF NOT EXISTS cookie_banner_enabled BOOLEAN DEFAULT true;

-- 3. on_kayitlar tablosuna rıza alanları
ALTER TABLE on_kayitlar
    ADD COLUMN IF NOT EXISTS kvkk_consent BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS consent_date DATE;
