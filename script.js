/* ============================================================
   DRAGOS FUTBOL AKADEMISI - GELİŞMİŞ PROFİL SİSTEMİ
   Mobil Uyumlu ve Hata Düzeltmeleri
   ============================================================ */

window.onerror = function(msg, url, line, col, error) {
    console.error('Global Error:', msg);
    if (typeof toast === 'function') {
        toast('Beklenmeyen bir hata oluştu. Sayfa yenilenebilir.', 'e');
    }
    return false;
};

// Mobil uyumlu localStorage wrapper
// Private browsing / iOS kısıtlamaları için in-memory fallback
const _memStore = {};
const StorageManager = {
    isAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    },

    get(key) {
        try {
            if (!this.isAvailable()) return _memStore[key] !== undefined ? _memStore[key] : null;
            const item = localStorage.getItem(key);
            if (!item) return null;

            // Try base64 decode first (data may be encoded by ui-improvements.js patch)
            try {
                const decoded = decodeURIComponent(escape(atob(item)));
                return JSON.parse(decoded);
            } catch (_) {
                // Not base64 — try plain JSON
                try {
                    return JSON.parse(item);
                } catch (_2) {
                    return null;
                }
            }
        } catch (e) {
            console.warn('Storage get error:', e);
            return null;
        }
    },
    
    set(key, value) {
        try {
            if (!this.isAvailable()) {
                _memStore[key] = value;
                return true;
            }
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('Storage set error:', e);
            return false;
        }
    },

    remove(key) {
        try {
            if (!this.isAvailable()) { delete _memStore[key]; return true; }
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn('Storage remove error:', e);
            return false;
        }
    },

    clear() {
        try {
            if (!this.isAvailable()) { Object.keys(_memStore).forEach(k => delete _memStore[k]); return true; }
            localStorage.clear();
            return true;
        } catch (e) {
            console.warn('Storage clear error:', e);
            return false;
        }
    }
};

// ── Aktif Oturum Yöneticisi ───────────────────────────────────────────────
// Her login'de session_start() RPC çağırır, UUID'yi saklar.
// 60sn'de bir heartbeat: FALSE dönerse admin kapattı → otomatik logout.
const SessionManager = {
    _id: null,
    _iv: null,

    async start(name, role, tc, orgId, branchId) {
        try {
            const sb = getSupabase();
            if (!sb) return;
            const { data, error } = await sb.rpc('session_start', {
                p_name: name, p_role: role, p_tc: tc || null,
                p_org_id: orgId || null, p_branch_id: branchId || null
            });
            if (error || !data) { console.warn('session_start:', error); return; }
            this._id = data;
            StorageManager.set('_sid', data);
            this._startBeat();
        } catch(e) { console.warn('SessionManager.start:', e); }
    },

    resume() {
        const stored = StorageManager.get('_sid');
        if (!stored) return;
        this._id = stored;
        // Hemen kontrol et, sonra periyodik heartbeat başlat
        this._beat().then(() => { if (this._id) this._startBeat(); });
    },

    async end() {
        this._stopBeat();
        const id = this._id;
        this._id = null;
        StorageManager.remove('_sid');
        if (!id) return;
        try {
            const sb = getSupabase();
            if (sb) await sb.rpc('session_end', { p_session_id: id });
        } catch(e) {}
    },

    _startBeat() {
        this._stopBeat();
        this._iv = setInterval(() => this._beat(), 60000);
    },

    _stopBeat() {
        if (this._iv) { clearInterval(this._iv); this._iv = null; }
    },

    async _beat() {
        if (!this._id) return;
        try {
            const sb = getSupabase();
            if (!sb) return;
            const { data, error } = await sb.rpc('session_heartbeat', { p_session_id: this._id });
            if (error || data === false) {
                // Admin bu oturumu kapattı
                this._stopBeat();
                this._id = null;
                StorageManager.clear();
                location.reload();
            }
        } catch(e) { console.warn('Heartbeat:', e); }
    },

    async list() {
        try {
            const sb = getSupabase();
            const { data, error } = await sb.rpc('sessions_list');
            if (error) throw error;
            return data || [];
        } catch(e) { console.warn('sessions_list:', e); return []; }
    },

    async killAll() {
        const sb = getSupabase();
        const { data } = await sb.rpc('sessions_kill_all', { p_exclude_id: this._id || null });
        return data || 0;
    },

    async kill(sessionId) {
        const sb = getSupabase();
        await sb.rpc('session_kill', { p_session_id: sessionId });
    }
};

// Supabase bağlantısı — anon key public-safe (RLS politikaları korur)
// Bu key sadece public veri erişimi içindir, service_role key ASLA ekleme.
const SUPABASE_CONFIG = {
    url: 'https://wfarbydojxtufnkjuhtc.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYXJieWRvanh0dWZua2p1aHRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTA1MzUsImV4cCI6MjA4ODIyNjUzNX0.-v9mu-jvt-sFOLyki5uKvEbh3uY_3e3wHniKj8PezYw'
};

const DEFAULT_LOGO = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIzMCIgZmlsbD0iIzNiODJmNiIvPjxwYXRoIGQ9Ik0zMiAxMEw0MiAyOEwyNCAyOEwzMiAxMFoiIGZpbGw9IndoaXRlIi8+PHBhdGggZD0iTTMyIDU0TDQyIDM2TDI0IDM2TDMyIDU0WiIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNMTAgMzJMMjggMjJMMjggNDJMMTAgMzJaIiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik01NCAzMkwzNiAyMkwzNiA0Mkw1NCAzMloiIGZpbGw9IndoaXRlIi8+PC9zdmc+';

const AppState = {
    sb: null,
    currentUser: null,
    currentSporcu: null,
    currentOrgId: null,
    currentBranchId: null,
    theme: StorageManager.get('sporcu_theme') || 'light',
    lang: StorageManager.get('sporcu_lang') || 'TR',
    data: {
        athletes: [],
        payments: [],
        coaches: [],
        attendance: {},
        messages: [],
        settings: {},
        sports: [],
        classes: []
    },
    filters: {
        athletes: { sp: '', st: '', cls: '', q: '' },
        payments: { st: '', q: '' }
    },
    ui: {
        curPage: 'dashboard',
        atd: '',
        atcls: '',
        profileTab: 'overview',
        paymentsTab: 'islemler',
        activePlanId: null,
        selectedPayMethod: null,
        athPage: 0,
        payPage: 0,
        okPage: 0
    }
};

// K5: Oturum geri yükleme mutex'i — restoreSession() çalışırken doLogin() tetiklenmesin
let _sessionRestoring = false;

const i18n = {
    TR: {
        loading: 'Yükleniyor...', menuMain: 'Ana Menü', menuDash: 'Ana Sayfa', menuAth: 'Sporcular',
        menuSpo: 'Branşlar', menuCls: 'Sınıflar', menuAtt: 'Devam (Yoklama)', menuCoa: 'Antrenörler',
        menuFinSec: 'Yönetim (Muhasebe)', menuPay: 'Ödemeler', menuAcc: 'Finans / Rapor',
        menuSms: 'SMS Duyuru', menuSysSec: 'Sistem', menuSet: 'Ayarlar',
        roleAdmin: 'Yönetici', roleCoach: 'Antrenör', btnLogout: 'Çıkış Yap',
        spProfil: 'Profil', spYoklama: 'Yoklama', spOdemeler: 'Ödemeler', spOdemeYap: 'Ödeme Yap',
        saveSuccess: 'Başarıyla kaydedildi!', saveError: 'Kayıt hatası!',
        deleteConfirm: 'Silmek istediğinize emin misiniz?', fillRequired: 'Zorunlu alanları doldurun!',
        invalidTC: 'Geçersiz TC Kimlik numarası', connectionError: 'Bağlantı hatası!',
        noData: 'Veri bulunamadı', exportSuccess: 'Dışa aktarıldı!',
        profileOverview: 'Genel Bakış', profilePersonal: 'Kişisel Bilgiler', profileContact: 'İletişim',
        profilePayments: 'Ödeme Geçmişi', profileAttendance: 'Devam Durumu', profileStats: 'İstatistikler',
        profileDocuments: 'Belgeler', profileEdit: 'Profili Düzenle', profileView: 'Profili Görüntüle',
        personalInfo: 'Kişisel Bilgiler', contactInfo: 'İletişim Bilgileri', parentInfo: 'Veli Bilgileri',
        financialInfo: 'Finansal Bilgiler', registrationDate: 'Kayıt Tarihi', birthDate: 'Doğum Tarihi',
        age: 'Yaş', gender: 'Cinsiyet', branch: 'Branş', class: 'Sınıf', status: 'Durum',
        phone: 'Telefon', email: 'E-posta', address: 'Adres', parentName: 'Veli Adı',
        parentPhone: 'Veli Telefon', parentEmail: 'Veli E-posta', monthlyFee: 'Aylık Ücret',
        totalPaid: 'Toplam Ödenen', totalDebt: 'Toplam Borç', attendanceRate: 'Devam Oranı',
        lastPayment: 'Son Ödeme', nextPayment: 'Sonraki Ödeme', active: 'Aktif', inactive: 'Pasif',
        present: 'Var', absent: 'Yok', excused: 'İzinli', late: 'Geç', paymentPending: 'Bekliyor',
        paymentCompleted: 'Tamamlandı', paymentOverdue: 'Gecikti'
    },
    EN: {
        loading: 'Loading...', menuMain: 'Main Menu', menuDash: 'Home', menuAth: 'Athletes',
        menuSpo: 'Sports', menuCls: 'Classes', menuAtt: 'Attendance', menuCoa: 'Coaches',
        menuFinSec: 'Finance', menuPay: 'Payments', menuAcc: 'Financial Report',
        menuSms: 'SMS Alerts', menuSysSec: 'System', menuSet: 'Settings',
        roleAdmin: 'Administrator', roleCoach: 'Coach', btnLogout: 'Log Out',
        spProfil: 'Profile', spYoklama: 'Attendance', spOdemeler: 'Payments', spOdemeYap: 'Make Payment',
        saveSuccess: 'Saved successfully!', saveError: 'Save error!',
        deleteConfirm: 'Are you sure you want to delete?', fillRequired: 'Please fill required fields!',
        invalidTC: 'Invalid ID number', connectionError: 'Connection error!',
        noData: 'No data found', exportSuccess: 'Exported!',
        profileOverview: 'Overview', profilePersonal: 'Personal Info', profileContact: 'Contact',
        profilePayments: 'Payment History', profileAttendance: 'Attendance', profileStats: 'Statistics',
        profileDocuments: 'Documents', profileEdit: 'Edit Profile', profileView: 'View Profile',
        personalInfo: 'Personal Information', contactInfo: 'Contact Information', parentInfo: 'Parent Information',
        financialInfo: 'Financial Information', registrationDate: 'Registration Date', birthDate: 'Birth Date',
        age: 'Age', gender: 'Gender', branch: 'Branch', class: 'Class', status: 'Status',
        phone: 'Phone', email: 'Email', address: 'Address', parentName: 'Parent Name',
        parentPhone: 'Parent Phone', parentEmail: 'Parent Email', monthlyFee: 'Monthly Fee',
        totalPaid: 'Total Paid', totalDebt: 'Total Debt', attendanceRate: 'Attendance Rate',
        lastPayment: 'Last Payment', nextPayment: 'Next Payment', active: 'Active', inactive: 'Inactive',
        present: 'Present', absent: 'Absent', excused: 'Excused', late: 'Late', paymentPending: 'Pending',
        paymentCompleted: 'Completed', paymentOverdue: 'Overdue'
    }
};

const DateUtils = {
    today() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },
    format(dateStr) {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
        } catch {
            return dateStr;
        }
    },
    age(birthDate) {
        if (!birthDate) return '-';
        const d = new Date(birthDate), now = new Date();
        if (isNaN(d.getTime())) return '-';
        let age = now.getFullYear() - d.getFullYear();
        if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--;
        return age;
    },
    addMonths(dateStr, months) {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        d.setMonth(d.getMonth() + months);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
};

const FormatUtils = {
    number(n) {
        return Number(n || 0).toLocaleString('tr-TR');
    },
    currency(n) {
        return `${this.number(n)} ₺`;
    },
    escape(str) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
        return String(str || '').replace(/[&<>"']/g, c => map[c]);
    },
    tcValidate(tc) {
        if (!tc || tc.length !== 11 || !/^\d{11}$/.test(tc)) return false;
        // TC Kimlik algoritması
        const digits = tc.split('').map(Number);
        const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
        const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
        const digit10 = (oddSum * 7 - evenSum) % 10;
        const digit11 = (oddSum + evenSum + digits[9]) % 10;
        return digits[9] === digit10 && digits[10] === digit11;
    },
    initials(firstName, lastName) {
        return `${(firstName || '').charAt(0)}${(lastName || '').charAt(0)}`.toUpperCase();
    },
    // TC input temizleme
    cleanTC(value) {
        return String(value || '').replace(/\D/g, '').slice(0, 11);
    }
};

function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }
    // Fallback only for non-HTTPS environments where crypto is unavailable
    console.warn('generateId: crypto API kullanılamıyor, Math.random() fallback aktif. HTTPS ortamında çalışın.');
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

function getSupabase() {
    if (!AppState.sb) {
        try {
            if (typeof supabase === 'undefined') {
                console.error('Supabase library not loaded');
                toast(i18n[AppState.lang].connectionError, 'e');
                return null;
            }
            AppState.sb = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: false
                }
            });
        } catch (e) {
            console.error('Supabase init error');
            toast(i18n[AppState.lang].connectionError, 'e');
        }
    }
    return AppState.sb;
}

// Asenkron versiyon: Supabase yüklenmesini bekler
async function waitForSupabase(maxWait) {
    maxWait = maxWait || 8000;
    var interval = 300;
    var elapsed = 0;
    while (typeof supabase === 'undefined' && elapsed < maxWait) {
        await new Promise(function(r) { setTimeout(r, interval); });
        elapsed += interval;
    }
    return getSupabase();
}
window.waitForSupabase = waitForSupabase;

const ToastManager = {
    activeToasts: [],
    show(msg, type = 'info') {
        while (this.activeToasts.length >= 3) {
            const old = this.activeToasts.shift();
            if (old && old.remove) old.remove();
        }
        const t = document.createElement('div');
        t.className = `toast ${type === 'e' ? 'toast-e' : type === 'g' ? 'toast-g' : ''}`;
        t.textContent = msg;
        document.body.appendChild(t);
        this.activeToasts.push(t);
        requestAnimationFrame(() => t.classList.add('show'));
        setTimeout(() => {
            t.classList.remove('show');
            setTimeout(() => {
                t.remove();
                const idx = this.activeToasts.indexOf(t);
                if (idx > -1) this.activeToasts.splice(idx, 1);
            }, 300);
        }, 3000);
    }
};
const toast = (msg, type) => ToastManager.show(msg, type);

const ModalManager = {
    open(title, body, buttons) {
        const m = document.getElementById('modal');
        if (!m) return;
        const mt = document.getElementById('modal-title');
        const mb = document.getElementById('modal-body');
        const mf = document.getElementById('modal-footer');
        if (mt) mt.textContent = title;
        if (mb) mb.innerHTML = body;
        if (!mf) return;
        mf.innerHTML = '';
        (buttons || []).forEach(btn => {
            const b = document.createElement('button');
            b.className = `btn ${btn.cls}`;
            b.textContent = btn.lbl;
            b.onclick = async () => {
                b.textContent = '⏳';
                b.disabled = true;
                try {
                    await btn.fn();
                } finally {
                    b.textContent = btn.lbl;
                    b.disabled = false;
                }
            };
            mf.appendChild(b);
        });
        m.classList.add('show');
    },
    close() {
        const m = document.getElementById('modal');
        if (m) m.classList.remove('show');
    },
    confirm(title, message, onConfirm) {
        this.open(title, `<p class="tsm tm">${FormatUtils.escape(message)}</p>`, [
            { lbl: AppState.lang === 'TR' ? 'Vazgeç' : 'Cancel', cls: 'bs', fn: () => this.close() },
            { lbl: 'OK', cls: 'bd', fn: async () => { this.close(); await onConfirm(); } }
        ]);
    }
};
const modal = ModalManager.open.bind(ModalManager);
const closeModal = ModalManager.close.bind(ModalManager);
window.closeModal = closeModal;
const confirm2 = ModalManager.confirm.bind(ModalManager);

const UIUtils = {
    getValue(id) {
        const el = document.getElementById(id);
        return el ? el.value.trim() : '';
    },
    getNumber(id) {
        return parseFloat(this.getValue(id)) || 0;
    },
    setLoading(show) {
        const el = document.getElementById('loading-overlay');
        if (el) el.style.display = show ? 'flex' : 'none';
    },
    getAvatar(size, url, initials) {
        const logoUrl = url || AppState.data.settings?.logoUrl || DEFAULT_LOGO;
        if (initials) {
            return `<div class="ava" style="width:${size}px;height:${size}px;flex-shrink:0;font-size:${size/2}px;background:var(--grad);display:flex;align-items:center;justify-content:center">${initials}</div>`;
        }
        return `<div class="ava" style="width:${size}px;height:${size}px;flex-shrink:0;background-image:url('${logoUrl}');background-size:cover;background-position:center;border:1px solid var(--border);background-color:var(--bg3)"></div>`;
    },
    setElementAvatar(id, url, initials) {
        const el = document.getElementById(id);
        if (!el) return;
        if (initials) {
            el.innerHTML = initials;
            el.style.cssText = `width:40px;height:40px;background:var(--grad);display:flex;align-items:center;justify-content:center;font-size:20px;color:#fff;border-radius:50%`;
        } else {
            const logoUrl = url || AppState.data.settings?.logoUrl || DEFAULT_LOGO;
            const _safeCssUrl = logoUrl.replace(/"/g, '%22');
            el.innerHTML = '';
            el.style.cssText = `background-image:url("${_safeCssUrl}");background-size:cover;background-position:center;`;
        }
    }
};

function applyTheme(theme) {
    const isLight = theme === 'light';
    const btn = document.getElementById('theme-btn');
    const spBtn = document.getElementById('sp-theme-btn');
    document.documentElement.classList.add('theme-transitioning');
    if (isLight) {
        document.documentElement.setAttribute('data-theme', 'light');
        if (btn) btn.innerHTML = '&#x25D0;';
        if (spBtn) spBtn.innerHTML = '&#x25D0;';
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (btn) btn.innerHTML = '&#x25D1;';
        if (spBtn) spBtn.innerHTML = '&#x25D1;';
    }
    StorageManager.set('sporcu_theme', theme);
    AppState.theme = theme;
    setTimeout(function(){ document.documentElement.classList.remove('theme-transitioning'); }, 400);
}

function toggleTheme() {
    applyTheme(AppState.theme === 'dark' ? 'light' : 'dark');
}

function applyLang(lang) {
    AppState.lang = lang;
    StorageManager.set('sporcu_lang', lang);
    const btn = document.getElementById('lang-btn');
    if (btn) btn.textContent = lang === 'TR' ? 'EN' : 'TR';
    const sel = document.getElementById('s-lang-select');
    if (sel && sel.value !== lang) sel.value = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[lang] && i18n[lang][key]) {
            el.textContent = i18n[lang][key];
        }
    });
}

function toggleLang() {
    const newLang = AppState.lang === 'TR' ? 'EN' : 'TR';
    applyLang(newLang);
    const mw = document.getElementById('main-wrap');
    if (mw && !mw.classList.contains('dn')) {
        go(AppState.ui.curPage);
    }
}

window.changeLang = function(val) {
    applyLang(val);
    const mw = document.getElementById('main-wrap');
    if (mw && !mw.classList.contains('dn')) {
        go(AppState.ui.curPage);
    }
};

window.switchLoginTab = function(tab) {
    const sporcuEl = document.getElementById('login-sporcu');
    const coachEl = document.getElementById('login-coach');
    const adminEl = document.getElementById('login-admin');

    if (sporcuEl) sporcuEl.classList.toggle('dn', tab !== 'sporcu');
    if (coachEl)  coachEl.classList.toggle('dn',  tab !== 'coach');
    if (adminEl)  adminEl.classList.toggle('dn',  tab !== 'admin');

    document.querySelectorAll('#login-tabs .ltab').forEach(function(t) {
        t.classList.toggle('on', t.getAttribute('data-tab') === tab);
    });
};

window.showLegal = function(type) {
    const content = {
        kvkk: {
            title: 'KVKK Aydınlatma Metni',
            body: `<div style="line-height:1.7;color:var(--text2);max-height:400px;overflow-y:auto;">
                <p class="mb2"><strong>Veri Sorumlusu:</strong> Dragos Futbol Akademisi</p>
                <p class="mb2">6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında:</p>
                <ul style="margin-left:20px;margin-bottom:16px;">
                    <li>Kişisel verileriniz yalnızca sporcu kayıt ve takip süreçleri için işlenmektedir.</li>
                    <li>Verileriniz 3. şahıslarla paylaşılmaz.</li>
                    <li>Veri saklama süresi: Kayıt tarihinden itibaren 10 yıl.</li>
                </ul>
                <p class="mb2"><strong>Veri Sorumlusu İletişim Bilgileri:</strong></p>
                <p class="mb2">📍 Cevizli, Hacılar Cd. No:72, 34846 Maltepe/İstanbul</p>
                <p class="mb2">📞 <a href="tel:+905495147227" style="color:inherit">0549 514 72 27</a></p>
                <p>✉️ <a href="mailto:dragosfutbolakademisi@gmail.com" style="color:inherit">dragosfutbolakademisi@gmail.com</a></p>
            </div>`
        },
        kullanim: {
            title: 'Kullanım Şartları',
            body: `<div style="line-height:1.7;color:var(--text2);max-height:400px;overflow-y:auto;">
                <p class="mb2"><strong>1. Kabul</strong></p>
                <p class="mb2">Bu sistemi kullanarak kullanım şartlarını kabul etmiş olursunuz.</p>
                <p class="mb2"><strong>2. Hesap Güvenliği</strong></p>
                <p>TC kimlik numaranız ve şifreniz size özeldir.</p>
            </div>`
        }
    };
    const info = content[type];
    if (info) {
        modal(info.title, info.body, [{ lbl: AppState.lang === 'TR' ? 'Kapat' : 'Close', cls: 'bs', fn: closeModal }]);
    }
};

const DB = {
    mappers: {
        toAthlete(r) {
            // Ekstra alanları nt kolonundan parse et
            let extra = {};
            try { extra = JSON.parse(r.nt || '{}'); } catch(e) { extra = {}; }
            
            return {
                id: r.id, fn: r.fn, ln: r.ln, tc: r.tc, bd: r.bd, gn: r.gn,
                ph: r.ph, em: r.em || '', sp: r.sp, cat: r.cat || '', lic: r.lic,
                rd: r.rd, st: r.st || 'active', fee: r.fee || 0, vd: r.vd,
                nt: r.nt, clsId: r.cls_id, pn: r.pn, pph: r.pph, pem: r.pem,
                spPass: r.sp_pass, orgId: r.org_id, branchId: r.branch_id,
                photoUrl: r.photo_url || '',
                address: extra.address || '',
                city: extra.city || '',
                emergency: extra.emergency || '',
                blood: extra.blood || '',
                height: extra.height || '',
                weight: extra.weight || '',
                health: extra.health || '',
                school: extra.school || ''
            };
        },
        fromAthlete(a) {
            const str = (v) => (v === undefined || v === null) ? '' : String(v);
            const num = (v) => (v === undefined || v === null || v === '') ? 0 : Number(v) || 0;
            
            // Tabloda olmayan alanları nt (notes) kolonuna JSON olarak sakla
            const extra = {
                blood: str(a.blood),
                height: a.height || null,
                weight: a.weight || null,
                health: str(a.health),
                emergency: str(a.emergency),
                school: str(a.school),
                city: str(a.city),
                address: str(a.address)
            };
            
            // Sadece temel tabloda garantili olan kolonlar
            const result = {
                id: a.id,
                org_id: a.orgId || AppState.currentOrgId || '',
                branch_id: a.branchId || AppState.currentBranchId || '',
                fn: str(a.fn),
                ln: str(a.ln),
                tc: str(a.tc),
                bd: str(a.bd) || null,
                gn: str(a.gn) || 'E',
                ph: str(a.ph),
                em: str(a.em),
                sp: str(a.sp),
                cat: str(a.cat),
                lic: str(a.lic),
                rd: str(a.rd) || new Date().toISOString().slice(0, 10),
                st: str(a.st) || 'active',
                fee: num(a.fee),
                vd: str(a.vd) || null,
                nt: JSON.stringify(extra),
                cls_id: str(a.clsId) || null,
                pn: str(a.pn),
                pph: str(a.pph),
                pem: str(a.pem),
                photo_url: str(a.photoUrl)
            };
            // Only include sp_pass if explicitly provided (not undefined)
            if (a.spPass !== undefined) {
                result.sp_pass = str(a.spPass);
            }
            return result;
        },
        toPayment(r) {
            return {
                id: r.id, aid: r.aid, an: r.an, amt: r.amt || 0,
                dt: r.dt, ty: r.ty, cat: r.cat, ds: r.ds,
                st: r.st || 'pending', inv: r.inv, dd: r.dd,
                serviceName: r.service_name || '',
                source: r.source || 'manual',
                notifStatus: r.notif_status || '',
                payMethod: r.pay_method || '',
                slipCode: r.slip_code || '',
                taxRate: r.tax_rate || 0,
                taxAmount: r.tax_amount || 0,
                orgId: r.org_id || '',
                branchId: r.branch_id || ''
            };
        },
        fromPayment(p) {
            return {
                id: p.id, org_id: p.orgId || AppState.currentOrgId,
                branch_id: p.branchId || AppState.currentBranchId,
                aid: p.aid, an: p.an, amt: p.amt, dt: p.dt,
                ty: p.ty, cat: p.cat, ds: p.ds, st: p.st,
                inv: p.inv, dd: p.dd, service_name: p.serviceName,
                source: p.source || 'manual',
                notif_status: p.notifStatus || '',
                pay_method: p.payMethod || '',
                slip_code: p.slipCode || ''
            };
        },
        toCoach(r) {
            return {
                id: r.id, fn: r.fn, ln: r.ln, tc: r.tc,
                ph: r.ph, em: r.em, sp: r.sp, sal: r.sal || 0,
                st: r.st || 'active', coachPass: r.coach_pass,
                orgId: r.org_id, branchId: r.branch_id
            };
        },
        fromCoach(c) {
            const str = (v) => (v === undefined || v === null) ? '' : String(v);
            const num = (v) => (v === undefined || v === null || v === '') ? 0 : Number(v) || 0;
            const result = {
                id: c.id,
                org_id: c.orgId || AppState.currentOrgId || '',
                branch_id: c.branchId || AppState.currentBranchId || '',
                fn: str(c.fn), ln: str(c.ln), tc: str(c.tc),
                ph: str(c.ph), em: str(c.em), sp: str(c.sp),
                sal: num(c.sal), st: str(c.st) || 'active'
            };
            // Only include coach_pass if explicitly provided (not undefined)
            if (c.coachPass !== undefined) {
                result.coach_pass = str(c.coachPass);
            }
            return result;
        },
        toClass(r) {
            return { id: r.id, name: r.name, spId: r.sp_id, coachId: r.coach_id, cap: r.cap };
        },
        fromClass(c) {
            return {
                id: c.id, org_id: AppState.currentOrgId,
                branch_id: AppState.currentBranchId,
                name: c.name, sp_id: c.spId,
                coach_id: c.coachId, cap: c.cap
            };
        },
        toSport(r) {
            return { id: r.id, name: r.name, icon: r.icon };
        },
        fromSport(s) {
            return {
                id: s.id, org_id: AppState.currentOrgId,
                branch_id: AppState.currentBranchId,
                name: s.name, icon: s.icon
            };
        },
        toSettings(r) {
            return {
                id: r.id, schoolName: r.school_name, logoUrl: r.logo_url,
                bankName: r.bank_name, accountName: r.account_name,
                iban: r.iban, ownerPhone: r.owner_phone,
                address: r.address,
                paytrActive: r.paytr_active || false,
                paytrMerchantId: r.paytr_merchant_id || ''
                // paytrMerchantKey ve paytrMerchantSalt kasıtlı olarak frontend'e çekilmiyor
                // Bu değerler yalnızca Supabase Secrets'ta saklanır (PAYTR_MERCHANT_KEY, PAYTR_MERCHANT_SALT)
            };
        },
        fromSettings(s) {
            return {
                id: s.id || generateId(), org_id: AppState.currentOrgId,
                branch_id: AppState.currentBranchId,
                school_name: s.schoolName, logo_url: s.logoUrl,
                bank_name: s.bankName, account_name: s.accountName,
                iban: s.iban, owner_phone: s.ownerPhone,
                address: s.address,
                paytr_active: s.paytrActive || false,
                paytr_merchant_id: s.paytrMerchantId || ''
                // paytr_merchant_key ve paytr_merchant_salt DB'ye frontend üzerinden yazılmıyor
                // Supabase Secrets ile yönetilir: supabase secrets set PAYTR_MERCHANT_KEY=...
            };
        }
    },
    async query(table, filters = {}) {
        try {
            const sb = getSupabase();
            if (!sb) return null;
            let q = sb.from(table).select('*');
            Object.entries(filters).forEach(([key, val]) => {
                q = q.eq(key, val);
            });
            const { data, error } = await q;
            if (error) throw error;
            return data || [];
        } catch (e) {
            console.error(`DB query error (${table})`);
            toast(i18n[AppState.lang].connectionError, 'e');
            return null;
        }
    },
    async upsert(table, data) {
        try {
            const sb = getSupabase();
            if (!sb) return null;
            const arr = Array.isArray(data) ? data : [data];
            
            // undefined değerleri temizle
            const clean = arr.map(row => {
                const out = {};
                for (const [k, v] of Object.entries(row)) {
                    if (v !== undefined) out[k] = v;
                }
                return out;
            });
            
            const { data: result, error } = await sb.from(table).upsert(clean, { onConflict: 'id' }).select();
            if (error) {
                console.error(`Supabase upsert error (${table})`, error);
                toast('Kayıt hatası. Lütfen tekrar deneyin.', 'e');
                return null;
            }
            return result;
        } catch (e) {
            console.error(`DB upsert exception (${table})`, e);
            toast('Kayıt hatası. Lütfen tekrar deneyin.', 'e');
            return null;
        }
    },
    async remove(table, filters) {
        try {
            const sb = getSupabase();
            if (!sb) return false;
            let q = sb.from(table).delete();
            Object.entries(filters).forEach(([key, val]) => {
                q = q.eq(key, val);
            });
            const { error } = await q;
            if (error) throw error;
            return true;
        } catch (e) {
            console.error(`DB delete error (${table})`);
            return false;
        }
    }
};

