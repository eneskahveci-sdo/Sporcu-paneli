# Sporcu Paneli - Kapsamli Guvenlik Analiz Raporu

**Tarih:** 2026-03-27
**Analiz Kapsamı:** Tum proje dosyalari (script.js, script-fixes.js, index.html, vercel.json, Security.js, RLS_POLICIES.sql, migrations, sw.js, init.js, error-handler.js, event-handlers.js, ui-improvements.js, manifest.json)

---

## OZET

| Kategori | Kritik | Yuksek | Orta | Dusuk | Toplam |
|----------|--------|--------|------|-------|--------|
| Veritabani/RLS | 1 | 0 | 1 | 0 | 2 |
| Kimlik Dogrulama | 1 | 2 | 1 | 0 | 4 |
| Yetkilendirme (IDOR) | 0 | 2 | 1 | 0 | 3 |
| XSS/Injection | 0 | 1 | 2 | 0 | 3 |
| Hassas Veri Sizintisi | 1 | 1 | 4 | 3 | 9 |
| Yapilandirma/Baslik | 0 | 2 | 2 | 2 | 6 |
| Odeme Guvenligi | 0 | 0 | 3 | 0 | 3 |
| CSRF | 0 | 0 | 1 | 0 | 1 |
| **TOPLAM** | **3** | **8** | **15** | **5** | **31** |

---

## KRITIK SEVIYE

### 1. RLS Politikalari - Tum Satirlar Herkese Acik
- **Dosya:** `RLS_POLICIES.sql:132-206`
- **Kod:** `CREATE POLICY "athletes_select" ON athletes FOR SELECT TO anon, authenticated USING (true);`
- **Sorun:** `USING (true)` ifadesi, anon dahil TUM kullaniclara tum satirlara erisim veriyor. Anonim kullanici tum sporcularin kisisel bilgilerini (TC, telefon, e-posta) gorebilir.
- **Etki:** Kisisel veri sizintisi, KVKK ihlali.
- **Cozum:** `USING (org_id = current_user_org_id())` seklinde satirlari filtrele.

### 2. Supabase Anon Key Client-Side Kodda Acik
- **Dosya:** `script.js:93-95`, `script-fixes.js:1355-1373`
- **Kod:** `anonKey: 'eyJhbGciOiJIUzI1NiIs...'`
- **Sorun:** JWT anon key acikca gorunuyor. RLS `USING (true)` oldugu icin bu key ile herkes tum verilere erisebilir.
- **Etki:** Tam veritabani erisimi.
- **Cozum:** RLS politikalarini duzelt, anon key'i environment variable'a tasi.

### 3. Plaintext Sifre Saklama
- **Dosya:** `script.js:510, 597, 2225`
- **Kod:** `spPass: r.sp_pass`
- **Sorun:** Sifreler veritabaninda duz metin olarak saklaniyor.
- **Etki:** Veritabani ihlalinde tum hesaplar ele gecirilir.
- **Cozum:** bcrypt/argon2 ile hash'le.

---

## YUKSEK SEVIYE

### 4. Varsayilan Sifre: TC Son 6 Hane
- **Dosya:** `script.js:1997`, `RLS_POLICIES.sql:259`
- **Kod:** `const pass = String(plainPassword || athlete?.spPass || tc.slice(-6)).trim();`
- **Sorun:** TC kimlik numarasinin son 6 hanesi varsayilan sifre. TC numaralari kamuya acik, kolayca tahmin edilebilir.
- **Cozum:** Rastgele sifre uret ve kullaniciya ilk giriste degistirt.

### 5. Client-Side Yetkilendirme Bypass
- **Dosya:** `script-fixes.js:701, 736, 760`
- **Kod:** `var isAdmin = AppState.currentUser && AppState.currentUser.role === 'admin';`
- **Sorun:** Yetki kontrolleri tamamen client-side. Tarayici konsolundan `AppState.currentUser.role = 'admin'` ile bypass edilebilir.
- **Cozum:** Tum yetki kontrollerini Supabase RLS ve Edge Functions ile server-side yap.

