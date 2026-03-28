// =================================================================
// DRAGOS AKADEMİ - GÜVENLİK KALKANI v6.1
// Supabase Auth (signInWithPassword) ile güvenli giriş.
// v6.0: RPC kaldırıldı, native Supabase Auth entegrasyonu.
//       Client-side brute-force koruması kaldırıldı (Supabase Auth
//       sunucu tarafında brute-force koruması sağlar).
// v6.1: Sporcu/antrenör girişinde Auth e-posta adayları dinamik hale getirildi.
// =================================================================

// ── 0. GÖRSEL DEBUG PANELİ (iPhone için) ─────────────────────────

(function initDebugPanel() {
    if (window._debugPanelReady) return;
    window._debugPanelReady = true;

    // Debug paneli SADECE localhost'ta aktif
    var isDebugMode = window.location.hostname === 'localhost' ||
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
        try { return window.getSupabase(); } catch(e) { console.warn('getAuthClient: getSupabase hatası:', e); }
    }
    return window.AppState && window.AppState.sb ? window.AppState.sb : null;
}

// ── 2. BRUTE FORCE KORUMASI — KALDIRILDI ─────────────────────────
// Supabase Auth sunucu tarafında brute-force koruması sağlar.
// Client-side rate limiting artık gereksizdir.

// ── 3. CSP META TAG — KALDIRILDI ─────────────────────────────────
// CSP artık SADECE vercel.json HTTP header'ı üzerinden tanımlanıyor.
// Meta tag ve HTTP header çakışması önlendi.

// ── 4. ANA GİRİŞ FONKSİYONU ──────────────────────────────────────
//
// Giriş akışı (v6.0):
//   1. Supabase Auth signInWithPassword → güvenli oturum
//   2. Oturum sonrası coaches/athletes tablosundan veri çek
//   3. AppState güncelleme + UI geçişi
//
// Her sporcu/antrenör için Auth e-postası farklı olabilir:
// önce tablodaki e-posta, sonra TC tabanlı fallback denenir.

// Security modülü aktif (v6.1)

async function resolveAuthEmails(sb, role, tc) {
    const fallback = tc + '@dragosfk.com';
    const candidates = [];

    // get_auth_email RPC: sadece email döndürür, tablo içeriği sızmaz
    try {
        const rpcRole = role === 'coach' ? 'coach' : 'sporcu';
        const { data, error } = await sb.rpc('get_auth_email', {
            p_tc: tc,
            p_role: rpcRole
        });

        if (!error && data && typeof data === 'string' && data.includes('@')) {
            const dbEmail = data.trim().toLowerCase();
            // Fallback değilse öne ekle (önce denensin)
            if (dbEmail && dbEmail !== fallback) candidates.push(dbEmail);
        }
    } catch (e) {
        console.warn('email resolve warning:', e);
    }

    // Fallback her zaman eklenir — RPC hata verse bile giriş çalışır
    if (!candidates.includes(fallback)) candidates.push(fallback);
    return candidates;
}

