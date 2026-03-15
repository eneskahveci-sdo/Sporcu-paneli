# 🛠️ Dragos Futbol Akademisi — Düzeltme Promptu

Bu prompt sitedeki en kritik kod kalitesi ve güvenlik sorunlarını düzeltmek içindir.

> ⚠️ **ÖNEMLİ KURALLAR:**
> - Hiçbir düzeltme mevcut çalışan işlevselliği BOZAMAZ.
> - Her değişiklikten sonra şu 3 giriş akışı çalışmalıdır: **Admin girişi** (e-posta + şifre), **Sporcu girişi** (TC + şifre), **Antrenör girişi** (TC + şifre).
> - Sayfa navigasyonu (`go()` fonksiyonu) tüm sayfalar için çalışmalıdır: dashboard, athletes, athleteProfile, payments, accounting, attendance, coaches, sports, classes, settings, sms, onkayit.
> - PayTR entegrasyonuna dokunma — henüz anlaşma yapılmadı, API kodları sonradan Supabase Edge Function ile eklenecek. PayTR ile ilgili mevcut UI kodlarını (settings sayfasındaki PayTR kartı, ödeme yöntemi seçeneklerindeki PayTR seçeneği) olduğu gibi bırak.
> - Değişiklikleri küçük adımlarla yap, her adımda test et.

---

## Düzeltme 1 — `doNormalLogin` Tekrarını Temizle (GÜVENLİK)

**Neden güvenlik sorunu:**  
Şu an `doNormalLogin` fonksiyonu hem `script.js` (satır 745–908) hem `Security.js` (satır 204–462) içinde tanımlı. Script yükleme sırası değişirse veya Security.js yüklenmezse, eski güvensiz login yolu aktif kalabilir.

**Ne yapılacak:**
- `script.js` satır 745–908 arasındaki tüm `doNormalLogin` fonksiyonunu **sil**.
- Yerine sadece şu güvenli fallback'i koy:

```js
// doNormalLogin: Security.js tarafından tanımlanır (v5.0 — login_with_tc RPC).
// Security.js yüklenmezse kullanıcıya uyarı gösterilir.
window.doNormalLogin = function(role) {
    console.error('Security.js yüklenemedi!');
    var errId = role === 'coach' ? 'lc-err' : 'ls-err';
    var errEl = document.getElementById(errId);
    if (errEl) {
        errEl.textContent = 'Güvenlik modülü yüklenemedi. Sayfayı yenileyip tekrar deneyin.';
        errEl.classList.remove('dn');
    }
};
```

**⚠️ Dikkat:** `Security.js`'teki koda **hiç dokunma**. Sadece `script.js`'teki eski versiyonu temizliyorsun.

---

## Düzeltme 2 — `window.go()` Override Zincirini Birleştir (STABİLİTE)

**Neden sorun:**  
`go()` fonksiyonu 4 farklı dosyada üst üste override ediliyor. Herhangi bir dosyanın yükleme sırası değişirse tüm navigasyon bozulur.

**Ne yapılacak:**
`script.js`'teki `window.go()` fonksiyonunu (satır 1417–1470) genişleterek diğer dosyalardaki override'ları içine al:

