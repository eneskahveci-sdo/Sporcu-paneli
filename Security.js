// =================================================================
// DRAGOS AKADEMİ - GÜVENLİK KALKANI v5.0
// TC + TC Son 6 Hane şifre ile giriş.
// Tek RPC çağrısı (login_with_tc) — RLS ile tam uyumlu.
// v5.0: login_with_tc entegrasyonu + oturum yönetimi düzeltmeleri
// =================================================================

// ── 0. GÖRSEL DEBUG PANELİ (iPhone için) ─────────────────────────

(function initDebugPanel() {
    if (window._debugPanelReady) return;
    window._debugPanelReady = true;

    // Production'da debug paneli KAPALI — açmak için URL'e ?debug=1 ekle
    var isDebugMode = window.location.search.includes('debug=1') ||
                      window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1';
    if (!isDebugMode) return;

    var MAX_LINES = 40;
    var panel = document.createElement('div');
    panel.id = 'dbg-panel';
    panel.style.cssText = 'position:fixed;bottom:0;left:0;right:0;max-height:35vh;overflow-y:auto;' +
        'background:rgba(0,0,0,0.92);color:#0f0;font-family:monospace;font-size:11px;' +
        'z-index:99999;padding:6px 8px;display:none;border-top:2px solid #0f0;' +
        '-webkit-overflow-scrolling:touch;word-break:break-all;';

    var toggleBtn = document.createElement('button');
    toggleBtn.id = 'dbg-toggle';
    toggleBtn.textContent = '🐛 Debug';
    toggleBtn.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:100000;' +
        'background:#111;color:#0f0;border:1px solid #0f0;border-radius:6px;' +
        'padding:6px 12px;font-size:12px;font-family:monospace;cursor:pointer;' +
        'opacity:0.8;';
    toggleBtn.onclick = function() {
        var p = document.getElementById('dbg-panel');
        if (p.style.display === 'none') {
            p.style.display = 'block';
            toggleBtn.textContent = '✕ Kapat';
            toggleBtn.style.bottom = '36vh';
        } else {
            p.style.display = 'none';
            toggleBtn.textContent = '🐛 Debug';
            toggleBtn.style.bottom = '8px';
        }
    };

    function attach() {
        document.body.appendChild(panel);
        document.body.appendChild(toggleBtn);
    }
    if (document.body) attach();
    else document.addEventListener('DOMContentLoaded', attach);

    window._dbgLog = function(type, args) {
        var p = document.getElementById('dbg-panel');
        if (!p) return;

        var now = new Date();
        var ts = String(now.getHours()).padStart(2, '0') + ':' +
                 String(now.getMinutes()).padStart(2, '0') + ':' +
                 String(now.getSeconds()).padStart(2, '0');

        var colors = { log: '#0f0', warn: '#ff0', error: '#f44', info: '#4af' };
        var prefix = { log: '▸', warn: '⚠', error: '✖', info: 'ℹ' };

        var text = Array.from(args).map(function(a) {
            if (a === null) return 'null';
            if (a === undefined) return 'undefined';
            if (typeof a === 'object') {
                try { return JSON.stringify(a).substring(0, 500); }
                catch(e) { return String(a); }
            }
            return String(a);
        }).join(' ');

        var line = document.createElement('div');
        line.style.cssText = 'color:' + (colors[type] || '#0f0') + ';margin:2px 0;border-bottom:1px solid #222;padding:2px 0;';
        line.textContent = ts + ' ' + (prefix[type] || '▸') + ' ' + text;
        p.appendChild(line);

        while (p.children.length > MAX_LINES) {
            p.removeChild(p.firstChild);
        }
        p.scrollTop = p.scrollHeight;
    };

    var origLog = console.log;
    var origWarn = console.warn;
    var origError = console.error;
    var origInfo = console.info;

    console.log = function() { origLog.apply(console, arguments); window._dbgLog('log', arguments); };
    console.warn = function() { origWarn.apply(console, arguments); window._dbgLog('warn', arguments); };
    console.error = function() { origError.apply(console, arguments); window._dbgLog('error', arguments); };
    console.info = function() { origInfo.apply(console, arguments); window._dbgLog('info', arguments); };

    window.addEventListener('error', function(e) {
        window._dbgLog('error', ['UNCAUGHT: ' + e.message + ' @ ' + (e.filename || '') + ':' + (e.lineno || '')]);
    });
    window.addEventListener('unhandledrejection', function(e) {
        window._dbgLog('error', ['PROMISE REJECT: ' + (e.reason ? (e.reason.message || e.reason) : 'unknown')]);
    });
})();

// ── 1. YARDIMCI FONKSİYONLAR ─────────────────────────────────────

function getAuthClient() {
    if (window.getSupabase) {
        try { return window.getSupabase(); } catch(e) {}
    }
    return window.AppState && window.AppState.sb ? window.AppState.sb : null;
}

