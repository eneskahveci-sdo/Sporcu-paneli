-- ============================================================
-- 032_more_missing_columns.sql
-- Veri taşıma sırasında tespit edilen ek eksik kolonlar.
-- ============================================================

ALTER TABLE coaches  ADD COLUMN IF NOT EXISTS nt          JSONB DEFAULT '{}';
ALTER TABLE classes  ADD COLUMN IF NOT EXISTS schedule     TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS blood_type   TEXT NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMPTZ;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS def_vat      NUMERIC NOT NULL DEFAULT 0;

-- Eski veride icon=null olabilir, NOT NULL kısıtını kaldır
ALTER TABLE sports   ALTER COLUMN icon DROP NOT NULL;
