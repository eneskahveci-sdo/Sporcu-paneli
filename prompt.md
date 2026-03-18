# 🔧 Dragos Futbol Akademisi — Geliştirme & Hukuki Uyum Kılavuzu V3

> **ALTIN KURAL:** `script.js` hiçbir koşulda değiştirilmez. Tüm değişiklikler `script-fixes.js` sonuna monkey-patch olarak eklenir. Mevcut çalışan PayTR, SMS, WhatsApp, Excel, PDF, QR, PWA dahil hiçbir fonksiyon bozulmaz.

---

## MEVCUT ÇALIŞAN SİSTEM — DOKUNMA

- ✅ PayTR iFrame ödeme (test_mode: '1', v12 edge function)
- ✅ Security.js v5.0 — doNormalLogin, 15dk session timeout
- ✅ NetGSM SMS, WhatsApp Business API
- ✅ Excel import/export, PDF makbuz, QR yoklama
- ✅ Supabase Edge Functions: paytr-token, paytr-webhook, send-sms
- ✅ KVKK overlay (showLegal), Kullanım Şartları overlay
- ✅ Ön kayıt formu (showOnKayitForm, submitOnKayit)
- ✅ GitHub Actions CI/CD

---

## BÖLÜM 1 — TEKNİK GELİŞTİRMELER

---

### DEĞİŞİKLİK T1 — Sunucu Bağlantı Hatası Otomatik Yeniden Bağlanma

**Dosya:** `script-fixes.js` (sona ekle)

**Sorun:** Supabase bağlantısı kopunca kullanıcı ne yapacağını bilmiyor, sayfa donuyor.

**Çözüm:** Global fetch interceptor + otomatik retry + kullanıcı dostu banner.

**Dikkat:** `window.fetch` override yaparken mevcut `Security.js` ve `init.js` fetch çağrılarını bozmamak için sadece `supabase.co` URL'lerini yakala.

```javascript
// ── T1: SUNUCU BAĞLANTI HATASI — Otomatik yeniden bağlanma ──────────────
(function() {
    var _failCount = 0;
    var _reconnectTimer = null;
    var _MAX_FAILS = 3;
    var _connected = true;

    var _origFetch = window.fetch;
    window.fetch = function(url, opts) {
        return _origFetch.apply(this, arguments)
            .then(function(resp) {
                if (typeof url === 'string' && url.indexOf('supabase.co') !== -1 && resp.ok) {
                    if (!_connected) { _connected = true; _failCount = 0; _hideConnBanner(); }
                }
                return resp;
            })
            .catch(function(err) {
                if (typeof url === 'string' && url.indexOf('supabase.co') !== -1) {
                    _failCount++;
                    if (_failCount >= _MAX_FAILS && _connected) {
                        _connected = false;
                        _showConnBanner();
                        _startReconnect();
                    }
                }
                throw err;
            });
    };

    function _showConnBanner() {
        if (document.getElementById('_conn-banner')) return;
        var b = document.createElement('div');
        b.id = '_conn-banner';
        b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99998;background:#c0392b;color:#fff;text-align:center;padding:10px 16px;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,.3)';
        b.innerHTML = '🔌 Sunucu bağlantısı kesildi — yeniden bağlanılıyor...<button onclick="location.reload()" style="background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px;margin-left:8px">Sayfayı Yenile</button>';
        document.body.prepend(b);
    }

    function _hideConnBanner() {
        var b = document.getElementById('_conn-banner');
        if (!b) return;
        b.style.background = '#27ae60';
        b.innerHTML = '✅ Bağlantı yeniden kuruldu!';
        setTimeout(function() { if (b.parentNode) b.parentNode.removeChild(b); }, 2500);
    }

    function _startReconnect() {
        if (_reconnectTimer) return;
        var attempt = 0;
        var delays = [3000, 5000, 10000, 15000, 30000];
        function _try() {
            attempt++;
            var delay = delays[Math.min(attempt - 1, delays.length - 1)];
            _reconnectTimer = setTimeout(function() {
                _reconnectTimer = null;
                var sb = typeof getSupabase === 'function' ? getSupabase() : null;
                if (!sb) { _try(); return; }
                sb.from('settings').select('id').limit(1)
                    .then(function(r) {
                        if (!r.error) { _connected = true; _failCount = 0; _hideConnBanner(); }
                        else _try();
                    })
                    .catch(function() { _try(); });
            }, delay);
        }
        _try();
    }
    console.log('✅ T1: Bağlantı hatası handler aktif');
})();
```

---

### DEĞİŞİKLİK T2 — Offline Mod Banner + Service Worker Cache

**Dosya:** `script-fixes.js` (sona ekle) + `sw.js` (güncelle)

**Sorun:** İnternet kesilince beyaz ekran, PWA çevrimdışı çalışmıyor.

**script-fixes.js'e ekle:**

```javascript
// ── T2: OFFLINE MOD BANNER ───────────────────────────────────────────────
(function() {
    function _showOffline() {
        if (document.getElementById('_offline-banner')) return;
        var b = document.createElement('div');
        b.id = '_offline-banner';
        b.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99997;background:#e67e22;color:#fff;text-align:center;padding:8px;font-size:12px;font-weight:600';
        b.textContent = '📵 İnternet bağlantısı yok — veriler önbellekten gösteriliyor';
        document.body.appendChild(b);
    }
    function _hideOffline() {
        var b = document.getElementById('_offline-banner');
        if (!b) return;
        b.style.background = '#27ae60';
        b.textContent = '✅ İnternet bağlantısı yeniden kuruldu';
        setTimeout(function() { if (b.parentNode) b.parentNode.removeChild(b); }, 2000);
    }
    window.addEventListener('offline', _showOffline);
    window.addEventListener('online', _hideOffline);
    if (!navigator.onLine) _showOffline();
    console.log('✅ T2: Offline banner aktif');
})();
```

**sw.js içinde mevcut fetch handler'ı bul ve SONA şunu ekle:**

