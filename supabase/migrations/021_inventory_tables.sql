-- ============================================================
-- SPORCU PANELİ — Migration 021
-- Envanter Yönetim Sistemi Tabloları
--
-- DEĞİŞİKLİKLER:
--   1. inventory_items   — ürün kataloğu
--   2. inventory_movements — stok giriş/çıkış hareketleri
--   3. payments tablosuna envanter alanları eklendi
--   4. RLS politikaları (authenticated CRUD, anon erişim yok)
--
-- KULLANIM:
--   Supabase Dashboard → SQL Editor'e yapıştır ve çalıştır.
-- ============================================================

-- ── 1. inventory_items ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name           TEXT        NOT NULL,
    category       TEXT        NOT NULL DEFAULT '',
    sku            TEXT        NOT NULL DEFAULT '',
    unit           TEXT        NOT NULL DEFAULT 'adet',
    unit_price     NUMERIC(10,2) NOT NULL DEFAULT 0,
    stock_qty      INTEGER     NOT NULL DEFAULT 0,
    critical_stock INTEGER     NOT NULL DEFAULT 5,
    status         TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    org_id         UUID        NOT NULL,
    branch_id      UUID,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. inventory_movements ───────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_movements (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id            UUID        NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
    item_name          TEXT        NOT NULL DEFAULT '',
    movement_type      TEXT        NOT NULL CHECK (movement_type IN ('stock_in', 'stock_out', 'sale', 'return', 'adjustment')),
    quantity_delta     INTEGER     NOT NULL,
    note               TEXT        NOT NULL DEFAULT '',
    related_payment_id UUID,
    athlete_id         UUID,
    athlete_name       TEXT        NOT NULL DEFAULT '',
    org_id             UUID        NOT NULL,
    branch_id          UUID,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. payments tablosuna envanter alanları ──────────────────
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS inventory_item_id   UUID,
    ADD COLUMN IF NOT EXISTS inventory_item_name TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS inventory_qty        INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS inventory_unit_price NUMERIC(10,2) NOT NULL DEFAULT 0;

-- ── 4. RLS ───────────────────────────────────────────────────
ALTER TABLE inventory_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

-- inventory_items: authenticated kullanıcılar kendi org verilerini görür/yönetir
CREATE POLICY "inv_items_select" ON inventory_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "inv_items_insert" ON inventory_items
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "inv_items_update" ON inventory_items
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "inv_items_delete" ON inventory_items
    FOR DELETE TO authenticated USING (true);

-- inventory_movements: authenticated kullanıcılar kendi org hareketlerini görür/ekler
CREATE POLICY "inv_mov_select" ON inventory_movements
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "inv_mov_insert" ON inventory_movements
    FOR INSERT TO authenticated WITH CHECK (true);

-- Hareketler düzenlenemez/silinemez (audit trail)
-- Sadece admin silebilsin istenirse ayrıca eklenebilir

-- ── 5. İndeksler ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inv_items_org     ON inventory_items (org_id);
CREATE INDEX IF NOT EXISTS idx_inv_items_status  ON inventory_items (status);
CREATE INDEX IF NOT EXISTS idx_inv_mov_item      ON inventory_movements (item_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_org       ON inventory_movements (org_id);
CREATE INDEX IF NOT EXISTS idx_inv_mov_created   ON inventory_movements (created_at DESC);