1. `script.js`'teki `pages` nesnesine şu sayfaları ekle:
   - `accounting: pgAccountingV8` (script-fixes.js'ten)
   - `sms: pgSmsV8` (script-fixes.js'ten)
   - `onkayit: __renderOnKayit` (script-fixes.js'ten)

2. `athletes` sayfası için: `script-fixes.js`'teki `__renderAthletes()` fonksiyonunu `pgAthletes` yerine kullan.

3. Sayfa geçişine animasyon ekle (ui-improvements.js'ten):  
   `go()` içinde `main.innerHTML = pages[page]()` çağrısından **önce** `main.style.opacity = '0'`, **sonra** `setTimeout` ile `main.style.opacity = '1'` yap.

4. Settings sayfası için WhatsApp kartı enjeksiyonunu (script-fixes.js satır 971–1012) `pgSettings()` fonksiyonunun **return ettiği HTML'in sonuna** doğrudan ekle.

5. Tüm bu birleştirmeler `script.js`'te yapıldıktan sonra:
   - `script-fixes.js` satır 631–694'teki `go()` override bloğunu **sil**
   - `script-fixes.js` satır 970–1012'deki WhatsApp settings go() patch'ini **sil**
   - `ui-improvements.js` satır 186–202'deki `patchGoForAnimation()` fonksiyonunu **sil**

**⚠️ Dikkat:**
- `__renderAthletes()`, `__renderOnKayit()`, `pgAccountingV8()`, `pgSmsV8()` fonksiyonlarının kendilerine **dokunma**, sadece `go()` içinden çağır.
- `closeSide()` çağrısını unutma — her sayfa geçişinde sidebar kapanmalı.
- Antrenör rolü kısıtlamalarını koru — coach rolü `dashboard`, `payments`, `accounting`, `settings`, `sms`, `sports`, `classes` sayfalarına erişememelir.
- `athleteProfile` sayfasından sonra `initProfileTabs()` çağrısını koru.

---

## Düzeltme 3 — Ölü Kodu Temizle (KOD KALİTESİ)

**Ne yapılacak:**
- `script.js`'ten `sha256()` fonksiyonunu **sil** (satır 247–261). Hiçbir yerde kullanılmıyor, eski client-side doğrulamadan kalma.
- `script.js`'ten eski `pgAthletes()` fonksiyonunu **sil** (satır 2111–2257). `script-fixes.js`'teki `__renderAthletes()` bunun yerini alıyor.

**⚠️ Dikkat:** `sha256` fonksiyonunu kullanan başka bir yer olmadığından emin ol (`grep` ile kontrol et). Eğer bir yerde çağrılıyorsa silme.

---

## Düzeltme 4 — `loadCashTransfers` Zamanlamasını Düzelt (STABİLİTE)

**Neden sorun:**  
`script-fixes.js` satır 1019'da `restoreSession`'ın bitmesini "2 saniye bekle" diye tahmin ediyor. Yavaş 3G bağlantısında bu yetersiz kalır.

**Ne yapılacak:**
1. `script.js`'teki `loadBranchData()` fonksiyonunun sonuna (satır 1276, `checkOverdue()` çağrısından sonra) şunu ekle:
```js
// Kasa transferlerini de yükle
if (typeof loadCashTransfers === 'function') {
    try { await loadCashTransfers(); } catch(e) { console.warn('loadCashTransfers:', e); }
}
```

2. `script-fixes.js`'teki DOMContentLoaded bloğundan (satır 1017–1023) `loadCashTransfers` setTimeout çağrısını **sil**.

**⚠️ Dikkat:** `loadCashTransfers` fonksiyonunun kendisine dokunma, sadece çağrılma yerini değiştiriyorsun.

---

## ÖNCELİK SIRASI

| # | Düzeltme | Güvenlik mi? | Risk |
|---|----------|-------------|------|
| 1 | `doNormalLogin` temizleme | ✅ Evet — tek güvenli login yolu kalır | Düşük risk |
| 2 | `go()` birleştirme | ⚡ Stabilite — navigasyon daha sağlam | Orta risk (dikkatli test gerekir) |
| 3 | Ölü kod temizliği | 🧹 Temizlik | Çok düşük risk |
| 4 | `loadCashTransfers` zamanlama | ⚡ Stabilite — yavaş ağda çalışır | Düşük risk |

> **PayTR Notu:** PayTR dosyasına ve PayTR ile ilgili mevcut UI kodlarına (settings kartı, ödeme yöntemi seçenekleri) dokunma. PayTR API entegrasyonu sonradan Supabase Edge Function olarak eklenecek.

> **Test Kontrol Listesi:** Her düzeltmeden sonra şunları test et:
> 1. ✅ Admin girişi (e-posta + şifre) → Dashboard açılıyor mu?
> 2. ✅ Sporcu girişi (TC + son 6 hane) → Sporcu portalı açılıyor mu?
> 3. ✅ Antrenör girişi (TC + son 6 hane) → Yoklama sayfası açılıyor mu?
> 4. ✅ Tüm menü butonları çalışıyor mu? (Sporcular, Ödemeler, Finans, Yoklama, Ayarlar, SMS)
> 5. ✅ Sporcu portalındaki sekmeler çalışıyor mu? (Profil, Yoklama, Ödemeler, Ödeme Yap)
> 6. ✅ Ön Kayıt butonu giriş ekranında görünüyor mu?