```javascript
// T2: Supabase GET istekleri için network-first, offline'da cache
self.addEventListener('fetch', function(event) {
    var url = event.request.url;
    if (url.indexOf('supabase.co') !== -1 && event.request.method === 'GET') {
        event.respondWith(
            fetch(event.request.clone())
                .then(function(resp) {
                    if (resp && resp.status === 200) {
                        var clone = resp.clone();
                        caches.open('dragos-supabase-v1').then(function(cache) {
                            cache.put(event.request, clone);
                        });
                    }
                    return resp;
                })
                .catch(function() {
                    return caches.match(event.request);
                })
        );
    }
});
```

---

### DEĞİŞİKLİK T3 — Supabase Realtime

**Dosya:** `script-fixes.js` (sona ekle)

**Sorun:** Ödemeler ve ön kayıtlar sayfa yenilemeden güncellenmiyor.

**Dikkat:** Realtime subscription login sonrası başlatılmalı. `AppState.currentOrgId` dolmadan subscribe edilmemeli.

```javascript
// ── T3: SUPABASE REALTIME ────────────────────────────────────────────────
(function() {
    var _realtimeInited = false;

    function _initRealtime() {
        if (_realtimeInited) return;
        var sb = typeof getSupabase === 'function' ? getSupabase() : null;
        if (!sb || !AppState || !AppState.currentOrgId) return;
        _realtimeInited = true;

        // Ödemeler
        sb.channel('rt-payments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, function(payload) {
                if (!AppState.data) return;
                AppState.data.payments = AppState.data.payments || [];
                var ev = payload.eventType;
                var row = payload.new || payload.old;
                if (!row) return;
                var mapped = (DB && DB.mappers && DB.mappers.toPayment) ? DB.mappers.toPayment(row) : row;
                if (ev === 'INSERT') {
                    if (!AppState.data.payments.find(function(x) { return x.id === mapped.id; }))
                        AppState.data.payments.push(mapped);
                } else if (ev === 'UPDATE') {
                    var i = AppState.data.payments.findIndex(function(x) { return x.id === mapped.id; });
                    if (i >= 0) AppState.data.payments[i] = mapped;
                } else if (ev === 'DELETE') {
                    AppState.data.payments = AppState.data.payments.filter(function(x) { return x.id !== (payload.old && payload.old.id); });
                }
                if (AppState.currentPage === 'payments') {
                    try { if (typeof go === 'function') go('payments'); } catch(e) {}
                }
            })
            .subscribe();

        // Ön kayıtlar
        sb.channel('rt-onkayit')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'on_kayitlar' }, function(payload) {
                AppState.data.onKayitlar = AppState.data.onKayitlar || [];
                if (!AppState.data.onKayitlar.find(function(x) { return x.id === payload.new.id; })) {
                    var r = payload.new;
                    AppState.data.onKayitlar.unshift({ id: r.id, studentName: r.student_name || '', fn: r.fn || '', ln: r.ln || '', bd: r.bd || '', tc: r.tc || '', clsId: r.cls_id || '', className: r.class_name || '', parentName: r.parent_name || '', parentPhone: r.parent_phone || '', status: r.status || 'new', createdAt: r.created_at || '', orgId: r.org_id || '', branchId: r.branch_id || '' });
                }
                // Badge güncelle
                var newCount = AppState.data.onKayitlar.filter(function(x) { return x.status === 'new'; }).length;
                document.querySelectorAll('[data-badge="onkayit"]').forEach(function(el) { el.textContent = newCount; });
            })
            .subscribe();

        console.log('✅ T3: Realtime subscriptions aktif');
    }

    // Login sonrası AppState dolunca başlat
    var _rtInterval = setInterval(function() {
        if (AppState && AppState.currentOrgId && typeof getSupabase === 'function' && getSupabase()) {
            clearInterval(_rtInterval);
            setTimeout(_initRealtime, 1500);
        }
    }, 2000);
})();
```

---

### DEĞİŞİKLİK T4 — Vercel Analytics

**Dosya:** `vercel.json` (güncelle)

Mevcut `vercel.json` içeriğini şununla değiştir. CSP'ye analytics domain eklendi, `analytics: true` eklendi:

```json
{
  "analytics": true,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com https://esm.sh https://vitals.vercel-insights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self' https://*.supabase.co https://www.paytr.com https://graph.facebook.com https://vitals.vercel-insights.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; frame-src https://www.paytr.com; frame-ancestors 'self'; object-src 'none'; base-uri 'self'" }
      ]
    }
  ]
}
```

---

## BÖLÜM 2 — HUKUKİ UYUM (KVKK)

Tüm hukuki değişiklikler `script-fixes.js` üzerinden yapılır. Ayrıca Supabase'de 2 yeni tablo ve `settings` tablosuna yeni alanlar gerekir.

---

### ADIM H0 — Supabase SQL (Önce Çalıştır)

Supabase Dashboard → SQL Editor'de çalıştır:

```sql
-- deletion_requests tablosu (veri silme talepleri)
CREATE TABLE IF NOT EXISTS deletion_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    athlete_id TEXT,
    athlete_name TEXT,
    athlete_tc TEXT,
    reason TEXT,
    status TEXT DEFAULT 'pending', -- pending | completed | rejected
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    org_id TEXT,
    branch_id TEXT
);
ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON deletion_requests TO anon;
GRANT ALL ON deletion_requests TO authenticated, service_role;
CREATE POLICY "delreq_insert_anon" ON deletion_requests FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "delreq_select_auth" ON deletion_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "delreq_update_auth" ON deletion_requests FOR UPDATE TO authenticated USING (true);

-- settings tablosuna hukuki alanlar ekle
ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS kvkk_text TEXT,
    ADD COLUMN IF NOT EXISTS terms_text TEXT,
    ADD COLUMN IF NOT EXISTS data_controller_name TEXT,
    ADD COLUMN IF NOT EXISTS data_controller_address TEXT,
    ADD COLUMN IF NOT EXISTS data_controller_phone TEXT,
    ADD COLUMN IF NOT EXISTS data_controller_email TEXT,
    ADD COLUMN IF NOT EXISTS data_controller_tax_no TEXT,
    ADD COLUMN IF NOT EXISTS data_retention_years INTEGER DEFAULT 5,
    ADD COLUMN IF NOT EXISTS breach_procedure TEXT,
    ADD COLUMN IF NOT EXISTS cookie_banner_enabled BOOLEAN DEFAULT true;

-- on_kayitlar tablosuna rıza alanları ekle
ALTER TABLE on_kayitlar
    ADD COLUMN IF NOT EXISTS kvkk_consent BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS consent_date DATE;
```

