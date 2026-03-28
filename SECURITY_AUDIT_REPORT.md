# Sporcu Paneli - Kapsamli Guvenlik Analiz Raporu

**Tarih:** 2026-03-27
**Son Guncelleme:** 2026-03-28
**Analiz Kapsamı:** Tum proje dosyalari (script.js, script-fixes.js, index.html, vercel.json, Security.js, RLS_POLICIES.sql, migrations, sw.js, init.js, error-handler.js, event-handlers.js, ui-improvements.js, manifest.json)

---

## MEVCUT DURUM OZETI

| Kategori | Kritik | Yuksek | Orta | Dusuk | Toplam |
|----------|--------|--------|------|-------|--------|
| Veritabani/RLS | ~~1~~ **0** | 0 | 1 | 0 | 1 |
| Kimlik Dogrulama | ~~1~~ **0** | 2 | 1 | 0 | 3 |
| Yetkilendirme (IDOR) | 0 | 2 | 1 | 0 | 3 |
| XSS/Injection | 0 | 1 | 2 | 0 | 3 |
| Hassas Veri Sizintisi | ~~1~~ **0** | 1 | 2 | ~~3~~ **0** | 3 |
| Yapilandirma/Baslik | 0 | 2 | 2 | ~~2~~ **1** | 5 |
| Odeme Guvenligi | 0 | 0 | ~~3~~ **2** | 0 | 2 |
| CSRF | 0 | 0 | 0 | 0 | 0 |
| **TOPLAM** | **0** | **8** | ~~**11**~~ **10** | ~~**2**~~ **1** | **19** |

---

## KAPATILANLAR ✅

### 2026-03-28 Güncellemesi — Yeni Kapatılanlar

| # | Açık | Nasıl Kapatıldı |
|---|------|-----------------|
| O15 | WhatsApp toplu mesaj rate limiting yok | `sendBulkWhatsApp` döngüsüne 500ms gecikme eklendi |
| D6 | Logo URL'de HTTP izni | `_isSafeLogoUrl`: sadece `https:` protokolüne izin verildi |
| — | Math.random() güvensiz fallback sessiz | `console.warn` ile HTTPS ortamı uyarısı eklendi |
| — | init.js cache-buster rastgele URL | `?t=Date.now()` kaldırıldı, CDN önbelleklemesi düzeltildi |

---

### Kritik Seviye — Tamamı Kapatıldı

| # | Açık | Nasıl Kapatıldı |
|---|------|-----------------|
| K1 | RLS `USING(true)` — anon tüm verileri okuyabiliyordu | Migration 016: hassas tablolarda anon SELECT kaldırıldı |
| K2 | Supabase anon key riski | Migration 016 sonrası anon key ile kişisel veriye erişilemiyor |
| K3 | Plaintext şifre saklama | Migration 007 (bcrypt) + Migration 013 (mevcut hash) |

### Orta/Düşük Seviye — Kapatılanlar

| # | Açık | Nasıl Kapatıldı |
|---|------|-----------------|
| O1 | DB hata mesajları kullanıcıya sızıyor | 12 lokasyonda generic mesaj (kod değişikliği) |
| O2 | Ödeme tutarında üst limit yok | 99.999 TL limiti eklendi (kod değişikliği) |
| O3 | CSRF | Bearer token auth'da N/A — geçersiz açık |
| O4 | Login yarış durumu | Zaten button disabled ediliyor — çözülmüş |
| D1 | Supabase hata mesajları kullanıcıya | O1 ile kapatıldı |
| D2 | Console debug log sızıntısı | console.log zaten yoktu — temizdi |
| D3 | Error handler stack trace | Zaten sadece message logluyor — temizdi |
| D4 | robots.txt | Zaten Disallow:/ vardı — doğruydu |
| D5 | SW offline yanıtı | Zaten generic mesaj — temizdi |

---

## AÇIK KALANLAR

### YÜKSEK SEVİYE — 6 Açık

