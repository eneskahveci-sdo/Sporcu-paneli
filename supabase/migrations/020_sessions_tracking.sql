-- ============================================================
-- SPORCU PANELİ — Migration 020
-- Aktif Oturum Takibi (Session Tracking)
--
-- AMAÇ:
--   Admin hangi kullanıcıların sisteme giriş yaptığını görebilsin,
--   istediği zaman tek tek veya toplu olarak oturumları sonlandırabilsin.
--   Client her 60sn heartbeat atar; admin session'ı silerse client
--   sonraki heartbeat'te otomatik logout olur.
--
-- YAPI:
--   - sessions tablosu: doğrudan API erişimi KAPALI (RLS, 0 policy)
--   - Tüm işlemler SECURITY DEFINER fonksiyonlar üzerinden
--   - Sporcu/antrenör (anon), admin (authenticated) aynı fonksiyonları kullanır
-- ============================================================

-- ── 1. Tablo ─────────────────────────────────────────────────
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

-- Doğrudan API erişimini tamamen kapat (0 policy = kimse erişemez)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- ── 2. session_start — giriş anında çağrılır ─────────────────
-- Yeni oturum oluşturur, UUID döner (client saklar)
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

-- ── 3. session_heartbeat — her 60sn çağrılır ─────────────────
-- Satır varsa last_seen günceller → TRUE döner
-- Satır silinmişse (admin kapattı) → FALSE döner (client logout olur)
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

-- ── 4. session_end — logout anında çağrılır ──────────────────
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

-- ── 5. sessions_list — admin: tüm oturumları listeler ────────
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

-- ── 6. sessions_kill_all — admin: hepsini kapat ──────────────
-- p_exclude_id: adminin kendi session'ı (kendini kapatmasın)
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

-- ── 7. session_kill — admin: tek oturumu kapat ───────────────
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

-- ── 8. Grant ─────────────────────────────────────────────────
-- Sporcu/antrenör anon role ile çalışır → anon'a da grant
GRANT EXECUTE ON FUNCTION session_start(TEXT, TEXT, TEXT, UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION session_heartbeat(UUID)                      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION session_end(UUID)                            TO anon, authenticated;
GRANT EXECUTE ON FUNCTION sessions_list()                              TO authenticated;
GRANT EXECUTE ON FUNCTION sessions_kill_all(UUID)                      TO authenticated;
GRANT EXECUTE ON FUNCTION session_kill(UUID)                           TO authenticated;

-- ── 9. Eski oturumları temizle (7 günden eski) ───────────────
DELETE FROM sessions WHERE last_seen < now() - INTERVAL '7 days';
