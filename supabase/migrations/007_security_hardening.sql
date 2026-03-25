-- ============================================================
-- SPORCU PANELİ — Güvenlik Sertleştirmesi v1
-- Migration 007
--
-- DEĞİŞİKLİKLER:
--   1. get_auth_email() — email sorgusu güvenli RPC'ye taşındı
--      anon rolü artık athletes/coaches tablosuna doğrudan erişmek
--      yerine sadece bu fonksiyon üzerinden email okuyabilir.
--
--   2. login_with_tc() — bcrypt desteği eklendi
--      bcrypt ($2a/$2b) → direkt doğrula
--      SHA-256 (64 hex)  → doğrula + otomatik bcrypt'e yükselt
--      Plaintext          → doğrula + otomatik bcrypt'e yükselt
--      Kullanıcılar mevcut şifrelerini bilmek zorunda değil,
--      bir sonraki girişlerinde otomatik olarak bcrypt'e geçer.
--
--   3. messages — anon UPDATE sadece is_read kolonuna kısıtlandı
--      Öncesi: anon tüm alanları değiştirebiliyordu
--      Sonrası: anon sadece is_read=true yapabilir
--
-- KULLANIM:
--   Supabase Dashboard → SQL Editor'e yapıştır ve çalıştır.
-- ============================================================

-- ── 1. get_auth_email — sadece email döndüren güvenli RPC ─────────
-- Bu fonksiyon SECURITY DEFINER olduğundan RLS'i bypass eder ve
-- anon rolünün tablo içeriğine doğrudan erişmesine gerek kalmaz.
-- Sadece em (email) alanını döndürür, başka veri sızmaz.

