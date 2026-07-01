# Dragos Futbol Akademisi — Sporcu Paneli

## Proje Genel Bakış

Vanilla JS SPA (Single Page Application) + Supabase + Vercel stack'i üzerine kurulu sporcu yönetim sistemi.

- **Canlı site:** https://www.dragosfutbolakademisi.com
- **Vercel:** https://sporcu-paneli.vercel.app
- **Supabase (aktif proje):** `xnggnjstbqblnmouzihe` — URL + anon key `script.js`'te `SUPABASE_CONFIG` içinde hardcoded (client tarafı için kaçınılmaz). CI/CD'deki `SUPABASE_PROJECT_REF` secret'ı ayrı bir şeydir, sadece deploy komutlarında (`supabase db push`/`functions deploy`) kullanılır — o da bu ref'i göstermelidir. Proje 2026-06'da eski bir Supabase projesinden taşındı; detay için "Supabase Proje Geçişi" bölümüne bakın.

## Mimari

### Frontend
Tek HTML dosyası + ayrı JS modülleri (bundle yok, CDN'den yüklenir):

```
index.html              — tek sayfa, tüm DOM şablonları
script.js                — ana SPA mantığı (~6000+ satır)
script-fixes.js          — makbuz/belge yardımcıları + PayTR override'ları
ui-improvements.js       — sayfalama, skeleton, oturum sayacı
Security.js              — sporcu/antrenör/admin giriş akışı (Auth-first + RPC fallback)
init.js                  — Supabase CDN yükleme + retry fallback
event-handlers.js        — global event listener'lar
pwa-register.js          — Service Worker kaydı
new-features.js          — aktivite logu, doğum günü widget'ı, push abonelik UI'ı, Excel export, admin listesi yönetimi
payment-improvements.js  — gelişmiş ödeme sihirbazı/akışı
ux-enhancements.js       — tablo sıralama, Ctrl/Cmd+K global arama, silme geri-alma (undo toast)
error-handler.js         — global hata yakalama
sw.js                    — Service Worker (PWA), STATIC_CACHE = 'dragos-static-v25'
style.css                — tek CSS dosyası
paytr-ok.html            — PayTR başarı callback sayfası (iframe postMessage + top redirect)
paytr-fail.html          — PayTR hata callback sayfası (iframe postMessage + top redirect)
i18n/tr.json             — Türkçe çeviriler
i18n/en.json             — İngilizce çeviriler
```

> **Yükleme sırası (index.html):** supabase-js CDN → error-handler.js → init.js → script.js →
> script-fixes.js → ui-improvements.js → Security.js → event-handlers.js → pwa-register.js →
> new-features.js → payment-improvements.js → ux-enhancements.js.
> Sıra önemli: sonradan yüklenen dosyalar öncekileri override edebilir (bkz. aşağıdaki not).

> **ÖNEMLİ:** `script-fixes.js` içinde `window.initiatePayTRPayment` ve `window.showPayTRModal`
> override'ları bulunur. Bu fonksiyonlar `script.js`'teki orijinal versiyonların üzerine yazar.
> PayTR akışında sorun varsa hem `script.js` hem `script-fixes.js` kontrol edilmeli.

> **NOT:** `sw.js`'e yeni dosya eklendiğinde (`new-features.js`, `payment-improvements.js`,
> `ux-enhancements.js` dahil) precache listesine ekli olduğundan emin ol ve `STATIC_CACHE`
> versiyon numarasını artır.

### Backend
- **Supabase** — DB (PostgreSQL) + Auth + RLS + Edge Functions
- **Edge Functions (6):** `paytr-token`, `paytr-webhook`, `provision-auth-user`, `reset-password`, `send-push`, `send-sms`
  - `config.toml`'da `verify_jwt = false` sadece ilk 5'inde tanımlı; `send-sms` config.toml'da yok.
  - `send-sms` durumu belirsiz: kodu `check_sms_rate_limit` RPC'sine bağımlı ama migration 009 bu RPC'yi ve `sms_rate_limits` tablosunu DROP ediyor. Fonksiyon hiçbir CI pipeline'ının deploy listesinde de yok (ne GitHub Actions ne GitLab CI). Muhtemelen yetim/kullanılmıyor — kaldırılmadan önce doğrulanmalı.
