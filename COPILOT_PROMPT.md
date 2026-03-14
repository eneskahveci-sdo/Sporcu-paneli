# 🛡️ Sporcu Paneli — Güvenlik & Kod Kalitesi Düzeltme Talimatları

> Bu doküman, projenin kapsamlı kod incelemesi sonucu tespit edilen sorunları ve çözüm talimatlarını içerir.
> GitHub Copilot Agent (Claude Opus 4.6) bu talimatları sırasıyla uygulayacaktır.

---

## 🔴 KRİTİK 1: RLS Politikaları Tamamen Açık — Tüm Veriler Herkese Açık

### Sorun
`RLS_POLICIES.sql` dosyasındaki TÜM politikalar `USING (true)` ile tanımlanmış. Bu, anon key ile herhangi birinin tarayıcı konsolundan tüm tabloları (athletes, payments, settings, coaches vb.) okuyabileceği, yazabileceği ve silebileceği anlamına gelir. Özellikle `settings` tablosunda NetGSM şifresi ve PayTR merchant key/salt gibi hassas bilgiler var.

### Yapılacaklar
`RLS_POLICIES.sql` dosyasını aşağıdaki mantığa göre yeniden yaz:

1. **settings tablosu**: Sadece `authenticated` role erişebilsin (SELECT, UPDATE). anon erişimi tamamen kapalı olsun.
2. **users tablosu**: Sadece `authenticated` role erişebilsin.
3. **athletes, payments, coaches, attendance, classes, sports, messages tabloları**:
   - SELECT: `authenticated` role için `org_id = (auth.jwt() ->> 'org_id')::uuid` kontrolü yap. anon için sadece `login_with_tc` SECURITY DEFINER fonksiyonu üzerinden erişilebilsin.
   - INSERT/UPDATE/DELETE: Sadece `authenticated` role.
4. **branches, orgs tabloları**: SELECT herkese açık kalabilir (login ekranında gerekli), INSERT/UPDATE sadece `authenticated`.
5. `login_with_tc` fonksiyonu zaten `SECURITY DEFINER` olduğu için RLS'i bypass eder — sporcu/antrenör girişi bundan etkilenmez.
6. Anon role için tablolara doğrudan `GRANT SELECT, INSERT, UPDATE, DELETE` vermek yerine, sadece `GRANT SELECT ON branches, orgs` ve `GRANT EXECUTE ON FUNCTION login_with_tc` ver.

---

## 🔴 KRİTİK 2: Client-Side Fallback Login Kaldırılmalı

### Sorun
`Security.js` dosyasında `_clientSideLoginFallback()` fonksiyonu var (satır ~219-270). Bu fonksiyon RPC başarısız olduğunda devreye giriyor ve:
- `sb.from(table).select('*').eq('tc', tc)` ile sporcu/antrenör kaydını TÜM alanlarıyla (şifre dahil) tarayıcıya çekiyor
- Şifreyi tarayıcıda plaintext olarak karşılaştırıyor
- Bu, bir saldırganın network sekmesinden şifreleri görebileceği anlamına gelir

### Yapılacaklar
`Security.js` dosyasında:

1. `_clientSideLoginFallback()` fonksiyonunu tamamen sil.
2. `_securityDoNormalLogin()` fonksiyonundaki tüm fallback çağrılarını kaldır (satır ~346, 354, 360, 369, 380-390).
3. RPC hatası durumunda kullanıcıya şu mesajı göster: `"Giriş servisi geçici olarak kullanılamıyor. Lütfen birkaç dakika sonra tekrar deneyin veya yöneticiyle iletişime geçin."`
4. RPC hatasını `console.error` ile logla (debug için).
5. Eğer RPC fonksiyonu (`login_with_tc`) Supabase'de tanımlı değilse, bu durumu bir kez tespit edip kullanıcıya kalıcı bir uyarı göster.

---

## 🔴 KRİTİK 3: NetGSM SMS Gönderimi Frontend'den Yapılıyor

### Sorun
`script.js` satır ~4979'da SMS gönderimi doğrudan frontend'den yapılıyor:
```
https://api.netgsm.com.tr/sms/send/get/?usercode=X&password=Y&gsmno=Z&message=M
```
NetGSM kullanıcı adı ve şifresi tarayıcı Network sekmesinde açıkça görülebilir.

