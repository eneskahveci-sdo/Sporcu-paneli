# 🔧 Sporcu Paneli — Kapsamlı Güncelleme Promptu (Opus İçin)

> Bu promptu Claude Opus'a **tüm proje dosyalarınla birlikte** ver. Opus her dosyayı okuyup aşağıdaki tüm düzeltmeleri tek seferde yapacak şekilde tasarlandı.

---

## PROMPT BAŞLANGICI

---

Sen deneyimli bir full-stack web geliştiricisisin. Aşağıda sana bir spor akademisi yönetim panelinin tüm kaynak kodunu veriyorum. Bu projeyi detaylı olarak analiz et ve aşağıda listelenen TÜM güncellemeleri yap.

## ⚠️ KRİTİK KURAL: GİRİŞ SİSTEMİNİ BOZMA!

Projede 3 ayrı giriş paneli var ve hepsi SORUNSUZ çalışmalı:

### Panel 1: Sporcu / Veli Girişi
- **Input:** `ls-tc` (TC), `ls-pass` (şifre)
- **Buton:** [doNormalLogin('sporcu')](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#784-951)
- **Akış:** [Security.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js) → [_securityDoNormalLogin('sporcu')](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js#219-463) → Supabase RPC `login_with_tc(tc, pass, 'sporcu')` → `athletes` tablosundan kayıt döner → `AppState.currentSporcu` set edilir → sporcu portalı (`#sporcu-portal`) gösterilir → [spTab('profil')](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js#15-47) çağrılır
- **Oturum:** `StorageManager.set('sporcu_app_sporcu', {...})` ile `localStorage`'a kaydedilir
- **Varsayılan Şifre:** TC'nin son 6 hanesi (veya `sp_pass` alanında özel şifre varsa o)

### Panel 2: Antrenör Girişi
- **Input:** `lc-tc` (TC), `lc-pass` (şifre)
- **Buton:** [doNormalLogin('coach')](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#784-951)
- **Akış:** [Security.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js) → [_securityDoNormalLogin('coach')](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js#219-463) → Supabase RPC `login_with_tc(tc, pass, 'coach')` → `coaches` tablosundan kayıt döner → `AppState.currentUser = { role: 'coach' }` set edilir → `#wrap` gösterilir (yönetim paneli) → [loadBranchData()](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#1255-1325) çağrılır → [go('attendance')](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js#633-695) ile yoklama sayfası açılır
- **Oturum:** `StorageManager.set('sporcu_app_user', {...})`
- **Yetki:** Antrenörler sporcu ekleyebilir ama ücret düzenleyemez (`isCoach` kontrolü [editAth](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#2315-2576) içinde)

### Panel 3: Yönetici (Admin) Girişi
- **Input:** [le](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#63-73) (email), `lp` (şifre)
- **Buton:** [doLogin()](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#952-1101)
- **Akış:** [script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js) → [doLogin()](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#952-1101) → `supabase.auth.signInWithPassword()` → Supabase Auth ile doğrulama → [loadBranchData()](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#1255-1325) → [go('dashboard')](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js#633-695)
- **Oturum:** Supabase Auth session (JWT token)

### Oturum Geri Yükleme (Session Restore)
- [restoreSession()](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#1102-1198) → önce `sporcu_app_sporcu` kontrol → sonra `sporcu_app_user` (coach) → sonra `supabase.auth.getSession()` (admin)
- Her giriş türü için ayrı UI gösterilir

### doNormalLogin Override Zinciri (BUNA ÇOK DİKKAT ET!)
1. [script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js) → [doNormalLogin](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#784-951) ilk tanım (client-side fallback ile)
2. [Security.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js) → [_securityDoNormalLogin](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js#219-463) ile override. DOMContentLoaded+200ms'de tekrar override
3. Yükleme sırası: [script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js) → [script-fixes.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js) → [ui-improvements.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/ui-improvements.js) → [Security.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js) → [pwa-register.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/pwa-register.js)

**UYARI:** [Security.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js) en son yükleniyor ve DOMContentLoaded'dan 200ms sonra [doNormalLogin](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#784-951)'i tekrar override ediyor. Bu override'ı değiştirirken veya kaldırırken GİRİŞ AKIŞINI TEST ET!

### Supabase RPC: `login_with_tc` (RLS_POLICIES.sql)
- SECURITY DEFINER — RLS'yi bypass eder
- Şifre kontrol sırası: (1) Düz metin (özel veya varsayılan) → (2) SHA-256 hash → (3) Özel şifre eşleşmezse varsayılan TC son 6 hane
- Başarılı girişte plaintext şifre otomatik SHA-256'ya çevrilir

### RLS Poliçeleri
- `anon` role: Tüm tablolara SELECT (sporcu paneli için, `users` hariç) + `login_with_tc` EXECUTE
- `authenticated` role: Tam CRUD erişimi
- `anon` role yazma yapamaz (INSERT/UPDATE/DELETE engelli)

---

## 📋 YAPILACAK GÜNCELLEMELER

Aşağıdaki her güncellemeyi sırasıyla uygula. Her değişikliğin giriş akışını bozmadığından emin ol.

---

### 1. Client-Side Login Fallback'i Kaldır
**Dosya:** [script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js) (satır ~723-827)

[_clientSideLoginFallback](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#742-783) fonksiyonunu ve onun çağrıldığı yerleri tamamen kaldır. Bu fonksiyon tarayıcıda şifre doğrulaması yapıyor (güvensiz). [Security.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js)'teki [_securityDoNormalLogin](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js#219-463) zaten RPC ile çalışıyor. [script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js)'teki orijinal [doNormalLogin](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#784-951) fonksiyonu da [_clientSideLoginFallback](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#742-783)'i referans almamalı.

**DİKKAT:** [Security.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js) zaten en son yükleniyor ve [doNormalLogin](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#784-951)'i override ediyor. [script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js)'teki ilk tanımı da güvenli hale getir (sadece RPC kullansın). Eğer RPC başarısız olursa (fonksiyon bulunamadı vs.), kullanıcıya "Giriş servisi yapılandırılmamış" hata mesajı göster, client-side fallback'e DÜŞMESİN.

---

### 2. doNormalLogin Override Karmaşasını Temizle
**Dosyalar:** [script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js), [Security.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js)

[script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js)'teki [doNormalLogin](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#784-951) fonksiyonunu basitleştir — sadece [Security.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js)'teki güvenli RPC login'e yönlendirsin. Bu şekilde Security.js yüklenmese bile temel bir çalışma garantisi sağlanmış olur. Security.js'teki DOMContentLoaded override'ını (satır 470-477) koru çünkü script yükleme sırası farklı olabilir.

---

### 3. [go()](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js#633-695) Fonksiyonu Override Karmaşasını Temizle
**Dosyalar:** [script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js), [script-fixes.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js), [ui-improvements.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/ui-improvements.js)

[go()](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js#633-695) fonksiyonu 3 yerde override ediliyor:
1. [script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js) → Orijinal tanım (satır ~1460-1500)
2. [script-fixes.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js) → `_origGo` kaydedilip override (onkayit sayfası + legal + financial reporting ekleniyor)
3. [ui-improvements.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/ui-improvements.js) → Sayfa geçiş animasyonu ekleniyor
4. [script-fixes.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js) → WhatsApp ayarları için YİNE override ediliyor (satır ~971)

Tüm bu override'ları tek bir noktada birleştir. [script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js)'teki [go()](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js#633-695) fonksiyonuna middleware/hook sistemi ekle:

```javascript
// script.js'te
const _goHooks = { before: [], after: [] };
window.registerGoHook = function(phase, fn) { _goHooks[phase].push(fn); };

function go(page, params) {
    // Before hooks
    for (const hook of _goHooks.before) {
        const result = hook(page, params);
        if (result === false) return; // Hook engelleyebilir
    }
    
    // Ana navigate logic
    // ... mevcut kod ...
    
    // After hooks
    for (const hook of _goHooks.after) {
        hook(page, params);
    }
}
```

Sonra [script-fixes.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js) ve [ui-improvements.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/ui-improvements.js)'te hook olarak kaydet. Override yerine hook kullan.

---

### 4. `var` → `let/const` Dönüşümü
**Dosyalar:** [script-fixes.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js), [Security.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js)

Tüm `var` kullanımlarını uygun [let](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#496-517) veya `const` ile değiştir. Özellikle [Security.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js)'teki rate limit fonksiyonları ve [script-fixes.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js)'teki tüm fonksiyonlar.

---

### 5. [checkOverdue()](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#1518-1527) Fonksiyonuna `await` Ekle
**Dosya:** [script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js) (satır ~1518-1526)

```javascript
// Eski (hatalı)
function checkOverdue() {
    AppState.data.payments.forEach(p => {
        if (p.st === 'pending' && p.dt && p.dt < today) {
            p.st = 'overdue';
            DB.upsert('payments', DB.mappers.fromPayment(p)); // await yok!
        }
    });
}

// Yeni (düzeltilmiş)
async function checkOverdue() {
    const today = DateUtils.today();
    const overdueList = AppState.data.payments.filter(
        p => p.st === 'pending' && p.dt && p.dt < today
    );
    
    for (const p of overdueList) {
        p.st = 'overdue';
        try {
            await DB.upsert('payments', DB.mappers.fromPayment(p));
        } catch (err) {
            console.error('Overdue güncelleme hatası:', err);
        }
    }
}
```

---

### 6. [fetch()](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/ui-improvements.js#169-181) Override'ını Kaldır
**Dosya:** [ui-improvements.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/ui-improvements.js) (satır ~168-180)

`window.fetch` override'ını kaldır. Yerine `navigator.onLine` ve `online`/`offline` event listener'larını kullan:

```javascript
window.addEventListener('online', () => { /* bağlantı banner'ını kaldır */ });
window.addEventListener('offline', () => { /* offline banner göster */ });
```

---

### 7. Çift Animasyon Sorununu Düzelt
**Dosyalar:** [script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js), [ui-improvements.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/ui-improvements.js)

[script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js)'teki [go()](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js#633-695) fonksiyonundaki opacity geçişini kaldır. Animasyonu sadece [ui-improvements.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/ui-improvements.js)'teki hook üzerinden yap (3. maddedeki hook sistemiyle):

```javascript
// ui-improvements.js'te
registerGoHook('before', function(page) {
    const main = document.getElementById('main');
    if (main) {
        main.classList.add('page-exit');
    }
});

registerGoHook('after', function(page) {
    const main = document.getElementById('main');
    if (main) {
        requestAnimationFrame(() => {
            main.classList.remove('page-exit');
            main.classList.add('page-enter');
            setTimeout(() => main.classList.remove('page-enter'), 300);
        });
    }
});
```

---

### 8. `meta description` Ekle
**Dosya:** [index.html](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/index.html)

`<head>` bölümüne ekle:
```html
<meta name="description" content="Dragos Futbol Akademisi - Sporcu kayıt, ödeme takibi ve yoklama yönetim sistemi" />
```

---

### 9. Belgeler Bölümünü "Yakında" Olarak İşaretle
**Dosya:** [script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js) (satır ~1852-1880 civarı, [pgAthleteProfile](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#1617-1883) içindeki `tab-documents` bölümü)

Sahte belge kartlarını kaldır, yerine:
```html
<div class="empty-state" style="padding:40px;text-align:center">
    <div style="font-size:48px;margin-bottom:12px">📁</div>
    <div class="tw6">Belge Yönetimi Yakında</div>
    <div class="ts tm mt1">Sağlık raporu, kimlik ve lisans belgelerini yükleyebileceksiniz.</div>
</div>
```

---

### 10. `console.log/warn/error` Override'ını Güvenli Hale Getir
**Dosya:** [Security.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js) (satır ~88-96)

Mevcut override'ı sadece debug modda aktif olacak şekilde düzenle ve orijinal fonksiyonları her zaman çağır:

```javascript
const _origConsoleLog = console.log;
const _origConsoleWarn = console.warn;
const _origConsoleError = console.error;

if (window._dragosDebugMode) {
    // Debug panel'e yönlendirme sadece debug modda
    console.log = function(...args) {
        _origConsoleLog.apply(console, args);
        // debug panel ekleme kodu...
    };
    // warn ve error için de aynısı
}
```

---

### 11. `!important` Kullanımını Azalt
**Dosya:** [style.css](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/style.css)

CSS'i güzel girintilerle (prettify et) yeniden formatlayıp okunaklı hale getir. Mümkün olan `!important` kullanımlarını kaldır, yerine daha spesifik seçiciler kullan. Özellikle:
- `.dn { display: none !important; }` → Bunu koru (utility class)
- Diğerlerini mümkünse spesifik seçicilerle değiştir

---

### 12. HTML'i Okunabilir Hale Getir
**Dosya:** [index.html](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/index.html)

70-71. satırlardaki binlerce karakterlik tek satırlık HTML'i düzgün girintilerle (2 space indent) yeniden formatla. Her HTML elemanı kendi satırında olsun. İçerik aynı kalacak, sadece formatlama değişecek.

---

### 13. Service Worker Hata Yönetimini İyileştir
**Dosya:** [sw.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/sw.js)

Boş `catch` bloklarını düzelt:
```javascript
// Eski
cache.addAll(STATIC_ASSETS).catch(function() {});

// Yeni
cache.addAll(STATIC_ASSETS).catch(function(err) {
    console.warn('[SW] Cache addAll hatası:', err);
});
```

---

### 14. CSP (Content Security Policy) Çakışmasını Düzelt
**Dosyalar:** [Security.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js), [vercel.json](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/vercel.json)

[Security.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js)'teki CSP meta tag'ı kaldır. CSP'yi SADECE [vercel.json](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/vercel.json)'daki header üzerinden tanımla. [vercel.json](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/vercel.json)'daki CSP header'ını [Security.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js)'teki comprehensive CSP ile güncelle (ikisinin birleşimi).

---

### 15. manifest.json İkon Düzeltmesi
**Dosya:** [manifest.json](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/manifest.json)

`data:image/svg+xml` ikonunu çıkar. Yerine gerçek dosya ikonları kullan. İkon dosyalarını oluşturmana gerek yok, sadece path'leri güncelle:
```json
{
    "icons": [
        { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
        { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
    ]
}
```

> Not: İkon dosyaları henüz yoksa, mevcut SVG data URI'yi bir `icon.svg` dosyasına çıkar ve hem PNG hem SVG referansı ver.

---

### 16. [switchProfileTab](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#1980-2004) Fonksiyonunu Düzelt
**Dosya:** [script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js) (satır ~1980-2003)

Tab eşleşmesi `textContent` ile yapılıyor, bu i18n ile sorun çıkarır. `data-tab` attribute kullan:

```javascript
window.switchProfileTab = function(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    // ...
};
```

Ve profil sayfasındaki tab butonlarına `data-tab` ekle:
```html
<button class="tab-btn active" data-tab="overview" onclick="switchProfileTab('overview')">Genel Bakış</button>
```

---

### 17. localStorage Hassas Veri Güvenliği
**Dosya:** [script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js), [Security.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js)

`StorageManager.set('sporcu_app_sporcu', ...)` çağrısında `spPass` alanını **kaydetme**:

```javascript
// Security.js'te sporcu login sonrası
const sessionData = {
    user: { ...AppState.currentSporcu, spPass: undefined }, // şifreyi kaldır
    orgId: AppState.currentOrgId,
    branchId: AppState.currentBranchId
};
StorageManager.set('sporcu_app_sporcu', sessionData);
```

Aynı şekilde coach için de `coach_pass` alanını localStorage'a kaydetme.

---

### 18. `on_kayitlar` Tablosu İçin anon INSERT İzni
**Dosya:** [RLS_POLICIES.sql](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/RLS_POLICIES.sql)

Şu an `anon` role tablolara yazma yapamıyor. Ama [showOnKayitForm()](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js#869-883) giriş YAPMADAN ön kayıt oluşturuyor. Bunun için `on_kayitlar` tablosuna `anon` INSERT izni ver:

```sql
-- on_kayitlar tablosu (ön kayıt formu — anonim kullanıcılar doldurabilir)
CREATE POLICY "on_kayitlar_select" ON on_kayitlar FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "on_kayitlar_insert" ON on_kayitlar FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "on_kayitlar_update" ON on_kayitlar FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "on_kayitlar_delete" ON on_kayitlar FOR DELETE TO authenticated USING (true);

GRANT SELECT, INSERT ON on_kayitlar TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON on_kayitlar TO authenticated, service_role;
```

---

### 19. WhatsApp Token'ını Frontend'den Kaldır
**Dosya:** [script-fixes.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js)

WhatsApp API token'ı frontend'de saklanmamalı. WhatsApp mesaj gönderimi için Supabase Edge Function kullan. Frontend'den sadece "mesaj gönder" isteği at, token backend'de kalsın. Eğer bu çok büyük bir değişiklikse, en azından token'ı `type="password"` input'ta göster (bu zaten yapılmış) ve ayarları kaydederken token'ı değil sadece aktif/pasif durumunu ve phone_id'yi frontend state'inde tut.

---

### 20. Sporcu Portalı Tab Geçişi Düzeltmesi
**Dosya:** [script-fixes.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js)'teki [spTab](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js#15-47) fonksiyonu

Mevcut düzeltme `data-tab` attribute kullanıyor (iyi). Kontrol et ki [script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js)'teki orijinal [spTab](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js#15-47) fonksiyonu da `data-tab` ile çalışıyor. Yoksa [script-fixes.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js)'teki override'ın düzgün çalıştığından emin ol.

---

### 21. [_extendMappers](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js#1054-1106) Retry Mekanizmasını Basitleştir
**Dosya:** [script-fixes.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js) (satır ~1054-1121)

5 farklı setTimeout yerine tek bir `setInterval` kullan, max 10 deneme ile:

```javascript
function _extendMappers() { /* ... mevcut kod ... */ }

if (!_extendMappers()) {
    let attempts = 0;
    const interval = setInterval(() => {
        if (_extendMappers() || ++attempts >= 10) {
            clearInterval(interval);
            if (attempts >= 10 && !window._mappersExtended) {
                console.error('DB.mappers extend başarısız — 10 deneme tükendi!');
            }
        }
    }, 200);
}
```

---

### 22. Sporcu Portalı Ödeme Bildirimi (anon INSERT Sorunu)
**Dosya:** [script-fixes.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js)'teki ödeme yapma fonksiyonları

Sporcu portalından ödeme bildirimi (nakit/havale) gönderildiğinde `payments` tablosuna INSERT yapılıyor. Ama `anon` role INSERT yapamaz (RLS engelliyor). Bu durumda:
- Ya bir Supabase Edge Function / RPC ile ödeme bildirimi gönder
- Ya da `payments` tablosuna `anon` INSERT izni ver (güvenlik riski!)

Önerilen: `submit_payment_notification` adında SECURITY DEFINER bir RPC fonksiyonu oluştur, [RLS_POLICIES.sql](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/RLS_POLICIES.sql)'e ekle. Bu fonksiyon sporcu TC'sini doğrulayıp `notif_status: 'pending_approval'` ile ödeme kaydı oluşturur.

---

## 🧪 TEST PROGRAMI

**Her değişiklikten sonra aşağıdaki senaryoları kontrol et:**

1. **Sporcu Girişi:** TC + son 6 hane şifre ile [doNormalLogin('sporcu')](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#784-951) → sporcu portalı açılmalı → profil, yoklama, ödemeler, ödeme yap sekmeleri çalışmalı
2. **Antrenör Girişi:** TC + şifre ile [doNormalLogin('coach')](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#784-951) → yönetim paneli açılmalı → yoklama sayfası gelmeli → sporcuları görebilmeli, düzenleyebilmeli (ücret hariç)
3. **Admin Girişi:** Email + şifre ile [doLogin()](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#952-1101) → yönetim paneli → dashboard gelmeli → tüm menüler çalışmalı
4. **Sayfa Geçişleri:** Tüm menü butonları ([go()](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js#633-695)) çalışmalı, animasyonlar düzgün olmalı
5. **Oturum Geri Yükleme:** Sayfa yenileme → son oturum geri gelmeli (sporcu, coach veya admin)
6. **Ön Kayıt Formu:** Giriş yapmadan "📝 Ön Kayıt" butonuna tıkla → form açılmalı → kayıt yapılabilmeli
7. **Sporcu Portal Tabları:** [spTab('profil')](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js#15-47), [spTab('yoklama')](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js#15-47), [spTab('odemeler')](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js#15-47), [spTab('odeme-yap')](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js#15-47) düzgün geçiş yapmalı
8. **Mobil Uyumluluk:** Responsive tasarım bozulmamalı
9. **Tema Değiştirme:** Light/dark mod düzgün çalışmalı

---

## 📁 PROJE DOSYA YAPISI

```
/
├── index.html          ← Ana HTML (79 satır, 70-71. satırlar çok uzun)
├── style.css           ← CSS (166 satır, minified)
├── script.js           ← Ana JS (5560 satır, TÜM mantık burada)
├── script-fixes.js     ← Düzeltmeler (1125 satır, override'lar)
├── ui-improvements.js  ← UI geliştirmeleri (379 satır)
├── Security.js         ← Güvenlik (478 satır, login override)
├── init.js             ← Supabase CDN yükleme (29 satır)
├── pwa-register.js     ← PWA kayıt (147 satır)
├── sw.js               ← Service Worker (140 satır)
├── manifest.json       ← PWA manifest
├── vercel.json         ← Vercel deployment config
├── RLS_POLICIES.sql    ← Supabase RLS politikaları (382 satır)
└── supabase/functions/ ← Edge Functions (varsa)
```

---

## SON NOT

- **Giriş akışını bozmak yasak.** Her 3 panel (sporcu, coach, admin) düzgün çalışmalı.
- Yükleme sırası: [init.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/init.js) → [script.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js) → [script-fixes.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js) → [ui-improvements.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/ui-improvements.js) → [Security.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js) → [pwa-register.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/pwa-register.js)
- [Security.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/Security.js) en son yüklenir ve [doNormalLogin](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#784-951)'i override eder. Bu override'ın korunması gerekiyor.
- [script-fixes.js](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script-fixes.js)'teki `DB.mappers` extend mekanizması önemli — [loadBranchData()](file:///var/home/enes/%C4%B0ndirilenler/Sporcu-paneli-main/Sporcu-paneli-main/script.js#1255-1325) çağrılmadan önce mappers hazır olmalı.
- Değişiklik yaparken Türkçe karakter desteğini (UTF-8) koru.
- Tüm toast mesajları ve UI metinleri Türkçe kalmalı.

---

## PROMPT SONU
