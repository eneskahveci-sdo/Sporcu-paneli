-- 026_overdue_pg_function.sql
-- Frontend'deki N-adet DB yazımını tek RPC çağrısına indirger.
-- checkOverdue() artık sb.rpc('mark_overdue_payments') olarak çalışır.

-- Toplu gecikme güncellemesi: tek sorguda tüm pending+vadesi geçmiş satırları overdue yapar
CREATE OR REPLACE FUNCTION mark_overdue_payments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count integer;
BEGIN
  UPDATE payments
  SET st = 'overdue'
  WHERE st = 'pending'
    AND dt IS NOT NULL
    AND dt::date < CURRENT_DATE;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- Trigger: INSERT veya UPDATE anında vadesi geçmiş pending satırları otomatik overdue yap
CREATE OR REPLACE FUNCTION fn_auto_mark_overdue()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.st = 'pending' AND NEW.dt IS NOT NULL AND NEW.dt::date < CURRENT_DATE THEN
    NEW.st = 'overdue';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_mark_overdue ON payments;
CREATE TRIGGER trg_auto_mark_overdue
  BEFORE INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION fn_auto_mark_overdue();

-- Mevcut gecikmiş kayıtları hemen güncelle
SELECT mark_overdue_payments();