function _securityDoNormalLogin(role) {
    return async function() {
        if (window._sessionRestoring) return; // K5: oturum geri yüklenirken çift login engelle

        const tcInputId   = role === 'coach' ? 'lc-tc'   : 'ls-tc';
        const passInputId = role === 'coach' ? 'lc-pass'  : 'ls-pass';
        const errId       = role === 'coach' ? 'lc-err'   : 'ls-err';

        const tcEl   = document.getElementById(tcInputId);
        const passEl = document.getElementById(passInputId);
        const errEl  = document.getElementById(errId);

        if (!tcEl || !passEl) {
            console.error('🔴 Input elementleri bulunamadı:', tcInputId, passInputId);
            var loadMsg = 'Giriş formu yüklenemedi. Sayfayı yenileyip tekrar deneyin.';
            if (errEl) { errEl.textContent = loadMsg; errEl.classList.remove('dn'); }
            else alert(loadMsg);
            return;
        }

        const tc   = tcEl.value.replace(/\D/g, '').slice(0, 11);
        const pass = passEl.value.trim();

        // Girdi doğrulandı

        function showErr(msg) {
            if (errEl) { errEl.textContent = msg; errEl.classList.remove('dn'); }
            else alert(msg);
        }

        if (!tc || !pass) { showErr('TC Kimlik No ve şifre giriniz!'); return; }
        if (tc.length !== 11) { showErr('TC Kimlik No 11 hane olmalıdır!'); return; }

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
            // Supabase client hazır;

            // Eski oturum varsa temizle — stale JWT yeni login'i engeller
            try {
                var _sess = await sb.auth.getSession();
                if (_sess?.data?.session) {
                    // Mevcut oturum temizleniyor
                    await sb.auth.signOut();
                }
            } catch(e) { console.warn('signOut check:', e); }

            const tableName = role === 'coach' ? 'coaches' : 'athletes';
            let row = null;

            // 1) Önce Auth ile giriş dene
            const authEmails = await resolveAuthEmails(sb, role, tc);
            let authData = null;
            let authError = null;
            let usedEmail = '';

            for (const email of authEmails) {
                // Auth deneniyor
                const { data, error } = await sb.auth.signInWithPassword({
                    email,
                    password: pass
                });
                if (!error) {
                    authData = data;
                    authError = null;
                    usedEmail = email;
                    break;
                }
                authError = error;
            }

            if (!authError && authData?.user) {
                const { data: userData, error: fetchError } = await sb
                    .from(tableName)
                    .select('*')
                    .eq('tc', tc)
                    .single();

                if (fetchError || !userData) {
                    console.error('🔴 Kullanıcı verisi çekilemedi');
                    showErr('Kullanıcı kaydı bulunamadı. Lütfen yöneticiyle iletişime geçin.');
                    return;
                }
                row = userData;
            } else {
                // 2) Auth başarısız — RPC fallback dene
                const authMsg = (authError?.message || '').toLowerCase();
                // Hem altyapı hataları hem de e-posta doğrulanmamış durumda
                // RPC fallback kullan — mevcut kullanıcılar giriş yapabilsin.
                const shouldUseRpcFallback =
                    authMsg.includes('database error querying schema') ||
                    authMsg.includes('unexpected_failure') ||
                    authMsg.includes('email not confirmed') ||
                    authMsg.includes('email_not_confirmed');

                if (!shouldUseRpcFallback) {
                    showErr('TC Kimlik No veya Şifre Hatalı');
                    return;
                }

                // Auth altyapı hatası, RPC fallback deneniyor
                const rpcRole = role === 'coach' ? 'coach' : 'sporcu';
                const { data: rpcData, error: rpcError } = await sb.rpc('login_with_tc', {
                    p_tc: tc,
                    p_pass: pass,
                    p_role: rpcRole
                });

                if (!rpcError && rpcData?.ok && rpcData?.data) {
                    row = rpcData.data;
                } else {
                    console.error('🔴 Auth ve RPC fallback başarısız');
                    showErr('TC Kimlik No veya Şifre Hatalı');
                    return;
                }
            }
            // AppState yoksa oluştur
            if (!window.AppState) {
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

                AppState.currentUser = {
                    id: row.id,
                    name: (row.fn || '') + ' ' + (row.ln || ''),
                    role: 'coach',
                    tc: tc
                };
                AppState.currentOrgId    = row.org_id;
                AppState.currentBranchId = row.branch_id;

                if (window.StorageManager) {
                    StorageManager.set('sporcu_app_user',   { ...AppState.currentUser, coach_pass: undefined });
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
                    catch(lbErr) { console.error('🔴 loadBranchData hatası'); }
                }
                if (typeof window.updateBranchUI === 'function') {
                    try { window.updateBranchUI(); } catch(e) {}
                }
                if (typeof window.go === 'function') {
                    window.go('attendance');
                }
                // Antrenör girişi tamamlandı

            } else {

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
                        user: { ...AppState.currentSporcu, spPass: undefined },
                        orgId: AppState.currentOrgId,
                        branchId: AppState.currentBranchId
                    });
                }

                if (typeof window.loadBranchData === 'function') {
                    try { await window.loadBranchData(); }
                    catch(lbErr) { console.error('🔴 loadBranchData hatası'); }
                }

                const lboxWrap     = document.getElementById('lbox-wrap');
                const sporcuPortal = document.getElementById('sporcu-portal');
                const spName       = document.getElementById('sp-name');
                const spOrgname    = document.getElementById('sp-orgname');

                if (lboxWrap)     lboxWrap.style.display = 'none';
                if (sporcuPortal) sporcuPortal.style.display = 'flex';
                if (spName)       spName.textContent = (row.fn || '') + ' ' + (row.ln || '');
                if (spOrgname)    spOrgname.textContent = AppState.data?.settings?.schoolName || 'Dragos Futbol Akademisi';

                if (window.FormatUtils && window.UIUtils) {
                    UIUtils.setElementAvatar('sp-avatar', null, FormatUtils.initials(row.fn || '', row.ln || ''));
                }
                if (typeof window.applyLogoEverywhere === 'function') {
                    applyLogoEverywhere(AppState.data?.settings?.logoUrl || '');
                }
                if (typeof window.spTab === 'function') spTab('profil');

                // Sporcu girişi tamamlandı
            }

        } catch (err) {
            console.error('🔴 Beklenmeyen giriş hatası');
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
