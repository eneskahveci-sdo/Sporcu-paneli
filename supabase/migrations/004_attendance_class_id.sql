-- Migration: Add class_id to attendance table for per-class attendance tracking
-- This enables separate attendance records for different class groups and time slots
-- (e.g., CMT-PZR 09:00-10:00 vs CMT-PZR 10:00-11:00)

ALTER TABLE attendance ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classes(id);

-- Create index for efficient queries by class
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance(class_id);

-- Create composite index for per-class attendance lookups
CREATE INDEX IF NOT EXISTS idx_attendance_date_class ON attendance(att_date, class_id);