### Yapılacaklar

1. Yeni bir Supabase Edge Function oluştur: `supabase/functions/send-sms/index.ts`
   - Request body: `{ phone, message }`
   - NetGSM credentials'ı Supabase environment variables'dan oku (`Deno.env.get()`)
   - NetGSM API'ye sunucu tarafından istek at
   - CORS header'ları ekle
   - Rate limiting ekle (IP başına dakikada max 5 SMS)

2. `script.js`'teki `sendOnKayitSms()` fonksiyonunu güncelle:
   - Doğrudan NetGSM URL'si yerine `sb.functions.invoke('send-sms', { body: { phone, message } })` kullan
   - NetGSM credentials'ı frontend kodundan tamamen kaldır

3. `script.js`'teki diğer SMS gönderim noktalarını da aynı şekilde güncelle.

4. `settings` tablosundan `netgsm_user`, `netgsm_pass` alanlarını frontend'de gösterme. Ayarlar sayfasında bu alanları "••••••" olarak maskele, sadece güncelleme yapılabilsin.

---

## 🔴 KRİTİK 4: PayTR Merchant Bilgileri Frontend'de Açıkta

### Sorun
`paytrMerchantId`, `paytrMerchantKey`, `paytrMerchantSalt` değerleri `settings` tablosundan okunuyor ve AppState'te tutuluyor. RLS açık olduğu için herkes bu değerlere erişebilir.

### Yapılacaklar

1. PayTR token hesaplaması zaten Edge Function'da yapılıyor (`paytr-token`) — bu iyi.
2. Ancak `settings` tablosundaki PayTR alanlarını frontend'den okumayı durdur.
3. PayTR credentials'ı sadece Supabase environment variables'da tut.
4. `script.js`'teki settings mapper'dan (`satır ~630-633`) PayTR alanlarını kaldır.
5. Ayarlar sayfasındaki PayTR alanlarını kaldır veya sadece "PayTR aktif/pasif" toggle'ı bırak — key/salt gösterilmesin.

---

## 🟠 ORTA 5: Service Worker Hassas Veri Cache'liyor

