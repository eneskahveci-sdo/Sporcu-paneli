-- ============================================================
-- SPORCU PANELİ — on_kayitlar Tablo Oluşturma
-- Migration 012
--
-- DEĞİŞİKLİKLER:
--   on_kayitlar tablosu için CREATE TABLE IF NOT EXISTS eklendi.
--   Önceki migration dosyalarında (002, 010, 011) tabloya ALTER/GRANT/RLS
--   yapılıyordu fakat tablo oluşturma komutu yoktu.
--   Bu migration tablo yoksa oluşturur, varsa hiçbir şey yapmaz.
--
-- KULLANIM:
--   Supabase Dashboard → SQL Editor'e yapıştır ve çalıştır.
-- ============================================================

-- ── Tablo oluştur (yoksa) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS on_kayitlar (
    id TEXT PRIMARY KEY,
    student_name TEXT NOT NULL DEFAULT '',
    fn TEXT DEFAULT '',
    ln TEXT DEFAULT '',
    bd DATE,
    tc TEXT,
    cls_id TEXT,
    class_name TEXT DEFAULT '',
    parent_name TEXT DEFAULT '',
    parent_phone TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    org_id TEXT,
    branch_id TEXT,
    kvkk_consent BOOLEAN DEFAULT false,
    consent_date DATE
);

-- ── Tablo erişim hakları (010 migration tekrarı — idempotent) ──
GRANT SELECT, INSERT, UPDATE, DELETE ON on_kayitlar TO authenticated, service_role;
GRANT SELECT, INSERT ON on_kayitlar TO anon;
GRANT UPDATE ON on_kayitlar TO anon;

-- ── RLS aktif et ─────────────────────────────────────────────
ALTER TABLE on_kayitlar ENABLE ROW LEVEL SECURITY;

-- ── Anon: SELECT — form açılırken mevcut kayıt kontrolü ──────
DROP POLICY IF EXISTS "onkayitlar_select_anon" ON on_kayitlar;
CREATE POLICY "onkayitlar_select_anon" ON on_kayitlar
  FOR SELECT TO anon USING (true);

-- ── Anon: INSERT — kamuya açık ön kayıt formu ────────────────
DROP POLICY IF EXISTS "onkayitlar_insert_anon" ON on_kayitlar;
CREATE POLICY "onkayitlar_insert_anon" ON on_kayitlar
  FOR INSERT TO anon
  WITH CHECK (
    student_name IS NOT NULL
    AND student_name <> ''
    AND parent_phone IS NOT NULL
    AND parent_phone <> ''
  );

-- ── Anon: UPDATE — KVKK consent güncellemesi ─────────────────
DROP POLICY IF EXISTS "onkayitlar_update_anon" ON on_kayitlar;
CREATE POLICY "onkayitlar_update_anon" ON on_kayitlar
  FOR UPDATE TO anon
  USING (kvkk_consent IS NULL OR kvkk_consent = false)
  WITH CHECK (
    kvkk_consent IS NOT NULL
    AND kvkk_consent = true
    AND consent_date IS NOT NULL
  );

-- ── Authenticated: tam erişim (admin/antrenör paneli) ────────
DROP POLICY IF EXISTS "onkayitlar_select_auth" ON on_kayitlar;
CREATE POLICY "onkayitlar_select_auth" ON on_kayitlar
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "onkayitlar_insert_auth" ON on_kayitlar;
CREATE POLICY "onkayitlar_insert_auth" ON on_kayitlar
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "onkayitlar_update_auth" ON on_kayitlar;
CREATE POLICY "onkayitlar_update_auth" ON on_kayitlar
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "onkayitlar_delete_auth" ON on_kayitlar;
CREATE POLICY "onkayitlar_delete_auth" ON on_kayitlar
  FOR DELETE TO authenticated USING (true);

-- ── TAMAMLANDI ────────────────────────────────────────────────
-- Bu migration çalıştırıldıktan sonra:
--   1. on_kayitlar tablosu yoksa oluşturulur
--   2. Tüm RLS politikaları ve erişim hakları güncellenir
--   3. Anon SELECT izni eklendi (formda kayıt kontrolü için)
-- ============================================================
