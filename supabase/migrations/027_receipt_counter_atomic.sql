-- ============================================================
-- SPORCU PANELİ — Migration 027
-- Makbuz numarası üretimi atomik hale getirildi
--
-- SORUN:
--   generateReceipt() settings.receiptCounter'ı bellekten okuyup
--   +1 ekliyordu. İki sekme aynı anda makbuz basarsa ikisi de
--   aynı sayacı görür → aynı makbuz numarası iki farklı kişiye gider.
--
-- ÇÖZÜM:
--   get_next_receipt_no(p_settings_id) fonksiyonu UPDATE ... RETURNING
--   ile sayacı tek sorguda atomik artırır. PostgreSQL satır kilidi
--   eş zamanlı çağrıları sıraya koyar, duplicate numara oluşmaz.
-- ============================================================

-- Kolon zaten varsa atla
ALTER TABLE settings ADD COLUMN IF NOT EXISTS receipt_counter INTEGER NOT NULL DEFAULT 0;

-- Atomik makbuz numarası üreteci
CREATE OR REPLACE FUNCTION get_next_receipt_no(p_settings_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_counter INTEGER;
  v_year    TEXT := TO_CHAR(CURRENT_DATE, 'YYYY');
BEGIN
  UPDATE settings
  SET    receipt_counter = COALESCE(receipt_counter, 0) + 1
  WHERE  id = p_settings_id
  RETURNING receipt_counter INTO v_counter;

  IF v_counter IS NULL THEN
    RAISE EXCEPTION 'settings satiri bulunamadi: %', p_settings_id;
  END IF;

  RETURN 'MKB-' || v_year || '-' || LPAD(v_counter::TEXT, 4, '0');
END;
$$;
