// =================================================================
// DRAGOS AKADEMİ - GÜVENLİK KALKANI v4.0
// Supabase Auth bypass — TC + şifre ile direkt giriş.
// v4.0: Debug panel + doNormalLogin çakışma fix + AppState guard
// =================================================================

// ── 0. GÖRSEL DEBUG PANELİ (iPhone için) ─────────────────────────

(function initDebugPanel() {
    if (window._debugPanelReady) return;
    window._debugPanelReady = true;

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

const _loginAttempts = {};

function _getRateLimitKey(tc) {
    return 'rl_' + String(tc).slice(0, 6);
}

function _checkRateLimit(tc) {
    const key = _getRateLimitKey(tc);
    const now = Date.now();
    if (!_loginAttempts[key]) return { blocked: false };
    const { count, firstAt, lockedUntil } = _loginAttempts[key];
    if (lockedUntil && now < lockedUntil) {
        return { blocked: true, remaining: Math.ceil((lockedUntil - now) / 1000) };
    }
    if (now - firstAt > 10 * 60 * 1000) {
        delete _loginAttempts[key];
        return { blocked: false };
    }
    return { blocked: false, count };
}

function _recordFailedAttempt(tc) {
    const key = _getRateLimitKey(tc);
    const now = Date.now();
    if (!_loginAttempts[key]) {
        _loginAttempts[key] = { count: 1, firstAt: now };
        return;
    }
    _loginAttempts[key].count++;
    if (_loginAttempts[key].count >= 5) {
        _loginAttempts[key].lockedUntil = now + 5 * 60 * 1000;
    }
}

function _clearLoginAttempts(tc) {
    delete _loginAttempts[_getRateLimitKey(tc)];
}

// ── 3. CSP META TAG ──────────────────────────────────────────────

(function addCSP() {
    if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
    const csp = document.createElement('meta');
    csp.httpEquiv = 'Content-Security-Policy';
    csp.content = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
        "style-src 'self' 'unsafe-inline'",
        "connect-src 'self' https://*.supabase.co https://graph.facebook.com https://api.netgsm.com.tr https://www.paytr.com",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "frame-ancestors 'none'"
    ].join('; ');
    document.head.insertBefore(csp, document.head.firstChild);
})();

// ── 4. SPORCU OTURUMU GÜVENLİĞİ ──────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        if (typeof window.restoreSession !== 'function') return;
        const _orig = window.restoreSession;
        window.restoreSession = async function() {
            const storedSporcu = window.StorageManager
                ? StorageManager.get('sporcu_app_sporcu')
                : null;
            if (storedSporcu) {
                const sb = getAuthClient();
                if (sb) {
                    try {
                        const { data: { session } } = await sb.auth.getSession();
                        if (!session) {
                            console.warn('Güvenlik: Sporcu Supabase oturumu yok, temizleniyor.');
                            if (window.StorageManager) StorageManager.remove('sporcu_app_sporcu');
                            else localStorage.removeItem('sporcu_app_sporcu');
                        }
                    } catch(e) {
                        console.warn('Güvenlik: Sporcu oturum kontrolü başarısız:', e);
                    }
                }
            }
            return _orig.apply(this, arguments);
        };
    }, 100);
}, { once: true });

// ── 5. ANA GİRİŞ FONKSİYONU ──────────────────────────────────────

console.log('🛡️ Dragos Güvenlik Kalkanı v4.0 Aktif!');