---

### DEĞİŞİKLİK H1 — settings Mapper Genişletme

**Dosya:** `script-fixes.js` (sona ekle)

`script.js`'deki `DB.mappers.toSettings` ve `fromSettings`'i genişlet:

```javascript
// ── H1: SETTINGS MAPPER — Hukuki alanlar ────────────────────────────────
(function() {
    var _origToSettings = DB.mappers.toSettings.bind(DB.mappers);
    DB.mappers.toSettings = function(r) {
        var base = _origToSettings(r);
        base.kvkkText             = r.kvkk_text             || '';
        base.termsText            = r.terms_text            || '';
        base.dataControllerName   = r.data_controller_name  || '';
        base.dataControllerAddr   = r.data_controller_address || '';
        base.dataControllerPhone  = r.data_controller_phone || '';
        base.dataControllerEmail  = r.data_controller_email || '';
        base.dataControllerTaxNo  = r.data_controller_tax_no || '';
        base.dataRetentionYears   = r.data_retention_years  || 5;
        base.breachProcedure      = r.breach_procedure      || '';
        base.cookieBannerEnabled  = r.cookie_banner_enabled !== false;
        return base;
    };

    var _origFromSettings = DB.mappers.fromSettings.bind(DB.mappers);
    DB.mappers.fromSettings = function(s) {
        var base = _origFromSettings(s);
        base.kvkk_text              = s.kvkkText            || '';
        base.terms_text             = s.termsText           || '';
        base.data_controller_name   = s.dataControllerName  || '';
        base.data_controller_address= s.dataControllerAddr  || '';
        base.data_controller_phone  = s.dataControllerPhone || '';
        base.data_controller_email  = s.dataControllerEmail || '';
        base.data_controller_tax_no = s.dataControllerTaxNo || '';
        base.data_retention_years   = s.dataRetentionYears  || 5;
        base.breach_procedure       = s.breachProcedure     || '';
        base.cookie_banner_enabled  = s.cookieBannerEnabled !== false;
        return base;
    };
    console.log('✅ H1: Settings mapper genişletildi');
})();
```

---

### DEĞİŞİKLİK H2 — showLegal Override (Supabase'den Metin)

**Dosya:** `script-fixes.js` (sona ekle)

Mevcut `showLegal` sabit metin yerine `settings`'ten dinamik metin gösterir:

```javascript
// ── H2: showLegal OVERRIDE — Dinamik KVKK/Kullanım Şartları metni ────────
window.showLegal = function(type) {
    var s = (AppState && AppState.data && AppState.data.settings) || {};
    var ctrl = s.dataControllerName || 'Dragos Futbol Akademisi';
    var addr = s.dataControllerAddr || '';
    var phone = s.dataControllerPhone || '';
    var email = s.dataControllerEmail || '';
    var years = s.dataRetentionYears || 5;

    var defaultKvkk = '<div style="line-height:1.8;font-size:13px;color:var(--text2);max-height:60vh;overflow-y:auto;padding-right:8px">'
        + '<p><b>VERİ SORUMLUSU:</b> ' + FormatUtils.escape(ctrl) + '</p>'
        + (addr ? '<p><b>Adres:</b> ' + FormatUtils.escape(addr) + '</p>' : '')
        + (phone ? '<p><b>Telefon:</b> ' + FormatUtils.escape(phone) + '</p>' : '')
        + (email ? '<p><b>E-posta:</b> ' + FormatUtils.escape(email) + '</p>' : '')
        + '<p style="margin-top:12px"><b>İŞLENEN KİŞİSEL VERİLER:</b> Ad-soyad, TC kimlik numarası, doğum tarihi, telefon numarası, e-posta, veli bilgileri, ödeme kayıtları, yoklama verileri.</p>'
        + '<p><b>İŞLEME AMACI:</b> Sporcu kayıt ve takibi, aidat tahsilatı, devam takibi, veli bildirimleri.</p>'
        + '<p><b>SAKLAMA SÜRESİ:</b> Aktif sporcu verileri üyelik süresince, pasif sporcu verileri üyelik sona erişinden itibaren ' + years + ' yıl saklanır.</p>'
        + '<p><b>ÜÇÜNCÜ TARAFLARLA PAYLAŞIM:</b> Ödeme işlemleri PayTR Bilişim Hizmetleri A.Ş. altyapısı üzerinden gerçekleştirilir — kart bilgileri tarafımızca saklanmaz. SMS bildirimleri NetGSM altyapısı üzerinden iletilir.</p>'
        + '<p><b>VERİ DEPOLAMA:</b> Verileriniz Supabase (Frankfurt, AB) sunucularında saklanır. Yurt dışı aktarım KVKK Madde 9 kapsamında açık rızanıza dayalıdır.</p>'
        + '<p style="margin-top:12px"><b>HAKLARINIZ (KVKK Madde 11):</b></p>'
        + '<ul style="margin-left:16px;margin-top:4px">'
        + '<li>Verilerinizin işlenip işlenmediğini öğrenme</li>'
        + '<li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>'
        + '<li>Yurt içi veya yurt dışında aktarıldığı üçüncü kişileri öğrenme</li>'
        + '<li>Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme</li>'
        + '<li>KVKK Madde 7 çerçevesinde silinmesini veya yok edilmesini isteme</li>'
        + '<li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>'
        + '</ul>'
        + '<p style="margin-top:12px">Veri silme talebiniz için sporcu profilinizden "Verilerimi Sil" butonunu kullanabilir veya <b>' + FormatUtils.escape(email || ctrl) + '</b> adresine yazabilirsiniz. Talepler 30 gün içinde yanıtlanır.</p>'
        + '</div>';

    var defaultTerms = '<div style="line-height:1.8;font-size:13px;color:var(--text2);max-height:60vh;overflow-y:auto;padding-right:8px">'
        + '<p><b>' + FormatUtils.escape(ctrl) + '</b> sporcu yönetim sistemini kullanarak aşağıdaki şartları kabul etmiş sayılırsınız.</p>'
        + '<p><b>1. HİZMET KAPSAMI:</b> Bu sistem sporcu kayıt, yoklama takibi ve aidat yönetimi amacıyla kullanılır.</p>'
        + '<p><b>2. GİZLİLİK:</b> Sisteme giriş bilgilerinizi kimseyle paylaşmayınız. Hesabınızdan yapılan işlemlerden sorumlusunuz.</p>'
        + '<p><b>3. ÖDEME:</b> Online ödemeler PayTR güvenli ödeme altyapısı üzerinden gerçekleştirilir.</p>'
        + '<p><b>4. VERİ DOĞRULUĞU:</b> Girdiğiniz bilgilerin doğruluğundan siz sorumlusunuz.</p>'
        + '<p><b>5. DEĞİŞİKLİKLER:</b> Kullanım şartları önceden bildirilmeksizin güncellenebilir.</p>'
        + '</div>';

    var kvkkBody  = s.kvkkText  || defaultKvkk;
    var termsBody = s.termsText || defaultTerms;
    var title = type === 'kvkk' ? 'KVKK Aydınlatma Metni' : 'Kullanım Şartları';
    var body  = type === 'kvkk' ? kvkkBody : termsBody;

    // Bağımsız overlay (Security.js modal'larıyla çakışmasın)
    var existing = document.getElementById('_legal-overlay');
    if (existing) existing.parentNode.removeChild(existing);
    var ov = document.createElement('div');
    ov.id = '_legal-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML = '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;width:100%;max-width:600px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden">'
        + '<div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">'
        + '<div style="font-weight:700;font-size:16px">' + title + '</div>'
        + '<button onclick="var o=document.getElementById(\'_legal-overlay\');if(o)o.parentNode.removeChild(o)" style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:6px 10px;cursor:pointer;color:var(--text);font-size:16px">✕</button>'
        + '</div>'
        + '<div style="padding:20px;overflow-y:auto;flex:1">' + body + '</div>'
        + '</div>';
    document.body.appendChild(ov);
};
console.log('✅ H2: showLegal dinamik override aktif');
```

