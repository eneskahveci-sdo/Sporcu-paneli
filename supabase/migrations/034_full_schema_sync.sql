-- ============================================================
-- 034_full_schema_sync.sql
-- Tüm taşıma hatalarından derlenen eksik kolon ve tip düzeltmeleri.
-- Eski DB ile tam uyumluluk.
-- ============================================================

-- orgs: id TEXT + eksik kolonlar
ALTER TABLE orgs ALTER COLUMN id TYPE TEXT;
ALTER TABLE orgs ALTER COLUMN id DROP DEFAULT;
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT now();
ALTER TABLE orgs ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- branches: id TEXT + eksik kolonlar
ALTER TABLE branches ALTER COLUMN id TYPE TEXT;
ALTER TABLE branches ALTER COLUMN id DROP DEFAULT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS code    TEXT NOT NULL DEFAULT '';

-- sports: created_at + icon null izni
ALTER TABLE sports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE sports ALTER COLUMN icon DROP NOT NULL;

-- coaches: eksik kolonlar
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS nt         JSONB DEFAULT '{}';
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS sd         TEXT NOT NULL DEFAULT '';

-- classes: eksik kolonlar
ALTER TABLE classes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule   TEXT NOT NULL DEFAULT '';

-- athletes: eski DB'de bulunan tüm ekstra kolonlar
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS blood_type        TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS city              TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS school            TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS height            TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS weight            TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS grade             TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS health_notes      TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS emergency_contact TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS parent_email      TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS documents         TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS ci                TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS pp                TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS pp2               TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ DEFAULT now();
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ;

-- payments: eksik kolonlar
ALTER TABLE payments ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT '';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS approved_at  TIMESTAMPTZ;

-- settings: eksik kolonlar
ALTER TABLE settings ADD COLUMN IF NOT EXISTS def_due INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS def_vat NUMERIC NOT NULL DEFAULT 0;

-- Schema cache yenile
NOTIFY pgrst, 'reload schema';