### Sorun
`sw.js` satır ~54-65'te Supabase API yanıtları cache'leniyor. Bu, hassas verilerin (sporcu TC'leri, ödeme bilgileri) cihazın cache storage'ında kalması demek.

### Yapılacaklar
`sw.js` dosyasında:

1. Supabase API cache'ini tamamen kaldır VEYA
2. Sadece public endpoint'leri cache'le (branches, orgs, sports, classes).
3. `athletes`, `payments`, `coaches`, `settings`, `users`, `attendance` tablolarına ait istekleri ASLA cache'leme.
4. Şu şekilde bir URL kontrolü ekle:
```javascript
var sensitiveEndpoints = ['athletes', 'payments', 'coaches', 'settings', 'users', 'attendance'];
var isSensitive = sensitiveEndpoints.some(function(ep) {
    return url.pathname.includes(ep) || url.search.includes(ep);
});
if (isSensitive) {
    // Cache'leme, doğrudan network'ten dön
    event.respondWith(fetch(event.request));
    return;
}
```

---

## 🟠 ORTA 6: window.onerror Hataları Yutarak Gizliyor

### Sorun
`script.js` satır 6-9'da:
```javascript
window.onerror = function(msg, url, line, col, error) {
    console.error('Global Error:', { msg, url, line, col, error });
    return true; // ← Bu, hatanın tarayıcı konsolunda görünmesini engelliyor
};
```

### Yapılacaklar
1. `return true;` satırını `return false;` olarak değiştir — hatalar konsolda görünsün.
2. Hataları bir error tracking servisine gönder (opsiyonel ama önerilir).
3. Kullanıcıya genel bir hata toast'u göster:
```javascript
window.onerror = function(msg, url, line, col, error) {
    console.error('Global Error:', { msg, url, line, col, error });
    if (typeof toast === 'function') {
        toast('Beklenmeyen bir hata oluştu. Sayfa yenilenebilir.', 'e');
    }
    return false;
};
```

---

## 🟠 ORTA 7: Şifreler Plaintext Olarak Saklanıyor

### Sorun
`sp_pass` ve `coach_pass` alanları veritabanında düz metin olarak saklanıyor. Varsayılan şifre TC'nin son 6 hanesi — bu kolayca tahmin edilebilir.

### Yapılacaklar

1. `login_with_tc` RPC fonksiyonunu güncelle:
   - Giriş başarılı olduğunda, eğer şifre plaintext ise otomatik olarak SHA-256 hash'ine dönüştür:
   ```sql
   -- Başarılı giriş sonrası, eğer şifre plain text ise hash'le
   IF length(v_stored) < 64 OR v_stored !~ '^[0-9a-f]{64}$' THEN
       UPDATE athletes SET sp_pass = encode(digest(p_pass, 'sha256'), 'hex') WHERE tc = p_tc;
   END IF;
   ```
2. Bu, mevcut kullanıcıların bir sonraki girişlerinde şifrelerinin otomatik hash'lenmesini sağlar.
3. Yeni sporcu/antrenör eklerken şifreyi her zaman hash'lenmiş olarak kaydet.

---

## 🟡 PERFORMANS 8: Tüm CSS index.html İçinde Inline

### Sorun
~16 KB CSS kodu `index.html` içindeki `<style>` tag'inde. Bu, tarayıcının CSS'i ayrı olarak cache'lemesini engelliyor. Her sayfa yüklemesinde CSS tekrar parse ediliyor.

### Yapılacaklar
1. `index.html` içindeki `<style>...</style>` bloğunun tamamını `style.css` dosyasına taşı.
2. `index.html`'e `<link rel="stylesheet" href="/style.css"/>` ekle.
3. `sw.js`'teki `STATIC_ASSETS` listesine `/style.css` zaten var, bu iyi.
4. Mevcut `style.css` dosyasındaki placeholder yorumları kaldır.

---

## 🟡 PERFORMANS 9: script.js 5365 Satır — Modüllere Bölünmeli

### Sorun
Tüm uygulama mantığı tek dosyada (234 KB). Bu:
- İlk yükleme süresini artırır
- Bakımı zorlaştırır
- Tarayıcı parse süresini uzatır

### Yapılacaklar (Uzun Vadeli)
Dosyayı mantıksal modüllere böl. Önerilen yapı:
```
/js/
  config.js        — SUPABASE_CONFIG, AppState, i18n, StorageManager
  utils.js         — DateUtils, FormatUtils, generateId, sha256
  ui.js            — UIUtils, ToastManager, modal, theme, lang
  auth.js          — doLogin, doNormalLogin, doLogout, switchLoginTab
  db.js            — DB modülü (supaGet, supaUpsert, mappers)
  pages/
    dashboard.js   — pgDashboard
    athletes.js    — pgAthletes, profil detay
    payments.js    — pgPayments, ödeme yap
    attendance.js  — pgAttendance
    coaches.js     — pgCoaches
    settings.js    — pgSettings
    sms.js         — pgSms
    accounting.js  — pgAccounting
    sports.js      — pgSports
    classes.js     — pgClasses
    onkayit.js     — pgOnKayit, ön kayıt formu
  sporcu-portal.js — Sporcu/veli portal sayfaları
```
Her modül bir IIFE veya ES module olabilir. `index.html`'de script tag'lerini sırayla yükle.

---

## 🟡 KOD KALİTESİ 10: innerHTML Kullanımı Riskli Noktalar

### Sorun
`innerHTML` 50+ yerde kullanılıyor. Çoğunda `FormatUtils.escape()` uygulanmış (iyi), ama bazı yerlerde eksik veya riskli:
- `modal-body` (satır 326): Parametrik body alıyor
- `line 3902`: `dataUrl` doğrudan img src'ye ekleniyor (data URL injection riski düşük ama kontrol edilmeli)

### Yapılacaklar
1. Tüm `innerHTML` atamalarını tara. Kullanıcı girdisi içeren her yerde `FormatUtils.escape()` kullanıldığından emin ol.
2. `openModal()` fonksiyonunda `body` parametresinin güvenli kaynaktan geldiğini doğrula.
3. Mümkün olan yerlerde `textContent` kullan (sadece metin atanıyorsa).
4. `removeAdmin()` fonksiyonundaki `onclick` handler'da `u.id` değerini escape et — şu an tek tırnak içinde ama UUID formatı garanti değilse injection riski var.

---

## 🟡 KOD KALİTESİ 11: CSP'de `unsafe-inline` Var

### Sorun
Hem `vercel.json` hem `Security.js`'teki CSP'de `script-src 'unsafe-inline'` var. Bu, XSS saldırılarına karşı CSP'nin koruma gücünü büyük ölçüde azaltır.

### Yapılacaklar
1. Inline script'leri (`index.html` içindeki `<script>` bloğu) ayrı bir JS dosyasına taşı (örn: `init.js`).
2. Inline event handler'ları (`onclick="doLogin()"` gibi) JavaScript ile `addEventListener` olarak yeniden yaz.
3. Ardından `unsafe-inline`'ı CSP'den kaldır.
4. Eğer tamamen kaldırmak zor ise, en azından `nonce` tabanlı CSP'ye geç.

> **Not**: Bu değişiklik geniş kapsamlıdır. Önce diğer kritik düzeltmeleri yap, bunu en sona bırak.

---

## 🟢 DOĞRULAMA: Zaten İyi Olan Noktalar (Dokunma)

- ✅ `FormatUtils.escape()` 144 yerde kullanılmış — XSS koruması genel olarak iyi
- ✅ TC kimlik doğrulama algoritması doğru uygulanmış
- ✅ Brute force koruması var (5 deneme / 5 dk kilitleme)
- ✅ HSTS, X-Frame-Options, X-Content-Type-Options header'ları doğru
- ✅ `crypto.randomUUID()` tercih ediliyor, fallback var
- ✅ PWA desteği (manifest, SW, push notification) düzgün
- ✅ Supabase CDN fallback zinciri iyi düşünülmüş
- ✅ Tema (dark/light) ve dil (TR/EN) desteği var
- ✅ Mobil uyumluluk (safe-area, touch-action, viewport-fit) iyi

---

## 📋 UYGULAMA SIRASI

Aşağıdaki sırayla uygula. Her adımı tamamladıktan sonra commit at.

| Sıra | Kritiklik | Konu | Dosya(lar) |
|------|-----------|------|------------|
| 1 | 🔴 Kritik | RLS politikalarını kısıtla | `RLS_POLICIES.sql` |
| 2 | 🔴 Kritik | Client-side fallback login'i kaldır | `Security.js` |
| 3 | 🔴 Kritik | SMS gönderimini Edge Function'a taşı | `script.js`, yeni `supabase/functions/send-sms/index.ts` |
| 4 | 🔴 Kritik | PayTR credentials'ı frontend'den kaldır | `script.js` |
| 5 | 🟠 Orta | SW hassas veri cache'ini kapat | `sw.js` |
| 6 | 🟠 Orta | window.onerror düzelt | `script.js` |
| 7 | 🟠 Orta | Şifreleri hash'le | `RLS_POLICIES.sql` (login_with_tc güncelle) |
| 8 | 🟡 Düşük | CSS'i ayrı dosyaya taşı | `index.html`, `style.css` |
| 9 | 🟡 Düşük | innerHTML güvenlik taraması | `script.js` |
| 10 | 🟡 Düşük | unsafe-inline kaldır | `vercel.json`, `Security.js`, `index.html` |
| 11 | 🟡 Uzun vade | script.js'i modüllere böl | Tüm JS dosyaları |

---

## ⚠️ ÖNEMLİ NOTLAR

- Her değişiklikten sonra mevcut fonksiyonaliteyi test et (giriş, yoklama, ödeme, SMS).
- RLS değişikliklerini önce Supabase'in test ortamında dene.
- Edge Function'lar için `supabase secrets set NETGSM_USER=xxx NETGSM_PASS=xxx` komutunu çalıştır.
- `login_with_tc` fonksiyonu SECURITY DEFINER olduğu için RLS'ten etkilenmez — sporcu/antrenör girişi çalışmaya devam eder.
- Mevcut 284 commit geçmişinde hassas bilgi (API key vb.) varsa, `git filter-branch` veya `BFG Repo-Cleaner` ile temizle. Supabase anon key public-safe olsa da, NetGSM/PayTR bilgileri geçmişte commit edilmiş olabilir.