// Mobil uyumlu TC input handler
function setupTCInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    input.addEventListener('input', function(e) {
        // Sadece rakam kabul et
        let value = e.target.value.replace(/\D/g, '');
        // Maksimum 11 karakter
        if (value.length > 11) value = value.slice(0, 11);
        e.target.value = value;
    });
    
    // iOS için özel handling
    input.addEventListener('keypress', function(e) {
        const char = String.fromCharCode(e.which);
        if (!/^\d$/.test(char)) {
            e.preventDefault();
        }
    });
}

// doNormalLogin: Security.js tarafından tanımlanır (v5.0 — login_with_tc RPC).
// Security.js yüklenmezse kullanıcıya uyarı gösterilir.
window.doNormalLogin = function(role) {
    console.error('Security.js yüklenemedi!');
    var errId = role === 'coach' ? 'lc-err' : 'ls-err';
    var errEl = document.getElementById(errId);
    if (errEl) {
        errEl.textContent = 'Güvenlik modülü yüklenemedi. Sayfayı yenileyip tekrar deneyin.';
        errEl.classList.remove('dn');
    }
};

window.doLogin = async function() {
    if (_sessionRestoring) return; // K5: oturum geri yüklenirken çift login engelle
    const email = UIUtils.getValue('le').toLowerCase().trim();
    const password = UIUtils.getValue('lp');
    const errEl = document.getElementById('lerr');
    
    if (!email || !password) {
        if (errEl) {
            errEl.textContent = 'E-posta ve şifre giriniz!';
            errEl.classList.remove('dn');
        }
        return;
    }
    
    UIUtils.setLoading(true);
    if (errEl) errEl.classList.add('dn');
    
    try {
        const sb = getSupabase();
        if (!sb) {
            if (errEl) {
                errEl.textContent = 'Bağlantı hatası. Sayfayı yenileyip tekrar deneyin.';
                errEl.classList.remove('dn');
            }
            return;
        }
        
        // Önce mevcut oturumu kapat
        await sb.auth.signOut().catch(e => console.warn('signOut (non-critical):', e));
        
        let authData, authError;
        try {
            const result = await sb.auth.signInWithPassword({ email, password });
            authData = result.data;
            authError = result.error;
        } catch (fetchErr) {
            // Ağ hatası — fetch başarısız, Supabase'e ulaşılamıyor
            console.error('Supabase auth network error');
            if (errEl) {
                errEl.textContent = 'Bağlantı hatası. İnternet bağlantınızı kontrol edin ve tekrar deneyin.';
                errEl.classList.remove('dn');
            }
            return;
        }
        
        if (authError) {
            console.error('Supabase auth error');
            let msg;
            const errMsg = authError.message || '';
            if (/fetch|network|connection/i.test(errMsg)) {
                msg = 'Bağlantı hatası. İnternet bağlantınızı kontrol edin ve tekrar deneyin.';
            } else if (/email.not.confirmed|email_not_confirmed/i.test(errMsg)) {
                msg = 'E-posta adresiniz doğrulanmamış. Lütfen gelen kutunuzu kontrol edin.';
            } else if (/invalid.api.key|apikey|invalid.key/i.test(errMsg)) {
                msg = 'Sistem yapılandırma hatası. Lütfen yönetici ile iletişime geçin.';
            } else {
                msg = 'Hatalı e-posta veya şifre!';
            }
            if (errEl) {
                errEl.textContent = msg;
                errEl.classList.remove('dn');
            }
            return;
        }
        
        const authUser = authData.user;
        
        // 1. users tablosundan kullanıcıyı getir
        let userData = null;
        try {
            const { data, error } = await sb.from('users').select('*').eq('id', authUser.id).maybeSingle();
            if (!error && data) userData = data;
        } catch (e) { /* ignore */ }
        
        // 2. users tablosunda yoksa email ile dene
        if (!userData) {
            try {
                const { data, error } = await sb.from('users').select('*').eq('email', email).maybeSingle();
                if (!error && data) userData = data;
            } catch (e) { /* ignore */ }
        }
        
        // 3. Hiç bulunamazsa auth metadata'dan oku, yoksa varsayılan oluştur
        if (!userData) {
            const meta = authUser.user_metadata || {};
            // Eğer daha önce kayıt yapılmışsa metadata'da org/branch olabilir
            const orgId = meta.org_id || `org-${authUser.id.slice(0, 8)}`;
            const branchId = meta.branch_id || `br-${authUser.id.slice(0, 8)}-main`;
            
            userData = {
                id: authUser.id,
                email: authUser.email,
                name: meta.full_name || email.split('@')[0],
                role: 'admin',
                org_id: orgId,
                branch_id: branchId
            };
            
            // Kaydet — sonraki girişte bulunabilsin
            try {
                await sb.from('users').upsert({
                    id: userData.id,
                    email: userData.email,
                    name: userData.name,
                    role: userData.role,
                    org_id: userData.org_id,
                    branch_id: userData.branch_id
                }, { onConflict: 'id' });
            } catch (e) { console.warn('User upsert warning:', e); }
        }
        
        AppState.currentUser = Object.freeze({
            id: userData.id,
            email: userData.email,
            orgId: userData.org_id,
            branchId: userData.branch_id,
            role: userData.role || 'admin',
            name: userData.name || email.split('@')[0]
        });
        
        AppState.currentOrgId = userData.org_id;
        AppState.currentBranchId = userData.branch_id;
        
        StorageManager.set('sporcu_app_user', AppState.currentUser);
        StorageManager.set('sporcu_app_org', AppState.currentOrgId);
        StorageManager.set('sporcu_app_branch', AppState.currentBranchId);
        
        await loadBranchData();
        
        const lboxWrap = document.getElementById('lbox-wrap');
        const wrap = document.getElementById('wrap');
        const suname = document.getElementById('suname');
        
        if (lboxWrap) lboxWrap.style.display = 'none';
        if (wrap) wrap.classList.remove('dn');
        if (suname) suname.textContent = AppState.currentUser.name;
        
        updateBranchUI();
        go('dashboard');
        SessionManager.start(AppState.currentUser.name, 'admin', null, AppState.currentOrgId, AppState.currentBranchId);

    } catch (err) {
        console.error('Login error');
        if (errEl) {
            errEl.textContent = 'Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.';
            errEl.classList.remove('dn');
        }
    } finally {
        UIUtils.setLoading(false);
    }
};

async function restoreSession() {
    _sessionRestoring = true;
    UIUtils.setLoading(true);

    try {
        // 1. Sporcu oturumu kontrolü
        const storedSporcu = StorageManager.get('sporcu_app_sporcu');
        if (storedSporcu) {
            const parsed = storedSporcu;
            AppState.currentSporcu = parsed.user;
            AppState.currentOrgId = parsed.orgId;
            AppState.currentBranchId = parsed.branchId;
            
            await loadBranchData();
            
            const lboxWrap = document.getElementById('lbox-wrap');
            const sporcuPortal = document.getElementById('sporcu-portal');
            const spName = document.getElementById('sp-name');
            const spOrgname = document.getElementById('sp-orgname');
            
            if (lboxWrap) lboxWrap.style.display = 'none';
            if (sporcuPortal) sporcuPortal.style.display = 'flex';
            if (spName) spName.textContent = `${AppState.currentSporcu.fn} ${AppState.currentSporcu.ln}`;
            
            const schoolName = AppState.data.settings?.schoolName || 'Dragos Futbol Akademisi';
            if (spOrgname) spOrgname.textContent = schoolName;
            
            const initials = FormatUtils.initials(AppState.currentSporcu.fn, AppState.currentSporcu.ln);
            UIUtils.setElementAvatar('sp-avatar', null, initials);
            
            applyLogoEverywhere(AppState.data.settings?.logoUrl || '');
            spTab('profil');
            SessionManager.resume();
            // 3D Secure üst pencere yönlendirmesinden dönüş kontrolü
            try {
                const cbRaw = localStorage.getItem('_paytr_pending_cb');
                if (cbRaw) {
                    localStorage.removeItem('_paytr_pending_cb');
                    const cb = JSON.parse(cbRaw);
                    if (cb.oid && (Date.now() - cb.ts) < 600000) { // 10 dk içindeyse geçerli
                        setTimeout(() => handlePayTRCallback(cb.oid, cb.status === 'ok' ? 'success' : 'fail'), 500);
                    }
                }
            } catch(e) {}
            return;
        }

        // 2. Yönetici / antrenör oturumu kontrolü
        const storedUser = StorageManager.get('sporcu_app_user');
        if (storedUser) {
            AppState.currentUser = Object.freeze({ ...storedUser });
            AppState.currentOrgId = StorageManager.get('sporcu_app_org') || storedUser.orgId;
            AppState.currentBranchId = StorageManager.get('sporcu_app_branch') || storedUser.branchId;
            
            if (storedUser.role === 'admin') {
                const sb = getSupabase();
                if (sb) {
                    try {
                        const { data: { session } } = await sb.auth.getSession();
                        if (!session) {
                            console.warn('Admin session expired');
                            await sb.auth.signOut().catch(() => {});
                            StorageManager.remove('sporcu_app_user');
                            StorageManager.remove('sporcu_app_org');
                            StorageManager.remove('sporcu_app_branch');
                            await loadLogoForLoginScreen();
                            return;
                        }
                    } catch(e) {
                        console.warn('Session check failed:', e);
                        await sb.auth.signOut().catch(() => {});
                        StorageManager.remove('sporcu_app_user');
                        StorageManager.remove('sporcu_app_org');
                        StorageManager.remove('sporcu_app_branch');
                        await loadLogoForLoginScreen();
                        return;
                    }
                }
            }
            
            await loadBranchData();
            
            const lboxWrap = document.getElementById('lbox-wrap');
            const wrap = document.getElementById('wrap');
            const suname = document.getElementById('suname');
            
            if (lboxWrap) lboxWrap.style.display = 'none';
            if (wrap) wrap.classList.remove('dn');
            if (suname) suname.textContent = AppState.currentUser.name || '';
            
            updateBranchUI();
            go(AppState.currentUser.role === 'coach' ? 'attendance' : 'dashboard');
            SessionManager.resume();
            return;
        }
        
        // 3. Oturum yok — giriş ekranında logoyu yükle
        await loadLogoForLoginScreen();
        
    } catch (e) {
        console.error('Session restore error:', e);
        try { const sb = getSupabase(); if (sb) await sb.auth.signOut(); } catch(_) {}
        StorageManager.remove('sporcu_app_user');
        StorageManager.remove('sporcu_app_org');
        StorageManager.remove('sporcu_app_branch');
        await loadLogoForLoginScreen();
    } finally {
        _sessionRestoring = false;
        UIUtils.setLoading(false);
    }
}

// Giriş ekranı için settings tablosundan sadece logo ve isim çeker
async function loadLogoForLoginScreen() {
    // 1. Önce localStorage cache'den göster (anında)
    try {
        const cached = localStorage.getItem('akademi_logo_url');
        const cachedName = localStorage.getItem('akademi_school_name');
        if (cached) applyLogoEverywhere(cached);
        if (cachedName) {
            const el = document.getElementById('login-school-name');
            if (el) el.textContent = cachedName;
        }
    } catch(e) {}
    
    // 2. Supabase'den taze çek (org_id olmadan, tüm satırları dene)
    try {
        const sb = getSupabase();
        if (!sb) return;
        
        // Önce org_id olmadan tüm settings'i çek
        const { data: rows, error } = await sb.from('settings').select('logo_url, school_name, org_id');
        
        if (error) { console.warn('Logo fetch error:', error); return; }
        
        // İlk dolu logo_url'i bul
        const row = (rows || []).find(r => r.logo_url && r.logo_url.trim() !== '');
        if (row?.logo_url) {
            applyLogoEverywhere(row.logo_url);
            // Cache'e kaydet
            try { localStorage.setItem('akademi_logo_url', row.logo_url); } catch(e) {}
        }
        if (row?.school_name) {
            const el = document.getElementById('login-school-name');
            if (el) el.textContent = row.school_name;
            try { localStorage.setItem('akademi_school_name', row.school_name); } catch(e) {}
        }
    } catch(e) {
        console.warn('loadLogoForLoginScreen error:', e);
    }
}

window.doLogout = async function() {
    await SessionManager.end();
    try {
        const sb = getSupabase();
        if (sb) await sb.auth.signOut();
    } catch (e) {
        console.error('Logout error:', e);
    }
    StorageManager.clear();
    location.reload();
};

window.doSporcuLogout = async function() {
    await SessionManager.end();
    StorageManager.clear();
    location.reload();
};

async function loadBranchData() {
    const bid = AppState.currentBranchId;
    const oid = AppState.currentOrgId;
    if (!bid && !oid) return;
    
    // Filtre: branch_id önce dene, yoksa org_id
    const filter = bid ? { branch_id: bid } : { org_id: oid };
    
    try {
        const sb = getSupabase();
        if (!sb) return;

        // payments özel sorgu: branch_id veya org_id ile
        const payQuery = async () => {
            let q = sb.from('payments').select('*');
            if (bid) q = q.eq('branch_id', bid);
            else q = q.eq('org_id', oid);
            const { data, error } = await q;
            if (error) { console.warn('payments query error:', error); return []; }
            return data || [];
        };

        // Attendance: sadece son 30 gün — tüm geçmişi çekmek gereksiz veri
        const attendanceQuery = async () => {
            const thirtyDaysAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0, 10);
            let q = sb.from('attendance').select('*');
            if (bid) q = q.eq('branch_id', bid); else q = q.eq('org_id', oid);
            q = q.gte('att_date', thirtyDaysAgo);
            const { data, error } = await q;
            if (error) { console.warn('attendance query error:', error); return []; }
            return data || [];
        };

        // Statik veri cache (5 dk TTL): settings, sports, classes, coaches az değişir
        const STATIC_TTL = 5 * 60 * 1000;
        const cacheKey = 'branch_static_' + (bid || oid);
        const cached = StorageManager.get(cacheKey);
        const now = Date.now();
        const useCache = cached && cached.ts && (now - cached.ts < STATIC_TTL);

        // Dinamik sorgular her zaman fresh çekilir
        const [athletesRes, paymentsRes, attendanceRes, messagesRes] = await Promise.allSettled([
            DB.query('athletes', filter),
            payQuery(),
            attendanceQuery(),
            DB.query('messages', filter)
        ]);

        // Statik sorgular: cache varsa atla
        let settingsData, sportsData, classesData, coachesData;
        if (useCache) {
            settingsData = cached.settings;
            sportsData   = cached.sports;
            classesData  = cached.classes;
            coachesData  = cached.coaches;
        } else {
            const [settingsRes, sportsRes, classesRes, coachesRes] = await Promise.allSettled([
                DB.query('settings', filter),
                DB.query('sports', filter),
                DB.query('classes', filter),
                DB.query('coaches', filter)
            ]);
            settingsData = settingsRes.status === 'fulfilled' ? (settingsRes.value || []) : [];
            sportsData   = sportsRes.status   === 'fulfilled' ? (sportsRes.value   || []) : [];
            classesData  = classesRes.status  === 'fulfilled' ? (classesRes.value  || []) : [];
            coachesData  = coachesRes.status  === 'fulfilled' ? (coachesRes.value  || []) : [];
            StorageManager.set(cacheKey, { ts: now, settings: settingsData, sports: sportsData, classes: classesData, coaches: coachesData });
        }

        AppState.data.athletes = (athletesRes.status  === 'fulfilled' ? athletesRes.value  || [] : []).map(DB.mappers.toAthlete);
        AppState.data.payments = (paymentsRes.status  === 'fulfilled' ? paymentsRes.value  || [] : []).map(DB.mappers.toPayment);
        AppState.data.coaches  = coachesData.map(DB.mappers.toCoach);

        AppState.data.attendance = {};
        const attendanceRows = attendanceRes.status === 'fulfilled' ? attendanceRes.value || [] : [];
        attendanceRows.forEach(r => {
            if (!AppState.data.attendance[r.att_date]) AppState.data.attendance[r.att_date] = {};
            AppState.data.attendance[r.att_date][r.athlete_id] = r.status;
        });

        const messagesRows = messagesRes.status === 'fulfilled' ? messagesRes.value || [] : [];
        AppState.data.messages = messagesRows.map(r => ({
            id: r.id, senderId: r.sender_id, senderName: r.sender_name,
            senderRole: r.sender_role, recipientId: r.recipient_id,
            title: r.title, body: r.body, isRead: r.is_read, createdAt: r.created_at
        }));

        AppState.data.settings = settingsData[0] ?
            DB.mappers.toSettings(settingsData[0]) :
            { schoolName: 'Dragos Futbol Akademisi' };

        AppState.data.sports  = sportsData.map(DB.mappers.toSport);
        AppState.data.classes = classesData.map(DB.mappers.toClass);
        
        applyLogoEverywhere(AppState.data.settings?.logoUrl || '');
        const loginSchoolName = document.getElementById('login-school-name');
        if (loginSchoolName) loginSchoolName.textContent = AppState.data.settings?.schoolName || 'Dragos Futbol Akademisi';
        
        if (AppState.currentUser?.role === 'admin' || AppState.currentUser?.role === 'coach') {
            await loadOnKayitlar();
        }
        
        checkOverdue();
        refreshNotifBadges();

        // Kasa transferlerini de yükle
        if (typeof loadCashTransfers === 'function') {
            try { await loadCashTransfers(); } catch(e) { console.warn('loadCashTransfers:', e); }
        }
    } catch (e) {
        console.error('Load branch data error:', e);
        toast(i18n[AppState.lang].connectionError, 'e');
    }
}

// Tek merkezden tüm ekranların logosunu günceller
// Sadece https: veya base64 data: URL'lerine izin verir
function _isSafeLogoUrl(url) {
    if (!url) return false;
    if (url.startsWith('data:image/')) return true;
    try {
        const u = new URL(url);
        return u.protocol === 'https:';
    } catch(e) {
        return false;
    }
}

function applyLogoEverywhere(logoUrl) {
    const hasLogo = !!(logoUrl && logoUrl.trim() !== '' && logoUrl !== DEFAULT_LOGO && _isSafeLogoUrl(logoUrl));

    // 1) GİRİŞ EKRANI LOGO (#login-logo) — <img> ile override et, CSS sorununu tamamen önle
    const loginLogo = document.getElementById('login-logo');
    if (loginLogo) {
        if (hasLogo) {
            const img = document.createElement('img');
            img.src = logoUrl;
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;';
            img.onerror = function() { loginLogo.textContent = '⚽'; };
            loginLogo.textContent = '';
            loginLogo.appendChild(img);
            loginLogo.style.background = 'none';
            loginLogo.style.backgroundColor = 'transparent';
            loginLogo.style.padding = '0';
        } else {
            loginLogo.innerHTML = '&#x26BD;';
            loginLogo.style.background = '';
            loginLogo.style.backgroundColor = '';
        }
    }

    // 2) SIDEBAR LOGO — icon/img toggle
    const sideIcon = document.getElementById('side-logo-icon');
    const sideImg  = document.getElementById('side-logo-img');
    if (hasLogo) {
        if (sideIcon) sideIcon.style.display = 'none';
        if (sideImg)  { sideImg.src = logoUrl; sideImg.style.display = 'block'; }
    } else {
        if (sideIcon) sideIcon.style.display = '';
        if (sideImg)  { sideImg.src = ''; sideImg.style.display = 'none'; }
    }

    // 3) HEADER SAĞ ÜST AVATAR (#bar-ava) — logo varsa logoyu göster
    const barAva = document.getElementById('bar-ava');
    if (barAva) {
        if (hasLogo) {
            barAva.textContent = '';
            barAva.style.backgroundImage = 'url("' + logoUrl.replace(/"/g, '%22') + '")';
            barAva.style.backgroundSize = 'cover';
            barAva.style.backgroundPosition = 'center';
        } else {
            const ini = AppState.currentUser?.name?.charAt(0)?.toUpperCase() || 'A';
            barAva.textContent = ini;
            barAva.style.backgroundImage = '';
        }
    }

    // 4) SPORCU PORTALI LOGO — sp-head alanına logo ekle/güncelle
    const spHead = document.querySelector('#sporcu-portal .sp-head');
    if (spHead) {
        let spLogoEl = document.getElementById('sp-header-logo');
        if (hasLogo) {
            if (!spLogoEl) {
                spLogoEl = document.createElement('img');
                spLogoEl.id = 'sp-header-logo';
                spLogoEl.alt = 'Logo';
                spLogoEl.style.cssText = 'width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid var(--border);flex-shrink:0';
                // İlk flex satırının başına ekle
                const firstRow = spHead.querySelector('.flex.fca');
                if (firstRow) firstRow.insertBefore(spLogoEl, firstRow.firstChild);
            }
            spLogoEl.src = logoUrl;
            spLogoEl.style.display = 'block';
        } else {
            if (spLogoEl) spLogoEl.style.display = 'none';
        }
    }

    // 5) Ayarlar sayfası önizlemesini de güncelle (sayfa açıksa)
    const logoPreview = document.getElementById('logo-preview');
    if (logoPreview) {
        if (hasLogo) {
            const img = document.createElement('img');
            img.src = logoUrl;
            img.style.cssText = 'width:100%;height:100%;object-fit:cover';
            logoPreview.textContent = '';
            logoPreview.appendChild(img);
        } else {
            logoPreview.innerHTML = '&#x26BD;';
        }
    }

    // 6) FAVİCON + APPLE-TOUCH-ICON — sekme ikonunu güncelle
    const faviconUrl = hasLogo ? logoUrl : '/icons/icon-192.png';
    const dynFavicon = document.getElementById('dyn-favicon');
    if (dynFavicon) dynFavicon.href = faviconUrl;
    const dynApple = document.getElementById('dyn-apple-icon');
    if (dynApple) dynApple.href = faviconUrl;

    // 7) OG IMAGE — sosyal paylaşım / Google önizleme
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg) ogImg.content = faviconUrl;
    const twImg = document.querySelector('meta[name="twitter:image"]');
    if (twImg) twImg.content = faviconUrl;
}

function updateBranchUI() {
    const settings = AppState.data.settings || {};
    const schoolName = settings.schoolName || 'Dragos Futbol Akademisi';

    // Kurum adını tüm alanlarda güncelle
    const els = ['sn', 'login-school-name'];
    els.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = schoolName;
    });

    // Kullanıcı baş harfini sidebar'da güncelle
    const sava = document.getElementById('sava');
    if (sava) {
        sava.textContent = AppState.currentUser?.name?.charAt(0)?.toUpperCase() || 'A';
        sava.style.backgroundImage = '';
    }

    // Logoyu tüm ekranlara uygula
    applyLogoEverywhere(settings.logoUrl || '');

    // Antrenör kısıtlamaları
    if (AppState.currentUser?.role === 'coach') {
        ['ni-dashboard','ni-payments','ni-accounting','ni-settings','ni-sms','ni-sports','ni-classes']
            .forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
        ['sec-finance','sec-sys']
            .forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
        const bdash = document.getElementById('bn-dashboard');
        if (bdash) bdash.style.display = 'none';
    }
}

const _goHooks = { before: [], after: [] };
window.registerGoHook = function(phase, fn) { _goHooks[phase].push(fn); };

window.go = function(page, params = {}) {
    // Sporcu panelindeyken (currentUser = null) admin sayfalarına erişim engeli
    if (!AppState.currentUser) {
        return;
    }

    if (AppState.currentUser.role === 'coach') {
        const restricted = ['dashboard', 'payments', 'accounting', 'settings', 'sms', 'sports', 'classes'];
        if (restricted.includes(page)) {
            toast(AppState.lang === 'TR' ? 'Bu sayfaya erişim yetkiniz yok.' : 'You do not have permission to access this page.', 'e');
            return;
        }
    }
    
    // Before hooks
    for (const hook of _goHooks.before) {
        const result = hook(page, params);
        if (result === false) return;
    }
    
    AppState.ui.curPage = page;
    const main = document.getElementById('main');
    const pages = {
        dashboard: pgDashboard,
        athletes: typeof __renderAthletes === 'function' ? __renderAthletes : null,
        athleteProfile: () => pgAthleteProfile(params.id),
        payments: pgPayments,
        accounting: typeof pgAccountingV8 === 'function' ? pgAccountingV8 : pgAccounting,
        attendance: pgAttendance,
        coaches: pgCoaches,
        sports: pgSports,
        classes: pgClasses,
        settings: pgSettings,
        sms: typeof pgSmsV8 === 'function' ? pgSmsV8 : pgSms,
        onkayit: typeof __renderOnKayit === 'function' ? __renderOnKayit : null
    };
    
    if (!main) return;
    
    if (pages[page]) {
        // Skeleton göster (ağır sayfalar için)
        const _skCols = { athletes: 6, payments: 7, onkayit: 8 };
        if (window.skeletonTable && _skCols[page]) {
            main.innerHTML = window.skeletonTable(_skCols[page]);
        }
        // Sayfa geçiş animasyonu
        main.style.opacity = '0';
        setTimeout(() => {
            main.innerHTML = pages[page]();
            if (page === 'athleteProfile') {
                initProfileTabs();
            }
            if (page === 'payments' && typeof _initPlanAthCheckboxes === 'function') {
                _initPlanAthCheckboxes();
            }
            main.style.opacity = '1';
        }, 100);
    }
    
    document.querySelectorAll('.ni').forEach(el => {
        el.classList.toggle('on', el.id === `ni-${page === 'athleteProfile' ? 'athletes' : page}`);
    });
    document.querySelectorAll('.bni-btn').forEach(el => {
        el.classList.toggle('on', el.id === `bn-${page === 'athleteProfile' ? 'athletes' : page}`);
    });
    
    closeSide();
    
    // After hooks
    for (const hook of _goHooks.after) {
        hook(page, params);
    }
};

window.openSide = function() {
    const side = document.getElementById('side');
    const overlay = document.getElementById('overlay');
    if (side) side.classList.add('open');
    if (overlay) overlay.classList.add('show');
};

window.closeSide = function() {
    const side = document.getElementById('side');
    const overlay = document.getElementById('overlay');
    if (side) side.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
};

async function checkOverdue() {
    const today = DateUtils.today();
    const overdueList = AppState.data.payments.filter(
        p => p.st === 'pending' && p.dt && p.dt < today
    );
    
    for (const p of overdueList) {
        p.st = 'overdue';
        try {
            await DB.upsert('payments', DB.mappers.fromPayment(p));
        } catch (err) {
            console.error('Overdue güncelleme hatası:', err);
        }
    }
}

function attendanceRate(aid) {
    const data = AppState.data.attendance;
    let total = 0, present = 0;
    
    Object.values(data).forEach(day => {
        if (day[aid]) {
            total++;
            if (day[aid] === 'P') present++;
        }
    });
    
    return total ? Math.round(present / total * 100) : 0;
}

function getAttendanceStats(aid) {
    const data = AppState.data.attendance;
    let total = 0, present = 0, absent = 0, excused = 0;
    
    Object.values(data).forEach(day => {
        if (day[aid]) {
            total++;
            if (day[aid] === 'P') present++;
            else if (day[aid] === 'A') absent++;
            else if (day[aid] === 'E') excused++;
        }
    });
    
    return { total, present, absent, excused, rate: total ? Math.round(present / total * 100) : 0 };
}

function getPaymentStats(aid) {
    const payments = AppState.data.payments.filter(p => p.aid === aid);
    const totalPaid = payments
        .filter(p => p.ty === 'income' && p.st === 'completed')
        .reduce((s, p) => s + (p.amt || 0), 0);
    const totalDebt = payments
        .filter(p => p.st === 'pending' || p.st === 'overdue')
        .reduce((s, p) => s + (p.amt || 0), 0);
    const lastPayment = payments
        .filter(p => p.st === 'completed')
        .sort((a, b) => new Date(b.dt) - new Date(a.dt))[0];
    
    return { totalPaid, totalDebt, lastPayment, count: payments.length };
}

function statusLabel(st) {
    const labels = {
        active: 'Aktif', inactive: 'Pasif', pending: 'Bekliyor',
        completed: 'Tamamlandı', overdue: 'Gecikti', cancelled: 'İptal',
        failed: 'Başarısız',
        income: 'Gelir', expense: 'Gider', present: 'Var', absent: 'Yok',
        excused: 'İzinli',
        nakit: 'Nakit', kredi_karti: 'Kredi Kartı', havale: 'Havale/EFT', paytr: 'PayTR Online'
    };
    return labels[st] || st || '-';
}

function statusClass(st) {
    const classes = {
        active: 'bg-g', inactive: 'bg-r', pending: 'bg-y',
        completed: 'bg-g', overdue: 'bg-r', cancelled: 'bg-r',
        failed: 'bg-r',
        income: 'bg-g', expense: 'bg-r', present: 'bg-g', absent: 'bg-r',
        excused: 'bg-y'
    };
    return classes[st] || 'bg-b';
}

function sportEmoji(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('basket')) return '&#x1F3C0;';
    if (n.includes('yuzme') || n.includes('yüzme')) return '&#x1F3CA;';
    if (n.includes('voleybol')) return '&#x1F3D0;';
    if (n.includes('tenis')) return '&#x1F3BE;';
    return '&#x26BD;';
}

function className(id) {
    const c = AppState.data.classes.find(x => x.id === id);
    return c ? c.name : '-';
}

function coachName(id) {
    const c = AppState.data.coaches.find(x => x.id === id);
    return c ? `${c.fn} ${c.ln}` : '-';
}

// ==================== PROFİL SAYFASI ====================

