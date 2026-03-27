-- ============================================================
-- SPORCU PANELİ — Migration 013
-- Plaintext Şifre Temizleme
--
-- AMAÇ:
--   Daha önce hiç giriş yapmamış kullanıcıların şifreleri
--   veritabanında düz metin olarak duruyorsa bu betik onları
--   SHA-256 hash'e çevirir. Giriş yapmış kullanıcıların
--   şifreleri zaten migration 007'deki otomatik yükseltme
--   sayesinde hashlenmiştir.
--
-- GÜVENLİ:
--   • Zaten hashlenmiş şifreler (64 karakterli hex) dokunulmaz.
--   • bcrypt formatındaki şifreler ($2b$...) dokunulmaz.
--   • Boş/NULL şifreler TC'nin son 6 hanesinden türetilerek
--     SHA-256 hash olarak kaydedilir.
--
-- KULLANIM:
--   Supabase Dashboard → SQL Editor'e yapıştır ve çalıştır.
-- ============================================================

-- pgcrypto eklentisinin yüklü olduğundan emin ol
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. athletes tablosu ──────────────────────────────────────

-- 1a. Boş/NULL sp_pass → SHA-256(TC'nin son 6 hanesi)
UPDATE athletes
SET sp_pass = encode(digest(right(tc, 6), 'sha256'), 'hex')
WHERE (sp_pass IS NULL OR sp_pass = '')
  AND tc IS NOT NULL
  AND length(tc) = 11;

-- 1b. Plaintext sp_pass → SHA-256(sp_pass)
--     (64 hex ve bcrypt formatı olmayanlar)
UPDATE athletes
SET sp_pass = encode(digest(sp_pass, 'sha256'), 'hex')
WHERE sp_pass IS NOT NULL
  AND sp_pass <> ''
  AND length(sp_pass) <> 64
  AND sp_pass !~ '^[0-9a-f]{64}$'
  AND sp_pass !~ '^\$2[ab]\$';

-- ── 2. coaches tablosu ──────────────────────────────────────

-- 2a. Boş/NULL coach_pass → SHA-256(TC'nin son 6 hanesi)
UPDATE coaches
SET coach_pass = encode(digest(right(tc, 6), 'sha256'), 'hex')
WHERE (coach_pass IS NULL OR coach_pass = '')
  AND tc IS NOT NULL
  AND length(tc) = 11;

-- 2b. Plaintext coach_pass → SHA-256(coach_pass)
UPDATE coaches
SET coach_pass = encode(digest(coach_pass, 'sha256'), 'hex')
WHERE coach_pass IS NOT NULL
  AND coach_pass <> ''
  AND length(coach_pass) <> 64
  AND coach_pass !~ '^[0-9a-f]{64}$'
  AND coach_pass !~ '^\$2[ab]\$';

-- ── TAMAMLANDI ────────────────────────────────────────────────
-- Bu betik çalıştırıldıktan sonra:
--   1. Tüm kullanıcıların şifresi en az SHA-256 hashlidir.
--   2. Veritabanına erişim sağlansa bile düz metin şifre okunamaz.
--   3. Giriş akışı (login_with_tc) etkilenmez — SHA-256 karşılaştırma
--      zaten migration 007'de desteklenmektedir.
-- ============================================================
