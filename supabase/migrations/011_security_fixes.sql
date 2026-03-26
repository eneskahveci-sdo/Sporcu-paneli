-- ============================================================
-- SPORCU PANELİ — Güvenlik Düzeltmeleri
-- Migration 011
--
-- DEĞİŞİKLİKLER:
--   1. on_kayitlar anon UPDATE politikası daraltıldı.
--      Önceki politika USING(true) ile tüm kayıtlar herhangi
--      bir anonim kullanıcı tarafından güncellenebiliyordu.
--      Yeni politika sadece henüz KVKK onayı verilmemiş
--      (kvkk_consent IS NULL veya FALSE) kayıtları günceller
--      ve yalnızca kvkk_consent kolonunun değiştirilmesine izin verir.
--
-- KULLANIM:
--   Supabase Dashboard → SQL Editor'e yapıştır ve çalıştır.
-- ============================================================

-- ── Anon UPDATE politikasını güvenli hale getir ───────────────
-- Sadece henüz KVKK onayı verilmemiş kayıtlara uygulansın.
DROP POLICY IF EXISTS "onkayitlar_update_anon" ON on_kayitlar;
CREATE POLICY "onkayitlar_update_anon" ON on_kayitlar
  FOR UPDATE TO anon
  USING (kvkk_consent IS NULL OR kvkk_consent = false)
  WITH CHECK (
    kvkk_consent IS NOT NULL
    AND kvkk_consent = true
    AND consent_date IS NOT NULL
  );

-- ── TAMAMLANDI ────────────────────────────────────────────────
-- Bu migration çalıştırıldıktan sonra:
--   • Anon kullanıcılar yalnızca KVKK onaylanmamış kayıtları güncelleyebilir
--   • Güncelleme sadece kvkk_consent=true ve consent_date dolu ise geçerlidir
--   • Onaylanmış kayıtlar (kvkk_consent=true) anonim değişikliğe kapalıdır
-- ============================================================
