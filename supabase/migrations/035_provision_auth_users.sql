-- ============================================================
-- 035_provision_auth_users.sql
-- Mevcut sporcular, antrenörler ve adminler için Supabase Auth
-- kullanıcıları oluşturur.
--
-- Şifre mantığı (sporcu/antrenör):
--   bcrypt ($2a/b/x/y$...)     → direkt kopyala
--   plaintext (diğer, boş değil) → crypt() ile bcrypt'e çevir
--   SHA-256 (64 hex karakter)  → plaintext bilinemiyor → TC son 6 hane
--   NULL/boş                   → TC son 6 hane (varsayılan şifre)
--
-- Admin şifre mantığı:
--   bcrypt     → direkt kopyala
--   plaintext  → bcrypt'e çevir
--   SHA-256/boş → geçici 'Dragos2025!'  (hemen değiştir)
--
-- ADMİN KRİTİK: users.id == auth.uid() zorunlu (is_admin() bunu gerektirir).
--   Bu migration daima YENİ UUID ile auth user oluşturur, ardından
--   public.users.id'yi yeni UUID ile GÜNCELLER.
--   → Eski Supabase'den taşınan adminler de dahil, tüm adminler çalışır.
--
-- İdempotent:
--   • Sporcu/antrenör: email zaten auth.users'da varsa atla.
--   • Admin: email zaten auth.users'da varsa → public.users.id senkronize et.
--   • auth.identities provider_id kolonu var/yok → EXECUTE ile dinamik.
-- ============================================================

DO $$
DECLARE
  rec               RECORD;
  _id               UUID;
  _existing_auth_id UUID;
  _email            TEXT;
  _pass             TEXT;
  _encrypted        TEXT;
  _default_pass     TEXT;
  _meta             JSONB;
  _has_prov_id      BOOLEAN;
  _skip             BOOLEAN;
