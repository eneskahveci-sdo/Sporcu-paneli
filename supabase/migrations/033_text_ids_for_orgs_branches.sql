-- ============================================================
-- 033_text_ids_for_orgs_branches.sql
-- Eski DB'de orgs/branches id'leri UUID değil TEXT formatında
-- (örn. "br-mmcjsak2", "org-xyz"). Yeni şemada UUID tanımlıydı.
-- Bu migration id kolonlarını TEXT'e çeviriyor.
-- ============================================================

-- orgs.id → TEXT
ALTER TABLE orgs ALTER COLUMN id TYPE TEXT;
ALTER TABLE orgs ALTER COLUMN id DROP DEFAULT;

-- branches.id → TEXT
ALTER TABLE branches ALTER COLUMN id TYPE TEXT;
ALTER TABLE branches ALTER COLUMN id DROP DEFAULT;

-- sports/classes/coaches bunlara FK ile bağlı olabilir, kontrol et
-- (şemada FK yoksa sorun olmaz)