- **Vercel** — static hosting + vercel.json başlıkları (CSP dahil)

## Kimlik Doğrulama Akışı

**v6.1 (Security.js) itibariyle tüm roller önce Supabase Auth dener; `login_with_tc` RPC artık
sadece altyapı arızası durumunda devreye giren bir fallback'tir, birincil yöntem değildir.**

| Rol | Birincil Yöntem | Fallback | Notlar |
|-----|-----------------|----------|--------|
| **Yönetici** | Supabase Auth (`signInWithPassword`) | yok | Email + şifre, `authenticated` role |
| **Antrenör** | Supabase Auth (`signInWithPassword`) | `login_with_tc` RPC (koşullu) | `resolveAuthEmails()` ile email çözülür |
| **Sporcu/Veli** | Supabase Auth (`signInWithPassword`) | `login_with_tc` RPC (koşullu) | `resolveAuthEmails()` ile email çözülür |

### Antrenör/Sporcu giriş akışı (Security.js)
1. `resolveAuthEmails(sb, role, tc)` aday email listesi üretir:
   - `get_auth_email` RPC çağrılır (migration 007) — DB'deki gerçek email'i döner, tablo içeriği sızmaz.
   - RPC başarılıysa ve dönen email `tc@dragosfk.com` fallback'inden farklıysa, önce o denenir.
   - `tc + '@dragosfk.com'` her zaman listeye eklenir (RPC hata verse bile giriş çalışsın diye).
2. Aday email listesi sırayla `signInWithPassword` ile denenir; ilk başarılı olan kullanılır.
3. **Auth başarısız olursa `login_with_tc` RPC fallback'i SADECE şu hata mesajı kalıplarından biri
   eşleşirse tetiklenir** (aksi halde direkt "TC Kimlik No veya Şifre Hatalı" gösterilir):
   - `database error querying schema`
   - `unexpected_failure`
   - `email not confirmed`
   - `email_not_confirmed`
4. Yanlış şifre bu kalıplara girmez → RPC fallback'e düşmez, direkt hata gösterir + 30 saniyelik
   cooldown başlatır (`_startLoginCooldown`).

Oturum verisi `localStorage`'da saklanır (`sporcu_app_user`, `sporcu_app_sporcu`).

> **ÖNEMLİ:** Bu akışın çalışması için sporcu/antrenörlerin gerçek `auth.users` kayıtlarına sahip
> olması gerekir (migration 035 ile provision edildi). `login_with_tc` RPC hâlâ mevcut ve
> çalışıyor ama artık sadece Auth altyapısı arızalandığında devreye giren bir güvenlik ağıdır.

## Kritik AppState Alanları

```js
AppState.currentOrgId       // UUID (TEXT olarak payments'ta saklanır)
AppState.currentBranchId    // UUID (TEXT olarak payments'ta saklanır)
AppState.currentUser        // Admin/antrenör objesi (frozen)
AppState.currentSporcu      // Sporcu objesi
AppState.data.payments      // Bellekteki ödeme listesi (toPayment ile map'lenir)
AppState._paytrPlanIds      // script-fixes.js PayTR override'ının plan ID listesi
AppState._paytrCurrentOrderId // Aktif PayTR order UUID'si (tire dahil)
```

> **ÖNEMLİ:** `currentOrgId`/`currentBranchId` her zaman non-null olmalı.
> Sporcu panelinde `payments_insert_anon` RLS politikası `branch_id IS NOT NULL AND org_id IS NOT NULL` şartını zorunlu kılar.

## Veritabanı Yapısı

### Önemli Tablolar
- `payments` — org_id/branch_id TEXT tipinde (UUID değil), ödeme kaydı
- `athletes` — sporcu kayıtları, tc, org_id, branch_id
- `coaches` — antrenör kayıtları
- `settings` — kurum ayarları (PayTR dahil: `paytr_active`, `paytr_merchant_id`)
- `sessions` — aktif oturum takibi (SECURITY DEFINER fonksiyonlarla erişilir)
- `on_kayitlar` — kamuya açık ön kayıt formu
- `activity_logs` — kullanıcı işlem logu (migration 022_new_features)
- `push_subscriptions` — PWA push bildirimi abonelikleri (migration 022_new_features)
- `password_resets` — şifre sıfırlama tokenleri (migration 022_new_features)

