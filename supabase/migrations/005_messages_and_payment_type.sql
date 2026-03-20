-- ═══════════════════════════════════════════════════════════════════
-- Migration 005: Messages table + Payment type column
-- ═══════════════════════════════════════════════════════════════════

-- ── 1) Messages table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT,
    branch_id TEXT,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL DEFAULT '',
    sender_role TEXT NOT NULL DEFAULT 'admin',  -- 'admin' or 'coach'
    recipient_id TEXT NOT NULL,                 -- athlete id
    recipient_name TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast athlete-specific queries
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- RLS: Enable and create policies (consistent with 001_rls_policies.sql pattern)
-- Note: If 001_rls_policies.sql already created messages policies,
-- these IF NOT EXISTS equivalents ensure idempotency.
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Grant permissions to anon (consistent with other tables)
GRANT SELECT ON messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO authenticated, service_role;

-- Create policies only if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_select') THEN
        EXECUTE 'CREATE POLICY messages_select ON messages FOR SELECT TO anon, authenticated USING (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_insert') THEN
        EXECUTE 'CREATE POLICY messages_insert ON messages FOR INSERT TO authenticated WITH CHECK (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_update') THEN
        EXECUTE 'CREATE POLICY messages_update ON messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_delete') THEN
        EXECUTE 'CREATE POLICY messages_delete ON messages FOR DELETE TO authenticated USING (true)';
    END IF;
END $$;

-- Anon role needs UPDATE for marking messages as read (is_read field)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_update_anon') THEN
        EXECUTE 'CREATE POLICY messages_update_anon ON messages FOR UPDATE TO anon USING (true)';
    END IF;
END $$;
GRANT UPDATE ON messages TO anon;

-- ── 2) Payment type column ─────────────────────────────────────────
-- Add payment_type column to payments table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payments' AND column_name = 'payment_type'
    ) THEN
        ALTER TABLE payments ADD COLUMN payment_type TEXT NOT NULL DEFAULT 'aidat';
    END IF;
END $$;
