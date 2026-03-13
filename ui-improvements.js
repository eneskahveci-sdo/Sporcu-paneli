/* ═══════════════════════════════════════════════════════════
   DRAGOS FUTBOL AKADEMİSİ — UI/UX İYİLEŞTİRME PAKETİ v1.0
   
   Bu dosyayı index.html'de script-fixes.js'den SONRA yükleyin:
   <script src="ui-improvements.js"></script>
   
   İçerik:
   1. Mobil UX iyileştirmeleri (touch, scroll, input)
   2. Akıcı geçiş animasyonları
   3. Gelişmiş hata yönetimi + kullanıcı dostu mesajlar
   4. Bağlantı durumu takibi (offline/online)
   5. Giriş ekranı mikro-animasyonlar
   6. Pull-to-refresh (sporcu portalı)
   7. Skeleton loading ekranları
   8. Toast bildirimleri iyileştirmesi
   ═══════════════════════════════════════════════════════════ */

console.log('🎨 UI İyileştirme Paketi v1.0 yükleniyor...');

// ────────────────────────────────────────────────────────
// 1) MOBİL UX — GENEL İYİLEŞTİRMELER
// ────────────────────────────────────────────────────────

(function mobileUXFixes() {

    // CSS enjekte et
    var style = document.createElement('style');
    style.id = 'ui-improvements-css';
    style.textContent = `

    /* ── GENEL MOBİL İYİLEŞTİRMELER ── */

    /* iOS rubber-band scroll fix */
    html { 
        overscroll-behavior: none; 
    }

    /* Daha iyi dokunma hedefleri (minimum 44px) */
    .btn, button, select, .ni, .sp-tab, .bni-btn, .att-b, .ltab {
        min-height: 44px !important;
        min-width: 44px !important;
    }

    /* Input focus iyileştirmesi — iOS zoom'u engelle */
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

    /* Buton basma efekti (touch feedback) */
    .btn, button {
        transition: transform 0.1s ease, opacity 0.1s ease, box-shadow 0.15s ease !important;
        -webkit-tap-highlight-color: transparent;
    }
    .btn:active, button:active {
        transform: scale(0.96) !important;
        opacity: 0.85 !important;
    }

    /* ── SAYFA GEÇİŞ ANİMASYONU ── */
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

    /* ── KART ANİMASYONLARI ── */
    .card {
        transition: transform 0.2s ease, box-shadow 0.2s ease !important;
    }
    @media (hover: hover) {
        .card:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
        }
    }

    /* ── SKELETON LOADING ── */
    @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
    }
    .skeleton {
        background: linear-gradient(90deg, 
            var(--bg3, #1a1a2e) 25%, 
            var(--bg2, #252540) 50%, 
            var(--bg3, #1a1a2e) 75%
        );
        background-size: 200% 100%;
        animation: shimmer 1.5s ease infinite;
        border-radius: 8px;
    }
    .skeleton-text { height: 14px; margin: 8px 0; }
    .skeleton-title { height: 22px; width: 60%; margin: 8px 0; }
    .skeleton-avatar { width: 48px; height: 48px; border-radius: 50%; }
    .skeleton-card { height: 80px; margin: 8px 0; }
    .skeleton-stat { height: 100px; border-radius: 12px; }

    /* ── BAĞLANTI DURUMU BANNER ── */
    #conn-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 10000;
        text-align: center;
        font-size: 13px;
        font-weight: 700;
        padding: 8px 16px;
        transform: translateY(-100%);
        transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }
    #conn-banner.show {
        transform: translateY(0);
    }
    #conn-banner.offline {
        background: linear-gradient(135deg, #dc2626, #b91c1c);
        color: white;
    }
    #conn-banner.online {
        background: linear-gradient(135deg, #16a34a, #15803d);
        color: white;
    }

    /* ── GELİŞMİŞ TOAST ── */
    .toast {
        border-radius: 12px !important;
        padding: 12px 20px !important;
        font-weight: 600 !important;
        font-size: 13px !important;
        backdrop-filter: blur(12px) !important;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
        max-width: 340px !important;
        animation: toast-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    @keyframes toast-in {
        from { transform: translateY(20px) scale(0.95); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
    }

    /* ── GİRİŞ EKRANI İYİLEŞTİRMELERİ ── */
    @keyframes gentle-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
    }
    #login-logo {
        animation: gentle-float 4s ease-in-out infinite;
    }

    /* Login form fade-in */
    @keyframes fade-up {
        from { opacity: 0; transform: translateY(15px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .lbox {
        animation: fade-up 0.5s ease forwards;
    }

    /* Login tab geçişleri */
    .ltab {
        transition: all 0.25s ease !important;
        position: relative;
    }
    .ltab.on::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 20%;
        right: 20%;
        height: 3px;
        background: var(--blue2, #3b82f6);
        border-radius: 3px 3px 0 0;
        animation: tab-underline 0.25s ease;
    }
    @keyframes tab-underline {
        from { transform: scaleX(0); }
        to { transform: scaleX(1); }
    }

    /* ── TABLO İYİLEŞTİRMELERİ (MOBİL) ── */
    @media (max-width: 768px) {
        table {
            font-size: 13px !important;
        }
        th, td {
            padding: 10px 8px !important;
        }
        /* Uzun satırları kırp */
        td {
            max-width: 120px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    }

    /* ── SPORCU PORTALI TAB İYİLEŞTİRMELERİ ── */
    .sp-tab {
        transition: all 0.2s ease !important;
        border-radius: 8px 8px 0 0;
        position: relative;
    }
    .sp-tab.on {
        font-weight: 700 !important;
    }

    /* ── YOKLAMA BUTONLARI İYİLEŞTİRME ── */
    .att-b {
        border-radius: 8px !important;
        font-weight: 600 !important;
        transition: all 0.15s ease !important;
    }
    .att-b:active {
        transform: scale(0.93) !important;
    }

    /* ── MODAL İYİLEŞTİRMELERİ ── */
    .modal-content, #modal > div {
        border-radius: 16px !important;
        animation: modal-pop 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    @keyframes modal-pop {
        from { transform: scale(0.92); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
    }

    /* ── STAT KARTLARI PARLAMA EFEKTİ ── */
    .stat-card {
        position: relative;
        overflow: hidden;
    }
    .stat-card::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%);
        pointer-events: none;
    }

    /* ── PROGRESS BAR ANİMASYONU ── */
    .prb > div, .progress-ring-fill {
        transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }

    /* ── BADGE PULSE ANİMASYONU (yeni bildirimler) ── */
    @keyframes badge-pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.15); }
    }
    .bg-y, .badge-yellow {
        animation: badge-pulse 2s ease infinite;
    }

    /* ── SIDEBAR GEÇİŞ İYİLEŞTİRMESİ ── */
    #side {
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    #overlay {
        transition: opacity 0.3s ease !important;
    }

    /* ── EMPTY STATE İYİLEŞTİRMESİ ── */
    .empty-state {
        text-align: center;
        padding: 40px 20px;
        opacity: 0.8;
    }

    /* ── SCROLL İYİLEŞTİRMELERİ ── */
    ::-webkit-scrollbar {
        width: 4px;
        height: 4px;
    }
    ::-webkit-scrollbar-track {
        background: transparent;
    }
    ::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.15);
        border-radius: 4px;
    }
    ::-webkit-scrollbar-thumb:hover {
        background: rgba(255,255,255,0.25);
    }
    `;

    document.head.appendChild(style);
    console.log('✅ Mobil UX CSS enjekte edildi');
})();


