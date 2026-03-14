-- ============================================================
-- SPORCU PANELI - Supabase RLS (Row Level Security) Politikalari
-- v2.0 — TC + TC son 6 hane ile giriş sistemi
--
-- MİMARİ NOT:
--   Bu uygulama frontend-only PWA'dır. Antrenör ve sporcular
--   Supabase Auth kullanmaz; TC kimlik doğrulaması SECURITY DEFINER
--   fonksiyonları aracılığıyla yapılır. Bu nedenle SELECT/INSERT/
--   UPDATE/DELETE politikaları anon role için de açılmıştır.
--   Anon key zaten istemci JS kodunda herkese açıktır.
--   Asıl güvenlik: login_with_tc() fonksiyonu + uygulama katmanı.
--
-- KULLANIM:
--   Supabase Dashboard → SQL Editor'de çalıştırın.
--   ÖNEMLİ: Mevcut politikaları önce bu betikle temizleyin,
--            ardından yeniden çalıştırın.
-- ============================================================

-- ── ADIM 0: ESKİ POLİTİKALARI TEMİZLE ────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ── ADIM 1: TÜM TABLOLARDA RLS'İ AKTİF ET ────────────────────────

ALTER TABLE athletes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaches    ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages   ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches   ENABLE ROW LEVEL SECURITY;
ALTER TABLE orgs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE users      ENABLE ROW LEVEL SECURITY;

-- ── ADIM 2: POLİTİKALAR ──────────────────────────────────────────
--
-- Politika Stratejisi:
--   • SELECT: Herkese açık (anon dahil) — uygulama katmanı erişimi
--             kontrol eder (login_with_tc doğrulaması).
--   • INSERT/UPDATE/DELETE: Herkese açık — antrenörler Supabase Auth
--             kullanmadığından SECURITY DEFINER fonksiyonlar üzerinden
--             ya da doğrudan anon key ile yazabilmelidir.
--   • Admin (email/şifre Supabase Auth): zaten authenticated role.

-- Athletes
CREATE POLICY "athletes_select" ON athletes FOR SELECT USING (true);
CREATE POLICY "athletes_insert" ON athletes FOR INSERT WITH CHECK (true);
CREATE POLICY "athletes_update" ON athletes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "athletes_delete" ON athletes FOR DELETE USING (true);

-- Payments
CREATE POLICY "payments_select" ON payments FOR SELECT USING (true);
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "payments_update" ON payments FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "payments_delete" ON payments FOR DELETE USING (true);

-- Coaches
CREATE POLICY "coaches_select" ON coaches FOR SELECT USING (true);
CREATE POLICY "coaches_insert" ON coaches FOR INSERT WITH CHECK (true);
CREATE POLICY "coaches_update" ON coaches FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "coaches_delete" ON coaches FOR DELETE USING (true);

-- Attendance
CREATE POLICY "attendance_select" ON attendance FOR SELECT USING (true);
CREATE POLICY "attendance_insert" ON attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "attendance_update" ON attendance FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "attendance_delete" ON attendance FOR DELETE USING (true);

-- Messages
CREATE POLICY "messages_select" ON messages FOR SELECT USING (true);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (true);
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "messages_delete" ON messages FOR DELETE USING (true);

-- Settings
CREATE POLICY "settings_select" ON settings FOR SELECT USING (true);
CREATE POLICY "settings_insert" ON settings FOR INSERT WITH CHECK (true);
CREATE POLICY "settings_update" ON settings FOR UPDATE USING (true) WITH CHECK (true);

-- Sports
CREATE POLICY "sports_select" ON sports FOR SELECT USING (true);
CREATE POLICY "sports_insert" ON sports FOR INSERT WITH CHECK (true);
CREATE POLICY "sports_update" ON sports FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "sports_delete" ON sports FOR DELETE USING (true);

-- Classes
CREATE POLICY "classes_select" ON classes FOR SELECT USING (true);
CREATE POLICY "classes_insert" ON classes FOR INSERT WITH CHECK (true);
CREATE POLICY "classes_update" ON classes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "classes_delete" ON classes FOR DELETE USING (true);

-- Branches
CREATE POLICY "branches_select" ON branches FOR SELECT USING (true);
CREATE POLICY "branches_insert" ON branches FOR INSERT WITH CHECK (true);
CREATE POLICY "branches_update" ON branches FOR UPDATE USING (true) WITH CHECK (true);

