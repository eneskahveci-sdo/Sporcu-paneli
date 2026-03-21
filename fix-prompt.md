# Sporcu Paneli — Hata Düzeltme Promptu

Aşağıdaki 3 sorunu düzelt. Başka hiçbir koda dokunma.

---

## DÜZELTME 1 — document.write() Kaldır (script-fixes.js, satır 250-275)

`_generateReceiptHTML` fonksiyonunda `document.write()` yerine Blob URL kullan:

1. Tüm HTML'i tek bir string değişkende birleştir
2. `URL.createObjectURL(new Blob([html], {type:'text/html'}))` ile URL oluştur
3. `window.open(blobUrl)` ile aç, yazdır, sonra `URL.revokeObjectURL` ile temizle
4. `_escHtml()` çağrılarına ve `setTimeout(500)` gecikmesine dokunma

---

## DÜZELTME 2 — localStorage Fallback Ekle (script.js, satır 1-30 civarı)

StorageManager veya localStorage wrapper bloğunu güncelle:

Eğer localStorage erişimi başarısız olursa (private browsing, iOS Safari),
`_memStore = {}` nesnesine yönlendir.
`getItem`, `setItem`, `removeItem`, `clear` API'si aynı kalmalı.
Mevcut hiçbir çağrı değişmemeli.

---

## DÜZELTME 3 — Rate Limiting DB'ye Taşı (supabase/functions/send-sms/index.ts)

`rateLimitMap` (in-memory Map) yerine Supabase DB RPC kullan:

1. `SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY` env'lerini oku
2. `checkRateLimit` fonksiyonu şu SQL RPC'yi çağırsın:
   `SELECT check_sms_rate_limit($1, 5, 60) as allowed`
3. RPC false → 429 döndür
4. DB erişilemezse → izin ver (fail open) + `console.warn` logla
5. `rateLimitMap` ve ilgili in-memory kodunu tamamen sil

Supabase Dashboard → Settings → Edge Functions → Environment Variables'a
`SUPABASE_SERVICE_ROLE_KEY` eklemeyi unutma.

---

## DOKUNMA — Şunları kesinlikle değiştirme:

- `innerHTML = pages[page]()` veya `pages[tab]()` satırları (tüm SPA sayfaları bunlarla render ediliyor)
- `modal-body.innerHTML = body` satırı (modallar bozulur)
- `FormatUtils.escape()` çağrıları
- `Security.js`, `vercel.json`, `style.css`, `index.html`, `i18n/` dosyaları

---

## Düzeltme Sonrası Kontrol Et:

1. `node --check script.js` → hata olmamalı
2. `node --check script-fixes.js` → hata olmamalı
3. Makbuz yazdır → popup açılmalı
4. Private modda → uygulama çökmemeli
5. SMS gönder → çalışmalı
