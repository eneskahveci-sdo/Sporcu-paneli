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
script.js           — ana SPA mantığı (~6000 satır)
script-fixes.js     — makbuz/belge yardımcıları
ui-improvements.js  — sayfalama, skeleton, oturum sayacı
Security.js         — sporcu/antrenör TC girişi
init.js             — Supabase başlatma
event-handlers.js   — global event listener'lar
pwa-register.js     — Service Worker kaydı
error-handler.js    — global hata yakalama
sw.js               — Service Worker (PWA)
style.css           — tek CSS dosyası
i18n/tr.json        — Türkçe çeviriler
i18n/en.json        — İngilizce çeviriler
```

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
AppState.currentUser        // Admin/antrenör objesifrozen
AppState.currentSporcu      // Sporcu objesi
AppState.data.payments      // Bellekteki ödeme listesi (toPayment ile map'lenir)
```

> **ÖNEMLİ:** `currentOrgId`/`currentBranchId` her zaman non-null olmalı.
> Sporcu panelinde `payments_insert_anon` RLS politikası `branch_id IS NOT NULL AND org_id IS NOT NULL` şartını zorunlu kılar.

## Veritabanı Yapısı

### Önemli Tablolar
- `payments` — org_id/branch_id TEXT tipinde (UUID değil), ödeme kaydı
- `athletes` — sporcu kayıtları, tc, org_id, branch_id
- `coaches` — antrenör kayıtları
- `settings` — kurum ayarları (PayTR dahil)
- `sessions` — aktif oturum takibi (SECURITY DEFINER fonksiyonlarla erişilir)
- `on_kayitlar` — kamuya açık ön kayıt formu

### RLS Stratejisi
- `anon` → SELECT çoğu tabloya, INSERT sadece `payments` (kısıtlı) ve `on_kayitlar`
- `authenticated` → tam CRUD (admin/antrenör)
- `sessions` → 0 policy, sadece SECURITY DEFINER fonksiyonlarla erişilir

## DB Mapper'ları

`DB.mappers` objesi iki yönlü dönüşüm yapar:

```js
toPayment(r)     // DB satırı → AppState objesi (orgId/branchId dahil)
fromPayment(p)   // AppState objesi → DB satırı
                 // org_id: p.orgId || AppState.currentOrgId (her zaman orijinali koru)
```

> **ÖNEMLİ:** `toPayment` `orgId` ve `branchId` alanlarını saklar, `fromPayment` onları öncelikli kullanır.
> Bu sayede mevcut ödeme düzenlenirken org/branch bilgisi kaybolmaz.

## PayTR Entegrasyonu

### Akış
1. Sporcu ödeme seçer → `initiatePayTRPayment(amt, desc)` çağrılır
2. `paytr-token` edge function → Supabase Secrets'tan credentials okur → PayTR API'ye POST atar → token döner
3. Frontend `pending` ödeme kaydı oluşturur (anon INSERT)
4. PayTR iframe modal'da açılır
5. Ödeme tamamlanınca PayTR → `paytr-webhook` edge function'ı çağırır → DB güncellenir

### Zorunlu Supabase Secrets
```
PAYTR_MERCHANT_ID
PAYTR_MERCHANT_KEY
PAYTR_MERCHANT_SALT
PAYTR_NOTIFY_URL   (opsiyonel, SUPABASE_URL'den otomatik oluşturulur)
```

> **NOT:** Admin paneli Merchant ID'yi `settings` tablosuna kaydeder. Edge function bu değeri kullanmaz;
> kendi Secrets'ını okur. İki sistem bağımsızdır.

### test_mode
`initiatePayTRPayment` içinde `test_mode: '1'` olarak ayarlıdır.
Canlı ortama geçişte `'0'` yapılmalı.

### merchant_ok_url / merchant_fail_url
URL'lere `?paytr=ok&oid=${orderId}` ve `?paytr=fail&oid=${orderId}` eklenir.
Sayfa yüklenince `checkPayTRReturn()` bu parametreleri okur.

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
| 022 | fix_sessions_table | active_sessions temizliği, session_start düzeltmesi |

CI/CD: `supabase/migrations/**` değişince otomatik deploy.

## Edge Functions

`supabase/functions/`:
- `paytr-token/` — PayTR token üretir (v12). CORS whitelist: dragosfutbolakademisi.com + localhost
- `paytr-webhook/` — PayTR sunucu bildirimi alır, HMAC doğrular, payments günceller
- `provision-auth-user/` — Yeni admin/kullanıcı auth kaydı oluşturur

## CI/CD

`.github/workflows/`:
- `ci.yml` — HTML/CSS/JS lint, `node --check` söz dizimi kontrolü
- `deploy-functions.yml` — Edge function deploy (main push)
- `deploy-migrations.yml` — Migration deploy (supabase/migrations/** değişince)

## Bilinen Kısıtlamalar / Dikkat Edilecekler

1. **Büyük tek dosyalar:** `script.js` ~6000 satır. Değişiklik yaparken arama yaparak ilgili bölümü bul.
2. **innerHTML kullanımı:** `pages[page]()` ve `modal()` innerHTML kullanıyor — XSS için `FormatUtils.escape()` zorunlu.
3. **PWA cache:** Değişiklikler SW cache'i atlayana kadar görünmeyebilir. `sw.js` CACHE_VERSION'ı güncelle.
4. **CSP:** `vercel.json`'da Content-Security-Policy var. Yeni CDN eklersen buraya da ekle.
5. **anon INSERT:** Sporcu panelinden yapılan tüm INSERT'ler `anon` role ile gider. `org_id` ve `branch_id` her zaman dolu olmalı.
6. **payments.org_id tipi:** DB'de TEXT, `sessions.org_id` UUID. Farklı tiplere dikkat et.

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
