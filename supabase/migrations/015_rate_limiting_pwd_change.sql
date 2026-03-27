-- ============================================================
-- SPORCU PANELİ — Rate Limiting + Zorunlu Şifre Değişikliği
-- Migration 015
--
-- DEĞİŞİKLİKLER:
--   1. login_attempts tablosu oluşturuldu (#13)
--      5 dakikada 10 başarısız deneme → hesap geçici olarak kilitlenir.
--      Başarılı girişte denemeler temizlenir.
--      Eski kayıtlar (15 dakika) her login çağrısında otomatik temizlenir.
--
--   2. pwd_changed kolonu eklendi (#2)
--      athletes ve coaches tablolarına DEFAULT false olarak eklendi.
--      Varsayılan şifreyle giriş yapan kullanıcılar şifre
--      değiştirmeye yönlendirilir.
--
--   3. change_user_password() fonksiyonu (#2)
--      Kullanıcının şifresini güvenli şekilde (bcrypt) güncelleyip
--      pwd_changed = true yapar. Anon + authenticated çağırabilir.
--
--   4. login_with_tc güncellendi (#13)
--      Rate limiting kontrolü eklendi. Başarısız girişler loglanır,
--      başarılı girişte log temizlenir.
--
-- UYUMLULUK:
--   Mevcut login akışı tamamen korunur. pwd_changed = false olan
--   kullanıcılar frontend'de şifre değiştirme modalıyla karşılaşır.
--   SQL migration çalıştırılmadan frontend değişikliği etkisizdir
--   (pwd_changed undefined → modal açılmaz).
-- ============================================================

-- ── 1. login_attempts TABLOSU ────────────────────────────────

CREATE TABLE IF NOT EXISTS login_attempts (
    id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
    tc           TEXT         NOT NULL,
    attempted_at TIMESTAMPTZ  DEFAULT NOW() NOT NULL,
    success      BOOLEAN      DEFAULT false NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_tc_time
    ON login_attempts(tc, attempted_at);

ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- SECURITY DEFINER fonksiyonlar postgres user'ı olarak çalışır,
-- RLS'i bypass eder. Grants yine de ekleniyor (defense in depth).
GRANT SELECT, INSERT, DELETE ON login_attempts TO service_role;
GRANT INSERT ON login_attempts TO anon, authenticated;

CREATE POLICY "attempts_insert_all" ON login_attempts
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- ── 2. pwd_changed KOLONU ────────────────────────────────────

ALTER TABLE athletes ADD COLUMN IF NOT EXISTS pwd_changed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE coaches  ADD COLUMN IF NOT EXISTS pwd_changed BOOLEAN NOT NULL DEFAULT false;

-- ── 3. change_user_password() FONKSİYONU ─────────────────────

CREATE OR REPLACE FUNCTION change_user_password(
    p_tc       TEXT,
    p_role     TEXT,
    p_new_pass TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rows_updated INTEGER;
BEGIN
    p_tc       := regexp_replace(COALESCE(p_tc, ''),       '[^0-9]', '', 'g');
    p_role     := lower(trim(COALESCE(p_role, '')));
    p_new_pass := trim(COALESCE(p_new_pass, ''));

    IF length(p_tc) <> 11 THEN
        RETURN json_build_object('ok', false, 'error', 'Geçersiz TC');
    END IF;

    IF length(p_new_pass) < 8 THEN
        RETURN json_build_object('ok', false, 'error', 'Şifre en az 8 karakter olmalıdır');
    END IF;

    IF p_role = 'coach' THEN
        UPDATE coaches
        SET coach_pass  = crypt(p_new_pass, gen_salt('bf', 10)),
            pwd_changed = true
        WHERE tc = p_tc;
        GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    ELSE
        UPDATE athletes
        SET sp_pass     = crypt(p_new_pass, gen_salt('bf', 10)),
            pwd_changed = true
        WHERE tc = p_tc;
        GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    END IF;

    IF v_rows_updated = 0 THEN
        RETURN json_build_object('ok', false, 'error', 'Kullanıcı bulunamadı');
    END IF;

    RETURN json_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION change_user_password(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION change_user_password(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION change_user_password(TEXT, TEXT, TEXT) TO service_role;

-- ── 4. login_with_tc GÜNCELLEMESİ (Rate Limiting Eklendi) ────
--
-- Önceki versiyon: Migration 014 (şifre hash çıkarma + hata msg birleştirme)
-- Bu versiyon: + Rate limiting (5 dk / 10 deneme)
-- Tüm önceki özellikler korunuyor.

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

    -- Eski denemeleri temizle (15 dakikadan eski) — basit otomatik temizlik
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

        -- Bcrypt değilse otomatik yükselt
        IF v_stored !~ '^\$2[abxy]\$' THEN
            BEGIN
                UPDATE coaches SET coach_pass = crypt(p_pass, gen_salt('bf', 10)) WHERE tc = p_tc;
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;

        -- Başarılı giriş: denemeleri temizle
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

        -- Bcrypt değilse otomatik yükselt
        IF v_stored !~ '^\$2[abxy]\$' THEN
            BEGIN
                UPDATE athletes SET sp_pass = crypt(p_pass, gen_salt('bf', 10)) WHERE tc = p_tc;
            EXCEPTION WHEN OTHERS THEN NULL;
            END;
        END IF;

        -- Başarılı giriş: denemeleri temizle
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
--   4. pwd_changed = false kullanıcılar frontend'de şifre
--      değiştirme modalıyla karşılaşır (Security.js ile birlikte çalışır)
--   5. change_user_password() ile şifre güvenli bcrypt ile güncellenir
-- ============================================================
