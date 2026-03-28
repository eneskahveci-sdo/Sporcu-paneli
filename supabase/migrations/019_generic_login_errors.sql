-- ============================================================
-- SPORCU PANELİ — Migration 019
-- Login Hata Mesajlarını Standartlaştır (User Enumeration Önleme)
--
-- SORUN:
--   login_with_tc() farklı durumlar için farklı hata mesajları
--   döndürüyordu:
--     • "Antrenör bulunamadı" → TC sistemde yok
--     • "Sporcu bulunamadı"   → TC sistemde yok
--     • "TC veya şifre hatalı" → TC var ama şifre yanlış
--   Bu farklılık, saldırganın hangi TC'nin kayıtlı olduğunu
--   anlamasını sağlar (user enumeration).
--
-- ÇÖZÜM:
--   Tüm başarısız girişler aynı mesajı döndürür:
--   "TC Kimlik No veya Şifre Hatalı"
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
  v_generic_error CONSTANT TEXT := 'TC Kimlik No veya Şifre Hatalı';
BEGIN
  p_tc   := regexp_replace(COALESCE(p_tc, ''),   '[^0-9]', '', 'g');
  p_pass := trim(COALESCE(p_pass, ''));
  p_role := lower(trim(COALESCE(p_role, '')));

  IF length(p_tc) <> 11 THEN
    RETURN json_build_object('ok', false, 'error', v_generic_error);
  END IF;

  IF p_pass = '' THEN
    RETURN json_build_object('ok', false, 'error', v_generic_error);
  END IF;

  v_default := right(p_tc, 6);

  -- ─── ANTRENÖR ────────────────────────────────────────────
  IF p_role = 'coach' THEN
    SELECT * INTO v_coach FROM coaches WHERE tc = p_tc LIMIT 1;
    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'error', v_generic_error);
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
      RETURN json_build_object('ok', false, 'error', v_generic_error);
    END IF;

    IF v_stored !~ '^\$2[abxy]\$' THEN
      BEGIN
        UPDATE coaches SET coach_pass = crypt(p_pass, gen_salt('bf', 10)) WHERE tc = p_tc;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;

    RETURN json_build_object('ok', true, 'role', 'coach', 'data', row_to_json(v_coach));

  -- ─── SPORCU ──────────────────────────────────────────────
  ELSE
    SELECT * INTO v_athlete FROM athletes WHERE tc = p_tc LIMIT 1;
    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'error', v_generic_error);
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
      RETURN json_build_object('ok', false, 'error', v_generic_error);
    END IF;

    IF v_stored !~ '^\$2[abxy]\$' THEN
      BEGIN
        UPDATE athletes SET sp_pass = crypt(p_pass, gen_salt('bf', 10)) WHERE tc = p_tc;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    END IF;

    RETURN json_build_object('ok', true, 'role', 'sporcu', 'data', row_to_json(v_athlete));
  END IF;
END;
$$;
