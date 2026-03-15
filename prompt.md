# DRAGOS FUTBOL AKADEMİSİ — GELİŞTİRME PROMPT'U

## ⚠️ KRİTİK KURALLAR

> Bu prompt ile yapılacak tüm değişikliklerde aşağıdaki kurallara **kesinlikle** uyulmalıdır:
>
> 1. **Mevcut çalışan hiçbir fonksiyon bozulmamalıdır.** Giriş sistemi (admin, sporcu, antrenör), yoklama, ödeme, finans raporu, WhatsApp/SMS, ön kayıt, QR, Excel import/export, makbuz oluşturma gibi tüm mevcut özellikler aynen çalışmaya devam etmelidir.
> 2. **Arayüz karmaşık hale gelmemelidir.** Mevcut temiz ve sade yapı korunmalı, yeni özellikler mevcut tasarım diline uygun eklenmelidir.
> 3. **Hatasız olmalıdır.** Her değişiklik test edilebilir, console hatası üretmemeli ve mobil uyumlu olmalıdır.
> 4. **Geriye dönük uyumluluk** sağlanmalıdır. Supabase veritabanı şeması, RLS politikaları ve mevcut veri yapıları korunmalıdır.
> 5. **Supabase + Vercel deploy yapısı** korunmalıdır.

---

## PROJE YAPISI (MEVCUT)

```
Sporcu-paneli-main/
├── index.html          — Ana HTML (tek sayfa PWA)
├── script.js           — Ana uygulama mantığı (~5500 satır)
├── script-fixes.js     — Ek özellikler ve düzeltmeler (V9)
├── ui-improvements.js  — UI/UX iyileştirme paketi
├── Security.js         — Güvenlik modülü (login_with_tc RPC)
├── init.js             — Supabase CDN yükleme ve fallback
├── pwa-register.js     — PWA Service Worker kaydı
├── sw.js               — Service Worker (cache stratejisi)
├── style.css           — Tüm stiller (minify edilmemiş)
├── manifest.json       — PWA manifest
├── vercel.json         — Vercel deploy + güvenlik header'ları
├── RLS_POLICIES.sql    — Supabase RLS politikaları ve login_with_tc fonksiyonu
├── icons/              — PWA ikonları
└── supabase/           — Supabase config ve edge function'lar
```

## TEKNOLOJİ STACK'İ

- **Frontend:** Vanilla HTML/CSS/JS (tek sayfa PWA)
- **Backend:** Supabase (PostgreSQL + Auth + RLS + Edge Functions)
- **Deploy:** Vercel (statik hosting)
- **Kütüphaneler:** Supabase JS SDK, SheetJS (xlsx), jsPDF

---

## YAPILACAK İYİLEŞTİRMELER

---

### A1. Modern Tipografi (Google Fonts)

**Amaç:** Varsayılan sistem fontu yerine profesyonel bir font kullanımı.

**Yapılacaklar:**
- `index.html`'e Google Fonts linki ekle (Inter veya Outfit fontu)
- `style.css`'deki `font-family` tanımını güncelle
- Tüm `font-weight` değerlerini yeni fonta uygun ayarla
- Performans için `font-display: swap` kullan
- `preconnect` ile `fonts.googleapis.com` ve `fonts.gstatic.com` ekle

**Dikkat:**
- Mevcut layout'u bozmamalı
- Mobilde font boyutları aynen kalmalı
- `vercel.json` CSP'ye `fonts.googleapis.com` ve `fonts.gstatic.com` eklenmelidir

---

### A2. Dark/Light Tema Geçişi Animasyonu

**Amaç:** Tema değişiminde sorunsuz ve görsel olarak hoş bir geçiş animasyonu.

**Yapılacaklar:**
- `style.css`'deki CSS değişkenlerine `transition` ekle (renk değişimleri için)
- `applyTheme()` fonksiyonunda geçiş sırasında kısa bir `class` toggle animasyonu
- Geçiş sırasında bir "ripple" veya "fade" efekti (isteğe bağlı, performansı düşürmemeli)
- Tema tercihini `prefers-color-scheme` media query ile otomatik algılama