### RLS Stratejisi
- `anon` → SELECT çoğu tabloya, INSERT sadece `payments` (kısıtlı) ve `on_kayitlar`
- `authenticated` → tam CRUD (admin/antrenör)
- `sessions` → 0 policy, sadece SECURITY DEFINER fonksiyonlarla erişilir
- `payments` UPDATE → sadece `authenticated` (anon/sporcu UPDATE yapamaz)

## DB Mapper'ları

`DB.mappers` objesi iki yönlü dönüşüm yapar:

```js
toPayment(r)     // DB satırı → AppState objesi
                 // orgId: r.org_id, branchId: r.branch_id
fromPayment(p)   // AppState objesi → DB satırı
                 // org_id: p.orgId || AppState.currentOrgId (orijinali koru)
                 // branch_id: p.branchId || AppState.currentBranchId
```

> **ÖNEMLİ:** `toPayment` `orgId`/`branchId` alanlarını saklar; `fromPayment` onları öncelikli kullanır.
> Bu sayede mevcut ödeme düzenlenirken org/branch bilgisi kaybolmaz.

> **NOT — tax_rate/tax_amount:** Bu alanlar `fromPayment`'a 2026-05'te geri eklendi.
> Migration 023 (`ADD COLUMN IF NOT EXISTS`) + migration 028 (3. seviye guard) ile DB kolonları garantili.
> Mapper artık: `tax_rate: Number(p.taxRate) || 0, tax_amount: Number(p.taxAmount) || 0`.

## PayTR Entegrasyonu

### Akış
1. Sporcu ödeme seçer → `initiatePayTRPayment(amt, desc)` çağrılır
   - `script-fixes.js`'teki override aktifse o çalışır (sonradan yüklenir)
2. `paytr-token` edge function → Supabase Secrets'tan credentials okur → PayTR API'ye POST atar → token döner
3. Frontend `pending` ödeme kaydı oluşturur (anon INSERT, `orgId`/`branchId` zorunlu)
4. PayTR iframe modal'da açılır (`showPayTRModal`)
5. Ödeme tamamlanınca:
   - **iframe mod:** `paytr-ok.html`/`paytr-fail.html` → `window.parent.postMessage` → `_paytrMsgHandler` → `handlePayTRCallback`
   - **3D Secure top redirect:** `paytr-ok.html`/`paytr-fail.html` → `/?paytr=ok&oid=...` yönlendirir → `checkPayTRReturn()` localStorage'a kaydeder → sporcu portalı açılınca `handlePayTRCallback` çağrılır
6. PayTR → `paytr-webhook` edge function → DB güncellenir (service_role ile)
7. `handlePayTRCallback` → AppState güncellenir (anon role UPDATE yapamadığından DB güncelleme yok)

### Zorunlu Supabase Secrets
```
PAYTR_MERCHANT_ID
PAYTR_MERCHANT_KEY
PAYTR_MERCHANT_SALT
PAYTR_NOTIFY_URL   (opsiyonel, SUPABASE_URL'den otomatik oluşturulur)
```

### Admin Ayarları (settings tablosu)
```
paytr_active      = true    (PayTR aktif mi)
paytr_merchant_id = "12345" (Merchant ID — edge function kullanmaz, sadece UI kontrolü)
```

> **NOT:** Edge function Merchant ID'yi Secrets'tan okur, `settings` tablosundan değil.
> `test_mode: '0'` (canlı mod). Test etmek için `initiatePayTRPayment`'ta `'1'` yapılabilir.

### merchant_ok_url / merchant_fail_url
`/paytr-ok.html?oid=${orderId}` ve `/paytr-fail.html?oid=${orderId}` olarak ayarlanmıştır.
Bu sayfalar iframe içindeyken postMessage, üst penceredeyken (3D Secure) `/?paytr=ok` yönlendirmesi yapar.

