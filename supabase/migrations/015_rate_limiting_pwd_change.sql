-- ============================================================
-- SPORCU PANELİ — Rate Limiting
-- Migration 015
--
-- DEĞİŞİKLİKLER:
--   1. login_attempts tablosu oluşturuldu (#13)
--      5 dakikada 10 başarısız deneme → hesap geçici olarak kilitlenir.
--      Başarılı girişte denemeler temizlenir.
--      Eski kayıtlar (15 dakika) her login çağrısında otomatik temizlenir.
--
--   2. login_with_tc güncellendi (rate limiting eklendi)
--      Önceki özellikler (migration 014) korunur:
--        - sp_pass / coach_pass yanıttan çıkarılıyor
--        - Tüm hata durumlarında aynı mesaj
--        - bcrypt otomatik yükseltme
--
-- KULLANIM:
--   Supabase Dashboard → SQL Editor'e yapıştır ve çalıştır.
-- ============================================================

-- ── 1. login_attempts TABLOSU ────────────────────────────────

DROP TABLE IF EXISTS login_attempts CASCADE;

CREATE TABLE login_attempts (
    id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    tc           TEXT         NOT NULL,
    attempted_at TIMESTAMPTZ  DEFAULT NOW() NOT NULL,
    success      BOOLEAN      DEFAULT false NOT NULL
);

CREATE INDEX idx_login_attempts_tc_time
    ON login_attempts(tc, attempted_at);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON login_attempts TO service_role;
GRANT INSERT ON login_attempts TO anon, authenticated;

CREATE POLICY "attempts_insert_all" ON login_attempts
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- ── 2. login_with_tc GÜNCELLEMESİ (Rate Limiting Eklendi) ────

CREATE OR REPLACE FUNCTION login_with_tc(p_tc TEXT, p_pass TEXT, p_role TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_athlete       athletes%ROWTYPE;
    v_coach         coaches%ROWTYPE;
    v_default       TEXT;
    v_stored        TEXT;
    v_raw_pass      TEXT;
    v_matched       BOOLEAN;
    v_attempt_count INTEGER;
BEGIN
    p_tc   := regexp_replace(COALESCE(p_tc, ''), '[^0-9]', '', 'g');
    p_pass := trim(COALESCE(p_pass, ''));
    p_role := lower(trim(COALESCE(p_role, '')));

    IF length(p_tc) <> 11 THEN
        RETURN json_build_object('ok', false, 'error', 'TC veya şifre hatalı');
    END IF;

    IF p_pass = '' THEN
        RETURN json_build_object('ok', false, 'error', 'TC veya şifre hatalı');
    END IF;

    -- Eski denemeleri temizle (15 dakikadan eski)
    DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '15 minutes';

    -- Rate limit: son 5 dakikada aynı TC ile 10+ başarısız deneme
    SELECT COUNT(*) INTO v_attempt_count
    FROM login_attempts
    WHERE tc = p_tc
      AND attempted_at > NOW() - INTERVAL '5 minutes'
      AND success = false;

    IF v_attempt_count >= 10 THEN
        RETURN json_build_object(
            'ok',    false,
            'error', 'Çok fazla başarısız deneme. Lütfen 5 dakika bekleyin.',
            'locked', true
        );
    END IF;

    v_default := right(p_tc, 6);

    -- ─── ANTRENÖR ────────────────────────────────────────────
    IF p_role = 'coach' THEN
        SELECT * INTO v_coach FROM coaches WHERE tc = p_tc LIMIT 1;
        IF NOT FOUND THEN
            INSERT INTO login_attempts(tc, success) VALUES (p_tc, false);
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
            INSERT INTO login_attempts(tc, success) VALUES (p_tc, false);
            RETURN json_build_object('ok', false, 'error', 'TC veya şifre hatalı');
        END IF;

        IF v_stored !~ '^\$2[abxy]\$' THEN
            BEGIN
                UPDATE coaches SET coach_pass = crypt(p_pass, gen_salt('bf', 10)) WHERE tc = p_tc;
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;

        DELETE FROM login_attempts WHERE tc = p_tc;

        RETURN json_build_object(
            'ok',   true,
            'role', 'coach',
            'data', (row_to_json(v_coach)::jsonb - 'coach_pass')::json
        );

    -- ─── SPORCU ──────────────────────────────────────────────
    ELSE
        SELECT * INTO v_athlete FROM athletes WHERE tc = p_tc LIMIT 1;
        IF NOT FOUND THEN
            INSERT INTO login_attempts(tc, success) VALUES (p_tc, false);
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
            INSERT INTO login_attempts(tc, success) VALUES (p_tc, false);
            RETURN json_build_object('ok', false, 'error', 'TC veya şifre hatalı');
        END IF;

        IF v_stored !~ '^\$2[abxy]\$' THEN
            BEGIN
                UPDATE athletes SET sp_pass = crypt(p_pass, gen_salt('bf', 10)) WHERE tc = p_tc;
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;

        DELETE FROM login_attempts WHERE tc = p_tc;

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
--   1. login_with_tc 5 dk / 10 deneme rate limit uygular
--   2. Başarısız girişler login_attempts'a loglanır
--   3. Başarılı girişte log temizlenir
--   4. Varsayılan şifre: TC'nin son 6 hanesi (değiştirilmedi)
-- ============================================================