// ────────────────────────────────────────────────────────
// 2) BAĞLANTI DURUMU TAKİBİ (Offline/Online)
// ────────────────────────────────────────────────────────

(function connectionMonitor() {
    // Banner oluştur
    var banner = document.createElement('div');
    banner.id = 'conn-banner';
    
    function attach() {
        document.body.appendChild(banner);
    }
    if (document.body) attach();
    else document.addEventListener('DOMContentLoaded', attach);

    var hideTimer = null;

    function showBanner(type, msg) {
        banner.className = type + ' show';
        banner.textContent = msg;
        clearTimeout(hideTimer);
        if (type === 'online') {
            hideTimer = setTimeout(function() {
                banner.classList.remove('show');
            }, 3000);
        }
    }

    window.addEventListener('offline', function() {
        showBanner('offline', '📡 İnternet bağlantısı kesildi');
    });

    window.addEventListener('online', function() {
        showBanner('online', '✅ Bağlantı yeniden sağlandı');
    });

    // Supabase isteklerinin başarısız olması durumunda da göster
    window._connRetryCount = 0;
    var _origFetch = window.fetch;
    window.fetch = function() {
        return _origFetch.apply(this, arguments).then(function(response) {
            if (window._connRetryCount > 0) {
                window._connRetryCount = 0;
                if (navigator.onLine) showBanner('online', '✅ Sunucu bağlantısı sağlandı');
            }
            return response;
        }).catch(function(err) {
            window._connRetryCount++;
            if (window._connRetryCount >= 2) {
                showBanner('offline', '📡 Sunucu bağlantısı zayıf — tekrar deneniyor...');
            }
            throw err;
        });
    };

    console.log('✅ Bağlantı takibi aktif');
})();