function pgAthleteProfile(athleteId) {
    const a = AppState.data.athletes.find(x => x.id === athleteId);
    if (!a) return `<div class="al al-r">Sporcu bulunamadı</div>`;

    const initials = FormatUtils.initials(a.fn, a.ln);
    const age = DateUtils.age(a.bd);
    const attStats = getAttendanceStats(a.id);
    const payStats = getPaymentStats(a.id);
    const cls = AppState.data.classes.find(c => c.id === a.clsId);
    const coach = cls ? AppState.data.coaches.find(c => c.id === cls.coachId) : null;
    const avatarStyle = a.photoUrl ? `;background-image:url(${a.photoUrl});background-size:cover;background-position:center` : '';
    
    return `
    <div class="profile-container">
        <div class="profile-header">
            <div class="profile-header-content">
                <div class="profile-avatar" onclick="typeof showPhotoUploadModal==='function'&&showPhotoUploadModal('${FormatUtils.escape(a.id)}')" title="Fotoğraf yükle" style="cursor:pointer${avatarStyle}">${a.photoUrl ? '' : initials}</div>
                <div class="profile-info">
                    <div class="profile-name">${FormatUtils.escape(`${a.fn} ${a.ln}`)}</div>
                    <div class="profile-meta">
                        <span class="profile-meta-item">&#x1F4BC; ${FormatUtils.escape(a.sp)}</span>
                        <span class="profile-meta-item">&#x1F3EB; ${FormatUtils.escape(cls ? cls.name : 'Sınıfsız')}</span>
                        <span class="profile-meta-item">&#x1F4C5; ${age} yaş</span>
                        <span class="profile-meta-item"><span class="badge ${a.st === 'active' ? 'badge-green' : 'badge-red'}">${statusLabel(a.st)}</span></span>
                    </div>
                    <div class="profile-actions">
                        <button class="btn bp" onclick="editAth('${FormatUtils.escape(a.id)}')">&#x270F; Düzenle</button>
                        <button class="btn bs" onclick="go('athletes')">&#x2190; Listeye Dön</button>
                        <button class="btn bw" onclick="printProfile('${FormatUtils.escape(a.id)}')">&#x1F5A8; Yazdır</button>
                    </div>
                </div>
                <div class="stats-grid" style="min-width:200px">
                    <div class="stat-box">
                        <div class="stat-box-value tb">${attStats.rate}%</div>
                        <div class="stat-box-label">Devam</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-box-value tg">${FormatUtils.currency(payStats.totalPaid)}</div>
                        <div class="stat-box-label">Ödenen</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-box-value ${payStats.totalDebt > 0 ? 'tr2' : 'tg'}">${FormatUtils.currency(payStats.totalDebt)}</div>
                        <div class="stat-box-label">Borç</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="tab-nav">
            <button class="tab-btn active" data-tab="overview" onclick="switchProfileTab('overview')">Genel Bakış</button>
            <button class="tab-btn" data-tab="personal" onclick="switchProfileTab('personal')">Kişisel Bilgiler</button>
            <button class="tab-btn" data-tab="payments" onclick="switchProfileTab('payments')">Ödemeler</button>
            <button class="tab-btn" data-tab="attendance" onclick="switchProfileTab('attendance')">Devam Durumu</button>
            <button class="tab-btn" data-tab="documents" onclick="switchProfileTab('documents')">Belgeler</button>
        </div>
        
        <div id="tab-overview" class="tab-content active">
            <div class="profile-grid">
                <div class="profile-sidebar">
                    <div class="info-card">
                        <div class="info-card-title">&#x1F4E7; İletişim Bilgileri</div>
                        <div class="info-row">
                            <span class="info-label">Telefon</span>
                            <span class="info-value">${FormatUtils.escape(a.ph || '-')}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">E-posta</span>
                            <span class="info-value">${FormatUtils.escape(a.em || '-')}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Adres</span>
                            <span class="info-value">${FormatUtils.escape(a.address || '-')}</span>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <div class="info-card-title">&#x1F46A; Veli Bilgileri</div>
                        <div class="info-row">
                            <span class="info-label">Veli Adı</span>
                            <span class="info-value">${FormatUtils.escape(a.pn || '-')}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Veli Telefon</span>
                            <span class="info-value">${FormatUtils.escape(a.pph || '-')}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Veli E-posta</span>
                            <span class="info-value">${FormatUtils.escape(a.pem || '-')}</span>
                        </div>
                    </div>
                    
                    <div class="info-card">
                        <div class="info-card-title">&#x2695; Sağlık Bilgileri</div>
                        <div class="info-row">
                            <span class="info-label">Kan Grubu</span>
                            <span class="info-value">${FormatUtils.escape(a.blood || '-')}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Boy / Kilo</span>
                            <span class="info-value">${a.height ? a.height + ' cm' : '-'} / ${a.weight ? a.weight + ' kg' : '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Sağlık Notu</span>
                            <span class="info-value">${FormatUtils.escape(a.health || '-')}</span>
                        </div>
                    </div>
                </div>
                
                <div class="profile-main">
                    <div class="info-card">
                        <div class="info-card-title">&#x1F4C8; Son Aktiviteler</div>
                        ${generateActivityTimeline(a.id)}
                    </div>
                    
                    <div class="g2">
                        <div class="info-card">
                            <div class="info-card-title">&#x1F4B3; Finansal Özet</div>
                            <div class="info-row">
                                <span class="info-label">Aylık Ücret</span>
                                <span class="info-value tb">${FormatUtils.currency(a.fee)}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Son Ödeme</span>
                                <span class="info-value">${payStats.lastPayment ? DateUtils.format(payStats.lastPayment.dt) : '-'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Sonraki Ödeme</span>
                                <span class="info-value">${a.vd ? DateUtils.format(a.vd) : '-'}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Toplam Ödeme</span>
                                <span class="info-value tg">${FormatUtils.currency(payStats.totalPaid)}</span>
                            </div>
                        </div>
                        
                        <div class="info-card">
                            <div class="info-card-title">&#x26BD; Antrenman Bilgileri</div>
                            <div class="info-row">
                                <span class="info-label">Antrenör</span>
                                <span class="info-value">${FormatUtils.escape(coach ? `${coach.fn} ${coach.ln}` : '-')}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Sınıf</span>
                                <span class="info-value">${FormatUtils.escape(cls ? cls.name : '-')}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Lisans No</span>
                                <span class="info-value">${FormatUtils.escape(a.lic || '-')}</span>
                            </div>
                            <div class="info-row">
                                <span class="info-label">Kayıt Tarihi</span>
                                <span class="info-value">${DateUtils.format(a.rd)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="tab-personal" class="tab-content">
            <div class="g21">
                <div class="info-card">
                    <div class="info-card-title">&#x1F4C4; Kimlik Bilgileri</div>
                    <div class="info-row">
                        <span class="info-label">TC Kimlik No</span>
                        <span class="info-value">${FormatUtils.escape(a.tc)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Ad Soyad</span>
                        <span class="info-value">${FormatUtils.escape(`${a.fn} ${a.ln}`)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Doğum Tarihi</span>
                        <span class="info-value">${DateUtils.format(a.bd)} (${age} yaş)</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Cinsiyet</span>
                        <span class="info-value">${a.gn === 'E' ? 'Erkek' : a.gn === 'K' ? 'Kadın' : '-'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Okul</span>
                        <span class="info-value">${FormatUtils.escape(a.school || '-')}</span>
                    </div>
                </div>
                
                <div class="info-card">
                    <div class="info-card-title">&#x1F3AF; Sporcu Bilgileri</div>
                    <div class="info-row">
                        <span class="info-label">Branş</span>
                        <span class="info-value">${FormatUtils.escape(a.sp)}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Kategori</span>
                        <span class="info-value">${FormatUtils.escape(a.cat || '-')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Lisans Numarası</span>
                        <span class="info-value">${FormatUtils.escape(a.lic || '-')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Durum</span>
                        <span class="info-value"><span class="badge ${a.st === 'active' ? 'badge-green' : 'badge-red'}">${statusLabel(a.st)}</span></span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Kayıt Tarihi</span>
                        <span class="info-value">${DateUtils.format(a.rd)}</span>
                    </div>
                </div>
            </div>
            
            <div class="info-card mt3">
                <div class="info-card-title">&#x1F4DD; Notlar</div>
                <p class="tm" style="line-height:1.6">${FormatUtils.escape(a.nt || 'Not bulunmuyor.')}</p>
            </div>
        </div>
        
        <div id="tab-payments" class="tab-content">
            <div class="flex fjb fca mb3">
                <h3 class="tw6">Ödeme Geçmişi</h3>
                <button class="btn bp" onclick="addPaymentForAthlete('${FormatUtils.escape(a.id)}')">+ Yeni Ödeme Ekle</button>
            </div>
            ${generatePaymentHistory(a.id)}
        </div>
        
        <div id="tab-attendance" class="tab-content">
            <div class="flex fjb fca mb3">
                <h3 class="tw6">Devam Durumu</h3>
                <div class="flex gap2">
                    <span class="badge badge-green">${attStats.present} Var</span>
                    <span class="badge badge-red">${attStats.absent} Yok</span>
                    <span class="badge badge-yellow">${attStats.excused} İzinli</span>
                </div>
            </div>
            ${generateAttendanceCalendar(a.id)}
        </div>
        
        <div id="tab-documents" class="tab-content">
            <div class="empty-state" style="padding:40px;text-align:center">
                <div style="font-size:48px;margin-bottom:12px">📁</div>
                <div class="tw6">Belge Yönetimi Yakında</div>
                <div class="ts tm mt1">Sağlık raporu, kimlik ve lisans belgelerini yükleyebileceksiniz.</div>
            </div>
        </div>
    </div>`;
}

function generateActivityTimeline(aid) {
    const payments = AppState.data.payments
        .filter(p => p.aid === aid)
        .sort((a, b) => new Date(b.dt) - new Date(a.dt))
        .slice(0, 5);
    
    const attendanceDates = Object.keys(AppState.data.attendance)
        .filter(d => AppState.data.attendance[d] && AppState.data.attendance[d][aid])
        .sort()
        .reverse()
        .slice(0, 5);
    
    let html = '';
    
    if (payments.length === 0 && attendanceDates.length === 0) {
        return '<p class="tm">Henüz aktivite kaydı bulunmuyor.</p>';
    }
    
    payments.forEach(p => {
        html += `
        <div class="timeline-item">
            <div>
                <div class="timeline-date">${DateUtils.format(p.dt)}</div>
                <div class="timeline-content">${p.ty === 'income' ? 'Ödeme Alındı' : 'Gider'} - ${FormatUtils.currency(p.amt)}</div>
                <div class="timeline-status"><span class="badge ${p.st === 'completed' ? 'badge-green' : p.st === 'overdue' ? 'badge-red' : 'badge-yellow'}">${statusLabel(p.st)}</span></div>
            </div>
        </div>`;
    });
    
    attendanceDates.forEach(d => {
        const status = AppState.data.attendance[d][aid];
        html += `
        <div class="timeline-item">
            <div>
                <div class="timeline-date">${DateUtils.format(d)}</div>
                <div class="timeline-content">Yoklama</div>
                <div class="timeline-status"><span class="badge ${status === 'P' ? 'badge-green' : status === 'A' ? 'badge-red' : 'badge-yellow'}">${status === 'P' ? 'Var' : status === 'A' ? 'Yok' : 'İzinli'}</span></div>
            </div>
        </div>`;
    });
    
    return html;
}

function generatePaymentHistory(aid) {
    const payments = AppState.data.payments
        .filter(p => p.aid === aid)
        .sort((a, b) => new Date(b.dt) - new Date(a.dt));
    
    if (payments.length === 0) {
        return '<div class="al al-y">Henüz ödeme kaydı bulunmuyor.</div>';
    }
    
    let html = '';
    payments.forEach(p => {
        html += `
        <div class="payment-card">
            <div class="payment-info">
                <div class="payment-amount ${p.ty === 'income' ? 'tg' : 'tr2'}">${p.ty === 'income' ? '+' : '-'} ${FormatUtils.currency(p.amt)}</div>
                <div class="payment-date">${DateUtils.format(p.dt)} • ${FormatUtils.escape(p.serviceName || p.ds || 'Aidat')}</div>
            </div>
            <span class="badge ${p.st === 'completed' ? 'badge-green' : p.st === 'overdue' ? 'badge-red' : 'badge-yellow'}">${statusLabel(p.st)}</span>
        </div>`;
    });
    
    return html;
}

function generateAttendanceCalendar(aid) {
    const dates = Object.keys(AppState.data.attendance)
        .filter(d => AppState.data.attendance[d] && AppState.data.attendance[d][aid])
        .sort()
        .reverse()
        .slice(0, 28);
    
    if (dates.length === 0) {
        return '<div class="al al-y">Henüz yoklama kaydı bulunmuyor.</div>';
    }
    
    let html = '<div class="attendance-calendar">';
    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    days.forEach(d => {
        html += `<div class="att-day att-day-header">${d}</div>`;
    });
    
    dates.forEach(d => {
        const status = AppState.data.attendance[d][aid];
        const dayNum = new Date(d).getDate();
        const className = status === 'P' ? 'present' : status === 'A' ? 'absent' : '';
        html += `<div class="att-day ${className}" title="${DateUtils.format(d)}">${dayNum}</div>`;
    });
    
    html += '</div>';
    return html;
}

window.switchProfileTab = function(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const targetTab = document.getElementById(`tab-${tabName}`);
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    AppState.ui.profileTab = tabName;
};

window.initProfileTabs = function() {
    // Tab initialization if needed
};

window.addPaymentForAthlete = function(aid) {
    const a = AppState.data.athletes.find(x => x.id === aid);
    if (!a) return;
    
    modal('Yeni Ödeme Ekle', `
    <div class="fgr mb2">
        <label>Sporcu</label>
        <input value="${FormatUtils.escape(`${a.fn} ${a.ln}`)}" disabled/>
    </div>
    <div class="g21">
        <div class="fgr">
            <label>Tutar (₺) *</label>
            <input id="p-amt" type="number" value="${a.fee || ''}"/>
        </div>
        <div class="fgr">
            <label>İşlem Türü</label>
            <select id="p-ty">
                <option value="income">Gelir (Tahsilat)</option>
                <option value="expense">Gider</option>
            </select>
        </div>
    </div>
    <div class="fgr mt2">
        <label>Açıklama</label>
        <input id="p-ds" value="Aylık Aidat"/>
    </div>
    <div class="g21 mt2">
        <div class="fgr">
            <label>Durum</label>
            <select id="p-st">
                <option value="completed">Ödendi</option>
                <option value="pending">Bekliyor</option>
            </select>
        </div>
        <div class="fgr">
            <label>Tarih</label>
            <input id="p-dt" type="date" value="${DateUtils.today()}"/>
        </div>
    </div>
    `, [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: 'Kaydet', cls: 'bp', fn: async () => {
            const obj = {
                id: generateId(),
                aid: aid,
                an: `${a.fn} ${a.ln}`,
                amt: UIUtils.getNumber('p-amt'),
                ds: UIUtils.getValue('p-ds'),
                st: UIUtils.getValue('p-st'),
                dt: UIUtils.getValue('p-dt'),
                ty: UIUtils.getValue('p-ty'),
                serviceName: UIUtils.getValue('p-ds')
            };
            
            if (!obj.amt) {
                toast(i18n[AppState.lang].fillRequired, 'e');
                return;
            }
            
            const result = await DB.upsert('payments', DB.mappers.fromPayment(obj));
            if (result) {
                AppState.data.payments.push(obj);
                toast('Ödeme kaydedildi!', 'g');
                closeModal();
                go('athleteProfile', { id: aid });
            }
        }}
    ]);
};

window.uploadDocument = function(aid) {
    toast('Belge yükleme özelliği yakında eklenecek', 'y');
};

window.viewDocument = function(type) {
    toast('Belge görüntüleme: ' + type, 'g');
};

window.printProfile = function(aid) {
    window.print();
};

// ==================== DİĞER SAYFALAR ====================

function pgDashboard() {
    const { athletes, payments } = AppState.data;
    const active = athletes.filter(a => a.st === 'active').length;
    const income = payments
        .filter(p => p.ty === 'income' && p.st === 'completed')
        .reduce((s, p) => s + (p.amt || 0), 0);
    const expense = payments
        .filter(p => p.ty === 'expense' && p.st === 'completed')
        .reduce((s, p) => s + (p.amt || 0), 0);
    const overdue = payments.filter(p => p.st === 'overdue').length;
    
    return `
    <div class="ph">
        <div class="stit" data-i18n="menuDash">Ana Sayfa</div>
    </div>
    <div class="g4 mb3">
        <div class="card stat-card stat-b" onclick="go('athletes')">
            <div class="stat-icon">&#x1F465;</div>
            <div class="stat-val">${FormatUtils.number(active)}</div>
            <div class="stat-lbl">Aktif Sporcu</div>
        </div>
        <div class="card stat-card stat-g" onclick="go('payments')">
            <div class="stat-icon">&#x1F4B0;</div>
            <div class="stat-val">${FormatUtils.currency(income)}</div>
            <div class="stat-lbl">Aylık Gelir</div>
        </div>
        <div class="card stat-card stat-r" onclick="go('payments')">
            <div class="stat-icon">&#x26A0;</div>
            <div class="stat-val">${FormatUtils.number(overdue)}</div>
            <div class="stat-lbl">Gecikmiş Ödeme</div>
        </div>
        <div class="card stat-card stat-y" onclick="go('athletes')">
            <div class="stat-icon">&#x1F4CB;</div>
            <div class="stat-val">${FormatUtils.number(athletes.length)}</div>
            <div class="stat-lbl">Toplam Kayıt</div>
        </div>
    </div>
    <div class="card mb3">
        <div class="tw6 tsm mb2">Hızlı Eylemler</div>
        <div class="quick-actions">
            <button class="qa-btn" onclick="go('athletes')">
                <div class="qa-icon">&#x2795;</div>
                <div class="qa-lbl">YENİ SPORCU</div>
            </button>
            <button class="qa-btn" onclick="go('payments')">
                <div class="qa-icon">&#x1F4B3;</div>
                <div class="qa-lbl">ÖDEME AL</div>
            </button>
            <button class="qa-btn" onclick="go('attendance')">
                <div class="qa-icon">&#x2705;</div>
                <div class="qa-lbl">YOKLAMA</div>
            </button>
        </div>
    </div>
    <div class="g2">
        <div class="card">
            <div class="tw6 tsm mb2">Gelir/Gider Durumu</div>
            <div style="display:flex;flex-direction:column;gap:10px;height:100px;justify-content:center">
                <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:12px;height:12px;border-radius:50%;background:var(--green)"></div>
                    <span style="font-size:13px">Gelir: <b>${FormatUtils.currency(income)}</b></span>
                </div>
                <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:12px;height:12px;border-radius:50%;background:var(--red)"></div>
                    <span style="font-size:13px">Gider: <b>${FormatUtils.currency(expense)}</b></span>
                </div>
                <div style="height:20px;background:var(--bg3);border-radius:10px;overflow:hidden">
                    <div style="width:${income + expense > 0 ? (income / (income + expense) * 100) : 50}%;height:100%;background:linear-gradient(90deg,var(--green),var(--blue))"></div>
                </div>
            </div>
        </div>
    </div>`;
}


async function provisionAthleteAuthUser(athlete, plainPassword) {
    try {
        const sb = getSupabase();
        if (!sb || !sb.functions) {
            return { ok: false, skipped: true, reason: 'Supabase client hazır değil' };
        }

        const tc = String(athlete?.tc || '').replace(/\D/g, '').slice(0, 11);
        if (tc.length !== 11) {
            return { ok: false, reason: 'Geçersiz TC' };
        }

        const rawEmail = String(athlete?.em || '').trim().toLowerCase();
        const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : '';
        const email = validEmail || `${tc}@dragosfk.com`;

        const pass = String(plainPassword || athlete?.spPass || tc.slice(-6)).trim();
        if (pass.length < 6) {
            return { ok: false, reason: 'Şifre en az 6 karakter olmalı' };
        }

        const { data, error } = await sb.functions.invoke('provision-auth-user', {
            body: {
                userType: 'athlete',
                sourceId: athlete?.id || '',
                tc,
                email,
                password: pass,
                displayName: `${athlete?.fn || ''} ${athlete?.ln || ''}`.trim(),
                orgId: athlete?.orgId || '',
                branchId: athlete?.branchId || ''
            }
        });

        if (error) {
            return { ok: false, reason: error.message || 'Edge Function hatası' };
        }

        if (data?.ok) {
            return { ok: true, exists: !!data.exists, email: data.email || email };
        }

        return { ok: false, reason: data?.error || 'Auth kullanıcı oluşturulamadı' };
    } catch (e) {
        return { ok: false, reason: e?.message || 'Beklenmeyen hata' };
    }
}

async function provisionCoachAuthUser(coach, plainPassword) {
    try {
        const sb = getSupabase();
        if (!sb || !sb.functions) {
            return { ok: false, skipped: true, reason: 'Supabase client hazır değil' };
        }

        const tc = String(coach?.tc || '').replace(/\D/g, '').slice(0, 11);
        if (tc.length !== 11) {
            return { ok: false, reason: 'Geçersiz TC' };
        }

        const rawEmail = String(coach?.em || '').trim().toLowerCase();
        const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail : '';
        const email = validEmail || `${tc}@dragosfk.com`;

        const pass = String(plainPassword || coach?.coachPass || tc.slice(-6)).trim();
        if (pass.length < 6) {
            return { ok: false, reason: 'Şifre en az 6 karakter olmalı' };
        }

        const { data, error } = await sb.functions.invoke('provision-auth-user', {
            body: {
                userType: 'coach',
                sourceId: coach?.id || '',
                tc,
                email,
                password: pass,
                displayName: `${coach?.fn || ''} ${coach?.ln || ''}`.trim(),
                orgId: coach?.orgId || '',
                branchId: coach?.branchId || ''
            }
        });

        if (error) {
            return { ok: false, reason: error.message || 'Edge Function hatası' };
        }

        if (data?.ok) {
            return { ok: true, exists: !!data.exists, email: data.email || email };
        }

        return { ok: false, reason: data?.error || 'Auth kullanıcı oluşturulamadı' };
    } catch (e) {
        return { ok: false, reason: e?.message || 'Beklenmeyen hata' };
    }
}
window.editAth = function(id, prefill) {
    const a = id ? AppState.data.athletes.find(x => x.id === id) : null;
    const isNew = !a;
    const isCoach = AppState.currentUser?.role === 'coach';
    
    let html = `
    <div class="g21">
        <div class="fgr">
            <label>Ad *</label>
            <input id="a-fn" value="${FormatUtils.escape(a?.fn || prefill?.fn || '')}"/>
        </div>
        <div class="fgr">
            <label>Soyad *</label>
            <input id="a-ln" value="${FormatUtils.escape(a?.ln || prefill?.ln || '')}"/>
        </div>
    </div>
    <div class="g21 mt2">
        <div class="fgr">
            <label>TC Kimlik *</label>
            <input id="a-tc" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="11" value="${FormatUtils.escape(a?.tc || prefill?.tc || '')}"/>
        </div>
        <div class="fgr">
            <label>Doğum Tarihi</label>
            <input id="a-bd" type="date" value="${FormatUtils.escape(a?.bd || prefill?.bd || '')}"/>
        </div>
    </div>
    <div class="g21 mt2">
        <div class="fgr">
            <label>Cinsiyet</label>
            <select id="a-gn">
                <option value="E"${(a?.gn || 'E') === 'E' ? ' selected' : ''}>Erkek</option>
                <option value="K"${(a?.gn) === 'K' ? ' selected' : ''}>Kadın</option>
            </select>
        </div>
        <div class="fgr">
            <label>Telefon</label>
            <input id="a-ph" type="tel" value="${FormatUtils.escape(a?.ph || prefill?.ph || '')}"/>
        </div>
    </div>
    <div class="g21 mt2">
        <div class="fgr">
            <label>E-posta</label>
            <input id="a-em" type="email" value="${FormatUtils.escape(a?.em || prefill?.em || '')}"/>
        </div>
        <div class="fgr">
            <label>Okul</label>
            <input id="a-school" value="${FormatUtils.escape(a?.school || '')}"/>
        </div>
    </div>
    <div class="fgr mt2">
        <label>Adres</label>
        <textarea id="a-address" rows="2">${FormatUtils.escape(a?.address || '')}</textarea>
    </div>
    <div class="dv"></div>
    <div class="g21">
        <div class="fgr">
            <label>Branş</label>
            <select id="a-sp">
                ${AppState.data.sports.map(s => 
                    `<option value="${FormatUtils.escape(s.name)}"${(a?.sp || prefill?.sp) === s.name ? ' selected' : ''}>${FormatUtils.escape(s.name)}</option>`
                ).join('')}
            </select>
        </div>
        <div class="fgr">
            <label>Sınıf</label>
            <select id="a-cls">
                <option value="">Sınıfsız</option>
                ${AppState.data.classes.map(c => 
                    `<option value="${FormatUtils.escape(c.id)}"${(a?.clsId || prefill?.clsId) === c.id ? ' selected' : ''}>${FormatUtils.escape(c.name)}</option>`
                ).join('')}
            </select>
        </div>
    </div>
    <div class="g21 mt2">
        <div class="fgr">
            <label>Durum</label>
            <select id="a-st">
                <option value="active"${(a?.st || 'active') === 'active' ? ' selected' : ''}>Aktif</option>
                <option value="inactive"${a?.st === 'inactive' ? ' selected' : ''}>Pasif</option>
            </select>
        </div>
        <div class="fgr">
            <label>Lisans No</label>
            <input id="a-lic" value="${FormatUtils.escape(a?.lic || '')}"/>
        </div>
    </div>`;
    
    if (!isCoach) {
        html += `
        <div class="dv"></div>
        <div class="g21">
            <div class="fgr">
                <label>Aylık Ücret (₺)</label>
                <input id="a-fee" type="number" value="${a?.fee || ''}"/>
            </div>
            <div class="fgr">
                <label>Sonraki Ödeme Tarihi</label>
                <input id="a-vd" type="date" value="${FormatUtils.escape(a?.vd || '')}"/>
            </div>
        </div>`;
    }
    
    html += `
    <div class="dv"></div>
    <div class="tw6 tsm mb2">Veli Bilgileri</div>
    <div class="g21">
        <div class="fgr">
            <label>Veli Ad Soyad</label>
            <input id="a-pn" value="${FormatUtils.escape(a?.pn || prefill?.pn || '')}"/>
        </div>
        <div class="fgr">
            <label>Veli Telefon</label>
            <input id="a-pph" type="tel" value="${FormatUtils.escape(a?.pph || prefill?.pph || '')}"/>
        </div>
    </div>
    <div class="fgr mt2">
        <label>Veli E-posta</label>
        <input id="a-pem" type="email" value="${FormatUtils.escape(a?.pem || '')}"/>
    </div>
    <div class="dv"></div>
    <div class="tw6 tsm mb2">Sağlık Bilgileri</div>
    <div class="g21">
        <div class="fgr">
            <label>Kan Grubu</label>
            <input id="a-blood" value="${FormatUtils.escape(a?.blood || '')}" placeholder="Örn: A Rh+"/>
        </div>
        <div class="fgr">
            <label>Acil Durum Kişisi</label>
            <input id="a-emergency" value="${FormatUtils.escape(a?.emergency || '')}"/>
        </div>
    </div>
    <div class="g21 mt2">
        <div class="fgr">
            <label>Boy (cm)</label>
            <input id="a-height" type="number" value="${a?.height || ''}"/>
        </div>
        <div class="fgr">
            <label>Kilo (kg)</label>
            <input id="a-weight" type="number" value="${a?.weight || ''}"/>
        </div>
    </div>
    <div class="fgr mt2">
        <label>Sağlık Notu / Alerjiler</label>
        <textarea id="a-health" rows="2">${FormatUtils.escape(a?.health || '')}</textarea>
    </div>
    <div class="dv"></div>
    <div class="tw6 tsm mb2">Güvenlik</div>
    <div class="fgr">
        <label>Sporcu Şifresi ${isNew ? '(Boş = TC son 6 hane)' : '(Boş bırakırsanız mevcut şifre korunur)'}</label>
        <input id="a-sppass" type="password" placeholder="${isNew ? 'Örn: 123456' : 'Yeni şifre girin veya boş bırakın'}" value=""/>
        ${!isNew && a?.spPass ? '<div class="ts tm mt1">Mevcut özel şifre tanımlı</div>' : ''}
    </div>`;
    
    modal(isNew ? 'Yeni Sporcu' : 'Sporcu Düzenle', html, [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: 'Kaydet', cls: 'bp', fn: async () => {
            const fn = UIUtils.getValue('a-fn');
            const ln = UIUtils.getValue('a-ln');
            const tc = FormatUtils.cleanTC(UIUtils.getValue('a-tc'));
            
            if (!fn || !ln || !tc) {
                toast('Ad, Soyad ve TC zorunludur!', 'e');
                return;
            }
            
            if (!FormatUtils.tcValidate(tc)) {
                toast(i18n[AppState.lang].invalidTC, 'e');
                return;
            }
            
            const existing = AppState.data.athletes.find(x => x.tc === tc && x.id !== (a?.id));
            if (existing) {
                toast('Bu TC numarası zaten kayıtlı!', 'e');
                return;
            }
            
            const heightVal = UIUtils.getNumber('a-height');
            const weightVal = UIUtils.getNumber('a-weight');
            const newSpPass = UIUtils.getValue('a-sppass');
            
            const obj = {
                id: a?.id || generateId(),
                orgId: a?.orgId || AppState.currentOrgId,
                branchId: a?.branchId || AppState.currentBranchId,
                fn, ln, tc,
                bd: UIUtils.getValue('a-bd') || null,
                gn: UIUtils.getValue('a-gn') || 'E',
                ph: UIUtils.getValue('a-ph') || '',
                em: UIUtils.getValue('a-em') || '',
                sp: UIUtils.getValue('a-sp') || '',
                st: UIUtils.getValue('a-st') || 'active',
                clsId: UIUtils.getValue('a-cls') || null,
                pn: UIUtils.getValue('a-pn') || '',
                pph: UIUtils.getValue('a-pph') || '',
                pem: UIUtils.getValue('a-pem') || '',
                spPass: isNew ? (newSpPass || '') : (newSpPass || undefined),
                lic: UIUtils.getValue('a-lic') || '',
                address: UIUtils.getValue('a-address') || '',
                school: UIUtils.getValue('a-school') || '',
                blood: UIUtils.getValue('a-blood') || '',
                emergency: UIUtils.getValue('a-emergency') || '',
                height: heightVal || null,
                weight: weightVal || null,
                health: UIUtils.getValue('a-health') || '',
                cat: '', rd: a?.rd || DateUtils.today(), nt: '',
                fee: a?.fee || 0, vd: a?.vd || null,
                city: a?.city || ''
            };
            
            if (!isCoach) {
                obj.fee = UIUtils.getNumber('a-fee') || 0;
                obj.vd = UIUtils.getValue('a-vd') || null;
            } else if (a) {
                obj.fee = a.fee || 0;
                obj.vd = a.vd || null;
            }
            
            const mapped = DB.mappers.fromAthlete(obj);

            const result = await DB.upsert('athletes', mapped);
            if (result) {
                // If password was changed, also do an explicit update as fallback
                if (!isNew && newSpPass) {
                    try {
                        const sb = getSupabase();
                        if (sb) {
                            await sb.from('athletes').update({ sp_pass: newSpPass }).eq('id', obj.id);
                        }
                    } catch (passErr) {
                        console.warn('Athlete password explicit update failed:', passErr);
                    }
                }
                
                // Update local state with actual password value
                if (newSpPass) {
                    obj.spPass = newSpPass;
                } else if (!isNew) {
                    obj.spPass = a?.spPass || '';
                }
                
                if (isNew) {
                    AppState.data.athletes.push(obj);
                } else {
                    const idx = AppState.data.athletes.findIndex(x => x.id === obj.id);
                    if (idx >= 0) AppState.data.athletes[idx] = obj;
                }
                if (isNew) {
                    const authRes = await provisionAthleteAuthUser(obj, newSpPass);
                    if (!authRes.ok && !authRes.skipped) {
                        toast('Sporcu kaydedildi ancak Auth hesabı oluşturulamadı: ' + authRes.reason, 'e');
                    }
                }

                toast(i18n[AppState.lang].saveSuccess, 'g');
                closeModal();
                if (!isNew && AppState.ui.curPage === 'athleteProfile') {
                    go('athleteProfile', { id: obj.id });
                } else {
                    go('athletes');
                }
            }
        }}
    ]);
    
    // TC input için mobil uyumlu handler ekle
    setTimeout(() => setupTCInput('a-tc'), 100);
};

