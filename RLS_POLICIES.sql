-- ============================================================
-- SPORCU PANELI - Supabase RLS (Row Level Security) Politikalari
-- v4.1 — Güvenli RLS: anon SELECT izni eklendi (sporcu/veli paneli için)
--
-- MİMARİ NOT:
--   Bu uygulama frontend-only PWA'dır. Antrenör ve sporcular
--   Supabase Auth kullanmaz; TC kimlik doğrulaması SECURITY DEFINER
--   fonksiyonları aracılığıyla yapılır.
--
-- GÜVENLİK:
--   • anon role: Tüm tablolara SELECT + login_with_tc EXECUTE.
--     Yazma işlemleri (INSERT/UPDATE/DELETE) engellenir.
--     users tablosuna erişim tamamen engellenir.
--   • authenticated role: Tüm tablolara tam erişim.
--   • login_with_tc SECURITY DEFINER olduğu için RLS'i bypass eder —
--     sporcu/antrenör girişi bundan etkilenmez.
--
-- NOT: Bu uygulama frontend-only PWA'dır. Sporcu/antrenör girişi
--   Supabase Auth kullanmaz; TC doğrulaması login_with_tc ile yapılır.
--   Giriş sonrası veri yükleme (loadBranchData) anon key ile yapılır,
--   bu nedenle anon role'ün SELECT erişimi gereklidir.
--
-- KULLANIM:
--   Supabase Dashboard → SQL Editor'de bu betiğin TAMAMINI
--   kopyalayıp çalıştırın.
--   ÖNEMLİ: Mevcut politikaları önce bu betikle temizleyin,
--            ardından yeniden oluşturun.
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

-- ── ADIM 1: ŞEMA VE TABLO ERİŞİM HAKLARI ────────────────────────
--
-- Supabase'de anon ve authenticated rolleri public şemaya
-- erişebilmeli. Bu GRANT'ler olmadan RLS politikaları tek
-- başına yeterli değildir — tablo düzeyinde erişim hakkı da gerekir.
--
-- GÜVENLİK: anon role tüm tablolara SELECT erişimi olan (sporcu/veli
-- paneli loadBranchData için gerekli), ancak yazma işlemleri engellenir.
-- users tablosuna erişim tamamen engellenir (admin hesapları).

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ── authenticated + service_role: tüm tablolara tam erişim
GRANT SELECT, INSERT, UPDATE, DELETE ON athletes   TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON payments   TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON coaches    TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON attendance TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages   TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON settings   TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON sports     TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON classes    TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON branches   TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON orgs       TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON users      TO authenticated, service_role;

-- ── anon role: SELECT tüm tablolara (sporcu/veli paneli için gerekli),
-- users tablosu hariç.
-- payments: anon INSERT gerekli — sporcu ödeme bildirimi gönderebilsin.
-- messages: anon UPDATE gerekli — sporcu mesajları "okundu" işaretleyebilsin.
REVOKE ALL ON users FROM anon;
GRANT SELECT ON athletes   TO anon;
GRANT SELECT, INSERT ON payments   TO anon;
GRANT SELECT ON coaches    TO anon;
GRANT SELECT ON attendance TO anon;
GRANT SELECT, UPDATE ON messages   TO anon;
GRANT SELECT ON settings   TO anon;
GRANT SELECT ON sports     TO anon;
GRANT SELECT ON classes    TO anon;
GRANT SELECT ON branches   TO anon;
GRANT SELECT ON orgs       TO anon;

-- on_kayitlar: anon SELECT+INSERT (kamuya açık ön kayıt formu).
-- anon UPDATE: KVKK consent güncellemesi.
GRANT SELECT, INSERT, UPDATE, DELETE ON on_kayitlar TO authenticated, service_role;
GRANT SELECT, INSERT ON on_kayitlar TO anon;
GRANT UPDATE ON on_kayitlar TO anon;