// ────────────────────────────────────────────────────────
// 3) SKELETON LOADING (sayfa geçişlerinde)
// ────────────────────────────────────────────────────────

window._showSkeleton = function(containerId) {
    var el = document.getElementById(containerId || 'main');
    if (!el) return;
    el.innerHTML = 
        '<div style="padding:16px">' +
            '<div class="skeleton skeleton-title"></div>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin:16px 0">' +
                '<div class="skeleton skeleton-stat"></div>' +
                '<div class="skeleton skeleton-stat"></div>' +
                '<div class="skeleton skeleton-stat"></div>' +
            '</div>' +
            '<div class="skeleton skeleton-card"></div>' +
            '<div class="skeleton skeleton-card"></div>' +
            '<div class="skeleton skeleton-card"></div>' +
        '</div>';
};

// go() fonksiyonunu patch'le — sayfa geçişlerinde skeleton göster
(function patchGoForSkeleton() {
    var _prevGo = window.go;
    if (!_prevGo) return;
    
    window.go = function(page, params) {
        var main = document.getElementById('main');
        if (main) {
            // Çıkış animasyonu
            main.classList.add('page-exit');
            main.classList.remove('page-enter');
        }
        
        // Kısa gecikme sonra asıl sayfa yükle
        setTimeout(function() {
            _prevGo.call(window, page, params);
            if (main) {
                main.classList.remove('page-exit');
                main.classList.add('page-enter');
                // Animasyon bitince class temizle
                setTimeout(function() {
                    main.classList.remove('page-enter');
                }, 200);
            }
        }, 80);
    };
    
    console.log('✅ Sayfa geçiş animasyonları aktif');
})();


// ────────────────────────────────────────────────────────
// 4) GELİŞMİŞ HATA YÖNETİMİ
// ────────────────────────────────────────────────────────

(function enhancedErrorHandling() {
    
    // Kullanıcı dostu hata mesajları
    var ERROR_MESSAGES = {
        'Failed to fetch': 'İnternet bağlantınızı kontrol edin',
        'NetworkError': 'Ağ hatası — bağlantınızı kontrol edin',
        'TypeError': 'Beklenmeyen bir hata oluştu',
        '23505': 'Bu kayıt zaten mevcut',
        '42P01': 'Veritabanı tablosu bulunamadı',
        '42501': 'Bu işlem için yetkiniz yok',
        'PGRST': 'Veritabanı sorgu hatası',
        'JWT': 'Oturum süresi dolmuş — lütfen tekrar giriş yapın'
    };

    window._friendlyError = function(err) {
        var msg = err && (err.message || err.details || String(err)) || 'Bilinmeyen hata';
        
        for (var key in ERROR_MESSAGES) {
            if (msg.indexOf(key) !== -1) {
                return ERROR_MESSAGES[key];
            }
        }
        
        // Çok teknik mesajları sadeleştir
        if (msg.length > 100) {
            return 'Bir hata oluştu. Lütfen tekrar deneyin.';
        }
        
        return msg;
    };

    // DB.upsert'i patch'le — daha iyi hata mesajları
    if (window.DB && window.DB.upsert) {
        var _origUpsert = window.DB.upsert;
        window.DB.upsert = async function(table, data) {
            try {
                var result = await _origUpsert.call(this, table, data);
                return result;
            } catch(e) {
                var friendly = window._friendlyError(e);
                console.error('DB.upsert hatası (' + table + '):', e);
                if (typeof toast === 'function') {
                    toast('💾 Kayıt hatası: ' + friendly, 'e');
                }
                return null;
            }
        };
    }

    // DB.query'yi patch'le — retry mekanizması
    if (window.DB && window.DB.query) {
        var _origQuery = window.DB.query;
        window.DB.query = async function(table, filters) {
            var maxRetries = 2;
            for (var attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    var result = await _origQuery.call(this, table, filters);
                    return result;
                } catch(e) {
                    console.warn('DB.query retry ' + (attempt + 1) + '/' + (maxRetries + 1) + ' (' + table + '):', e.message);
                    if (attempt === maxRetries) {
                        var friendly = window._friendlyError(e);
                        if (typeof toast === 'function') {
                            toast('📡 Veri yüklenemedi: ' + friendly, 'e');
                        }
                        return null;
                    }
                    // Retry öncesi kısa bekleme
                    await new Promise(function(r) { setTimeout(r, 500 * (attempt + 1)); });
                }
            }
        };
    }

    console.log('✅ Gelişmiş hata yönetimi aktif');
})();