window.delAth = function(id) {
    confirm2('Sporcu Sil', i18n[AppState.lang].deleteConfirm, async () => {
        if (await DB.remove('athletes', { id })) {
            AppState.data.athletes = AppState.data.athletes.filter(x => x.id !== id);
            toast('Sporcu silindi', 'g');
            go('athletes');
        }
    });
};

function pgClasses() {
    return `
    <div class="ph">
        <div class="stit" data-i18n="menuCls">Sınıflar</div>
    </div>
    <div class="flex fjb fca mb3 gap2">
        <button class="btn bp" onclick="editClass()">+ Yeni Sınıf</button>
    </div>
    <div class="card">
        <div class="tw">
            <table>
                <thead>
                    <tr>
                        <th>Sınıf</th>
                        <th>Branş</th>
                        <th>Antrenör</th>
                        <th>Öğrenci Sayısı</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    ${AppState.data.classes.map(c => {
                        const sp = AppState.data.sports.find(s => s.id === c.spId);
                        const coach = AppState.data.coaches.find(co => co.id === c.coachId);
                        const count = AppState.data.athletes.filter(a => a.clsId === c.id).length;
                        return `
                        <tr>
                            <td class="tw6">${FormatUtils.escape(c.name)}</td>
                            <td>${sp ? FormatUtils.escape(sp.name) : '-'}</td>
                            <td>${coach ? FormatUtils.escape(`${coach.fn} ${coach.ln}`) : '-'}</td>
                            <td>${count}</td>
                            <td>
                                <button class="btn btn-xs bsu" style="margin-right:4px" onclick="viewClassAthletes('${FormatUtils.escape(c.id)}')">Öğrenciler</button>
                                <button class="btn btn-xs bp" onclick="editClass('${FormatUtils.escape(c.id)}')">Düzenle</button>
                                <button class="btn btn-xs bd" onclick="delClass('${FormatUtils.escape(c.id)}')">Sil</button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
}

window.viewClassAthletes = function(cid) {
    const cls = AppState.data.classes.find(c => c.id === cid);
    if (!cls) return;
    
    const list = AppState.data.athletes.filter(a => a.clsId === cid);
    const html = list.length === 0 ? 
        '<div class="al al-y">Bu sınıfa henüz kayıtlı sporcu bulunmuyor.</div>' :
        `<div class="tw">
            <table>
                <thead>
                    <tr><th>Ad Soyad</th><th>TC</th><th>Veli</th><th>İşlem</th></tr>
                </thead>
                <tbody>
                    ${list.map(a => `
                    <tr>
                        <td class="tw6">${FormatUtils.escape(`${a.fn} ${a.ln}`)}</td>
                        <td>${FormatUtils.escape(a.tc)}</td>
                        <td>${a.pn ? FormatUtils.escape(`${a.pn} (${a.pph})`) : '-'}</td>
                        <td><button class="btn btn-xs bp" onclick="go('athleteProfile', {id:'${FormatUtils.escape(a.id)}'}); closeModal()">Profil</button></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
    
    modal(`${FormatUtils.escape(cls.name)} Öğrencileri`, html, [
        { lbl: 'Kapat', cls: 'bs', fn: closeModal }
    ]);
};

window.editClass = function(id) {
    const c = id ? AppState.data.classes.find(x => x.id === id) : null;
    const isNew = !c;
    
    modal(isNew ? 'Yeni Sınıf' : 'Sınıf Düzenle', `
    <div class="fgr mb2">
        <label>Sınıf Adı *</label>
        <input id="c-name" value="${FormatUtils.escape(c?.name || '')}"/>
    </div>
    <div class="g21">
        <div class="fgr">
            <label>Branş</label>
            <select id="c-sp">
                ${AppState.data.sports.map(s => 
                    `<option value="${FormatUtils.escape(s.id)}"${c?.spId === s.id ? ' selected' : ''}>${FormatUtils.escape(s.name)}</option>`
                ).join('')}
            </select>
        </div>
        <div class="fgr">
            <label>Antrenör</label>
            <select id="c-coach">
                <option value="">Seçiniz</option>
                ${AppState.data.coaches.map(co => 
                    `<option value="${FormatUtils.escape(co.id)}"${c?.coachId === co.id ? ' selected' : ''}>${FormatUtils.escape(`${co.fn} ${co.ln}`)}</option>`
                ).join('')}
            </select>
        </div>
    </div>
    `, [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: 'Kaydet', cls: 'bp', fn: async () => {
            const obj = {
                id: c?.id || generateId(),
                name: UIUtils.getValue('c-name'),
                coachId: UIUtils.getValue('c-coach'),
                spId: UIUtils.getValue('c-sp'),
                cap: 20
            };
            
            if (!obj.name) {
                toast(i18n[AppState.lang].fillRequired, 'e');
                return;
            }
            
            const result = await DB.upsert('classes', DB.mappers.fromClass(obj));
            if (result) {
                if (isNew) {
                    AppState.data.classes.push(obj);
                } else {
                    const idx = AppState.data.classes.findIndex(x => x.id === obj.id);
                    if (idx >= 0) AppState.data.classes[idx] = obj;
                }
                toast(i18n[AppState.lang].saveSuccess, 'g');
                closeModal();
                go('classes');
            }
        }}
    ]);
};

window.delClass = function(id) {
    confirm2('Sınıf Sil', i18n[AppState.lang].deleteConfirm, async () => {
        if (await DB.remove('classes', { id })) {
            AppState.data.classes = AppState.data.classes.filter(x => x.id !== id);
            AppState.data.athletes.forEach(a => {
                if (a.clsId === id) a.clsId = '';
            });
            toast('Sınıf silindi', 'g');
            go('classes');
        }
    });
};

function pgSports() {
    return `
    <div class="ph">
        <div class="stit" data-i18n="menuSpo">Branşlar</div>
    </div>
    <div class="flex fjb mb3">
        <button class="btn bp" onclick="editSport()">+ Yeni Branş</button>
    </div>
    <div class="g2">
        ${AppState.data.sports.map(s => {
            const count = AppState.data.athletes.filter(a => a.sp === s.name).length;
            return `
            <div class="card card-hover">
                <div class="flex fca gap2">
                    <div style="font-size:32px">${sportEmoji(s.name)}</div>
                    <div>
                        <div class="tw6">${FormatUtils.escape(s.name)}</div>
                        <div class="ts tm">${count} sporcu</div>
                    </div>
                </div>
                <div class="mt2" style="text-align:right">
                    <button class="btn btn-xs bd" onclick="delSport('${FormatUtils.escape(s.id)}')">Sil</button>
                </div>
            </div>`;
        }).join('')}
    </div>`;
}

window.editSport = function() {
    modal('Yeni Branş', `
    <div class="fgr mb2">
        <label>Branş Adı *</label>
        <input id="s-name" placeholder="Basketbol"/>
    </div>
    `, [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: 'Kaydet', cls: 'bp', fn: async () => {
            const obj = {
                id: generateId(),
                name: UIUtils.getValue('s-name'),
                icon: ''
            };
            
            if (!obj.name) {
                toast(i18n[AppState.lang].fillRequired, 'e');
                return;
            }
            
            const result = await DB.upsert('sports', DB.mappers.fromSport(obj));
            if (result) {
                AppState.data.sports.push(obj);
                toast(i18n[AppState.lang].saveSuccess, 'g');
                closeModal();
                go('sports');
            }
        }}
    ]);
};

window.delSport = function(id) {
    confirm2('Branş Sil', 'Bu branşa kayıtlı sporcular olabilir. Emin misiniz?', async () => {
        if (await DB.remove('sports', { id })) {
            AppState.data.sports = AppState.data.sports.filter(x => x.id !== id);
            toast('Branş silindi', 'g');
            go('sports');
        }
    });
};

function pgAttendance() {
    const today = AppState.ui.atd || DateUtils.today();
    AppState.ui.atd = today;
    
    let list = AppState.data.athletes.filter(a => a.st === 'active');
    if (AppState.ui.atcls) {
        list = list.filter(a => a.clsId === AppState.ui.atcls);
    }
    
    const attDay = AppState.data.attendance[today] || {};
    const totalActive = list.length;
    const filled = list.filter(a => attDay[a.id]).length;
    const allFilled = totalActive > 0 && filled === totalActive;
    const present = list.filter(a => attDay[a.id] === 'P').length;
    const absent = list.filter(a => attDay[a.id] === 'A').length;
    const excused = list.filter(a => attDay[a.id] === 'E').length;
    
    return `
    <div class="ph">
        <div class="stit" data-i18n="menuAtt">Devam Takibi</div>
    </div>
    <div class="card mb3">
        <div class="flex fca gap3 fwrap">
            <div class="fgr" style="flex:1;min-width:200px;">
                <input type="date" value="${today}" 
                       onchange="AppState.ui.atd=this.value;go('attendance')" 
                       style="font-weight:700"/>
            </div>
            <div class="fgr">
                <select class="fs" onchange="AppState.ui.atcls=this.value;go('attendance')">
                    <option value="">Tüm Sınıflar</option>
                    ${AppState.data.classes.map(c => 
                        `<option value="${FormatUtils.escape(c.id)}"${AppState.ui.atcls === c.id ? ' selected' : ''}>${FormatUtils.escape(c.name)}</option>`
                    ).join('')}
                </select>
            </div>
        </div>
        ${totalActive > 0 ? `
        <div class="flex gap3 mt3" style="flex-wrap:wrap">
            <div class="ts"><span class="tw6 tb">${filled}/${totalActive}</span> girdi</div>
            <div class="ts">✅ <span class="tw6">${present}</span> Var</div>
            <div class="ts">❌ <span class="tw6">${absent}</span> Yok</div>
            <div class="ts">🔵 <span class="tw6">${excused}</span> İzinli</div>
        </div>
        <div class="mt3">
            ${allFilled 
                ? `<button class="btn bp w100" style="background:var(--green)" onclick="finalizeAttendance('${today}')">✅ Yoklama Tamamlandı — ${DateUtils.format(today)} Tarihe Kaydet</button>`
                : `<button class="btn bs w100" onclick="finalizeAttendance('${today}')" ${filled === 0 ? 'disabled' : ''}>📁 Kısmi Kaydet (${filled}/${totalActive} girdi)</button>`
            }
        </div>` : ''}
    </div>
    <div class="card">
        ${list.length === 0 ? '<p class="tm ts" style="text-align:center;padding:20px">Bu sınıfta aktif sporcu yok.</p>' :
        list.map(a => {
            const st = attDay[a.id] || '';
            return `
            <div class="att-row">
                <div class="flex fca gap2" style="flex:1;cursor:pointer" onclick="go('athleteProfile', {id:'${FormatUtils.escape(a.id)}'})">
                    ${UIUtils.getAvatar(32, null, FormatUtils.initials(a.fn, a.ln))}
                    <div>
                        <div class="tw6 tsm">${FormatUtils.escape(`${a.fn} ${a.ln}`)}</div>
                        <div class="ts tm">${FormatUtils.escape(className(a.clsId))}</div>
                    </div>
                </div>
                <div class="att-btns">
                    <button class="att-b${st === 'P' ? ' ap' : ''}" onclick="event.stopPropagation();setAtt('${FormatUtils.escape(a.id)}', 'P')">Var</button>
                    <button class="att-b${st === 'A' ? ' aa' : ''}" onclick="event.stopPropagation();setAtt('${FormatUtils.escape(a.id)}', 'A')">Yok</button>
                    <button class="att-b${st === 'E' ? ' al2' : ''}" onclick="event.stopPropagation();setAtt('${FormatUtils.escape(a.id)}', 'E')">İzinli</button>
                    <button class="att-b" onclick="event.stopPropagation();setAtt('${FormatUtils.escape(a.id)}')">Sil</button>
                </div>
            </div>`;
        }).join('')}
    </div>`;
}

// Günlük yoklama arşivle ve Excel olarak indir
window.finalizeAttendance = async function(date) {
    const attDay = AppState.data.attendance[date] || {};
    const list = AppState.data.athletes.filter(a => a.st === 'active');
    
    if (Object.keys(attDay).length === 0) {
        toast('Önce en az bir sporcu için yoklama giriniz!', 'e');
        return;
    }
    
    // 1) Tüm kayıtları DB'de güncelle (eksik olanları "yok" olarak işaretle)
    const sb = getSupabase();
    if (sb) {
        try {
            for (const a of list) {
                if (!attDay[a.id]) continue; // Girilmemiş olanları atla
                // Zaten setAtt ile kaydedildi, tekrar kaydetmeye gerek yok
            }
        } catch(e) { console.warn('Finalize DB error:', e); }
    }
    
    // 2) Excel/CSV olarak indir
    try {
        const rows = [['Ad', 'Soyad', 'TC', 'Sınıf', 'Durum', 'Tarih']];
        list.forEach(a => {
            const st = attDay[a.id] || 'Girilmedi';
            const stLabel = st === 'P' ? 'Var' : st === 'A' ? 'Yok' : st === 'E' ? 'İzinli' : 'Girilmedi';
            const cls = AppState.data.classes.find(c => c.id === a.clsId);
            rows.push([a.fn, a.ln, a.tc, cls?.name || '-', stLabel, date]);
        });
        
        // CSV oluştur ve indir
        const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Yoklama_${date}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        const filled = list.filter(a => attDay[a.id]).length;
        toast(`✅ ${date} tarihli yoklama (${filled}/${list.length} sporcu) kaydedildi ve indirildi!`, 'g');
    } catch(e) {
        toast('İndirme hatası: ' + e.message, 'e');
    }
};

window.setAtt = async function(aid, status) {
    const date = AppState.ui.atd || DateUtils.today();
    
    if (!AppState.data.attendance[date]) {
        AppState.data.attendance[date] = {};
    }
    
    if (status === undefined) {
        delete AppState.data.attendance[date][aid];
        // org_id + athlete_id + att_date ile sil
        const sb = getSupabase();
        if (sb) {
            await sb.from('attendance')
                .delete()
                .eq('athlete_id', aid)
                .eq('att_date', date)
                .eq('org_id', AppState.currentOrgId);
        }
    } else {
        AppState.data.attendance[date][aid] = status;
        const sb = getSupabase();
        if (sb) {
            try {
                // Önce var mı kontrol et, varsa update, yoksa insert
                const { data: existing } = await sb.from('attendance')
                    .select('id')
                    .eq('athlete_id', aid)
                    .eq('att_date', date)
                    .eq('org_id', AppState.currentOrgId)
                    .maybeSingle();
                
                if (existing?.id) {
                    // Güncelle
                    await sb.from('attendance')
                        .update({ status })
                        .eq('id', existing.id);
                } else {
                    // Yeni kayıt
                    await sb.from('attendance').insert({
                        id: generateId(),
                        org_id: AppState.currentOrgId,
                        branch_id: AppState.currentBranchId,
                        athlete_id: aid,
                        att_date: date,
                        status: status
                    });
                }
            } catch(e) {
                console.error('Attendance save error:', e);
                toast('Yoklama kaydedilemedi. Lütfen tekrar deneyin.', 'e');
            }
        }
    }
    
    go('attendance');
};

function pgPayments() {
    const activeTab = AppState.ui.paymentsTab || 'islemler';
    let list = [...AppState.data.payments];
    const f = AppState.filters.payments;
    if (f.st) list = list.filter(p => p.st === f.st);
    if (f.q) {
        const q = f.q.toLowerCase();
        list = list.filter(p =>
            (p.an || '').toLowerCase().includes(q) ||
            (p.ds || '').toLowerCase().includes(q) ||
            (p.serviceName || '').toLowerCase().includes(q)
        );
    }
    const total = list.reduce((s, p) => s + (p.ty === 'income' ? (p.amt || 0) : -(p.amt || 0)), 0);
    // Status counts for mini charts (from filtered list)
    const completedCount = list.filter(p => p.st === 'completed').length;
    const pendingCount = list.filter(p => p.st === 'pending').length;
    const overdueCount = list.filter(p => p.st === 'overdue').length;
    const totalStatusCount = completedCount + pendingCount + overdueCount || 1;
    const pendingNotifs = AppState.data.payments.filter(p => p.notifStatus === 'pending_approval');

    const notifSection = pendingNotifs.length > 0 ? `
    <div class="card mb3" style="border-left:4px solid var(--yellow)">
        <div class="flex fjb fca mb2">
            <div class="tw6 tsm">⏳ Onay Bekleyen Veli Bildirimleri <span style="background:var(--yellow);color:#000;border-radius:10px;padding:1px 8px;font-size:11px;font-weight:800;margin-left:6px">${pendingNotifs.length}</span></div>
        </div>
        ${pendingNotifs.map(p => {
            const methodLabel = p.payMethod === 'nakit' ? '💵 Nakit' : p.payMethod === 'kredi_karti' ? '💳 Kredi Kartı' : p.payMethod === 'havale' ? '🏦 Havale/EFT' : p.payMethod || 'Belirtilmedi';
            return `
            <div style="padding:12px;background:var(--bg3);border-radius:10px;margin-bottom:8px;border:1px solid var(--border)">
                <div class="flex fjb fca fwrap gap2">
                    <div>
                        <div class="tw6">${FormatUtils.escape(p.an)} — ${FormatUtils.currency(p.amt)}</div>
                        <div class="ts tm">${DateUtils.format(p.dt)} • ${FormatUtils.escape(p.ds || 'Aidat')} • ${methodLabel}</div>
                    </div>
                    <div class="flex gap2">
                        <button class="btn btn-sm bp" onclick="approvePayment('${FormatUtils.escape(p.id)}')">✅ Onayla</button>
                        <button class="btn btn-sm bd" onclick="rejectPayment('${FormatUtils.escape(p.id)}')">❌ Reddet</button>
                    </div>
                </div>
            </div>`;
        }).join('')}
    </div>` : '';

    // Ödeme Planları sekmesi içeriği
    const planlar = (AppState.data.payments || []).filter(p => p.source === 'plan');

    // --- Feature 1: Multi-select athlete component ---
    const athleteCheckboxes = _buildAthleteCheckboxes('plan-ath-cb', true);

    const planSection = `
    <div class="card mb3" style="border-left:4px solid var(--blue2)">
        <div class="flex fjb fca mb3">
            <div class="tw6 tsm">📅 Sporcu Ödeme Planı Oluştur</div>
        </div>
        <div class="fgr mb2">
            <label>Sporcu(lar) *</label>
            <input id="plan-ath-search" type="text" placeholder="Sporcu ara..." oninput="filterPlanAthletes()" style="margin-bottom:6px"/>
            <div class="flex gap2 mb2">
                <button type="button" class="btn btn-xs bs" onclick="toggleAllPlanAthletes(true)">✅ Tümünü Seç</button>
                <button type="button" class="btn btn-xs bd" onclick="toggleAllPlanAthletes(false)">✕ Seçimi Temizle</button>
            </div>
            <div id="plan-ath-list" style="max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:4px">${athleteCheckboxes}</div>
            <div id="plan-ath-tags" class="flex fwrap gap1 mt1" style="min-height:0"></div>
        </div>
        <div class="g21 mb2">
            <div class="fgr">
                <label>Ödeme Tutarı (₺) *</label>
                <input id="plan-amt" type="number" placeholder="Aylık tutar"/>
            </div>
            <div class="fgr">
                <label>Ay *</label>
                <input id="plan-month" type="month" value="${DateUtils.today().slice(0,7)}"/>
            </div>
        </div>
        <div class="fgr mb2">
            <label>Açıklama</label>
            <input id="plan-desc" placeholder="Örn: Ocak Aidatı"/>
        </div>
        <div class="flex gap2 mb3">
            <button class="btn bp" onclick="createPaymentPlan()">+ Tek Ay Ekle</button>
            <button class="btn bs" onclick="showBulkPlanModal()">📆 Toplu Plan Oluştur</button>
        </div>
    </div>

    ${_buildGroupedPlanList(planlar)}`;

    return `
    <div class="ph"><div class="stit">Ödemeler</div></div>
    ${notifSection}
    <div class="flex gap2 mb3" style="border-bottom:1px solid var(--border);padding-bottom:0">
        <button onclick="AppState.ui.paymentsTab='islemler';go('payments')" style="padding:10px 18px;border:none;cursor:pointer;border-bottom:${activeTab==='islemler'?'2px solid var(--blue2)':'2px solid transparent'};background:none;color:${activeTab==='islemler'?'var(--blue2)':'var(--text2)'};font-weight:${activeTab==='islemler'?'700':'400'};font-size:14px">💳 Tüm İşlemler</button>
        <button onclick="AppState.ui.paymentsTab='planlar';go('payments')" style="padding:10px 18px;border:none;cursor:pointer;border-bottom:${activeTab==='planlar'?'2px solid var(--blue2)':'2px solid transparent'};background:none;color:${activeTab==='planlar'?'var(--blue2)':'var(--text2)'};font-weight:${activeTab==='planlar'?'700':'400'};font-size:14px">📅 Ödeme Planları</button>
    </div>
    ${activeTab === 'planlar' ? planSection : `
    <div class="flex fjb fca mb3 gap2 fwrap">
        <div class="flex gap2 fca fwrap">
            <button class="btn bp" onclick="editPay()">+ Yeni İşlem</button>
            <input class="fs" style="width:180px" type="search" placeholder="🔍 Ara..."
                value="${FormatUtils.escape(AppState.filters.payments.q || '')}"
                oninput="AppState.filters.payments.q=this.value;go('payments')"/>
            <select class="fs" onchange="AppState.filters.payments.st=this.value;go('payments')">
                <option value="">Tüm Durumlar</option>
                <option value="completed"${AppState.filters.payments.st==='completed'?' selected':''}>Ödendi</option>
                <option value="pending"${AppState.filters.payments.st==='pending'?' selected':''}>Bekliyor</option>
                <option value="overdue"${AppState.filters.payments.st==='overdue'?' selected':''}>Gecikti</option>
            </select>
        </div>
        <div class="flex gap2 fca">
            <button class="btn bs" onclick="exportPayments()">&#x1F4E4; İndir</button>
            <span class="tw6 tb">Net: ${FormatUtils.currency(total)}</span>
        </div>
    </div>
    <div class="flex gap2 fwrap mb3">
        <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--bg3);border-radius:10px;border:1px solid var(--border);flex:1;min-width:120px">
            <svg width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border)" stroke-width="4"/>
                <circle cx="20" cy="20" r="16" fill="none" stroke="var(--green)" stroke-width="4" stroke-dasharray="${(completedCount/totalStatusCount)*100.53} 100.53" stroke-linecap="round" transform="rotate(-90 20 20)"/>
            </svg>
            <div>
                <div style="font-size:18px;font-weight:700;color:var(--green)">${completedCount}</div>
                <div style="font-size:11px;color:var(--text2)">Ödendi</div>
            </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--bg3);border-radius:10px;border:1px solid var(--border);flex:1;min-width:120px">
            <svg width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border)" stroke-width="4"/>
                <circle cx="20" cy="20" r="16" fill="none" stroke="var(--yellow)" stroke-width="4" stroke-dasharray="${(pendingCount/totalStatusCount)*100.53} 100.53" stroke-linecap="round" transform="rotate(-90 20 20)"/>
            </svg>
            <div>
                <div style="font-size:18px;font-weight:700;color:var(--yellow)">${pendingCount}</div>
                <div style="font-size:11px;color:var(--text2)">Bekliyor</div>
            </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--bg3);border-radius:10px;border:1px solid var(--border);flex:1;min-width:120px">
            <svg width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="var(--border)" stroke-width="4"/>
                <circle cx="20" cy="20" r="16" fill="none" stroke="var(--red)" stroke-width="4" stroke-dasharray="${(overdueCount/totalStatusCount)*100.53} 100.53" stroke-linecap="round" transform="rotate(-90 20 20)"/>
            </svg>
            <div>
                <div style="font-size:18px;font-weight:700;color:var(--red)">${overdueCount}</div>
                <div style="font-size:11px;color:var(--text2)">Gecikti</div>
            </div>
        </div>
    </div>
    ${(function(){
        var _payPage = AppState.ui.payPage || 0;
        var _payTotal = list.length;
        var _payList = f.q ? list : list.slice(_payPage * 25, (_payPage + 1) * 25);
        var _pagBar = (!f.q && window._paginationBar) ? window._paginationBar(_payPage, _payTotal, '_payChangePage') : '';
        return _buildGroupedTransactionList(_payList) + (_pagBar ? '<div class="card" style="padding:0;margin-top:-1px">' + _pagBar + '</div>' : '');
    })()}`}`;
}

window.editPay = function(id) {
    const p = id ? AppState.data.payments.find(x => x.id === id) : null;
    const isNew = !p;
    
    modal(isNew ? 'Yeni Finansal İşlem' : 'İşlem Detayı', `
    <div class="fgr mb2">
        <label>Sporcu / Kişi</label>
        <select id="p-aid">
            <option value="">Bağımsız İşlem</option>
            ${AppState.data.athletes.map(a => 
                `<option value="${FormatUtils.escape(a.id)}"${p?.aid === a.id ? ' selected' : ''}>${FormatUtils.escape(`${a.fn} ${a.ln}`)}</option>`
            ).join('')}
        </select>
    </div>
    <div class="g21">
        <div class="fgr">
            <label>Tutar (₺) *</label>
            <input id="p-amt" type="number" value="${p?.amt || ''}"/>
        </div>
        <div class="fgr">
            <label>İşlem Türü</label>
            <select id="p-ty">
                <option value="income"${p?.ty === 'income' ? ' selected' : ''}>Gelir (Tahsilat)</option>
                <option value="expense"${p?.ty === 'expense' ? ' selected' : ''}>Gider (Ödeme)</option>
            </select>
        </div>
    </div>
    <div class="fgr mt2">
        <label>Açıklama / Hizmet Adı</label>
        <input id="p-ds" value="${FormatUtils.escape(p?.ds || '')}" placeholder="Örn: Ekim Ayı Aidatı"/>
    </div>
    <div class="g21 mt2">
        <div class="fgr">
            <label>Durum</label>
            <select id="p-st">
                <option value="completed"${p?.st === 'completed' ? ' selected' : ''}>Ödendi</option>
                <option value="pending"${p?.st === 'pending' ? ' selected' : ''}>Bekliyor</option>
                <option value="overdue"${p?.st === 'overdue' ? ' selected' : ''}>Gecikti</option>
            </select>
        </div>
        <div class="fgr">
            <label>Tarih</label>
            <input id="p-dt" type="date" value="${FormatUtils.escape(p?.dt || DateUtils.today())}"/>
        </div>
    </div>
    <div class="fgr mt2">
        <label>Ödeme Yöntemi</label>
        <select id="p-method">
            <option value="">Belirtilmedi</option>
            <option value="paytr"${p?.payMethod === 'paytr' ? ' selected' : ''}>🔵 PayTR Online</option>
        </select>
    </div>
    <div class="g21 mt2">
        <div class="fgr">
            <label>KDV Oranı (%)</label>
            <input id="p-tax-rate" type="number" min="0" max="100" step="1" value="${p?.taxRate || 0}" oninput="(function(){var a=parseFloat(document.getElementById('p-amt').value)||0;var r=parseFloat(this.value)||0;document.getElementById('p-tax-amt').value=(a*r/100).toFixed(2)}).call(this)"/>
        </div>
        <div class="fgr">
            <label>KDV Tutarı (₺)</label>
            <input id="p-tax-amt" type="number" min="0" step="0.01" value="${p?.taxAmount || 0}"/>
        </div>
    </div>
    `, [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: 'Kaydet', cls: 'bp', fn: async () => {
            const aid = UIUtils.getValue('p-aid');
            const ath = AppState.data.athletes.find(a => a.id === aid);
            const ds = UIUtils.getValue('p-ds');
            
            const obj = {
                id: p?.id || generateId(),
                aid: aid,
                an: ath ? `${ath.fn} ${ath.ln}` : (ds || 'Bilinmiyor'),
                amt: UIUtils.getNumber('p-amt'),
                ds: ds,
                st: UIUtils.getValue('p-st'),
                dt: UIUtils.getValue('p-dt'),
                ty: UIUtils.getValue('p-ty'),
                serviceName: ds,
                payMethod: UIUtils.getValue('p-method') || p?.payMethod || '',
                taxRate: UIUtils.getNumber('p-tax-rate') || 0,
                taxAmount: UIUtils.getNumber('p-tax-amt') || 0,
                source: p?.source || 'manual',
                notifStatus: p?.notifStatus || '',
                slipCode: p?.slipCode || '',
                orgId: p?.orgId || '',
                branchId: p?.branchId || ''
            };
            
            if (!obj.amt) {
                toast(i18n[AppState.lang].fillRequired, 'e');
                return;
            }
            
            const result = await DB.upsert('payments', DB.mappers.fromPayment(obj));
            if (result) {
                if (isNew) {
                    AppState.data.payments.push(obj);
                } else {
                    const idx = AppState.data.payments.findIndex(x => x.id === obj.id);
                    if (idx >= 0) AppState.data.payments[idx] = obj;
                }
                toast(i18n[AppState.lang].saveSuccess, 'g');
                closeModal();
                go('payments');
            }
        }}
    ]);
};

window.delPay = function(id) {
    confirm2('İşlem Sil', i18n[AppState.lang].deleteConfirm, async () => {
        if (await DB.remove('payments', { id })) {
            AppState.data.payments = AppState.data.payments.filter(x => x.id !== id);
            toast('İşlem silindi', 'g');
            go('payments');
        }
    });
};

// Veli havale/ödeme bildirimi onaylama
// Sporcu seçilince aylık ücretini plan tutarına doldur
window.updatePlanFee = function() {
    const sel = document.getElementById('plan-aid');
    const amtInput = document.getElementById('plan-amt');
    if (!sel || !amtInput) return;
    const opt = sel.options[sel.selectedIndex];
    const fee = opt?.dataset?.fee;
    if (fee && fee !== '0') amtInput.value = fee;
    // Açıklama otomatik doldur
    const monthInput = document.getElementById('plan-month');
    const descInput = document.getElementById('plan-desc');
    if (descInput && monthInput && !descInput.value) {
        const [y, m] = (monthInput.value || '').split('-');
        const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
        if (m) descInput.value = `${months[parseInt(m)-1] || m} ${y} Aidatı`;
    }
};

// --- Feature 1: Multi-select helpers ---

// Shared helper to build athlete checkbox HTML
function _buildAthleteCheckboxes(cbClass, showFee) {
    return AppState.data.athletes.map(a => {
        const name = `${a.fn} ${a.ln}`;
        return `<label class="ms-item" data-name="${FormatUtils.escape(name.toLowerCase())}" data-id="${a.id}" data-fee="${a.fee||0}">
            <input type="checkbox" class="${cbClass}" value="${a.id}" data-fee="${a.fee||0}" data-name="${FormatUtils.escape(name)}"/>
            <span>${FormatUtils.escape(name)}</span>
            ${showFee ? `<span class="tm ts" style="margin-left:auto">${FormatUtils.currency(a.fee||0)}</span>` : ''}
        </label>`;
    }).join('');
}