### 6. IDOR - Sahiplik Kontrolu Eksik
- **Dosya:** `script-fixes.js:2073-2086`
- **Kod:** `await sb.from('athletes').delete().eq('id', athleteId);`
- **Sorun:** Silme/duzenleme islemlerinde kullanicinin o kaydın sahibi olup olmadigi kontrol edilmiyor.
- **Cozum:** Server-side org_id/branch_id kontrolu ekle.

### 7. CSP'de unsafe-inline Izni
- **Dosya:** `vercel.json:34`
- **Kod:** `"script-src 'self' 'unsafe-inline' ..."`
- **Sorun:** XSS saldirilarina kapi aciyor.
- **Cozum:** Nonce veya hash bazli CSP kullan, unsafe-inline kaldir.

### 8. CDN Kaynaklari SRI Hash Olmadan Yukleniyor
- **Dosya:** `init.js:10-14`, `index.html:35`
- **Sorun:** integrity hash olmadan CDN kaynaklari yukleniyor. CDN ele gecirilirse zararli kod enjekte edilebilir.
- **Cozum:** Tum harici script'lere `integrity="sha384-..."` ekle.

### 9. onclick Handler'larda XSS Riski
- **Dosya:** `script-fixes.js:705-777`
- **Kod:** `'<button onclick="delAth(\'' + a.id + '\')">'`
- **Sorun:** ID'ler escape edilmeden onclick handler'lara ekleniyor.
- **Cozum:** data-* attribute'lari ve event delegation kullan.

---

## ORTA SEVIYE

### 10. CSRF Korumasi Yok
- **Dosya:** Tum state-changing operasyonlar
- **Sorun:** Odeme onaylama, sporcu silme, kayit ekleme islemlerinde CSRF token yok.
- **Cozum:** SameSite cookie + CSRF token implementasyonu.

### 11. Zayif HTML Escape Fonksiyonu
- **Dosya:** `script-fixes.js:124`
- **Kod:** `function _escHtml(str) { return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }`
- **Sorun:** `"` ve `'` escape edilmiyor. HTML attribute context'inde XSS'e acik.
- **Cozum:** `&quot;` ve `&#39;` escape'lerini ekle.

### 12. WhatsApp API Rate Limiting Yok
- **Dosya:** `script-fixes.js:383-407`
- **Sorun:** Toplu mesaj gonderiminde limit yok. Kotuye kullanilabilir.
- **Cozum:** Kullanici bazli rate limit ve kuyruk sistemi ekle.

### 13. Odeme Tutarinda Maximum Limit Yok
- **Dosya:** `script-fixes.js:3839-3846`
- **Sorun:** Sadece pozitif kontrol var, ust limit veya ondalik dogrulamasi yok.
- **Cozum:** Makul ust limit ve ondalik hassasiyeti kontrolu ekle.

### 14. localStorage'da Hassas Veri
- **Dosya:** `script.js:886-888`
- **Sorun:** Kullanici oturumu, orgId, branchId localStorage'da acik metin. XSS ile calinabilir.
- **Cozum:** sessionStorage kullan, hassas verileri saklamaktan kacin.

### 15. Base64 Sifreleme Degil
- **Dosya:** `ui-improvements.js:324-325`
- **Sorun:** localStorage verileri base64 ile "kodlaniyor" ama bu sifreleme degil.
- **Cozum:** Hassas veriler icin gercek sifreleme kullan veya saklamaktan kacin.

### 16. Debug Panel Production'da Eriselebilir
- **Dosya:** `Security.js:18-21`
- **Kod:** `var isDebugMode = window.location.search.includes('_dbg=dragos_dev_panel')`
- **Sorun:** URL parametresi ile debug panel acilebiliyor.
- **Cozum:** Production'da tamamen devre disi birak.

### 17. Zayif ID Uretimi (Fallback)
- **Dosya:** `script.js:244-259`
- **Sorun:** Crypto API yoksa `Math.random()` ile tahmin edilebilir ID uretiyor.
- **Cozum:** Crypto API zorunlu yap veya server-side ID uretimi kullan.

