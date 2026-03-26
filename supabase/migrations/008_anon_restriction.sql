-- ============================================================
-- SPORCU PANELİ — Anon Rol Kısıtlaması
-- Migration 008
--
-- DEĞİŞİKLİKLER:
--   1. coaches — anon SELECT kaldırıldı
--      Antrenörler her zaman signInWithPassword ile giriş yapar
--      ve authenticated session kullanır. RPC fallback da
--      login_with_tc'den direkt veri döndürdüğü için anon
--      SELECT'e gerek yoktur.
--
--   2. payments — anon INSERT doğrulama güçlendirildi
--      Sahte/boş ödeme bildirimi engellemek için athlete_id
--      zorunlu, amount > 0 ve type zorunlu şartı eklendi.
--
-- KULLANIM:
--   Supabase Dashboard → SQL Editor'e yapıştır ve çalıştır.
--   Önce coaches giriş testini yap, sonra sporcu ödeme
--   bildirimini test et.
-- ============================================================

-- ── 1. coaches — anon SELECT kaldır ──────────────────────────
-- Öncesi: anon + authenticated (tüm antrenör verisi herkese açık)
-- Sonrası: sadece authenticated (giriş yapmış admin/antrenör)

DROP POLICY IF EXISTS "coaches_select" ON coaches;
CREATE POLICY "coaches_select" ON coaches
  FOR SELECT TO authenticated
  USING (true);

-- ── 2. payments — anon INSERT doğrulama ──────────────────────
-- Öncesi: WITH CHECK (true) — herhangi bir veriyle ödeme bildirimi eklenebilir
-- Sonrası: athlete_id zorunlu, amount > 0, type boş olamaz

DROP POLICY IF EXISTS "payments_insert_anon" ON payments;
CREATE POLICY "payments_insert_anon" ON payments
  FOR INSERT TO anon
  WITH CHECK (
    athlete_id IS NOT NULL
    AND amount IS NOT NULL
    AND amount > 0
    AND type IS NOT NULL
    AND type <> ''
  );

-- ── TAMAMLANDI ────────────────────────────────────────────────
-- Bu migration çalıştırıldıktan sonra:
--   1. Giriş yapmadan /rest/v1/coaches ile antrenör verisi okunamaz
--   2. Sahte/sıfır tutarlı ödeme bildirimi eklenemez
-- ============================================================