### merchant_oid formatı
PayTR sadece alfanumerik `merchant_oid` kabul eder. UUID'den tireler kaldırılır:
```js
const orderId = dbId.replace(/-/g, ''); // 32 hex karakter
```
Webhook'ta `toUuid()` fonksiyonu geri dönüştürür.

## Migrations

`supabase/migrations/` dizininde sıralı SQL dosyaları:

| # | Dosya | İçerik |
|---|-------|--------|
| 001 | rls_policies | Temel RLS ve login_with_tc |
| ... | ... | ... |
| 017 | payments_anon_insert_guard | Anon INSERT: branch_id+org_id zorunlu |
| 018 | admin_role_enforcement | is_admin() fonksiyonu |
| 019 | generic_login_errors | Güvenli hata mesajları |
| 020 | sessions_tracking | sessions tablosu + SECURITY DEFINER fonksiyonlar |
| 021 | inventory_tables | Envanter tabloları |
| 022_fix_sessions_table | fix_sessions_table | active_sessions temizliği, session_start düzeltmesi |
| 023 | add_tax_columns | tax_rate/tax_amount idempotent ekleme |
| 024 | payments_missing_columns | pay_method, notif_status, slip_code, service_name, source, inv, dd kolonları |
| 025 | missing_tables_and_columns | athletes/coaches/attendance/users org+branch, cash_transfers, wa_messages |
| 026 | overdue_pg_function | mark_overdue_payments() RPC + trg_auto_mark_overdue trigger |
| 027 | receipt_counter_atomic | get_next_receipt_no() atomik makbuz numarası RPC (race condition fix) |
| 028 | idempotency_guards | 022_new_features (bugünkü 029) policy'leri DROP+CREATE deseniyle idempotent; tax_rate/tax_amount/photo_url/receipt_counter 3. seviye guard; payments/password_resets index'leri |
| 029 | new_features | **(eski 022_new_features.sql'in yeniden adlandırılmış hali)** athletes.photo_url, tax_rate/tax_amount, activity_logs, push_subscriptions, password_resets |
| 030 | fix_attendance_columns | attendance kolonlarını kod ile hizalar: aid→athlete_id, dt→att_date, st→status (idempotent) |
| 031 | missing_columns_from_old_db | Eski DB'de olup yeni şemada eksik kolonlar: approved_at, address, created_at, account_type, def_due, def_vat |
| 032 | more_missing_columns | Ek eksik kolonlar: coaches.nt, classes.schedule, athletes.blood_type, payments.approved_at, settings.def_vat; sports.icon NOT NULL kaldırıldı |
| 033 | text_ids_for_orgs_branches | orgs.id ve branches.id UUID → TEXT (eski DB'nin "org-xyz" formatlı ID'lerini desteklemek için) |
| 034 | full_schema_sync | id tipi düzeltmeleri + eksik kolonların konsolidasyonu, schema cache reload |
| 035 | provision_auth_users | Sporcu/antrenör/admin için `auth.users` + `auth.identities` kayıtları oluşturur (bkz. "Migration 035 — Auth Kullanıcı Provisioning") |

Toplam 36 migration dosyası (000-035).

> **NOT:** Eskiden iki adet `022_` prefix'li migration vardı (`022_fix_sessions_table` ve
> `022_new_features`); bu çakışma, `022_new_features.sql` migration 029 olarak yeniden
> adlandırılarak çözüldü. Yeni migration eklerken **`036_`** ile başla.

> **NOT (Migration 028 — Idempotency):** PostgreSQL `CREATE POLICY IF NOT EXISTS` desteklemediğinden
> 022_new_features yeniden çalıştırılırsa hata fırlatıyordu. 028 `DROP POLICY IF EXISTS` + `CREATE POLICY`
> deseni ile `activity_logs` ve `push_subscriptions` policy'lerini güvenli yeniden oluşturur.
> Tüm migration zinciri artık idempotenttir — `supabase db push` retry'ları sorunsuz çalışır.

### Migration 035 — Auth Kullanıcı Provisioning

`035_provision_auth_users.sql`, mevcut sporcular, antrenörler ve adminler için gerçek
`auth.users` (+ `auth.identities`) kayıtları oluşturur. Supabase projesi yeni bir projeye
taşındığında (bkz. "Supabase Proje Geçişi") `auth.users` tablosu BOŞ başlıyordu — bu migration
çalışmadan hiç kimse giriş yapamıyordu.