// ── 2. BRUTE FORCE KORUMASI ──────────────────────────────────────

// sessionStorage kullanarak rate limit verisi sayfa yenileme sonrası korunur
function _getRateLimitKey(tc) {
    return 'rl_' + String(tc).slice(0, 6);
}

function _loadAttempts(key) {
    try {
        const raw = sessionStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch(e) {
        return null;
    }
}

function _saveAttempts(key, data) {
    try {
        sessionStorage.setItem(key, JSON.stringify(data));
    } catch(e) {
        console.warn('Rate limit: sessionStorage yazılamadı:', e);
    }
}

function _deleteAttempts(key) {
    try {
        sessionStorage.removeItem(key);
    } catch(e) {
        console.warn('Rate limit: sessionStorage silinemedi:', e);
    }
}

function _checkRateLimit(tc) {
    const key = _getRateLimitKey(tc);
    const now = Date.now();
    const attempts = _loadAttempts(key);
    if (!attempts) return { blocked: false };
    const { count, firstAt, lockedUntil } = attempts;
    if (lockedUntil && now < lockedUntil) {
        return { blocked: true, remaining: Math.ceil((lockedUntil - now) / 1000) };
    }
    if (now - firstAt > 10 * 60 * 1000) {
        _deleteAttempts(key);
        return { blocked: false };
    }
    return { blocked: false, count };
}

function _recordFailedAttempt(tc) {
    const key = _getRateLimitKey(tc);
    const now = Date.now();
    const attempts = _loadAttempts(key);
    if (!attempts) {
        _saveAttempts(key, { count: 1, firstAt: now });
        return;
    }
    attempts.count++;
    if (attempts.count >= 5) {
        attempts.lockedUntil = now + 5 * 60 * 1000;
    }
    _saveAttempts(key, attempts);
}

function _clearLoginAttempts(tc) {
    _deleteAttempts(_getRateLimitKey(tc));
}

// ── 3. CSP META TAG ──────────────────────────────────────────────

(function addCSP() {
    if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
    const csp = document.createElement('meta');
    csp.httpEquiv = 'Content-Security-Policy';
    csp.content = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com https://esm.sh https://cdn.skypack.dev",
        "style-src 'self' 'unsafe-inline'",
        "connect-src 'self' https://*.supabase.co https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com https://esm.sh https://cdn.skypack.dev https://graph.facebook.com https://www.paytr.com",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "base-uri 'self'"
    ].join('; ');
    document.head.insertBefore(csp, document.head.firstChild);
})();

// ── 4. ANA GİRİŞ FONKSİYONU ──────────────────────────────────────
//
// Giriş akışı (v5.0):
//   1. Rate limit kontrolü
//   2. login_with_tc RPC → doğrulama + kullanıcı verisi tek seferde
//   3. AppState güncelleme + UI geçişi
//
// Şifre mantığı:
//   • sp_pass / coach_pass alanında özel şifre varsa onu kullan
//   • Alan boşsa varsayılan: TC'nin son 6 hanesi

console.log('🛡️ Dragos Güvenlik Kalkanı v5.0 Aktif!');

// ── 4a. CLIENT-SIDE FALLBACK GİRİŞ — KALDIRILDI ──────────────────
// Güvenlik: Client-side fallback kaldırıldı. Tüm doğrulama login_with_tc
// RPC fonksiyonu üzerinden yapılır. RPC başarısız olursa kullanıcıya
// hata mesajı gösterilir.

