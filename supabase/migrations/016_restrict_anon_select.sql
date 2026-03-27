-- ============================================================
-- SPORCU PANELİ — Migration 016
-- Anonim SELECT Kısıtlaması
--
-- SORUN:
--   athletes, coaches, payments, attendance, messages ve on_kayitlar
--   tablolarında USING (true) ile herkes — anon dahil — tüm satırları
--   okuyabiliyordu. Bu KVKK ihlali ve kişisel veri sızıntısı riskidir.
--
-- ÇÖZÜM:
--   Bu tablolarda anon SELECT tamamen kaldırıldı.
--   Okuma artık sadece authenticated (giriş yapmış) kullanıcılara açık.
--
-- GÜVENLİ:
--   • Login akışı etkilenmez — get_auth_email() ve login_with_tc()
--     SECURITY DEFINER fonksiyonlar, RLS'i zaten bypass eder.
--   • Sporcu/antrenör paneli etkilenmez — signInWithPassword sonrası
--     kullanıcı authenticated role alır, tüm sorgular çalışmaya devam eder.
--   • Ön kayıt formu etkilenmez — anon INSERT korunuyor.
--   • Login ekranındaki okul adı/logo etkilenmez — settings anon SELECT korunuyor.
--   • Branş/organizasyon seçimi etkilenmez — branches/orgs anon SELECT korunuyor.
--   • Spor/sınıf listeleri etkilenmez — sports/classes anon SELECT korunuyor.
--
-- KULLANIM:
--   Supabase Dashboard → SQL Editor'e yapıştır ve çalıştır.
-- ============================================================

-- ── athletes: anon SELECT kaldırıldı ─────────────────────────
DROP POLICY IF EXISTS "athletes_select" ON athletes;
CREATE POLICY "athletes_select" ON athletes
  FOR SELECT TO authenticated USING (true);

-- ── coaches: anon SELECT kaldırıldı ──────────────────────────
DROP POLICY IF EXISTS "coaches_select" ON coaches;
CREATE POLICY "coaches_select" ON coaches
  FOR SELECT TO authenticated USING (true);

-- ── payments: anon SELECT kaldırıldı ─────────────────────────
DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments
  FOR SELECT TO authenticated USING (true);

-- ── attendance: anon SELECT kaldırıldı ───────────────────────
DROP POLICY IF EXISTS "attendance_select" ON attendance;
CREATE POLICY "attendance_select" ON attendance
  FOR SELECT TO authenticated USING (true);

-- ── messages: anon SELECT kaldırıldı ─────────────────────────
--   Not: anon UPDATE (is_read) ayrı policy ile korunuyor, dokunulmadı.
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
  FOR SELECT TO authenticated USING (true);

-- ── on_kayitlar: anon SELECT kaldırıldı ──────────────────────
--   Ön kayıt formu sadece INSERT yapıyor, SELECT gerekmez.
DROP POLICY IF EXISTS "onkayitlar_select" ON on_kayitlar;
CREATE POLICY "onkayitlar_select" ON on_kayitlar
  FOR SELECT TO authenticated USING (true);

-- ── TAMAMLANDI ────────────────────────────────────────────────
-- Bu migration çalıştırıldıktan sonra:
--   1. Giriş yapmadan (anon key ile) kişisel veri okunamaz.
--   2. TC, telefon, e-posta, ödeme bilgileri korumalıdır.
--   3. KVKK ihlali riski önemli ölçüde azalır.
--   4. Mevcut tüm panel işlevleri çalışmaya devam eder.
-- ============================================================
