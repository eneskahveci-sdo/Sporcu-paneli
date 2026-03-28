-- ═══════════════════════════════════════════════════════════
-- Migration 017: payments_insert_anon policy — null check guard
-- Anonim ekleme politikasına branch_id/org_id null koruması eklendi.
-- Uygulama zaten her zaman bu alanları doldurduğu için (DB.mappers.fromPayment)
-- mevcut fonksiyonellik bozulmaz; yalnızca boş değerle kayıt engellenir.
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "payments_insert_anon" ON payments;

CREATE POLICY "payments_insert_anon" ON payments
  FOR INSERT
  TO anon
  WITH CHECK (branch_id IS NOT NULL AND org_id IS NOT NULL);
