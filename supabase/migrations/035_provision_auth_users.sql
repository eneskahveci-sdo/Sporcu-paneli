-- ============================================================
-- 035_provision_auth_users.sql
-- Mevcut sporcular, antrenörler ve adminler için Supabase Auth
-- kullanıcıları oluşturur.
--
-- Şifre mantığı (her rol için):
--   bcrypt   ($2a/b/x/y$...)  → direkt kopyala (zaten güvenli)
--   plaintext (bcrypt değil, SHA256 değil)  → crypt() ile bcrypt'e çevir
--   SHA-256  (64 hex karakter) → plaintext bilinemiyor
--                                 → sporcu/antrenör: TC son 6 hane (varsayılan)
--                                 → admin: geçici şifre 'Dragos2025!'
--   NULL/boş → sporcu/antrenör: TC son 6 hane
--             → admin: geçici şifre 'Dragos2025!'
--
-- Admin özel kural: users.id == auth.uid() olmalı.
--   is_admin() fonksiyonu: SELECT id FROM users WHERE id = auth.uid()
--   Bu nedenle adminler için AYNI UUID kullanılır.
--
-- Email belirleme:
--   Sporcu/antrenör tablosunda geçerli em varsa onu kullan,
--   yoksa tc || '@dragosfk.com' fallback'i.
--   Bir email başka auth user'a aitse tc@dragosfk.com'a geç.
--
-- Idempotent: her kullanıcı için önce var mı kontrolü yapılır.
--   auth.identities provider_id kolonu var/yok → EXECUTE ile handle edilir.
-- ============================================================

DO $$
DECLARE
  rec          RECORD;
  _id          UUID;
  _email       TEXT;
  _pass        TEXT;
  _encrypted   TEXT;
  _default_pass TEXT;
  _meta        JSONB;
  _has_prov_id BOOLEAN;
  _identity_sql TEXT;
  _skip        BOOLEAN;
