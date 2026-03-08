/* ============================================================
   DRAGOS FUTBOL AKADEMISI - GELİŞMİŞ PROFİL SİSTEMİ
   Mobil Uyumlu ve Hata Düzeltmeleri
   ============================================================ */

window.onerror = function(msg, url, line, col, error) {
    console.error('Global Error:', { msg, url, line, col, error });
    return true;
};

// Mobil uyumlu localStorage wrapper
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
            if (!this.isAvailable()) return null;
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (e) {
            console.warn('Storage get error:', e);
            return null;
        }
    },
    
    set(key, value) {
        try {
            if (!this.isAvailable()) {
                console.warn('localStorage not available');
                return false;
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
            if (!this.isAvailable()) return false;
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.warn('Storage remove error:', e);
            return false;
        }
    },
    
    clear() {
        try {
            if (!this.isAvailable()) return false;
            localStorage.clear();
            return true;
        } catch (e) {
            console.warn('Storage clear error:', e);
            return false;
        }
    }
};

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
        profileTab: 'overview'
    }
};

const i18n = {
    TR: {
        loading: 'Yükleniyor...', menuMain: 'Ana Menü', menuDash: 'Gösterge', menuAth: 'Sporcular',
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
        loading: 'Loading...', menuMain: 'Main Menu', menuDash: 'Dashboard', menuAth: 'Athletes',
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
            return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
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
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// Mobil uyumlu SHA256 - crypto.subtle yerine alternatif
async function sha256(str) {
    try {
        // Önce native crypto.subtle dene (HTTPS veya localhost gerektirir)
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
            return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
    } catch (e) {
        console.warn('Native crypto failed, using fallback');
    }
    
    // Basit hash fonksiyonu (fallback)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
}

function getSupabase() {
    if (!AppState.sb) {
        try {
            if (typeof supabase === 'undefined') {
                console.error('Supabase library not loaded');
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
            console.error('Supabase init error:', e);
            toast(i18n[AppState.lang].connectionError, 'e');
        }
    }
    return AppState.sb;
}

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
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = body;
        const mf = document.getElementById('modal-footer');
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
            el.innerHTML = '';
            el.style.cssText = `background-image:url("${logoUrl}");background-size:cover;background-position:center;`;
        }
    }
};

function applyTheme(theme) {
    const isLight = theme === 'light';
    const btn = document.getElementById('theme-btn');
    const spBtn = document.getElementById('sp-theme-btn');
    if (isLight) {
        document.documentElement.setAttribute('data-theme', 'light');
        if (btn) btn.innerHTML = '&#x1F319;';
        if (spBtn) spBtn.innerHTML = '&#x1F319;';
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (btn) btn.innerHTML = '&#x1F31E;';
        if (spBtn) spBtn.innerHTML = '&#x1F31E;';
    }
    StorageManager.set('sporcu_theme', theme);
    AppState.theme = theme;
}

function toggleTheme() {
    applyTheme(AppState.theme === 'dark' ? 'light' : 'dark');
}

function applyLang(lang) {
    AppState.lang = lang;
    StorageManager.set('sporcu_lang', lang);
    const btn = document.getElementById('lang-btn');
    if (btn) btn.textContent = lang === 'TR' ? 'EN' : 'TR';
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
    if (!document.getElementById('main-wrap').classList.contains('dn')) {
        go(AppState.ui.curPage);
    }
}

