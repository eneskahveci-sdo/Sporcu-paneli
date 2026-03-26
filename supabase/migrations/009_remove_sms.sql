-- ============================================================
-- SPORCU PANELİ — NetGSM SMS Kaldırma
-- Migration 009
--
-- NetGSM entegrasyonu kaldırıldığından SMS rate limiting
-- tablosu ve fonksiyonu artık kullanılmamaktadır.
--
-- KULLANIM:
--   Supabase Dashboard → SQL Editor'e yapıştır ve çalıştır.
-- ============================================================

DROP FUNCTION IF EXISTS check_sms_rate_limit(TEXT, INTEGER, INTEGER);

DROP TABLE IF EXISTS sms_rate_limits;