---

### DEĞİŞİKLİK H3 — TC Kimlik Maskeleme

**Dosya:** `script-fixes.js` (sona ekle)

Athletes listesinde TC tam görünüyor. Sadece görüntüleme katmanında maskele, DB'de tam kalsın:

```javascript
// ── H3: TC KİMLİK MASKELEME ──────────────────────────────────────────────
// Yönetici athletes listesinde TC maskelenir: 12345678901 → 12345****01
// Profil detayı açıkken tam TC gösterilir (zaten modal içinde)
(function() {
    window._maskTC = function(tc) {
        if (!tc || tc.length < 6) return tc || '-';
        return tc.substring(0, 3) + '****' + tc.substring(tc.length - 2);
    };
    // pgAthletes override — TC sütununu maskele
    var _origPgAthletes = window.pgAthletes;
    if (typeof _origPgAthletes === 'function') {
        window.pgAthletes = function() {
            var html = _origPgAthletes.apply(this, arguments);
            // Render edilen HTML'deki TC numaralarını maskele
            // Not: FormatUtils.escape ile çıkan TC değerlerini replace et
            return html.replace(/\b(\d{3})\d{4}(\d{2})\b/g, function(match, p1, p2) {
                if (match.length === 11) return p1 + '****' + p2;
                return match;
            });
        };
    }
    console.log('✅ H3: TC maskeleme aktif');
})();
```

---

### DEĞİŞİKLİK H4 — Ön Kayıt Formuna KVKK Rızası

**Dosya:** `script-fixes.js` (sona ekle)

`showOnKayitForm` ve `submitOnKayit` override — checkbox ekle, DB'ye kaydet:

```javascript
// ── H4: ÖN KAYIT KVKK RIZASI ─────────────────────────────────────────────
var _origShowOnKayitForm = window.showOnKayitForm;
window.showOnKayitForm = function() {
    _origShowOnKayitForm && _origShowOnKayitForm.apply(this, arguments);
    // Form render edildikten sonra KVKK checkbox ekle
    setTimeout(function() {
        var formBody = document.querySelector('#onkayit-modal [style*="overflow-y:auto"]');
        if (!formBody || document.getElementById('ok-kvkk-consent')) return;
        var div = document.createElement('div');
        div.style.cssText = 'margin-top:12px;padding:12px;background:var(--bg3);border-radius:8px;border:1px solid var(--border)';
        div.innerHTML = '<label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:13px;line-height:1.5">'
            + '<input type="checkbox" id="ok-kvkk-consent" style="margin-top:2px;width:18px;height:18px;flex-shrink:0"/>'
            + '<span><b>KVKK Onayı *</b> — '
            + '<a href="#" onclick="showLegal(\'kvkk\');return false;" style="color:var(--blue2)">Kişisel Verilerin Korunması Kanunu Aydınlatma Metni</a>\'ni okudum ve kişisel verilerimin işlenmesine <b>açık rıza</b> veriyorum.</span>'
            + '</label>';
        formBody.appendChild(div);
    }, 100);
};

var _origSubmitOnKayit = window.submitOnKayit;
window.submitOnKayit = async function() {
    var consent = document.getElementById('ok-kvkk-consent');
    if (consent && !consent.checked) {
        toast('KVKK onayı zorunludur. Lütfen aydınlatma metnini okuyup onaylayın.', 'e');
        return;
    }
    // Orijinal submit'i çalıştır
    await _origSubmitOnKayit.apply(this, arguments);
    // Onay tarihini DB'ye güncelle
    try {
        var sb = typeof getSupabase === 'function' ? getSupabase() : null;
        if (!sb) return;
        // Son eklenen kaydı bul ve consent güncelle
        var last = AppState.data.onKayitlar && AppState.data.onKayitlar[0];
        if (last && last.id) {
            await sb.from('on_kayitlar').update({
                kvkk_consent: true,
                consent_date: DateUtils.today()
            }).eq('id', last.id);
        }
    } catch(e) { console.warn('Consent update:', e.message); }
};
console.log('✅ H4: Ön kayıt KVKK rızası aktif');
```

---

### DEĞİŞİKLİK H5 — Çerez/localStorage Bildirimi

