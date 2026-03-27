-- ============================================================
-- SPORCU PANELİ — Grup A Güvenlik Düzeltmeleri
-- Migration 014
--
-- DEĞİŞİKLİKLER:
--   1. login_with_tc — hata mesajları birleştirildi (#14)
--      "Antrenör bulunamadı" / "Sporcu bulunamadı" mesajları
--      "TC veya şifre hatalı" ile değiştirildi.
--      Böylece saldırgan hangi TC'nin sistemde kayıtlı
--      olduğunu anlayamaz (kullanıcı enumeration engeli).
--
--   2. login_with_tc — şifre hash'i yanıttan çıkarıldı (#3)
--      row_to_json(v_coach) yerine (row_to_json(v_coach)::jsonb
--      - 'coach_pass')::json kullanılıyor.
--      Böylece bcrypt hash frontend'e hiç ulaşmıyor.
--      (Aynı şekilde sp_pass da athletes yanıtından çıkarıldı.)
--
-- UYUMLULUK:
--   Frontend bu iki alanı okuyor ama StorageManager.set() ile
--   hemen atıyor (spPass: undefined, coachPass: undefined).
--   Alanların gelmemesi hiçbir işlevi bozmaz.
--
-- KULLANIM:
--   Supabase Dashboard → SQL Editor'e yapıştır ve çalıştır.
-- ============================================================

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
    -- #14: Genel hata mesajı — TC varlığını açıklamaz
    RETURN json_build_object('ok', false, 'error', 'TC veya şifre hatalı');
  END IF;

  IF p_pass = '' THEN
    RETURN json_build_object('ok', false, 'error', 'TC veya şifre hatalı');
  END IF;

  -- Varsayılan şifre: TC'nin son 6 hanesi
  v_default := right(p_tc, 6);

  -- ─── ANTRENÖR ────────────────────────────────────────────
  IF p_role = 'coach' THEN
    SELECT * INTO v_coach FROM coaches WHERE tc = p_tc LIMIT 1;

    -- #14: NOT FOUND durumunda da aynı mesaj — enumeration engeli
    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'error', 'TC veya şifre hatalı');
    END IF;

    v_raw_pass := COALESCE(trim(v_coach.coach_pass), '');
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

    IF NOT v_matched AND v_raw_pass <> '' THEN
      v_matched := (p_pass = v_default);
    END IF;

    IF NOT v_matched THEN
      RETURN json_build_object('ok', false, 'error', 'TC veya şifre hatalı');
    END IF;

    -- Bcrypt değilse otomatik yükselt
    IF v_stored !~ '^\$2[abxy]\$' THEN
      BEGIN
        UPDATE coaches
           SET coach_pass = crypt(p_pass, gen_salt('bf', 10))
         WHERE tc = p_tc;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;

    -- #3: coach_pass alanı yanıttan çıkarıldı — hash frontend'e ulaşmaz
    RETURN json_build_object(
      'ok',   true,
      'role', 'coach',
      'data', (row_to_json(v_coach)::jsonb - 'coach_pass')::json
    );

  -- ─── SPORCU ──────────────────────────────────────────────
  ELSE
    SELECT * INTO v_athlete FROM athletes WHERE tc = p_tc LIMIT 1;

    -- #14: NOT FOUND durumunda da aynı mesaj — enumeration engeli
    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'error', 'TC veya şifre hatalı');
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

    IF NOT v_matched AND v_raw_pass <> '' THEN
      v_matched := (p_pass = v_default);
    END IF;

    IF NOT v_matched THEN
      RETURN json_build_object('ok', false, 'error', 'TC veya şifre hatalı');
    END IF;

    -- Bcrypt değilse otomatik yükselt
    IF v_stored !~ '^\$2[abxy]\$' THEN
      BEGIN
        UPDATE athletes
           SET sp_pass = crypt(p_pass, gen_salt('bf', 10))
         WHERE tc = p_tc;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;

    -- #3: sp_pass alanı yanıttan çıkarıldı — hash frontend'e ulaşmaz
    RETURN json_build_object(
      'ok',   true,
      'role', 'sporcu',
      'data', (row_to_json(v_athlete)::jsonb - 'sp_pass')::json
    );
  END IF;
END;
$$;

-- ── TAMAMLANDI ────────────────────────────────────────────────
-- Bu migration çalıştırıldıktan sonra:
--   1. login_with_tc tüm hata durumlarında aynı mesajı döndürür
--      → Saldırgan TC'nin sistemde olup olmadığını anlayamaz
--   2. Başarılı girişte şifre hash'i JSON yanıtından çıkarılır
--      → bcrypt hash frontend'e hiç ulaşmaz
--   3. Mevcut giriş akışı tamamen korunur
-- ============================================================