window.filterPlanAthletes = function() {
    const q = (document.getElementById('plan-ath-search')?.value || '').toLowerCase();
    document.querySelectorAll('#plan-ath-list .ms-item').forEach(el => {
        el.style.display = (el.dataset.name || '').includes(q) ? '' : 'none';
    });
};

window.toggleAllPlanAthletes = function(check) {
    document.querySelectorAll('#plan-ath-list .plan-ath-cb').forEach(cb => {
        if (cb.closest('.ms-item').style.display !== 'none') cb.checked = check;
    });
    _updatePlanAthTags();
    _autoFillFeeFromSelection();
};

window.removePlanAthlete = function(id) {
    const cb = document.querySelector(`.plan-ath-cb[value="${id}"]`);
    if (cb) cb.checked = false;
    _updatePlanAthTags();
    _autoFillFeeFromSelection();
};

function _updatePlanAthTags() {
    const container = document.getElementById('plan-ath-tags');
    if (!container) return;
    const checked = document.querySelectorAll('#plan-ath-list .plan-ath-cb:checked');
    if (checked.length === 0) { container.innerHTML = ''; return; }
    container.innerHTML = Array.from(checked).map(cb =>
        `<span class="ath-tag">${FormatUtils.escape(cb.dataset.name)} <span class="ath-tag-x" data-id="${FormatUtils.escape(cb.value)}" onclick="removePlanAthlete(this.dataset.id)">✕</span></span>`
    ).join('');
}

function _autoFillFeeFromSelection() {
    const checked = document.querySelectorAll('#plan-ath-list .plan-ath-cb:checked');
    const amtInput = document.getElementById('plan-amt');
    if (!amtInput) return;
    if (checked.length === 1) {
        const fee = checked[0].dataset.fee;
        if (fee && fee !== '0') amtInput.value = fee;
    }
}

function _getSelectedAthleteIds() {
    return Array.from(document.querySelectorAll('#plan-ath-list .plan-ath-cb:checked')).map(cb => cb.value);
}

// Attach change event to checkboxes after render
window._initPlanAthCheckboxes = function() {
    document.querySelectorAll('#plan-ath-list .plan-ath-cb').forEach(cb => {
        cb.addEventListener('change', () => { _updatePlanAthTags(); _autoFillFeeFromSelection(); });
    });
};

// --- Feature 2: Grouped plan list helper ---
function _buildGroupedPlanList(planlar) {
    if (planlar.length === 0) {
        return `<div class="card"><div class="tw6 tsm mb2">📋 Mevcut Ödeme Planları</div><p class="tm ts">Henüz ödeme planı oluşturulmadı.</p></div>`;
    }
    // Group by athlete
    const groups = {};
    planlar.forEach(p => {
        const key = p.aid || 'unknown';
        if (!groups[key]) groups[key] = { name: p.an || 'Bilinmeyen', plans: [] };
        groups[key].plans.push(p);
    });
    const groupKeys = Object.keys(groups).sort((a, b) => groups[a].name.localeCompare(groups[b].name, 'tr'));
    const accordionItems = groupKeys.map((key, idx) => {
        const g = groups[key];
        const totalDebt = g.plans.reduce((s, p) => s + (p.amt || 0), 0);
        const rows = g.plans.sort((a, b) => b.dt.localeCompare(a.dt)).map(p => `
            <tr>
                <td>${FormatUtils.escape(p.ds || DateUtils.format(p.dt))}</td>
                <td class="tw6 tg">${FormatUtils.currency(p.amt)}</td>
                <td><span class="bg ${p.st === 'completed' ? 'bg-g' : p.st === 'overdue' ? 'bg-r' : 'bg-y'}">${statusLabel(p.st)}</span></td>
                <td>
                    <button class="btn btn-xs bp" onclick="editPay('${FormatUtils.escape(p.id)}')">Düzenle</button>
                    <button class="btn btn-xs bd" onclick="delPay('${FormatUtils.escape(p.id)}')">Sil</button>
                </td>
            </tr>`).join('');
        return `
        <div class="plan-acc-item" style="border:1px solid var(--border);border-radius:10px;margin-bottom:8px;overflow:hidden">
            <div class="plan-acc-head" style="padding:12px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:var(--bg3)" onclick="this.parentElement.classList.toggle('open')">
                <div>
                    <span class="tw6" style="cursor:pointer;color:var(--blue2)" onclick="event.stopPropagation();go('athleteProfile',{id:'${FormatUtils.escape(key)}'})">${FormatUtils.escape(g.name)}</span>
                    <span class="tm ts" style="margin-left:8px">${g.plans.length} plan</span>
                </div>
                <div class="flex fca gap2">
                    <span class="tw6 tg ts">${FormatUtils.currency(totalDebt)}</span>
                    <span class="plan-acc-arrow" style="transition:transform .2s">▼</span>
                </div>
            </div>
            <div class="plan-acc-body" style="display:none;padding:0 14px 14px">
                <div class="tw" style="margin-top:10px"><table>
                    <thead><tr><th>Ay</th><th>Tutar</th><th>Durum</th><th>İşlem</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table></div>
            </div>
        </div>`;
    }).join('');

    return `<div class="card">
        <div class="tw6 tsm mb2">📋 Mevcut Ödeme Planları</div>
        <input id="plan-list-search" type="text" placeholder="Sporcu ara..." oninput="filterPlanAccordion()" style="margin-bottom:10px;width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg2);color:var(--text1)"/>
        <div id="plan-acc-container">${accordionItems}</div>
    </div>`;
}

window.filterPlanAccordion = function() {
    const q = (document.getElementById('plan-list-search')?.value || '').toLowerCase();
    document.querySelectorAll('#plan-acc-container .plan-acc-item').forEach(el => {
        const name = el.querySelector('.plan-acc-head .tw6')?.textContent?.toLowerCase() || '';
        el.style.display = name.includes(q) ? '' : 'none';
    });
};

// --- Grouped transaction list (same pattern as _buildGroupedPlanList) ---
function _buildGroupedTransactionList(list) {
    if (list.length === 0) {
        return `<div class="card"><p class="tm ts">Kayıt bulunamadı.</p></div>`;
    }
    // Group by athlete
    const groups = {};
    list.forEach(p => {
        const key = p.aid || '_independent';
        if (!groups[key]) groups[key] = { name: p.aid ? (p.an || 'Bilinmeyen') : 'Diğer İşlemler', txns: [] };
        groups[key].txns.push(p);
    });
    const groupKeys = Object.keys(groups).sort((a, b) => {
        if (a === '_independent') return 1;
        if (b === '_independent') return -1;
        return groups[a].name.localeCompare(groups[b].name, 'tr');
    });
    const accordionItems = groupKeys.map(key => {
        const g = groups[key];
        const groupTotal = g.txns.reduce((s, p) => s + (p.ty === 'income' ? (p.amt || 0) : -(p.amt || 0)), 0);
        const rows = g.txns.sort((a, b) => (b.dt || '').localeCompare(a.dt || '')).map(p => {
            const mIcon = p.payMethod==='nakit'?'💵':p.payMethod==='kredi_karti'?'💳':p.payMethod==='havale'?'🏦':p.payMethod==='paytr'?'🔵':'';
            const notifBadge = p.notifStatus==='pending_approval'?'<span class="bg bg-y" style="font-size:10px">Onay Bekliyor</span>':'';
            return `<tr>
                <td data-label="Tarih">${DateUtils.format(p.dt)}</td>
                <td data-label="Açıklama">${FormatUtils.escape(p.serviceName||p.ds||'-')}</td>
                <td data-label="Yöntem">${mIcon} ${FormatUtils.escape(p.payMethod||'-')}</td>
                <td data-label="Tutar" class="tw6 ${p.ty==='income'?'tg':'tr2'}">${FormatUtils.currency(p.amt)}</td>
                <td data-label="Tür"><span class="bg ${statusClass(p.ty)}">${statusLabel(p.ty)}</span></td>
                <td data-label="Durum"><span class="bg ${statusClass(p.st)}">${statusLabel(p.st)}</span> ${notifBadge}</td>
                <td data-label="">
                    <button class="btn btn-xs bp" onclick="editPay('${FormatUtils.escape(p.id)}')">Düzenle</button>
                    <button class="btn btn-xs bd" onclick="delPay('${FormatUtils.escape(p.id)}')">Sil</button>
                </td>
            </tr>`;
        }).join('');
        const nameHtml = key !== '_independent'
            ? `<span class="tw6" style="cursor:pointer;color:var(--blue2)" onclick="event.stopPropagation();go('athleteProfile',{id:'${FormatUtils.escape(key)}'})">${FormatUtils.escape(g.name)}</span>`
            : `<span class="tw6">${FormatUtils.escape(g.name)}</span>`;
        return `
        <div class="plan-acc-item" style="border:1px solid var(--border);border-radius:10px;margin-bottom:8px;overflow:hidden">
            <div class="plan-acc-head" style="padding:12px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;background:var(--bg3)" onclick="this.parentElement.classList.toggle('open')">
                <div>
                    ${nameHtml}
                    <span class="tm ts" style="margin-left:8px">${g.txns.length} işlem</span>
                </div>
                <div class="flex fca gap2">
                    <span class="tw6 ${groupTotal >= 0 ? 'tg' : 'tr2'} ts">${FormatUtils.currency(Math.abs(groupTotal))}</span>
                    <span class="plan-acc-arrow" style="transition:transform .2s">▼</span>
                </div>
            </div>
            <div class="plan-acc-body" style="display:none;padding:0 14px 14px">
                <div class="tw" style="margin-top:10px"><table class="payment-table">
                    <thead><tr><th>Tarih</th><th>Açıklama</th><th>Yöntem</th><th>Tutar</th><th>Tür</th><th>Durum</th><th>İşlemler</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table></div>
            </div>
        </div>`;
    }).join('');

    return `<div class="card">
        <div class="tw6 tsm mb2">💳 Tüm İşlemler</div>
        <input id="txn-list-search" type="text" placeholder="Sporcu ara..." oninput="filterTransactionAccordion()" style="margin-bottom:10px;width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg2);color:var(--text1)"/>
        <div id="txn-acc-container">${accordionItems}</div>
    </div>`;
}

window.filterTransactionAccordion = function() {
    const q = (document.getElementById('txn-list-search')?.value || '').toLowerCase();
    document.querySelectorAll('#txn-acc-container .plan-acc-item').forEach(el => {
        const name = el.querySelector('.plan-acc-head .tw6')?.textContent?.toLowerCase() || '';
        el.style.display = name.includes(q) ? '' : 'none';
    });
};

// Tek ay ödeme planı oluştur — Feature 1: Multi-athlete support
window.createPaymentPlan = async function() {
    const selectedIds = _getSelectedAthleteIds();
    const amt = parseFloat(document.getElementById('plan-amt')?.value);
    const month = document.getElementById('plan-month')?.value; // YYYY-MM
    const desc = document.getElementById('plan-desc')?.value?.trim();

    if (selectedIds.length === 0) { toast('En az bir sporcu seçiniz!', 'e'); return; }
    if (!amt || amt <= 0) { toast('Tutar giriniz!', 'e'); return; }
    if (!month) { toast('Ay seçiniz!', 'e'); return; }

    const dt = month + '-01';
    const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    const [y, m] = month.split('-');
    const autoDesc = desc || `${months[parseInt(m)-1]} ${y} Aidatı`;
    let created = 0, skipped = 0;

    for (const aid of selectedIds) {
        const ath = AppState.data.athletes.find(a => a.id === aid);
        if (!ath) continue;
        const exists = AppState.data.payments.find(p => p.source === 'plan' && p.aid === aid && p.dt === dt);
        if (exists) { skipped++; continue; }
        const obj = {
            id: generateId(), aid, an: `${ath.fn} ${ath.ln}`,
            amt, dt, ty: 'income', st: 'pending',
            ds: autoDesc, serviceName: autoDesc,
            source: 'plan', notifStatus: '', payMethod: ''
        };
        const result = await DB.upsert('payments', DB.mappers.fromPayment(obj));
        if (result) {
            AppState.data.payments.push(obj);
            created++;
        }
    }
    let msg = `✅ ${created} sporcu için ${autoDesc} planı oluşturuldu!`;
    if (skipped > 0) msg += ` (${skipped} sporcu zaten mevcut, atlandı)`;
    toast(msg, 'g');
    go('payments');
};

// Toplu plan oluştur modal — Feature 1: Multi-athlete support
window.showBulkPlanModal = function() {
    const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    const now = new Date();
    const bulkAthCheckboxes = _buildAthleteCheckboxes('bulk-ath-cb', false);
    modal('📆 Toplu Ödeme Planı Oluştur', `
    <div class="al al-b mb3" style="font-size:13px">
        Seçili sporcular için başlangıç ayından itibaren belirtilen ay sayısı kadar plan oluşturur.
    </div>
    <div class="fgr mb2">
        <label>Sporcu(lar) *</label>
        <input id="bulk-ath-search" type="text" placeholder="Sporcu ara..." oninput="filterBulkAthletes()" style="margin-bottom:6px"/>
        <div class="flex gap2 mb2">
            <button type="button" class="btn btn-xs bs" onclick="toggleAllBulkAthletes(true)">✅ Tümünü Seç</button>
            <button type="button" class="btn btn-xs bd" onclick="toggleAllBulkAthletes(false)">✕ Temizle</button>
        </div>
        <div id="bulk-ath-list" style="max-height:150px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:4px">${bulkAthCheckboxes}</div>
    </div>
    <div class="g21 mb2">
        <div class="fgr">
            <label>Başlangıç Ayı *</label>
            <input id="bulk-start" type="month" value="${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}"/>
        </div>
        <div class="fgr">
            <label>Ay Sayısı *</label>
            <input id="bulk-count" type="number" min="1" max="24" value="12"/>
        </div>
    </div>
    <div class="fgr mb2">
        <label>Aylık Tutar (₺) *</label>
        <input id="bulk-amt" type="number" placeholder="Tutar giriniz"/>
    </div>
    `, [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: '✅ Planları Oluştur', cls: 'bp', fn: async () => {
            const selectedIds = Array.from(document.querySelectorAll('#bulk-ath-list .bulk-ath-cb:checked')).map(cb => cb.value);
            const startMonth = document.getElementById('bulk-start')?.value;
            const count = parseInt(document.getElementById('bulk-count')?.value) || 0;
            const amt = parseFloat(document.getElementById('bulk-amt')?.value) || 0;
            if (selectedIds.length === 0 || !startMonth || count < 1 || amt <= 0) { toast('Tüm alanları doldurun!', 'e'); return; }
            let created = 0;
            const [sy, sm] = startMonth.split('-').map(Number);
            for (const aid of selectedIds) {
                const ath = AppState.data.athletes.find(a => a.id === aid);
                if (!ath) continue;
                for (let i = 0; i < count; i++) {
                    const d = new Date(sy, sm - 1 + i, 1);
                    const y = d.getFullYear(), m = d.getMonth();
                    const dt = `${y}-${String(m+1).padStart(2,'0')}-01`;
                    const exists = AppState.data.payments.find(p => p.source === 'plan' && p.aid === aid && p.dt === dt);
                    if (exists) continue;
                    const autoDesc = `${months[m]} ${y} Aidatı`;
                    const obj = {
                        id: generateId(), aid, an: `${ath.fn} ${ath.ln}`,
                        amt, dt, ty: 'income', st: 'pending',
                        ds: autoDesc, serviceName: autoDesc,
                        source: 'plan', notifStatus: '', payMethod: ''
                    };
                    await DB.upsert('payments', DB.mappers.fromPayment(obj));
                    AppState.data.payments.push(obj);
                    created++;
                }
            }
            toast(`✅ ${selectedIds.length} sporcu için ${created} plan oluşturuldu!`, 'g');
            closeModal();
            go('payments');
        }}
    ]);
};

window.filterBulkAthletes = function() {
    const q = (document.getElementById('bulk-ath-search')?.value || '').toLowerCase();
    document.querySelectorAll('#bulk-ath-list .ms-item').forEach(el => {
        el.style.display = (el.dataset.name || '').includes(q) ? '' : 'none';
    });
};

window.toggleAllBulkAthletes = function(check) {
    document.querySelectorAll('#bulk-ath-list .bulk-ath-cb').forEach(cb => {
        if (check) { if (cb.closest('.ms-item').style.display !== 'none') cb.checked = true; }
        else cb.checked = false;
    });
};

window.selectAllSpPlans = function() {
    document.querySelectorAll('.sp-plan-cb').forEach(cb => {
        cb.checked = true;
        cb.parentElement.classList.add('checked');
    });
    _spUpdateBulkTotal();
};

window.approvePayment = async function(id) {
    const p = AppState.data.payments.find(x => x.id === id);
    if (!p) return;

    const doApprove = async (slipCode) => {
        const obj = { ...p, st: 'completed', notifStatus: 'approved', slipCode: slipCode || '' };
        const result = await DB.upsert('payments', DB.mappers.fromPayment(obj));
        if (result) {
            const idx = AppState.data.payments.findIndex(x => x.id === id);
            if (idx >= 0) AppState.data.payments[idx] = obj;

            // Aynı sporcu + aynı ay tarihinde bekleyen plan kaydı varsa onu da tamamla
            if (p.source === 'parent_notification' && p.aid && p.dt) {
                const matchPlan = AppState.data.payments.find(x =>
                    x.id !== id && x.aid === p.aid && x.source === 'plan' &&
                    x.st !== 'completed' && x.dt === p.dt
                );
                if (matchPlan) {
                    const planObj = { ...matchPlan, st: 'completed' };
                    await DB.upsert('payments', DB.mappers.fromPayment(planObj));
                    const pi = AppState.data.payments.findIndex(x => x.id === matchPlan.id);
                    if (pi >= 0) AppState.data.payments[pi] = planObj;
                }
            }

            toast(`✅ ${p.an} ödemesi onaylandı!`, 'g');
            // Feature 4: Auto-generate receipt after approval
            if (typeof generateReceipt === 'function') {
                try { generateReceipt(id); } catch(e) { console.warn('Makbuz oluşturulamadı:', e); }
            }
            go('payments');
        }
    };

    if (p.payMethod === 'kredi_karti') {
        modal('💳 Kredi Kartı Onayı', `
        <div style="background:var(--bg3);border-radius:10px;padding:12px 14px;margin-bottom:16px;font-size:13px;border:1px solid var(--border)">
            <div class="tw6">${FormatUtils.escape(p.an)}</div>
            <div class="tm ts">${FormatUtils.currency(p.amt)} • ${DateUtils.format(p.dt)} • ${FormatUtils.escape(p.ds || 'Aidat')}</div>
        </div>
        <div class="fgr">
            <label>Slip / POS Onay Kodu <span class="tm ts">(opsiyonel)</span></label>
            <input id="slip-code-input" type="text" placeholder="Örn: 123456" maxlength="20" style="font-family:monospace;letter-spacing:2px;text-transform:uppercase"/>
        </div>`, [
            { lbl: 'İptal', cls: 'bs', fn: closeModal },
            { lbl: '✅ Onayla', cls: 'bp', fn: async () => {
                const sc = (document.getElementById('slip-code-input')?.value || '').trim().toUpperCase();
                closeModal();
                await doApprove(sc);
            }}
        ]);
    } else {
        await doApprove('');
    }
};

// Veli bildirimini reddet ve sil
window.rejectPayment = function(id) {
    const p = AppState.data.payments.find(x => x.id === id);
    if (!p) return;
    confirm2('Bildirimi Reddet', `${p.an} tarafından yapılan ${FormatUtils.currency(p.amt)} tutarındaki bildirimi reddetmek istiyor musunuz?`, async () => {
        await DB.remove('payments', { id });
        AppState.data.payments = AppState.data.payments.filter(x => x.id !== id);
        toast('Bildirim reddedildi ve silindi.', 'g');
        go('payments');
    });
};

function pgAccounting() {
    const income = AppState.data.payments
        .filter(p => p.ty === 'income' && p.st === 'completed')
        .reduce((s, p) => s + (p.amt || 0), 0);
    const expense = AppState.data.payments
        .filter(p => p.ty === 'expense' && p.st === 'completed')
        .reduce((s, p) => s + (p.amt || 0), 0);
    
    return `
    <div class="ph">
        <div class="stit" data-i18n="menuAcc">Finans Raporu</div>
    </div>
    <div class="g3 mb3">
        <div class="card stat-card stat-g">
            <div class="stat-icon">&#x1F4B0;</div>
            <div class="stat-val tg">${FormatUtils.currency(income)}</div>
            <div class="stat-lbl">Gerçekleşen Tahsilat</div>
        </div>
        <div class="card stat-card stat-r">
            <div class="stat-icon">&#x1F4B8;</div>
            <div class="stat-val tr2">${FormatUtils.currency(expense)}</div>
            <div class="stat-lbl">Gerçekleşen Gider</div>
        </div>
        <div class="card stat-card stat-b">
            <div class="stat-icon">&#x1F4B3;</div>
            <div class="stat-val tb">${FormatUtils.currency(income - expense)}</div>
            <div class="stat-lbl">Net Kasa Bakiyesi</div>
        </div>
    </div>
    <div class="card">
        <p class="tm">
            <strong>Banka:</strong> ${FormatUtils.escape(AppState.data.settings?.bankName || 'Girilmedi')}<br>
            <strong>Alıcı:</strong> ${FormatUtils.escape(AppState.data.settings?.accountName || 'Girilmedi')}<br>
            <strong>IBAN:</strong> ${FormatUtils.escape(AppState.data.settings?.iban || 'Girilmedi')}
        </p>
    </div>`;
}

function pgCoaches() {
    return `
    <div class="ph">
        <div class="stit" data-i18n="menuCoa">Antrenörler</div>
    </div>
    <div class="flex fjb mb3">
        <button class="btn bp" onclick="editCoach()">+ Yeni Antrenör</button>
    </div>
    <div class="card">
        <div class="tw">
            <table>
                <thead>
                    <tr>
                        <th>Ad Soyad</th>
                        <th>TC / Telefon</th>
                        <th>Branş</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    ${AppState.data.coaches.map(c => `
                    <tr>
                        <td class="tw6">${FormatUtils.escape(`${c.fn} ${c.ln}`)}</td>
                        <td>${FormatUtils.escape(c.tc)} / ${FormatUtils.escape(c.ph || '-')}</td>
                        <td>${FormatUtils.escape(c.sp || '-')}</td>
                        <td>
                            <button class="btn btn-xs bp" onclick="editCoach('${FormatUtils.escape(c.id)}')">Düzenle</button>
                            <button class="btn btn-xs bd" onclick="delCoach('${FormatUtils.escape(c.id)}')">Sil</button>
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
}

window.editCoach = function(id) {
    const c = id ? AppState.data.coaches.find(x => x.id === id) : null;
    const isNew = !c;
    
    modal(isNew ? 'Yeni Antrenör' : 'Antrenör Düzenle', `
    <div class="g21">
        <div class="fgr">
            <label>Ad *</label>
            <input id="c-fn" value="${FormatUtils.escape(c?.fn || '')}"/>
        </div>
        <div class="fgr">
            <label>Soyad *</label>
            <input id="c-ln" value="${FormatUtils.escape(c?.ln || '')}"/>
        </div>
    </div>
    <div class="g21 mt2">
        <div class="fgr">
            <label>TC Kimlik *</label>
            <input id="c-tc" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="11" value="${FormatUtils.escape(c?.tc || '')}"/>
        </div>
        <div class="fgr">
            <label>Telefon</label>
            <input id="c-ph" type="tel" value="${FormatUtils.escape(c?.ph || '')}"/>
        </div>
    </div>
    <div class="fgr mt2">
        <label>E-posta</label>
        <input id="c-em" type="email" value="${FormatUtils.escape(c?.em || '')}"/>
    </div>
    <div class="fgr mt2">
        <label>Branş</label>
        <select id="c-sp">
            <option value="">Seçiniz</option>
            ${AppState.data.sports.map(s => 
                `<option value="${FormatUtils.escape(s.name)}"${c?.sp === s.name ? ' selected' : ''}>${FormatUtils.escape(s.name)}</option>`
            ).join('')}
        </select>
    </div>
    <div class="fgr mt2">
        <label>Maaş (₺)</label>
        <input id="c-sal" type="number" value="${c?.sal || ''}"/>
    </div>
    <div class="fgr mt2">
        <label>Özel Şifre ${isNew ? '(Boş = TC son 6 hane)' : '(Boş bırakırsanız mevcut şifre korunur)'}</label>
        <input id="c-pass" type="password" placeholder="${isNew ? 'Örn: 1234' : 'Yeni şifre girin veya boş bırakın'}" value=""/>
        ${!isNew && c?.coachPass ? '<div class="ts tm mt1">Mevcut özel şifre tanımlı</div>' : ''}
    </div>
    `, [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: 'Kaydet', cls: 'bp', fn: async () => {
            const fn = UIUtils.getValue('c-fn');
            const ln = UIUtils.getValue('c-ln');
            const tc = FormatUtils.cleanTC(UIUtils.getValue('c-tc'));
            
            if (!fn || !ln || !tc) {
                toast('Ad, Soyad ve TC zorunludur!', 'e');
                return;
            }
            
            if (!FormatUtils.tcValidate(tc)) {
                toast(i18n[AppState.lang].invalidTC, 'e');
                return;
            }
            
            const existing = AppState.data.coaches.find(x => x.tc === tc && x.id !== (c?.id));
            if (existing) {
                toast('Bu TC numarası zaten kayıtlı!', 'e');
                return;
            }
            
            const newPass = UIUtils.getValue('c-pass');
            const obj = {
                id: c?.id || generateId(),
                orgId: c?.orgId || AppState.currentOrgId,
                branchId: c?.branchId || AppState.currentBranchId,
                fn, ln, tc,
                ph: UIUtils.getValue('c-ph') || '',
                sp: UIUtils.getValue('c-sp') || '',
                em: UIUtils.getValue('c-em') || '',
                sal: UIUtils.getNumber('c-sal') || 0,
                coachPass: isNew ? (newPass || '') : (newPass || undefined),
                st: 'active'
            };
            
            const mapped = DB.mappers.fromCoach(obj);

            const result = await DB.upsert('coaches', mapped);
            if (result) {
                // If password was changed, also do an explicit update as fallback
                if (!isNew && newPass) {
                    try {
                        const sb = getSupabase();
                        if (sb) {
                            await sb.from('coaches').update({ coach_pass: newPass }).eq('id', obj.id);
                        }
                    } catch (passErr) {
                        console.warn('Coach password explicit update failed:', passErr);
                    }
                }
                
                // Update local state with actual password value
                if (newPass) {
                    obj.coachPass = newPass;
                } else if (!isNew) {
                    obj.coachPass = c?.coachPass || '';
                }
                
                if (isNew) {
                    AppState.data.coaches.push(obj);
                } else {
                    const idx = AppState.data.coaches.findIndex(x => x.id === obj.id);
                    if (idx >= 0) AppState.data.coaches[idx] = obj;
                }
                if (isNew) {
                    const authRes = await provisionCoachAuthUser(obj, newPass);
                    if (!authRes.ok && !authRes.skipped) {
                        toast('Antrenör kaydedildi ancak Auth hesabı oluşturulamadı: ' + authRes.reason, 'e');
                    }
                }
                toast(i18n[AppState.lang].saveSuccess, 'g');
                closeModal();
                go('coaches');
            }
        }}
    ]);
    
    // TC input için mobil uyumlu handler ekle
    setTimeout(() => setupTCInput('c-tc'), 100);
};

window.delCoach = function(id) {
    confirm2('Antrenör Sil', i18n[AppState.lang].deleteConfirm, async () => {
        if (await DB.remove('coaches', { id })) {
            AppState.data.coaches = AppState.data.coaches.filter(x => x.id !== id);
            toast('Antrenör silindi', 'g');
            go('coaches');
        }
    });
};

function pgSms() {
    return `
    <div class="ph">
        <div class="stit" data-i18n="menuSms">Bildirimler</div>
    </div>
    <div class="card">
        <div class="al al-y">
            SMS özelliği devre dışı bırakıldı.
        </div>
    </div>`;
}

window.sendBulkSms = async function() {
    toast('SMS özelliği devre dışı.', 'e');
};

