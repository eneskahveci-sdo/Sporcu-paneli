# Dragos FK — Eklenebilecek Özellikler (Geliştirme Prompt'u)

> Bu dosya **uygulanmamış** önerilen özelliklerin self-contained prompt'udur.
> Başka bir Claude Code oturumuna verildiğinde, ilgili sprint'i tek başına uygulayabilir.
> Her özellik için: amaç, etkilenen dosyalar, DB değişiklikleri, kabul kriterleri yazılıdır.

---

## 📋 NASIL KULLANILIR

Aşağıdaki blokları **bir tanesini** seçip Claude'a şu şekilde verebilirsin:

> "CLAUDE.md'yi oku, sonra `FEATURES.prompt.md`'deki **SPRINT 1 — Madde 3 (QR kod yoklama)** maddesini uygula. Migration ekle, JS değiştir, kabul kriterlerinin hepsini geçir. Branch: `claude/feature-qr-attendance`."

Birden fazla istersen sprint numarasını ver:

> "FEATURES.prompt.md'deki SPRINT 1'in tamamını sırayla uygula."

**Önemli kurallar (tüm özellikler için):**
1. Her özellik için **ayrı migration** dosyası aç (`029_`, `030_`, ...). Idempotent yaz (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`).
2. `script.js` 6000+ satır — yeni özelliği `script.js`'e ekleme; ayrı modül dosyası aç (`features/<isim>.js`) ve `index.html`'e ekle.
3. XSS koruması: tüm template literal'larda `FormatUtils.escape()` kullan.
4. Sporcu/anon role INSERT yapacaksa `org_id` + `branch_id` zorunlu — `payments_insert_anon` RLS örneğine bak.
5. `sw.js`'deki `STATIC_CACHE` versiyonunu artır (yeni dosya cache'lensin).
6. CSP ihlal etmeyecek şekilde yaz: inline `onclick` kullanma, `data-action` + event delegation kullan.
7. i18n: yeni metin eklersen hem `i18n/tr.json` hem `i18n/en.json` güncellensin.

---

# 🚀 SPRINT 1 — Hızlı Kazançlar (1-2 hafta)

## 1.1 — PayTR Recurring / Otomatik Aylık Aidat

**Amaç:** Veli kart bilgisini bir kez girer; aylık aidat otomatik çekilir. Kayıt iptali sporcu portalindan tek tıkla.

**Etkilenen yerler:**
- Yeni migration: `recurring_payments` tablosu (id, athlete_id, org_id, branch_id, amount, currency, day_of_month, paytr_card_token, status, last_charged_at, next_charge_at, created_at)
- Yeni Edge Function: `paytr-recurring-charge` (CRON ile günlük 03:00 UTC çalışır; `next_charge_at <= now()` olanları işler)
- `supabase/functions/paytr-token/index.ts`'e "save_card" parametresi (PayTR `store_card=1`)
- Yeni JS modül: `features/recurring.js` — sporcu portalde "Otomatik Aidat" toggle'ı
- `payments` tablosuna `recurring_id UUID` kolonu (recurring çekimden gelen ödemeleri işaretle)

**Kabul kriterleri:**
- Sporcu kartını kaydederken PCI-DSS compliance için PayTR token saklanır, ham kart no asla
- Çekim başarısızsa 3 kez retry (1 gün arayla); 4. başarısızlıkta veliye email + push bildirimi
- İptal et butonu anlık (`status='cancelled'`), bir sonraki gün çekilmez
- Admin panelde "Aktif aboneler" raporu

**Riskler:** PayTR Recurring API documentation'ı doğrula; tokenizasyon onayı PayTR hesabında aktif olmalı.

---

## 1.2 — iCal / Google Calendar Export

**Amaç:** Antrenman programı `.ics` dosyası olarak indirilir veya canlı feed URL'i Apple/Google takvime eklenir.

**Etkilenen yerler:**
- Yeni Edge Function: `calendar-feed` — `GET /functions/v1/calendar-feed?athlete_id=<uuid>&token=<sig>`
- HMAC ile imzalı token üret (`athlete_id` + secret); link sızsa bile başkası diğer sporcunun verisini göremez
- `classes` + `attendance` tablolarından sporcu sınıf programını çekip RFC 5545 formatında döner
- Sporcu portalde "Takvime Ekle" butonu → URL kopyala / `.ics` indir

**Kabul kriterleri:**
- Google Calendar "URL'den ekle" ile abone olunabilir
- Antrenman değişirse 12 saat içinde takvimde güncellenir (CalDAV refresh)
- Hatalı/iptal token 403 döner

---

## 1.3 — QR Kod ile Yoklama

**Amaç:** Sporcu sahaya gelir, telefonda QR'ını gösterir; antrenör tarar, yoklama otomatik düşer.

**Etkilenen yerler:**
- Yeni migration: `athletes.qr_token TEXT UNIQUE` (random 32 byte) — login'de üretilir
- `features/qr-attendance.js` modülü:
  - Sporcu portalde "QR Kodum" sekmesi — `qrcode-svg` (CDN, ~3KB)
  - Antrenör panelinde "QR Tara" butonu — `html5-qrcode` lib (CDN, ~15KB)
- Yeni RPC: `mark_attendance_by_qr(p_token TEXT, p_class_id UUID, p_coach_id UUID)` SECURITY DEFINER
  - Token'dan athlete_id'yi bul, sınıfa kayıtlı mı kontrol et, `attendance` insert et
  - Aynı gün ikinci tarama → "zaten alındı" döner

**Kabul kriterleri:**
- QR token her oturumda rotate edilir (hijack korunması)
- Antrenör tarayıcısı kamera izni ister; ışık zayıfsa flash desteği
- Offline modda son 24 saatte alınan yoklamalar local kuyrukta, online olunca senkronize olur

---

## 1.4 — PWA Install Prompt + 3. Ziyaret Banner'ı

**Amaç:** Kullanıcı 3. ziyaretinde "Ana ekrana ekle" banner'ı görür; tıklayınca native install dialog açılır.

**Etkilenen yerler:**
- `pwa-register.js` — `beforeinstallprompt` event'ini yakala, `deferredPrompt` global'de tut
- `localStorage.visitCount++` her açılışta; >= 3 ve install reddedilmediyse banner göster
- Yeni UI: alt orta banner ("📱 Telefonunuza yükleyin"), [Yükle] [Daha sonra] butonları
- Banner state'i: 3 reddetme → 7 gün sessizlik

**Kabul kriterleri:**
- iOS Safari fallback: "Paylaş → Ana ekrana ekle" mini eğitim modali (beforeinstallprompt iOS'ta yok)
- Banner mevcut alt nav'ı kapatmamalı (z-index ve safe-area-inset hesabı)

---

## 1.5 — Web Push Bildirimi Toplu Kampanya

**Amaç:** Admin "Yarın yağmur, antrenman iptal" yazar, abone olan tüm velilere push gider.

**Etkilenen yerler:**
- `push_subscriptions` tablosu zaten var (migration 022)
- Yeni Edge Function: `send-push-broadcast` — VAPID key ile web-push protocol
- Supabase Secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- Admin panelinde "Bildirim Gönder" sayfası: başlık, mesaj, hedef seçimi (tüm sporcular / sınıf / şube)
- `sw.js`'e `push` event handler'ı — bildirimi göster, tıklayınca portala yönlendir

**Kabul kriterleri:**
- VAPID key admin paneli "Ayarlar" → "Push Konfigürasyonu" sayfasından okunur (paylaşım için)
- Gönderim sırasında ilerleme göstergesi (100 kullanıcıya 5sn'de gider)
- Başarısız abonelikler (410 Gone) otomatik DB'den temizlenir

---

## 1.6 — `prefers-color-scheme` Otomatik Dark Mode

**Amaç:** Kullanıcı sistem temasıyla otomatik geçiş; manuel override edebilir.

**Etkilenen yerler:**
- `style.css` zaten `[data-theme="dark"]` selector kullanıyor olmalı — kontrol et
- `script.js`'te tema init: önce `localStorage.theme` → yoksa `matchMedia('(prefers-color-scheme: dark)')`
- `window.matchMedia` listener → kullanıcı sistem temasını değiştirirse anında geç (eğer manuel set edilmemişse)

**Kabul kriterleri:**
- Manuel toggle bir kez kullanıldıktan sonra otomatik geçiş devre dışı kalır
- "Tema → Otomatik / Açık / Koyu" üç seçenek (Linear, GitHub modeli)

---

# 🎯 SPRINT 2 — Diferansiyasyon (3-4 hafta)

## 2.1 — Sporcu Performans / Fitness Test Modülü

**Amaç:** Antrenör periyodik testler girer (mekik, sürat, atış); sporcu progresini grafikte görür.

**DB:**
- `fitness_tests` (id, athlete_id, test_type, value, unit, recorded_at, recorded_by, org_id, branch_id)
- Test tipleri: `shuttle_run`, `sprint_30m`, `vertical_jump`, `cooper_test`, `bmi`, `body_fat_pct`

**UI:**
- Antrenör panelde sporcu detayında "Performans Testleri" sekmesi
- Sporcu panelde "Gelişimim" sayfası — Chart.js line chart, yaş grubu ortalamasıyla karşılaştırma
- AI rapor (opsiyonel — Claude API): "Mehmet son 3 ayda sprint zamanında %12 iyileşme gösterdi"

---

## 2.2 — Çoklu Çocuk (Veli) Yönetimi

**Amaç:** Bir veli birden fazla çocuk için tek hesapla giriş yapar, sporcu seçici ile geçer.

**DB:**
- `parents` tablosu (id, tc, password_hash, ...). Her sporcu opsiyonel `parent_id` kolonu alır.
- Yeni RPC: `login_with_parent_tc(tc, pass)` → veli + çocuk listesi döner

**UI:**
- Giriş ekranında "Veli Girişi" sekmesi (4. tab)
- Login sonrası çocuk seçici dropdown
- Push bildirimleri vela özel: "Mehmet'in antrenmanına 1 saat kaldı"

**Geçiş stratejisi:** Mevcut sporcu girişi korunur; veli girişi opsiyonel ek katman.

---

## 2.3 — Antrenör Mobile-First Hızlı Yoklama

**Amaç:** Antrenör sahada telefonla 30 saniyede yoklama alır.

**UI:**
- `display-mode: standalone` algılandığında özel layout
- Sınıf seçimi → sporcu listesi büyük dokunma alanlı kartlar (min-height: 60px)
- Tek tıkla "Geldi" / iki tıkla "Geç kaldı" / uzun bas "Yok"
- Çevrimdışı kuyruk (IndexedDB) — sahada internet yoksa toplu sync

---

## 2.4 — Gerçek WhatsApp Business API Entegrasyonu

**Amaç:** Şu an `wa.me` link açıyor; gerçek Business API ile şablonlu mesaj toplu gönderim.

**Etkilenen yerler:**
- Yeni Edge Function: `whatsapp-send` — Meta Cloud API'ye POST
- Secrets: `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_BUSINESS_ACCOUNT_ID`
- Admin "Mesaj Şablonları" — Meta onaylı template'ler (`payment_reminder`, `training_cancelled`)
- `wa_messages` tablosu zaten var (migration 025) — status (queued/sent/delivered/read) eklenecek

**Maliyet uyarısı:** Meta WhatsApp Business mesaj başına ücretlendirir; admin'e maliyet uyarısı göster.

---

## 2.5 — Aidat İndirim / Burs Sistemi

**Amaç:** Kardeş indirimi, başarı bursu, mali yardım otomatik aidata yansır.

**DB:**
- `discount_rules` (id, name, type ['sibling'|'merit'|'need'], value_pct, value_fixed, condition_jsonb)
- `athlete_discounts` (athlete_id, rule_id, valid_from, valid_to, applied_by)
- `payments` upsert sırasında applicable discount'lar otomatik hesaplanır

**Kabul kriterleri:**
- 2. kardeş %15, 3. kardeş %25 (kural tablosundan)
- Aidat ekranında "Bağış brüt 500₺, indirim -75₺, net 425₺" şeffaf gösterim
- Indirim raporu — admin panelinde

---

## 2.6 — Dijital Onay Formu (Signature Pad)

**Amaç:** Turnuva/kamp katılımı için veli imzası — kağıt yerine `<canvas>` üzerinde parmak ile.

**DB:**
- `consent_forms` (id, athlete_id, event_id, signature_png_base64, signed_at, signer_name, signer_tc, ip_address)

**UI:**
- Veli portalde "İmza Bekleyen Formlar" badge'i
- `signature_pad` lib (CDN, 8KB)
- İmza atılınca PDF'e gömülü olarak generate edilir, admin'e gönderilir

**Yasal not:** Bu **e-imza değildir** (KEP / mobil imza değil); sadece görsel onay. KVKK aydınlatma metni göster.

---

# 🌟 SPRINT 3 — İleri Seviye (1-2 ay)

## 3.1 — Video Paylaşım Modülü

**Amaç:** Antrenör maç klipleri yükler, sporcu/veli izler.

**Stack:**
- Supabase Storage `videos/` bucket (RLS: org_id eşleşmeli)
- Veya Mux Player entegrasyonu (daha pahalı ama bandwidth dert değil)
- Video boyutu max 100MB, 1080p sıkıştırma client-side (ffmpeg.wasm)
- Yorumlar, beğeniler — `video_comments`, `video_likes` tablolarıyla

---

## 3.2 — Lig / Turnuva Modülü

**Amaç:** Fixture, puan durumu, gol kralı tablosu.

**DB:**
- `tournaments`, `tournament_teams`, `matches`, `match_events` (goals, assists, cards)
- Otomatik puan tablosu RPC: `get_standings(tournament_id)`

**UI:**
- Public sayfa (auth gerektirmez): `/lig/<slug>` — herkese açık fixture
- Admin'de mac sonucu girişi, antrenör/oyuncu istatistikleri

---

## 3.3 — AI Destekli Gelişim Raporu (Claude API)

**Amaç:** Antrenör "rapor üret" tıklar; Claude sporcu verilerinden 1 sayfalık özet hazırlar.

**Stack:**
- Edge Function `generate-athlete-report` → Anthropic API `claude-sonnet-4-6` (rapor için yeterli)
- Prompt caching kullan (sistem prompt'u + akademi bilgileri cache'lensin)
- Input: son 3 ay yoklama + fitness testleri + maç verileri (varsa)
- Output: markdown rapor (sportif gelişim, devamlılık, davranış, öneriler)

**Maliyet:** Aylık ~$5-15 (kurum başına, ~100 sporcu için). Admin "rapor üret" hakkını sınırlasın.

**Önemli:** Claude API çağrılarında prompt caching ZORUNLU — `cache_control: { type: 'ephemeral' }` system prompt'a uygulanmalı.

---

## 3.4 — Wearable Entegrasyonu (Apple Health / Google Fit)

**Amaç:** Sporcu antrenman sonrası saatinden veri çeker (kalp atış, koşu mesafesi).

**Stack:**
- HealthKit (iOS) / Health Connect (Android) — Capacitor wrapper ile native bridge gerekir
- Bu özellik PWA sınırlarını aşar — Capacitor/Tauri'ye geçiş kararı gerektirir
- **Önce sade versiyon:** kullanıcı manuel girer ("dün 5km koştum, 28 dakika")

---

## 3.5 — Çoklu Kurum (Multi-Tenant) Konsolu

**Amaç:** Franchise yapı için ana panel — sahip tüm şubeleri yönetir.

**Mimari değişiklik:**
- Şu an `org_id` zaten var ama UI tek kurum varsayıyor
- Yeni rol: `super_admin` — `is_super_admin(uid)` RPC
- Super admin'e özel sayfa: tüm `org`'ların KPI dashboard'u (aktif sporcu, aylık ciro, devamlılık)
- Org switcher dropdown (admin birden fazla org'a sahipse)

---

## 3.6 — Mağaza / E-ticaret Modülü

**Amaç:** Forma, ekipman satışı; envanter zaten var, ödeme katmanı ekle.

**DB:**
- `products`, `orders`, `order_items`, `shipping_addresses`
- PayTR mevcut — checkout flow'u recurring olmadan tek seferlik

**UI:**
- Sporcu portalde "Mağaza" sekmesi
- Stok bittiğinde otomatik "stokta yok" rozeti
- Admin'de sipariş yönetimi — hazırla / kargo verildi / teslim edildi

---

## 3.7 — Sponsor / Reklam Yönetimi

**DB:** `sponsors` (logo_url, link, tier, valid_from, valid_to)

**UI:** Login ekranı altı, formaya logo işleme (admin sınıf yönetiminde)

---

## 3.8 — Devamlılık Skoru & Liderlik Tablosu (Gamification)

**Amaç:** Sporcular arasında pozitif rekabet — en çok antrenmana gelen sporcu / sınıf.

**DB:** `attendance` tablosundan view: `athlete_streaks` (current_streak, max_streak, total_attendance_pct)

**UI:**
- Sporcu portal ana sayfada "🔥 Üst üste 12 gün antrenman"
- Sınıf bazlı sıralama (Top 10)
- Aylık ödül listesi — admin manuel girer ya da otomatik

**Risk:** Yarışmacı baskı yaratabilir; veli ayarlarda kapatılabilir olmalı.

---

# 🛠 SPRINT 4 — Altyapı Borç Ödemesi

## 4.1 — Vite + esbuild Build Pipeline

**Amaç:** 571 KB ham JS → ~100 KB gzip bundle.

**Adımlar:**
1. `npm create vite@latest -- --template vanilla` (yeni dizinde başla, dosyaları taşı)
2. `script.js` + `script-fixes.js` + `ui-improvements.js` → tek `main.js` (ES modules)
3. `vite build` → `dist/` klasörüne minified
4. `vercel.json` rewrite kuralı: tüm `*.js` → `dist/assets/*.js`
5. CSP nonce-based geçişi (`'unsafe-inline'` kaldırılır)

**Risk:** Devasa refactor — feature flag arkasında staging'de 2 hafta test et.

---

## 4.2 — TypeScript Migration

**Amaç:** 14591 satır vanilla JS → tip güvenli TS.

**Strateji:** Aşamalı (`allowJs: true`, dosya dosya `.js → .ts`)

**Öncelik sırası:**
1. `init.js`, `error-handler.js` (en küçük, en kritik)
2. `DB.mappers` (`toPayment`/`fromPayment`) — tip hatası en çok burada
3. `AppState` interface'i
4. PayTR akışı (token, callback, webhook) — type-safe
5. Sonra UI kodu

---

## 4.3 — Sentry Production Error Tracking

**Stack:** Sentry browser SDK, `SENTRY_DSN` Vercel env

**Kapsama:**
- `error-handler.js`'teki global hata yakalayıcıdan Sentry'ye gönder
- `console.warn/error` production'da sessiz (Sentry'ye gönderilir)
- Source map upload (Vite build hook)
- User context: `Sentry.setUser({ id: AppState.currentUser?.id, role: ... })`

---

## 4.4 — E2E Test (Playwright)

**Kritik akışlar:**
1. Sporcu TC + şifre ile giriş, profile sayfası açılır
2. Sporcu PayTR ile aidat öder (test mode), "ödendi" gözükür
3. Admin email + şifre ile giriş, yeni sporcu ekler, yoklama alır
4. Antrenör girişi → kendi sınıfı listesi gelir

**CI:** `.github/workflows/e2e.yml` — PR açılınca Playwright çalışır

---

## 4.5 — Lighthouse CI

**Stack:** `treosh/lighthouse-ci-action`

**Eşikler:**
- Performance: 80+
- Accessibility: 95+
- Best Practices: 90+
- SEO: 95+
- PWA: 90+

**Davranış:** PR'da eşik altı kalırsa fail.

---

## 4.6 — Storybook (UI Component Library)

**Amaç:** `modal()`, `toast()`, kart şablonları izole gözden geçirme

**Düşük öncelik** — proje vanilla JS olduğundan storybook entegrasyonu zorlanır; önce Vite + TS migration tamamlanmalı.

---

# 📝 EK NOTLAR

## i18n Yeni Anahtarlar (yukarıdaki özellikler için)
Her özellik eklenirken `i18n/tr.json` + `i18n/en.json` aynı anda güncellenmeli. Örnek anahtar isimleri:

```
recurringTitle, recurringEnable, recurringNextCharge
calendarExport, calendarCopyLink
qrMyCode, qrScanAttendance
pushBroadcast, pushTarget
fitnessTest, fitnessProgress
parentLogin, parentChildSelector
discountSibling, discountMerit
videoUpload, videoComment
tournamentStandings, tournamentTopScorer
aiReportGenerate, aiReportLoading
storeBuy, storeCart, storeCheckout
streakCurrent, streakMax, leaderboardTop
```

## Maliyet Tahmini (Sprint 3 özellikleri için aylık)

| Özellik | Tahmini aylık maliyet |
|---------|----------------------|
| Claude API (AI rapor) | $5-15 |
| WhatsApp Business API | $0.005-0.08 / mesaj × hacim |
| Mux Video Player | $1 / 1000 dakika izleme |
| Sentry | Free tier (10k event/ay) yeterli |
| Supabase Storage (video) | $0.021 / GB / ay |
| Lighthouse CI | Ücretsiz (GitHub Actions) |

## Mimari Karar Gerektirenler
- **Capacitor / Tauri'ye geçiş** (3.4 wearable için) — eğer evet, tüm proje native app'e dönüşebilir
- **Mevcut script.js'i parçalamak vs override patternine devam** — Sprint 4.1 olmadan yeni feature eklemek script.js'i daha da şişirir
- **Multi-tenant `super_admin` rolü** — RLS politikalarının her birine eklenecek; planlamadan başlama

---

**Bu dosyayı oku, hangi sprint/özellik gerektiğine karar ver, ayrı bir branch'te uygula.
Her özellik için PR ayrı açılsın — code review kolaylığı için.**
