-- ============================================================
-- 031_missing_columns_from_old_db.sql
-- Eski Supabase'de bulunan ama yeni şemada eksik olan kolonlar.
-- Veri taşıma sırasında "column not found in schema cache" hataları
-- bu kolonların yokluğundan kaynaklanıyordu.
-- ============================================================

ALTER TABLE orgs     ADD COLUMN IF NOT EXISTS approved_at   TIMESTAMPTZ;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS address        TEXT NOT NULL DEFAULT '';
ALTER TABLE sports   ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ DEFAULT now();
ALTER TABLE coaches  ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ DEFAULT now();
ALTER TABLE classes  ADD COLUMN IF NOT EXISTS created_at     TIMESTAMPTZ DEFAULT now();
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS address        TEXT NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS account_type   TEXT NOT NULL DEFAULT '';
ALTER TABLE settings ADD COLUMN IF NOT EXISTS def_due        INTEGER NOT NULL DEFAULT 1;
