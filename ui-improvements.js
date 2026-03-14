/* ═══════════════════════════════════════════════════════════
   DRAGOS FUTBOL AKADEMİSİ — UI/UX İYİLEŞTİRME PAKETİ v1.0
   ═══════════════════════════════════════════════════════════ */

console.log('🎨 UI İyileştirme Paketi v1.0 yükleniyor...');

// ── 1) MOBİL UX CSS ─────────────────────────────────────

(function mobileUXFixes() {
    var style = document.createElement('style');
    style.id = 'ui-improvements-css';
    style.textContent = `
    html { overscroll-behavior: none; }
    .btn, button, select, .ni, .sp-tab, .bni-btn, .att-b, .ltab {
        min-height: 44px !important;
        min-width: 44px !important;
    }
    input, select, textarea {
        font-size: 16px !important;
        border-radius: 10px !important;
        transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
    }
    input:focus, select:focus, textarea:focus {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15) !important;
        border-color: var(--blue2, #3b82f6) !important;
        outline: none !important;
    }
    .btn, button {
        transition: transform 0.1s ease, opacity 0.1s ease, box-shadow 0.15s ease !important;
        -webkit-tap-highlight-color: transparent;
    }
    .btn:active, button:active {
        transform: scale(0.96) !important;
        opacity: 0.85 !important;
    }
    #main {
        transition: opacity 0.15s ease, transform 0.15s ease !important;
    }
    #main.page-exit {
        opacity: 0 !important;
        transform: translateY(6px) !important;
    }
    #main.page-enter {
        opacity: 1 !important;
        transform: translateY(0) !important;
    }
    .card {
        transition: transform 0.2s ease, box-shadow 0.2s ease !important;
    }
    @media (hover: hover) {
        .card:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
        }
    }
    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }
    .skeleton {
        background: linear-gradient(90deg, var(--bg3, #1a1a2e) 25%, var(--bg2, #252540) 50%, var(--bg3, #1a1a2e) 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s ease infinite;
        border-radius: 8px;
    }
    .skeleton-text { height: 14px; margin: 8px 0; }
    .skeleton-title { height: 22px; width: 60%; margin: 8px 0; }
    .skeleton-avatar { width: 48px; height: 48px; border-radius: 50%; }
    .skeleton-card { height: 80px; margin: 8px 0; }
    .skeleton-stat { height: 100px; border-radius: 12px; }
    #conn-banner {
        position: fixed; top: 0; left: 0; right: 0; z-index: 10000;
        text-align: center; font-size: 13px; font-weight: 700; padding: 8px 16px;
        transform: translateY(-100%);
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }
    #conn-banner.show { transform: translateY(0); }
    #conn-banner.offline { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; }
    #conn-banner.online { background: linear-gradient(135deg, #16a34a, #15803d); color: white; }
    .toast {
        border-radius: 12px !important; padding: 12px 20px !important;
        font-weight: 600 !important; font-size: 13px !important;
        backdrop-filter: blur(12px) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
        max-width: 340px !important;
        animation: toast-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    @keyframes toast-in {
        from { transform: translateY(20px) scale(0.95); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
    }
    @keyframes gentle-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
    }
    #login-logo { animation: gentle-float 4s ease-in-out infinite; }
    @keyframes fade-up {
        from { opacity: 0; transform: translateY(15px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .lbox { animation: fade-up 0.5s ease forwards; }
    .ltab {
        transition: all 0.25s ease !important;
        position: relative;
    }
    .ltab.on::after {
        content: ''; position: absolute; bottom: 0; left: 20%; right: 20%;
        height: 3px; background: var(--blue2, #3b82f6);
        border-radius: 3px 3px 0 0; animation: tab-underline 0.25s ease;
    }
    @keyframes tab-underline { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @media (max-width: 768px) {
        table { font-size: 13px !important; }
        th, td { padding: 10px 8px !important; }
        td { max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    }
    .sp-tab { transition: all 0.2s ease !important; border-radius: 8px 8px 0 0; }
    .sp-tab.on { font-weight: 700 !important; }
    .att-b { border-radius: 8px !important; font-weight: 600 !important; transition: all 0.15s ease !important; }
    .att-b:active { transform: scale(0.93) !important; }
    .modal-content, #modal > div {
        border-radius: 16px !important;
        animation: modal-pop 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    @keyframes modal-pop { from { transform: scale(0.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .stat-card { position: relative; overflow: hidden; }
    .stat-card::before {
        content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%);
        pointer-events: none;
    }
    .prb > div, .progress-ring-fill { transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1) !important; }
    @keyframes badge-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
    .bg-y, .badge-yellow { animation: badge-pulse 2s ease infinite; }
    #side { transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important; }
    #overlay { transition: opacity 0.3s ease !important; }
    .empty-state { text-align: center; padding: 40px 20px; opacity: 0.8; }
    ::-webkit-scrollbar { width: 4px; height: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
    *:focus-visible { outline: 2px solid var(--blue2, #3b82f6) !important; outline-offset: 2px !important; }
    `;
    document.head.appendChild(style);
    console.log('✅ Mobil UX CSS enjekte edildi');
})();