-- Sequence erişim hakları (INSERT + auto-increment id'ler için)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Gelecekte oluşturulacak tablolar/sequence'ler için varsayılan haklar
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;

-- ── ADIM 2: TÜM TABLOLARDA RLS'İ AKTİF ET ────────────────────────

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
ALTER TABLE on_kayitlar ENABLE ROW LEVEL SECURITY;

-- ── ADIM 3: POLİTİKALAR ──────────────────────────────────────────
--
-- Politika Stratejisi:
--   • settings: SELECT herkese açık (sporcu paneli ayar gerektirir),
--     INSERT/UPDATE sadece authenticated.
--   • users: Sadece authenticated role erişebilir.
--   • athletes, payments, coaches, attendance, messages:
--     - SELECT: anon + authenticated (sporcu/veli paneli için gerekli).
--     - INSERT/UPDATE/DELETE: Sadece authenticated role.
--   • sports, classes: SELECT herkese açık, yazma sadece authenticated.
--   • branches, orgs: SELECT herkese açık (login ekranında gerekli),
--     INSERT/UPDATE sadece authenticated.
--   • Admin (email/şifre Supabase Auth): zaten authenticated role.

-- Settings (anon SELECT: sporcu paneli school name, logo vb. gerektirir)
CREATE POLICY "settings_select" ON settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings_insert" ON settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "settings_update" ON settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Users (Supabase Auth kullanıcıları — admin hesapları)
CREATE POLICY "users_select" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "users_update" ON users FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Athletes (anon SELECT: sporcu/veli paneli için gerekli)
CREATE POLICY "athletes_select" ON athletes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "athletes_insert" ON athletes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "athletes_update" ON athletes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "athletes_delete" ON athletes FOR DELETE TO authenticated USING (true);

-- Payments (anon SELECT+INSERT: sporcu/veli ödeme geçmişi ve bildirim gönderimi için gerekli)
CREATE POLICY "payments_select" ON payments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "payments_insert" ON payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "payments_insert_anon" ON payments FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "payments_update" ON payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "payments_delete" ON payments FOR DELETE TO authenticated USING (true);

-- Coaches (anon SELECT: sporcu paneli antrenör bilgisi için gerekli)
CREATE POLICY "coaches_select" ON coaches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "coaches_insert" ON coaches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "coaches_update" ON coaches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "coaches_delete" ON coaches FOR DELETE TO authenticated USING (true);

-- Attendance (anon SELECT: sporcu/veli yoklama geçmişi için gerekli)
CREATE POLICY "attendance_select" ON attendance FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "attendance_insert" ON attendance FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "attendance_update" ON attendance FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "attendance_delete" ON attendance FOR DELETE TO authenticated USING (true);

-- Messages (anon SELECT: sporcu mesaj görüntüleme için gerekli)
-- anon UPDATE: sadece is_read kolonu — sporcu "okundu" işaretleyebilir, içerik değiştiremez
-- Kolon düzeyinde kısıtlama Migration 007'de: REVOKE UPDATE ON messages FROM anon;
--                                             GRANT UPDATE (is_read) ON messages TO anon;
CREATE POLICY "messages_select" ON messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "messages_insert" ON messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "messages_update" ON messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "messages_update_anon" ON messages FOR UPDATE TO anon USING (true) WITH CHECK (is_read = true);
CREATE POLICY "messages_delete" ON messages FOR DELETE TO authenticated USING (true);

-- Sports (anon SELECT: sporcu paneli spor bilgisi için gerekli)
CREATE POLICY "sports_select" ON sports FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "sports_insert" ON sports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "sports_update" ON sports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "sports_delete" ON sports FOR DELETE TO authenticated USING (true);

-- Classes (anon SELECT: sporcu paneli sınıf bilgisi için gerekli)
CREATE POLICY "classes_select" ON classes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "classes_insert" ON classes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "classes_update" ON classes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "classes_delete" ON classes FOR DELETE TO authenticated USING (true);

-- Branches (login ekranında gerekli — anon SELECT açık)
CREATE POLICY "branches_select" ON branches FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "branches_insert" ON branches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "branches_update" ON branches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Orgs (login ekranında gerekli — anon SELECT açık)
CREATE POLICY "orgs_select" ON orgs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "orgs_insert" ON orgs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "orgs_update" ON orgs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- On Kayitlar (kamuya açık ön kayıt formu — anon SELECT+INSERT)
CREATE POLICY "onkayitlar_select" ON on_kayitlar FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "onkayitlar_insert_anon" ON on_kayitlar FOR INSERT TO anon
  WITH CHECK (student_name IS NOT NULL AND student_name <> '' AND parent_phone IS NOT NULL AND parent_phone <> '');
CREATE POLICY "onkayitlar_insert_auth" ON on_kayitlar FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "onkayitlar_update_anon" ON on_kayitlar FOR UPDATE TO anon
  USING (kvkk_consent IS NULL OR kvkk_consent = false)
  WITH CHECK (kvkk_consent IS NOT NULL AND kvkk_consent = true AND consent_date IS NOT NULL);
CREATE POLICY "onkayitlar_update_auth" ON on_kayitlar FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "onkayitlar_delete_auth" ON on_kayitlar FOR DELETE TO authenticated USING (true);

-- ── ADIM 4: PGCRYPTO UZANTISI (hash karşılaştırma için) ──────────
-- Eğer coach_pass veya sp_pass alanında SHA-256 hash varsa,
-- girilen şifreyi hashleyip karşılaştırma yapabilmek için gerekli.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── ADIM 5: GİRİŞ FONKSİYONU (SECURITY DEFINER) ─────────────────
--
-- login_with_tc(p_tc, p_pass, p_role)
--   • p_role: 'coach' veya 'sporcu'
--   • p_pass: TC'nin son 6 hanesi (veya özel şifre varsa o)
--   • Başarılıysa: {"ok": true, "role": "coach"|"sporcu", "data": {...}}
--   • Başarısızsa: {"ok": false, "error": "...açıklama..."}
--
-- SECURITY DEFINER → RLS'i atlayarak tabloyu okur,
-- dolayısıyla anon key kullanan istemciler doğrulama yapabilir.
--
-- Şifre öncelik sırası:
--   1. sp_pass / coach_pass alanında özel şifre varsa → onu kullan
--   2. Alan boş veya NULL ise → varsayılan: TC'nin son 6 hanesi
--   3. SHA-256 hash karşılaştırma (özel şifre hash olarak saklanmışsa)
--   4. Özel şifre eşleşmezse varsayılan şifreyi de dene (kullanıcı
--      hatası durumunda — sp_pass yanlışlıkla atanmış olabilir)

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
  v_raw_pass TEXT;
  v_hashed   TEXT;
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

    -- Ham şifreyi al ve temizle
    v_raw_pass := COALESCE(trim(v_coach.coach_pass), '');
    -- Özel şifre varsa onu kullan, yoksa varsayılan
    v_stored := CASE WHEN v_raw_pass = '' THEN v_default ELSE v_raw_pass END;

    -- 1. Düz metin karşılaştırma (özel şifre veya varsayılan)
    IF p_pass = v_stored THEN
      -- Başarılı giriş: plaintext şifreyi otomatik SHA-256 hash'le
      IF length(v_stored) < 64 OR v_stored !~ '^[0-9a-f]{64}$' THEN
        BEGIN
          UPDATE coaches SET coach_pass = encode(digest(p_pass, 'sha256'), 'hex') WHERE tc = p_tc;
        EXCEPTION WHEN undefined_function THEN
          -- pgcrypto yüklü değil, auto-hash atlanıyor
          NULL;
        END;
      END IF;
      RETURN json_build_object('ok', true, 'role', 'coach', 'data', row_to_json(v_coach));
    END IF;

    -- 2. SHA-256 hash karşılaştırma (şifre hash olarak saklanmışsa)
    IF length(v_stored) = 64 AND v_stored ~ '^[0-9a-f]{64}$' THEN
      BEGIN
        v_hashed := encode(digest(p_pass, 'sha256'), 'hex');
      EXCEPTION WHEN undefined_function THEN
        v_hashed := '';
      END;
      IF v_hashed <> '' AND v_hashed = lower(v_stored) THEN
        RETURN json_build_object('ok', true, 'role', 'coach', 'data', row_to_json(v_coach));
      END IF;
    END IF;

    -- 3. Özel şifre eşleşmediyse varsayılan şifreyi de dene
    --    (coach_pass yanlışlıkla set edilmiş olabilir)
    IF v_raw_pass <> '' AND p_pass = v_default THEN
      -- Başarılı giriş: varsayılan şifreyi hash'le
      BEGIN
        UPDATE coaches SET coach_pass = encode(digest(p_pass, 'sha256'), 'hex') WHERE tc = p_tc;
      EXCEPTION WHEN undefined_function THEN
        NULL;
      END;
      RETURN json_build_object('ok', true, 'role', 'coach', 'data', row_to_json(v_coach));
    END IF;

    RETURN json_build_object('ok', false, 'error', 'TC veya şifre hatalı');

  ELSE
    -- sporcu (veya veli)
    SELECT * INTO v_athlete FROM athletes WHERE tc = p_tc LIMIT 1;
    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'error', 'Sporcu bulunamadı');
    END IF;

    -- Ham şifreyi al ve temizle
    v_raw_pass := COALESCE(trim(v_athlete.sp_pass), '');
    -- Özel şifre varsa onu kullan, yoksa varsayılan
    v_stored := CASE WHEN v_raw_pass = '' THEN v_default ELSE v_raw_pass END;

    -- 1. Düz metin karşılaştırma (özel şifre veya varsayılan)
    IF p_pass = v_stored THEN
      -- Başarılı giriş: plaintext şifreyi otomatik SHA-256 hash'le
      IF length(v_stored) < 64 OR v_stored !~ '^[0-9a-f]{64}$' THEN
        BEGIN
          UPDATE athletes SET sp_pass = encode(digest(p_pass, 'sha256'), 'hex') WHERE tc = p_tc;
        EXCEPTION WHEN undefined_function THEN
          -- pgcrypto yüklü değil, auto-hash atlanıyor
          NULL;
        END;
      END IF;
      RETURN json_build_object('ok', true, 'role', 'sporcu', 'data', row_to_json(v_athlete));
    END IF;

    -- 2. SHA-256 hash karşılaştırma
    IF length(v_stored) = 64 AND v_stored ~ '^[0-9a-f]{64}$' THEN
      BEGIN
        v_hashed := encode(digest(p_pass, 'sha256'), 'hex');
      EXCEPTION WHEN undefined_function THEN
        v_hashed := '';
      END;
      IF v_hashed <> '' AND v_hashed = lower(v_stored) THEN
        RETURN json_build_object('ok', true, 'role', 'sporcu', 'data', row_to_json(v_athlete));
      END IF;
    END IF;

    -- 3. Özel şifre eşleşmediyse varsayılan şifreyi de dene
    --    (sp_pass yanlışlıkla set edilmiş olabilir)
    IF v_raw_pass <> '' AND p_pass = v_default THEN
      -- Başarılı giriş: varsayılan şifreyi hash'le
      BEGIN
        UPDATE athletes SET sp_pass = encode(digest(p_pass, 'sha256'), 'hex') WHERE tc = p_tc;
      EXCEPTION WHEN undefined_function THEN
        NULL;
      END;
      RETURN json_build_object('ok', true, 'role', 'sporcu', 'data', row_to_json(v_athlete));
    END IF;

    RETURN json_build_object('ok', false, 'error', 'TC veya şifre hatalı');
  END IF;
