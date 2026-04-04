-- ============================================================
-- SPORCU PANELİ — Migration 022
-- sessions tablosu ve session_start fonksiyonu düzeltmesi
--
-- SORUN: Production DB'de eski "active_sessions" tablosuna
--   INSERT yapmaya çalışan bir session_start fonksiyonu bulunuyor.
--   Bu tablonun RLS politikası yok (0 policy), dolayısıyla
--   "new row violates row-level security policy for table
--   active_sessions" hatası oluşuyor.
--
-- DÜZELTME:
--   1. "sessions" tablosunu (migration 020) yeniden oluştur
--   2. session_start fonksiyonunu SECURITY DEFINER olarak
--      "sessions" tablosunu kullanacak şekilde yeniden yaz
--   3. Eski active_sessions tablosunu temizle (varsa)
-- ============================================================

-- ── 1. Eski active_sessions tablosunu temizle (varsa) ─────────
DROP TABLE IF EXISTS active_sessions CASCADE;

-- ── 2. sessions tablosunu oluştur (idempotent) ────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name   TEXT        NOT NULL,
  role        TEXT        NOT NULL CHECK (role IN ('admin', 'coach', 'sporcu')),
  tc          TEXT,
  org_id      UUID,
  branch_id   UUID,
  login_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Doğrudan API erişimini kapat (SECURITY DEFINER fonksiyonlar bypass eder)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- ── 3. session_start — SECURITY DEFINER (RLS bypass) ─────────
-- Bu fonksiyon sessions tablosuna doğrudan INSERT yapabilir
-- çünkü SECURITY DEFINER ile çalışır (table owner haklarıyla).
CREATE OR REPLACE FUNCTION session_start(
  p_name      TEXT,
  p_role      TEXT,
  p_tc        TEXT    DEFAULT NULL,
  p_org_id    UUID    DEFAULT NULL,
  p_branch_id UUID    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO sessions(user_name, role, tc, org_id, branch_id)
  VALUES (p_name, p_role, p_tc, p_org_id, p_branch_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ── 4. Diğer session fonksiyonlarını yeniden oluştur ──────────
CREATE OR REPLACE FUNCTION session_heartbeat(p_session_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE sessions SET last_seen = now() WHERE id = p_session_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION session_end(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM sessions WHERE id = p_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION sessions_list()
RETURNS TABLE(
  id        UUID,
  user_name TEXT,
  role      TEXT,
  tc        TEXT,
  login_at  TIMESTAMPTZ,
  last_seen TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
    SELECT s.id, s.user_name, s.role, s.tc, s.login_at, s.last_seen
    FROM sessions s
    ORDER BY s.last_seen DESC;
END;
$$;

CREATE OR REPLACE FUNCTION sessions_kill_all(p_exclude_id UUID DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count INT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM sessions
  WHERE (p_exclude_id IS NULL OR id <> p_exclude_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION session_kill(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  DELETE FROM sessions WHERE id = p_session_id;
END;
$$;

-- ── 5. Grant'ler ──────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION session_start(TEXT, TEXT, TEXT, UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION session_heartbeat(UUID)                      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION session_end(UUID)                            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION sessions_list()                              TO authenticated;
GRANT EXECUTE ON FUNCTION sessions_kill_all(UUID)                      TO authenticated;
GRANT EXECUTE ON FUNCTION session_kill(UUID)                           TO authenticated;

-- ── 6. Eski oturumları temizle (7 günden eski) ───────────────
DELETE FROM sessions WHERE last_seen < now() - INTERVAL '7 days';
