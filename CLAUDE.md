# Dragos Futbol Akademisi — Sporcu Paneli

## Proje Genel Bakış

Vanilla JS SPA (Single Page Application) + Supabase + Vercel stack'i üzerine kurulu sporcu yönetim sistemi.

- **Canlı site:** https://www.dragosfutbolakademisi.com
- **Vercel:** https://sporcu-paneli.vercel.app
- **Supabase:** project ref, GitHub Secrets'ta (`SUPABASE_PROJECT_REF`)

## Mimari

### Frontend
Tek HTML dosyası + ayrı JS modülleri (bundle yok, CDN'den yüklenir):

```
index.html          — tek sayfa, tüm DOM şablonları
script.js           — ana SPA mantığı (~6000+ satır)
script-fixes.js     — makbuz/belge yardımcıları + PayTR override'ları
ui-improvements.js  — sayfalama, skeleton, oturum sayacı
Security.js         — sporcu/antrenör TC girişi
init.js             — Supabase başlatma
event-handlers.js   — global event listener'lar
pwa-register.js     — Service Worker kaydı
error-handler.js    — global hata yakalama
sw.js               — Service Worker (PWA), STATIC_CACHE = 'dragos-static-v16'
style.css           — tek CSS dosyası
paytr-ok.html       — PayTR başarı callback sayfası (iframe postMessage + top redirect)
paytr-fail.html     — PayTR hata callback sayfası (iframe postMessage + top redirect)
i18n/tr.json        — Türkçe çeviriler
i18n/en.json        — İngilizce çeviriler
```

> **ÖNEMLİ:** `script-fixes.js` içinde `window.initiatePayTRPayment` ve `window.showPayTRModal`
> override'ları bulunur. Bu fonksiyonlar `script.js`'teki orijinal versiyonların üzerine yazar.
> PayTR akışında sorun varsa hem `script.js` hem `script-fixes.js` kontrol edilmeli.

### Backend
- **Supabase** — DB (PostgreSQL) + Auth + RLS + Edge Functions
- **Edge Functions:** `paytr-token`, `paytr-webhook`, `provision-auth-user`
- **Vercel** — static hosting + vercel.json başlıkları (CSP dahil)

## Kimlik Doğrulama Akışı

Üç farklı giriş modu:

| Rol | Yöntem | Notlar |
|-----|--------|--------|
| **Yönetici** | Supabase Auth (`signInWithPassword`) | Email + şifre, `authenticated` role |
| **Antrenör** | TC + şifre → `login_with_tc` RPC | `anon` role, SECURITY DEFINER |
| **Sporcu/Veli** | TC + şifre → `login_with_tc` RPC | `anon` role, SECURITY DEFINER |

Oturum verisi `localStorage`'da saklanır (`sporcu_app_user`, `sporcu_app_sporcu`).

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

> **NOT — tax_rate/tax_amount:** Bu alanlar `fromPayment`'tan kaldırılmıştır (migration 023 DB'ye
> uygulanana kadar). Migration 023 tamamlandıktan sonra yeniden eklenebilir:
> `tax_rate: p.taxRate || 0, tax_amount: p.taxAmount || 0`

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
| 022_new_features | new_features | athletes.photo_url, tax_rate/tax_amount, activity_logs, push_subscriptions, password_resets |
| 023 | add_tax_columns | tax_rate/tax_amount idempotent ekleme (022_new_features çakışma fix'i) |

> **DİKKAT:** İki adet `022_` prefix'li migration var. `supabase db push` her ikisini de
> tam dosya adıyla takip eder, çakışma yok. Ancak yeni migration eklerken `024_` ile başla.

CI/CD: `supabase/migrations/**` değişince otomatik deploy (`supabase db push`).

## Edge Functions

`supabase/functions/`:
- `paytr-token/` — PayTR token üretir (v12). CORS whitelist: dragosfutbolakademisi.com + localhost
- `paytr-webhook/` — PayTR sunucu bildirimi alır, HMAC doğrular, payments günceller, plan kayıtlarını işler
- `provision-auth-user/` — Yeni admin/kullanıcı auth kaydı oluşturur

## CI/CD

`.github/workflows/`:
- `ci.yml` — HTML/CSS/JS lint, `node --check` söz dizimi kontrolü
- `deploy-functions.yml` — Edge function deploy (main push)
- `deploy-migrations.yml` — Migration deploy (supabase/migrations/** değişince, `supabase db push`)

## Bilinen Kısıtlamalar / Dikkat Edilecekler

1. **Büyük tek dosyalar:** `script.js` ~6000 satır. Değişiklik yaparken arama yaparak ilgili bölümü bul.
2. **script-fixes.js override'ları:** `window.initiatePayTRPayment` ve `window.showPayTRModal` `script-fixes.js`'te override edilir. Bu fonksiyonları değiştirirken her iki dosyayı da kontrol et.
3. **innerHTML kullanımı:** `pages[page]()` ve `modal()` innerHTML kullanıyor — XSS için `FormatUtils.escape()` zorunlu.
4. **PWA cache:** Değişiklikler SW cache'i atlayana kadar görünmeyebilir. `sw.js`'de `STATIC_CACHE = 'dragos-static-v16'`. Değişiklik yapınca versiyon numarasını artır.
5. **CSP:** `vercel.json`'da Content-Security-Policy var. Yeni CDN eklersen buraya da ekle.
6. **anon INSERT:** Sporcu panelinden yapılan tüm INSERT'ler `anon` role ile gider. `org_id` ve `branch_id` her zaman dolu olmalı (`fromPayment` bunu garantiler).
7. **payments.org_id tipi:** DB'de TEXT, `sessions.org_id` UUID. Farklı tiplere dikkat et.
8. **anon UPDATE yok:** `payments` tablosuna anon role UPDATE yapamaz (RLS). Sporcu tarafı DB güncellemelerini webhook üstlenir; frontend sadece AppState'i günceller.
9. **tax_rate/tax_amount:** Migration 023 DB kolonlarını ekler. `fromPayment`'ta şu an eksik — migration onaylandıktan sonra eklenecek.
10. **session_start:** Eski production DB'lerde `active_sessions` tablosuna işaret eden eski fonksiyon olabilir. Migration 022_fix_sessions_table bunu temizler.

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

Supabase bağlantısı için `init.js`'teki `SUPABASE_URL` ve `SUPABASE_ANON_KEY` değerleri production değerlerdir.