function pgSettings() {
    const s = AppState.data.settings;
    const onKayitList = AppState.data.onKayitlar || [];
    
    return `
    <div class="ph">
        <div class="stit" data-i18n="menuSet">Sistem Ayarları</div>
        <div class="ssub">Akademi yönetim merkeziniz</div>
    </div>
    
    <div class="card mb3" style="border-left: 4px solid var(--blue2)">
        <div class="tw6 tsm mb2">&#x1F465; Rol ve Yetki Yönetimi</div>
        <div class="al al-b mb3" style="font-size:13px">
            Tüm yöneticiler aynı akademi verisini görür ve düzenleyebilir.<br>
            Antrenörler yalnızca Devam (Yoklama) ve Sporcu listesine erişebilir.
        </div>
        <div class="tw6 ts mb2">Mevcut Yöneticiler:</div>
        <div id="admin-list-area" style="margin-bottom:12px">
            <button class="btn bs btn-sm" onclick="loadAndShowAdmins()" style="width:100%">Yöneticileri Listele</button>
        </div>
        <div class="flex gap2 fwrap">
            <button class="btn bsu" onclick="showAddAdminModal()">&#x2795; Yeni Yönetici Ekle</button>
        </div>
    </div>

    <div class="card mb3" style="border-left: 4px solid #16a34a">
        <div class="tw6 tsm mb2">&#x1F5A5; Aktif Oturumlar</div>
        <div class="al mb3" style="font-size:13px">
            Sisteme giriş yapmış tüm kullanıcılar. Bir oturumu kapatırsanız o kullanıcı 60 saniye içinde otomatik çıkış yapacaktır.
        </div>
        <div id="sessions-list-area" style="margin-bottom:12px">
            <button class="btn bs btn-sm" onclick="loadAndShowSessions()" style="width:100%">Oturumları Listele</button>
        </div>
        <button class="btn" style="background:#dc2626;color:#fff;border:none" onclick="killAllSessionsBtn()">Tüm Oturumları Kapat (Kendim Hariç)</button>
    </div>

    <div class="card mb3" style="border-left: 4px solid var(--purple)">
        <div class="tw6 tsm mb3">&#x1F5BC; Logo Ayarları</div>
        <p class="ts tm mb3">Bu bölümden yüklediğiniz logo; giriş ekranı, sidebar ve sporcu portalinde otomatik görünür.</p>
        
        <div style="display:flex;align-items:center;justify-content:center;margin-bottom:16px">
            <div id="logo-preview" style="width:110px;height:110px;border-radius:50%;border:2px dashed var(--border);background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:48px;overflow:hidden;cursor:pointer" onclick="document.getElementById('logo-file-input').click()" title="Tıkla veya sürükle bırak">
                ${s?.logoUrl && s.logoUrl !== DEFAULT_LOGO
                    ? `<img src="${FormatUtils.escape(s.logoUrl)}" style="width:100%;height:100%;object-fit:cover"/>`
                    : '<span style="opacity:.4">⚽</span>'}
            </div>
        </div>
        
        <div class="fgr mb2">
            <label>&#x1F517; Harici Logo URL</label>
            <input id="s-logo-url" type="url" placeholder="https://site.com/logo.png" value="${FormatUtils.escape(s?.logoUrl && !s.logoUrl.startsWith('data:') ? s.logoUrl : '')}"/>
        </div>
        
        <div style="text-align:center;color:var(--text3);font-size:12px;margin:10px 0;font-weight:600;letter-spacing:.05em">— VEYA —</div>
        
        <div class="excel-drop-zone mb3" onclick="document.getElementById('logo-file-input').click()" style="cursor:pointer">
            <input type="file" id="logo-file-input" accept="image/*" style="display:none" onchange="handleLogoUpload(this)"/>
            <div style="font-size:20px;margin-bottom:4px">&#x1F4F7;</div>
            <div style="font-weight:600">Cihazdan Dosya Seç / Sürükle Bırak</div>
            <div style="font-size:12px;color:var(--text3);margin-top:4px">PNG, JPG, SVG — Maks 2MB</div>
        </div>
        
        <div class="flex gap2">
            <button class="btn bp" onclick="saveLogoSettings()" style="flex:1">&#x1F4BE; Logo Kaydet</button>
            ${s?.logoUrl ? `<button class="btn bd" onclick="removeLogo()">Kaldır</button>` : ''}
        </div>
        ${s?.logoUrl && s.logoUrl.startsWith('data:') ? `<div class="ts tm mt2" style="text-align:center">&#x26A0; Base64 logo DB\'ye kaydedildi (büyük olabilir, harici URL tercih edilir)</div>` : ''}
    </div>

    <div class="card mb3" style="border-left: 4px solid var(--blue2)">
        <div class="tw6 tsm mb2">&#x1F310; Dil / Language</div>
        <p class="ts tm mb2">Arayüz dilini seçin. / Select interface language.</p>
        <div class="fgr mb2">
            <label>Dil Seçimi / Language</label>
            <select id="s-lang-select" class="fs" onchange="changeLang(this.value)" style="padding:10px 14px;border-radius:10px;font-size:14px;min-height:44px">
                <option value="TR"${AppState.lang === 'TR' ? ' selected' : ''}>🇹🇷 Türkçe</option>
                <option value="EN"${AppState.lang === 'EN' ? ' selected' : ''}>🇬🇧 English</option>
            </select>
        </div>
    </div>

    <div class="card mb3" style="border-left: 4px solid var(--text2)">
        <div class="tw6 tsm mb2">&#x2699; Genel Kurum Ayarları</div>
        <div class="g21">
            <div class="fgr mb2">
                <label>Kurum Adı</label>
                <input id="s-name" value="${FormatUtils.escape(s?.schoolName || '')}"/>
            </div>
            <div class="fgr mb2">
                <label>Banka Adı</label>
                <input id="s-bank" value="${FormatUtils.escape(s?.bankName || '')}"/>
            </div>
        </div>
        <div class="g21">
            <div class="fgr mb2">
                <label>Hesap Adı</label>
                <input id="s-acc" value="${FormatUtils.escape(s?.accountName || '')}"/>
            </div>
            <div class="fgr mb2">
                <label>IBAN</label>
                <input id="s-iban" value="${FormatUtils.escape(s?.iban || '')}"/>
            </div>
        </div>
        <div class="fgr mb2">
            <label>Kurum Telefonu</label>
            <input id="s-phone" type="tel" value="${FormatUtils.escape(s?.ownerPhone || '')}"/>
        </div>
        <div class="fgr mb2">
            <label>Kurum Adresi</label>
            <textarea id="s-address" rows="2" placeholder="Örn: Atatürk Cad. No:1 Kartal/İstanbul">${FormatUtils.escape(s?.address || '')}</textarea>
        </div>
        <button class="btn bp mt2" onclick="saveGeneralSettings()">Genel Ayarları Kaydet</button>
    </div>


    <div class="card mb3" style="border-left: 4px solid #0070f3">
        <div class="flex fjb fca mb2">
            <div class="tw6 tsm">🔵 PayTR Online Ödeme Entegrasyonu</div>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                <input type="checkbox" id="s-paytr-active" ${s?.paytrActive ? 'checked' : ''}/>
                <span class="ts tw6">Aktif</span>
            </label>
        </div>
        <div class="al al-b mb3" style="font-size:12px">
            ℹ️ PayTR ile veliler online kredi kartı ödemesi yapabilir.<br>
            <strong>Merchant ID</strong> aşağıya girin. <strong>Merchant Key ve Salt</strong> güvenlik için yalnızca Supabase Secrets'a girilir — tarayıcıda saklanmaz.<br><br>
            <strong>Secrets komutu (bir kez çalıştırın):</strong><br>
            <code style="font-size:11px;display:block;margin-top:4px;word-break:break-all">supabase secrets set PAYTR_MERCHANT_KEY=xxx PAYTR_MERCHANT_SALT=xxx</code><br>
            <strong>Webhook URL:</strong><br>
            <code style="font-size:11px;word-break:break-all">${window?.location?.origin || 'https://siteniz.com'}/functions/v1/paytr-webhook</code>
        </div>
        <div class="fgr mb2">
            <label>Merchant ID <span class="tm ts">(gizli değil, güvenli)</span></label>
            <input id="s-paytr-mid" type="text" placeholder="PayTR Merchant ID (ör: 123456)" value="${FormatUtils.escape(s?.paytrMerchantId || '')}"/>
        </div>
        <div class="al al-y mb2" style="font-size:12px">
            🔒 Merchant Key ve Salt burada gösterilmez. Yalnızca Supabase Secrets'ta saklanır.
        </div>
        <button class="btn bp" onclick="savePayTRSettings()">PayTR Ayarlarını Kaydet</button>
    </div>

    <div class="card mb3" style="border-left:4px solid #25d366">
        <div class="flex fjb fca mb2">
            <div class="tw6 tsm" style="color:#25d366">💬 WhatsApp Business API</div>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                <input type="checkbox" id="s-wa-active" ${s?.waActive ? 'checked' : ''}/>
                <span class="ts tw6">Aktif</span>
            </label>
        </div>
        <div class="al al-b mb3" style="font-size:12px">ℹ️ WhatsApp Business API ile otomatik bildirim gönderebilirsiniz.<br>Meta Business hesabınızdan API token ve Phone Number ID alınız.</div>
        <div class="g21 mb2">
            <div class="fgr"><label>API Token</label><input id="s-wa-token" type="password" value="${FormatUtils.escape(s?.waApiToken || '')}"/></div>
            <div class="fgr"><label>Phone Number ID</label><input id="s-wa-phone" value="${FormatUtils.escape(s?.waPhoneId || '')}"/></div>
        </div>
        <div class="fgr mb2">
            <label>Otomatik Hatırlatma Günü (1-28)</label>
            <input id="s-wa-day" type="number" min="1" max="28" value="${s?.waReminderDay || 1}"/>
        </div>
        <button class="btn bsu" onclick="saveWhatsAppSettings()">💬 WhatsApp Ayarlarını Kaydet</button>
    </div>

    <div class="card mb3" style="border-left: 4px solid var(--yellow)">
        <div class="flex fjb fca mb3">
            <div class="flex fca gap2">
                <div class="tw6 tsm">&#x1F4DD; Ön Kayıt Başvuruları</div>
                <span style="background:rgba(234,179,8,.15);color:var(--yellow);border:1px solid rgba(234,179,8,.3);padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700">
                    ${onKayitList.filter(o => o.status === 'new').length} Yeni
                </span>
            </div>
            <button class="btn bs btn-sm" onclick="refreshOnKayitlar()">↻ Yenile</button>
        </div>
        ${onKayitList.length === 0 ? '<p class="tm ts">Henüz ön kayıt başvurusu bulunmuyor.</p>' :
          onKayitList.map(ok => `
          <div class="onkayit-card">
              <div class="ok-header mb2">
                  <div>
                      <div class="tw6">${FormatUtils.escape(ok.studentName)}</div>
                      <div class="ts tm">${DateUtils.format(ok.bd)} • ${FormatUtils.escape(ok.className || '-')}</div>
                  </div>
                  <span class="${ok.status === 'new' ? 'ok-badge-new' : 'ok-badge-done'}">${ok.status === 'new' ? 'Yeni' : 'İşlendi'}</span>
              </div>
              <div class="ts tm mb2">Veli: ${FormatUtils.escape(ok.parentName)} • ${FormatUtils.escape(ok.parentPhone)}</div>
              <div class="ts tm mb2">TC: ${FormatUtils.escape(ok.tc || '-')}</div>
              <div class="flex gap2">
                  ${ok.status === 'new' ? `
                  <button class="btn bsu btn-sm" onclick="convertOnKayit('${FormatUtils.escape(ok.id)}')">Sporcuya Dönüştür</button>
                  <button class="btn bs btn-sm" onclick="editOnKayit('${FormatUtils.escape(ok.id)}')">✏️ Düzenle</button>
                  <button class="btn bs btn-sm" onclick="markOnKayitDone('${FormatUtils.escape(ok.id)}')">İşaretlendi</button>
                  ` : ''}
                  <button class="btn bd btn-sm" onclick="delOnKayit('${FormatUtils.escape(ok.id)}')">Sil</button>
              </div>
          </div>
          `).join('')}
    </div>`;
}

window.saveGeneralSettings = async function() {
    const obj = {
        ...(AppState.data.settings || {}),
        id: AppState.data.settings?.id,
        schoolName: UIUtils.getValue('s-name'),
        bankName: UIUtils.getValue('s-bank'),
        accountName: UIUtils.getValue('s-acc'),
        iban: UIUtils.getValue('s-iban'),
        ownerPhone: UIUtils.getValue('s-phone'),
        address: UIUtils.getValue('s-address')
    };
    const result = await DB.upsert('settings', DB.mappers.fromSettings(obj));
    if (result) {
        AppState.data.settings = obj;
        toast(i18n[AppState.lang].saveSuccess, 'g');
        updateBranchUI();
    }
};


window.savePayTRSettings = async function() {
    const mid    = document.getElementById('s-paytr-mid')?.value.trim() || '';
    const active = document.getElementById('s-paytr-active')?.checked || false;
    if (active && !mid) {
        toast('PayTR aktif etmek için Merchant ID zorunludur!', 'e');
        return;
    }
    const obj = {
        ...(AppState.data.settings || {}),
        paytrActive: active,
        paytrMerchantId: mid
        // Key ve Salt Supabase Secrets'ta tutuluyor, burada işlem yok
    };
    const result = await DB.upsert('settings', DB.mappers.fromSettings(obj));
    if (result) {
        AppState.data.settings = obj;
        toast('✅ PayTR ayarları kaydedildi!', 'g');
    }
};

window.handleLogoUpload = function(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast('Dosya 2MB\'den küçük olmalıdır!', 'e'); return; }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const dataUrl = e.target.result;
        // Önizleme
        const preview = document.getElementById('logo-preview');
        if (preview) {
            preview.textContent = '';
            var img = document.createElement('img');
            img.src = dataUrl;
            img.style.cssText = 'width:100%;height:100%;object-fit:cover';
            preview.appendChild(img);
        }
        // URL alanına yaz (kaydet butonuyla DB'ye işlenecek)
        const urlInput = document.getElementById('s-logo-url');
        if (urlInput) urlInput.value = dataUrl;
        // Anlık olarak tüm ekranlarda önizle
        applyLogoEverywhere(dataUrl);
        toast('Dosya yüklendi. Kaydetmek için "Logo Kaydet" butonuna tıklayın.', 'g');
    };
    reader.readAsDataURL(file);
};

window.saveLogoSettings = async function() {
    const logoUrl = UIUtils.getValue('s-logo-url').trim();
    
    if (!AppState.data.settings) AppState.data.settings = {};
    const obj = { ...AppState.data.settings, logoUrl: logoUrl };
    
    const result = await DB.upsert('settings', DB.mappers.fromSettings(obj));
    if (result) {
        AppState.data.settings = obj;
        // localStorage'a da kaydet — giriş ekranı için
        try { localStorage.setItem('akademi_logo_url', logoUrl); } catch(e) {}
        applyLogoEverywhere(logoUrl);
        toast('Logo kaydedildi! Tüm ekranlar güncellendi.', 'g');
        go('settings');
    }
};

window.removeLogo = async function() {
    if (!AppState.data.settings) AppState.data.settings = {};
    const obj = { ...AppState.data.settings, logoUrl: '' };
    const result = await DB.upsert('settings', DB.mappers.fromSettings(obj));
    if (result) {
        AppState.data.settings = obj;
        try { localStorage.removeItem('akademi_logo_url'); } catch(e) {}
        applyLogoEverywhere('');
        toast('Logo kaldırıldı', 'g');
        go('settings');
    }
};

window.showAddAdminModal = function() {
    modal('Yeni Yönetici Ekle', `
    <div class="al al-b mb3" style="font-size:13px">
        &#x2139;&#xFE0F; Yeni yönetici <strong>aynı akademi verisini</strong> görecektir.<br>
        Yönetici e-posta adresine onay bağlantısı gönderilir.
    </div>
    <div class="fgr mb2">
        <label>Ad Soyad</label>
        <input id="aa-name" placeholder="Örn: Ahmet Yılmaz"/>
    </div>
    <div class="fgr mb2">
        <label>E-posta *</label>
        <input id="aa-em" type="email" inputmode="email" placeholder="admin@akademi.com"/>
    </div>
    <div class="fgr mb2">
        <label>Şifre * (en az 6 karakter)</label>
        <input id="aa-pass" type="password" placeholder="••••••"/>
    </div>
    <div class="al al-y" style="font-size:12px">
        &#x26A0; Bu işlem mevcut oturumunuzu kapatmaz.
    </div>
    `, [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: '➕ Yönetici Ekle', cls: 'bp', fn: async () => {
            const email = UIUtils.getValue('aa-em').toLowerCase().trim();
            const pass = UIUtils.getValue('aa-pass');
            const name = UIUtils.getValue('aa-name').trim();
            
            if (!email || !pass) {
                toast('E-posta ve şifre zorunludur!', 'e');
                return;
            }
            if (pass.length < 6) {
                toast('Şifre en az 6 karakter olmalıdır!', 'e');
                return;
            }
            
            // Mevcut oturum bilgilerini sakla
            const currentUserBackup = JSON.parse(JSON.stringify(AppState.currentUser || {}));
            const currentOrgBackup = AppState.currentOrgId;
            const currentBranchBackup = AppState.currentBranchId;
            const currentDataBackup = JSON.parse(JSON.stringify(AppState.data));
            
            try {
                const sb = getSupabase();
                if (!sb) throw new Error('Supabase bağlantısı yok');
                
                // Mevcut oturum token'larını sakla
                let savedSession = null;
                try {
                    const { data: sessData } = await sb.auth.getSession();
                    if (sessData?.session) {
                        savedSession = {
                            access_token: sessData.session.access_token,
                            refresh_token: sessData.session.refresh_token
                        };
                    }
                } catch(e) { console.warn('Session backup warning:', e); }
                
                const newUserId = generateId();
                
                // Önce users tablosuna ekle (email doğrulaması beklemeden görünür olsun)
                const insertResult = await sb.from('users').insert({
                    id: newUserId,
                    email: email,
                    name: name || email.split('@')[0],
                    pass: pass,
                    role: 'admin',
                    org_id: currentOrgBackup,
                    branch_id: currentBranchBackup
                });
                
                if (insertResult.error) {
                    // Zaten varsa güncelle
                    if (insertResult.error.code === '23505') {
                        toast('Bu e-posta zaten kayıtlı!', 'e');
                        return;
                    }
                    throw insertResult.error;
                }
                
                // signUp ile Supabase Auth'a da ekle
                let signupOk = false;
                let signupMsg = '';
                try {
                    const { data: signupData, error: signupErr } = await sb.auth.signUp({
                        email, password: pass,
                        options: {
                            data: {
                                full_name: name,
                                org_id: currentOrgBackup,
                                branch_id: currentBranchBackup,
                                role: 'admin'
                            }
                        }
                    });
                    if (signupErr) {
                        signupMsg = signupErr.message || '';
                        console.warn('Auth signUp error:', signupErr);
                    } else {
                        signupOk = true;
                    }
                } catch(signupEx) {
                    signupMsg = signupEx.message || '';
                    console.warn('Auth signUp exception:', signupEx);
                }
                
                // Oturumu geri yükle — signUp bozmuş olabilir
                if (savedSession) {
                    try {
                        await sb.auth.setSession(savedSession);
                    } catch(e) { console.warn('Session restore warning:', e); }
                }
                
                // AppState'i kesinlikle geri yükle
                AppState.currentUser = currentUserBackup;
                AppState.currentOrgId = currentOrgBackup;
                AppState.currentBranchId = currentBranchBackup;
                AppState.data = currentDataBackup;
                StorageManager.set('sporcu_app_user', currentUserBackup);
                StorageManager.set('sporcu_app_org', currentOrgBackup);
                StorageManager.set('sporcu_app_branch', currentBranchBackup);
                
                if (signupOk) {
                    toast(`✅ Yönetici eklendi! ${email} adresine onay bağlantısı gönderildi.`, 'g');
                } else {
                    toast(`✅ Yönetici veritabanına eklendi.${signupMsg ? ' Auth: ' + signupMsg : ' Supabase Dashboard\'dan auth kaydını tamamlayın.'}`, 'g');
                }
                closeModal();
                loadAndShowAdmins();
                
            } catch (e) {
                // Hata durumunda da AppState'i geri yükle
                AppState.currentUser = currentUserBackup;
                AppState.currentOrgId = currentOrgBackup;
                AppState.currentBranchId = currentBranchBackup;
                AppState.data = currentDataBackup;
                StorageManager.set('sporcu_app_user', currentUserBackup);
                StorageManager.set('sporcu_app_org', currentOrgBackup);
                StorageManager.set('sporcu_app_branch', currentBranchBackup);
                
                const msg = e.message || e.details || JSON.stringify(e);
                toast(`Hata: ${msg}`, 'e');
            }
        }}
    ]);
};

// ==================== SPORCU PORTAL ====================

window.spTab = function(tab) {
    document.querySelectorAll('.sp-tab').forEach(el => {
        el.classList.remove('on');
        const tabMap = {
            'profil': 'Profil',
            'yoklama': 'Yoklama',
            'odemeler': 'Ödemeler',
            'odeme-yap': 'Ödeme'
        };
        if (el.textContent.includes(tabMap[tab])) {
            el.classList.add('on');
        }
    });
    
    const content = document.getElementById('sp-content');
    const pages = {
        'profil': spProfil,
        'yoklama': spYoklama,
        'odemeler': spOdemeler,
        'odeme-yap': spOdemeYap
    };
    
    // Ödeme sekmelerine geçince DB'den taze payments çek
    if ((tab === 'odeme-yap' || tab === 'odemeler') && AppState.currentSporcu) {
        if (content) content.innerHTML = `<div style="text-align:center;padding:40px;color:var(--text2)">⏳ Yükleniyor...</div>`;
        refreshSporcuPayments().then(() => {
            if (content && pages[tab]) content.innerHTML = pages[tab]();
        });
        return;
    }
    
    if (content && pages[tab]) content.innerHTML = pages[tab]();
};

// Sporcu için payments tablosundan taze veri çek (branch_id veya org_id ile)
async function refreshSporcuPayments() {
    try {
        const sb = getSupabase();
        if (!sb) return;
        const bid = AppState.currentBranchId;
        const oid = AppState.currentOrgId;
        
        let q = sb.from('payments').select('*');
        if (bid) q = q.eq('branch_id', bid);
        else if (oid) q = q.eq('org_id', oid);
        else return;
        
        const { data, error } = await q;
        if (error) { console.warn('refreshSporcuPayments error:', error); return; }
        if (data) {
            AppState.data.payments = data.map(DB.mappers.toPayment);
        }
    } catch(e) {
        console.warn('refreshSporcuPayments exception:', e);
    }
}

function spProfil() {
    const a = AppState.currentSporcu;
    if (!a) return '';
    
    const initials = FormatUtils.initials(a.fn, a.ln);
    const age = DateUtils.age(a.bd);
    const attStats = getAttendanceStats(a.id);
    const payStats = getPaymentStats(a.id);
    const cls = AppState.data.classes.find(c => c.id === a.clsId);
    const coach = cls ? AppState.data.coaches.find(c => c.id === cls.coachId) : null;
    
    return `
    <div class="profile-container">
        <div class="profile-header">
            <div class="profile-header-content">
                <div class="profile-avatar">${initials}</div>
                <div class="profile-info">
                    <div class="profile-name">${FormatUtils.escape(`${a.fn} ${a.ln}`)}</div>
                    <div class="profile-meta">
                        <span class="profile-meta-item">&#x1F4BC; ${FormatUtils.escape(a.sp)}</span>
                        <span class="profile-meta-item">&#x1F3EB; ${FormatUtils.escape(cls ? cls.name : 'Sınıfsız')}</span>
                        <span class="profile-meta-item">&#x1F4C5; ${age} yaş</span>
                        <span class="profile-meta-item"><span class="badge ${a.st === 'active' ? 'badge-green' : 'badge-red'}">${statusLabel(a.st)}</span></span>
                    </div>
                </div>
                <div class="stats-grid" style="min-width:200px">
                    <div class="stat-box">
                        <div class="stat-box-value tb">${attStats.rate}%</div>
                        <div class="stat-box-label">Devam</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-box-value tg">${FormatUtils.currency(payStats.totalPaid)}</div>
                        <div class="stat-box-label">Ödenen</div>
                    </div>
                    <div class="stat-box">
                        <div class="stat-box-value ${payStats.totalDebt > 0 ? 'tr2' : 'tg'}">${FormatUtils.currency(payStats.totalDebt)}</div>
                        <div class="stat-box-label">Borç</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="profile-grid">
            <div class="profile-sidebar">
                <div class="info-card">
                    <div class="info-card-title">&#x1F4E7; İletişim Bilgilerim</div>
                    <div class="info-row">
                        <span class="info-label">Telefon</span>
                        <span class="info-value">${FormatUtils.escape(a.ph || '-')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">E-posta</span>
                        <span class="info-value">${FormatUtils.escape(a.em || '-')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Adres</span>
                        <span class="info-value">${FormatUtils.escape(a.address || '-')}</span>
                    </div>
                </div>
                
                <div class="info-card">
                    <div class="info-card-title">&#x1F46A; Veli Bilgileri</div>
                    <div class="info-row">
                        <span class="info-label">Veli Adı</span>
                        <span class="info-value">${FormatUtils.escape(a.pn || '-')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Veli Telefon</span>
                        <span class="info-value">${FormatUtils.escape(a.pph || '-')}</span>
                    </div>
                </div>
                
                <div class="info-card">
                    <div class="info-card-title">&#x2695; Sağlık Bilgilerim</div>
                    <div class="info-row">
                        <span class="info-label">Kan Grubu</span>
                        <span class="info-value">${FormatUtils.escape(a.blood || '-')}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Boy / Kilo</span>
                        <span class="info-value">${a.height ? a.height + ' cm' : '-'} / ${a.weight ? a.weight + ' kg' : '-'}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Acil Durum</span>
                        <span class="info-value">${FormatUtils.escape(a.emergency || '-')}</span>
                    </div>
                </div>
            </div>
            
            <div class="profile-main">
                <div class="info-card">
                    <div class="info-card-title">&#x26BD; Antrenman Bilgilerim</div>
                    <div class="g21">
                        <div class="info-row">
                            <span class="info-label">Antrenörüm</span>
                            <span class="info-value">${FormatUtils.escape(coach ? `${coach.fn} ${coach.ln}` : '-')}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Sınıfım</span>
                            <span class="info-value">${FormatUtils.escape(cls ? cls.name : '-')}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Lisans No</span>
                            <span class="info-value">${FormatUtils.escape(a.lic || '-')}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Kayıt Tarihi</span>
                            <span class="info-value">${DateUtils.format(a.rd)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="info-card">
                    <div class="info-card-title">&#x1F4B3; Finansal Bilgilerim</div>
                    <div class="g21">
                        <div class="info-row">
                            <span class="info-label">Aylık Ücret</span>
                            <span class="info-value tb">${FormatUtils.currency(a.fee)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Sonraki Ödeme</span>
                            <span class="info-value">${a.vd ? DateUtils.format(a.vd) : '-'}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Toplam Ödenen</span>
                            <span class="info-value tg">${FormatUtils.currency(payStats.totalPaid)}</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Kalan Borç</span>
                            <span class="info-value ${payStats.totalDebt > 0 ? 'tr2' : 'tg'}">${FormatUtils.currency(payStats.totalDebt)}</span>
                        </div>
                    </div>
                </div>
                
                <div class="info-card">
                    <div class="info-card-title">&#x1F4C8; Son Aktivitelerim</div>
                    ${generateActivityTimeline(a.id)}
                </div>
            </div>
        </div>
    </div>`;
}

function spYoklama() {
    const a = AppState.currentSporcu;
    if (!a) return '';
    
    const attStats = getAttendanceStats(a.id);
    const dates = Object.keys(AppState.data.attendance)
        .filter(d => AppState.data.attendance[d] && AppState.data.attendance[d][a.id])
        .sort()
        .reverse();
    
    return `
    <div class="card">
        <div class="flex fjb fca mb3">
            <div>
                <div class="tw6 tsm mb1">Devam Oranı</div>
                <div class="flex gap2">
                    <span class="badge badge-green">${attStats.present} Var</span>
                    <span class="badge badge-red">${attStats.absent} Yok</span>
                    <span class="badge badge-yellow">${attStats.excused} İzinli</span>
                </div>
            </div>
            <div class="progress-ring">
                <svg width="120" height="120">
                    <circle class="progress-ring-bg" cx="60" cy="60" r="52"/>
                    <circle class="progress-ring-fill" cx="60" cy="60" r="52" 
                            stroke-dasharray="${attStats.rate * 3.27} 327"/>
                </svg>
                <div class="progress-text">${attStats.rate}%</div>
            </div>
        </div>
        <div class="dv"></div>
        <div class="tw6 tsm mb2">Son Yoklamalar</div>
        ${dates.length === 0 ? '<p class="tm">Henüz yoklama kaydı bulunmuyor.</p>' : 
          dates.slice(0, 30).map(d => {
              const st = AppState.data.attendance[d][a.id];
              return `
              <div class="att-row">
                  <span class="tm">${DateUtils.format(d)}</span>
                  <span class="badge ${st === 'P' ? 'badge-green' : st === 'A' ? 'badge-red' : 'badge-yellow'}">
                      ${st === 'P' ? 'Var' : st === 'A' ? 'Yok' : 'İzinli'}
                  </span>
              </div>`;
          }).join('')}
    </div>`;
}

function spOdemeler() {
    const a = AppState.currentSporcu;
    if (!a) return '';

    // Tamamlanmış (onaylanmış) ödemeler
    const completed = AppState.data.payments
        .filter(p => p.aid === a.id && p.st === 'completed')
        .sort((x, y) => new Date(y.dt) - new Date(x.dt));

    // Sporcu tarafından bildirilmiş, henüz yönetici onaylamadığı bildirimler
    const pending = AppState.data.payments
        .filter(p => p.aid === a.id && p.notifStatus === 'pending_approval')
        .sort((x, y) => new Date(y.dt) - new Date(x.dt));

    // Yönetici tarafından oluşturulan bekleyen/gecikmiş planlar (borç özeti)
    const pendingPlans = AppState.data.payments
        .filter(p => p.aid === a.id && p.source === 'plan' && p.st !== 'completed')
        .sort((x, y) => x.dt.localeCompare(y.dt));

    const totalPaid  = completed.reduce((s, p) => s + (p.amt || 0), 0);
    const totalDebt  = pendingPlans.reduce((s, p) => s + (p.amt || 0), 0);

    const mIcon  = m => ({ nakit:'💵', kredi_karti:'💳', havale:'🏦', paytr:'🔵' }[m] || '💰');
    const mLabel = m => ({ nakit:'Nakit', kredi_karti:'Kredi Kartı', havale:'Havale/EFT', paytr:'PayTR Online' }[m] || (m || 'Ödeme'));

    return `
    <div class="sp-stats-row mb3">
        <div class="stat-box">
            <div class="stat-box-value tg">${FormatUtils.currency(totalPaid)}</div>
            <div class="stat-box-label">Toplam Ödenen</div>
        </div>
        <div class="stat-box">
            <div class="stat-box-value ${totalDebt > 0 ? 'tr2' : 'tg'}">${FormatUtils.currency(totalDebt)}</div>
            <div class="stat-box-label">Toplam Borç</div>
        </div>
        <div class="stat-box">
            <div class="stat-box-value ${pending.length > 0 ? 'to' : 'tg'}">${pending.length}</div>
            <div class="stat-box-label">Onay Bekleyen</div>
        </div>
    </div>

    ${pendingPlans.length > 0 ? `
    <div class="card mb3" style="border-left:3px solid var(--red)">
        <div class="flex fjb fca mb2">
            <div class="tw6 ts" style="color:var(--red)">📋 Bekleyen Ödeme Planlarım (${pendingPlans.length})</div>
            <button class="btn bp btn-sm" onclick="spTab('odeme-yap')">Ödeme Yap →</button>
        </div>
        ${pendingPlans.map(p => {
            const isLate = p.st === 'overdue' || (p.dt && p.dt < DateUtils.today());
            return `
            <div class="payment-card" style="gap:10px;border-color:${isLate ? 'rgba(239,68,68,.35)' : 'rgba(234,179,8,.35)'}">
                <div style="font-size:22px;flex-shrink:0">${isLate ? '⚠️' : '📅'}</div>
                <div class="payment-info">
                    <div class="payment-amount" style="font-size:15px;color:${isLate ? 'var(--red)' : 'var(--yellow)'}">${FormatUtils.currency(p.amt)}</div>
                    <div class="payment-date">${FormatUtils.escape(p.ds || p.serviceName || 'Aidat')} • Vade: ${DateUtils.format(p.dt)}</div>
                </div>
                <span class="bg ${isLate ? 'bg-r' : 'bg-y'}" style="flex-shrink:0;white-space:nowrap">${isLate ? 'Gecikmiş' : 'Bekliyor'}</span>
            </div>`; }).join('')}
    </div>` : ''}

    ${pending.length > 0 ? `
    <div class="card mb3" style="border-left:3px solid var(--yellow)">
        <div class="tw6 ts mb2" style="color:var(--yellow)">⏳ Onay Bekleyen Bildirimlerim</div>
        ${pending.map(p => `
        <div class="payment-card" style="border-color:rgba(234,179,8,.35);gap:10px">
            <div style="font-size:24px;flex-shrink:0">${mIcon(p.payMethod)}</div>
            <div class="payment-info">
                <div class="payment-amount" style="font-size:16px;color:var(--yellow)">${FormatUtils.currency(p.amt)}</div>
                <div class="payment-date">${mLabel(p.payMethod)} • ${DateUtils.format(p.dt)}</div>
                <div class="ts tm mt1">${FormatUtils.escape(p.ds || p.serviceName || 'Aidat')}</div>
            </div>
            <span class="bg bg-y" style="flex-shrink:0;white-space:nowrap">Bekliyor</span>
        </div>`).join('')}
    </div>` : ''}

    <div class="card">
        <div class="tw6 tsm mb3">✅ Ödeme Geçmişim</div>
        ${completed.length === 0
            ? `<div style="text-align:center;padding:32px 16px">
                <div style="font-size:44px;margin-bottom:10px">📭</div>
                <div class="tw6 ts mb1">Henüz onaylanmış ödeme yok</div>
                <div class="ts tm">Ödeme yapıp bildirim gönderdiğinizde yönetici onayının ardından burada görünür.</div>
               </div>`
            : completed.map(p => `
        <div class="payment-card" style="gap:12px">
            <div style="font-size:28px;flex-shrink:0">${mIcon(p.payMethod)}</div>
            <div class="payment-info" style="flex:1;min-width:0">
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px">
                    <span class="payment-amount tg" style="font-size:16px">${FormatUtils.currency(p.amt)}</span>
                    ${p.payMethod === 'kredi_karti' && p.slipCode
                        ? `<span style="background:rgba(59,130,246,.12);color:var(--blue2);border-radius:6px;padding:2px 8px;font-size:11px;font-weight:700;font-family:monospace;letter-spacing:1px">📋 Slip: ${FormatUtils.escape(p.slipCode)}</span>`
                        : ''}
                </div>
                <div class="payment-date">${DateUtils.format(p.dt)} • ${FormatUtils.escape(p.serviceName || p.ds || 'Aidat')}</div>
                <div class="ts tm" style="margin-top:2px">${mLabel(p.payMethod)}</div>
            </div>
            <span class="bg bg-g" style="flex-shrink:0;white-space:nowrap">Ödendi ✓</span>
        </div>`).join('')}
    </div>`;
}

function spOdemeYap() {
    const s = AppState.data.settings;
    const a = AppState.currentSporcu;
    if (!a) return '';
    const hasPayTR = s?.paytrActive && s?.paytrMerchantId;
    const hasBank  = s?.iban || s?.bankName;

    // Bu sporcuya ait ödeme planları — sadece bekleyen/gecikmiş
    const myPlans = (AppState.data.payments || [])
        .filter(p => p.aid === a.id && p.source === 'plan' && p.st !== 'completed')
        .sort((x, y) => x.dt.localeCompare(y.dt));

    // Toplam borç (planlar)
    const totalDebt = myPlans.reduce((s, p) => s + (p.amt || 0), 0);

    // Feature 3: Checkbox plan rows for multi-select
    const planRows = myPlans.length > 0
        ? myPlans.map(p => {
            const isOverdue = p.st === 'overdue';
            const today = DateUtils.today();
            const isLate  = !isOverdue && p.dt && p.dt < today;
            const badge = isOverdue || isLate
                ? `<span class="bg bg-r">Gecikmiş</span>`
                : `<span class="bg bg-y">Bekliyor</span>`;
            return `
            <div class="sp-plan-cb-row" onclick="var cb=this.querySelector('.sp-plan-cb');cb.checked=!cb.checked;this.classList.toggle('checked',cb.checked);_spUpdateBulkTotal()">
                <input type="checkbox" class="sp-plan-cb" value="${FormatUtils.escape(p.id)}" data-amt="${p.amt||0}" onclick="event.stopPropagation();this.parentElement.classList.toggle('checked',this.checked);_spUpdateBulkTotal()"/>
                <div style="flex:1;min-width:0">
                    <div class="tw6 ts">${isOverdue || isLate ? '⚠️ ' : '📅 '}${FormatUtils.escape(p.ds || p.serviceName || 'Aidat')}</div>
                    <div class="ts tm mt1">Vade: ${DateUtils.format(p.dt)}</div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                    <div class="tw6 ts tg">${FormatUtils.currency(p.amt)}</div>
                    ${badge}
                </div>
            </div>`;
        }).join('')
        : `<div class="empty-state">
            <div style="font-size:48px;margin-bottom:12px">✅</div>
            <div class="tw6 ts mb1">Bekleyen ödeme planı yok</div>
            <div class="ts tm">Tüm ödemeleriniz tamamlanmış!</div>
           </div>`;

    const debtBar = myPlans.length > 0 ? `
    <div class="sp-debt-bar mb3">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span class="ts tm">Toplam Bekleyen Borç</span>
            <span class="tw6 tr2">${FormatUtils.currency(totalDebt)}</span>
        </div>
        <div class="prb"><div style="height:100%;background:var(--red);border-radius:4px;width:100%"></div></div>
    </div>` : '';

    const bulkControls = myPlans.length > 0 ? `
    <div class="flex fjb fca gap2 mb2">
        <button type="button" class="btn btn-xs bs" onclick="selectAllSpPlans()">✅ Tümünü Seç</button>
        <div id="sp-bulk-total" class="sp-bulk-total" style="display:none">
            <span class="ts tm">Seçilen toplam:</span>
            <span class="tw6 tg" id="sp-bulk-total-val">₺0</span>
        </div>
    </div>
    <button class="btn bp w100 mb3" id="sp-bulk-pay-btn" style="display:none" onclick="spPayBulk()">💳 Seçilenleri Öde</button>` : '';

    return `
    <div class="card mb3">
        <div class="sp-athlete-header mb3">
            <div class="profile-avatar" style="width:48px;height:48px;font-size:18px;flex-shrink:0">${FormatUtils.initials(a.fn, a.ln)}</div>
            <div>
                <div class="tw6">${FormatUtils.escape(`${a.fn} ${a.ln}`)}</div>
                <div class="ts tm">Aylık Ücret: <strong>${FormatUtils.currency(a.fee)}</strong></div>
            </div>
        </div>
        ${debtBar}
        <div class="tw6 ts mb2">📋 Ödeme Planlarım (${myPlans.length})</div>
        ${bulkControls}
        <div class="plan-list" style="gap:8px">${planRows}</div>
    </div>

    <div class="card" id="sp-pay-form" style="display:none">
        <div class="sp-pay-form-header mb3">
            <div class="tw6 tsm">💳 Ödeme Yöntemi Seç</div>
            <button class="btn bs btn-sm" onclick="document.getElementById('sp-pay-form').style.display='none'">✕ Kapat</button>
        </div>
        <div id="sp-plan-info" class="sp-plan-info-box mb3"></div>
        <div class="pay-choice-grid mb3">
            ${hasPayTR ? `<div class="pay-choice-card" id="pc-paytr" onclick="selectPayChoice('paytr')">
                <div class="pay-choice-icon">🔵</div>
                <div class="pay-choice-title">Online Kredi Kartı</div>
                <div class="pay-choice-desc">PayTR güvenli altyapısı ile kartla ödeyin</div>
            </div>` : ''}
            ${!hasPayTR ? `<div class="al al-y" style="grid-column:1/-1;border-radius:10px;padding:14px">
                <div class="tw6 mb1">⚠️ Ödeme yöntemi bulunamadı</div>
                <p class="ts tm">Yönetici henüz ödeme yöntemlerini yapılandırmamış. Lütfen akademi yönetimine başvurun.</p>
            </div>` : ''}
        </div>
        <div id="pay-method-detail" class="mb2"></div>
        <div class="fgr mb2 dn" id="sp-desc-wrapper">
            <label>Açıklama <span class="tm ts">(opsiyonel)</span></label>
            <input id="sp-desc" placeholder="Ödeme notu ekleyin..."/>
        </div>
        <button class="btn bp w100 mt2" id="pay-submit-btn" style="display:none" onclick="submitSpPayment()">Bildirim Gönder</button>
    </div>`;
}

window.spPayPlan = function(planId) {
    AppState.ui.activePlanId = planId;
    AppState.ui.selectedPayMethod = null;
    const p = AppState.data.payments.find(x => x.id === planId);
    if (!p) return;
    const form = document.getElementById('sp-pay-form');
    const info = document.getElementById('sp-plan-info');
    const descInput = document.getElementById('sp-desc');
    const submitBtn = document.getElementById('pay-submit-btn');
    const detail = document.getElementById('pay-method-detail');
    if (form) form.style.display = 'block';
    if (info) info.innerHTML = `<strong>${FormatUtils.escape(p.ds||p.serviceName||'Aidat')}</strong> — <span class="tg tw6">${FormatUtils.currency(p.amt)}</span>`;
    if (descInput) descInput.value = p.ds || p.serviceName || 'Aidat ödemesi';
    // Önceki seçimi temizle
    if (detail) detail.innerHTML = '';
    if (submitBtn) submitBtn.style.display = 'none';
    const descWrapper = document.getElementById('sp-desc-wrapper');
    if (descWrapper) descWrapper.classList.add('dn');
    document.querySelectorAll('.pay-choice-card').forEach(c => c.classList.remove('active'));
    form?.scrollIntoView({ behavior: 'smooth' });
};

// Feature 3: Bulk total calculation
window._spUpdateBulkTotal = function() {
    const checked = document.querySelectorAll('.sp-plan-cb:checked');
    const totalEl = document.getElementById('sp-bulk-total');
    const totalVal = document.getElementById('sp-bulk-total-val');
    const payBtn = document.getElementById('sp-bulk-pay-btn');
    const total = Array.from(checked).reduce((s, cb) => s + parseFloat(cb.dataset.amt || 0), 0);
    if (totalEl) totalEl.style.display = checked.length > 0 ? 'flex' : 'none';
    if (totalVal) totalVal.textContent = FormatUtils.currency(total);
    if (payBtn) payBtn.style.display = checked.length > 0 ? 'block' : 'none';
};

// Feature 3: Initiate bulk payment for selected plans
window.spPayBulk = function() {
    const checked = Array.from(document.querySelectorAll('.sp-plan-cb:checked'));
    if (checked.length === 0) { toast('Ödeme yapmak istediğiniz ayları seçiniz!', 'e'); return; }
    const planIds = checked.map(cb => cb.value);
    const totalAmt = checked.reduce((s, cb) => s + parseFloat(cb.dataset.amt || 0), 0);
    // Store selected plan IDs
    AppState.ui.activePlanIds = planIds;
    AppState.ui.activePlanId = planIds.length === 1 ? planIds[0] : null;
    AppState.ui.selectedPayMethod = null;
    const form = document.getElementById('sp-pay-form');
    const info = document.getElementById('sp-plan-info');
    const descInput = document.getElementById('sp-desc');
    const submitBtn = document.getElementById('pay-submit-btn');
    const detail = document.getElementById('pay-method-detail');
    if (form) form.style.display = 'block';
    if (info) info.innerHTML = `<strong>${checked.length} ay seçildi</strong> — <span class="tg tw6">${FormatUtils.currency(totalAmt)}</span>`;
    if (descInput) descInput.value = `${checked.length} aylık toplu ödeme`;
    if (detail) detail.innerHTML = '';
    if (submitBtn) submitBtn.style.display = 'none';
    const descWrapper = document.getElementById('sp-desc-wrapper');
    if (descWrapper) descWrapper.classList.add('dn');
    document.querySelectorAll('.pay-choice-card').forEach(c => c.classList.remove('active'));
    form?.scrollIntoView({ behavior: 'smooth' });
};

window.selectPayMethod = function(method) {
    document.querySelectorAll('.pay-method-btn').forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById('pm-' + method);
    if (activeBtn) activeBtn.classList.add('active');

    AppState.ui.selectedPayMethod = method;
    const detail    = document.getElementById('pay-method-detail');
    const submitBtn = document.getElementById('pay-submit-btn');
    const s = AppState.data.settings;

    if (method === 'paytr') {
        detail.innerHTML = `
        <div class="al al-b" style="border-radius:10px;padding:14px;margin-bottom:12px">
            <div class="tw6 mb1">🔵 PayTR ile Online Ödeme</div>
            <p class="ts tm">Güvenli ödeme sayfasına yönlendirileceksiniz.</p>
        </div>`;
        submitBtn.textContent = '🔵 PayTR ile Ödemeye Geç';
        submitBtn.style.display = 'block';
    }
};

window.selectPayChoice = function(choice) {
    document.querySelectorAll('.pay-choice-card').forEach(c => c.classList.remove('active'));
    const activeCard = document.getElementById('pc-' + choice);
    if (activeCard) activeCard.classList.add('active');

    const detail    = document.getElementById('pay-method-detail');
    const submitBtn = document.getElementById('pay-submit-btn');
    const descWrapper = document.getElementById('sp-desc-wrapper');
    const s = AppState.data.settings;

    AppState.ui.selectedPayMethod = choice;

    if (choice === 'paytr') {
        detail.innerHTML = `
        <div class="al al-b" style="border-radius:10px;padding:14px;margin-bottom:12px">
            <div class="tw6 mb1">🔵 PayTR ile Online Ödeme</div>
            <p class="ts tm">Güvenli ödeme sayfasına yönlendirileceksiniz. 256-bit SSL ile korunan ödeme altyapısı.</p>
        </div>`;
        submitBtn.textContent = '🔵 PayTR ile Ödemeye Geç';
        submitBtn.style.display = 'block';
        if (descWrapper) descWrapper.classList.remove('dn');
    }
};

window.submitSpPayment = async function() {
    const desc = UIUtils.getValue('sp-desc');
    const method = AppState.ui.selectedPayMethod;
    const a = AppState.currentSporcu;
    const planId = AppState.ui.activePlanId;
    const planIds = AppState.ui.activePlanIds || (planId ? [planId] : []);

    if (!method) { toast('Lütfen ödeme yöntemi seçiniz!', 'e'); return; }
    if (!AppState.currentOrgId || !AppState.currentBranchId) {
        toast('Organizasyon bilgileri eksik. Lütfen çıkış yapıp tekrar giriş yapınız.', 'e');
        return;
    }

    // Collect plans
    const plans = planIds.map(id => AppState.data.payments.find(p => p.id === id)).filter(Boolean);
    const totalAmt = plans.length > 0 ? plans.reduce((s, p) => s + (p.amt || 0), 0) : (a.fee || 0);
    if (!totalAmt || totalAmt <= 0) { toast('Ödenecek tutar bulunamadı!', 'e'); return; }

    if (method === 'paytr') {
        await initiatePayTRPayment(totalAmt, desc);
        return;
    }

    const sb = getSupabase();
    if (!sb) { toast('Bağlantı hatası.', 'e'); return; }

    try {
        // Create a payment notification for each plan
        for (const plan of (plans.length > 0 ? plans : [null])) {
            const amt = plan ? plan.amt : totalAmt;
            const payObj = {
                id: generateId(),
                aid: a.id,
                an: `${a.fn} ${a.ln}`,
                amt,
                ds: desc || plan?.ds || 'Veli bildirimi',
                st: 'pending',
                dt: plan?.dt || DateUtils.today(),
                ty: 'income',
                serviceName: desc || plan?.ds || 'Veli bildirimi',
                source: 'parent_notification',
                notifStatus: 'pending_approval',
                payMethod: method
            };
            const { error } = await sb.from('payments').insert(DB.mappers.fromPayment(payObj));
            if (error) throw error;
            AppState.data.payments.push(payObj);
        }
        const methodLabels = { nakit: 'Nakit', kredi_karti: 'Kredi Kartı', havale: 'Havale/EFT', paytr: 'PayTR Online' };
        const methodLabel = methodLabels[method] || 'Ödeme';
        const count = plans.length > 1 ? ` (${plans.length} ay)` : '';
        toast(`✅ ${methodLabel} ödeme bildiriminiz alındı${count}! Yönetici onaylayacak.`, 'g');
        AppState.ui.activePlanId = null;
        AppState.ui.activePlanIds = null;
        const spPayForm = document.getElementById('sp-pay-form');
        if (spPayForm) spPayForm.style.display = 'none';
        spTab('odemeler');
    } catch(e) {
        toast('Bildirim gönderilemedi: ' + (e.message || e), 'e');
    }
};

// ============================================================
// PAYTR ENTEGRASYONu
// ============================================================
// ÖNEMLİ: PayTR token hash sunucu tarafında hesaplanmalıdır.
// Bu frontend kodu PayTR iframe'i açar, webhook Supabase Edge Function ile alınır.

async function initiatePayTRPayment(amt, desc) {
    const s = AppState.data.settings;
    const a = AppState.currentSporcu;
    
    if (!s?.paytrActive || !s?.paytrMerchantId) {
        toast('PayTR ayarları yapılandırılmamış. Yöneticiye başvurun.', 'e');
        return;
    }

    if (!AppState.currentOrgId || !AppState.currentBranchId) {
        toast('Organizasyon bilgileri eksik. Lütfen çıkış yapıp tekrar giriş yapınız.', 'e');
        return;
    }

    const sb = getSupabase();
    if (!sb) { toast('Bağlantı hatası', 'e'); return; }

    UIUtils.setLoading(true);
    try {
        // DB id: UUID (payments tablosu UUID primary key kullanır)
        const dbId = generateId();
        // PayTR merchant_oid: tireler kaldırılmış UUID (PayTR sadece alfanumerik kabul eder)
        const orderId = dbId.replace(/-/g, '');
        const amtKurus = Math.round(amt * 100); // PayTR kuruş cinsinden ister

        // user_basket: PayTR TL cinsinden fiyat bekler (örn: "250.00")
        // btoa() Latin-1 destekler; TextEncoder ile UTF-8 güvenliği sağlanır
        const basketDesc = (desc || 'Aidat').replace(/[^\x00-\x7F]/g, ch => {
            const m = {'ç':'c','Ç':'C','ğ':'g','Ğ':'G','ı':'i','İ':'I','ö':'o','Ö':'O','ş':'s','Ş':'S','ü':'u','Ü':'U'};
            return m[ch] || '';
        });
        const basketArr = [[basketDesc, amt.toFixed(2), 1]]; // TL cinsinden
        const basketBytes = new TextEncoder().encode(JSON.stringify(basketArr));
        const basketBin = Array.from(basketBytes).map(b => String.fromCharCode(b)).join('');
        const user_basket = btoa(basketBin);

        // Supabase edge function çağrısı (backend token hesaplar)
        const { data: tokenData, error } = await sb.functions.invoke('paytr-token', {
            body: {
                // merchant_key ve merchant_salt edge function içinde Supabase Secrets'tan okunuyor
                merchant_oid: orderId,
                email: a.em && !a.em.endsWith('.local') ? a.em : 'musteri@dragosakademi.com',
                payment_amount: String(amtKurus), // PayTR kuruş cinsinden string bekliyor
                user_name: (`${a.fn} ${a.ln}`).substring(0, 60),
                user_address: 'Turkiye',
                user_phone: a.pph || a.ph || '05000000000',
                merchant_ok_url: window.location.origin + '/paytr-ok.html?oid=' + orderId,
                merchant_fail_url: window.location.origin + '/paytr-fail.html?oid=' + orderId,
                user_basket: user_basket,
                currency: 'TL',
                test_mode: '0',
                org_id: AppState.currentOrgId,
                branch_id: AppState.currentBranchId,
                athlete_id: a.id,
                athlete_name: `${a.fn} ${a.ln}`
            }
        });

        if (error || !tokenData?.token) {
            const errMsg = tokenData?.error || error?.message || 'Ödeme başlatılamadı. Lütfen tekrar deneyin.';
            console.error('PayTR edge function hatası:', errMsg);
            throw new Error(errMsg);
        }

        // Bekleyen ödeme kaydı oluştur (webhook onaylayacak)
        const pendingPay = {
            id: dbId,   // DB'ye UUID ile kaydet
            aid: a.id,
            an: `${a.fn} ${a.ln}`,
            amt: amt,
            ds: desc || 'PayTR Ödemesi',
            st: 'pending',
            dt: DateUtils.today(),
            ty: 'income',
            serviceName: desc || 'PayTR Ödemesi',
            source: 'paytr',
            notifStatus: '',
            payMethod: 'paytr',
            orgId: AppState.currentOrgId,
            branchId: AppState.currentBranchId
        };
        const { error: insertErr } = await sb.from('payments').insert(DB.mappers.fromPayment(pendingPay));
        if (insertErr) throw insertErr;
        AppState.data.payments.push(pendingPay);

        // PayTR iframe aç
        showPayTRModal(tokenData.token, orderId);

    } catch(e) {
        console.error('PayTR error:', e.message);
        toast('PayTR hatası: ' + e.message, 'e');
    } finally {
        UIUtils.setLoading(false);
    }
}

function showPayTRModal(token, orderId) {
    const iframeUrl = `https://www.paytr.com/odeme/guvenli/${token}`;
    modal('💳 Güvenli Ödeme — PayTR', `
    <div style="text-align:center;margin-bottom:12px;font-size:13px;color:var(--text2)">
        256-bit SSL ile korunan güvenli ödeme sayfası
    </div>
    <iframe src="${iframeUrl}" 
        id="paytr-iframe"
        style="width:100%;height:500px;border:none;border-radius:10px" 
        allowfullscreen>
    </iframe>
    <div style="text-align:center;margin-top:12px;font-size:11px;color:var(--text3)">
        Sipariş No: ${orderId} • Ödeme tamamlandığında otomatik kayıt yapılır.
    </div>
    `, [{ lbl: 'Kapat', cls: 'bs', fn: () => { closeModal(); spTab('odemeler'); } }]);

    // paytr-ok.html / paytr-fail.html sayfalarından postMessage dinle (iframe mod)
    function _paytrMsgHandler(e) {
        if (e.origin !== window.location.origin) return;
        if (!e.data || e.data.source !== 'paytr_cb') return;
        window.removeEventListener('message', _paytrMsgHandler);
        closeModal();
        handlePayTRCallback(e.data.oid || orderId, e.data.status === 'ok' ? 'success' : 'fail');
    }
    window.addEventListener('message', _paytrMsgHandler);
}

// PayTR webhook — Supabase Edge Function'dan çağrılır
// Bu fonksiyon doğrudan frontend'den çağrılmaz ama DB güncellemesi için yardımcı
window.handlePayTRCallback = async function(orderId, status) {
    const sb = getSupabase();
    if (!sb || !orderId) return;
    // DB güncellemesi paytr-webhook edge function tarafından yapılır (service_role).
    // Sporcu anon role olduğundan payments UPDATE yetkisi yoktur.
    // Sadece AppState'i güncelle ve DB'den güncel veriyi çek.
    if (status === 'success') {
        const idx = AppState.data.payments.findIndex(p => p.id === orderId);
        if (idx >= 0) { AppState.data.payments[idx].st = 'completed'; AppState.data.payments[idx].notifStatus = 'approved'; }
        toast('✅ PayTR ödemesi tamamlandı! Yönetici onayı bekleniyor.', 'g');
    } else {
        const idx = AppState.data.payments.findIndex(p => p.id === orderId);
        if (idx >= 0) AppState.data.payments[idx].st = 'failed';
        toast('❌ Ödeme başarısız. Lütfen tekrar deneyin.', 'e');
    }
    spTab('odemeler');
};

// URL'de PayTR dönüşü varsa işle
// NOT: 3D Secure akışında sayfa yeniden yüklenir, kullanıcı henüz giriş yapmamış olabilir.
// Bu nedenle callback'i direkt çağırmak yerine localStorage'a kaydediyoruz.
// Kullanıcı giriş yaptıktan sonra Security.js'deki kontrol bunu işleyecek.
(function checkPayTRReturn() {
    const params = new URLSearchParams(window.location.search);
    const paytrStatus = params.get('paytr');
    const orderId = params.get('oid') || params.get('merchant_oid');
    if (paytrStatus && orderId) {
        // URL'i hemen temizle (kullanıcı görmesın, yenileme yapmasın)
        window.history.replaceState({}, '', window.location.pathname);
        // localStorage'a kaydet — login sonrası işlenecek
        try {
            localStorage.setItem('_paytr_pending_cb', JSON.stringify({
                status: paytrStatus,
                oid: orderId,
                ts: Date.now()
            }));
        } catch(e) {}
    }
})();

window.loadAndShowAdmins = async function() {
    const area = document.getElementById('admin-list-area');
    if (!area) return;
    area.innerHTML = '<div class="tm ts">Yükleniyor...</div>';
    
    try {
        const sb = getSupabase();
        if (!sb) throw new Error('Bağlantı yok');
        
        const { data, error } = await sb.from('users')
            .select('id, name, email, role')
            .eq('org_id', AppState.currentOrgId);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            area.innerHTML = '<div class="ts tm">Kayıtlı yönetici bulunamadı.</div>';
            return;
        }
        
        area.innerHTML = data.map(u => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--bg3);border-radius:8px;margin-bottom:6px;border:1px solid var(--border)">
            <div>
                <div class="tw6 tsm">${FormatUtils.escape(u.name || u.email)}</div>
                <div class="ts tm">${FormatUtils.escape(u.email)} • <span class="bg ${u.role === 'admin' ? 'bg-b' : 'bg-g'}">${u.role === 'admin' ? 'Yönetici' : 'Antrenör'}</span></div>
            </div>
            ${u.id !== AppState.currentUser?.id ? `<button class="btn btn-xs bd" onclick="removeAdmin('${FormatUtils.escape(u.id)}','${FormatUtils.escape(u.email)}')">Sil</button>` : '<span class="ts tm">(Siz)</span>'}
        </div>`).join('');
    } catch(e) {
        area.innerHTML = `<div class="al al-r ts">Yüklenemedi: ${FormatUtils.escape(e.message)}</div>`;
    }
};

window.removeAdmin = function(uid, email) {
    confirm2('Yönetici Sil', `${email} adlı yöneticiyi silmek istediğinize emin misiniz?`, async () => {
        try {
            const sb = getSupabase();
            if (!sb) throw new Error('Bağlantı yok');
            const { error } = await sb.from('users').delete().eq('id', uid);
            if (error) { console.error('removeAdmin DB error:', error.message); throw new Error('Yönetici silinemedi.'); }
            toast('Yönetici silindi.', 'g');
            loadAndShowAdmins();
        } catch(e) {
            toast('Silinemedi: ' + e.message, 'e');
        }
    });
};

// ── Aktif Oturum Yönetimi (Admin Settings) ───────────────────────────────

window.loadAndShowSessions = async function() {
    const area = document.getElementById('sessions-list-area');
    if (!area) return;
    area.innerHTML = '<div class="tm ts">Yükleniyor...</div>';
    try {
        const sessions = await SessionManager.list();
        if (!sessions.length) {
            area.innerHTML = '<div class="tm ts" style="color:var(--text2)">Aktif oturum yok.</div>';
            return;
        }
        const now = Date.now();
        const rows = sessions.map(s => {
            const isSelf = s.id === SessionManager._id;
            const lastMs = now - new Date(s.last_seen).getTime();
            const isActive = lastMs < 120000; // 2dk içinde heartbeat = aktif
            const badge = s.role === 'admin' ? '#2563eb' : s.role === 'coach' ? '#d97706' : '#16a34a';
            const roleTr = s.role === 'admin' ? 'Admin' : s.role === 'coach' ? 'Antrenör' : 'Sporcu';
            const minAgo = Math.floor(lastMs / 60000);
            const seenTxt = minAgo < 1 ? 'Az önce' : minAgo + ' dk önce';
            const tcMasked = s.tc ? s.tc.slice(0,3) + '****' + s.tc.slice(-2) : '—';
            return `<tr style="font-size:13px">
              <td style="padding:6px 8px">${FormatUtils.escape(s.user_name)}${isSelf ? ' <span style="font-size:11px;color:var(--text2)">(Sen)</span>' : ''}</td>
              <td style="padding:6px 8px"><span style="background:${badge};color:#fff;border-radius:4px;padding:2px 6px;font-size:11px">${roleTr}</span></td>
              <td style="padding:6px 8px">${tcMasked}</td>
              <td style="padding:6px 8px"><span style="color:${isActive ? '#16a34a' : '#6b7280'}">${isActive ? '● ' : '○ '}${seenTxt}</span></td>
              <td style="padding:6px 8px">${isSelf ? '' : `<button class="btn be btn-sm" onclick="killOneSession('${s.id}')" style="padding:2px 8px;font-size:12px">Kapat</button>`}</td>
            </tr>`;
        }).join('');
        area.innerHTML = `<table style="width:100%;border-collapse:collapse">
          <thead><tr style="font-size:12px;color:var(--text2);border-bottom:1px solid var(--border)">
            <th style="padding:4px 8px;text-align:left">Ad</th>
            <th style="padding:4px 8px;text-align:left">Rol</th>
            <th style="padding:4px 8px;text-align:left">TC</th>
            <th style="padding:4px 8px;text-align:left">Son Görülme</th>
            <th></th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <button class="btn bs btn-sm mt2" onclick="loadAndShowSessions()" style="width:100%">Yenile</button>`;
    } catch(e) {
        area.innerHTML = '<div class="tm ts" style="color:var(--red)">Yüklenemedi.</div>';
    }
};

window.killOneSession = async function(sessionId) {
    try {
        await SessionManager.kill(sessionId);
        toast('Oturum kapatıldı.', 's');
        loadAndShowSessions();
    } catch(e) {
        toast('Hata: ' + e.message, 'e');
    }
};

window.killAllSessionsBtn = async function() {
    if (!confirm('Kendi oturumunuz hariç tüm aktif oturumlar kapatılacak. Devam?')) return;
    try {
        const n = await SessionManager.killAll();
        toast(n + ' oturum kapatıldı.', 's');
        loadAndShowSessions();
    } catch(e) {
        toast('Hata: ' + e.message, 'e');
    }
};

// AppState'e onKayitlar ekle
if (!AppState.data.onKayitlar) AppState.data.onKayitlar = [];

// Ön Kayıt sayfası (admin/antrenör için ayrı sayfa)
function __renderOnKayit() {
    const onKayitList = AppState.data.onKayitlar || [];
    const newCount = onKayitList.filter(o => o.status === 'new').length;
    return `
    <div class="ph">
        <div class="stit">📝 Ön Kayıt Başvuruları</div>
        <div class="ssub">${newCount} yeni başvuru bekliyor</div>
    </div>
    <div class="card mb3">
        <div class="flex fjb fca mb3">
            <div class="flex fca gap2">
                <div class="tw6 tsm">Tüm Başvurular</div>
                <span style="background:rgba(234,179,8,.15);color:var(--yellow);border:1px solid rgba(234,179,8,.3);padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700">${newCount} Yeni</span>
            </div>
            <button class="btn bs btn-sm" onclick="refreshOnKayitlar()">↻ Yenile</button>
        </div>
        ${onKayitList.length === 0
            ? '<div class="al al-b" style="border-radius:10px;padding:16px;text-align:center"><p class="tm ts">Henüz ön kayıt başvurusu bulunmuyor.</p></div>'
            : onKayitList.map(ok => `
              <div class="onkayit-card">
                  <div class="ok-header mb2">
                      <div>
                          <div class="tw6">${FormatUtils.escape(ok.studentName)}</div>
                          <div class="ts tm">${DateUtils.format(ok.bd)} • ${FormatUtils.escape(ok.className || '-')}</div>
                      </div>
                      <span class="${ok.status === 'new' ? 'ok-badge-new' : 'ok-badge-done'}">${ok.status === 'new' ? 'Yeni' : 'İşlendi'}</span>
                  </div>
                  <div class="ts tm mb1">👤 Veli: ${FormatUtils.escape(ok.parentName)} • ${FormatUtils.escape(ok.parentPhone)}</div>
                  <div class="ts tm mb2">🪪 TC: ${FormatUtils.escape(ok.tc || '-')}</div>
                  <div class="flex gap2 flex-wrap">
                      ${ok.status === 'new' ? `
                      <button class="btn bsu btn-sm" onclick="convertOnKayit('${FormatUtils.escape(ok.id)}')">➕ Sporcuya Dönüştür</button>
                      <button class="btn bs btn-sm" onclick="markOnKayitDone('${FormatUtils.escape(ok.id)}')">✅ İşaretlendi</button>
                      ` : ''}
                      <button class="btn bd btn-sm" onclick="delOnKayit('${FormatUtils.escape(ok.id)}')">🗑 Sil</button>
                  </div>
              </div>`).join('')}
    </div>`;
}

window.showOnKayitForm = async function() {
    // Sınıfları yükle (giriş yapmadan da)
    let classes = AppState.data.classes || [];
    // Kullanıcı giriş yapmamışsa org/branch bilgisini sınıf kaydından öğren
    let formOrgId    = AppState.currentOrgId    || '';
    let formBranchId = AppState.currentBranchId || '';

    if (classes.length === 0) {
        try {
            const sb = getSupabase();
            if (sb) {
                const { data } = await sb.from('classes').select('*').limit(50);
                if (data && data.length > 0) {
                    classes = data.map(DB.mappers.toClass);
                    // org/branch bilgisini ilk sınıf kaydından al
                    if (!formOrgId)    formOrgId    = data[0].org_id    || '';
                    if (!formBranchId) formBranchId = data[0].branch_id || '';
                }
            }
        } catch(e) { /* ignore */ }
    }

    const classOptions = classes.map(c =>
        `<option value="${FormatUtils.escape(c.id)}" data-name="${FormatUtils.escape(c.name)}">${FormatUtils.escape(c.name)}</option>`
    ).join('');
    
    const formHtml = `
    <div id="onkayit-modal" style="position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:2000;padding:16px;">
        <input type="hidden" id="ok-org-id" value="${formOrgId}"/>
        <input type="hidden" id="ok-branch-id" value="${formBranchId}"/>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;width:100%;max-width:520px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">
            <div style="padding:20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
                <div>
                    <div style="font-size:18px;font-weight:800">📝 Ön Kayıt Formu</div>
                    <div style="font-size:12px;color:var(--text2)">Bilgilerinizi eksiksiz doldurunuz</div>
                </div>
                <button onclick="document.getElementById('onkayit-modal').remove()" style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:6px;cursor:pointer;color:var(--text)">✕</button>
            </div>
            <div style="padding:20px;overflow-y:auto;flex:1">
                <div style="background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.3);border-radius:8px;padding:12px;font-size:13px;color:var(--blue2);margin-bottom:16px">
                    ℹ️ Ön kayıt talebiniz yöneticimize iletilecektir.
                </div>
                <div class="tw6 tsm mb2">Öğrenci Bilgileri</div>
                <div class="g21 mb2">
                    <div class="fgr"><label>Ad *</label><input id="ok-fn" placeholder="Adı"/></div>
                    <div class="fgr"><label>Soyad *</label><input id="ok-ln" placeholder="Soyadı"/></div>
                </div>
                <div class="g21 mb2">
                    <div class="fgr"><label>Doğum Tarihi *</label><input id="ok-bd" type="date"/></div>
                    <div class="fgr"><label>TC Kimlik No</label><input id="ok-tc" type="text" inputmode="numeric" maxlength="11" placeholder="11 Haneli TC"/></div>
                </div>
                <div class="fgr mb2">
                    <label>Kayıt Olmak İstediği Sınıf *</label>
                    <select id="ok-cls">
                        <option value="">Sınıf Seçiniz</option>
                        ${classOptions}
                    </select>
                </div>
                <div class="dv"></div>
                <div class="tw6 tsm mb2">Veli Bilgileri</div>
                <div class="g21 mb2">
                    <div class="fgr"><label>Veli Adı *</label><input id="ok-pn" placeholder="Adı Soyadı"/></div>
                    <div class="fgr"><label>Veli Soyadı</label><input id="ok-psn" placeholder="Soyadı"/></div>
                </div>
                <div class="fgr mb2">
                    <label>Veli Telefon *</label>
                    <input id="ok-pph" type="tel" placeholder="05XX XXX XX XX"/>
                </div>
            </div>
            <div style="padding:16px;border-top:1px solid var(--border);display:flex;gap:12px;justify-content:flex-end;background:var(--bg3);border-radius:0 0 16px 16px">
                <button class="btn bs" onclick="document.getElementById('onkayit-modal').remove()">İptal</button>
                <button class="btn bp" onclick="submitOnKayit()">Ön Kayıt Yap</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', formHtml);
    setTimeout(() => setupTCInput('ok-tc'), 100);
};

window.submitOnKayit = async function() {
    const fn = document.getElementById('ok-fn')?.value.trim();
    const ln = document.getElementById('ok-ln')?.value.trim();
    const bd = document.getElementById('ok-bd')?.value;
    const tc = document.getElementById('ok-tc')?.value.replace(/\D/g,'');
    const clsEl = document.getElementById('ok-cls');
    const clsId = clsEl?.value;
    const clsName = clsEl?.options[clsEl.selectedIndex]?.dataset.name || '';
    const pn = document.getElementById('ok-pn')?.value.trim();
    const psn = document.getElementById('ok-psn')?.value.trim();
    const pph = document.getElementById('ok-pph')?.value.trim();
    
    if (!fn || !ln || !bd || !clsId || !pn || !pph) {
        toast('Lütfen zorunlu alanları doldurunuz!', 'e');
        return;
    }
    
    // org/branch id: giriş yapılmışsa AppState'ten, yapılmamışsa hidden input'tan al
    const resolvedOrgId    = AppState.currentOrgId    || document.getElementById('ok-org-id')?.value    || '';
    const resolvedBranchId = AppState.currentBranchId || document.getElementById('ok-branch-id')?.value || '';

    const onKayit = {
        id: generateId(),
        studentName: `${fn} ${ln}`,
        fn, ln, bd, tc,
        clsId, className: clsName,
        parentName: psn ? `${pn} ${psn}` : pn,
        parentPhone: pph,
        status: 'new',
        createdAt: DateUtils.today(),
        orgId: resolvedOrgId,
        branchId: resolvedBranchId
    };

    if (!resolvedOrgId && !resolvedBranchId) {
        toast('Kurum bilgisi alınamadı. Lütfen tekrar deneyin.', 'e');
        return;
    }
    
    // Veritabanına kaydet
    try {
        const sb = getSupabase();
        if (sb) {
            await sb.from('on_kayitlar').insert({
                id: onKayit.id,
                student_name: onKayit.studentName,
                fn: onKayit.fn, ln: onKayit.ln, bd: onKayit.bd, tc: onKayit.tc,
                cls_id: onKayit.clsId, class_name: onKayit.className,
                parent_name: onKayit.parentName, parent_phone: onKayit.parentPhone,
                status: 'new', created_at: onKayit.createdAt,
                org_id: onKayit.orgId, branch_id: onKayit.branchId
            });
        }
    } catch(e) { console.warn('On kayit db error:', e); }
    
    document.getElementById('onkayit-modal')?.remove();
    toast('✅ Ön kayıt alındı!', 'g');
};


// Ön kayıtları admin panelinde yükle
async function loadOnKayitlar() {
    try {
        const sb = getSupabase();
        if (!sb) return;

        const bid = AppState.currentBranchId;
        const oid = AppState.currentOrgId;

        if (!bid && !oid) {
            console.warn('loadOnKayitlar: org/branch id yok, yüklenemiyor');
            return;
        }

        // branch_id veya org_id ile sorgula (hangisi doluysa)
        let q = sb.from('on_kayitlar').select('*');
        if (bid) {
            q = q.eq('branch_id', bid);
        } else {
            q = q.eq('org_id', oid);
        }
        
        const { data, error } = await q.order('created_at', { ascending: false });
        
        if (error) { console.warn('On kayit sorgu hatası:', error); return; }
        
        if (data) {
            AppState.data.onKayitlar = data.map(r => ({
                id: r.id,
                studentName: r.student_name || `${r.fn || ''} ${r.ln || ''}`.trim(),
                fn: r.fn || r.student_name?.split(' ')[0] || '',
                ln: r.ln || r.student_name?.split(' ').slice(1).join(' ') || '',
                bd: r.bd || r.birth_date || '',
                tc: r.tc || '',
                clsId: r.cls_id || '',
                className: r.class_name || '',
                parentName: r.parent_name || '',
                parentPhone: r.parent_phone || '',
                status: r.status || 'new',
                createdAt: r.created_at || r.createdAt || '',
                orgId: r.org_id || '',
                branchId: r.branch_id || ''
            }));
            
            // Badge güncelle
            const newCount = AppState.data.onKayitlar.filter(o => o.status === 'new').length;
            const badge = document.getElementById('onkayit-badge');
            if (badge) {
                if (newCount > 0) { badge.textContent = newCount; badge.classList.remove('dn'); }
                else { badge.classList.add('dn'); }
            }
        }
    } catch(e) { console.warn('On kayitlar yükleme hatası:', e); }
}

// Ön kayıtları yenile ve sayfayı güncelle
window.refreshOnKayitlar = async function() {
    const btn = event?.target || null;
    if (btn) { btn.textContent = '⏳'; btn.disabled = true; }
    await loadOnKayitlar();
    if (btn) { btn.textContent = '↻ Yenile'; btn.disabled = false; }
    // Sayfayı yeniden render et
    if (AppState.ui?.curPage === 'athletes') go('athletes');
    else if (AppState.ui?.curPage === 'onkayit') go('onkayit');
    else if (AppState.ui?.curPage === 'settings') go('settings');
    else toast(`${AppState.data.onKayitlar?.length || 0} ön kayıt yüklendi`, 'g');
};

window.convertOnKayit = function(id) {
    const ok = AppState.data.onKayitlar.find(x => x.id === id);
    if (!ok) return;
    closeModal();
    editAth(null, ok); // editAth'ı önceden doldurarak aç
};

window.markOnKayitDone = async function(id) {
    try {
        const sb = getSupabase();
        if (sb) await sb.from('on_kayitlar').update({ status: 'done' }).eq('id', id);
        const idx = AppState.data.onKayitlar.findIndex(x => x.id === id);
        if (idx >= 0) AppState.data.onKayitlar[idx].status = 'done';
        toast('İşaretlendi', 'g');
        const cur = AppState.ui?.curPage;
        go(cur === 'settings' ? 'settings' : 'onkayit');
    } catch(e) { console.error('markOnKayitDone error:', e.message); toast('İşlem başarısız. Lütfen tekrar deneyin.', 'e'); }
};

window.delOnKayit = async function(id) {
    confirm2('Ön Kayıt Sil', 'Bu başvuruyu silmek istediğinize emin misiniz?', async () => {
        try {
            const sb = getSupabase();
            if (sb) await sb.from('on_kayitlar').delete().eq('id', id);
            AppState.data.onKayitlar = AppState.data.onKayitlar.filter(x => x.id !== id);
            toast('Silindi', 'g');
            const cur = AppState.ui?.curPage;
            go(cur === 'settings' ? 'settings' : 'onkayit');
        } catch(e) { console.error('delOnKayit error:', e.message); toast('Silme işlemi başarısız. Lütfen tekrar deneyin.', 'e'); }
    });
};

// ==================== EXCEL IMPORT ====================

window.importAthletesFromExcel = function() {
    // XLSX kütüphanesi yoksa önce yükle
    if (!window.XLSX) {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
        s.integrity = 'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw';
        s.crossOrigin = 'anonymous';
        s.onload = function() { window.importAthletesFromExcel(); };
        s.onerror = function() { toast('Excel kütüphanesi yüklenemedi.', 'e'); };
        document.head.appendChild(s);
        return;
    }
    const html = `
    <div class="al al-b mb3" style="font-size:13px">
        &#x1F4CB; Excel dosyanız aşağıdaki sütunları içermelidir:<br>
        <strong>Ad, Soyad, TC, Telefon, DoğumTarihi, Branş, VeliAd, VeliTelefon</strong>
    </div>
    <div class="excel-drop-zone" id="excel-drop" onclick="document.getElementById('excel-file-inp').click()">
        <input type="file" id="excel-file-inp" accept=".xlsx,.xls,.csv" onchange="handleExcelImport(this)"/>
        <div style="font-size:32px;margin-bottom:8px">📊</div>
        <div class="tw6">Excel Dosyası Seç veya Sürükle Bırak</div>
        <div style="font-size:12px;color:var(--text3);margin-top:4px">.xlsx, .xls, .csv desteklenir</div>
    </div>
    <div id="excel-preview" class="mt3"></div>`;
    
    modal('Excel\'den Sporcu İçe Aktar', html, [
        { lbl: 'Kapat', cls: 'bs', fn: closeModal },
        { lbl: '✅ Seçilenleri Kaydet', cls: 'bp', fn: importSelectedAthletes }
    ]);
};

window.handleExcelImport = async function(input) {
    const file = input.files[0];
    if (!file) return;
    
    const preview = document.getElementById('excel-preview');
    if (preview) preview.innerHTML = '<div class="tm ts">Yükleniyor...</div>';
    
    try {
        const data = await readExcelFile(file);
        if (!data || !data.length) {
            if (preview) preview.innerHTML = '<div class="al al-r">Dosyada veri bulunamadı!</div>';
            return;
        }
        
        window._excelImportData = data;
        
        const headers = Object.keys(data[0]);
        const tableRows = data.slice(0, 10).map((row, i) => {
            const mapped = mapExcelRowToAthlete(row);
            return `<tr>
                <td><input type="checkbox" id="excel-row-${i}" checked style="width:auto"/></td>
                <td>${FormatUtils.escape(mapped.fn || '')} ${FormatUtils.escape(mapped.ln || '')}</td>
                <td>${FormatUtils.escape(mapped.tc || '')}</td>
                <td>${FormatUtils.escape(mapped.ph || '')}</td>
                <td>${FormatUtils.escape(mapped.sp || '')}</td>
                <td>${mapped.ok ? '✅' : '⚠️'}</td>
            </tr>`;
        }).join('');
        
        if (preview) preview.innerHTML = `
        <div class="tw6 tsm mb2">Önizleme (${data.length} kayıt bulundu, ${Math.min(10, data.length)} gösteriliyor)</div>
        <div class="tw" style="overflow-x:auto">
            <table>
                <thead><tr><th>✓</th><th>Ad Soyad</th><th>TC</th><th>Telefon</th><th>Branş</th><th>Durum</th></tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>
        ${data.length > 10 ? `<div class="ts tm mt2">...ve ${data.length - 10} kayıt daha</div>` : ''}`;
        
    } catch(e) {
        if (preview) preview.innerHTML = `<div class="al al-r">Dosya okunamadı: ${FormatUtils.escape(e.message)}</div>`;
    }
};

async function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(e.target.result, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                resolve(data);
            } catch(err) { reject(err); }
        };
        reader.onerror = () => reject(new Error('Dosya okunamadı'));
        reader.readAsArrayBuffer(file);
    });
}

function mapExcelRowToAthlete(row) {
    // Esnek sütun eşleştirme
    const get = (keys) => {
        for (const k of keys) {
            const found = Object.keys(row).find(rk => rk.toLowerCase().replace(/\s/g,'').includes(k.toLowerCase()));
            if (found && row[found] !== '') return String(row[found]).trim();
        }
        return '';
    };
    
    const fn = get(['ad','isim','name','firstname','öğrenciad']);
    const ln = get(['soyad','lastname','surname','öğrencisoyad']);
    const tc = get(['tc','kimlik','tckimlik','tcno']);
    const ph = get(['telefon','phone','tel','gsm']);
    const bd = get(['dogum','doğum','birthdate','dogumtarih']);
    const sp = get(['brans','branş','sport','spor']);
    const pn = get(['veliad','veliisim','veliadı','parentname','annebaba']);
    const pph = get(['velitel','veligsm','veliphone','parentphone','velitelfon']);
    const em = get(['eposta','email','mail']);
    
    const tcClean = tc.replace(/\D/g, '');
    const ok = fn && ln && tcClean.length === 11;
    
    return { fn, ln, tc: tcClean, ph, bd: formatExcelDate(bd), sp, pn, pph, em, ok };
}

function formatExcelDate(val) {
    if (!val) return '';
    // Excel serial number
    if (!isNaN(val) && val > 10000) {
        const date = XLSX.SSF.parse_date_code(parseInt(val));
        if (date) return `${date.y}-${String(date.m).padStart(2,'0')}-${String(date.d).padStart(2,'0')}`;
    }
    // String date
    const str = String(val);
    const parts = str.match(/(\d{1,4})[.\-\/](\d{1,2})[.\-\/](\d{2,4})/);
    if (parts) {
        const [,a,b,c] = parts;
        if (a.length === 4) return `${a}-${b.padStart(2,'0')}-${c.padStart(2,'0')}`;
        if (c.length === 4) return `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
    }
    return str;
}

window.importSelectedAthletes = async function() {
    const data = window._excelImportData;
    if (!data) { toast('Önce dosya seçiniz!', 'e'); return; }
    
    let success = 0, errors = 0, skipped = 0, authFailed = 0;
    
    for (let i = 0; i < data.length; i++) {
        const checkbox = document.getElementById(`excel-row-${i}`);
        if (checkbox && !checkbox.checked) { skipped++; continue; }
        
        const mapped = mapExcelRowToAthlete(data[i]);
        if (!mapped.fn || !mapped.tc || mapped.tc.length !== 11) { errors++; continue; }
        
        // TC zaten kayıtlı mı kontrol et
        if (AppState.data.athletes.find(a => a.tc === mapped.tc)) { skipped++; continue; }
        
        const clsMatch = AppState.data.classes.find(c => 
            c.name.toLowerCase().includes((mapped.sp || '').toLowerCase()) ||
            mapped.clsName?.toLowerCase().includes(c.name.toLowerCase())
        );
        
        const obj = {
            id: generateId(),
            fn: mapped.fn, ln: mapped.ln || '', tc: mapped.tc, bd: mapped.bd,
            ph: mapped.ph, em: mapped.em, sp: mapped.sp || '',
            pn: mapped.pn, pph: mapped.pph, pem: '',
            st: 'active', fee: 0, clsId: clsMatch?.id || '',
            rd: DateUtils.today(), orgId: AppState.currentOrgId, branchId: AppState.currentBranchId,
            cat: '', lic: '', vd: '', nt: '', spPass: '', gn: 'E',
            address: '', blood: '', emergency: '', health: '', height: 0, weight: 0, school: ''
        };
        
        const result = await DB.upsert('athletes', DB.mappers.fromAthlete(obj));
        if (result) {
            AppState.data.athletes.push(obj);
            success++;
            const authRes = await provisionAthleteAuthUser(obj, obj.spPass);
            if (!authRes.ok && !authRes.skipped) authFailed++;
        } else errors++;
    }
    
    let importMsg = `✅ ${success} sporcu eklendi${errors > 0 ? `, ${errors} hata` : ''}${skipped > 0 ? `, ${skipped} atlandı` : ''}`;
    if (authFailed > 0) importMsg += `, ${authFailed} auth hesabı oluşturulamadı`;
    toast(importMsg, authFailed > 0 ? 'e' : 'g');
    closeModal();
    go('athletes');
};

// ==================== EXPORT & UTILS ====================

window.exportAthletes = function() {
    const data = AppState.data.athletes.map(a => ({
        Ad: a.fn,
        Soyad: a.ln,
        TC: a.tc,
        Telefon: a.ph,
        Email: a.em,
        Branş: a.sp,
        Sınıf: className(a.clsId),
        Durum: statusLabel(a.st),
        'Aylık Ücret': a.fee,
        Veli: a.pn,
        'Veli Telefon': a.pph,
        'Kayıt Tarihi': DateUtils.format(a.rd)
    }));
    
    exportToExcel(data, 'Sporcular');
};

window.exportPayments = function() {
    const data = AppState.data.payments.map(p => ({
        Tarih: DateUtils.format(p.dt),
        Kişi: p.an,
        Açıklama: p.serviceName || p.ds,
        Tutar: p.amt,
        Tür: statusLabel(p.ty),
        Durum: statusLabel(p.st)
    }));
    
    exportToExcel(data, 'Odemeler');
};

function exportToExcel(data, filename) {
    if (!data || !data.length) {
        toast(i18n[AppState.lang].noData, 'e');
        return;
    }
    function _doExport() {
        try {
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
            XLSX.writeFile(wb, `${filename}_${DateUtils.today()}.xlsx`);
            toast(i18n[AppState.lang].exportSuccess, 'g');
        } catch (e) {
            console.error('Export error:', e);
            const csv = convertToCSV(data);
            downloadFile(csv, `${filename}.csv`, 'text/csv');
        }
    }
    if (window.XLSX) { _doExport(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.integrity = 'sha384-vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw';
    s.crossOrigin = 'anonymous';
    s.onload = _doExport;
    s.onerror = function() { const csv = convertToCSV(data); downloadFile(csv, `${filename}.csv`, 'text/csv'); };
    document.head.appendChild(s);
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map(row => 
        headers.map(h => {
            const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
            return `"${val.replace(/"/g, '""')}"`;
        }).join(';')
    );
    return '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
}