// ── 2) BAĞLANTI TAKİBİ ──────────────────────────────────

(function connectionMonitor() {
    var banner = document.createElement('div');
    banner.id = 'conn-banner';
    function attach() { document.body.appendChild(banner); }
    if (document.body) attach(); else document.addEventListener('DOMContentLoaded', attach);

    var hideTimer = null;
    function showBanner(type, msg) {
        banner.className = type + ' show';
        banner.textContent = msg;
        clearTimeout(hideTimer);
        if (type === 'online') {
            hideTimer = setTimeout(function() { banner.classList.remove('show'); }, 3000);
        }
    }
    window.addEventListener('offline', function() { showBanner('offline', '📡 İnternet bağlantısı kesildi'); });
    window.addEventListener('online', function() { showBanner('online', '✅ Bağlantı yeniden sağlandı'); });

    window._connRetryCount = 0;
    var _origFetch = window.fetch;
    window.fetch = function() {
        return _origFetch.apply(this, arguments).then(function(response) {
            if (window._connRetryCount > 0) { window._connRetryCount = 0; }
            return response;
        }).catch(function(err) {
            window._connRetryCount++;
            if (window._connRetryCount >= 2) {
                showBanner('offline', '📡 Sunucu bağlantısı zayıf...');
            }
            throw err;
        });
    };
    console.log('✅ Bağlantı takibi aktif');
})();

// ── 3) SAYFA GEÇİŞ ANİMASYONU ──────────────────────────

(function patchGoForAnimation() {
    var _prevGo = window.go;
    if (!_prevGo) return;
    window.go = function(page, params) {
        var main = document.getElementById('main');
        if (main) { main.classList.add('page-exit'); main.classList.remove('page-enter'); }
        setTimeout(function() {
            _prevGo.call(window, page, params);
            if (main) {
                main.classList.remove('page-exit');
                main.classList.add('page-enter');
                setTimeout(function() { main.classList.remove('page-enter'); }, 200);
            }
        }, 80);
    };
    console.log('✅ Sayfa geçiş animasyonları aktif');
})();

// ── 4) GELİŞMİŞ HATA YÖNETİMİ ─────────────────────────

(function enhancedErrorHandling() {
    var ERROR_MESSAGES = {
        'Failed to fetch': 'İnternet bağlantınızı kontrol edin',
        'NetworkError': 'Ağ hatası — bağlantınızı kontrol edin',
        '23505': 'Bu kayıt zaten mevcut',
        '42501': 'Bu işlem için yetkiniz yok',
        'JWT': 'Oturum süresi dolmuş — lütfen tekrar giriş yapın'
    };
    window._friendlyError = function(err) {
        var msg = err && (err.message || err.details || String(err)) || 'Bilinmeyen hata';
        for (var key in ERROR_MESSAGES) {
            if (msg.indexOf(key) !== -1) return ERROR_MESSAGES[key];
        }
        if (msg.length > 100) return 'Bir hata oluştu. Lütfen tekrar deneyin.';
        return msg;
    };

    if (window.DB && window.DB.query) {
        var _origQuery = window.DB.query;
        window.DB.query = async function(table, filters) {
            for (var attempt = 0; attempt <= 2; attempt++) {
                try {
                    var result = await _origQuery.call(this, table, filters);
                    return result;
                } catch(e) {
                    console.warn('DB.query retry ' + (attempt + 1) + '/3 (' + table + '):', e.message);
                    if (attempt === 2) {
                        if (typeof toast === 'function') toast('📡 Veri yüklenemedi: ' + window._friendlyError(e), 'e');
                        return null;
                    }
                    await new Promise(function(r) { setTimeout(r, 500 * (attempt + 1)); });
                }
            }
        };
    }
    console.log('✅ Gelişmiş hata yönetimi aktif');
})();

// ── 5) FORM VALİDASYON ──────────────────────────────────