BEGIN

  -- auth.identities tablosunda provider_id kolonu var mı? (schema versiyonu tespiti)
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth'
      AND table_name   = 'identities'
      AND column_name  = 'provider_id'
  ) INTO _has_prov_id;

  RAISE NOTICE '--- 035: Auth kullanıcı provisioning başladı ---';
  RAISE NOTICE 'auth.identities.provider_id mevcut: %', _has_prov_id;

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

      -- Fallback da alınmışsa atla (bu TC zaten auth'ta var)
      IF EXISTS (SELECT 1 FROM auth.users WHERE email = _email) THEN
        _skip := TRUE;
      END IF;

      IF NOT _skip THEN
        _default_pass := right(rec.tc, 6);
        _pass         := COALESCE(trim(rec.sp_pass), '');

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

        IF _has_prov_id THEN
          EXECUTE
            'INSERT INTO auth.identities ' ||
            '(id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) ' ||
            'VALUES ($1, $2, $3, $4, $5, now(), now(), now())'
          USING _id, _id,
            jsonb_build_object('sub', _id::text, 'email', _email),
            'email', _email;
        ELSE
          EXECUTE
            'INSERT INTO auth.identities ' ||
            '(id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) ' ||
            'VALUES ($1, $2, $3, $4, now(), now(), now())'
          USING _id, _id,
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
          USING _id, _id,
            jsonb_build_object('sub', _id::text, 'email', _email),
            'email', _email;
        ELSE
          EXECUTE
            'INSERT INTO auth.identities ' ||
            '(id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) ' ||
            'VALUES ($1, $2, $3, $4, now(), now(), now())'
          USING _id, _id,
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
  -- KRİTİK: users.id == auth.uid() ZORUNLU
  --   is_admin(): SELECT id FROM users WHERE id = auth.uid() AND role = 'admin'
  --
  -- Eski Supabase'den taşınan adminlerin UUID'si yeni projede geçersiz.
  -- Çözüm: daima YENİ UUID ile auth user oluştur, ardından
  --        public.users.id'yi yeni UUID ile UPDATE et.
  --
  -- Durum A: Bu email için auth.users kaydı ZATen VAR
  --   → existing UUID al → public.users.id'yi o UUID ile güncelle
  --
  -- Durum B: Auth kaydı YOK
  --   → Yeni UUID üret → auth.users ekle → public.users.id güncelle
  --
  -- Böylece her admin için users.id = auth.uid() garantilenir.
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

      -- Bu email için mevcut auth user var mı?
      SELECT id INTO _existing_auth_id
      FROM   auth.users
      WHERE  email = _email
      LIMIT  1;

      IF _existing_auth_id IS NOT NULL THEN
        -- ── Durum A: Auth user zaten var ────────────────────────────
        IF _existing_auth_id = rec.id THEN
          -- Zaten senkronize, bir şey yapmaya gerek yok
          RAISE NOTICE 'Admin zaten senkronize: id=%, email=%', rec.id, _email;
        ELSE
          -- users.id ≠ auth.uid → public.users.id'yi düzelt
          -- Önce bu UUID ile başka users satırı var mı?
          IF EXISTS (SELECT 1 FROM public.users WHERE id = _existing_auth_id) THEN
            -- Hem eski (rec.id) hem yeni (_existing_auth_id) satır var → eski silinir
            DELETE FROM public.users WHERE id = rec.id;
            RAISE NOTICE 'Admin eski UUID satırı silindi (yeni UUID satırı zaten var): old=%, email=%', rec.id, _email;
          ELSE
            -- Sadece eski satır var → UUID güncelle
            UPDATE public.users SET id = _existing_auth_id WHERE id = rec.id;
            RAISE NOTICE 'Admin UUID güncellendi: old=% → new=%, email=%', rec.id, _existing_auth_id, _email;
          END IF;
        END IF;

      ELSE
        -- ── Durum B: Auth user yok → oluştur + users.id güncelle ───
        _pass := COALESCE(trim(rec.pass), '');

        IF    _pass ~ '^\$2[abxy]\$' THEN
          _encrypted := _pass;
        ELSIF length(_pass) = 64 AND _pass ~ '^[0-9a-f]{64}$' THEN
          _encrypted := crypt('Dragos2025!', gen_salt('bf', 10));
          RAISE WARNING 'ADMİN SHA-256 şifresi: email=% → geçici şifre Dragos2025! Hemen değiştirin!', _email;
        ELSIF _pass <> '' THEN
          _encrypted := crypt(_pass, gen_salt('bf', 10));
        ELSE
          _encrypted := crypt('Dragos2025!', gen_salt('bf', 10));
          RAISE WARNING 'ADMİN boş şifresi: email=% → geçici şifre Dragos2025! Hemen değiştirin!', _email;
        END IF;

        _meta := jsonb_build_object(
          'role',      rec.role,
          'full_name', rec.name,
          'org_id',    rec.org_id,
          'branch_id', rec.branch_id
        );

        _id := gen_random_uuid();

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
          USING _id, _id,
            jsonb_build_object('sub', _id::text, 'email', _email),
            'email', _email;
        ELSE
          EXECUTE
            'INSERT INTO auth.identities ' ||
            '(id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at) ' ||
            'VALUES ($1, $2, $3, $4, now(), now(), now())'
          USING _id, _id,
            jsonb_build_object('sub', _id::text, 'email', _email),
            'email';
        END IF;

        -- ZORUNLU: public.users.id'yi yeni auth UUID ile güncelle
        IF EXISTS (SELECT 1 FROM public.users WHERE id = _id) THEN
          -- Nadir çakışma: yeni UUID zaten başka satırda var → hata
          RAISE WARNING 'ADMİN UUID çakışması (son derece nadir): yeni id=%, email=% — users.id güncellenmedi!', _id, _email;
        ELSE
          UPDATE public.users SET id = _id WHERE id = rec.id;
          RAISE NOTICE 'Admin oluşturuldu: auth_id=%, email=%', _id, _email;
        END IF;

      END IF;

    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Admin atlandı: id=% email=% hata=%', rec.id, rec.email, SQLERRM;
    END;
  END LOOP;

  -- ──────────────────────────────────────────────────────────────────
  -- Özet
  -- ──────────────────────────────────────────────────────────────────
  RAISE NOTICE '--- 035: Tamamlandı ---';
  RAISE NOTICE 'Toplam auth.users sayısı: %', (SELECT count(*) FROM auth.users);
  RAISE NOTICE 'Toplam public.users sayısı: %', (SELECT count(*) FROM public.users);

END $$;

-- PostgREST schema cache yenile
NOTIFY pgrst, 'reload schema';