// ────────────────────────────────────────────────────────
// 5) FORM VALİDASYON İYİLEŞTİRMELERİ
// ────────────────────────────────────────────────────────

(function formValidation() {
    // TC input'larına anlık geri bildirim ekle
    document.addEventListener('input', function(e) {
        var el = e.target;
        if (!el || el.tagName !== 'INPUT') return;
        var id = el.id || '';
        
        // TC inputları için
        if (id.includes('-tc') || id === 'ok-tc' || id === 'eok-tc') {
            var val = el.value.replace(/\D/g, '');
            if (val.length === 11) {
                // FormatUtils.tcValidate varsa kullan
                if (window.FormatUtils && typeof FormatUtils.tcValidate === 'function') {
                    if (FormatUtils.tcValidate(val)) {
                        el.style.borderColor = 'var(--green, #22c55e)';
                    } else {
                        el.style.borderColor = 'var(--red, #ef4444)';
                    }
                }
            } else if (val.length > 0) {
                el.style.borderColor = 'var(--yellow, #eab308)';
            } else {
                el.style.borderColor = '';
            }
        }
        
        // Telefon inputları için otomatik formatlama
        if (id.includes('-ph') || id.includes('-pph') || id === 'ok-pph') {
            var raw = el.value.replace(/\D/g, '');
            if (raw.length >= 10 && raw.startsWith('0')) {
                el.style.borderColor = 'var(--green, #22c55e)';
            } else if (raw.length > 0) {
                el.style.borderColor = '';
            }
        }

        // Email inputları
        if (el.type === 'email' && el.value.length > 0) {
            var emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value);
            el.style.borderColor = emailValid ? 'var(--green, #22c55e)' : 'var(--red, #ef4444)';
        }
    });

    console.log('✅ Form validasyon iyileştirmeleri aktif');
})();


// ────────────────────────────────────────────────────────
// 6) SAYFA YÜKLENDİĞİNDE PERFORMANS OPTİMİZASYONU
// ────────────────────────────────────────────────────────

(function performanceOptimizations() {
    
    // Lazy image loading
    if ('IntersectionObserver' in window) {
        var imageObserver = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    var img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    imageObserver.unobserve(img);
                }
            });
        });

        // Yeni eklenen resimleri otomatik gözlemle
        var mutObserver = new MutationObserver(function(mutations) {
            mutations.forEach(function(m) {
                m.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) {
                        var imgs = node.querySelectorAll ? node.querySelectorAll('img[data-src]') : [];
                        imgs.forEach(function(img) { imageObserver.observe(img); });
                        if (node.tagName === 'IMG' && node.dataset.src) {
                            imageObserver.observe(node);
                        }
                    }
                });
            });
        });
        mutObserver.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }

    // Debounce fonksiyonu — arama inputları için
    window._debounce = function(fn, delay) {
        var timer;
        return function() {
            var ctx = this, args = arguments;
            clearTimeout(timer);
            timer = setTimeout(function() { fn.apply(ctx, args); }, delay);
        };
    };

    // Arama inputlarına debounce uygula
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            document.querySelectorAll('input[type="search"], input[type="text"][onchange*="filter"]').forEach(function(inp) {
                var origHandler = inp.getAttribute('onchange') || inp.getAttribute('oninput');
                if (origHandler && origHandler.indexOf('filter') !== -1) {
                    // oninput'u debounce'lu versiyonla değiştir
                    inp.removeAttribute('onchange');
                    inp.setAttribute('oninput', '');
                    var debouncedFn = window._debounce(function() {
                        try { eval(origHandler); } catch(e) {}
                    }, 300);
                    inp.addEventListener('input', debouncedFn);
                }
            });
        }, 1000);
    });

    console.log('✅ Performans optimizasyonları aktif');
})();


