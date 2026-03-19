-- 003_classes_schedule.sql
-- Classes tablosuna antrenman programı alanları ekleniyor
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_days jsonb DEFAULT '[]';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_time text DEFAULT '';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_time_end text DEFAULT '';