function _securityDoNormalLogin(role) {
    return async function() {
        console.log('🔐 Security v4.0 doNormalLogin başladı — role:', role);

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

            // ADIM 1: TC + şifre doğrula (RPC)
            console.log('📡 RPC çağrılıyor: verify_user_credentials...');
            const { data: isValid, error: rpcErr } = await sb.rpc('verify_user_credentials', {
                p_tc: tc, p_pass: pass, p_role: role
            });

            console.log('📡 RPC sonucu:', { isValid, rpcErr });

            if (rpcErr) {
                console.error('🔴 RPC hatası:', rpcErr);
                showErr('Sunucu hatası: ' + (rpcErr.message || 'Bilinmeyen'));
                return;
            }

            if (!isValid) {
                _recordFailedAttempt(tc);
                const rl2 = _checkRateLimit(tc);
                if (rl2.blocked) {
                    showErr('5 başarısız deneme. 5 dakika bekleyin.');
                } else {
                    const kalan = 5 - (rl2.count || 1);
                    showErr('TC veya şifre hatalı!' + (kalan > 0 ? ' (' + kalan + ' deneme hakkı kaldı)' : ''));
                }
                return;
            }

            console.log('✅ Şifre doğrulandı!');

            // ADIM 2: Kullanıcı bilgilerini çek
            _clearLoginAttempts(tc);

            // AppState yoksa oluştur (KRİTİK FIX)
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

            if (role === 'coach') {
                console.log('📡 coaches tablosu sorgulanıyor...');
                const { data: coachRow, error: coachErr } = await sb.from('coaches').select('*').eq('tc', tc).maybeSingle();
                console.log('📡 Coach sorgu sonucu:', { coachRow: coachRow ? 'VAR' : 'YOK', coachErr });

                if (coachErr) {
                    console.error('🔴 Coach sorgu hatası:', coachErr);
                    showErr('Veritabanı hatası: ' + coachErr.message);
                    return;
                }

                if (coachRow) {
                    console.log('✅ Coach bulundu:', coachRow.fn, coachRow.ln);

                    AppState.currentUser = {
                        id: coachRow.id,
                        name: coachRow.fn + ' ' + coachRow.ln,
                        role: 'coach',
                        tc: tc
                    };
                    AppState.currentOrgId    = coachRow.org_id;
                    AppState.currentBranchId = coachRow.branch_id;

                    console.log('📝 AppState güncellendi:', {
                        user: AppState.currentUser.name,
                        orgId: AppState.currentOrgId,
                        branchId: AppState.currentBranchId
                    });

                    if (window.StorageManager) {
                        StorageManager.set('sporcu_app_user',   AppState.currentUser);
                        StorageManager.set('sporcu_app_org',    AppState.currentOrgId);
                        StorageManager.set('sporcu_app_branch', AppState.currentBranchId);
                        console.log('💾 StorageManager\'a kaydedildi');
                    }

                    const lboxWrap = document.getElementById('lbox-wrap');
                    const wrap     = document.getElementById('wrap');
                    const suname   = document.getElementById('suname');

                    console.log('🖥️ UI elementleri:', { lboxWrap: !!lboxWrap, wrap: !!wrap, suname: !!suname });

                    if (lboxWrap) lboxWrap.style.display = 'none';
                    if (wrap)     wrap.classList.remove('dn');
                    if (suname)   suname.textContent = AppState.currentUser.name;

                    if (typeof window.loadBranchData === 'function') {
                        console.log('📡 loadBranchData çağrılıyor...');
                        try {
                            await window.loadBranchData();
                            console.log('✅ loadBranchData tamamlandı');
                        } catch(lbErr) {
                            console.error('🔴 loadBranchData hatası:', lbErr);
                        }
                    } else {
                        console.warn('⚠️ loadBranchData fonksiyonu bulunamadı!');
                    }

                    if (typeof window.updateBranchUI === 'function') {
                        try { window.updateBranchUI(); console.log('✅ updateBranchUI tamamlandı'); }
                        catch(ubErr) { console.error('🔴 updateBranchUI hatası:', ubErr); }
                    }

                    if (typeof window.go === 'function') {
                        console.log('🚀 go("attendance") çağrılıyor...');
                        window.go('attendance');
                        console.log('✅ Antrenör paneline giriş BAŞARILI!');
                    }
                } else {
                    console.error('🔴 Coach verisi bulunamadı (coachRow null)');
                    showErr('Antrenör bilgileri bulunamadı.');
                }

            } else {
                // SPORCU GİRİŞİ
                console.log('📡 athletes tablosu sorgulanıyor...');
                const { data: athRow, error: athErr } = await sb.from('athletes').select('*').eq('tc', tc).maybeSingle();
                console.log('📡 Athlete sorgu sonucu:', { athRow: athRow ? 'VAR' : 'YOK', athErr });

                if (athErr) {
                    console.error('🔴 Athlete sorgu hatası:', athErr);
                    showErr('Veritabanı hatası: ' + athErr.message);
                    return;
                }

                if (athRow) {
                    console.log('✅ Sporcu bulundu:', athRow.fn, athRow.ln);

                    if (window.DB && window.DB.mappers && typeof window.DB.mappers.toAthlete === 'function') {
                        AppState.currentSporcu = DB.mappers.toAthlete(athRow);
                        console.log('✅ DB.mappers.toAthlete kullanıldı');
                    } else {
                        console.warn('⚠️ DB.mappers.toAthlete yok, manuel mapping...');
                        AppState.currentSporcu = {
                            id: athRow.id, fn: athRow.fn, ln: athRow.ln, tc: athRow.tc,
                            bd: athRow.bd, gn: athRow.gn, ph: athRow.ph, em: athRow.em || '',
                            sp: athRow.sp, st: athRow.st || 'active', fee: athRow.fee || 0,
                            orgId: athRow.org_id, branchId: athRow.branch_id,
                            clsId: athRow.cls_id, pn: athRow.pn, pph: athRow.pph,
                            rd: athRow.rd, lic: athRow.lic, vd: athRow.vd,
                            cat: athRow.cat || '', nt: athRow.nt || '',
                            pem: athRow.pem || '', spPass: athRow.sp_pass || ''
                        };
                    }

                    AppState.currentOrgId    = athRow.org_id;
                    AppState.currentBranchId = athRow.branch_id;

                    if (window.StorageManager) {
                        StorageManager.set('sporcu_app_sporcu', {
                            user: AppState.currentSporcu,
                            orgId: AppState.currentOrgId,
                            branchId: AppState.currentBranchId
                        });
                    }

                    if (typeof window.loadBranchData === 'function') {
                        console.log('📡 loadBranchData çağrılıyor...');
                        try { await window.loadBranchData(); console.log('✅ loadBranchData tamamlandı'); }
                        catch(lbErr) { console.error('🔴 loadBranchData hatası:', lbErr); }
                    }

                    const lboxWrap     = document.getElementById('lbox-wrap');
                    const sporcuPortal = document.getElementById('sporcu-portal');
                    const spName       = document.getElementById('sp-name');
                    const spOrgname    = document.getElementById('sp-orgname');

                    if (lboxWrap)     lboxWrap.style.display = 'none';
                    if (sporcuPortal) sporcuPortal.style.display = 'flex';
                    if (spName)       spName.textContent = athRow.fn + ' ' + athRow.ln;
                    if (spOrgname)    spOrgname.textContent = AppState.data?.settings?.schoolName || 'Dragos Futbol Akademisi';

                    if (window.FormatUtils && window.UIUtils) {
                        UIUtils.setElementAvatar('sp-avatar', null, FormatUtils.initials(athRow.fn, athRow.ln));
                    }
                    if (typeof window.applyLogoEverywhere === 'function') {
                        applyLogoEverywhere(AppState.data?.settings?.logoUrl || '');
                    }
                    if (typeof window.spTab === 'function') spTab('profil');

                    console.log('✅ Sporcu portaline giriş BAŞARILI!');
                } else {
                    console.error('🔴 Sporcu verisi bulunamadı (athRow null)');
                    showErr('Sporcu bilgileri bulunamadı.');
                }
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

// DOMContentLoaded'da tekrar override et
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(function() {
        window.doNormalLogin = function(role) {
            return _securityDoNormalLogin(role)();
        };
        console.log('🛡️ doNormalLogin override tamamlandı (DOMContentLoaded+timeout)');
    }, 200);
}, { once: true });
