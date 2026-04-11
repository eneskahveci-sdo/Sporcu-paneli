-- ============================================================
-- SPORCU PANELİ — Migration 024
-- payments tablosuna eksik kolonlar eklendi
--
-- SORUN:
--   pay_method, notif_status, slip_code, service_name, source,
--   inv ve dd kolonları hiçbir migration'da tanımlı değil.
--   Tablo Supabase UI üzerinden manuel oluşturulmuşsa bu kolonlar
--   prodüksiyon DB'de bulunmayabilir → upsert PGRST204 hatası verir.
--
--   Tüm ALTER TABLE komutları IF NOT EXISTS ile korunmuştur;
--   kolon zaten varsa atlanır, yoksa eklenir.
-- ============================================================

ALTER TABLE payments ADD COLUMN IF NOT EXISTS service_name  TEXT        NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS source        TEXT        NOT NULL DEFAULT 'manual';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notif_status  TEXT        NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS pay_method    TEXT        NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS slip_code     TEXT        NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS inv           TEXT        DEFAULT NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS dd            DATE        DEFAULT NULL;
