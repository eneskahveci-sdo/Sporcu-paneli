-- ============================================================
-- SPORCU PANELİ — Migration 028
-- Idempotency Guards (Yeniden çalıştırılabilirlik)
--
-- SORUN:
--   Migration 022_new_features.sql `CREATE POLICY ...` çağrılarını
--   IF NOT EXISTS koruması olmadan kullanıyor. PostgreSQL
--   `CREATE POLICY IF NOT EXISTS` söz dizimini desteklemediği için
--   migration yeniden çalıştırıldığında "policy already exists" hatası
--   fırlatıyordu (CI/CD `supabase db push` retry'larını bozuyordu).
--
-- ÇÖZÜM:
--   Bu migration `DROP POLICY IF EXISTS` + `CREATE POLICY` deseni ile
--   policy'leri yeniden oluşturur. Sonuç: tüm migration'lar idempotent.
--
-- AYRICA:
--   - tax_rate/tax_amount kolonları için 3. seviye guard
--   - photo_url kolonu için guard
--   - receipt_counter için guard
--   Hepsi `ADD COLUMN IF NOT EXISTS` ile zaten güvenli; bu migration
--   onları tek noktada konsolide eder.
-- ============================================================

-- pgcrypto (UUID üretimi için) — zaten olmalı
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. payments kolonları (3. seviye guard) ──────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tax_rate   NUMERIC(5,2)  NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

-- ── 2. athletes.photo_url guard ──────────────────────────────
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS photo_url TEXT NOT NULL DEFAULT '';

-- ── 3. settings.receipt_counter guard ────────────────────────
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_counter INTEGER NOT NULL DEFAULT 0;

-- ── 4. activity_logs idempotent policy reset ─────────────────
-- Tablo zaten varsa policy'leri yeniden oluştur (CREATE POLICY IF NOT EXISTS yok)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_logs') THEN
        ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "al_insert_anon" ON activity_logs;
        DROP POLICY IF EXISTS "al_insert_auth" ON activity_logs;
        DROP POLICY IF EXISTS "al_select"      ON activity_logs;

        CREATE POLICY "al_insert_anon" ON activity_logs FOR INSERT TO anon          WITH CHECK (true);
        CREATE POLICY "al_insert_auth" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);
        CREATE POLICY "al_select"      ON activity_logs FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_al_org_date ON activity_logs (org_id, created_at DESC);

-- ── 5. push_subscriptions idempotent policy reset ────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'push_subscriptions') THEN
        ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "ps_insert_anon" ON push_subscriptions;
        DROP POLICY IF EXISTS "ps_insert_auth" ON push_subscriptions;
        DROP POLICY IF EXISTS "ps_delete_anon" ON push_subscriptions;
        DROP POLICY IF EXISTS "ps_delete_auth" ON push_subscriptions;
        DROP POLICY IF EXISTS "ps_select"      ON push_subscriptions;

        CREATE POLICY "ps_insert_anon" ON push_subscriptions FOR INSERT TO anon          WITH CHECK (true);
        CREATE POLICY "ps_insert_auth" ON push_subscriptions FOR INSERT TO authenticated WITH CHECK (true);
        CREATE POLICY "ps_delete_anon" ON push_subscriptions FOR DELETE TO anon          USING (true);
        CREATE POLICY "ps_delete_auth" ON push_subscriptions FOR DELETE TO authenticated USING (true);
        CREATE POLICY "ps_select"      ON push_subscriptions FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- ── 6. password_resets tablo + RLS guard ─────────────────────
-- Bu tabloya RLS etkin ama policy YOK — sadece SECURITY DEFINER fonksiyonlar
-- (reset_password_by_token) erişebilir. Idempotent garanti:
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'password_resets') THEN
        ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pr_token   ON password_resets (token);
CREATE INDEX IF NOT EXISTS idx_pr_expires ON password_resets (expires_at);

-- ── 7. payments performans index (sık kullanılan filtreler) ──
CREATE INDEX IF NOT EXISTS idx_payments_org_branch ON payments (org_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_payments_aid_dt     ON payments (aid, dt DESC);
CREATE INDEX IF NOT EXISTS idx_payments_st_dd      ON payments (st, dd) WHERE st = 'pending';