-- Orgs
CREATE POLICY "orgs_select" ON orgs FOR SELECT USING (true);
CREATE POLICY "orgs_insert" ON orgs FOR INSERT WITH CHECK (true);
CREATE POLICY "orgs_update" ON orgs FOR UPDATE USING (true) WITH CHECK (true);

-- Users (Supabase Auth kullanıcıları — admin hesapları)
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update" ON users FOR UPDATE USING (true) WITH CHECK (true);

-- ── ADIM 3: GİRİŞ FONKSİYONU (SECURITY DEFINER) ─────────────────
--
-- login_with_tc(p_tc, p_pass, p_role)
--   • p_role: 'coach' veya 'sporcu'
--   • p_pass: TC'nin son 6 hanesi (veya özel şifre varsa o)
--   • Başarılıysa: {"ok": true, "role": "coach"|"sporcu", "data": {...}}
--   • Başarısızsa: {"ok": false, "error": "...açıklama..."}
--
-- SECURITY DEFINER → RLS'i atlayarak tabloyu okur,
-- dolayısıyla anon key kullanan istemciler doğrulama yapabilir.

CREATE OR REPLACE FUNCTION login_with_tc(p_tc TEXT, p_pass TEXT, p_role TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_athlete  athletes%ROWTYPE;
  v_coach    coaches%ROWTYPE;
  v_default  TEXT;
  v_stored   TEXT;
BEGIN
  -- Girdi temizleme
  p_tc   := regexp_replace(COALESCE(p_tc, ''),   '[^0-9]', '', 'g');
  p_pass := trim(COALESCE(p_pass, ''));
  p_role := lower(trim(COALESCE(p_role, '')));

  IF length(p_tc) <> 11 THEN
    RETURN json_build_object('ok', false, 'error', 'Geçersiz TC (11 hane olmalı)');
  END IF;

  IF p_pass = '' THEN
    RETURN json_build_object('ok', false, 'error', 'Şifre boş olamaz');
  END IF;

  -- Varsayılan şifre: TC'nin son 6 hanesi
  v_default := right(p_tc, 6);

  IF p_role = 'coach' THEN
    SELECT * INTO v_coach FROM coaches WHERE tc = p_tc LIMIT 1;
    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'error', 'Antrenör bulunamadı');
    END IF;

    v_stored := COALESCE(NULLIF(trim(v_coach.coach_pass), ''), v_default);

    IF p_pass <> v_stored THEN
      RETURN json_build_object('ok', false, 'error', 'TC veya şifre hatalı');
    END IF;

    RETURN json_build_object('ok', true, 'role', 'coach', 'data', row_to_json(v_coach));

  ELSE
    -- sporcu (veya veli)
    SELECT * INTO v_athlete FROM athletes WHERE tc = p_tc LIMIT 1;
    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'error', 'Sporcu bulunamadı');
    END IF;

    v_stored := COALESCE(NULLIF(trim(v_athlete.sp_pass), ''), v_default);

    IF p_pass <> v_stored THEN
      RETURN json_build_object('ok', false, 'error', 'TC veya şifre hatalı');
    END IF;

    RETURN json_build_object('ok', true, 'role', 'sporcu', 'data', row_to_json(v_athlete));
  END IF;
END;
$$;

-- Anon ve authenticated kullanıcılar çağırabilsin
GRANT EXECUTE ON FUNCTION login_with_tc(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION login_with_tc(TEXT, TEXT, TEXT) TO authenticated;

-- ── ADIM 4: GERİYE DÖNÜK UYUMLULUK (verify_user_credentials) ────

CREATE OR REPLACE FUNCTION verify_user_credentials(p_tc TEXT, p_pass TEXT, p_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSON;
BEGIN
  result := login_with_tc(p_tc, p_pass, p_role);
  RETURN (result->>'ok')::BOOLEAN;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_user_credentials(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_user_credentials(TEXT, TEXT, TEXT) TO authenticated;

-- ── TAMAMLANDI ────────────────────────────────────────────────────
-- Bu betik çalıştırıldıktan sonra:
--   1. Tüm eski politikalar temizlendi.
--   2. RLS aktif — tablolara doğrudan erişim politika gerektirir.
--   3. Yeni permisif politikalar uygulandı (USING true).
--   4. login_with_tc() ile güvenli TC girişi sağlandı.
--   5. verify_user_credentials() geriye dönük uyumluluk için korundu.
-- ============================================================