#### Y1. Varsayılan Şifre: TC Son 6 Hane
- **Dosya:** `script.js:1997`
- **Sorun:** TC kimlik numarasının son 6 hanesi varsayılan şifre. TC numaraları tahmin edilebilir.
- **Çözüm:** Rastgele şifre üret ve kullanıcıya ilk girişte değiştirt.
- **Not:** Migration 007 ile bcrypt otomatik yükseltme aktif. Şifre zayıf ama artık hash'li.

#### Y2. Client-Side Yetkilendirme Bypass
- **Dosya:** `script-fixes.js:701, 736, 760`
- **Sorun:** `AppState.currentUser.role = 'admin'` konsol komutuyla bypass edilebilir.
- **Çözüm:** Kritik işlemleri server-side Edge Function'a taşı.

#### Y3. IDOR — Sahiplik Kontrolü Eksik (Sporcu Silme)
- **Dosya:** `script-fixes.js:2073`
- **Sorun:** Silme/düzenleme işlemlerinde org_id sahiplik kontrolü yok.
- **Çözüm:** RLS'e `org_id = current_user_org_id()` koşulu ekle.

#### Y4. IDOR — Sporcu Başka Org Verisini Görebilir
- **Sorun:** Authenticated kullanıcı tüm org'ların verisini okuyabilir (`USING (true)`).
- **Çözüm:** RLS'e org_id filtresi ekle (daha kapsamlı migration gerekli).

#### Y5. CSP `unsafe-inline`
- **Dosya:** `vercel.json:34`
- **Sorun:** XSS saldırılarına kapı açık.
- **Çözüm:** Nonce veya hash bazlı CSP, unsafe-inline kaldır.

#### Y6. CDN SRI Hash Eksik (`init.js`)
- **Dosya:** `init.js:10-14`
- **Sorun:** Bazı CDN kaynaklarında `integrity` hash yok.
- **Çözüm:** Tüm harici scriptlere `integrity="sha384-..."` ekle.

---

### ORTA SEVİYE — 11 Açık

| # | Açık | Dosya |
|---|------|-------|
| O5 | onclick XSS riski (UUID ID'ler) | `script-fixes.js:705` |
| O6 | localStorage'da hassas oturum verisi | `script.js:886` |
| O7 | Base64 "şifreleme" (gerçek değil) | `ui-improvements.js:324` |
| O8 | Math.random() fallback UUID | `script.js:255` |
| O9 | Ödeme sipariş ID URL'de | `script-fixes.js:1344` |
| O10 | KVKK: anon başkasının onayını değiştirebilir | `RLS_POLICIES.sql:203` |
| O11 | Global fetch() override | `ui-improvements.js:168` |
| O12 | WhatsApp API token düz metin | `script.js:3798` |
| O13 | Oturum yarış durumu (edge case) | `Security.js:213` |
| O14 | Ödeme webhook HMAC doğrulama eksik | `script.js:4782` |
| ~~O15~~ | ~~WhatsApp toplu mesaj rate limiting yok~~ — **KAPATILDI** (500ms bekleme eklendi) | `script-fixes.js:419` |

---

### DÜŞÜK SEVİYE — 2 Açık

| # | Açık | Dosya |
|---|------|-------|
| ~~D6~~ | ~~Logo URL'de HTTP izni~~ — **KAPATILDI** (sadece HTTPS izinli) | `script.js:1163` |
| D7 | onclick handler pattern (UUID güvenli ama) | `script-fixes.js:705` |

---

## ONCELIKLI AKSIYON PLANI (Kalan)

### Asama 1 — Acil (yapılabilir)
1. **Y3/Y4 RLS org_id filtresi** — authenticated kullanıcılar sadece kendi org verisini görmeli
2. **Y5 CSP unsafe-inline** — vercel.json değişikliği
3. **Y6 SRI hash** — init.js değişikliği

### Asama 2 — Orta Vadeli
4. Client-side auth bypass → Edge Function'a taşı
5. localStorage → sessionStorage
6. Webhook HMAC

### Asama 3 — Uzun Vadeli
7. Varsayılan şifre mekanizması
8. Penetrasyon testi
9. KVKK uyumluluk denetimi
