/* ═══════════════════════════════════════════════════════════
   DRAGOS — PWA Register v1.0
   Service Worker kaydı + iOS kurulum banner'ı
   ═══════════════════════════════════════════════════════════ */

console.log('📱 PWA Register yükleniyor...');

// ── SERVICE WORKER KAYDI ────────────────────────────────

if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then(function(reg) {
                console.log('✅ Service Worker kayıtlı — scope:', reg.scope);
                reg.addEventListener('updatefound', function() {
                    var newWorker = reg.installing;
                    newWorker.addEventListener('statechange', function() {
                        if (newWorker.state === 'activated') {
                            if (typeof toast === 'function') toast('🔄 Uygulama güncellendi!', 'g');
                        }
                    });
                });
            })
            .catch(function(err) {
                console.warn('⚠️ Service Worker kayıt hatası:', err);
            });
    });
}

// ── iOS "ANA EKRANA EKLE" BANNER'I ──────────────────────

(function iosInstallBanner() {
    var isStandalone = window.navigator.standalone === true ||
                       window.matchMedia('(display-mode: standalone)').matches;

    if (isStandalone) {
        console.log('📱 PWA standalone modda çalışıyor');
        document.documentElement.classList.add('pwa-standalone');

        // Safe area CSS
        var safeCSS = document.createElement('style');
        safeCSS.textContent = 
            'body{padding-top:env(safe-area-inset-top)!important;padding-bottom:env(safe-area-inset-bottom)!important}' +
            '#lbox-wrap{padding-top:calc(env(safe-area-inset-top)+16px)!important}' +
            '.sp-head{padding-top:calc(env(safe-area-inset-top)+8px)!important}' +
            '#side{padding-top:calc(env(safe-area-inset-top)+8px)!important}' +
            '.bni,.sp-tabs{padding-bottom:env(safe-area-inset-bottom)!important}' +
            '.pwa-standalone #dbg-toggle{bottom:4px!important}';
        document.head.appendChild(safeCSS);
        return;
    }

    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    var isAndroid = /Android/.test(navigator.userAgent) && /Chrome/.test(navigator.userAgent);

    // Daha önce kapatılmış mı?
    try {
        var dismissed = localStorage.getItem('pwa_banner_dismissed');
        if (dismissed) {
            var daysSince = (Date.now() - new Date(dismissed).getTime()) / (1000 * 60 * 60 * 24);
            if (daysSince < 14) return;
        }
    } catch(e) {}

    function showBanner() {
        if (!window.AppState) return;
        if (!AppState.currentUser && !AppState.currentSporcu) return;
        if (document.getElementById('pwa-install-banner')) return;

        // Banner CSS
        if (!document.getElementById('pwa-banner-css')) {
            var css = document.createElement('style');
            css.id = 'pwa-banner-css';
            css.textContent = '@keyframes pwa-slide-up{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}';
            document.head.appendChild(css);
        }

        var banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:9999;' +
            'background:linear-gradient(135deg,#1e293b,#0f172a);' +
            'border-top:1px solid rgba(59,130,246,0.3);' +
            'padding:16px 20px;display:flex;align-items:center;gap:14px;' +
            'box-shadow:0 -4px 20px rgba(0,0,0,0.4);' +
            'animation:pwa-slide-up 0.4s cubic-bezier(0.4,0,0.2,1);' +
            'backdrop-filter:blur(12px);';

        var instruction = '';
        if (isIOS) {
            instruction = 'Paylaş <span style="font-size:16px">⎙</span> → "Ana Ekrana Ekle"';
        } else if (isAndroid) {
            instruction = 'Menü → "Ana ekrana ekle"';
        } else {
            instruction = 'Tarayıcı menüsünden "Ana Ekrana Ekle"';
        }

        banner.innerHTML = 
            '<div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">⚽</div>' +
            '<div style="flex:1;min-width:0">' +
                '<div style="font-weight:700;font-size:14px;color:#e2e8f0;margin-bottom:2px">Uygulamayı Yükle</div>' +
                '<div style="font-size:12px;color:#94a3b8;line-height:1.4">' + instruction + '</div>' +
            '</div>' +
            '<button onclick="dismissPWABanner()" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:8px;color:#94a3b8;padding:8px 14px;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;min-height:36px">Kapat</button>';

        document.body.appendChild(banner);
    }

    window.dismissPWABanner = function() {
        var banner = document.getElementById('pwa-install-banner');
        if (banner) {
            banner.style.transform = 'translateY(100%)';
            banner.style.opacity = '0';
            banner.style.transition = 'all 0.3s ease';
            setTimeout(function() { banner.remove(); }, 300);
        }
        try { localStorage.setItem('pwa_banner_dismissed', new Date().toISOString()); } catch(e) {}
    };

    // Android native install
    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        setTimeout(function() {
            e.prompt();
            e.userChoice.then(function() {
                var b = document.getElementById('pwa-install-banner');
                if (b) b.remove();
            });
        }, 3000);
    });

    // Giriş sonrası banner göster
    setTimeout(function() {
        showBanner();
        if (!window.AppState || (!AppState.currentUser && !AppState.currentSporcu)) {
            var check = setInterval(function() {
                if (window.AppState && (AppState.currentUser || AppState.currentSporcu)) {
                    clearInterval(check);
                    setTimeout(showBanner, 2000);
                }
            }, 3000);
            setTimeout(function() { clearInterval(check); }, 60000);
        }
    }, 3000);
})();

console.log('📱 PWA Register v1.0 — tüm modüller yüklendi!');
