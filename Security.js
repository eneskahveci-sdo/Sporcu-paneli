// =================================================================
// DRAGOS AKADEMİ - GÜVENLİK KALKANI v3.0
// Supabase Auth bypass — TC + şifre ile direkt giriş.
// v3.0: Auth tamamen kaldırıldı, coaches/athletes tablosundan doğrulama
// =================================================================

// ── 1. YARDIMCI FONKSİYONLAR ─────────────────────────────────────

function getAuthClient() {
    return window.AppState && window.AppState.sb
        ? window.AppState.sb
        : window.getSupabase ? window.getSupabase() : null;
}

// ── 2. BRUTE FORCE KORUMASI ──────────────────────────────────────
// Sayfa yenilenince sıfırlanır — sunucu taraflı ek koruma için
// Supabase Auth'un kendi rate limiting özelliği de devrededir.

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
// index.html'e dokunmadan JS ile ekler

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
// restoreSession'ı ezip sporcu oturumunu Supabase ile de doğrular.

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
// Hem sporcu hem antrenör girişini TC+şifre ile yönetir (Auth bypass).
// Brute force koruması + hata mesajları + kalan deneme göstergesi

console.log('🛡️ Dragos Güvenlik Kalkanı v3.0 Aktif!');

window.doNormalLogin = async function(role) {
    const tcInputId   = role === 'coach' ? 'lc-tc'   : 'ls-tc';
    const passInputId = role === 'coach' ? 'lc-pass'  : 'ls-pass';
    const errId       = role === 'coach' ? 'lc-err'   : 'ls-err';

    const tcEl   = document.getElementById(tcInputId);
    const passEl = document.getElementById(passInputId);
    const errEl  = document.getElementById(errId);

    if (!tcEl || !passEl) return;

    const tc   = tcEl.value.replace(/\D/g, '').slice(0, 11);
    const pass = passEl.value.trim();

    function showErr(msg) {
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
        const sb = getAuthClient();
        if (!sb) { showErr('Bağlantı hatası. Sayfayı yenileyip tekrar deneyin.'); return; }

        // ADIM 1: TC + şifre doğrula (coaches veya athletes tablosundan)
        const { data: isValid } = await sb.rpc('verify_user_credentials', {
            p_tc: tc, p_pass: pass, p_role: role
        });

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

        // ADIM 2: Şifre doğru — kullanıcı bilgilerini çek
        _clearLoginAttempts(tc);

        // Supabase bağlantısını taze al — getSupabase() kullan
        const sb2 = window.getSupabase();

        if (role === 'coach') {
            const { data: coachRow, error: coachErr } = await sb2.from('coaches').select('*').eq('tc', tc).maybeSingle();
            console.log('coachRow:', JSON.stringify(coachRow), 'err:', coachErr);
            // AppState yoksa oluştur
            if (!window.AppState) window.AppState = {};
            if (coachRow) {
                AppState.currentUser = {
                    id: coachRow.id,
                    name: coachRow.fn + ' ' + coachRow.ln,
                    role: 'coach',
                    tc: tc
                };
                AppState.currentOrgId    = coachRow.org_id;
                AppState.currentBranchId = coachRow.branch_id;

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

                if (typeof window.loadBranchData === 'function') await window.loadBranchData();
                if (typeof window.updateBranchUI === 'function') window.updateBranchUI();
                if (typeof window.go === 'function') window.go('attendance');
            } else {
                showErr('Antrenör bilgileri bulunamadı.');
            }

        } else {
            const { data: athRow } = await sb2.from('athletes').select('*').eq('tc', tc).maybeSingle(); console.log('athRow fetched');
            if (!window.AppState) window.AppState = {};
            if (athRow) {
                AppState.currentSporcu   = DB.mappers.toAthlete(athRow);
                AppState.currentOrgId    = athRow.org_id;
                AppState.currentBranchId = athRow.branch_id;

                if (window.StorageManager) {
                    StorageManager.set('sporcu_app_sporcu', {
                        user: AppState.currentSporcu,
                        orgId: AppState.currentOrgId,
                        branchId: AppState.currentBranchId
                    });
                }

                if (typeof window.loadBranchData === 'function') await window.loadBranchData();

                const lboxWrap     = document.getElementById('lbox-wrap');
                const sporcuPortal = document.getElementById('sporcu-portal');
                const spName       = document.getElementById('sp-name');
                const spOrgname    = document.getElementById('sp-orgname');

                if (lboxWrap)     lboxWrap.style.display = 'none';
                if (sporcuPortal) sporcuPortal.style.display = 'flex';
                if (spName)       spName.textContent = athRow.fn + ' ' + athRow.ln;
                if (spOrgname)    spOrgname.textContent = AppState.data.settings?.schoolName || 'Dragos Futbol Akademisi';

                if (window.FormatUtils && window.UIUtils) {
                    UIUtils.setElementAvatar('sp-avatar', null, FormatUtils.initials(athRow.fn, athRow.ln));
                }
                if (typeof window.applyLogoEverywhere === 'function') {
                    applyLogoEverywhere(AppState.data.settings?.logoUrl || '');
                }
                if (typeof window.spTab === 'function') spTab('profil');
            } else {
                showErr('Sporcu bilgileri bulunamadı.');
            }
        }

    } catch (err) {
        console.error('Beklenmeyen giriş hatası:', err);
        showErr('Sistemsel bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
        if (btn) { btn.innerText = originalText; btn.disabled = false; }
    }
};