**Dosya:** `script-fixes.js` (sona ekle)

```javascript
// ── H5: ÇEREZ BİLDİRİMİ ─────────────────────────────────────────────────
(function() {
    var COOKIE_KEY = 'dragos_cookie_consent';
    if (localStorage.getItem(COOKIE_KEY)) return; // Zaten onaylandı

    function _showCookieBanner() {
        if (document.getElementById('_cookie-banner')) return;
        var b = document.createElement('div');
        b.id = '_cookie-banner';
        b.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99996;background:var(--bg2);border-top:1px solid var(--border);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;box-shadow:0 -2px 12px rgba(0,0,0,.15)';
        b.innerHTML = '<span style="font-size:12px;color:var(--text2);flex:1;min-width:200px">🍪 Bu site oturum yönetimi ve tercih saklama amacıyla yerel depolama (localStorage) kullanmaktadır. '
            + '<a href="#" onclick="showLegal(\'kvkk\');return false;" style="color:var(--blue2)">KVKK Aydınlatma Metni</a></span>'
            + '<div style="display:flex;gap:8px;flex-shrink:0">'
            + '<button onclick="_acceptCookies()" style="background:var(--blue2);color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">Tamam, Anladım</button>'
            + '</div>';
        document.body.appendChild(b);
    }

    window._acceptCookies = function() {
        localStorage.setItem(COOKIE_KEY, '1');
        var b = document.getElementById('_cookie-banner');
        if (b) b.parentNode.removeChild(b);
    };

    // Sayfa hazır olunca göster
    if (document.readyState === 'complete') {
        setTimeout(_showCookieBanner, 1500);
    } else {
        window.addEventListener('load', function() { setTimeout(_showCookieBanner, 1500); });
    }
    console.log('✅ H5: Çerez bildirimi aktif');
})();
```

---

### DEĞİŞİKLİK H6 — Veri Silme Talebi (Sporcu Profili)

**Dosya:** `script-fixes.js` (sona ekle)

Sporcu `spProfil` sayfasına "Verilerimi Sil" butonu ekle:

```javascript
// ── H6: VERİ SİLME TALEBİ ───────────────────────────────────────────────
var _origSpProfil = window.spProfil;
window.spProfil = function() {
    var html = typeof _origSpProfil === 'function' ? _origSpProfil.apply(this, arguments) : '';
    var deleteBtn = '<div class="card mb3" style="border-left:3px solid #e74c3c">'
        + '<div class="tw6 ts mb1" style="color:#e74c3c">⚠️ Veri Silme Talebi</div>'
        + '<p class="tm ts mb2">KVKK Madde 11 kapsamında kişisel verilerinizin silinmesini talep edebilirsiniz. Talebiniz 30 gün içinde yanıtlanır.</p>'
        + '<button class="btn" style="background:#e74c3c;color:#fff;border:none" onclick="submitDeletionRequest()">Verilerimi Silmesini Talep Et</button>'
        + '</div>';
    // Sayfanın sonuna ekle
    return html.replace(/<\/div>\s*$/, '') + deleteBtn + '</div>';
};

window.submitDeletionRequest = async function() {
    var a = AppState.currentSporcu;
    if (!a) { toast('Sporcu bilgisi bulunamadı', 'e'); return; }
    var confirmed = confirm('Kişisel verilerinizin silinmesi talebi oluşturulacak. Devam etmek istiyor musunuz?');
    if (!confirmed) return;
    try {
        var sb = typeof getSupabase === 'function' ? getSupabase() : null;
        if (!sb) { toast('Bağlantı hatası', 'e'); return; }
        await sb.from('deletion_requests').insert({
            athlete_id:   a.id,
            athlete_name: (a.fn || '') + ' ' + (a.ln || ''),
            athlete_tc:   a.tc || '',
            reason:       'Sporcu talebi — KVKK Madde 11',
            status:       'pending',
            org_id:       AppState.currentOrgId || '',
            branch_id:    AppState.currentBranchId || ''
        });
        toast('✅ Silme talebiniz alındı. 30 gün içinde yanıtlanacaktır.', 'g');
    } catch(e) {
        toast('Talep gönderilemedi: ' + e.message, 'e');
    }
};
console.log('✅ H6: Veri silme talebi aktif');
```

---

### DEĞİŞİKLİK H7 — Admin Ayarlar: Hukuki Gereksinimler Kartı

**Dosya:** `script-fixes.js` (sona ekle)

`pgSettings` override — sonuna sekmeli "Hukuki Gereksinimler" kartı ekle:

```javascript
// ── H7: ADMIN AYARLAR — HUKUKİ GEREKSİNİMLER KARTI ─────────────────────
var _origPgSettings = window.pgSettings;
window.pgSettings = function() {
    var base = typeof _origPgSettings === 'function' ? _origPgSettings.apply(this, arguments) : '';
    var s = (AppState && AppState.data && AppState.data.settings) || {};

    var legalCard = `
    <div class="card mb3" style="border-left:4px solid #8e44ad">
        <div class="tw6 tsm mb3">⚖️ Hukuki Gereksinimler (KVKK)</div>

        <!-- Sekmeler -->
        <div style="display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap" id="legal-tabs">
            <button onclick="showLegalTab('metinler')"   class="btn btn-sm" id="ltab-metinler"   style="background:var(--blue2);color:#fff">📄 Metinler</button>
            <button onclick="showLegalTab('sorumluluk')" class="btn btn-sm" id="ltab-sorumluluk">🏢 Veri Sorumlusu</button>
            <button onclick="showLegalTab('silme')"      class="btn btn-sm" id="ltab-silme">🗑 Silme Talepleri</button>
            <button onclick="showLegalTab('riza')"       class="btn btn-sm" id="ltab-riza">✅ Rıza Yönetimi</button>
        </div>

        <!-- Metinler -->
        <div id="ltab-content-metinler">
            <p class="ts tm mb2">Bu alanlar boş bırakılırsa varsayılan KVKK metni kullanılır. Avukatınızdan aldığınız güncel metni buraya yapıştırın.</p>
            <div class="fgr mb2">
                <label>KVKK Aydınlatma Metni (HTML destekler)</label>
                <textarea id="s-kvkk-text" rows="8" style="width:100%;font-size:12px;font-family:monospace;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text1);resize:vertical">${FormatUtils.escape(s.kvkkText || '')}</textarea>
            </div>
            <div class="fgr mb3">
                <label>Kullanım Şartları (HTML destekler)</label>
                <textarea id="s-terms-text" rows="6" style="width:100%;font-size:12px;font-family:monospace;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text1);resize:vertical">${FormatUtils.escape(s.termsText || '')}</textarea>
            </div>
            <div class="fgr mb3">
                <label>Veri Saklama Süresi (yıl) — Pasif sporcu verileri için</label>
                <input id="s-retention-years" type="number" min="1" max="10" value="${s.dataRetentionYears || 5}" style="max-width:120px"/>
                <div class="ts tm mt1">KVKK metninde otomatik kullanılır.</div>
            </div>
            <button class="btn bp" onclick="saveLegalTexts()">💾 Metinleri Kaydet</button>
            <div id="legal-texts-msg" style="margin-top:8px;font-size:13px"></div>
        </div>

        <!-- Veri Sorumlusu -->
        <div id="ltab-content-sorumluluk" style="display:none">
            <p class="ts tm mb2">KVKK kapsamında veri sorumlusu bilgileri. Aydınlatma metninde otomatik kullanılır.</p>
            <div class="g21 mb2">
                <div class="fgr"><label>Kurum / Şirket Adı</label><input id="s-ctrl-name" value="${FormatUtils.escape(s.dataControllerName || '')}"/></div>
                <div class="fgr"><label>Vergi No / TC</label><input id="s-ctrl-taxno" value="${FormatUtils.escape(s.dataControllerTaxNo || '')}"/></div>
            </div>
            <div class="fgr mb2"><label>Adres</label><input id="s-ctrl-addr" value="${FormatUtils.escape(s.dataControllerAddr || '')}"/></div>
            <div class="g21 mb2">
                <div class="fgr"><label>Telefon</label><input id="s-ctrl-phone" value="${FormatUtils.escape(s.dataControllerPhone || '')}"/></div>
                <div class="fgr"><label>E-posta</label><input id="s-ctrl-email" type="email" value="${FormatUtils.escape(s.dataControllerEmail || '')}"/></div>
            </div>
            <div class="fgr mb3">
                <label>Veri İhlali Prosedürü (iç belge — 72 saat KVKK bildirimi için)</label>
                <textarea id="s-breach" rows="4" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text1);resize:vertical">${FormatUtils.escape(s.breachProcedure || '')}</textarea>
            </div>
            <button class="btn bp" onclick="saveLegalController()">💾 Kaydet</button>
            <div id="legal-ctrl-msg" style="margin-top:8px;font-size:13px"></div>
        </div>

        <!-- Silme Talepleri -->
        <div id="ltab-content-silme" style="display:none">
            <div id="deletion-requests-list"><button class="btn bs btn-sm" onclick="loadDeletionRequests()" style="width:100%">Talepleri Yükle</button></div>
        </div>

        <!-- Rıza Yönetimi -->
        <div id="ltab-content-riza" style="display:none">
            <div id="consent-stats"><button class="btn bs btn-sm" onclick="loadConsentStats()" style="width:100%">Rıza İstatistiklerini Yükle</button></div>
        </div>
    </div>`;

    return base + legalCard;
};

// Sekme değiştirme
window.showLegalTab = function(tab) {
    ['metinler','sorumluluk','silme','riza'].forEach(function(t) {
        var content = document.getElementById('ltab-content-' + t);
        var btn = document.getElementById('ltab-' + t);
        if (content) content.style.display = t === tab ? '' : 'none';
        if (btn) {
            btn.style.background = t === tab ? 'var(--blue2)' : '';
            btn.style.color = t === tab ? '#fff' : '';
        }
    });
};

// Metinleri kaydet
window.saveLegalTexts = async function() {
    var sb = typeof getSupabase === 'function' ? getSupabase() : null;
    var msg = document.getElementById('legal-texts-msg');
    if (!sb) { if (msg) msg.textContent = '❌ Bağlantı hatası'; return; }
    var updates = {
        kvkkText:           document.getElementById('s-kvkk-text')?.value || '',
        termsText:          document.getElementById('s-terms-text')?.value || '',
        dataRetentionYears: parseInt(document.getElementById('s-retention-years')?.value) || 5
    };
    Object.assign(AppState.data.settings, updates);
    await DB.upsert('settings', DB.mappers.fromSettings(AppState.data.settings));
    if (msg) { msg.textContent = '✅ Metinler kaydedildi'; setTimeout(function() { msg.textContent = ''; }, 3000); }
};

// Veri sorumlusu kaydet
window.saveLegalController = async function() {
    var sb = typeof getSupabase === 'function' ? getSupabase() : null;
    var msg = document.getElementById('legal-ctrl-msg');
    if (!sb) { if (msg) msg.textContent = '❌ Bağlantı hatası'; return; }
    var updates = {
        dataControllerName:  document.getElementById('s-ctrl-name')?.value?.trim()  || '',
        dataControllerAddr:  document.getElementById('s-ctrl-addr')?.value?.trim()  || '',
        dataControllerPhone: document.getElementById('s-ctrl-phone')?.value?.trim() || '',
        dataControllerEmail: document.getElementById('s-ctrl-email')?.value?.trim() || '',
        dataControllerTaxNo: document.getElementById('s-ctrl-taxno')?.value?.trim() || '',
        breachProcedure:     document.getElementById('s-breach')?.value             || ''
    };
    Object.assign(AppState.data.settings, updates);
    await DB.upsert('settings', DB.mappers.fromSettings(AppState.data.settings));
    if (msg) { msg.textContent = '✅ Kaydedildi'; setTimeout(function() { msg.textContent = ''; }, 3000); }
};

// Silme taleplerini yükle
window.loadDeletionRequests = async function() {
    var sb = typeof getSupabase === 'function' ? getSupabase() : null;
    var el = document.getElementById('deletion-requests-list');
    if (!sb || !el) return;
    el.innerHTML = '<p class="ts tm">Yükleniyor...</p>';
    var res = await sb.from('deletion_requests').select('*').order('requested_at', { ascending: false });
    if (res.error || !res.data || !res.data.length) {
        el.innerHTML = '<p class="ts tm">Bekleyen silme talebi yok.</p>'; return;
    }
    var rows = res.data.map(function(r) {
        var statusBadge = r.status === 'pending'
            ? '<span class="bg bg-y">Bekliyor</span>'
            : r.status === 'completed'
            ? '<span class="bg bg-g">Tamamlandı</span>'
            : '<span class="bg bg-r">Reddedildi</span>';
        var date = r.requested_at ? r.requested_at.substring(0, 10) : '-';
        return '<tr><td>' + FormatUtils.escape(r.athlete_name || '-') + '</td>'
            + '<td class="ts">' + window._maskTC(r.athlete_tc) + '</td>'
            + '<td class="ts">' + date + '</td>'
            + '<td>' + statusBadge + '</td>'
            + '<td>'
            + (r.status === 'pending' ? '<button class="btn btn-xs bg-g" onclick="completeDeletionRequest(\'' + r.id + '\',\'' + (r.athlete_id || '') + '\')">Onayla & Sil</button> ' : '')
            + (r.status === 'pending' ? '<button class="btn btn-xs bd" onclick="rejectDeletionRequest(\'' + r.id + '\')">Reddet</button>' : '')
            + '</td></tr>';
    }).join('');
    el.innerHTML = '<div class="tw" style="overflow-x:auto"><table><thead><tr><th>Sporcu</th><th>TC</th><th>Tarih</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
};

window.completeDeletionRequest = function(reqId, athleteId) {
    confirm2('Veri Silme', 'Sporcu verileri kalıcı olarak silinecek. Emin misiniz?', async function() {
        var sb = typeof getSupabase === 'function' ? getSupabase() : null;
        if (!sb) return;
        if (athleteId) await sb.from('athletes').delete().eq('id', athleteId);
        await sb.from('deletion_requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', reqId);
        toast('✅ Sporcu verileri silindi', 'g');
        loadDeletionRequests();
    });
};

window.rejectDeletionRequest = async function(reqId) {
    var sb = typeof getSupabase === 'function' ? getSupabase() : null;
    if (!sb) return;
    await sb.from('deletion_requests').update({ status: 'rejected' }).eq('id', reqId);
    toast('Talep reddedildi', 'w');
    loadDeletionRequests();
};

// Rıza istatistikleri
window.loadConsentStats = async function() {
    var sb = typeof getSupabase === 'function' ? getSupabase() : null;
    var el = document.getElementById('consent-stats');
    if (!sb || !el) return;
    el.innerHTML = '<p class="ts tm">Yükleniyor...</p>';
    var res = await sb.from('on_kayitlar').select('kvkk_consent, consent_date').order('created_at', { ascending: false });
    if (res.error) { el.innerHTML = '<p class="ts tm">Veri alınamadı.</p>'; return; }
    var total = res.data.length;
    var approved = res.data.filter(function(r) { return r.kvkk_consent; }).length;
    el.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">'
        + '<div style="background:var(--bg3);border-radius:8px;padding:12px;text-align:center"><div class="ts tm">Toplam Başvuru</div><div style="font-size:24px;font-weight:700">' + total + '</div></div>'
        + '<div style="background:var(--bg3);border-radius:8px;padding:12px;text-align:center"><div class="ts tm">KVKK Onaylı</div><div style="font-size:24px;font-weight:700;color:var(--green)">' + approved + '</div></div>'
        + '</div>'
        + '<p class="ts tm">' + (total - approved) + ' başvuruda KVKK onayı eksik (eski kayıtlar).</p>';
};

console.log('✅ H7: Admin hukuki gereksinimler kartı aktif');
```