function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================
// GNOME-STYLE BİLDİRİM SİSTEMİ
// ============================================================

function getNotifications() {
    const notifications = [];
    const today = new Date();
    const payments = AppState.data.payments || [];

    // Sporcu/veli girişi: sadece kendi ödeme bildirimlerini görsün
    const isSporcu = !!AppState.currentSporcu;
    const sporcuId = isSporcu ? AppState.currentSporcu.id : null;

    if (isSporcu) {
        // Sporcu/veli: sadece kendi ödemelerine ait bildirimleri göster
        // Yaklaşan/gecikmiş ödeme planları (admin/antrenör tarafından oluşturulmuş)
        payments.filter(p => p.aid === sporcuId && p.source === 'plan' && p.st !== 'completed').forEach(p => {
            const dueDate = new Date(p.dt);
            const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
                notifications.push({
                    id: 'notif-' + p.id,
                    icon: '⚠️',
                    text: `${FormatUtils.currency(p.amt)} ödemeniz ${Math.abs(diffDays)} gün gecikti!`,
                    time: DateUtils.format(p.dt),
                    type: 'danger'
                });
            } else if (diffDays <= 7) {
                notifications.push({
                    id: 'notif-' + p.id,
                    icon: '🔔',
                    text: `Ödemenize ${diffDays} gün kaldı (${FormatUtils.currency(p.amt)})`,
                    time: DateUtils.format(p.dt),
                    type: 'warning'
                });
            }
        });

        // Kendi gönderdiği onay bekleyen bildirimler
        payments.filter(p => p.aid === sporcuId && p.notifStatus === 'pending_approval').forEach(p => {
            notifications.push({
                id: 'notif-approval-' + p.id,
                icon: '📩',
                text: `Ödeme bildiriminiz onay bekliyor (${FormatUtils.currency(p.amt)})`,
                time: DateUtils.format(p.dt),
                type: 'info'
            });
        });
    } else {
        // Admin/Antrenör: tüm ödemeleri görebilir
        payments.filter(p => p.source === 'plan' && p.st !== 'completed').forEach(p => {
            const dueDate = new Date(p.dt);
            const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
            const athName = p.an || 'Sporcu';

            if (diffDays < 0) {
                notifications.push({
                    id: 'notif-' + p.id,
                    icon: '⚠️',
                    text: `${athName} — ${FormatUtils.currency(p.amt)} ödeme ${Math.abs(diffDays)} gün gecikti!`,
                    time: DateUtils.format(p.dt),
                    type: 'danger'
                });
            } else if (diffDays <= 7) {
                notifications.push({
                    id: 'notif-' + p.id,
                    icon: '🔔',
                    text: `${athName} — ödemesine ${diffDays} gün kaldı (${FormatUtils.currency(p.amt)})`,
                    time: DateUtils.format(p.dt),
                    type: 'warning'
                });
            }
        });

        // Onay bekleyen veli bildirimleri (admin/antrenör için)
        payments.filter(p => p.notifStatus === 'pending_approval').forEach(p => {
            notifications.push({
                id: 'notif-approval-' + p.id,
                icon: '📩',
                text: `${p.an || 'Veli'} ödeme bildirimi gönderdi (${FormatUtils.currency(p.amt)}) — Onay bekliyor`,
                time: DateUtils.format(p.dt),
                type: 'info'
            });
        });
    }

    // Dismissed olanları filtrele
    const dismissed = JSON.parse(StorageManager.get('dismissed_notifs') || '[]');
    return notifications.filter(n => !dismissed.includes(n.id));
}

