// =================================================================
// DRAGOS AKADEMİ - GÜVENLİK KALKANI v2.1
// Ana dosyalara dokunmadan tüm kritik açıkları kapatır.
// v2.1: DB.mappers.toAthlete null guard eklendi
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
// Hem sporcu hem antrenör girişini Supabase Auth ile yönetir.
// Brute force koruması + hata mesajları + kalan deneme göstergesi

console.log('🛡️ Dragos Güvenlik Kalkanı v2.0 Aktif!');

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

    if (!tc || !pass) {
        showErr('TC Kimlik No ve şifre giriniz!');
        return;
    }

    // Brute force kontrolü
    const rl = _checkRateLimit(tc);
    if (rl.blocked) {
        showErr('Çok fazla başarısız deneme. ' + rl.remaining + ' saniye sonra tekrar deneyin.');
        return;
    }

    // Buton yönetimi
    const btn = document.activeElement && document.activeElement.tagName === 'BUTTON'
        ? document.activeElement : null;
    const originalText = btn ? btn.innerText : 'Giriş Yap';
    if (btn) { btn.innerText = 'Giriş Yapılıyor...'; btn.disabled = true; }
    if (errEl) errEl.classList.add('dn');

    const email = tc + (role === 'coach' ? '@coach.dragos.local' : '@sporcu.dragos.local');

    try {
        const sb = getAuthClient();
        if (!sb) { showErr('Bağlantı hatası. Sayfayı yenileyip tekrar deneyin.'); return; }

        // ADIM 1: Supabase Auth ile giriş dene
        let { data: authData, error: authError } = await sb.auth.signInWithPassword({ email, password: pass });

        // ADIM 2: İlk kez giriş (Auth kaydı yok) → otomatik migrasyon
        if (authError && (authError.message.includes('Invalid login') || authError.status === 400)) {
            const { data: isValid } = await sb.rpc('verify_user_credentials', {
                p_tc: tc, p_pass: pass, p_role: role
            });

            if (isValid) {
                const { error: signUpError } = await sb.auth.signUp({
                    email,
                    password: pass,
                    options: { data: { role, tc_no: tc } }
                });
                if (signUpError) throw signUpError;

                const retry  = await sb.auth.signInWithPassword({ email, password: pass });
                authData  = retry.data;
                authError = retry.error;
            } else {
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
        } else if (authError) {
            _recordFailedAttempt(tc);
            const rl2 = _checkRateLimit(tc);
            if (rl2.blocked) {
                showErr('Çok fazla başarısız deneme. 5 dakika bekleyin.');
            } else {
                const kalan = 5 - (rl2.count || 1);
                showErr('Giriş hatası!' + (kalan > 0 ? ' (' + kalan + ' deneme hakkı kaldı)' : ''));
            }
            return;
        }

        // ADIM 3: Başarılı giriş
        if (!authError && authData && authData.session) {
            _clearLoginAttempts(tc);
            if (window.StorageManager) { StorageManager.set('user_role', role); StorageManager.set('user_tc', tc); }

            const lboxWrap = document.getElementById('lbox-wrap');
            const wrap     = document.getElementById('wrap');
            const suname   = document.getElementById('suname');
            if (lboxWrap) lboxWrap.style.display = 'none';

            if (role === 'coach') {
                // Antrenör: coaches tablosundan profil çek
                const { data: coachRow } = await sb.from('coaches').select('*').eq('tc', tc).maybeSingle();
                if (coachRow && window.AppState) {
                    AppState.currentUser = {
                        id: coachRow.id,
                        name: coachRow.fn + ' ' + coachRow.ln,
                        role: 'coach',
                        email: email
                    };
                    AppState.currentOrgId    = coachRow.org_id;
                    AppState.currentBranchId = coachRow.branch_id;
                    StorageManager.set('sporcu_app_user',   AppState.currentUser);
                    StorageManager.set('sporcu_app_org',    AppState.currentOrgId);
                    StorageManager.set('sporcu_app_branch', AppState.currentBranchId);
                    if (wrap)   wrap.classList.remove('dn');
                    if (suname) suname.textContent = AppState.currentUser.name;
                    if (typeof window.loadBranchData === 'function') await window.loadBranchData();
                    if (typeof window.updateBranchUI === 'function') window.updateBranchUI();
                    if (typeof window.go === 'function') window.go('attendance');
                } else {
                    window.location.reload();
                }
            } else {
                // Sporcu: athletes tablosundan profil çek
                const { data: athRow } = await sb.from('athletes').select('*').eq('tc', tc).maybeSingle();
                if (athRow && window.AppState && window.DB && DB.mappers && typeof DB.mappers.toAthlete === 'function') {
                    AppState.currentSporcu   = DB.mappers.toAthlete(athRow);
                    AppState.currentOrgId    = athRow.org_id;
                    AppState.currentBranchId = athRow.branch_id;
                    StorageManager.set('sporcu_app_sporcu', {
                        user: AppState.currentSporcu,
                        orgId: AppState.currentOrgId,
                        branchId: AppState.currentBranchId
                    });
                    if (typeof window.loadBranchData === 'function') await window.loadBranchData();
                    const sporcuPortal = document.getElementById('sporcu-portal');
                    const spName       = document.getElementById('sp-name');
                    const spOrgname    = document.getElementById('sp-orgname');
                    if (sporcuPortal) sporcuPortal.style.display = 'flex';
                    if (spName)    spName.textContent    = athRow.fn + ' ' + athRow.ln;
                    if (spOrgname) spOrgname.textContent = AppState.data.settings?.schoolName || 'Dragos Futbol Akademisi';
                    if (window.FormatUtils && window.UIUtils) {
                        UIUtils.setElementAvatar('sp-avatar', null, FormatUtils.initials(athRow.fn, athRow.ln));
                    }
                    if (typeof window.applyLogoEverywhere === 'function') {
                        applyLogoEverywhere(AppState.data.settings?.logoUrl || '');
                    }
                    if (typeof window.spTab === 'function') spTab('profil');
                } else {
                    window.location.reload();
                }
            }
        }

    } catch (err) {
        console.error('Beklenmeyen giriş hatası:', err);
        showErr('Sistemsel bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
        if (btn) { btn.innerText = originalText; btn.disabled = false; }
    }
};