**Şifre taşıma mantığı (sporcu/antrenör — `sp_pass`/`coach_pass`):**
| Mevcut format | Sonuç |
|---|---|
| bcrypt (`$2a/b/x/y$` ile başlar) | direkt kopyalanır |
| SHA-256 hex (64 karakter) | geri çevrilemez → TC'nin son 6 hanesi varsayılan şifre olur |
| plaintext | `crypt()` ile bcrypt'e çevrilir |
| NULL/boş | TC'nin son 6 hanesi varsayılan şifre olur |

**Admin şifre mantığı benzer, tek fark:** SHA-256/boş durumunda geçici şifre `Dragos2025!` olur
(hemen değiştirilmeli).

> **KRİTİK — Admin UUID kısıtı:** `is_admin()` fonksiyonu (migration 018)
> `SELECT id FROM users WHERE id = auth.uid() AND role = 'admin'` sorgusu yapar — yani
> `public.users.id` MUTLAKA `auth.uid()` ile eşleşmelidir. Migration 035 bunu şöyle garantiler:
> aynı email için `auth.users` kaydı zaten varsa o UUID'yi kullanıp `public.users.id`'yi ona göre
> günceller; yoksa yeni bir UUID ile `auth.users` kaydı oluşturup `public.users.id`'yi bu yeni
> UUID ile UPDATE eder. Eski projeden taşınan adminlerin eski UUID'si yeni projede geçersiz
> olduğundan bu adım zorunludur.

> **NOT — İdempotency:** Sporcu/antrenör için email `auth.users`'da zaten varsa atlanır. Admin
> için email varsa sadece UUID senkronize edilir (tekrar INSERT yapılmaz). `auth.identities`
> tablosunda `provider_id` kolonunun var olup olmadığı `information_schema` sorgusuyla dinamik
> tespit edilir ve INSERT ifadesi `EXECUTE` ile buna göre kurulur (Supabase şema versiyonları
> arası fark).

CI/CD: `supabase/migrations/**` değişince otomatik deploy (`supabase db push`) — **ama bkz.
aşağıdaki "CI/CD" bölümündeki kritik uyarı: bu otomasyon şu an sadece GitLab'da işliyor.**

## Supabase Proje Geçişi

Proje 2026-06'da eski bir Supabase projesinden yeni bir projeye taşındı.

| | Eski Proje | Yeni Proje (aktif) |
|---|---|---|
| Project ref | `wfarbydojxtufnkjuhtc` | `xnggnjstbqblnmouzihe` |

Yeni ref `script.js`'teki `SUPABASE_CONFIG.url`/`SUPABASE_CONFIG.anonKey` içinde hardcoded.
CI/CD'deki `SUPABASE_PROJECT_REF` secret'ı da bu yeni ref'i göstermelidir.

### Tek seferlik taşıma araçları (repo kökünde, uygulamanın parçası DEĞİL)
- **`tasima.html`** — Eski projeden yeni projeye veri taşıyan standalone sayfa. `orgs, branches,
  sports, coaches, classes, athletes, payments, attendance, messages, on_kayitlar,
  deletion_requests, settings, users` tablolarını okuyup yeni projeye adaptif olarak upsert eder
  (hatalı/eksik kolonları hata mesajından tespit edip atlayarak). Eski/yeni proje URL+anon key'i
  içinde hardcoded (`OLD`/`NEW` objeleri).
- **`provision-auth.html`** — Migration 035'ten ÖNCE çalıştırılan standalone araç. Eski projeden
  `public.users` (admin) satırlarını yeni projeye kopyalar (email ile dedup), admin UUID'lerini
  yeni projenin `auth.uid()`'ine senkronize eder.

> **ÖNEMLİ:** Her iki HTML dosyası da `index.html`'in `<script>` etiketlerinde YOK — çalışan
> uygulamanın bir parçası değiller, doğrudan tarayıcıda açılan tek-kullanımlık ops araçlarıdır.
> Taşıma tamamen doğrulandıktan sonra silinmeleri düşünülebilir, ama repoda hâlâ referans/tekrar
> kullanım için duruyorlar (ör. başka bir org için taşıma tekrarlanırsa).

