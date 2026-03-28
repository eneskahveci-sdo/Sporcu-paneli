-- ============================================================
-- SPORCU PANELİ — Migration 018
-- Admin Rol Zorunluluğu (Server-Side Authorization)
--
-- SORUN:
--   Tüm authenticated kullanıcılar (admin, antrenör, sporcu)
--   RLS USING(true) nedeniyle aynı yetkiye sahipti.
--   Client-side AppState.currentUser.role manipüle edilerek
--   admin işlemleri yapılabiliyordu.
--
-- ÇÖZÜM:
--   is_admin() SECURITY DEFINER fonksiyonu ile sunucu tarafında
--   gerçek admin kontrolü yapılır. Kritik tablolarda bu kontrol
--   RLS politikalarına eklenir.
--
-- ETKİLENEN TABLOLAR:
--   • users     — sadece admin veya kendi kaydı görülebilir
--   • coaches   — INSERT/UPDATE/DELETE sadece admin
--   • settings  — INSERT/UPDATE sadece admin
--   • branches  — INSERT/UPDATE/DELETE sadece admin
--   • athletes  — DELETE sadece admin
--   • on_kayitlar — DELETE sadece admin
--
-- BOZULMAYAN İŞLEMLER:
--   • Antrenör: athletes/attendance/payments okuma, attendance yazma
--   • Sporcu: kendi verilerini okuma
--   • Herkese açık: settings SELECT (logo/okul adı), branches SELECT
-- ============================================================

-- ── 1. is_admin() — sunucu tarafı admin kontrolü ─────────────
-- SECURITY DEFINER: RLS'i bypass ederek users tablosunu güvenle okur.
-- auth.uid() ile oturumu açık kullanıcının ID'sini alır.
-- Sadece users tablosunda role='admin' olan kullanıcılar için true döner.

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION is_admin() FROM anon;


-- ── 2. users tablosu — sadece admin veya kendi kaydı ─────────
-- Önceki: tüm authenticated kullanıcılar herkesi görebiliyordu.
-- Yeni: admin herkesi görür; diğerleri sadece kendi kaydını.

DROP POLICY IF EXISTS "users_select" ON users;
CREATE POLICY "users_select" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "users_insert" ON users;
CREATE POLICY "users_insert" ON users
  FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR id = auth.uid());

DROP POLICY IF EXISTS "users_update" ON users;
CREATE POLICY "users_update" ON users
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_admin())
  WITH CHECK (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "users_delete" ON users;
CREATE POLICY "users_delete" ON users
  FOR DELETE TO authenticated
  USING (is_admin());


-- ── 3. coaches — yazma sadece admin ──────────────────────────
-- SELECT: tüm authenticated (antrenörler birbirini görebilir, sporcu profili gösterir)
-- INSERT/UPDATE/DELETE: sadece admin

DROP POLICY IF EXISTS "coaches_insert" ON coaches;
CREATE POLICY "coaches_insert" ON coaches
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "coaches_update" ON coaches;
CREATE POLICY "coaches_update" ON coaches
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "coaches_delete" ON coaches;
CREATE POLICY "coaches_delete" ON coaches
  FOR DELETE TO authenticated
  USING (is_admin());


-- ── 4. settings — yazma sadece admin ─────────────────────────
-- SELECT: herkese açık (logo, okul adı login ekranında gerekli)
-- INSERT/UPDATE: sadece admin

DROP POLICY IF EXISTS "settings_insert" ON settings;
CREATE POLICY "settings_insert" ON settings
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "settings_update" ON settings;
CREATE POLICY "settings_update" ON settings
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());


-- ── 5. branches — yazma sadece admin ─────────────────────────
-- SELECT: anon + authenticated (login ekranında şube seçimi için gerekli)

DROP POLICY IF EXISTS "branches_insert" ON branches;
CREATE POLICY "branches_insert" ON branches
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "branches_update" ON branches;
CREATE POLICY "branches_update" ON branches
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "branches_delete" ON branches;
CREATE POLICY "branches_delete" ON branches
  FOR DELETE TO authenticated
  USING (is_admin());


-- ── 6. athletes — DELETE sadece admin ────────────────────────
-- SELECT: authenticated (antrenör listeyebilir)
-- INSERT/UPDATE: authenticated (antrenör yoklama/not girebilir)
-- DELETE: sadece admin (sporcu silme kritik işlem)

DROP POLICY IF EXISTS "athletes_delete" ON athletes;
CREATE POLICY "athletes_delete" ON athletes
  FOR DELETE TO authenticated
  USING (is_admin());


-- ── 7. on_kayitlar — DELETE sadece admin ─────────────────────

DROP POLICY IF EXISTS "onkayitlar_delete_auth" ON on_kayitlar;
CREATE POLICY "onkayitlar_delete_auth" ON on_kayitlar
  FOR DELETE TO authenticated
  USING (is_admin());


-- ── TAMAMLANDI ────────────────────────────────────────────────
-- Bu migration çalıştırıldıktan sonra:
--   1. Bir antrenör veya sporcu AppState'i manipüle etse bile
--      sunucu tarafında is_admin() false döner → DB işlemi reddedilir.
--   2. users tablosu artık admin-only; antrenör/sporcu diğer
--      admin hesaplarını göremez.
--   3. coaches/settings/branches yazma işlemleri DB düzeyinde korunur.
--   4. athletes silme işlemi DB düzeyinde admin-only.
-- ============================================================
