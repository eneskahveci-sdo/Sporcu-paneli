-- ============================================================
-- Migration 023: payments — anon role INSERT yetkisi
--
-- SORUN:
--   Migration 008'de payments tablosu için anon INSERT RLS politikası
--   oluşturulmuştu, ancak tablo düzeyinde GRANT INSERT hiç verilmemişti.
--   Bu nedenle sporcu (anon) ödeme kaydı oluştururken veritabanı
--   "permission denied" hatası veriyordu → "Ödeme kaydedilemedi".
--
-- ÇÖZÜM:
--   anon role'e payments tablosunda INSERT yetkisi verildi.
--   Güvenlik migration 017'deki RLS politikası ile sağlanmaktadır:
--   WITH CHECK (branch_id IS NOT NULL AND org_id IS NOT NULL)
--
-- KULLANIM:
--   Supabase Dashboard → SQL Editor'e yapıştır ve çalıştır.
-- ============================================================

GRANT INSERT ON payments TO anon;
