-- ═══════════════════════════════════════════════════════════════════
-- Migration 006: Missing columns for WhatsApp settings and receipts
-- ═══════════════════════════════════════════════════════════════════
-- Bu migration eksik sütunları ekler.
-- IF NOT EXISTS korumasıyla güvenle birden fazla kez çalıştırılabilir.

-- ── 1) settings tablosu: WhatsApp entegrasyonu sütunları ───────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settings' AND column_name = 'wa_active'
    ) THEN
        ALTER TABLE settings ADD COLUMN wa_active BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settings' AND column_name = 'wa_api_token'
    ) THEN
        ALTER TABLE settings ADD COLUMN wa_api_token TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settings' AND column_name = 'wa_phone_id'
    ) THEN
        ALTER TABLE settings ADD COLUMN wa_phone_id TEXT NOT NULL DEFAULT '';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settings' AND column_name = 'wa_reminder_day'
    ) THEN
        ALTER TABLE settings ADD COLUMN wa_reminder_day INTEGER NOT NULL DEFAULT 1;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settings' AND column_name = 'receipt_counter'
    ) THEN
        ALTER TABLE settings ADD COLUMN receipt_counter INTEGER NOT NULL DEFAULT 0;
    END IF;
END $$;

-- ── 2) payments tablosu: Makbuz numarası sütunu ────────────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'payments' AND column_name = 'receipt_no'
    ) THEN
        ALTER TABLE payments ADD COLUMN receipt_no TEXT NOT NULL DEFAULT '';
    END IF;
END $$;
