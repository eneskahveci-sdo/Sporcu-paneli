# Dragos Futbol Akademisi — Sporcu 
Paneli

Sporcu kayıt, ödeme takibi, yoklama ve yönetim sistemi. Supabase + Vercel üzerinde çalışan tek sayfa PWA.

## Özellikler

- **Çoklu Giriş Sistemi:** Yönetici, antrenör ve sporcu/veli panelleri
- **Sporcu Yönetimi:** Kayıt, profil, TC kimlik doğrulama
- **Ödeme Takibi:** Tahsilat, borç takibi, makbuz oluşturma (PayTR entegrasyonu)
- **Yoklama (Devam) Yönetimi:** QR kod ile yoklama, devam raporu
- **SMS / WhatsApp Bildirimleri:** NetGSM entegrasyonu (Supabase Edge Function üzerinden)
- **Finans Raporu:** Gelir/gider özeti, Excel export
- **Excel Import/Export:** Sporcu ve ödeme verileri
- **Ön Kayıt Formu:** Veliler için çevrimiçi ön kayıt
- **PWA Desteği:** Service Worker, offline çalışma, ana ekrana ekle
- **Çoklu Dil:** Türkçe / İngilizce (i18n altyapısı)
- **Karanlık / Aydınlık Tema:** Otomatik sistem tercihi + manuel geçiş
- **Erişilebilirlik:** WCAG uyumlu, aria etiketleri, klavye navigasyonu
- **SEO:** Open Graph, Twitter Card, JSON-LD, canonical URL, sitemap

## Dosya Yapısı

```
Sporcu-paneli/
├── index.html            — Ana HTML (tek sayfa PWA)
├── script.js             — Ana uygulama mantığı
├── script-fixes.js       — Ek özellikler ve düzeltmeler
├── ui-improvements.js    — UI/UX iyileştirme paketi
├── Security.js           — Güvenlik modülü
├── init.js               — Supabase CDN yükleme ve fallback
├── error-handler.js      — Global hata takibi altyapısı
├── pwa-register.js       — PWA Service Worker kaydı
├── sw.js                 — Service Worker
├── style.css             — Tüm stiller
├── manifest.json         — PWA manifest
├── vercel.json           — Vercel deploy + güvenlik header'ları
├── RLS_POLICIES.sql      — Supabase RLS politikaları
├── robots.txt            — SEO
├── sitemap.xml           — SEO
├── i18n/
│   ├── tr.json           — Türkçe çeviri anahtarları
│   └── en.json           — İngilizce çeviri anahtarları
├── icons/                — PWA ikonları
└── supabase/
    ├── config.toml       — Supabase CLI yapılandırması
    ├── migrations/       — Veritabanı migration dosyaları
    │   └── 001_rls_policies.sql
    └── functions/
        └── send-sms/     — SMS gönderimi Edge Function
```

## Kurulum

### Gereksinimler

- [Supabase](https://supabase.com) hesabı
- [Vercel](https://vercel.com) hesabı

### 1. Supabase Kurulumu

1. Yeni bir Supabase projesi oluşturun.
2. `RLS_POLICIES.sql` veya `supabase/migrations/001_rls_policies.sql` dosyasını **SQL Editor**'de çalıştırın.
3. Authentication > Settings bölümünde:
   - **Site URL:** `https://sporcu-paneli.vercel.app`
4. Projenizin **URL** ve **anon key** bilgilerini kopyalayın.

### 2. Supabase Ayarlarını Güncelleme

`init.js` dosyasında `SUPABASE_URL` ve `SUPABASE_ANON_KEY` değerlerini kendi projenize göre güncelleyin.

> **Not:** `index.html` içindeki `canonical` ve `og:url` meta etiketleri varsayılan olarak `https://sporcu-paneli.vercel.app/` adresini gösterir. Farklı bir domain kullanıyorsanız bu değerleri güncelleyin.

### 3. Vercel Deploy

1. Bu repoyu Vercel'e bağlayın.
2. `vercel.json` otomatik olarak okunur, ek yapılandırma gerekmez.
3. Deploy edin.

### 4. SMS Entegrasyonu (isteğe bağlı)

NetGSM ile SMS gönderimi için Supabase Edge Function ortam değişkenlerini ayarlayın:

```
NETGSM_USER=<kullanıcı adı>
NETGSM_PASS=<şifre>
NETGSM_HEADER=<başlık>
```

## Veritabanı Migration

Yeni bir Supabase projesi için tüm tabloları ve RLS politikalarını oluşturmak üzere çalıştırın:

```bash
# Supabase CLI ile
supabase db push

# veya manuel olarak Supabase SQL Editor'de
# supabase/migrations/001_rls_policies.sql dosyasını yapıştırıp çalıştırın
```

## CI/CD

Her push ve pull request'te `.github/workflows/ci.yml` otomatik olarak:

- Gerekli dosyaların varlığını kontrol eder
- HTML yapısını doğrular
- JSON dosyalarını (manifest, vercel.json, i18n) validate eder
- JS dosyalarını sözdizimi hatası için kontrol eder
- CSP header yapılandırmasını doğrular

## Güvenlik

- **CSP (Content Security Policy)** header'ı `vercel.json` ile uygulanır
- **RLS (Row Level Security)** tüm Supabase tablolarında aktif
- **HTTPS Only** — Vercel otomatik SSL
- **X-Frame-Options: DENY** — Clickjacking koruması
- **Strict-Transport-Security** — HSTS aktif
- Sporcu/antrenör girişi `login_with_tc` SECURITY DEFINER fonksiyonu ile yapılır

## Lisans

MIT