(function formValidation() {
    document.addEventListener('input', function(e) {
        var el = e.target;
        if (!el || el.tagName !== 'INPUT') return;
        var id = el.id || '';
        if (id.includes('-tc') || id === 'ok-tc' || id === 'eok-tc') {
            var val = el.value.replace(/\D/g, '');
            if (val.length === 11) {
                if (window.FormatUtils && typeof FormatUtils.tcValidate === 'function') {
                    el.style.borderColor = FormatUtils.tcValidate(val) ? 'var(--green, #22c55e)' : 'var(--red, #ef4444)';
                }
            } else if (val.length > 0) {
                el.style.borderColor = 'var(--yellow, #eab308)';
            } else {
                el.style.borderColor = '';
            }
        }
        if (el.type === 'email' && el.value.length > 0) {
            el.style.borderColor = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value)
                ? 'var(--green, #22c55e)' : 'var(--red, #ef4444)';
        }
    });
    console.log('✅ Form validasyon iyileştirmeleri aktif');
})();

// ── 6) OTURUM SÜRESİ UYARISI ───────────────────────────

(function sessionTimeout() {
    var IDLE_TIMEOUT = 30 * 60 * 1000;
    var WARNING_BEFORE = 5 * 60 * 1000;
    var idleTimer = null, warningTimer = null;

    function resetIdle() {
        clearTimeout(idleTimer);
        clearTimeout(warningTimer);
        if (!window.AppState || (!AppState.currentUser && !AppState.currentSporcu)) return;
        warningTimer = setTimeout(function() {
            if (typeof toast === 'function') toast('⏰ 5 dakika içinde oturumunuz sonlanacak.', 'e');
        }, IDLE_TIMEOUT - WARNING_BEFORE);
        idleTimer = setTimeout(function() {
            if (typeof toast === 'function') toast('🔒 Güvenlik nedeniyle oturumunuz kapatıldı.', 'e');
            setTimeout(function() {
                if (typeof window.doLogout === 'function') window.doLogout();
                else if (typeof window.doSporcuLogout === 'function') window.doSporcuLogout();
                else location.reload();
            }, 2000);
        }, IDLE_TIMEOUT);
    }
    ['mousedown', 'touchstart', 'keydown', 'scroll'].forEach(function(evt) {
        document.addEventListener(evt, resetIdle, { passive: true });
    });
    document.addEventListener('DOMContentLoaded', function() { setTimeout(resetIdle, 2000); });
    console.log('✅ Oturum süresi takibi aktif (30dk)');
})();

// ── 7) ÇİFT TIKLAMA KORUMASI ───────────────────────────

(function doubleClickProtection() {
    var processing = new Set();
    document.addEventListener('click', function(e) {
        var btn = e.target.closest('button.bp, button.bd');
        if (!btn) return;
        if (processing.has(btn)) { e.preventDefault(); e.stopPropagation(); return; }
        var onclick = btn.getAttribute('onclick') || '';
        if (onclick.includes('save') || onclick.includes('del') || onclick.includes('upsert')) {
            processing.add(btn);
            btn.style.opacity = '0.6';
            btn.style.pointerEvents = 'none';
            setTimeout(function() {
                processing.delete(btn);
                btn.style.opacity = '';
                btn.style.pointerEvents = '';
            }, 3000);
        }
    }, true);
    console.log('✅ Çift tıklama koruması aktif');
})();

console.log('🎨 UI İyileştirme Paketi v1.1 — Tüm modüller yüklendi!');

// ── 8) LOCALSTORAGE VERİ GİZLEME PATCH'İ ───────────────────
// StorageManager'ı patch'le — düz metin yerine base64 encoding
// NOT: Bu şifreleme (encryption) değil, sadece görsel gizlemedir (obfuscation).
//      Hassas veriler localStorage'da saklanmamalıdır.
// Mevcut verileri otomatik migrate eder

(function patchStorageManager() {
    if (!window.StorageManager) return;

    var _origSet = StorageManager.set.bind(StorageManager);
    var _origGet = StorageManager.get.bind(StorageManager);

    StorageManager.set = function(key, value) {
        try {
            if (!this.isAvailable()) return false;
            var encoded = btoa(unescape(encodeURIComponent(JSON.stringify(value))));
            localStorage.setItem(key, encoded);
            return true;
        } catch(e) {
            // Fallback: düz metin
            return _origSet(key, value);
        }
    };

    StorageManager.get = function(key) {
        try {
            if (!this.isAvailable()) return null;
            var raw = localStorage.getItem(key);
            if (!raw) return null;

            // Önce base64 decode dene (yeni format)
            try {
                var decoded = decodeURIComponent(escape(atob(raw)));
                return JSON.parse(decoded);
            } catch(e) {
                // Base64 değilse eski format (düz JSON) — migrate et
                try {
                    var parsed = JSON.parse(raw);
                    // Otomatik migrate: eski formatı yeni formata çevir
                    StorageManager.set(key, parsed);
                    return parsed;
                } catch(e2) {
                    return null;
                }
            }
        } catch(e) {
            return _origGet(key);
        }
    };

    console.log('✅ localStorage güvenlik patch\'i aktif');
})();