function renderNotifPanel(panelId, badgeId) {
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const notifs = getNotifications();

    if (notifs.length === 0) {
        panel.innerHTML = '<div class="notif-panel-header"><span class="tw6 tsm">🔔 Bildirimler</span></div><div class="notif-empty"><div style="font-size:36px;margin-bottom:8px">✅</div><div class="ts tm">Yeni bildirim yok</div></div>';
    } else {
        panel.innerHTML = '<div class="notif-panel-header"><span class="tw6 tsm">🔔 Bildirimler</span><span class="notif-count">' + notifs.length + '</span></div>' +
            notifs.map(n => {
                const typeClass = n.type === 'danger' ? 'notif-item-danger' : n.type === 'warning' ? 'notif-item-warning' : 'notif-item-info';
                return '<div class="notif-item ' + typeClass + '" id="' + n.id + '">' +
                    '<div class="notif-item-icon">' + n.icon + '</div>' +
                    '<div class="notif-item-body">' +
                    '<div class="notif-item-text">' + FormatUtils.escape(n.text) + '</div>' +
                    '<div class="notif-item-time">' + FormatUtils.escape(n.time) + '</div>' +
                    '</div>' +
                    '<button class="notif-dismiss" onclick="dismissNotif(\'' + n.id + '\')" title="Kaldır">✕</button>' +
                    '</div>';
            }).join('');
    }

    // Badge güncelle
    updateNotifBadge(badgeId, notifs.length);
}

function updateNotifBadge(badgeId, count) {
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('dn');
    } else {
        badge.classList.add('dn');
    }
}

window.toggleNotifPanel = function(e) {
    if (e) e.stopPropagation();
    // Determine which panel to use based on which portal is visible
    const wrapEl = document.getElementById('wrap');
    const isAdmin = wrapEl && !wrapEl.classList.contains('dn');
    const panel = isAdmin ? document.getElementById('notif-panel') : document.getElementById('sp-notif-panel');
    const badgeId = isAdmin ? 'notif-badge' : 'sp-notif-badge';

    if (!panel) return;

    if (panel.classList.contains('dn')) {
        renderNotifPanel(panel.id, badgeId);
        panel.classList.remove('dn');
        // Dışarı tıklama ile kapat
        setTimeout(() => {
            document.addEventListener('click', closeNotifOnOutside);
        }, 0);
    } else {
        panel.classList.add('dn');
        document.removeEventListener('click', closeNotifOnOutside);
    }
};

function closeNotifOnOutside(e) {
    const panels = document.querySelectorAll('.notif-panel');
    const btns = document.querySelectorAll('#notif-btn, #sp-notif-btn');
    const inside = Array.from(panels).some(p => p.contains(e.target)) ||
                   Array.from(btns).some(b => b.contains(e.target));
    if (!inside) {
        panels.forEach(p => p.classList.add('dn'));
        document.removeEventListener('click', closeNotifOnOutside);
    }
}

window.dismissNotif = function(notifId) {
    const el = document.getElementById(notifId);
    if (el) {
        el.style.animation = 'notif-fade-out 0.3s ease forwards';
        setTimeout(() => {
            el.remove();
            // Dismissed listesine ekle
            const dismissed = JSON.parse(StorageManager.get('dismissed_notifs') || '[]');
            dismissed.push(notifId);
            StorageManager.set('dismissed_notifs', JSON.stringify(dismissed));
            // Badge güncelle
            updateNotifBadge('notif-badge', document.querySelectorAll('#notif-panel .notif-item').length);
            updateNotifBadge('sp-notif-badge', document.querySelectorAll('#sp-notif-panel .notif-item').length);
            // Eğer hiç bildirim kalmadıysa boş durumu göster
            const panel = document.querySelector('.notif-panel:not(.dn)');
            if (panel && panel.querySelectorAll('.notif-item').length === 0) {
                const header = panel.querySelector('.notif-panel-header');
                if (header) header.querySelector('.notif-count')?.remove();
                panel.innerHTML = '<div class="notif-panel-header"><span class="tw6 tsm">🔔 Bildirimler</span></div><div class="notif-empty"><div style="font-size:36px;margin-bottom:8px">✅</div><div class="ts tm">Yeni bildirim yok</div></div>';
            }
        }, 300);
    }
};

function refreshNotifBadges() {
    const count = getNotifications().length;
    updateNotifBadge('notif-badge', count);
    updateNotifBadge('sp-notif-badge', count);
}

// DOM Ready - Initialize
document.addEventListener('DOMContentLoaded', async () => {
    applyTheme(AppState.theme);
    applyLang(AppState.lang);
    
    // TC inputları için mobil uyumlu handler'ları kur
    setupTCInput('ls-tc');
    setupTCInput('lc-tc');
    
    // Enter tuşu ile giriş — tüm login formaları
    function onEnter(inputId, fn) {
        const el = document.getElementById(inputId);
        if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') fn(); });
    }
    onEnter('ls-tc',   () => doNormalLogin('sporcu'));
    onEnter('ls-pass', () => doNormalLogin('sporcu'));
    onEnter('lc-tc',   () => doNormalLogin('coach'));
    onEnter('lc-pass', () => doNormalLogin('coach'));
    onEnter('le',      () => doLogin());
    onEnter('lp',      () => doLogin());
    
    // Mobil sidebar — touch dışarıya tıklama ile kapanma
    document.addEventListener('touchstart', function(e) {
        const side = document.getElementById('side');
        const overlay = document.getElementById('overlay');
        if (side && side.classList.contains('open')) {
            if (!side.contains(e.target) && overlay && !overlay.contains(e.target)) {
                closeSide();
            }
        }
    }, { passive: true });
    
    if (window.location.href.includes('admin')) {
        switchLoginTab('admin');
    }
    
    await restoreSession();
});
