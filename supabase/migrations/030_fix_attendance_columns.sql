-- ============================================================
-- 030_fix_attendance_columns.sql
-- attendance tablosu kolon adlarını koddaki kullanımla hizala.
-- Eski 000 migration'ı yanlış kolon adlarıyla (aid/dt/st) deploy
-- edilmişti. Kod athlete_id/att_date/status bekliyor.
-- Idempotent: kolon hâlâ eski adındaysa yeniden adlandırır.
-- ============================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='attendance' AND column_name='aid') THEN
    ALTER TABLE attendance RENAME COLUMN aid TO athlete_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='attendance' AND column_name='dt') THEN
    ALTER TABLE attendance RENAME COLUMN dt TO att_date;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='attendance' AND column_name='st') THEN
    ALTER TABLE attendance RENAME COLUMN st TO status;
  END IF;
END $$;

-- 004'te yanlış kolon (dt) ile oluşmuş olabilecek index'i düzelt
DROP INDEX IF EXISTS idx_attendance_date_class;
CREATE INDEX IF NOT EXISTS idx_attendance_date_class ON attendance(att_date, class_id);
