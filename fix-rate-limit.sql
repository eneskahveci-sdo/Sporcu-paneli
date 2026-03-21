-- Sporcu Paneli — SMS Rate Limiting DB Migrasyonu
-- Supabase Dashboard → SQL Editor'e yapıştır ve çalıştır.

-- 1. Tablo oluştur
CREATE TABLE IF NOT EXISTS sms_rate_limits (
  ip TEXT NOT NULL PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  count INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_sms_rate_limits_window
  ON sms_rate_limits (window_start);

-- 2. Rate limit kontrol + sayaç artırma fonksiyonu
CREATE OR REPLACE FUNCTION check_sms_rate_limit(
  client_ip TEXT,
  max_count INTEGER DEFAULT 5,
  window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
  window_start_time TIMESTAMPTZ;
BEGIN
  SELECT count, window_start
    INTO current_count, window_start_time
    FROM sms_rate_limits
    WHERE ip = client_ip;

  -- İlk istek
  IF NOT FOUND THEN
    INSERT INTO sms_rate_limits (ip, window_start, count)
    VALUES (client_ip, NOW(), 1)
    ON CONFLICT (ip) DO UPDATE SET count = 1, window_start = NOW();
    RETURN TRUE;
  END IF;

  -- Zaman penceresi doldu, sıfırla
  IF window_start_time + (window_seconds || ' seconds')::INTERVAL < NOW() THEN
    UPDATE sms_rate_limits SET count = 1, window_start = NOW() WHERE ip = client_ip;
    RETURN TRUE;
  END IF;

  -- Limit aşıldı
  IF current_count >= max_count THEN
    RETURN FALSE;
  END IF;

  -- Sayacı artır
  UPDATE sms_rate_limits SET count = count + 1 WHERE ip = client_ip;
  RETURN TRUE;
END;
$$;

-- 3. Güvenlik: public erişimi kapat, sadece service role kullanabilir
ALTER TABLE sms_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no_public_access" ON sms_rate_limits
  AS RESTRICTIVE TO public USING (false);
