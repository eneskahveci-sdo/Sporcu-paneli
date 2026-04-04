-- ============================================================
-- SPORCU PANELİ — Migration 023
-- payments tablosuna tax_rate ve tax_amount kolonları ekle
--
-- SORUN: 022_new_features.sql iki adet 022_ prefix'li
--   migration arasında sıralama çakışması nedeniyle
--   production DB'ye uygulanmadı.
--
-- Bu migration sadece eksik kolonları idempotent şekilde ekler.
-- ============================================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS tax_rate   NUMERIC(5,2)  NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
