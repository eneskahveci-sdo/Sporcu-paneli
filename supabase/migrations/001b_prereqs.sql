-- 001b_prereqs.sql
-- 002+ migration'larının bağımlı olduğu ama henüz oluşturulmamış tablolar

CREATE TABLE IF NOT EXISTS on_kayitlar (
  id           TEXT PRIMARY KEY,
  student_name TEXT NOT NULL DEFAULT '',
  fn           TEXT DEFAULT '',
  ln           TEXT DEFAULT '',
  bd           DATE,
  tc           TEXT,
  cls_id       TEXT,
  class_name   TEXT DEFAULT '',
  parent_name  TEXT DEFAULT '',
  parent_phone TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'new',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  org_id       TEXT,
  branch_id    TEXT,
  kvkk_consent BOOLEAN DEFAULT false,
  consent_date DATE
);