## Edge Functions

`supabase/functions/`:
- `paytr-token/` — PayTR token üretir (v12). CORS whitelist: dragosfutbolakademisi.com + localhost
- `paytr-webhook/` — PayTR sunucu bildirimi alır, HMAC doğrular, payments günceller, plan kayıtlarını işler. **Idempotency:** kayıt silinmişse (`!paytrRec`) erken `OK` döner. **Güvenli silme:** plan güncellemesi başarısız olursa yardımcı kayıt korunur (PayTR sonraki webhook denemesinde kalan planları işler). **Fire-and-forget push:** bkz. "Bilinen Kısıtlamalar" #13.
- `provision-auth-user/` — Yeni admin/kullanıcı auth kaydı oluşturur
- `reset-password/` — Şifre sıfırlama akışı
- `send-push/` — VAPID ile web push bildirimi gönderir; `paytr-webhook` tarafından arka planda çağrılır
- `send-sms/` — NetGSM SMS gönderimi (durumu belirsiz, bkz. yukarıdaki Backend notu)

## CI/CD

> **KRİTİK — Production GitLab'dan deploy oluyor, GitHub'dan DEĞİL:**
> Vercel production deployment'ı **GitLab** reposuna bağlı. GitHub reposu ayrı/legacy bir
> remote'tur — bu coding asistanının harness'ı sadece GitHub'a erişebildiği için varsayılan
> olarak oraya push yapılır, ama GitHub'a yapılan push'lar production'a YANSIMAZ.
> Ayrıca GitHub Actions'ın `deploy-functions` job'ı aylardır `SUPABASE_ACCESS_TOKEN` secret'ı
> eskimiş/geçersiz olduğundan `401 Unauthorized` ile başarısız oluyor — yani sessizce işlevsiz.
> **Sonuç: Edge Function veya migration değişikliği GitLab'a bağlı CI ile ya da Supabase
> Dashboard/CLI ile manuel deploy edilmeli. Sadece GitHub'a push yapmak production'a HİÇBİR ŞEY
> deploy etmez.** Bu boşluk daha önce gerçek bir olayda (PayTR webhook fire-and-forget fix'i)
> değişikliğin bir süre deploy edilmeden GitHub'da beklemesine yol açtı.

### `.github/workflows/` (GitHub Actions — production'a etkisi YOK, bkz. yukarıdaki uyarı)
- `ci.yml` — HTML/CSS/JS lint, `node --check` söz dizimi kontrolü
- `deploy-functions.yml` — Edge function deploy (main push) — **şu an 401 ile başarısız**
- `deploy-migrations.yml` — Migration deploy (supabase/migrations/** değişince, `supabase db push`)
- `setup-vapid-secrets.yml` — VAPID secrets tek seferlik/manuel kurulum

### `.gitlab-ci.yml` (GitLab CI — production'ı besleyen gerçek pipeline)
Stages: `lint` → `deploy-migrations` → `deploy-functions` → `setup-secrets`.
- `lint-and-validate` — zorunlu dosya kontrolü, HTML yapı kontrolü, JSON doğrulama, JS söz
  dizimi kontrolü, CSP header kontrolü
- `deploy-migrations` — `main` branch + `supabase/migrations/**` değişince, `supabase db push`
- `deploy-functions` — `main` branch'e her push'ta: `paytr-token`, `paytr-webhook`,
  `provision-auth-user`, `send-push` deploy eder (**`reset-password` ve `send-sms` bu listede
  YOK — deploy edilmiyorlar**)
- `setup-vapid-secrets` / `set-supabase-secrets` — manuel tetiklemeli tek seferlik secret kurulum
  job'ları

Supabase CLI kurulumu GitHub Actions'ta `supabase/setup-cli@v1` action'ı ile, GitLab CI'de
`npm install -g supabase` ile yapılır.

## Bilinen Kısıtlamalar / Dikkat Edilecekler

1. **Büyük tek dosyalar:** `script.js` ~6000 satır. Değişiklik yaparken arama yaparak ilgili bölümü bul.
2. **script-fixes.js override'ları:** `window.initiatePayTRPayment` ve `window.showPayTRModal` `script-fixes.js`'te override edilir. Bu fonksiyonları değiştirirken her iki dosyayı da kontrol et.
3. **innerHTML kullanımı:** `pages[page]()` ve `modal()` innerHTML kullanıyor — XSS için `FormatUtils.escape()` zorunlu.
4. **PWA cache:** Değişiklikler SW cache'i atlayana kadar görünmeyebilir. `sw.js`'de `STATIC_CACHE = 'dragos-static-v25'`. Değişiklik yapınca versiyon numarasını artır.
5. **CSP:** `vercel.json`'da Content-Security-Policy var. Yeni CDN eklersen buraya da ekle.
6. **anon INSERT:** Sporcu panelinden yapılan tüm INSERT'ler `anon` role ile gider. `org_id` ve `branch_id` her zaman dolu olmalı (`fromPayment` bunu garantiler).
7. **payments.org_id tipi:** DB'de TEXT, `sessions.org_id` UUID. Farklı tiplere dikkat et.
8. **anon UPDATE yok:** `payments` tablosuna anon role UPDATE yapamaz (RLS). Sporcu tarafı DB güncellemelerini webhook üstlenir; frontend sadece AppState'i günceller.
9. **tax_rate/tax_amount:** Migration 023 + 028 DB kolonlarını idempotent ekler. `fromPayment` artık `tax_rate`/`tax_amount` yazıyor (2026-05'te geri eklendi).
10. **session_start:** Eski production DB'lerde `active_sessions` tablosuna işaret eden eski fonksiyon olabilir. Migration 022_fix_sessions_table bunu temizler.
11. **Maskable icon:** `manifest.json`'da maskable purpose ayrı PNG entry'sinde (`icon-512.png purpose: maskable`). SVG maskable Android'de safe-zone hesaplamadığı için güvensiz — bu yüzden ayrıldı.
12. **index.html no-cache:** `vercel.json` artık `/` ve `/index.html` için `no-cache, no-store, must-revalidate` döner. JS/CSS dosyaları 7 gün cache'lenir (immutable benzeri davranış). PWA güncellemeleri SW dışında index.html sürümlemesiyle de yakalanır.
13. **Webhook fire-and-forget kuralı:** PayTR webhook (`paytr-webhook/index.ts`) daha önce
    push bildirimini (`send-push`) `await` ederek PayTR'a "OK" dönmeden bekliyordu. Supabase
    proje geçişinde VAPID anahtarları değişince eski/geçersiz push abonelikleri `send-push`'u
    yavaşlattı, bu da webhook yanıtının PayTR'ın bildirim timeout'unu aşmasına ve ödemelerin
    "provizyonda" takılı kalmasına yol açtı (PayTR "OK" almazsa 720 defaya kadar retry eder).
    **Kural: PayTR webhook (ve benzer hızlı-ack gerektiren webhook'lar) yavaş/kritik-olmayan
    yan etkileri (push bildirimi gibi) ASLA `await` ETMEMELİ** — `fetch().then().catch()`
    ile fire-and-forget yapıp mevcutsa `EdgeRuntime.waitUntil()`'a devretmeli, yanıt DB
    güncellemesinden hemen sonra dönmeli.

## Sık Kullanılan Fonksiyonlar

```js
go(page, params)             // SPA sayfa geçişi (admin paneli)
spTab(tab)                   // Sporcu portal sekme geçişi
modal(title, body, buttons)  // Modal aç
closeModal()                 // Modal kapat
toast(msg, type)             // Bildirim ('g'=yeşil, 'e'=kırmızı, 'y'=sarı)
confirm2(title, msg, fn)     // Onay modalı
DB.upsert(table, data)       // Supabase upsert (onConflict: 'id')
DB.query(table, filters)     // Supabase select
generateId()                 // crypto.randomUUID() (HTTPS zorunlu)
FormatUtils.escape(str)      // XSS koruması için HTML escape
DateUtils.today()            // YYYY-MM-DD formatında bugün
FormatUtils.currency(amt)    // ₺ formatında para birimi
refreshSporcuPayments()      // Sporcu ödeme listesini DB'den tazele
handlePayTRCallback(oid, st) // PayTR sonucu işle ('success'|'fail')
```

## Güvenlik Audit Notları (2026-04)

> **NOT — Kanonik kaynaklar:** Bu bölüm bir özettir. Detaylı/güncel güvenlik audit takibi için
> `SECURITY_AUDIT_REPORT.md`'ye bakın (kategori bazlı Kritik/Yüksek/Orta/Düşük tablosu +
> KAPATILANLAR log'u ile bu bölümden daha ayrıntılı ve daha sık güncellenir — iki dosya
> zamanla çelişmesin diye orası kanonik kabul edilmeli). Henüz uygulanmamış özellik fikirleri
> için `FEATURES.prompt.md`'ye bakın — gelecekteki bir Claude Code oturumuna doğrudan
> verilebilecek, sprint bazlı, self-contained bir prompt kütüphanesidir.

Kapsamlı taramada tespit edilen ve düzeltilen sorunlar:

### Düzeltildi ✅
| Sorun | Dosya | Commit |
|-------|-------|--------|
| `frame-src https:` — herhangi HTTPS site iframe yüklenebiliyordu | vercel.json | df1d66a |
| `_sessionRestoring` lokal var — Security.js'deki mutex kontrolü çalışmıyordu | script.js | df1d66a |
| `Permissions-Policy` fullscreen eksikti (PayTR iframe için gerekli) | vercel.json | df1d66a |
| `onclick` inline handler — event-handlers.js'e taşındı | index.html | — |
| `spTab` paralel refresh — hızlı tab tıklamada çift DB isteği gidiyordu | script-fixes.js | — |
| i18n dosyaları SW cache listesinde eksikti | sw.js | — |

### Açık / Düşük Öncelikli
- **`unsafe-inline` CSP:** index.html'de artık inline script yok; `paytr-ok.html`/`paytr-fail.html` kendi CSP'sine sahip. Ana site CSP'sinden `unsafe-inline` kaldırılabilir ancak eski tarayıcı uyumluluğu test edilmeli.
- **Supabase CDN SRI:** `cdn.jsdelivr.net`'ten yüklenen Supabase JS'e `integrity` hash eklenebilir.
- **`window._sessionRestoring`:** `restoreSession()` mutex'i — script.js'te `window` üzerinde tutulur, Security.js ile senkronize.

## SEO / Erişilebilirlik / PWA Güncellemeleri (2026-05)

| Konu | Dosya | Değişiklik |
|------|-------|-----------|
| Canonical domain | `index.html`, `sitemap.xml`, `robots.txt` | `https://www.dragosfutbolakademisi.com` — vercel.app subdomain'i yerine canlı domain |
| OG / Twitter | `index.html` | `summary_large_image`, `og:site_name`, `og:image:width/height/alt`, `og:locale:alternate`, mutlak resim URL'i |
| JSON-LD | `index.html` | `logo` + `sameAs` (Instagram) eklendi, URL düzeltildi |
| Sosyal butonlar | `index.html` | `aria-label` ve `rel="noopener noreferrer"` |
| Reduced motion | `style.css` | `@media (prefers-reduced-motion: reduce)` tüm animasyon/transition'ı durdurur (WCAG 2.3.3) |
| Maskable icon | `manifest.json` | PNG ayrı `purpose: maskable` entry'si |
| Cache strategy | `vercel.json` | `/` ve `/index.html` no-cache, JS/CSS 7 gün |

> **Robots.txt:** `Disallow: /` bilinçli (admin paneli indexlenmesin). Sitemap URL'i sadece canlı domaine düzeltildi — Disallow korundu.

## Geliştirme Ortamı

```bash
# Lokal çalıştırma (herhangi bir static server)
npx serve .
# veya
python3 -m http.server 5173

# Söz dizimi kontrolü
node --check script.js
node --check script-fixes.js
node --check ui-improvements.js
node --check Security.js
```

Supabase bağlantısı için `script.js`'teki `SUPABASE_CONFIG.url`/`SUPABASE_CONFIG.anonKey` değerleri production değerlerdir (`init.js` artık sadece CDN yükleme/fallback yapar, config barındırmaz).
