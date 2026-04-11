-- ============================================================
-- SPORCU PANELİ — Migration 024
-- payments tablosuna eksik kolonlar eklendi
--
-- SORUN:
--   pay_method, notif_status, slip_code, service_name, source,
--   inv, dd, tax_rate ve tax_amount kolonları prodüksiyon DB'de
--   bulunmayabilir → upsert PGRST204 hatası verir.
--
--   tax_rate/tax_amount ayrıca 023_add_tax_columns.sql'de de var;
--   IF NOT EXISTS olduğu için çakışma olmaz.
--
--   Tüm ALTER TABLE komutları IF NOT EXISTS ile korunmuştur;
--   kolon zaten varsa atlanır, yoksa eklenir.
-- ============================================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS service_name  TEXT          NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS source        TEXT          NOT NULL DEFAULT 'manual';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notif_status  TEXT          NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS pay_method    TEXT          NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS slip_code     TEXT          NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS inv           TEXT          DEFAULT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS dd            DATE          DEFAULT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tax_rate      NUMERIC(5,2)  NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS tax_amount    NUMERIC(10,2) NOT NULL DEFAULT 0;
