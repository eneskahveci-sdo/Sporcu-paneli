-- ============================================================
-- 000_create_base_tables.sql
-- Temel tabloların boş DB'de oluşturulması (fresh install için)
-- Tüm tablolar IF NOT EXISTS ile idempotent oluşturulur.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS orgs (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS branches (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL DEFAULT '',
  name   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS sports (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id    TEXT,
  branch_id TEXT,
  name      TEXT NOT NULL DEFAULT '',
  icon      TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS classes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         TEXT,
  branch_id      TEXT,
  name           TEXT NOT NULL DEFAULT '',
  sp_id          UUID REFERENCES sports(id),
  coach_id       UUID,
  cap            INTEGER DEFAULT 0,
  schedule_days  JSONB DEFAULT '[]',
  schedule_time  TEXT DEFAULT '',
  schedule_time_end TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS coaches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      TEXT NOT NULL DEFAULT '',
  branch_id   TEXT NOT NULL DEFAULT '',
  fn          TEXT NOT NULL DEFAULT '',
  ln          TEXT NOT NULL DEFAULT '',
  tc          TEXT NOT NULL DEFAULT '',
  ph          TEXT NOT NULL DEFAULT '',
  em          TEXT NOT NULL DEFAULT '',
  sp          TEXT NOT NULL DEFAULT '',
  sal         NUMERIC DEFAULT 0,
  st          TEXT DEFAULT 'active',
  coach_pass  TEXT
);

CREATE TABLE IF NOT EXISTS athletes (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id    TEXT NOT NULL DEFAULT '',
  branch_id TEXT NOT NULL DEFAULT '',
  fn        TEXT NOT NULL DEFAULT '',
  ln        TEXT NOT NULL DEFAULT '',
  tc        TEXT NOT NULL DEFAULT '',
  bd        DATE,
  gn        TEXT DEFAULT 'E',
  ph        TEXT NOT NULL DEFAULT '',
  em        TEXT NOT NULL DEFAULT '',
  sp        TEXT NOT NULL DEFAULT '',
  cat       TEXT DEFAULT '',
  lic       TEXT NOT NULL DEFAULT '',
  rd        DATE,
  st        TEXT DEFAULT 'active',
  fee       NUMERIC DEFAULT 0,
  vd        DATE,
  nt        JSONB DEFAULT '{}',
  cls_id    TEXT,
  pn        TEXT NOT NULL DEFAULT '',
  pph       TEXT NOT NULL DEFAULT '',
  pem       TEXT NOT NULL DEFAULT '',
  sp_pass   TEXT,
  photo_url TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS payments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       TEXT NOT NULL DEFAULT '',
  branch_id    TEXT NOT NULL DEFAULT '',
  aid          TEXT NOT NULL DEFAULT '',
  an           TEXT NOT NULL DEFAULT '',
  amt          NUMERIC NOT NULL DEFAULT 0,
  dt           DATE,
  ty           TEXT,
  cat          TEXT,
  ds           TEXT,
  st           TEXT DEFAULT 'pending',
  inv          TEXT,
  dd           DATE,
  service_name TEXT NOT NULL DEFAULT '',
  source       TEXT NOT NULL DEFAULT 'manual',
  notif_status TEXT NOT NULL DEFAULT '',
  pay_method   TEXT NOT NULL DEFAULT '',
  slip_code    TEXT NOT NULL DEFAULT '',
  payment_type TEXT NOT NULL DEFAULT 'aidat',
  receipt_no   TEXT NOT NULL DEFAULT '',
  tax_rate     NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount   NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attendance (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id    TEXT NOT NULL DEFAULT '',
  branch_id TEXT NOT NULL DEFAULT '',
  aid       TEXT NOT NULL DEFAULT '',
  class_id  UUID REFERENCES classes(id),
  dt        DATE,
  st        TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         TEXT,
  branch_id      TEXT,
  sender_id      TEXT NOT NULL,
  sender_name    TEXT NOT NULL DEFAULT '',
  sender_role    TEXT NOT NULL DEFAULT 'admin',
  recipient_id   TEXT NOT NULL,
  recipient_name TEXT NOT NULL DEFAULT '',
  title          TEXT NOT NULL DEFAULT '',
  body           TEXT NOT NULL DEFAULT '',
  is_read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          TEXT,
  branch_id       TEXT,
  school_name     TEXT NOT NULL DEFAULT '',
  logo_url        TEXT NOT NULL DEFAULT '',
  bank_name       TEXT NOT NULL DEFAULT '',
  account_name    TEXT NOT NULL DEFAULT '',
  iban            TEXT NOT NULL DEFAULT '',
  owner_phone     TEXT NOT NULL DEFAULT '',
  address         TEXT NOT NULL DEFAULT '',
  wa_active       BOOLEAN NOT NULL DEFAULT FALSE,
  wa_api_token    TEXT NOT NULL DEFAULT '',
  wa_phone_id     TEXT NOT NULL DEFAULT '',
  wa_reminder_day INTEGER NOT NULL DEFAULT 1,
  paytr_active    BOOLEAN NOT NULL DEFAULT FALSE,
  paytr_merchant_id TEXT NOT NULL DEFAULT '',
  receipt_counter INTEGER NOT NULL DEFAULT 0
);

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

CREATE TABLE IF NOT EXISTS users (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id    TEXT NOT NULL DEFAULT '',
  branch_id TEXT NOT NULL DEFAULT '',
  email     TEXT NOT NULL DEFAULT '',
  name      TEXT NOT NULL DEFAULT '',
  role      TEXT DEFAULT 'admin',
  pass      TEXT NOT NULL DEFAULT ''
);