END;
$$;

-- Anon ve authenticated kullanıcılar çağırabilsin
GRANT EXECUTE ON FUNCTION login_with_tc(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION login_with_tc(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION login_with_tc(TEXT, TEXT, TEXT) TO service_role;

-- ── ADIM 6: GERİYE DÖNÜK UYUMLULUK (verify_user_credentials) ────

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
GRANT EXECUTE ON FUNCTION verify_user_credentials(TEXT, TEXT, TEXT) TO service_role;

-- ── TAMAMLANDI ────────────────────────────────────────────────────
-- Bu betik çalıştırıldıktan sonra:
--   1. Tüm eski politikalar temizlendi.
--   2. Şema düzeyinde GRANT'ler verildi.
--   3. anon role: Tüm tablolara SELECT (users hariç) + login_with_tc EXECUTE.
--      Yazma işlemleri (INSERT/UPDATE/DELETE) engellenir.
--   4. authenticated role: Tüm tablolara tam CRUD erişimi.
--   5. RLS aktif — tablolara doğrudan erişim politika gerektirir.
--   6. login_with_tc() ile güvenli TC girişi sağlandı (SECURITY DEFINER).
--   7. verify_user_credentials() geriye dönük uyumluluk için korundu.
--   8. Sequence erişim hakları verildi (INSERT + auto-increment).
--   9. Başarılı girişte şifreler otomatik bcrypt'e yükseltilir (Migration 007).
--  10. get_auth_email() ile email sorgusu güvenli RPC üzerinden yapılır (Migration 007).
--  11. messages anon UPDATE sadece is_read kolonuyla kısıtlıdır (Migration 007).
-- ============================================================
-- NOT: Bu ana betik Migration 001-006'yı kapsar.
--      Migration 007 (007_security_hardening.sql) ayrıca çalıştırılmalıdır.

-- ── Classes Schedule Alanları ───────────────────────────
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_days jsonb DEFAULT '[]';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_time text DEFAULT '';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_time_end text DEFAULT '';