window.switchLoginTab = function(tab) {
    const sporcuEl = document.getElementById('login-sporcu');
    const coachEl = document.getElementById('login-coach');
    const tabs = document.querySelectorAll('#login-tabs .ltab');
    
    if (sporcuEl) sporcuEl.classList.toggle('dn', tab !== 'sporcu');
    if (coachEl) coachEl.classList.toggle('dn', tab !== 'coach');
    
    if (tabs.length > 1) {
        tabs[0].classList.toggle('on', tab === 'sporcu');
        tabs[1].classList.toggle('on', tab === 'coach');
    }
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
                ph: r.ph, em: r.em || '', sp: r.sp, cat: r.lic, lic: r.lic,
                rd: r.rd, st: r.st || 'active', fee: r.fee || 0, vd: r.vd,
                nt: r.nt, clsId: r.cls_id, pn: r.pn, pph: r.pph, pem: r.pem,
                spPass: r.sp_pass, orgId: r.org_id, branchId: r.branch_id,
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
            return {
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
                sp_pass: str(a.spPass)
            };
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
                slipCode: r.slip_code || ''
            };
        },
        fromPayment(p) {
            return {
                id: p.id, org_id: AppState.currentOrgId,
                branch_id: AppState.currentBranchId,
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
            return {
                id: c.id,
                org_id: c.orgId || AppState.currentOrgId || '',
                branch_id: c.branchId || AppState.currentBranchId || '',
                fn: str(c.fn), ln: str(c.ln), tc: str(c.tc),
                ph: str(c.ph), em: str(c.em), sp: str(c.sp),
                sal: num(c.sal), st: str(c.st) || 'active',
                coach_pass: str(c.coachPass)
            };
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
                address: r.address, netgsmUser: r.netgsm_user,
                netgsmPass: r.netgsm_pass, netgsmHeader: r.netgsm_header,
                paytrMerchantId: r.paytr_merchant_id || '',
                paytrMerchantKey: r.paytr_merchant_key || '',
                paytrMerchantSalt: r.paytr_merchant_salt || '',
                paytrActive: r.paytr_active || false
            };
        },
        fromSettings(s) {
            return {
                id: s.id || generateId(), org_id: AppState.currentOrgId,
                branch_id: AppState.currentBranchId,
                school_name: s.schoolName, logo_url: s.logoUrl,
                bank_name: s.bankName, account_name: s.accountName,
                iban: s.iban, owner_phone: s.ownerPhone,
                address: s.address, netgsm_user: s.netgsmUser,
                netgsm_pass: s.netgsmPass, netgsm_header: s.netgsmHeader,
                paytr_merchant_id: s.paytrMerchantId || '',
                paytr_merchant_key: s.paytrMerchantKey || '',
                paytr_merchant_salt: s.paytrMerchantSalt || '',
                paytr_active: s.paytrActive || false
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
            console.error(`DB query error (${table}):`, e);
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
                console.error(`Supabase upsert error (${table}):`, error);
                const msg = error.message || error.details || JSON.stringify(error);
                toast(`Kayıt hatası: ${msg}`, 'e');
                return null;
            }
            return result;
        } catch (e) {
            console.error(`DB upsert exception (${table}):`, e);
            toast(`Kayıt hatası: ${e.message || 'Bilinmeyen hata'}`, 'e');
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
            console.error(`DB delete error (${table}):`, e);
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

window.doNormalLogin = async function(type) {
    const isCoach = type === 'coach';
    const tcId = isCoach ? 'lc-tc' : 'ls-tc';
    const passId = isCoach ? 'lc-pass' : 'ls-pass';
    const errId = isCoach ? 'lc-err' : 'ls-err';
    
    const tc = FormatUtils.cleanTC(UIUtils.getValue(tcId));
    const pass = UIUtils.getValue(passId);
    const errEl = document.getElementById(errId);
    
    if (!tc || !pass) {
        if (errEl) {
            errEl.textContent = AppState.lang === 'TR' ? 'TC ve şifre giriniz!' : 'Enter ID and password!';
            errEl.classList.remove('dn');
        }
        return;
    }
    
    if (!FormatUtils.tcValidate(tc)) {
        if (errEl) {
            errEl.textContent = i18n[AppState.lang].invalidTC;
            errEl.classList.remove('dn');
        }
        return;
    }
    
    UIUtils.setLoading(true);
    if (errEl) errEl.classList.add('dn');
    
    try {
        const inputHash = await sha256(pass);
        const table = isCoach ? 'coaches' : 'athletes';
        const results = await DB.query(table, { tc });
        
        if (!results || results.length === 0) {
            throw new Error('Not found');
        }
        
        let found = null;
        for (const r of results) {
            const expectedPass = isCoach ? r.coach_pass : r.sp_pass;
            const expected = expectedPass || tc.slice(-4);
            const expectedHash = await sha256(expected);
            
            if ((pass === expected) || (inputHash === expectedHash)) {
                found = r;
                break;
            }
        }
        
        if (!found) {
            throw new Error('Invalid password');
        }
        
        if (isCoach) {
            AppState.currentUser = {
                id: found.id,
                name: `${found.fn} ${found.ln}`,
                role: 'coach',
                email: `${tc}@coach.local`
            };
            AppState.currentOrgId = found.org_id;
            AppState.currentBranchId = found.branch_id;
            
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
            go('attendance');
        } else {
            AppState.currentSporcu = DB.mappers.toAthlete(found);
            AppState.currentOrgId = found.org_id;
            AppState.currentBranchId = found.branch_id;
            
            StorageManager.set('sporcu_app_sporcu', {
                user: AppState.currentSporcu,
                orgId: AppState.currentOrgId,
                branchId: AppState.currentBranchId
            });
            
            await loadBranchData();
            
            const lboxWrap = document.getElementById('lbox-wrap');
            const sporcuPortal = document.getElementById('sporcu-portal');
            const spName = document.getElementById('sp-name');
            const spOrgname = document.getElementById('sp-orgname');
            
            if (lboxWrap) lboxWrap.style.display = 'none';
            if (sporcuPortal) sporcuPortal.style.display = 'flex';
            if (spName) spName.textContent = `${AppState.currentSporcu.fn} ${AppState.currentSporcu.ln}`;
            if (spOrgname) spOrgname.textContent = AppState.data.settings?.schoolName || 'Dragos Futbol Akademisi';
            
            const initials = FormatUtils.initials(AppState.currentSporcu.fn, AppState.currentSporcu.ln);
            UIUtils.setElementAvatar('sp-avatar', null, initials);
            
            // Logoyu sporcu portaline uygula
            applyLogoEverywhere(AppState.data.settings?.logoUrl || '');
            
            spTab('profil');
        }
        
    } catch (e) {
        console.error('Login error:', e);
        if (errEl) {
            errEl.textContent = AppState.lang === 'TR' ? 'Kayıt bulunamadı veya şifre hatalı!' : 'Record not found or incorrect password!';
            errEl.classList.remove('dn');
        }
    } finally {
        UIUtils.setLoading(false);
    }
};

window.doLogin = async function() {
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
        if (!sb) throw new Error('Supabase başlatılamadı');
        
        // Önce mevcut oturumu kapat
        await sb.auth.signOut().catch(() => {});
        
        const { data: authData, error: authError } = await sb.auth.signInWithPassword({ email, password });
        
        if (authError) {
            if (errEl) {
                errEl.textContent = 'Hatalı e-posta veya şifre!';
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
        
        AppState.currentUser = {
            id: userData.id,
            email: userData.email,
            orgId: userData.org_id,
            branchId: userData.branch_id,
            role: userData.role || 'admin',
            name: userData.name || email.split('@')[0]
        };
        
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
        
    } catch (err) {
        console.error('Login error:', err);
        if (errEl) {
            errEl.textContent = `Giriş hatası: ${err.message || 'Bilinmeyen hata'}`;
            errEl.classList.remove('dn');
        }
    } finally {
        UIUtils.setLoading(false);
    }
};

async function restoreSession() {
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
            return;
        }
        
        // 2. Yönetici / antrenör oturumu kontrolü
        const storedUser = StorageManager.get('sporcu_app_user');
        if (storedUser) {
            AppState.currentUser = storedUser;
            AppState.currentOrgId = StorageManager.get('sporcu_app_org') || storedUser.orgId;
            AppState.currentBranchId = StorageManager.get('sporcu_app_branch') || storedUser.branchId;
            
            if (storedUser.role === 'admin') {
                const sb = getSupabase();
                if (sb) {
                    try {
                        const { data: { session } } = await sb.auth.getSession();
                        if (!session) {
                            console.warn('Admin session expired');
                            StorageManager.remove('sporcu_app_user');
                            StorageManager.remove('sporcu_app_org');
                            StorageManager.remove('sporcu_app_branch');
                            await loadLogoForLoginScreen();
                            return;
                        }
                    } catch(e) {
                        console.warn('Session check failed:', e);
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
            return;
        }
        
        // 3. Oturum yok — giriş ekranında logoyu yükle
        await loadLogoForLoginScreen();
        
    } catch (e) {
        console.error('Session restore error:', e);
        StorageManager.remove('sporcu_app_user');
        StorageManager.remove('sporcu_app_org');
        StorageManager.remove('sporcu_app_branch');
        await loadLogoForLoginScreen();
    } finally {
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
    try {
        const sb = getSupabase();
        if (sb) await sb.auth.signOut();
    } catch (e) {
        console.error('Logout error:', e);
    }
    StorageManager.clear();
    location.reload();
};

window.doSporcuLogout = function() {
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

        const results = await Promise.all([
            DB.query('athletes', filter),
            payQuery(),
            DB.query('coaches', filter),
            DB.query('attendance', filter),
            DB.query('messages', filter),
            DB.query('settings', filter),
            DB.query('sports', filter),
            DB.query('classes', filter)
        ]);
        
        AppState.data.athletes = (results[0] || []).map(DB.mappers.toAthlete);
        AppState.data.payments = (results[1] || []).map(DB.mappers.toPayment);
        AppState.data.coaches  = (results[2] || []).map(DB.mappers.toCoach);
        
        AppState.data.attendance = {};
        (results[3] || []).forEach(r => {
            if (!AppState.data.attendance[r.att_date]) AppState.data.attendance[r.att_date] = {};
            AppState.data.attendance[r.att_date][r.athlete_id] = r.status;
        });
        
        AppState.data.messages = (results[4] || []).map(r => ({
            id: r.id, fr: r.fr, role: r.role, sub: r.sub,
            body: r.body, dt: r.dt, rd: r.rd
        }));
        
        AppState.data.settings = results[5]?.[0] ? 
            DB.mappers.toSettings(results[5][0]) : 
            { schoolName: 'Dragos Futbol Akademisi' };
        
        AppState.data.sports  = (results[6] || []).map(DB.mappers.toSport);
        AppState.data.classes = (results[7] || []).map(DB.mappers.toClass);
        
        applyLogoEverywhere(AppState.data.settings?.logoUrl || '');
        const loginSchoolName = document.getElementById('login-school-name');
        if (loginSchoolName) loginSchoolName.textContent = AppState.data.settings?.schoolName || 'Dragos Futbol Akademisi';
        
        if (AppState.currentUser?.role === 'admin' || AppState.currentUser?.role === 'coach') {
            await loadOnKayitlar();
        }
        
        checkOverdue();
    } catch (e) {
        console.error('Load branch data error:', e);
        toast(i18n[AppState.lang].connectionError, 'e');
    }
}

// Tek merkezden tüm ekranların logosunu günceller
// URL (http/https) veya base64 data: her ikisini de destekler
function applyLogoEverywhere(logoUrl) {
    const hasLogo = !!(logoUrl && logoUrl.trim() !== '' && logoUrl !== DEFAULT_LOGO);

    // 1) GİRİŞ EKRANI LOGO (#login-logo) — <img> ile override et, CSS sorununu tamamen önle
    const loginLogo = document.getElementById('login-logo');
    if (loginLogo) {
        if (hasLogo) {
            loginLogo.innerHTML = `<img src="${logoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" onerror="this.parentElement.innerHTML='&#x26BD;'"/>`;
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
            barAva.style.backgroundImage = 'url("' + logoUrl + '")';
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
            logoPreview.innerHTML = '<img src="' + logoUrl + '" style="width:100%;height:100%;object-fit:cover"/>';
        } else {
            logoPreview.innerHTML = '&#x26BD;';
        }
    }
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

window.go = function(page, params = {}) {
    if (AppState.currentUser?.role === 'coach') {
        const restricted = ['dashboard', 'payments', 'accounting', 'settings', 'sms', 'sports', 'classes'];
        if (restricted.includes(page)) {
            toast(AppState.lang === 'TR' ? 'Bu sayfaya erişim yetkiniz yok.' : 'You do not have permission to access this page.', 'e');
            return;
        }
    }
    
    AppState.ui.curPage = page;
    const main = document.getElementById('main');
    const pages = {
        dashboard: pgDashboard,
        athletes: pgAthletes,
        athleteProfile: () => pgAthleteProfile(params.id),
        payments: pgPayments,
        accounting: pgAccounting,
        attendance: pgAttendance,
        coaches: pgCoaches,
        sports: pgSports,
        classes: pgClasses,
        settings: pgSettings,
        sms: pgSms
    };
    
    if (!main) return;
    
    main.style.opacity = '0';
    setTimeout(() => {
        if (pages[page]) {
            main.innerHTML = pages[page]();
            if (page === 'athleteProfile') {
                initProfileTabs();
            }
        }
        main.style.opacity = '1';
    }, 100);
    
    document.querySelectorAll('.ni').forEach(el => {
        el.classList.toggle('on', el.id === `ni-${page === 'athleteProfile' ? 'athletes' : page}`);
    });
    document.querySelectorAll('.bni-btn').forEach(el => {
        el.classList.toggle('on', el.id === `bn-${page === 'athleteProfile' ? 'athletes' : page}`);
    });
    
    closeSide();
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

function checkOverdue() {
    const today = DateUtils.today();
    AppState.data.payments.forEach(p => {
        if (p.st === 'pending' && p.dt && p.dt < today) {
            p.st = 'overdue';
            DB.upsert('payments', DB.mappers.fromPayment(p));
        }
    });
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
        income: 'Gelir', expense: 'Gider', present: 'Var', absent: 'Yok',
        excused: 'İzinli'
    };
    return labels[st] || st || '-';
}

function statusClass(st) {
    const classes = {
        active: 'bg-g', inactive: 'bg-r', pending: 'bg-y',
        completed: 'bg-g', overdue: 'bg-r', cancelled: 'bg-r',
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
                    <div class="profile-actions">
                        <button class="btn bp" onclick="editAth('${a.id}')">&#x270F; Düzenle</button>
                        <button class="btn bs" onclick="go('athletes')">&#x2190; Listeye Dön</button>
                        <button class="btn bw" onclick="printProfile('${a.id}')">&#x1F5A8; Yazdır</button>
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
            <button class="tab-btn active" onclick="switchProfileTab('overview')">Genel Bakış</button>
            <button class="tab-btn" onclick="switchProfileTab('personal')">Kişisel Bilgiler</button>
            <button class="tab-btn" onclick="switchProfileTab('payments')">Ödemeler</button>
            <button class="tab-btn" onclick="switchProfileTab('attendance')">Devam Durumu</button>
            <button class="tab-btn" onclick="switchProfileTab('documents')">Belgeler</button>
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
                <button class="btn bp" onclick="addPaymentForAthlete('${a.id}')">+ Yeni Ödeme Ekle</button>
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
            <div class="flex fjb fca mb3">
                <h3 class="tw6">Belgeler</h3>
                <button class="btn bp" onclick="uploadDocument('${a.id}')">+ Belge Yükle</button>
            </div>
            <div class="g2">
                <div class="document-card" onclick="viewDocument('saglik')">
                    <div class="document-icon">&#x1F5C3;</div>
                    <div class="document-info">
                        <div class="document-title">Sağlık Raporu</div>
                        <div class="document-meta">PDF • 2.4 MB • 15.03.2024</div>
                    </div>
                </div>
                <div class="document-card" onclick="viewDocument('kimlik')">
                    <div class="document-icon">&#x1F5C3;</div>
                    <div class="document-info">
                        <div class="document-title">Kimlik Fotokopisi</div>
                        <div class="document-meta">PDF • 1.1 MB • 10.01.2024</div>
                    </div>
                </div>
                <div class="document-card" onclick="viewDocument('lisans')">
                    <div class="document-icon">&#x1F5C3;</div>
                    <div class="document-info">
                        <div class="document-title">Lisans Belgesi</div>
                        <div class="document-meta">PDF • 3.2 MB • 05.02.2024</div>
                    </div>
                </div>
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
        .filter(d => AppState.data.attendance[d][aid])
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
        .filter(d => AppState.data.attendance[d][aid])
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
        btn.classList.remove('active');
        const text = btn.textContent.toLowerCase();
        if ((tabName === 'overview' && text.includes('genel')) ||
            (tabName === 'personal' && text.includes('kişisel')) ||
            (tabName === 'payments' && text.includes('ödeme')) ||
            (tabName === 'attendance' && text.includes('devam')) ||
            (tabName === 'documents' && text.includes('belge'))) {
            btn.classList.add('active');
        }
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
        <div class="stit" data-i18n="menuDash">Gösterge</div>
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

function pgAthletes() {
    let list = [...AppState.data.athletes];
    const f = AppState.filters.athletes;
    
    if (f.sp) list = list.filter(a => a.sp === f.sp);
    if (f.st) list = list.filter(a => a.st === f.st);
    if (f.cls) list = list.filter(a => a.clsId === f.cls);
    if (f.q) {
        const q = f.q.toLowerCase();
        list = list.filter(a => 
            `${a.fn} ${a.ln}`.toLowerCase().includes(q) || 
            a.tc.includes(q)
        );
    }
    
    const isAdmin = AppState.currentUser?.role === 'admin';
    const isCoach = AppState.currentUser?.role === 'coach';
    const onKayitlar = AppState.data.onKayitlar || [];
    const pendingOnKayit = onKayitlar.filter(o => o.status === 'new');
    
    // Ön kayıt bölümü — yönetici ve antrenör görebilir
    const onKayitSection = (isAdmin || isCoach) ? `
    <div class="card mb3" style="border-left:4px solid var(--yellow)">
        <div class="flex fjb fca mb3">
            <div class="tw6 tsm">📝 Ön Kayıt Başvuruları
                ${pendingOnKayit.length > 0 ? `<span style="background:var(--yellow);color:#000;border-radius:10px;padding:1px 8px;font-size:11px;font-weight:800;margin-left:6px">${pendingOnKayit.length} Yeni</span>` : ''}
            </div>
            <button class="btn btn-sm bs" onclick="refreshOnKayitlar()">&#x21BB; Yenile</button>
        </div>
        ${onKayitlar.length === 0 ? `
        <div style="text-align:center;padding:20px;color:var(--text3)">
            <div style="font-size:32px;margin-bottom:8px">📋</div>
            <div class="ts">Henüz ön kayıt başvurusu yok.</div>
            <button class="btn btn-sm bs mt2" onclick="refreshOnKayitlar()">Tekrar Kontrol Et</button>
        </div>` : `
        <div class="tw" style="overflow-x:auto">
            <table>
                <thead><tr>
                    <th>Tarih</th>
                    <th>Ad Soyad</th>
                    <th>TC</th>
                    <th>Doğum</th>
                    <th>Sınıf Talebi</th>
                    <th>Veli / Telefon</th>
                    <th>Durum</th>
                    ${isAdmin ? '<th>İşlemler</th>' : ''}
                </tr></thead>
                <tbody>
                ${onKayitlar.map(ok => {
                    const adSoyad = ((ok.fn || '') + ' ' + (ok.ln || '')).trim() || ok.studentName || '-';
                    return `
                <tr style="${ok.status === 'new' ? 'background:rgba(234,179,8,.07)' : 'opacity:.65'}">
                    <td class="ts">${ok.createdAt ? DateUtils.format(ok.createdAt) : '-'}</td>
                    <td class="tw6">${FormatUtils.escape(adSoyad)}</td>
                    <td class="ts">${FormatUtils.escape(ok.tc || '-')}</td>
                    <td class="ts">${ok.bd ? DateUtils.format(ok.bd) : '-'}</td>
                    <td>${FormatUtils.escape(ok.className || '-')}</td>
                    <td class="ts">${FormatUtils.escape(ok.parentName || '-')}<br><small style="color:var(--text2)">${FormatUtils.escape(ok.parentPhone || '')}</small></td>
                    <td><span class="bg ${ok.status === 'new' ? 'bg-y' : 'bg-g'}">${ok.status === 'new' ? '⏳ Bekliyor' : '✅ İşlendi'}</span></td>
                    ${isAdmin ? `<td>
                        ${ok.status === 'new' ? `<button class="btn btn-xs bp" onclick="convertOnKayit('${ok.id}')">Kayıt Aç</button> ` : ''}
                        <button class="btn btn-xs bd" onclick="delOnKayit('${ok.id}')">Sil</button>
                    </td>` : ''}
                </tr>`;
                }).join('')}
                </tbody>
            </table>
        </div>`}
    </div>` : '';
    
    return `
    <div class="ph">
        <div class="stit" data-i18n="menuAth">Sporcular</div>
    </div>
    ${onKayitSection}
    <div class="flex fjb fca mb3 fwrap gap2">
        <div class="flex gap2 fwrap">
            <select class="fs" onchange="AppState.filters.athletes.sp=this.value;go('athletes')">
                <option value="">Tüm Branşlar</option>
                ${AppState.data.sports.map(s => 
                    `<option value="${FormatUtils.escape(s.name)}"${f.sp === s.name ? ' selected' : ''}>${FormatUtils.escape(s.name)}</option>`
                ).join('')}
            </select>
            <select class="fs" onchange="AppState.filters.athletes.st=this.value;go('athletes')">
                <option value="">Tüm Durumlar</option>
                <option value="active"${f.st === 'active' ? ' selected' : ''}>Aktif</option>
                <option value="inactive"${f.st === 'inactive' ? ' selected' : ''}>Pasif</option>
            </select>
            <select class="fs" onchange="AppState.filters.athletes.cls=this.value;go('athletes')">
                <option value="">Tüm Sınıflar</option>
                ${AppState.data.classes.map(c => 
                    `<option value="${FormatUtils.escape(c.id)}"${f.cls === c.id ? ' selected' : ''}>${FormatUtils.escape(c.name)}</option>`
                ).join('')}
            </select>
        </div>
        <input class="fs" type="text" placeholder="&#x1F50D; İsim veya TC Ara..." 
               style="max-width:250px" value="${FormatUtils.escape(f.q)}" 
               onchange="AppState.filters.athletes.q=this.value;go('athletes')"/>
    </div>
    <div class="flex fjb fca mb3 gap2">
        ${isAdmin ? `<button class="btn bp" onclick="editAth()">+ Yeni Sporcu</button>` : '<div></div>'}
        ${isAdmin ? `<div class="flex gap2">
            <button class="btn bsu" onclick="importAthletesFromExcel()">&#x1F4CA; Excel'den İçe Aktar</button>
            <button class="btn bs" onclick="exportAthletes()">&#x1F4E4; Excel İndir</button>
        </div>` : ''}
    </div>
    <div class="card">
        <div class="tw">
            <table>
                <thead>
                    <tr>
                        <th>Ad Soyad</th>
                        <th>TC</th>
                        <th>Branş</th>
                        <th>Sınıf</th>
                        <th>Durum</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    ${list.map(a => `
                    <tr>
                        <td>
                            <div class="flex fca gap2">
                                ${UIUtils.getAvatar(36, null, FormatUtils.initials(a.fn, a.ln))}
                                <div>
                                    <div class="tw6">${FormatUtils.escape(a.fn)} ${FormatUtils.escape(a.ln)}</div>
                                    <div class="ts tm">${DateUtils.age(a.bd)} yaş</div>
                                </div>
                            </div>
                        </td>
                        <td>${FormatUtils.escape(a.tc)}</td>
                        <td>${sportEmoji(a.sp)} ${FormatUtils.escape(a.sp)}</td>
                        <td>${FormatUtils.escape(className(a.clsId))}</td>
                        <td><span class="bg ${statusClass(a.st)}">${statusLabel(a.st)}</span></td>
                        <td>
                            <button class="btn btn-xs bp" onclick="go('athleteProfile', {id:'${a.id}'})">Profil</button>
                            <button class="btn btn-xs bs" onclick="editAth('${a.id}')">Düzenle</button>
                            <button class="btn btn-xs bd" onclick="delAth('${a.id}')">Sil</button>
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
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
        <label>Sporcu Şifresi (Boş = TC son 4)</label>
        <input id="a-sppass" type="text" placeholder="Örn: 123456" value="${FormatUtils.escape(a?.spPass || '')}"/>
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
                spPass: UIUtils.getValue('a-sppass') || '',
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
            console.log('Saving athlete:', mapped);
            
            const result = await DB.upsert('athletes', mapped);
            if (result) {
                if (isNew) {
                    AppState.data.athletes.push(obj);
                } else {
                    const idx = AppState.data.athletes.findIndex(x => x.id === obj.id);
                    if (idx >= 0) AppState.data.athletes[idx] = obj;
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
                                <button class="btn btn-xs bsu" style="margin-right:4px" onclick="viewClassAthletes('${c.id}')">Öğrenciler</button>
                                <button class="btn btn-xs bp" onclick="editClass('${c.id}')">Düzenle</button>
                                <button class="btn btn-xs bd" onclick="delClass('${c.id}')">Sil</button>
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
                        <td><button class="btn btn-xs bp" onclick="go('athleteProfile', {id:'${a.id}'}); closeModal()">Profil</button></td>
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
                    <button class="btn btn-xs bd" onclick="delSport('${s.id}')">Sil</button>
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
                <div class="flex fca gap2" style="flex:1;cursor:pointer" onclick="go('athleteProfile', {id:'${a.id}'})">
                    ${UIUtils.getAvatar(32, null, FormatUtils.initials(a.fn, a.ln))}
                    <div>
                        <div class="tw6 tsm">${FormatUtils.escape(`${a.fn} ${a.ln}`)}</div>
                        <div class="ts tm">${FormatUtils.escape(className(a.clsId))}</div>
                    </div>
                </div>
                <div class="att-btns">
                    <button class="att-b${st === 'P' ? ' ap' : ''}" onclick="event.stopPropagation();setAtt('${a.id}', 'P')">Var</button>
                    <button class="att-b${st === 'A' ? ' aa' : ''}" onclick="event.stopPropagation();setAtt('${a.id}', 'A')">Yok</button>
                    <button class="att-b${st === 'E' ? ' al2' : ''}" onclick="event.stopPropagation();setAtt('${a.id}', 'E')">İzinli</button>
                    <button class="att-b" onclick="event.stopPropagation();setAtt('${a.id}')">Sil</button>
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
                toast('Yoklama kaydedilemedi: ' + (e.message || e), 'e');
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
    const total = list.reduce((s, p) => s + (p.ty === 'income' ? (p.amt || 0) : -(p.amt || 0)), 0);
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
                        <button class="btn btn-sm bp" onclick="approvePayment('${p.id}')">✅ Onayla</button>
                        <button class="btn btn-sm bd" onclick="rejectPayment('${p.id}')">❌ Reddet</button>
                    </div>
                </div>
            </div>`;
        }).join('')}
    </div>` : '';

    // Ödeme Planları sekmesi içeriği
    const planlar = (AppState.data.payments || []).filter(p => p.source === 'plan');
    const planSection = `
    <div class="card mb3" style="border-left:4px solid var(--blue2)">
        <div class="flex fjb fca mb3">
            <div class="tw6 tsm">📅 Sporcu Ödeme Planı Oluştur</div>
        </div>
        <div class="g21 mb2">
            <div class="fgr">
                <label>Sporcu *</label>
                <select id="plan-aid" onchange="updatePlanFee()">
                    <option value="">Sporcu Seçin</option>
                    ${AppState.data.athletes.map(a => `<option value="${a.id}" data-fee="${a.fee||0}">${FormatUtils.escape(a.fn+' '+a.ln)}</option>`).join('')}
                </select>
            </div>
            <div class="fgr">
                <label>Ödeme Tutarı (₺) *</label>
                <input id="plan-amt" type="number" placeholder="Aylık tutar"/>
            </div>
        </div>
        <div class="g21 mb2">
            <div class="fgr">
                <label>Ay *</label>
                <input id="plan-month" type="month" value="${DateUtils.today().slice(0,7)}"/>
            </div>
            <div class="fgr">
                <label>Açıklama</label>
                <input id="plan-desc" placeholder="Örn: Ocak Aidatı"/>
            </div>
        </div>
        <div class="flex gap2 mb3">
            <button class="btn bp" onclick="createPaymentPlan()">+ Tek Ay Ekle</button>
            <button class="btn bs" onclick="showBulkPlanModal()">📆 Toplu Plan Oluştur</button>
        </div>
    </div>
    <div class="card">
        <div class="tw6 tsm mb2">📋 Mevcut Ödeme Planları</div>
        ${planlar.length === 0 ? '<p class="tm ts">Henüz ödeme planı oluşturulmadı.</p>' : `
        <div class="tw"><table>
            <thead><tr><th>Sporcu</th><th>Ay</th><th>Tutar</th><th>Durum</th><th>İşlem</th></tr></thead>
            <tbody>
            ${planlar.sort((a,b)=>b.dt.localeCompare(a.dt)).map(p => `
            <tr>
                <td class="tw6" style="cursor:pointer;color:var(--blue2)" onclick="go('athleteProfile',{id:'${p.aid}'})">${FormatUtils.escape(p.an)}</td>
                <td>${FormatUtils.escape(p.ds||DateUtils.format(p.dt))}</td>
                <td class="tw6 tg">${FormatUtils.currency(p.amt)}</td>
                <td><span class="bg ${p.st==='completed'?'bg-g':p.st==='overdue'?'bg-r':'bg-y'}">${statusLabel(p.st)}</span></td>
                <td>
                    <button class="btn btn-xs bp" onclick="editPay('${p.id}')">Düzenle</button>
                    <button class="btn btn-xs bd" onclick="delPay('${p.id}')">Sil</button>
                </td>
            </tr>`).join('')}
            </tbody>
        </table></div>`}
    </div>`;

    return `
    <div class="ph"><div class="stit">Ödemeler</div></div>
    ${notifSection}
    <div class="flex gap2 mb3" style="border-bottom:1px solid var(--border);padding-bottom:0">
        <button onclick="AppState.ui.paymentsTab='islemler';go('payments')" style="padding:10px 18px;border:none;cursor:pointer;border-bottom:${activeTab==='islemler'?'2px solid var(--blue2)':'2px solid transparent'};background:none;color:${activeTab==='islemler'?'var(--blue2)':'var(--text2)'};font-weight:${activeTab==='islemler'?'700':'400'};font-size:14px">💳 Tüm İşlemler</button>
        <button onclick="AppState.ui.paymentsTab='planlar';go('payments')" style="padding:10px 18px;border:none;cursor:pointer;border-bottom:${activeTab==='planlar'?'2px solid var(--blue2)':'2px solid transparent'};background:none;color:${activeTab==='planlar'?'var(--blue2)':'var(--text2)'};font-weight:${activeTab==='planlar'?'700':'400'};font-size:14px">📅 Ödeme Planları</button>
    </div>
    ${activeTab === 'planlar' ? planSection : `
    <div class="flex fjb fca mb3 gap2">
        <button class="btn bp" onclick="editPay()">+ Yeni İşlem</button>
        <div>
            <button class="btn bs" onclick="exportPayments()" style="margin-right:8px">&#x1F4E4; İndir</button>
            <span class="tw6 tb">Net: ${FormatUtils.currency(total)}</span>
        </div>
    </div>
    <div class="card">
        <div class="tw">
            <table>
                <thead><tr>
                    <th>Tarih</th><th>Kişi/Kurum</th><th>Açıklama</th><th>Yöntem</th><th>Tutar</th><th>Tür</th><th>Durum</th><th>İşlemler</th>
                </tr></thead>
                <tbody>
                    ${list.map(p => {
                        const mIcon = p.payMethod==='nakit'?'💵':p.payMethod==='kredi_karti'?'💳':p.payMethod==='havale'?'🏦':p.payMethod==='paytr'?'🔵':'';
                        const notifBadge = p.notifStatus==='pending_approval'?'<span class="bg bg-y" style="font-size:10px">Onay Bekliyor</span>':'';
                        return `<tr>
                            <td>${DateUtils.format(p.dt)}</td>
                            <td>${p.aid?`<span class="tw6" style="cursor:pointer;color:var(--blue2)" onclick="go('athleteProfile',{id:'${p.aid}'})">${FormatUtils.escape(p.an)}</span>`:FormatUtils.escape(p.an)}</td>
                            <td>${FormatUtils.escape(p.serviceName||p.ds||'-')}</td>
                            <td>${mIcon} ${FormatUtils.escape(p.payMethod||'-')}</td>
                            <td class="tw6 ${p.ty==='income'?'tg':'tr2'}">${FormatUtils.currency(p.amt)}</td>
                            <td><span class="bg ${statusClass(p.ty)}">${statusLabel(p.ty)}</span></td>
                            <td><span class="bg ${statusClass(p.st)}">${statusLabel(p.st)}</span> ${notifBadge}</td>
                            <td>
                                <button class="btn btn-xs bp" onclick="editPay('${p.id}')">Düzenle</button>
                                <button class="btn btn-xs bd" onclick="delPay('${p.id}')">Sil</button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
        </div>
    </div>`}`;
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
                serviceName: ds
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

// Tek ay ödeme planı oluştur
window.createPaymentPlan = async function() {
    const aid = document.getElementById('plan-aid')?.value;
    const amt = parseFloat(document.getElementById('plan-amt')?.value);
    const month = document.getElementById('plan-month')?.value; // YYYY-MM
    const desc = document.getElementById('plan-desc')?.value?.trim();

    if (!aid) { toast('Sporcu seçiniz!', 'e'); return; }
    if (!amt || amt <= 0) { toast('Tutar giriniz!', 'e'); return; }
    if (!month) { toast('Ay seçiniz!', 'e'); return; }

    const ath = AppState.data.athletes.find(a => a.id === aid);
    const dt = month + '-01';
    const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    const [y, m] = month.split('-');
    const autoDesc = desc || `${months[parseInt(m)-1]} ${y} Aidatı`;

    // Aynı sporcu + aynı ay zaten var mı?
    const exists = AppState.data.payments.find(p => p.source === 'plan' && p.aid === aid && p.dt === dt);
    if (exists) { toast('Bu sporcu için bu ay zaten plan mevcut!', 'e'); return; }

    const obj = {
        id: generateId(), aid, an: `${ath.fn} ${ath.ln}`,
        amt, dt, ty: 'income', st: 'pending',
        ds: autoDesc, serviceName: autoDesc,
        source: 'plan', notifStatus: '', payMethod: ''
    };
    const result = await DB.upsert('payments', DB.mappers.fromPayment(obj));
    if (result) {
        AppState.data.payments.push(obj);
        toast(`✅ ${ath.fn} ${ath.ln} için ${autoDesc} planı oluşturuldu!`, 'g');
        // Sporcu aylık ücretini de güncelle
        const athIdx = AppState.data.athletes.findIndex(a => a.id === aid);
        if (athIdx >= 0) AppState.data.athletes[athIdx].fee = amt;
        go('payments');
    }
};

// Toplu plan oluştur modal
window.showBulkPlanModal = function() {
    const months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    const now = new Date();
    modal('📆 Toplu Ödeme Planı Oluştur', `
    <div class="al al-b mb3" style="font-size:13px">
        Seçili sporcu için başlangıç ayından itibaren belirtilen ay sayısı kadar plan oluşturur.
    </div>
    <div class="fgr mb2">
        <label>Sporcu *</label>
        <select id="bulk-aid">
            <option value="">Sporcu Seçin</option>
            ${AppState.data.athletes.map(a => `<option value="${a.id}" data-fee="${a.fee||0}">${FormatUtils.escape(a.fn+' '+a.ln)}</option>`).join('')}
        </select>
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
        <input id="bulk-amt" type="number" placeholder="Sporcu seçince otomatik dolar"/>
    </div>
    `, [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: '✅ Planları Oluştur', cls: 'bp', fn: async () => {
            const aid = document.getElementById('bulk-aid')?.value;
            const startMonth = document.getElementById('bulk-start')?.value;
            const count = parseInt(document.getElementById('bulk-count')?.value) || 0;
            const amt = parseFloat(document.getElementById('bulk-amt')?.value) || 0;
            if (!aid || !startMonth || count < 1 || amt <= 0) { toast('Tüm alanları doldurun!', 'e'); return; }
            const ath = AppState.data.athletes.find(a => a.id === aid);
            let created = 0;
            const [sy, sm] = startMonth.split('-').map(Number);
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
            toast(`✅ ${created} aylık plan oluşturuldu!`, 'g');
            closeModal();
            go('payments');
        }}
    ]);
    // Sporcu seçince fee'yi doldur
    setTimeout(() => {
        const sel = document.getElementById('bulk-aid');
        const amtInput = document.getElementById('bulk-amt');
        if (sel && amtInput) sel.addEventListener('change', () => {
            const opt = sel.options[sel.selectedIndex];
            if (opt?.dataset?.fee && opt.dataset.fee !== '0') amtInput.value = opt.dataset.fee;
        });
    }, 50);
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
            toast(`✅ ${p.an} ödemesi onaylandı!`, 'g');
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
                            <button class="btn btn-xs bp" onclick="editCoach('${c.id}')">Düzenle</button>
                            <button class="btn btn-xs bd" onclick="delCoach('${c.id}')">Sil</button>
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
        <label>Özel Şifre (Boş = TC son 4)</label>
        <input id="c-pass" placeholder="Örn: 1234" value="${FormatUtils.escape(c?.coachPass || '')}"/>
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
            
            const obj = {
                id: c?.id || generateId(),
                orgId: c?.orgId || AppState.currentOrgId,
                branchId: c?.branchId || AppState.currentBranchId,
                fn, ln, tc,
                ph: UIUtils.getValue('c-ph') || '',
                sp: UIUtils.getValue('c-sp') || '',
                em: UIUtils.getValue('c-em') || '',
                sal: UIUtils.getNumber('c-sal') || 0,
                coachPass: UIUtils.getValue('c-pass') || '',
                st: 'active'
            };
            
            const mapped = DB.mappers.fromCoach(obj);
            console.log('Saving coach:', mapped);
            
            const result = await DB.upsert('coaches', mapped);
            if (result) {
                if (isNew) {
                    AppState.data.coaches.push(obj);
                } else {
                    const idx = AppState.data.coaches.findIndex(x => x.id === obj.id);
                    if (idx >= 0) AppState.data.coaches[idx] = obj;
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
        <div class="stit" data-i18n="menuSms">SMS Duyuru</div>
    </div>
    <div class="card">
        <div class="al al-y mb3">
            <strong>Bilgi:</strong> SMS gönderimi için NetGSM entegrasyonu gereklidir.
        </div>
        <div class="fgr mb2">
            <label>Alıcı Grubu</label>
            <select id="sms-group">
                <option value="all">Tüm Aktif Sporcular</option>
                <option value="overdue">Gecikmiş Ödemesi Olanlar</option>
            </select>
        </div>
        <div class="fgr mb2">
            <label>Mesaj İçeriği</label>
            <textarea id="sms-body" rows="4" maxlength="160" placeholder="Mesajınızı yazın..."></textarea>
        </div>
        <button class="btn bp w100" onclick="sendBulkSms()">Gönder</button>
    </div>`;
}

window.sendBulkSms = function() {
    const body = UIUtils.getValue('sms-body');
    if (!body) {
        toast('Mesaj içeriği giriniz!', 'e');
        return;
    }
    toast('SMS gönderimi simüle edildi', 'g');
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
        <button class="btn bp mt2" onclick="saveGeneralSettings()">Genel Ayarları Kaydet</button>
    </div>

    <div class="card mb3" style="border-left: 4px solid var(--green)">
        <div class="tw6 tsm mb2">&#x1F4F1; SMS Entegrasyonu (NetGSM)</div>
        <div class="g21">
            <div class="fgr mb2">
                <label>NetGSM Kullanıcı Adı</label>
                <input id="s-smsuser" value="${FormatUtils.escape(s?.netgsmUser || '')}"/>
            </div>
            <div class="fgr mb2">
                <label>NetGSM Şifre</label>
                <input id="s-smspass" type="password" value="${FormatUtils.escape(s?.netgsmPass || '')}"/>
            </div>
        </div>
        <div class="fgr mb2">
            <label>SMS Başlığı (Header)</label>
            <input id="s-smsheader" value="${FormatUtils.escape(s?.netgsmHeader || '')}" placeholder="Örn: AKADEMI"/>
        </div>
        <button class="btn bp mt2" onclick="saveSmsSettings()">SMS Ayarlarını Kaydet</button>
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
            &#x2139;&#xFE0F; PayTR ile veliler online kredi kartı ödemesi yapabilir. Webhook için Supabase Edge Function gereklidir.<br>
            <strong>Webhook URL:</strong> <code style="font-size:11px">${window?.location?.origin || 'https://siteniz.com'}/functions/v1/paytr-webhook</code>
        </div>
        <div class="g21 mb2">
            <div class="fgr">
                <label>Merchant ID</label>
                <input id="s-paytr-mid" value="${FormatUtils.escape(s?.paytrMerchantId || '')}" placeholder="PayTR panelinden alın"/>
            </div>
            <div class="fgr">
                <label>Merchant Key</label>
                <input id="s-paytr-key" type="password" value="${FormatUtils.escape(s?.paytrMerchantKey || '')}"/>
            </div>
        </div>
        <div class="fgr mb2">
            <label>Merchant Salt</label>
            <input id="s-paytr-salt" type="password" value="${FormatUtils.escape(s?.paytrMerchantSalt || '')}"/>
        </div>
        <div class="al al-y mb2" style="font-size:12px">
            &#x26A0; Token hesaplama ve güvenlik için <strong>Supabase Edge Function</strong> deploy edilmelidir.
            Fonksiyon kodu için dökümanı inceleyin.
        </div>
        <button class="btn bp" onclick="savePayTRSettings()">PayTR Ayarlarını Kaydet</button>
    </div>

    <div class="card mb3" style="border-left: 4px solid var(--yellow)">
        <div class="flex fjb fca mb3">
            <div class="tw6 tsm">&#x1F4DD; Ön Kayıt Başvuruları</div>
            <span style="background:rgba(234,179,8,.15);color:var(--yellow);border:1px solid rgba(234,179,8,.3);padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700">
                ${onKayitList.filter(o => o.status === 'new').length} Yeni
            </span>
        </div>
        ${onKayitList.length === 0 ? '<p class="tm ts">Henüz ön kayıt başvurusu bulunmuyor.</p>' :
          onKayitList.map(ok => `
          <div class="onkayit-card">
              <div class="ok-header mb2">
                  <div>
                      <div class="tw6">${FormatUtils.escape(ok.studentName)}</div>
                      <div class="ts tm">${DateUtils.format(ok.birthDate)} • ${FormatUtils.escape(ok.className || '-')}</div>
                  </div>
                  <span class="${ok.status === 'new' ? 'ok-badge-new' : 'ok-badge-done'}">${ok.status === 'new' ? 'Yeni' : 'İşlendi'}</span>
              </div>
              <div class="ts tm mb2">Veli: ${FormatUtils.escape(ok.parentName)} • ${FormatUtils.escape(ok.parentPhone)}</div>
              <div class="ts tm mb2">TC: ${FormatUtils.escape(ok.tc || '-')}</div>
              <div class="flex gap2">
                  ${ok.status === 'new' ? `
                  <button class="btn bsu btn-sm" onclick="convertOnKayit('${ok.id}')">Sporcuya Dönüştür</button>
                  <button class="btn bs btn-sm" onclick="markOnKayitDone('${ok.id}')">İşaretlendi</button>
                  ` : ''}
                  <button class="btn bd btn-sm" onclick="delOnKayit('${ok.id}')">Sil</button>
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
        ownerPhone: UIUtils.getValue('s-phone')
    };
    const result = await DB.upsert('settings', DB.mappers.fromSettings(obj));
    if (result) {
        AppState.data.settings = obj;
        toast(i18n[AppState.lang].saveSuccess, 'g');
        updateBranchUI();
    }
};

window.saveSmsSettings = async function() {
    const obj = {
        ...(AppState.data.settings || {}),
        netgsmUser: UIUtils.getValue('s-smsuser'),
        netgsmPass: UIUtils.getValue('s-smspass'),
        netgsmHeader: UIUtils.getValue('s-smsheader')
    };
    const result = await DB.upsert('settings', DB.mappers.fromSettings(obj));
    if (result) {
        AppState.data.settings = obj;
        toast('SMS ayarları kaydedildi!', 'g');
    }
};

window.savePayTRSettings = async function() {
    const obj = {
        ...(AppState.data.settings || {}),
        paytrMerchantId: UIUtils.getValue('s-paytr-mid').trim(),
        paytrMerchantKey: UIUtils.getValue('s-paytr-key').trim(),
        paytrMerchantSalt: UIUtils.getValue('s-paytr-salt').trim(),
        paytrActive: document.getElementById('s-paytr-active')?.checked || false
    };
    const result = await DB.upsert('settings', DB.mappers.fromSettings(obj));
    if (result) {
        AppState.data.settings = obj;
        toast('PayTR ayarları kaydedildi!', 'g');
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
        if (preview) preview.innerHTML = '<img src="' + dataUrl + '" style="width:100%;height:100%;object-fit:cover"/>';
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
        { lbl: '&#x2795; Yönetici Ekle', cls: 'bp', fn: async () => {
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
                
                // Fetch API ile Supabase Auth Admin endpoint'i — bu mevcut session'ı bozmaz
                // Bunun yerine doğrudan users tablosuna kayıt edip email ile davet edelim
                // signUp mevcut session'ı bozar, bu yüzden önce veritabanına kaydedelim
                
                const newUserId = generateId();
                
                // Önce users tablosuna ekle (email doğrulaması beklemeden görünür olsun)
                const insertResult = await sb.from('users').insert({
                    id: newUserId,
                    email: email,
                    name: name || email.split('@')[0],
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
                
                // signUp ile Supabase Auth'a da ekle (session değişebilir)
                let signupOk = false;
                try {
                    const { error: signupErr } = await sb.auth.signUp({
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
                    if (!signupErr) signupOk = true;
                } catch(signupEx) { /* ignore */ }
                
                // Oturumu geri yükle — signUp bozmuş olabilir
                try {
                    await sb.auth.signInWithPassword({
                        email: currentUserBackup.email,
                        password: '__restore__' // Bu başarısız olacak, sadece deniyoruz
                    });
                } catch(e) { /* ignore — session token hâlâ geçerli olabilir */ }
                
                // AppState'i kesinlikle geri yükle
                AppState.currentUser = currentUserBackup;
                AppState.currentOrgId = currentOrgBackup;
                AppState.currentBranchId = currentBranchBackup;
                AppState.data = currentDataBackup;
                StorageManager.set('sporcu_app_user', currentUserBackup);
                StorageManager.set('sporcu_app_org', currentOrgBackup);
                StorageManager.set('sporcu_app_branch', currentBranchBackup);
                
                toast(signupOk 
                    ? `✅ Yönetici eklendi! ${email} adresine onay bağlantısı gönderildi.`
                    : `✅ Yönetici veritabanına eklendi. Supabase Dashboard'dan auth kaydını tamamlayın.`, 
                    'g');
                closeModal();
                
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
        .filter(d => AppState.data.attendance[d][a.id])
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

    // Sadece tamamlanmış (onaylanmış) ödemeler
    const completed = AppState.data.payments
        .filter(p => p.aid === a.id && p.st === 'completed')
        .sort((x, y) => new Date(y.dt) - new Date(x.dt));

    // Sporcu tarafından bildirilmiş, henüz yönetici onaylamadığı
    const pending = AppState.data.payments
        .filter(p => p.aid === a.id && p.notifStatus === 'pending_approval')
        .sort((x, y) => new Date(y.dt) - new Date(x.dt));

    const totalPaid  = completed.reduce((s, p) => s + (p.amt || 0), 0);

    const mIcon  = m => ({ nakit:'💵', kredi_karti:'💳', havale:'🏦', paytr:'🔵' }[m] || '💰');
    const mLabel = m => ({ nakit:'Nakit', kredi_karti:'Kredi Kartı', havale:'Havale/EFT', paytr:'PayTR Online' }[m] || (m || 'Ödeme'));

    return `
    <div class="sp-stats-row mb3">
        <div class="stat-box">
            <div class="stat-box-value tg">${FormatUtils.currency(totalPaid)}</div>
            <div class="stat-box-label">Toplam Ödenen</div>
        </div>
        <div class="stat-box">
            <div class="stat-box-value tb">${completed.length}</div>
            <div class="stat-box-label">Onaylanan</div>
        </div>
        <div class="stat-box">
            <div class="stat-box-value ${pending.length > 0 ? 'ty' : 'tg'}">${pending.length}</div>
            <div class="stat-box-label">Bekleyen</div>
        </div>
    </div>

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

    const planRows = myPlans.length > 0
        ? myPlans.map(p => {
            const isOverdue = p.st === 'overdue';
            const today = DateUtils.today();
            const isLate  = !isOverdue && p.dt && p.dt < today;
            const badge = isOverdue || isLate
                ? `<span class="bg bg-r">Gecikmiş</span>`
                : `<span class="bg bg-y">Bekliyor</span>`;
            return `
            <div class="plan-card${isOverdue || isLate ? ' plan-card-overdue' : ''}">
                <div class="plan-card-left">
                    <div class="plan-card-icon">${isOverdue || isLate ? '⚠️' : '📅'}</div>
                    <div class="plan-card-info">
                        <div class="tw6 ts">${FormatUtils.escape(p.ds || p.serviceName || 'Aidat')}</div>
                        <div class="ts tm mt1">Vade: ${DateUtils.format(p.dt)}</div>
                        <div class="tw6 ts tg mt1">${FormatUtils.currency(p.amt)}</div>
                    </div>
                </div>
                <div class="plan-card-right">
                    ${badge}
                    <button class="btn bp btn-sm mt2" onclick="spPayPlan('${p.id}')">💳 Öde</button>
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
        <div class="plan-list">${planRows}</div>
    </div>

    <div class="card" id="sp-pay-form" style="display:none">
        <div class="sp-pay-form-header mb3">
            <div class="tw6 tsm">💳 Ödeme Yöntemi Seç</div>
            <button class="btn bs btn-sm" onclick="document.getElementById('sp-pay-form').style.display='none'">✕ Kapat</button>
        </div>
        <div id="sp-plan-info" class="sp-plan-info-box mb3"></div>
        <div class="pay-methods-grid mb3">
            <button class="pay-method-btn" id="pm-nakit" onclick="selectPayMethod('nakit')">
                <div class="pay-method-icon">💵</div><div class="tw6 ts">Nakit</div>
            </button>
            <button class="pay-method-btn" id="pm-kredi_karti" onclick="selectPayMethod('kredi_karti')">
                <div class="pay-method-icon">💳</div><div class="tw6 ts">Kredi Kartı</div>
            </button>
            ${hasBank ? `<button class="pay-method-btn" id="pm-havale" onclick="selectPayMethod('havale')">
                <div class="pay-method-icon">🏦</div><div class="tw6 ts">Havale/EFT</div>
            </button>` : ''}
            ${hasPayTR ? `<button class="pay-method-btn" id="pm-paytr" onclick="selectPayMethod('paytr')">
                <div class="pay-method-icon">🔵</div><div class="tw6 ts">PayTR Online</div>
            </button>` : ''}
        </div>
        <div id="pay-method-detail" class="mb2"></div>
        <div class="fgr mb2">
            <label>Açıklama <span class="tm ts">(opsiyonel)</span></label>
            <input id="sp-desc" placeholder="Ödeme notu ekleyin..."/>
        </div>
        <button class="btn bp w100 mt2" id="pay-submit-btn" style="display:none" onclick="submitSpPayment()">Bildirim Gönder</button>
    </div>`;
}

window.spPayPlan = function(planId) {
    AppState.ui.activePlanId = planId;
    const p = AppState.data.payments.find(x => x.id === planId);
    if (!p) return;
    const form = document.getElementById('sp-pay-form');
    const info = document.getElementById('sp-plan-info');
    const descInput = document.getElementById('sp-desc');
    if (form) form.style.display = 'block';
    if (info) info.innerHTML = `<strong>${FormatUtils.escape(p.ds||p.serviceName||'Aidat')}</strong> — <span class="tg tw6">${FormatUtils.currency(p.amt)}</span>`;
    if (descInput) descInput.value = p.ds || p.serviceName || 'Aidat ödemesi';
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

    if (method === 'nakit') {
        detail.innerHTML = `
        <div class="al al-b" style="border-radius:10px;padding:14px;margin-bottom:12px">
            <div class="tw6 mb1">💵 Nakit Ödeme</div>
            <p class="ts tm">Nakit ödeme için akademi merkezine gelin. Teslim ettikten sonra bildirim gönderin, yönetici onaylayacaktır.</p>
        </div>`;
        submitBtn.textContent = '📩 Nakit Ödeme Bildirimi Gönder';
        submitBtn.style.display = 'block';
    } else if (method === 'kredi_karti') {
        detail.innerHTML = `
        <div class="al al-b" style="border-radius:10px;padding:14px;margin-bottom:12px">
            <div class="tw6 mb1">💳 Kredi Kartı ile Ödeme</div>
            <p class="ts tm">Akademiye gelin veya yöneticiye başvurun. Ödemenizi yaptıktan sonra bildirim gönderin; yönetici POS slip kodunu girecektir.</p>
        </div>`;
        submitBtn.textContent = '📩 Kredi Kartı Ödeme Bildirimi Gönder';
        submitBtn.style.display = 'block';
    } else if (method === 'havale') {
        detail.innerHTML = `
        <div class="al al-b" style="border-radius:10px;padding:14px;margin-bottom:12px">
            <div class="tw6 mb2">🏦 Havale / EFT Bilgileri</div>
            <div class="ts mb1"><strong>Banka:</strong> ${FormatUtils.escape(s?.bankName || '-')}</div>
            <div class="ts mb1"><strong>Hesap Adı:</strong> ${FormatUtils.escape(s?.accountName || '-')}</div>
            <div class="ts" style="word-break:break-all"><strong>IBAN:</strong> <span style="font-family:monospace">${FormatUtils.escape(s?.iban || '-')}</span></div>
            <p class="ts tm mt2">Havaleyi yaptıktan sonra aşağıdan bildirim gönderin.</p>
        </div>`;
        submitBtn.textContent = '📩 Havale Bildirimi Gönder';
        submitBtn.style.display = 'block';
    } else if (method === 'paytr') {
        detail.innerHTML = `
        <div class="al al-b" style="border-radius:10px;padding:14px;margin-bottom:12px">
            <div class="tw6 mb1">🔵 PayTR ile Online Ödeme</div>
            <p class="ts tm">Güvenli ödeme sayfasına yönlendirileceksiniz.</p>
        </div>`;
        submitBtn.textContent = '🔵 PayTR ile Ödemeye Geç';
        submitBtn.style.display = 'block';
    }
};

window.submitSpPayment = async function() {
    const desc = UIUtils.getValue('sp-desc');
    const method = AppState.ui.selectedPayMethod;
    const a = AppState.currentSporcu;
    const planId = AppState.ui.activePlanId;

    if (!method) { toast('Lütfen ödeme yöntemi seçiniz!', 'e'); return; }

    // Plan varsa plan tutarını kullan, yoksa sporcunun aylık ücretini
    const plan = planId ? AppState.data.payments.find(p => p.id === planId) : null;
    const amt = plan ? plan.amt : (a.fee || 0);
    if (!amt || amt <= 0) { toast('Ödenecek tutar bulunamadı!', 'e'); return; }

    if (method === 'paytr') {
        await initiatePayTRPayment(amt, desc);
        return;
    }

    const payObj = {
        id: generateId(),
        aid: a.id,
        an: `${a.fn} ${a.ln}`,
        amt,
        ds: desc || plan?.ds || 'Veli bildirimi',
        st: 'pending',
        dt: DateUtils.today(),
        ty: 'income',
        serviceName: desc || plan?.ds || 'Veli bildirimi',
        source: 'parent_notification',
        notifStatus: 'pending_approval',
        payMethod: method
    };

    const sb = getSupabase();
    if (sb) {
        try {
            const { error } = await sb.from('payments').insert(DB.mappers.fromPayment(payObj));
            if (error) throw error;
            AppState.data.payments.push(payObj);
            const methodLabel = method === 'nakit' ? 'Nakit' : method === 'kredi_karti' ? 'Kredi Kartı' : 'Havale';
            toast(`✅ ${methodLabel} ödeme bildiriminiz alındı! Yönetici onaylayacak.`, 'g');
            AppState.ui.activePlanId = null;
            document.getElementById('sp-pay-form').style.display = 'none';
            spTab('odemeler');
        } catch(e) {
            toast('Bildirim gönderilemedi: ' + (e.message || e), 'e');
        }
    } else {
        toast('Bağlantı hatası.', 'e');
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
    
    // PayTR iframe token Supabase Edge Function üzerinden alınır
    // Edge function URL: /functions/v1/paytr-token
    const sb = getSupabase();
    if (!sb) { toast('Bağlantı hatası', 'e'); return; }
    
    UIUtils.setLoading(true);
    try {
        const orderId = `PAY-${a.id.slice(0,8)}-${Date.now()}`;
        const amtKurus = Math.round(amt * 100); // PayTR kuruş cinsinden ister
        
        // Supabase edge function çağrısı (backend token hesaplar)
        const { data: tokenData, error } = await sb.functions.invoke('paytr-token', {
            body: {
                merchant_id: s.paytrMerchantId,
                merchant_key: s.paytrMerchantKey,
                merchant_salt: s.paytrMerchantSalt,
                merchant_oid: orderId,
                email: a.em || `${a.tc}@veli.local`,
                payment_amount: amtKurus,
                user_name: `${a.fn} ${a.ln}`,
                user_address: 'Türkiye',
                user_phone: a.pph || a.ph || '05000000000',
                merchant_ok_url: window.location.origin + window.location.pathname + '?paytr=ok',
                merchant_fail_url: window.location.origin + window.location.pathname + '?paytr=fail',
                user_basket: JSON.stringify([[desc || 'Aidat', amtKurus, 1]]),
                currency: 'TL',
                test_mode: '0',
                // Ek bilgiler (webhook'ta kullanılır)
                org_id: AppState.currentOrgId,
                branch_id: AppState.currentBranchId,
                athlete_id: a.id,
                athlete_name: `${a.fn} ${a.ln}`
            }
        });
        
        if (error || !tokenData?.token) {
            throw new Error(error?.message || 'Token alınamadı. Edge function çalışıyor mu?');
        }
        
        // Bekleyen ödeme kaydı oluştur (webhook onaylayacak)
        const pendingPay = {
            id: orderId,
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
            payMethod: 'paytr'
        };
        await sb.from('payments').insert(DB.mappers.fromPayment(pendingPay));
        AppState.data.payments.push(pendingPay);
        
        // PayTR iframe aç
        showPayTRModal(tokenData.token, orderId);
        
    } catch(e) {
        console.error('PayTR error:', e);
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
}

// PayTR webhook — Supabase Edge Function'dan çağrılır
// Bu fonksiyon doğrudan frontend'den çağrılmaz ama DB güncellemesi için yardımcı
window.handlePayTRCallback = async function(orderId, status) {
    const sb = getSupabase();
    if (!sb || !orderId) return;
    try {
        if (status === 'success') {
            await sb.from('payments').update({ st: 'completed', source: 'paytr', notif_status: 'approved' }).eq('id', orderId);
            // AppState'i güncelle
            const idx = AppState.data.payments.findIndex(p => p.id === orderId);
            if (idx >= 0) { AppState.data.payments[idx].st = 'completed'; AppState.data.payments[idx].notifStatus = 'approved'; }
            toast('✅ PayTR ödemesi başarıyla tamamlandı!', 'g');
        } else {
            await sb.from('payments').update({ st: 'failed' }).eq('id', orderId);
            toast('❌ Ödeme başarısız. Lütfen tekrar deneyin.', 'e');
        }
        spTab('odemeler');
    } catch(e) { console.error('PayTR callback error:', e); }
};

// URL'de PayTR dönüşü varsa işle
(function checkPayTRReturn() {
    const params = new URLSearchParams(window.location.search);
    const paytrStatus = params.get('paytr');
    const orderId = params.get('oid') || params.get('merchant_oid');
    if (paytrStatus && orderId) {
        setTimeout(() => handlePayTRCallback(orderId, paytrStatus === 'ok' ? 'success' : 'fail'), 1000);
        // URL'i temizle
        window.history.replaceState({}, '', window.location.pathname);
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
            ${u.id !== AppState.currentUser?.id ? `<button class="btn btn-xs bd" onclick="removeAdmin('${u.id}','${FormatUtils.escape(u.email)}')">Sil</button>` : '<span class="ts tm">(Siz)</span>'}
        </div>`).join('');
    } catch(e) {
        area.innerHTML = `<div class="al al-r ts">Yüklenemedi: ${e.message}</div>`;
    }
};

window.removeAdmin = function(uid, email) {
    confirm2('Yönetici Sil', `${email} adlı yöneticiyi silmek istediğinize emin misiniz?`, async () => {
        try {
            const sb = getSupabase();
            if (!sb) throw new Error('Bağlantı yok');
            const { error } = await sb.from('users').delete().eq('id', uid);
            if (error) throw error;
            toast('Yönetici silindi.', 'g');
            loadAndShowAdmins();
        } catch(e) {
            toast('Silinemedi: ' + e.message, 'e');
        }
    });
};

// AppState'e onKayitlar ekle
if (!AppState.data.onKayitlar) AppState.data.onKayitlar = [];

window.showOnKayitForm = async function() {
    // Sınıfları yükle (giriş yapmadan da)
    let classes = AppState.data.classes || [];
    
    if (classes.length === 0) {
        // Mevcut org'dan veya genel branch'tan çek
        try {
            const sb = getSupabase();
            if (sb) {
                const { data } = await sb.from('classes').select('*').limit(50);
                if (data) classes = data.map(DB.mappers.toClass);
            }
        } catch(e) { /* ignore */ }
    }
    
    const classOptions = classes.map(c => 
        `<option value="${FormatUtils.escape(c.id)}" data-name="${FormatUtils.escape(c.name)}">${FormatUtils.escape(c.name)}</option>`
    ).join('');
    
    const formHtml = `
    <div id="onkayit-modal" style="position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:2000;padding:16px;">
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
                    <label>Veli Telefon * (SMS gönderilecek)</label>
                    <input id="ok-pph" type="tel" placeholder="05XX XXX XX XX"/>
                </div>
                <div style="font-size:12px;color:var(--text3)">📱 Kayıt onayı SMS olarak gönderilecektir.</div>
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
    
    const onKayit = {
        id: generateId(),
        studentName: `${fn} ${ln}`,
        fn, ln, bd, tc,
        clsId, className: clsName,
        parentName: psn ? `${pn} ${psn}` : pn,
        parentPhone: pph,
        status: 'new',
        createdAt: DateUtils.today(),
        orgId: AppState.currentOrgId,
        branchId: AppState.currentBranchId
    };
    
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
    
    // SMS gönder
    await sendOnKayitSms(pph, fn, ln, clsName);
    
    document.getElementById('onkayit-modal')?.remove();
    toast(`✅ Ön kayıt alındı! ${pph} numarasına SMS gönderildi.`, 'g');
};

async function sendOnKayitSms(phone, fn, ln, clsName) {
    const settings = AppState.data.settings;
    const smsUser = settings?.netgsmUser;
    const smsPass = settings?.netgsmPass;
    const smsHeader = settings?.netgsmHeader || 'BILGI';
    
    const msg = `Sayin veli, ${fn} ${ln} icin ${clsName} sinifina on kayit talebiniz alinmistir. En kisa surede sizinle iletisime gececegiz. ${settings?.schoolName || 'Akademi'}`;
    
    if (!smsUser || !smsPass) {
        console.log('SMS gönderilemedi - NetGSM ayarları eksik. Mesaj:', msg);
        return;
    }
    
    try {
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, '').replace(/^(\+90|0090|90)/, '');
        const url = `https://api.netgsm.com.tr/sms/send/get/?usercode=${smsUser}&password=${smsPass}&gsmno=${cleanPhone}&message=${encodeURIComponent(msg)}&msgheader=${smsHeader}`;
        await fetch(url, { method: 'GET', mode: 'no-cors' });
        console.log('SMS gönderildi:', cleanPhone);
    } catch(e) {
        console.warn('SMS gönderim hatası:', e);
    }
}

// Ön kayıtları admin panelinde yükle
async function loadOnKayitlar() {
    try {
        const sb = getSupabase();
        if (!sb) return;
        
        // branch_id veya org_id ile sorgula (hangisi doluysa)
        let q = sb.from('on_kayitlar').select('*');
        if (AppState.currentBranchId) {
            q = q.eq('branch_id', AppState.currentBranchId);
        } else if (AppState.currentOrgId) {
            q = q.eq('org_id', AppState.currentOrgId);
        } else {
            return; // ID yoksa çekme
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
    const btn = event?.target;
    if (btn) { btn.textContent = '⏳'; btn.disabled = true; }
    await loadOnKayitlar();
    if (btn) { btn.textContent = '↻ Yenile'; btn.disabled = false; }
    // Şu an athletes sayfasındaysak yeniden render et
    if (AppState.ui.curPage === 'athletes') go('athletes');
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
        go('settings');
    } catch(e) { toast('Hata: ' + e.message, 'e'); }
};

window.delOnKayit = async function(id) {
    confirm2('Ön Kayıt Sil', 'Bu başvuruyu silmek istediğinize emin misiniz?', async () => {
        try {
            const sb = getSupabase();
            if (sb) await sb.from('on_kayitlar').delete().eq('id', id);
            AppState.data.onKayitlar = AppState.data.onKayitlar.filter(x => x.id !== id);
            toast('Silindi', 'g');
            go('settings');
        } catch(e) { toast('Hata: ' + e.message, 'e'); }
    });
};

// ==================== EXCEL IMPORT ====================

window.importAthletesFromExcel = function() {
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
        if (preview) preview.innerHTML = `<div class="al al-r">Dosya okunamadı: ${e.message}</div>`;
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
    
    let success = 0, errors = 0, skipped = 0;
    
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
        if (result) { AppState.data.athletes.push(obj); success++; }
        else errors++;
    }
    
    toast(`✅ ${success} sporcu eklendi${errors > 0 ? `, ${errors} hata` : ''}${skipped > 0 ? `, ${skipped} atlandı` : ''}`, 'g');
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

function convertToCSV(data) {
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
        const loginTabs = document.getElementById('login-tabs');
        const loginSporcu = document.getElementById('login-sporcu');
        const loginCoach = document.getElementById('login-coach');
        const loginAdmin = document.getElementById('login-admin');
        
        if (loginTabs) loginTabs.classList.add('dn');
        if (loginSporcu) loginSporcu.classList.add('dn');
        if (loginCoach) loginCoach.classList.add('dn');
        if (loginAdmin) loginAdmin.classList.remove('dn');
    }
    
    await restoreSession();
});