function _securityDoNormalLogin(role) {
    return async function() {
        console.log('🔐 Security v5.0 doNormalLogin başladı — role:', role);

        const tcInputId   = role === 'coach' ? 'lc-tc'   : 'ls-tc';
        const passInputId = role === 'coach' ? 'lc-pass'  : 'ls-pass';
        const errId       = role === 'coach' ? 'lc-err'   : 'ls-err';

        const tcEl   = document.getElementById(tcInputId);
        const passEl = document.getElementById(passInputId);
        const errEl  = document.getElementById(errId);

        if (!tcEl || !passEl) {
            console.error('🔴 Input elementleri bulunamadı:', tcInputId, passInputId);
            return;
        }

        const tc   = tcEl.value.replace(/\D/g, '').slice(0, 11);
        const pass = passEl.value.trim();

        console.log('📝 TC:', tc.substring(0, 3) + '***', 'Pass length:', pass.length, 'Role:', role);

        function showErr(msg) {
            console.warn('⚠️ Hata mesajı:', msg);
            if (errEl) { errEl.textContent = msg; errEl.classList.remove('dn'); }
            else alert(msg);
        }

        if (!tc || !pass) { showErr('TC Kimlik No ve şifre giriniz!'); return; }
        if (tc.length !== 11) { showErr('TC Kimlik No 11 hane olmalıdır!'); return; }

        const rl = _checkRateLimit(tc);
        if (rl.blocked) {
            showErr('Çok fazla başarısız deneme. ' + rl.remaining + ' saniye sonra tekrar deneyin.');
            return;
        }

        const btn = document.activeElement && document.activeElement.tagName === 'BUTTON'
            ? document.activeElement : null;
        const originalText = btn ? btn.innerText : 'Giriş Yap';
        if (btn) { btn.innerText = 'Giriş Yapılıyor...'; btn.disabled = true; }
        if (errEl) errEl.classList.add('dn');

        try {
            const sb = window.getSupabase ? window.getSupabase() : getAuthClient();
            if (!sb) {
                console.error('🔴 Supabase client alınamadı!');
                showErr('Bağlantı hatası. Sayfayı yenileyip tekrar deneyin.');
                return;
            }
            console.log('✅ Supabase client hazır');

            // Eski admin oturumu varsa temizle — stale JWT coach/athlete login'i engeller
            // Sadece aktif oturum varsa signOut yap, yoksa gereksiz signOut client state bozabilir
            try {
                var _sess = await sb.auth.getSession();
                if (_sess?.data?.session) {
                    console.log('🔑 Mevcut admin oturumu temizleniyor...');
                    await sb.auth.signOut();
                }
            } catch(e) { console.warn('signOut check:', e); }

            // Tek RPC çağrısı: doğrulama + kullanıcı verisi
            console.log('📡 RPC çağrılıyor: login_with_tc...');
            var rpcResult = null;

            try {
                const { data: rpcData, error: rpcErr } = await sb.rpc('login_with_tc', {
                    p_tc: tc, p_pass: pass, p_role: role
                });

                if (rpcErr) {
                    console.error('🔴 RPC hatası:', rpcErr.code, rpcErr.message);
                    // RPC fonksiyonu tanımlı değilse kalıcı uyarı göster
                    if (rpcErr.code === '42883' || (rpcErr.message && rpcErr.message.includes('function') && rpcErr.message.includes('does not exist'))) {
                        showErr('Giriş servisi yapılandırılmamış. Lütfen yöneticiyle iletişime geçin.');
                    } else {
                        showErr('Giriş servisi geçici olarak kullanılamıyor. Lütfen birkaç dakika sonra tekrar deneyin veya yöneticiyle iletişime geçin.');
                    }
                    return;
                } else {
                    // RPC sonucu string olabilir, parse et
                    if (typeof rpcData === 'string') {
                        try { rpcResult = JSON.parse(rpcData); }
                        catch (parseErr) {
                            console.error('🔴 RPC JSON parse hatası:', parseErr);
                            showErr('Giriş servisi geçici olarak kullanılamıyor. Lütfen birkaç dakika sonra tekrar deneyin veya yöneticiyle iletişime geçin.');
                            return;
                        }
                    } else if (rpcData === null || rpcData === undefined) {
                        console.error('🔴 RPC null yanıt — fonksiyon bulunamadı veya beklenmedik yanıt');
                        showErr('Giriş servisi yapılandırılmamış. Lütfen yöneticiyle iletişime geçin.');
                        return;
                    } else {
                        rpcResult = rpcData;
                    }
                }
            } catch (rpcCatchErr) {
                console.error('🔴 RPC çağrısı başarısız:', rpcCatchErr);
                showErr('Giriş servisi geçici olarak kullanılamıyor. Lütfen birkaç dakika sonra tekrar deneyin veya yöneticiyle iletişime geçin.');
                return;
            }

            console.log('📡 Giriş sonucu:', { ok: rpcResult?.ok, role: rpcResult?.role });

            if (!rpcResult || !rpcResult.ok) {
                _recordFailedAttempt(tc);
                const rl2 = _checkRateLimit(tc);
                if (rl2.blocked) {
                    showErr('5 başarısız deneme. 5 dakika bekleyin.');
                } else {
                    const kalan = 5 - (rl2.count || 1);
                    const errMsg = (rpcResult && rpcResult.error) || 'TC veya şifre hatalı!';
                    showErr(errMsg + (kalan > 0 ? ' (' + kalan + ' deneme hakkı kaldı)' : ''));
                }
                return;
            }

            console.log('✅ Giriş doğrulandı!');
            _clearLoginAttempts(tc);

            // AppState yoksa oluştur
            if (!window.AppState) {
                console.warn('⚠️ AppState yoktu, oluşturuluyor...');
                window.AppState = {
                    sb: sb,
                    currentUser: null,
                    currentSporcu: null,
                    currentOrgId: null,
                    currentBranchId: null,
                    data: { athletes: [], payments: [], coaches: [], attendance: {}, messages: [], settings: {}, sports: [], classes: [] },
                    filters: { athletes: { sp: '', st: '', cls: '', q: '' }, payments: { st: '', q: '' } },
                    ui: { curPage: 'dashboard' },
                    theme: 'light',
                    lang: 'TR'
                };
            }

            const row = rpcResult.data;

            if (role === 'coach') {
                console.log('✅ Coach bulundu:', row.fn, row.ln);

                AppState.currentUser = {
                    id: row.id,
                    name: row.fn + ' ' + row.ln,
                    role: 'coach',
                    tc: tc
                };
                AppState.currentOrgId    = row.org_id;
                AppState.currentBranchId = row.branch_id;

                if (window.StorageManager) {
                    StorageManager.set('sporcu_app_user',   AppState.currentUser);
                    StorageManager.set('sporcu_app_org',    AppState.currentOrgId);
                    StorageManager.set('sporcu_app_branch', AppState.currentBranchId);
                }

                const lboxWrap = document.getElementById('lbox-wrap');
                const wrap     = document.getElementById('wrap');
                const suname   = document.getElementById('suname');

                if (lboxWrap) lboxWrap.style.display = 'none';
                if (wrap)     wrap.classList.remove('dn');
                if (suname)   suname.textContent = AppState.currentUser.name;

                if (typeof window.loadBranchData === 'function') {
                    try { await window.loadBranchData(); }
                    catch(lbErr) { console.error('🔴 loadBranchData hatası:', lbErr); }
                }
                if (typeof window.updateBranchUI === 'function') {
                    try { window.updateBranchUI(); } catch(e) {}
                }
                if (typeof window.go === 'function') {
                    window.go('attendance');
                }
                console.log('✅ Antrenör paneline giriş BAŞARILI!');

            } else {
                console.log('✅ Sporcu bulundu:', row.fn, row.ln);

                if (window.DB && window.DB.mappers && typeof window.DB.mappers.toAthlete === 'function') {
                    AppState.currentSporcu = DB.mappers.toAthlete(row);
                } else {
                    AppState.currentSporcu = {
                        id: row.id, fn: row.fn, ln: row.ln, tc: row.tc,
                        bd: row.bd, gn: row.gn, ph: row.ph, em: row.em || '',
                        sp: row.sp, st: row.st || 'active', fee: row.fee || 0,
                        orgId: row.org_id, branchId: row.branch_id,
                        clsId: row.cls_id, pn: row.pn, pph: row.pph,
                        rd: row.rd, lic: row.lic, vd: row.vd,
                        cat: row.cat || '', nt: row.nt || '',
                        pem: row.pem || '', spPass: row.sp_pass || ''
                    };
                }

                AppState.currentOrgId    = row.org_id;
                AppState.currentBranchId = row.branch_id;

                if (window.StorageManager) {
                    StorageManager.set('sporcu_app_sporcu', {
                        user: AppState.currentSporcu,
                        orgId: AppState.currentOrgId,
                        branchId: AppState.currentBranchId
                    });
                }

                if (typeof window.loadBranchData === 'function') {
                    try { await window.loadBranchData(); }
                    catch(lbErr) { console.error('🔴 loadBranchData hatası:', lbErr); }
                }

                const lboxWrap     = document.getElementById('lbox-wrap');
                const sporcuPortal = document.getElementById('sporcu-portal');
                const spName       = document.getElementById('sp-name');
                const spOrgname    = document.getElementById('sp-orgname');

                if (lboxWrap)     lboxWrap.style.display = 'none';
                if (sporcuPortal) sporcuPortal.style.display = 'flex';
                if (spName)       spName.textContent = row.fn + ' ' + row.ln;
                if (spOrgname)    spOrgname.textContent = AppState.data?.settings?.schoolName || 'Dragos Futbol Akademisi';

                if (window.FormatUtils && window.UIUtils) {
                    UIUtils.setElementAvatar('sp-avatar', null, FormatUtils.initials(row.fn, row.ln));
                }
                if (typeof window.applyLogoEverywhere === 'function') {
                    applyLogoEverywhere(AppState.data?.settings?.logoUrl || '');
                }
                if (typeof window.spTab === 'function') spTab('profil');

                console.log('✅ Sporcu portaline giriş BAŞARILI!');
            }

        } catch (err) {
            console.error('🔴 Beklenmeyen giriş hatası:', err);
            showErr('Sistemsel bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            if (btn) { btn.innerText = originalText; btn.disabled = false; }
        }
    };
}

// İlk atama
window.doNormalLogin = function(role) {
    return _securityDoNormalLogin(role)();
};

// DOMContentLoaded'da tekrar override et (diğer script'lerin üzerine yaz)
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        window.doNormalLogin = function(role) {
            return _securityDoNormalLogin(role)();
        };
        console.log('🛡️ doNormalLogin override tamamlandı (v5.0)');
    }, 200);
}, { once: true });