---

## BÖLÜM 3 — UYGULAMA SIRASI

Sırayla uygula. Her adımdan sonra test et.

### Adım 1 — Supabase SQL (Önce)
- [ ] `deletion_requests` tablosu oluştur
- [ ] `settings` tablosuna hukuki alanlar ekle
- [ ] `on_kayitlar` tablosuna `kvkk_consent`, `consent_date` ekle

### Adım 2 — vercel.json
- [ ] `"analytics": true` ekle
- [ ] CSP'ye `vitals.vercel-insights.com` ekle

### Adım 3 — script-fixes.js (SONA ekle, sırayla)
- [ ] H1: Settings mapper genişletme
- [ ] T1: Bağlantı hatası handler
- [ ] T2: Offline banner
- [ ] T3: Realtime subscriptions
- [ ] H2: showLegal override
- [ ] H3: TC maskeleme
- [ ] H4: Ön kayıt KVKK rızası
- [ ] H5: Çerez bildirimi
- [ ] H6: Veri silme talebi
- [ ] H7: Admin hukuki gereksinimler kartı

### Adım 4 — sw.js
- [ ] Supabase GET için network-first cache ekle

### Adım 5 — Test
- [ ] PayTR ödeme çalışıyor mu? (kritik)
- [ ] Ön kayıt formunda KVKK checkbox var mı?
- [ ] Checkbox işaretlenmeden form gönderilemiyor mu?
- [ ] Ayarlar → Hukuki kart açılıyor mu?
- [ ] KVKK metni settings'ten geliyor mu?
- [ ] TC listede maskeli görünüyor mu?
- [ ] Sporcu profilinde "Verilerimi Sil" butonu var mı?
- [ ] Silme talebi admin panelinde görünüyor mu?
- [ ] Bağlantı kesilince banner çıkıyor mu?
- [ ] Çerez bildirimi ilk girişte görünüyor mu?

---

## DOKUNULMAYACAK DOSYALAR

| Dosya | Neden |
|-------|-------|
| `script.js` | Ana kaynak — asla değiştirilmez |
| `Security.js` | Giriş güvenliği — çalışıyor |
| `supabase/functions/paytr-token/index.ts` | PayTR çalışıyor |
| `supabase/functions/paytr-webhook/index.ts` | Webhook çalışıyor |
| `supabase/functions/send-sms/index.ts` | SMS çalışıyor |
| `ui-improvements.js` | Çalışıyor |
| `init.js` | Supabase başlatıcı |
| `style.css` | Stiller |

