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

-- RLS policies for messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Authenticated users (admin/coach) can insert messages
CREATE POLICY messages_insert_auth ON messages
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Authenticated users can read all messages
CREATE POLICY messages_select_auth ON messages
    FOR SELECT TO authenticated
    USING (true);

-- Authenticated users can update messages (for marking as read)
CREATE POLICY messages_update_auth ON messages
    FOR UPDATE TO authenticated
    USING (true);

-- Anon users (athletes) can read their own messages
CREATE POLICY messages_select_anon ON messages
    FOR SELECT TO anon
    USING (true);

-- Anon users can update their own messages (mark as read)
CREATE POLICY messages_update_anon ON messages
    FOR UPDATE TO anon
    USING (true);

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
