-- ============================================================
-- SPORCU PANELİ — Migration 025
-- Eksik tablo ve kolonlar (manuel uygulanan SQL'lerin migration kaydı)
--
-- Bu migration'daki tüm komutlar IF NOT EXISTS ile korunmuştur.
-- Kolon/tablo zaten varsa atlanır, yoksa eklenir.
-- ============================================================

-- ── athletes: eksik kolonlar ─────────────────────────────────
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS photo_url   TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS cls_id      TEXT DEFAULT NULL;
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS pph         TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS pem         TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS org_id      TEXT NOT NULL DEFAULT '';
ALTER TABLE athletes ADD COLUMN IF NOT EXISTS branch_id   TEXT NOT NULL DEFAULT '';

-- ── settings: PayTR kolonları ────────────────────────────────
ALTER TABLE settings ADD COLUMN IF NOT EXISTS paytr_active      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS paytr_merchant_id TEXT    NOT NULL DEFAULT '';

-- ── coaches: org/branch kolonları ────────────────────────────
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS org_id    TEXT NOT NULL DEFAULT '';
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS branch_id TEXT NOT NULL DEFAULT '';

-- ── attendance: org/branch kolonları ─────────────────────────
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS org_id    TEXT NOT NULL DEFAULT '';
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS branch_id TEXT NOT NULL DEFAULT '';

-- ── users: eksik kolonlar ────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id    TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS pass      TEXT NOT NULL DEFAULT '';

-- ── cash_transfers tablosu (kasa transferleri) ───────────────
CREATE TABLE IF NOT EXISTS cash_transfers (
    id          TEXT        PRIMARY KEY,
    org_id      TEXT        NOT NULL DEFAULT '',
    branch_id   TEXT        NOT NULL DEFAULT '',
    direction   TEXT        NOT NULL DEFAULT 'in',
    amount      NUMERIC     NOT NULL DEFAULT 0,
    description TEXT        NOT NULL DEFAULT '',
    dt          DATE        NOT NULL DEFAULT CURRENT_DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE cash_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cash_transfers_all" ON cash_transfers;
CREATE POLICY "cash_transfers_all" ON cash_transfers
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── wa_messages tablosu (WhatsApp mesaj geçmişi) ─────────────
CREATE TABLE IF NOT EXISTS wa_messages (
    id         TEXT        PRIMARY KEY,
    org_id     TEXT        NOT NULL DEFAULT '',
    branch_id  TEXT        NOT NULL DEFAULT '',
    phone      TEXT        NOT NULL DEFAULT '',
    message    TEXT        NOT NULL DEFAULT '',
    status     TEXT        NOT NULL DEFAULT 'sent',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wa_messages_all" ON wa_messages;
CREATE POLICY "wa_messages_all" ON wa_messages
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
