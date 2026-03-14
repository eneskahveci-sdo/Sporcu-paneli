-- ============================================================
-- SPORCU PANELI - Supabase RLS (Row Level Security) Politikalari
-- Guvenlik icin ZORUNLUDUR!
-- Bu SQL'i Supabase Dashboard > SQL Editor'de calistirin.
-- ============================================================

-- 1. Once RLS'i tum tablolarda aktif edin
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Tum tablolara "authenticated users can read" politikasi ekle
-- NOT: Yalnizca Supabase Auth oturumu acik (authenticated) kullanicilara izin verilir.
--      Anon (anonim) erisim engellenmistir.

-- Athletes tablosu
CREATE POLICY "Allow read athletes" ON athletes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow insert athletes" ON athletes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update athletes" ON athletes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete athletes" ON athletes FOR DELETE USING (auth.role() = 'authenticated');

-- Payments tablosu
CREATE POLICY "Allow read payments" ON payments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow insert payments" ON payments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update payments" ON payments FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete payments" ON payments FOR DELETE USING (auth.role() = 'authenticated');

-- Coaches tablosu
CREATE POLICY "Allow read coaches" ON coaches FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow insert coaches" ON coaches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update coaches" ON coaches FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete coaches" ON coaches FOR DELETE USING (auth.role() = 'authenticated');

-- Attendance tablosu
CREATE POLICY "Allow read attendance" ON attendance FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow insert attendance" ON attendance FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update attendance" ON attendance FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete attendance" ON attendance FOR DELETE USING (auth.role() = 'authenticated');

-- Messages tablosu
CREATE POLICY "Allow read messages" ON messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow insert messages" ON messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update messages" ON messages FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete messages" ON messages FOR DELETE USING (auth.role() = 'authenticated');

-- Settings tablosu
CREATE POLICY "Allow read settings" ON settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow insert settings" ON settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update settings" ON settings FOR UPDATE USING (auth.role() = 'authenticated');

-- Sports tablosu
CREATE POLICY "Allow read sports" ON sports FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow insert sports" ON sports FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update sports" ON sports FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete sports" ON sports FOR DELETE USING (auth.role() = 'authenticated');

-- Classes tablosu
CREATE POLICY "Allow read classes" ON classes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow insert classes" ON classes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update classes" ON classes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Allow delete classes" ON classes FOR DELETE USING (auth.role() = 'authenticated');

-- Branches tablosu
CREATE POLICY "Allow read branches" ON branches FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow insert branches" ON branches FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update branches" ON branches FOR UPDATE USING (auth.role() = 'authenticated');

-- Orgs tablosu
CREATE POLICY "Allow read orgs" ON orgs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow insert orgs" ON orgs FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update orgs" ON orgs FOR UPDATE USING (auth.role() = 'authenticated');

-- Users tablosu
CREATE POLICY "Allow read users" ON users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow insert users" ON users FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow update users" ON users FOR UPDATE USING (auth.role() = 'authenticated');

-- ============================================================
-- GELISMIS RLS (Tavsiye Edilen - Org/Branch bazli izolasyon)
-- ============================================================
/*
-- Daha guvenli politikalar icin asagidaki yapilari kullanin:

-- 1. Her tabloya org_id ve branch_id kolonlari ekleyin
-- 2. JWT claims'ten org_id ve branch_id okuyun

CREATE POLICY "Isolate by org and branch" ON athletes
  FOR ALL
  USING (
    org_id = (current_setting('request.jwt.claims', true)::json->>'org_id')::uuid
    AND branch_id = (current_setting('request.jwt.claims', true)::json->>'branch_id')::uuid
  );
*/
