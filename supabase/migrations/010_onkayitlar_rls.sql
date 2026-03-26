-- ============================================================
-- SPORCU PANELİ — on_kayitlar Tablo Erişim İzinleri
-- Migration 010
--
-- DEĞİŞİKLİKLER:
--   on_kayitlar tablosu 001_rls_policies.sql'de yer almıyordu.
--   Bu nedenle:
--     • Anon kullanıcılar ön kayıt formu gönderemiyordu
--       (INSERT izni yoktu — hata sessizce yutuldu)
--     • Admin/antrenörler ön kayıtları göremiyordu
--       (SELECT politikası yoktu)
--
-- KULLANIM:
--   Supabase Dashboard → SQL Editor'e yapıştır ve çalıştır.
-- ============================================================

-- ── Tablo erişim hakları ──────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON on_kayitlar TO authenticated, service_role;
GRANT INSERT ON on_kayitlar TO anon;
GRANT UPDATE ON on_kayitlar TO anon;

-- ── RLS aktif et ─────────────────────────────────────────────
ALTER TABLE on_kayitlar ENABLE ROW LEVEL SECURITY;

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
  USING (true)
  WITH CHECK (kvkk_consent IS NOT NULL);

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
--   1. Kamuya açık ön kayıt formu (anon) DB'ye kayıt ekleyebilir
--   2. KVKK consent güncellemesi çalışır
--   3. Admin ve antrenörler ön kayıtları görebilir, düzenleyebilir
-- ============================================================