**Dikkat:**
- Mevcut `applyTheme()` ve `toggleTheme()` fonksiyonları korunmalı
- `StorageManager` ile tema kaydetme aynen çalışmalı

---

### A4. Logo Tasarımı

**Amaç:** SVG base64 placeholder yerine gerçek logo dosyası kullanımı.

**Yapılacaklar:**
- `/icons/` klasörüne profesyonel bir futbol akademisi logosu ekle (SVG + PNG formatlarında)
- `manifest.json`'daki ikon referanslarını güncelle
- `DEFAULT_LOGO` sabitini yeni logo dosya yolu ile güncelle
- `applyLogoEverywhere()` fonksiyonunun yeni logo ile uyumlu çalıştığını doğrula
- Giriş ekranında logonun responsive ve güzel görünmesini sağla

**Dikkat:**
- Supabase settings'ten yüklenen özel logo özelliği bozulmamalı
- `applyLogoEverywhere()` fonksiyonu aynen çalışmalı

---

### B7. Supabase Anon Key'in Ortam Değişkenine Taşınması

**Amaç:** Hardcoded anon key yerine Vercel environment variable kullanımı.

**Yapılacaklar:**
- Vercel Dashboard'da `SUPABASE_URL` ve `SUPABASE_ANON_KEY` environment variable'ları tanımla
- `script.js`'deki `SUPABASE_CONFIG` sabitini ortam değişkeninden oku
- Build sırasında veya runtime'da environment variable'ları inject etmek için bir mekanizma oluştur
- Vercel serverless function veya build-time injection ile config dosyası oluştur (örn: `/api/config.js` endpoint'i)

**Dikkat:**
- Anon key public-safe olduğu için kritik bir güvenlik açığı değil, ama best practice olarak environment variable kullanılmalı
- `getSupabase()` fonksiyonu aynen çalışmalı
- Offline modda fallback olmalı

---

### B8. Rate Limiting Sunucu Tarafında

**Amaç:** Client-side rate limiting yerine sunucu tarafında rate limiting.

**Yapılacaklar:**
- Supabase Edge Function oluştur: `supabase/functions/rate-limit/`
- `login_with_tc` RPC fonksiyonuna rate limiting mantığı ekle (veya ayrı bir PostgreSQL fonksiyonu)
- Supabase'de `login_attempts` tablosu oluştur (ip, tc_hash, attempt_count, locked_until, created_at)
- Başarısız girişleri kaydet, 5 başarısız denemeden sonra 5 dakika kilitle
- Security.js'deki client-side rate limiting'i yedek olarak koru

**Dikkat:**
- `login_with_tc` RPC fonksiyonu mevcut çalışma mantığını korumalı
- `_checkRateLimit()` ve `_recordFailedAttempt()` fonksiyonları client tarafında yedek olarak kalmalı

---

### B9. CSP Politikasını Sıkılaştırma

**Amaç:** `unsafe-inline` kaldırarak nonce tabanlı CSP uygulamak.

**Yapılacaklar:**
- `vercel.json`'daki CSP header'ını güncelle
- İnline script'leri harici dosyalara taşı (zaten büyük ölçüde yapılmış)
- İnline style'ları CSS dosyasına taşı
- `index.html`'deki inline `onclick` handler'ları mümkün olduğunca `addEventListener` ile değiştir
- Kalan zorunlu inline script/style için nonce mekanizması düşün

**Dikkat:**
- Mevcut tüm fonksiyonellik korunmalı
- CDN kaynaklarının (jsdelivr, cdnjs, unpkg, esm.sh) CSP'de izinli olduğunu doğrula

---

### C12. Kod Bölümleme (Code Splitting)

**Amaç:** 246KB'lık tek `script.js` dosyasını modüler yapıya geçirmek.

**Yapılacaklar:**
- `script.js`'yi mantıksal modüllere böl:
  - `core.js` — AppState, DB, FormatUtils, DateUtils, UIUtils, toast, modal
  - `auth.js` — Login, logout, session yönetimi
  - `pages/dashboard.js` — Dashboard sayfası
  - `pages/athletes.js` — Sporcular sayfası ve profil
  - `pages/payments.js` — Ödemeler sayfası
  - `pages/attendance.js` — Yoklama sayfası
  - `pages/coaches.js` — Antrenörler sayfası
  - `pages/settings.js` — Ayarlar sayfası
  - `pages/accounting.js` — Finans raporu
  - `pages/sms.js` — SMS/WhatsApp
  - `sporcu-portal.js` — Sporcu/veli portalı
- Her modül `window` üzerinden gerekli fonksiyonları dışa aç
- `index.html`'de script'leri sırasıyla yükle veya dynamic import kullan
- Lazy loading: Sayfa değiştiğinde ilgili modülü yükle

**Dikkat:**
- Tüm global fonksiyon referansları korunmalı (`window.go`, `window.editAth`, vb.)
- `script-fixes.js`, `ui-improvements.js`, `Security.js` ile uyumluluk korunmalı
- Service Worker cache listesi güncellenmeli

---

### C13. CSS Minification

**Amaç:** CSS dosyasını minify ederek boyutunu küçültmek.

**Yapılacaklar:**
- Build sürecine CSS minification adımı ekle (cssnano, clean-css veya PostCSS)
- Development için orijinal `style.css`, production için `style.min.css` kullan
- `package.json`'a build script ekle
- Vercel deploy'da otomatik minification

**Dikkat:**
- Orijinal `style.css` kaynak olarak korunmalı (development için)
- CSS değişkenleri (custom properties) korunmalı

---

### C15. CDN Bağımlılıklarını Self-Host

**Amaç:** Dış CDN bağımlılıklarını proje içinde barındırmak.

**Yapılacaklar:**
- Supabase JS SDK'yı `/vendor/supabase.min.js` olarak indir ve ekle
- SheetJS'yi `/vendor/xlsx.full.min.js` olarak indir ve ekle
- jsPDF'i `/vendor/jspdf.umd.min.js` olarak indir ve ekle
- `index.html`'deki CDN referanslarını yerel dosyalara güncelle
- CDN fallback mekanizmasını koru (eğer yerel dosya yüklenemezse CDN'den dene)
- `init.js`'deki fallback mantığını güncelle
- `vercel.json` CSP'yi güncelle

**Dikkat:**
- Kütüphane versiyonları sabitlenmeli
- `sw.js` cache listesine vendor dosyaları eklenmeli
- Toplam deploy boyutu artacak, Vercel limitlerine dikkat

---

### D20. Splash Screen

**Amaç:** Uygulama açılırken profesyonel bir yükleme ekranı.

**Yapılacaklar:**
- `index.html`'e animasyonlu splash screen ekle (logo + yükleme animasyonu)
- Supabase ve tüm script'ler yüklendikten sonra splash screen'i kaldır
- CSS-only animasyon kullan (JS bağımlılığı olmamalı)
- `manifest.json`'a `splash_screen` özelliklerini ekle
- PWA olarak açıldığında native splash screen göster

**Dikkat:**
- Mevcut `#loading-overlay` ile çakışmamalı
- Yükleme süresi uzaması durumunda timeout ekle (max 5 saniye)

---

### E27. Veli İletişim Portali

**Amaç:** Velilerin antrenörle mesajlaşabildiği basit bir mesajlaşma sistemi.

**Yapılacaklar:**
- Sporcu portalına "Mesajlar" sekmesi ekle (`sp-tab` olarak)
- `messages` tablosunu kullanarak sporcu-antrenör mesajlaşma
- Mesaj gönderme formu (konu + mesaj içeriği)
- Antrenör panelinde gelen mesajları görüntüleme
- Admin panelinde tüm mesajları yönetme
- Okundu/okunmadı durumu takibi
- Bildirim badge'i (yeni mesaj sayısı)

**Dikkat:**
- Mevcut `messages` tablosu ve `AppState.data.messages` yapısı korunmalı
- RLS politikaları güncellenmeli (sporcu kendi mesajlarını görsün)
- Sporcu portalının mevcut tab yapısıyla uyumlu olmalı

---

### E29. Çoklu Branş/Şube Yönetimi

**Amaç:** Birden fazla şubenin tek panelden yönetimi.

**Yapılacaklar:**
- Admin panelinde şube seçici dropdown ekle (header'a)
- Şube ekleme/düzenleme/silme sayfası (veya settings altında)
- `branches` ve `orgs` tablolarını tam kullan
- Şube değiştiğinde `loadBranchData()` ile veri güncelle
- Her şubenin kendi sporcuları, antrenörleri, ödemeleri olmalı
- Şubeler arası sporcu transferi özelliği
- Dashboard'da tüm şubelerin özet istatistikleri

**Dikkat:**
- Mevcut `AppState.currentBranchId` ve `AppState.currentOrgId` yapısı korunmalı
- `branch_id` filtresi tüm veri sorgularında zaten var, bu genişletilmeli
- Tek şubeli kurumlar için geriye dönük uyumluluk

---

### F31. PDF Rapor Oluşturma

**Amaç:** Aylık gelir-gider raporu ve sporcu ilerleme raporu PDF olarak indirme.

**Yapılacaklar:**
- Finans raporu sayfasına "PDF İndir" butonu ekle
- jsPDF kullanarak:
  - Aylık gelir-gider özet raporu
  - Sporcu listesi raporu (filtrelere göre)
  - Yoklama raporu (tarih aralığına göre)
  - Borç raporu (gecikmiş ödemeler)
- Rapor header'ında kurum adı, logo ve tarih
- Türkçe karakter desteği (mevcut `trToAscii` fonksiyonu kullanılabilir veya font embed)
- Tablo formatında düzenli çıktı

**Dikkat:**
- Mevcut `generateReceipt()` fonksiyonu bozulmamalı
- jsPDF zaten projede yüklü, ek kütüphane gerekmemeli

---

### F32. Devam Durumu Analizi

**Amaç:** Branş/sınıf bazında detaylı yoklama istatistikleri ve grafikleri.

**Yapılacaklar:**
- Dashboard'a veya ayrı bir sayfaya yoklama analiz bölümü ekle
- Gösterilecek metrikler:
  - Branş bazında ortalama devam oranı
  - Sınıf bazında devam oranı karşılaştırması
  - Haftalık/aylık devam trendi grafiği
  - En düşük devamı olan sporcular listesi
  - Günlük devam oranı takvim görünümü (heat-map tarzı)
- Mevcut `getAttendanceStats()` ve `attendanceRate()` fonksiyonlarını genişlet
- Bar chart ve donut chart kullanarak görselleştir

**Dikkat:**
- Mevcut yoklama sistemi ve `AppState.data.attendance` yapısı korunmalı
- Antrenör panelinde de görüntülenebilmeli

---

### G35. TypeScript'e Geçiş

**Amaç:** Tip güvenliği sağlamak ve hataları derleme zamanında yakalamak.

**Yapılacaklar:**
- `tsconfig.json` oluştur
- Mevcut `.js` dosyalarını `.ts`'e çevir (kademeli geçiş)
- Interface'ler tanımla: `Athlete`, `Payment`, `Coach`, `Settings`, `AppStateType`, vb.
- `script.js` içindeki tipe bağımlı hataları düzelt
- Build sırasında TypeScript → JavaScript derleme pipeline'ı kur
- `strict: true` ile en katı tip kontrolü

**Dikkat:**
- Tüm mevcut fonksiyonellik korunmalı
- Kademeli geçiş yapılmalı (`.js` ve `.ts` birlikte çalışabilmeli)
- Vercel deploy süreci güncellenmeli

---

### G36. Framework Kullanımı

**Amaç:** Bileşen bazlı mimari için modern framework'e geçiş.

**Yapılacaklar:**
- Vite + React veya Vite + Vue.js ile proje yeniden yapılandır
- Mevcut sayfa fonksiyonlarını bileşenlere dönüştür:
  - `<Dashboard />`, `<Athletes />`, `<AthleteProfile />`, `<Payments />`
  - `<Attendance />`, `<Coaches />`, `<Settings />`, `<Login />`
  - `<SporcuPortal />`, `<Sidebar />`, `<Header />`
- React Router veya Vue Router ile sayfa yönetimi
- State management (Context API / Zustand veya Pinia)
- Supabase JS SDK'yı modüler import ile kullan
- Mevcut tüm özellikler birebir taşınmalı

**Dikkat:**
- **Bu en büyük değişikliktir** — tüm diğer maddelerden sonra veya birlikte yapılmalı
- Mevcut vanilla JS mantığı referans alınmalı
- PWA özellikleri korunmalı
- Vercel deploy süreci güncellenmeli

---

### G37. Test Altyapısı

**Amaç:** Otomatik testlerle kod kalitesini garanti altına almak.

**Yapılacaklar:**
- Vitest veya Jest ile unit test altyapısı kur
- Playwright veya Cypress ile E2E test altyapısı kur
- Kritik fonksiyonlar için unit test yaz:
  - `FormatUtils.tcValidate()` — TC doğrulama
  - `DateUtils` — tarih fonksiyonları
  - `DB.mappers` — veri dönüşümleri
  - `statusLabel()`, `statusClass()` — durum etiketleri
- E2E testler:
  - Admin girişi akışı
  - Sporcu girişi akışı
  - Sporcu ekleme/düzenleme/silme
  - Ödeme ekleme
  - Yoklama alma
- `package.json`'a test script'leri ekle

**Dikkat:**
- Testler CI/CD pipeline'ına entegre edilmeli
- Mock Supabase client ile bağımsız test edilebilmeli

---

### G38. CI/CD Pipeline

**Amaç:** GitHub Actions ile otomatik lint, test ve deploy.

**Yapılacaklar:**
- `.github/workflows/ci.yml` oluştur:
  - Push ve PR'da otomatik çalışsın
  - Lint kontrolü (ESLint)
  - TypeScript derleme kontrolü
  - Unit testleri çalıştır
  - E2E testleri çalıştır (headless browser)
  - Build kontrolü
- `.github/workflows/deploy.yml` oluştur:
  - `main` branch'e push'ta Vercel'e otomatik deploy
  - Preview deploy (PR'lar için)
- `package.json`'a `lint`, `test`, `build` script'leri ekle
- `.eslintrc.json` oluştur (ESLint kuralları)
- `.prettierrc` oluştur (kod formatlama)

**Dikkat:**
- Vercel GitHub entegrasyonu zaten varsa çakışma olmamalı
- Environment variable'lar GitHub Secrets'ta tanımlanmalı

---

### G39. Error Tracking

**Amaç:** Production'da hataları izlemek ve raporlamak.

**Yapılacaklar:**
- Sentry veya LogRocket entegrasyonu
- `window.onerror` ve `unhandledrejection` handler'larını error tracking servisine bağla
- Kullanıcı bilgilerini anonimize ederek hata raporlarına ekle
- Source map desteği (hata satır numaraları doğru gösterilsin)
- Hata gruplandırma ve bildirim ayarları
- Performans izleme (sayfa yükleme süreleri)
- Vercel Analytics ile entegrasyon (isteğe bağlı)

**Dikkat:**
- `vercel.json` CSP'ye Sentry/LogRocket domain'leri eklenmeli
- Kullanıcı gizliliği korunmalı (TC, şifre gibi bilgiler loglara yazılmamalı)
- Mevcut `window.onerror` handler'ı ile uyumlu çalışmalı

---

### G40. Database Migration

**Amaç:** Veritabanı değişikliklerini versiyonlama.

**Yapılacaklar:**
- `supabase/migrations/` klasörü oluştur
- Mevcut tablo yapısını ilk migration olarak kaydet (`001_initial_schema.sql`)
- `RLS_POLICIES.sql`'i migration formatına dönüştür (`002_rls_policies.sql`)
- Her yeni tablo veya değişiklik için sıralı migration dosyası oluştur
- `supabase CLI` ile `supabase db push` / `supabase db diff` kullanımı
- README'ye migration çalıştırma talimatları ekle
- Rollback migration'ları (down migration) da yaz

**Dikkat:**
- Mevcut veritabanı yapısı bozulmamalı
- Migration'lar idempotent olmalı (`IF NOT EXISTS`, `CREATE OR REPLACE` kullan)
- Production veritabanına uygulamadan önce staging'de test et

---

### H41. SEO Meta Tag'leri

**Amaç:** Arama motoru optimizasyonu ve sosyal medya paylaşım kartları.

**Yapılacaklar:**
- `index.html`'e ekle:
  - Open Graph meta tag'leri (`og:title`, `og:description`, `og:image`, `og:url`)
  - Twitter Card meta tag'leri (`twitter:card`, `twitter:title`, `twitter:description`)
  - `canonical` URL
  - `author` meta tag
  - Yapısal veri (JSON-LD) — `SportsOrganization` schema
- Akademi logo görseli OG image olarak kullanılmalı
- `<title>` tag'ini dinamik olarak sayfa değiştikçe güncelle

**Dikkat:**
- Mevcut `<meta>` tag'leri korunmalı
- PWA meta tag'leriyle çakışma olmamalı

---

### H42. Erişilebilirlik (A11y)

**Amaç:** Engelli kullanıcılar için erişilebilirlik standartlarına uyum.

**Yapılacaklar:**
- Tüm butonlara ve interaktif elemanlara `aria-label` ekle
- Tüm `<img>` tag'lerine anlamlı `alt` text ekle
- Form elemanlarına `<label>` ile bağlantı (mevcut olanları doğrula)
- Keyboard navigation desteği:
  - Tab sırası mantıklı olmalı
  - Enter/Space ile buton tıklanabilmeli
  - Escape ile modal kapatılabilmeli
  - Side menu keyboard ile açılıp kapanabilmeli
- Renk kontrastı WCAG 2.1 AA standardına uygun olmalı
- `role` attribute'ları ekle (navigation, main, complementary, vb.)
- Skip navigation linki ekle
- Focus visible stilleri iyileştir (zaten `focus-visible` var, genişlet)
- Screen reader uyumlu toast bildirimleri (`role="alert"`, `aria-live="polite"`)

**Dikkat:**
- Mevcut UI'ı değiştirmeden, sadece erişilebilirlik attribute'ları ekle
- Hem dark hem light temada kontrast kontrol et

---

### H43. Sitemap.xml & robots.txt

**Amaç:** Arama motoru tarayıcıları için rehber dosyalar.

**Yapılacaklar:**
- `/robots.txt` dosyası oluştur:
  ```
  User-agent: *
  Allow: /
  Sitemap: https://SITE_URL/sitemap.xml
  ```
- `/sitemap.xml` dosyası oluştur (tek sayfalık uygulama için basit)
- `vercel.json`'a statik dosya route'ları ekle (gerekirse)

**Dikkat:**
- Giriş ekranı dışındaki sayfalar SPA içinde olduğu için sitemap basit tutulmalı
- `Disallow` ile hassas endpoint'ler engellenebilir

---

### H44. Çoklu Dil Desteği (i18n) Geliştirme

**Amaç:** Mevcut kısıtlı TR/EN desteğini tüm uygulamaya yaymak.

**Yapılacaklar:**
- Mevcut `i18n` objesini genişlet — tüm sayfaların metinlerini ekle:
  - Dashboard metinleri
  - Sporcu ekleme/düzenleme formu label'ları
  - Ödeme formu metinleri
  - Yoklama sayfası metinleri
  - Ayarlar sayfası metinleri
  - Finans raporu metinleri
  - Sporcu portalı metinleri
  - Hata mesajları
  - Tüm buton metinleri
- i18n'i ayrı bir JSON dosyasına taşı (`/i18n/tr.json`, `/i18n/en.json`)
- Sayfa render fonksiyonlarında hardcoded Türkçe metinleri `i18n` çağrılarına dönüştür
- Dil değiştiğinde tüm sayfa yeniden render edilmeli
- Yeni dil ekleme kolaylığı sağla (örn: Almanca, Arapça)
- `navigator.language` ile otomatik dil algılama

**Dikkat:**
- Mevcut `applyLang()` ve `changeLang()` fonksiyonları korunmalı
- `data-i18n` attribute mekanizması genişletilmeli
- Tarih formatları dil bazında değişmeli

---

## UYGULAMA ÖNCELİK SIRASI

Aşağıdaki sıra önerilir (bağımlılıklara göre):

### Faz 1 — Altyapı Hazırlığı
1. G40 — Database Migration
2. G38 — CI/CD Pipeline
3. G39 — Error Tracking
4. B7 — Supabase Anon Key Ortam Değişkeni
5. C15 — CDN Self-Host

### Faz 2 — Kod Modernizasyonu
6. C12 — Kod Bölümleme
7. G35 — TypeScript'e Geçiş
8. G36 — Framework Kullanımı (React/Vue + Vite)
9. G37 — Test Altyapısı
10. C13 — CSS Minification

### Faz 3 — Güvenlik ve Performans
11. B8 — Rate Limiting Sunucu Tarafında
12. B9 — CSP Sıkılaştırma

### Faz 4 — Görsel ve UX
13. A1 — Modern Tipografi
14. A2 — Tema Geçiş Animasyonu
15. A4 — Logo Tasarımı
16. D20 — Splash Screen
17. H42 — Erişilebilirlik

### Faz 5 — Yeni Özellikler
18. E27 — Veli İletişim Portali
19. E29 — Çoklu Branş/Şube Yönetimi
20. F31 — PDF Rapor Oluşturma
21. F32 — Devam Durumu Analizi

### Faz 6 — SEO ve i18n
22. H41 — SEO Meta Tag'leri
23. H43 — Sitemap.xml & robots.txt
24. H44 — Çoklu Dil Desteği

---

## TEST KONTROL LİSTESİ

Her değişiklikten sonra aşağıdaki fonksiyonellikler test edilmelidir:

- [ ] Admin e-posta/şifre ile giriş
- [ ] Sporcu TC/şifre ile giriş
- [ ] Antrenör TC/şifre ile giriş
- [ ] Oturum kaydı ve geri yükleme (restoreSession)
- [ ] Dark/Light tema geçişi
- [ ] Sporcu ekleme/düzenleme/silme
- [ ] Sporcu profili görüntüleme
- [ ] Ödeme ekleme/düzenleme
- [ ] Yoklama alma
- [ ] Finans raporu görüntüleme
- [ ] WhatsApp/SMS mesaj gönderme
- [ ] Excel import/export
- [ ] Makbuz oluşturma (PDF + HTML fallback)
- [ ] Ön kayıt formu ve onaylama
- [ ] Ayarlar sayfası (logo, banka, WhatsApp)
- [ ] Çıkış yapma
- [ ] Mobil responsive tasarım
- [ ] PWA kurulum ve offline kullanım
- [ ] Service Worker cache güncelleme
- [ ] Bildirim sistemi çalışıyor
- [ ] KVKK ve Kullanım Şartları popup'ları