CREATE OR REPLACE FUNCTION get_auth_email(p_tc TEXT, p_role TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email    TEXT;
  v_fallback TEXT;
BEGIN
  p_tc       := regexp_replace(COALESCE(p_tc, ''), '[^0-9]', '', 'g');
  p_role     := lower(trim(COALESCE(p_role, '')));
  v_fallback := p_tc || '@dragosfk.com';

  -- TC 11 hane değilse fallback döndür
  IF length(p_tc) <> 11 THEN
    RETURN v_fallback;
  END IF;

  IF p_role = 'coach' THEN
    SELECT em INTO v_email FROM coaches WHERE tc = p_tc LIMIT 1;
  ELSE
    SELECT em INTO v_email FROM athletes WHERE tc = p_tc LIMIT 1;
  END IF;

  v_email := lower(trim(COALESCE(v_email, '')));

  -- Geçersiz email ise fallback döndür
  IF v_email = '' OR position('@' IN v_email) = 0 THEN
    RETURN v_fallback;
  END IF;

  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION get_auth_email(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_auth_email(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_auth_email(TEXT, TEXT) TO service_role;


-- ── 2. login_with_tc — bcrypt desteği ────────────────────────────
-- pgcrypto gerekli (Migration 001'de zaten yüklü):
--   CREATE EXTENSION IF NOT EXISTS pgcrypto;
--
-- Şifre doğrulama öncelik sırası:
--   1. Stored hash bcrypt ($2a/$2b/$2x/$2y) → crypt() ile doğrula
--   2. Stored hash SHA-256 (64 hex karakter)  → digest() ile doğrula
--      → Başarılıysa otomatik bcrypt'e yükselt
--   3. Stored değer plaintext                 → direkt karşılaştır
--      → Başarılıysa otomatik bcrypt'e yükselt
--   4. Varsayılan şifre fallback (TC son 6)   → özel şifre yanlışsa dene

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
  v_matched  BOOLEAN;
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

  -- ─── ANTRENÖR ────────────────────────────────────────────
  IF p_role = 'coach' THEN
    SELECT * INTO v_coach FROM coaches WHERE tc = p_tc LIMIT 1;
    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'error', 'Antrenör bulunamadı');
    END IF;

    v_raw_pass := COALESCE(trim(v_coach.coach_pass), '');
    v_stored   := CASE WHEN v_raw_pass = '' THEN v_default ELSE v_raw_pass END;
    v_matched  := FALSE;

    BEGIN
      IF v_stored ~ '^\$2[abxy]\$' THEN
        -- bcrypt hash: doğrulama yeterli, yükseltme gerekmez
        v_matched := (crypt(p_pass, v_stored) = v_stored);

      ELSIF length(v_stored) = 64 AND v_stored ~ '^[0-9a-f]{64}$' THEN
        -- SHA-256 hash: doğrula
        v_matched := (encode(digest(p_pass, 'sha256'), 'hex') = lower(v_stored));

      ELSE
        -- Plaintext: doğrula
        v_matched := (p_pass = v_stored);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- pgcrypto fonksiyonu yoksa plaintext'e düş (giriş çalışmaya devam eder)
      v_matched := (p_pass = v_stored);
    END;

    -- Özel şifre yanlışsa varsayılan (TC son 6) ile dene
    IF NOT v_matched AND v_raw_pass <> '' THEN
      v_matched := (p_pass = v_default);
    END IF;

    IF NOT v_matched THEN
      RETURN json_build_object('ok', false, 'error', 'TC veya şifre hatalı');
    END IF;

    -- Başarılı giriş: bcrypt değilse otomatik yükselt
    IF v_stored !~ '^\$2[abxy]\$' THEN
      BEGIN
        UPDATE coaches
           SET coach_pass = crypt(p_pass, gen_salt('bf', 10))
         WHERE tc = p_tc;
      EXCEPTION WHEN OTHERS THEN
        -- pgcrypto yoksa yükseltme atlanır, giriş yine de başarılı
        NULL;
      END;
    END IF;

    RETURN json_build_object('ok', true, 'role', 'coach', 'data', row_to_json(v_coach));

  -- ─── SPORCU ──────────────────────────────────────────────
  ELSE
    SELECT * INTO v_athlete FROM athletes WHERE tc = p_tc LIMIT 1;
    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'error', 'Sporcu bulunamadı');
    END IF;

    v_raw_pass := COALESCE(trim(v_athlete.sp_pass), '');
    v_stored   := CASE WHEN v_raw_pass = '' THEN v_default ELSE v_raw_pass END;
    v_matched  := FALSE;

    BEGIN
      IF v_stored ~ '^\$2[abxy]\$' THEN
        v_matched := (crypt(p_pass, v_stored) = v_stored);

      ELSIF length(v_stored) = 64 AND v_stored ~ '^[0-9a-f]{64}$' THEN
        v_matched := (encode(digest(p_pass, 'sha256'), 'hex') = lower(v_stored));

      ELSE
        v_matched := (p_pass = v_stored);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_matched := (p_pass = v_stored);
    END;

    -- Özel şifre yanlışsa varsayılan (TC son 6) ile dene
    IF NOT v_matched AND v_raw_pass <> '' THEN
      v_matched := (p_pass = v_default);
    END IF;

    IF NOT v_matched THEN
      RETURN json_build_object('ok', false, 'error', 'TC veya şifre hatalı');
    END IF;

    -- Başarılı giriş: bcrypt değilse otomatik yükselt
    IF v_stored !~ '^\$2[abxy]\$' THEN
      BEGIN
        UPDATE athletes
           SET sp_pass = crypt(p_pass, gen_salt('bf', 10))
         WHERE tc = p_tc;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;

    RETURN json_build_object('ok', true, 'role', 'sporcu', 'data', row_to_json(v_athlete));
  END IF;
END;
$$;


-- ── 3. messages — anon UPDATE sadece is_read kolonuna kısıtla ─────
-- Önceki durum: anon tüm kolonları güncelleyebiliyordu (mesaj içeriği dahil)
-- Yeni durum:   anon sadece is_read kolonunu güncelleyebilir
--               → Sporcu "okundu" işaretleyebilir ama içerik değiştiremez

-- Kolon düzeyinde UPDATE yetkisi: tümünü al, sadece is_read ver
REVOKE UPDATE ON messages FROM anon;
GRANT UPDATE (is_read) ON messages TO anon;

-- RLS politikasını güncelle: sadece is_read=true yapılabilsin
DROP POLICY IF EXISTS "messages_update_anon" ON messages;
CREATE POLICY "messages_update_anon" ON messages
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (is_read = true);

-- ── TAMAMLANDI ────────────────────────────────────────────────────
-- Bu migration çalıştırıldıktan sonra:
--   1. get_auth_email() ile email sorgusu güvenli RPC üzerinden yapılır
--   2. login_with_tc() bcrypt'i destekler, her girişte otomatik yükseltir
--   3. messages anon UPDATE sadece is_read=true ile kısıtlıdır
-- ============================================================
