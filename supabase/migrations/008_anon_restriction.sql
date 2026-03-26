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
-- Sonrası: aid (athlete_id) zorunlu, amt > 0, ty boş olamaz
-- NOT: payments tablosunda kısa kolon adları kullanılmaktadır:
--      aid = athlete_id, amt = amount, ty = type

DROP POLICY IF EXISTS "payments_insert_anon" ON payments;
CREATE POLICY "payments_insert_anon" ON payments
  FOR INSERT TO anon
  WITH CHECK (
    aid IS NOT NULL
    AND amt IS NOT NULL
    AND amt > 0
    AND ty IS NOT NULL
    AND ty <> ''
  );

-- ── TAMAMLANDI ────────────────────────────────────────────────
-- Bu migration çalıştırıldıktan sonra:
--   1. Giriş yapmadan /rest/v1/coaches ile antrenör verisi okunamaz
--   2. Sahte/sıfır tutarlı ödeme bildirimi eklenemez
-- ============================================================