BEGIN

  -- auth.identities tablosunda provider_id kolonu var mı? (schema versiyonu tespiti)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth'
      AND table_name   = 'identities'
      AND column_name  = 'provider_id'
  ) INTO _has_prov_id;

  RAISE NOTICE '--- 035: Auth kullanıcı provisioning başladı ---';
  RAISE NOTICE 'auth.identities provider_id kolonu: %', _has_prov_id;

  -- ──────────────────────────────────────────────────────────────────
  -- YARDIMCI MAKRO: auth.users + auth.identities ekleme
  -- (PL/pgSQL fonksiyon tanımı yerine inline, performans için)
  -- ──────────────────────────────────────────────────────────────────

  -- ──────────────────────────────────────────────────────────────────
  -- 1. SPORCUlar
  -- ──────────────────────────────────────────────────────────────────
  RAISE NOTICE '→ Sporcular işleniyor...';

  FOR rec IN
    SELECT id, tc, em, sp_pass, fn, ln, org_id, branch_id
    FROM   public.athletes
    WHERE  tc IS NOT NULL
      AND  length(trim(tc)) = 11
    ORDER BY created_at NULLS LAST, id
  LOOP
    BEGIN
      _skip := FALSE;

      -- E-posta belirle
      _email := CASE
        WHEN rec.em IS NOT NULL
          AND length(trim(rec.em)) > 3
          AND position('@' IN trim(rec.em)) > 0
        THEN lower(trim(rec.em))
        ELSE rec.tc || '@dragosfk.com'
      END;

      -- Gerçek email başkasına aitse fallback'e geç
      IF _email <> (rec.tc || '@dragosfk.com')
         AND EXISTS (SELECT 1 FROM auth.users WHERE email = _email) THEN
        _email := rec.tc || '@dragosfk.com';
      END IF;

      -- Fallback da alınmışsa atla
      IF EXISTS (SELECT 1 FROM auth.users WHERE email = _email) THEN
        _skip := TRUE;
      END IF;

      IF NOT _skip THEN
        _default_pass := right(rec.tc, 6);
        _pass         := COALESCE(trim(rec.sp_pass), '');

        IF    _pass ~ '^\$2[abxy]\$' THEN
          _encrypted := _pass;                                         -- bcrypt: direkt kopyala
        ELSIF length(_pass) = 64 AND _pass ~ '^[0-9a-f]{64}$' THEN
          _encrypted := crypt(_default_pass, gen_salt('bf', 10));      -- SHA-256: default
        ELSIF _pass <> '' THEN
          _encrypted := crypt(_pass, gen_salt('bf', 10));              -- plaintext: bcrypt'e çevir
        ELSE
          _encrypted := crypt(_default_pass, gen_salt('bf', 10));      -- boş: default
        END IF;

        _id   := gen_random_uuid();
        _meta := jsonb_build_object(
          'tc',         rec.tc,
          'role',       'athlete',
          'full_name',  trim(COALESCE(rec.fn,'') || ' ' || COALESCE(rec.ln,'')),
          'org_id',     rec.org_id,
          'branch_id',  rec.branch_id,
          'athlete_id', rec.id::text
        );

        INSERT INTO auth.users (
          instance_id, id, aud, role, email,
          encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at,
          confirmation_token, recovery_token,
          email_change_token_new, email_change,
          is_super_admin
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          _id, 'authenticated', 'authenticated', _email,
          _encrypted, now(),
          '{"provider":"email","providers":["email"]}',
          _meta,
          now(), now(),
          '', '', '', '', false
        );

        -- auth.identities — schema versiyonuna göre
        IF _has_prov_id THEN
          EXECUTE
            'INSERT INTO auth.identities ' ||
            '(id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) ' ||
            'VALUES ($1, $2, $3, $4, $5, now(), now(), now())'
          USING
            _id, _id,
            jsonb_build_object('sub', _id::text, 'email', _email),
            'email', _email;
        ELSE
          EXECUTE
            'INSERT INTO auth.identities ' ||
            '(id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) ' ||
            'VALUES ($1, $2, $3, $4, now(), now(), now())'
          USING
            _id, _id,
            jsonb_build_object('sub', _id::text, 'email', _email),
            'email';
        END IF;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Sporcu atlandı: tc=% email=% hata=%', rec.tc, _email, SQLERRM;
    END;
  END LOOP;

  -- ──────────────────────────────────────────────────────────────────
  -- 2. ANTRENÖRLER
  -- ──────────────────────────────────────────────────────────────────
  RAISE NOTICE '→ Antrenörler işleniyor...';

  FOR rec IN
    SELECT id, tc, em, coach_pass, fn, ln, org_id, branch_id
    FROM   public.coaches
    WHERE  tc IS NOT NULL
      AND  length(trim(tc)) = 11
    ORDER BY created_at NULLS LAST, id
  LOOP
    BEGIN
      _skip := FALSE;

      _email := CASE
        WHEN rec.em IS NOT NULL
          AND length(trim(rec.em)) > 3
          AND position('@' IN trim(rec.em)) > 0
        THEN lower(trim(rec.em))
        ELSE rec.tc || '@dragosfk.com'
      END;

      IF _email <> (rec.tc || '@dragosfk.com')
         AND EXISTS (SELECT 1 FROM auth.users WHERE email = _email) THEN
        _email := rec.tc || '@dragosfk.com';
      END IF;

      IF EXISTS (SELECT 1 FROM auth.users WHERE email = _email) THEN
        _skip := TRUE;
      END IF;

      IF NOT _skip THEN
        _default_pass := right(rec.tc, 6);
        _pass         := COALESCE(trim(rec.coach_pass), '');

        IF    _pass ~ '^\$2[abxy]\$' THEN
          _encrypted := _pass;
        ELSIF length(_pass) = 64 AND _pass ~ '^[0-9a-f]{64}$' THEN
          _encrypted := crypt(_default_pass, gen_salt('bf', 10));
        ELSIF _pass <> '' THEN
          _encrypted := crypt(_pass, gen_salt('bf', 10));
        ELSE
          _encrypted := crypt(_default_pass, gen_salt('bf', 10));
        END IF;

        _id   := gen_random_uuid();
        _meta := jsonb_build_object(
          'tc',        rec.tc,
          'role',      'coach',
          'full_name', trim(COALESCE(rec.fn,'') || ' ' || COALESCE(rec.ln,'')),
          'org_id',    rec.org_id,
          'branch_id', rec.branch_id,
          'coach_id',  rec.id::text
        );

        INSERT INTO auth.users (
          instance_id, id, aud, role, email,
          encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at,
          confirmation_token, recovery_token,
          email_change_token_new, email_change,
          is_super_admin
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          _id, 'authenticated', 'authenticated', _email,
          _encrypted, now(),
          '{"provider":"email","providers":["email"]}',
          _meta,
          now(), now(),
          '', '', '', '', false
        );

        IF _has_prov_id THEN
          EXECUTE
            'INSERT INTO auth.identities ' ||
            '(id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) ' ||
            'VALUES ($1, $2, $3, $4, $5, now(), now(), now())'
          USING
            _id, _id,
            jsonb_build_object('sub', _id::text, 'email', _email),
            'email', _email;
        ELSE
          EXECUTE
            'INSERT INTO auth.identities ' ||
            '(id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) ' ||
            'VALUES ($1, $2, $3, $4, now(), now(), now())'
          USING
            _id, _id,
            jsonb_build_object('sub', _id::text, 'email', _email),
            'email';
        END IF;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Antrenör atlandı: tc=% email=% hata=%', rec.tc, _email, SQLERRM;
    END;
  END LOOP;

  -- ──────────────────────────────────────────────────────────────────
  -- 3. ADMİNLER (public.users tablosu)
  --
  -- KRİTİK: users.id == auth.uid() zorunlu.
  --   is_admin() RPC:  SELECT id FROM users WHERE id = auth.uid() AND role = 'admin'
  --   Bu nedenle auth.users'a AYNI UUID ile ekliyoruz.
  --
  -- SHA-256/boş şifreli adminler geçici şifre alır: Dragos2025!
  --   → Admin Dashboard'dan hemen değiştirmesi önerilir.
  -- ──────────────────────────────────────────────────────────────────
  RAISE NOTICE '→ Adminler işleniyor...';

  FOR rec IN
    SELECT id, email, name, pass, org_id, branch_id, role
    FROM   public.users
    WHERE  email IS NOT NULL
      AND  length(trim(email)) > 3
      AND  position('@' IN trim(email)) > 0
    ORDER BY id
  LOOP
    BEGIN
      _email := lower(trim(rec.email));
      _pass  := COALESCE(trim(rec.pass), '');

      IF    _pass ~ '^\$2[abxy]\$' THEN
        _encrypted := _pass;
      ELSIF length(_pass) = 64 AND _pass ~ '^[0-9a-f]{64}$' THEN
        _encrypted := crypt('Dragos2025!', gen_salt('bf', 10));
        RAISE WARNING 'ADMİN SHA-256 şifresi: id=%, email=% → geçici şifre Dragos2025! ile oluşturuldu. Hemen değiştirin!', rec.id, _email;
      ELSIF _pass <> '' THEN
        _encrypted := crypt(_pass, gen_salt('bf', 10));
      ELSE
        _encrypted := crypt('Dragos2025!', gen_salt('bf', 10));
        RAISE WARNING 'ADMİN boş şifresi: id=%, email=% → geçici şifre Dragos2025! ile oluşturuldu. Hemen değiştirin!', rec.id, _email;
      END IF;

      _meta := jsonb_build_object(
        'role',      rec.role,
        'full_name', rec.name,
        'org_id',    rec.org_id,
        'branch_id', rec.branch_id
      );

      -- id çakışması: aynı id başka auth user'a aitse güncelle
      -- Email çakışması ama farklı id: warn et, atla
      IF EXISTS (SELECT 1 FROM auth.users WHERE id = rec.id) THEN
        -- Auth user zaten bu id ile var → şifre ve meta güncelle
        UPDATE auth.users
        SET encrypted_password = _encrypted,
            raw_user_meta_data = _meta,
            updated_at         = now()
        WHERE id = rec.id;
        RAISE NOTICE 'Admin güncellendi: id=%, email=%', rec.id, _email;

      ELSIF EXISTS (SELECT 1 FROM auth.users WHERE email = _email) THEN
        -- Farklı id ile bu email var → uyarı, atla (id eşleşmeden is_admin çalışmaz)
        RAISE WARNING 'Admin atlandı (email başka id ile var): id=%, email=%', rec.id, _email;

      ELSE
        -- Yeni kayıt: users.id ile aynı UUID kullan
        INSERT INTO auth.users (
          instance_id, id, aud, role, email,
          encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at,
          confirmation_token, recovery_token,
          email_change_token_new, email_change,
          is_super_admin
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          rec.id, 'authenticated', 'authenticated', _email,
          _encrypted, now(),
          '{"provider":"email","providers":["email"]}',
          _meta,
          now(), now(),
          '', '', '', '', false
        );

        IF _has_prov_id THEN
          EXECUTE
            'INSERT INTO auth.identities ' ||
            '(id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) ' ||
            'VALUES ($1, $2, $3, $4, $5, now(), now(), now())'
          USING
            rec.id, rec.id,
            jsonb_build_object('sub', rec.id::text, 'email', _email),
            'email', _email;
        ELSE
          EXECUTE
            'INSERT INTO auth.identities ' ||
            '(id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) ' ||
            'VALUES ($1, $2, $3, $4, now(), now(), now())'
          USING
            rec.id, rec.id,
            jsonb_build_object('sub', rec.id::text, 'email', _email),
            'email';
        END IF;

        RAISE NOTICE 'Admin oluşturuldu: id=%, email=%', rec.id, _email;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Admin atlandı: id=% email=% hata=%', rec.id, rec.email, SQLERRM;
    END;
  END LOOP;

  -- ──────────────────────────────────────────────────────────────────
  -- Özet
  -- ──────────────────────────────────────────────────────────────────
  RAISE NOTICE '--- 035: Tamamlandı ---';
  RAISE NOTICE 'Toplam auth.users: %', (SELECT count(*) FROM auth.users);

END $$;

-- ============================================================
-- Yeni eklemeler sonrası PostgREST schema cache yenile
-- ============================================================
NOTIFY pgrst, 'reload schema';