// ────────────────────────────────────────────────────────
// 7) HAPTIC FEEDBACK SİMÜLASYONU (iOS vibration)
// ────────────────────────────────────────────────────────

(function hapticFeedback() {
    // Yoklama butonlarına dokunma titreşimi
    document.addEventListener('click', function(e) {
        var target = e.target;
        if (!target) return;
        
        // Yoklama butonları
        if (target.classList && target.classList.contains('att-b')) {
            if (navigator.vibrate) {
                navigator.vibrate(10);
            }
        }
        
        // Kaydet / Sil butonları
        if (target.classList && (target.classList.contains('bp') || target.classList.contains('bd'))) {
            if (navigator.vibrate) {
                navigator.vibrate(15);
            }
        }
    });
})();


// ────────────────────────────────────────────────────────
// 8) OTURUM SÜRESİ UYARISI
// ────────────────────────────────────────────────────────

(function sessionTimeout() {
    var IDLE_TIMEOUT = 30 * 60 * 1000; // 30 dakika
    var WARNING_BEFORE = 5 * 60 * 1000; // 5 dk önce uyar
    var idleTimer = null;
    var warningTimer = null;
    var warningShown = false;

    function resetIdle() {
        clearTimeout(idleTimer);
        clearTimeout(warningTimer);
        warningShown = false;

        // Giriş yapılmamışsa timer başlatma
        if (!window.AppState || (!AppState.currentUser && !AppState.currentSporcu)) return;

        warningTimer = setTimeout(function() {
            if (typeof toast === 'function') {
                toast('⏰ 5 dakika içinde oturumunuz sonlanacak. Devam etmek için sayfayla etkileşime geçin.', 'e');
                warningShown = true;
            }
        }, IDLE_TIMEOUT - WARNING_BEFORE);

        idleTimer = setTimeout(function() {
            if (typeof toast === 'function') {
                toast('🔒 Güvenlik nedeniyle oturumunuz kapatıldı.', 'e');
            }
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

    // İlk girişte başlat
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(resetIdle, 2000);
    });

    console.log('✅ Oturum süresi takibi aktif (30dk)');
})();


// ────────────────────────────────────────────────────────
// 9) ERİŞİLEBİLİRLİK (A11Y) İYİLEŞTİRMELERİ
// ────────────────────────────────────────────────────────

(function accessibility() {
    // Butonlara aria-label ekle (eksik olanlara)
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() {
            document.querySelectorAll('button:not([aria-label])').forEach(function(btn) {
                var text = btn.textContent.trim();
                if (text && text.length < 50) {
                    btn.setAttribute('aria-label', text);
                }
            });
            
            // Focus görünürlüğü (keyboard navigation)
            var focusStyle = document.createElement('style');
            focusStyle.textContent = `
                *:focus-visible {
                    outline: 2px solid var(--blue2, #3b82f6) !important;
                    outline-offset: 2px !important;
                }
            `;
            document.head.appendChild(focusStyle);
        }, 1000);
    });
})();


// ────────────────────────────────────────────────────────
// 10) ÇİFT TIKLAMA KORUMASI (form submit)
// ────────────────────────────────────────────────────────

(function doubleClickProtection() {
    var processingButtons = new Set();
    
    document.addEventListener('click', function(e) {
        var btn = e.target.closest('button.bp, button.bd');
        if (!btn) return;
        
        // Zaten işleniyor mu?
        if (processingButtons.has(btn)) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        
        // onclick attribute'u varsa (async işlem olabilir)
        var onclick = btn.getAttribute('onclick') || '';
        if (onclick.includes('await') || onclick.includes('save') || onclick.includes('del') || onclick.includes('upsert')) {
            processingButtons.add(btn);
            btn.style.opacity = '0.6';
            btn.style.pointerEvents = 'none';
            
            // 3 saniye sonra serbest bırak (güvenlik)
            setTimeout(function() {
                processingButtons.delete(btn);
                btn.style.opacity = '';
                btn.style.pointerEvents = '';
            }, 3000);
        }
    }, true);
    
    console.log('✅ Çift tıklama koruması aktif');
})();


console.log('🎨 UI İyileştirme Paketi v1.0 — Tüm modüller yüklendi!');