## DEĞİŞTİRİLECEK / EKLENECEK DOSYALAR

| Dosya | İşlem |
|-------|-------|
| `script-fixes.js` | 10 yeni blok — SONA ekle |
| `vercel.json` | analytics + CSP güncelle |
| `sw.js` | Network-first cache ekle |
| Supabase SQL | 2 yeni tablo + settings alanları |

---

## BÖLÜM 4 — SUPABASE MİGRASYON SİSTEMİ

Bu bölüm Supabase DB değişikliklerini GitHub Actions üzerinden otomatik uygular. Manuel SQL çalıştırmaya gerek kalmaz.

---

### ADIM M1 — Migration Dosyası Oluştur

**Dosya:** `supabase/migrations/002_kvkk_legal.sql` (YENİ OLUŞTUR)

```sql
-- ================================================================
-- Migration 002: KVKK Hukuki Uyum
-- Tarih: 2026-03-18
-- Açıklama: deletion_requests tablosu + settings/on_kayitlar güncelleme
-- ================================================================

-- 1. deletion_requests tablosu
CREATE TABLE IF NOT EXISTS deletion_requests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    athlete_id TEXT,
    athlete_name TEXT,
    athlete_tc TEXT,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    org_id TEXT,
    branch_id TEXT
);

ALTER TABLE deletion_requests ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='deletion_requests' AND policyname='delreq_insert_anon') THEN
        CREATE POLICY "delreq_insert_anon" ON deletion_requests FOR INSERT TO anon WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='deletion_requests' AND policyname='delreq_select_auth') THEN
        CREATE POLICY "delreq_select_auth" ON deletion_requests FOR SELECT TO authenticated USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='deletion_requests' AND policyname='delreq_update_auth') THEN
        CREATE POLICY "delreq_update_auth" ON deletion_requests FOR UPDATE TO authenticated USING (true);
    END IF;
END $$;

GRANT SELECT, INSERT ON deletion_requests TO anon;
GRANT ALL ON deletion_requests TO authenticated, service_role;

-- 2. settings tablosuna hukuki alanlar
ALTER TABLE settings
    ADD COLUMN IF NOT EXISTS kvkk_text TEXT,
    ADD COLUMN IF NOT EXISTS terms_text TEXT,
    ADD COLUMN IF NOT EXISTS data_controller_name TEXT,
    ADD COLUMN IF NOT EXISTS data_controller_address TEXT,
    ADD COLUMN IF NOT EXISTS data_controller_phone TEXT,
    ADD COLUMN IF NOT EXISTS data_controller_email TEXT,
    ADD COLUMN IF NOT EXISTS data_controller_tax_no TEXT,
    ADD COLUMN IF NOT EXISTS data_retention_years INTEGER DEFAULT 5,
    ADD COLUMN IF NOT EXISTS breach_procedure TEXT,
    ADD COLUMN IF NOT EXISTS cookie_banner_enabled BOOLEAN DEFAULT true;

-- 3. on_kayitlar tablosuna rıza alanları
ALTER TABLE on_kayitlar
    ADD COLUMN IF NOT EXISTS kvkk_consent BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS consent_date DATE;
```

---

### ADIM M2 — GitHub Actions'a Migration Adımı Ekle

**Dosya:** `.github/workflows/deploy-functions.yml` (GÜNCELLE)

Mevcut dosyayı şununla tamamen değiştir:

```yaml
name: Deploy Edge Functions & DB Migrations

on:
  push:
    branches: ["main"]
  workflow_dispatch:

jobs:
  migrate-and-deploy:
    name: Migrate DB + Deploy Supabase Edge Functions
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Apply DB Migrations
        run: supabase db push --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Deploy paytr-token
        run: supabase functions deploy paytr-token --no-verify-jwt --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Deploy paytr-webhook
        run: supabase functions deploy paytr-webhook --no-verify-jwt --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Deploy send-sms
        run: supabase functions deploy send-sms --no-verify-jwt --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

---

### ADIM M3 — supabase/config.toml Kontrolü

**Dosya:** `supabase/config.toml` — mevcut içeriği koru, sadece şunu kontrol et:

```toml
[db]
# Bu satır varsa migration sistemi çalışır
major_version = 15
```

Yoksa ekle. Dosya zaten varsa dokunma.

---

### Migration Akışı (Nasıl Çalışır)

```
1. Copilot değişiklikleri yapar
2. git push → main branch
3. GitHub Actions tetiklenir
4. supabase db push → migration SQL otomatik Supabase'e uygulanır
5. Edge functions deploy edilir
6. Vercel otomatik deploy olur (ayrı workflow)
```

**Not:** `supabase db push` komutu sadece yeni migration'ları uygular, eskilerini tekrar çalıştırmaz. `IF NOT EXISTS` ifadeleri sayesinde migration'lar idempotent (tekrar çalışsa da sorun çıkarmaz).

---

## BÖLÜM 5 — COP­ILOT İÇİN UYGULAMA TALİMATI

GitHub Copilot Agent Mode'da şu mesajı kullanın:

```
@workspace 

prompt.md dosyasındaki tüm talimatları uygula.

KURALLAR:
- script.js dosyasına kesinlikle dokunma
- Tüm JS değişiklikleri script-fixes.js dosyasının SONUNA ekle
- Mevcut script-fixes.js içeriğini silme, sadece ekle
- vercel.json'u Bölüm 1 T4'e göre güncelle
- sw.js'e T2'deki cache bloğunu ekle
- supabase/migrations/002_kvkk_legal.sql dosyasını oluştur
- .github/workflows/deploy-functions.yml'i Bölüm 4 M2'ye göre güncelle
- supabase/config.toml'ı kontrol et

SIRA:
1. supabase/migrations/002_kvkk_legal.sql oluştur
2. .github/workflows/deploy-functions.yml güncelle  
3. vercel.json güncelle
4. sw.js güncelle
5. script-fixes.js sonuna sırayla ekle:
   H1 → T1 → T2 → T3 → H2 → H3 → H4 → H5 → H6 → H7

Her değişiklikten önce ilgili dosyanın mevcut içeriğini oku.
PayTR entegrasyonunu test et — bozulmamalı.
```