### 18. Odeme Siparis ID'si URL'de Acik
- **Dosya:** `script-fixes.js:1344-1345`
- **Sorun:** Order ID URL parametresi olarak gonderiliyor.
- **Cozum:** Server-side session'da sakla.

### 19. on_kayitlar KVKK Onay Mantik Hatasi
- **Dosya:** `RLS_POLICIES.sql:203-205`
- **Sorun:** Anonim kullanici baskalarinin KVKK onayini degistirebilir.
- **Cozum:** Kimlik dogrulamali onay mekanizmasi ekle.

### 20. Console'da Hassas Bilgi Sizintisi
- **Dosya:** `script-fixes.js:1391-1408`
- **Sorun:** PayTR token ve API yanitlari production konsolunda loglaniyor.
- **Cozum:** Production'da debug loglarini kaldir.

### 21. Global fetch() Override
- **Dosya:** `ui-improvements.js:168-180`
- **Sorun:** Global fetch fonksiyonu override ediliyor, hata gizlenmesine yol acabilir.
- **Cozum:** Wrapper fonksiyon kullan, global override yapma.

### 22. WhatsApp API Token Duz Metin
- **Dosya:** `script.js:3798`
- **Sorun:** API token veritabaninda ve arayuzde duz metin.
- **Cozum:** Token'i server-side sakla, client'a gosterme.

### 23. Oturum Yaris Durumu
- **Dosya:** `Security.js:213-219`
- **Sorun:** Eszamanli login denemelerinde karisik oturum durumu olusabilir.
- **Cozum:** Login islemini mutex/lock ile koru.

### 24. Odeme Webhook Dogrulamasi Eksik
- **Dosya:** `script.js:4782-4783`
- **Sorun:** PayTR webhook'lari HMAC imza dogrulamasi yapilmiyor.
- **Cozum:** Server-side HMAC dogrulama ekle.

---

## DUSUK SEVIYE

### 25. Error Handler Bilgi Sizintisi
- **Dosya:** `error-handler.js:14-20`
- **Sorun:** Stack trace ve dosya yollari konsola yaziliyor.

### 26. robots.txt Tum Path'lere Izin Veriyor
- **Dosya:** `robots.txt`
- **Sorun:** SPA icin gereksiz yere tum path'ler indexlemeye acik.

### 27. Service Worker Offline Yaniti
- **Dosya:** `sw.js:87-90`
- **Sorun:** Uygulama yapisini ifsa ediyor.

### 28. Supabase Hata Mesajlari Kullaniciya Gosteriliyor
- **Dosya:** `script-fixes.js:963-975`
- **Sorun:** Tablo/kolon adlari hata mesajlarinda gorunuyor.

### 29. Logo URL'lerde HTTP Izni
- **Dosya:** `script.js:1146-1155`
- **Sorun:** HTTP (sifresiz) baglantilara izin veriliyor.

---

## ONCELIKLI AKSIYON PLANI

### Asama 1 - Acil (1-3 gun)
1. RLS politikalarini duzelt - `USING (true)` yerine org_id bazli filtreleme
2. Plaintext sifreleri hash'le (bcrypt/argon2)
3. Debug panel'i production'dan kaldir
4. Console'daki hassas logları temizle

### Asama 2 - Kisa Vadeli (1-2 hafta)
5. Server-side yetkilendirme (Edge Functions)
6. CSP'den unsafe-inline kaldir
7. CDN kaynaklarina SRI hash ekle
8. _escHtml fonksiyonunu guncelle (quote escape)
9. onclick handler'lari data-attribute'a tasi

### Asama 3 - Orta Vadeli (2-4 hafta)
10. CSRF token implementasyonu
11. WhatsApp API rate limiting
12. Odeme dogrulama guclendir
13. localStorage kullanimi azalt
14. Varsayilan sifre mekanizmasini degistir

### Asama 4 - Uzun Vadeli (1-2 ay)
15. Tam server-side API katmani (Edge Functions)
16. Penetrasyon testi
17. KVKK uyumluluk denetimi
18. Otomatik guvenlik taramasi (CI/CD)
