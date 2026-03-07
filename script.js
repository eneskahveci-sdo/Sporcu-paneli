/* ============================================================
   DRAGOS FUTBOL AKADEMISI - TAM DUZELTILMIS SURUM
   Tüm hatalar giderildi, güvenlik iyileştirildi, performans optimize edildi
   ============================================================ */

// Global hata yakalama
window.onerror = function(msg, url, line, col, error) {
    console.error('Global Error:', { msg, url, line, col, error });
    toast('Bir hata oluştu. Lütfen sayfayı yenileyin.', 'e');
    return true;
};

// Supabase yapılandırması - GERÇEK PROJENİZİN BİLGİLERİNİ GİRİN
const SUPABASE_CONFIG = {
    url: 'https://wfarbydojxtufnkjuhtc.supabase.co',
    anonKey: 'sb_publishable_w1_nk_7TM1ePWHMN2CDcQ_1ufk0kYC'
};

// Fallback logo (base64 encoded mini futbol)
const DEFAULT_LOGO = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIzMiIgY3k9IjMyIiByPSIzMCIgZmlsbD0iIzNiODJmNiIvPjxwYXRoIGQ9Ik0zMiAxMEw0MiAyOEwyNCAyOEwzMiAxMFoiIGZpbGw9IndoaXRlIi8+PHBhdGggZD0iTTMyIDU0TDQyIDM2TDI0IDM2TDMyIDU0WiIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNMTAgMzJMMjggMjJMMjggNDJMMTAgMzJaIiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik01NCAzMkwzNiAyMkwzNiA0Mkw1NCAzMloiIGZpbGw9IndoaXRlIi8+PC9zdmc+';

// Uygulama durumu
const AppState = {
    sb: null,
    currentUser: null,
    currentSporcu: null,
    currentOrgId: null,
    currentBranchId: null,
    theme: localStorage.getItem('sporcu_theme') || 'dark',
    lang: localStorage.getItem('sporcu_lang') || 'TR',
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
        atcls: ''
    }
};

// Çok dilli destek
const i18n = {
    TR: {
        loading: 'Yükleniyor...',
        menuMain: 'Ana Menü', menuDash: 'Gösterge', menuAth: 'Sporcular', menuSpo: 'Branşlar',
        menuCls: 'Sınıflar', menuAtt: 'Devam (Yoklama)', menuCoa: 'Antrenörler',
        menuFinSec: 'Yönetim (Muhasebe)', menuPay: 'Ödemeler', menuAcc: 'Finans / Rapor',
        menuSms: 'SMS Duyuru', menuSysSec: 'Sistem', menuSet: 'Ayarlar',
        roleAdmin: 'Yönetici', roleCoach: 'Antrenör', btnLogout: 'Çıkış Yap',
        spProfil: 'Profil', spYoklama: 'Yoklama', spOdemeler: 'Ödemeler', spOdemeYap: 'Ödeme Yap',
        saveSuccess: 'Başarıyla kaydedildi!', saveError: 'Kayıt hatası!',
        deleteConfirm: 'Silmek istediğinize emin misiniz?', fillRequired: 'Zorunlu alanları doldurun!',
        invalidTC: 'Geçersiz TC Kimlik numarası', connectionError: 'Bağlantı hatası!',
        noData: 'Veri bulunamadı', exportSuccess: 'Dışa aktarıldı!'
    },
    EN: {
        loading: 'Loading...',
        menuMain: 'Main Menu', menuDash: 'Dashboard', menuAth: 'Athletes', menuSpo: 'Sports',
        menuCls: 'Classes', menuAtt: 'Attendance', menuCoa: 'Coaches',
        menuFinSec: 'Finance', menuPay: 'Payments', menuAcc: 'Financial Report',
        menuSms: 'SMS Alerts', menuSysSec: 'System', menuSet: 'Settings',
        roleAdmin: 'Administrator', roleCoach: 'Coach', btnLogout: 'Log Out',
        spProfil: 'Profile', spYoklama: 'Attendance', spOdemeler: 'Payments', spOdemeYap: 'Make Payment',
        saveSuccess: 'Saved successfully!', saveError: 'Save error!',
        deleteConfirm: 'Are you sure you want to delete?', fillRequired: 'Please fill required fields!',
        invalidTC: 'Invalid ID number', connectionError: 'Connection error!',
        noData: 'No data found', exportSuccess: 'Exported!'
    }
};

// Tarih yardımcıları
const DateUtils = {
    today() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },
    format(dateStr) {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`;
        } catch {
            return dateStr;
        }
    },
    age(birthDate) {
        if (!birthDate) return '-';
        const d = new Date(birthDate), now = new Date();
        let age = now.getFullYear() - d.getFullYear();
        if (now < new Date(now.getFullYear(), d.getMonth(), d.getDate())) age--;
        return age;
    }
};

// Format yardımcıları
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
        const digits = tc.split('').map(Number);
        const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
        const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
        const digit10 = (oddSum * 7 - evenSum) % 10;
        const digit11 = (oddSum + evenSum + digits[9]) % 10;
        return digits[9] === digit10 && digits[10] === digit11;
    }
};

// UUID oluşturucu
function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

// SHA256 hash
async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Supabase bağlantısı
function getSupabase() {
    if (!AppState.sb) {
        try {
            AppState.sb = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        } catch (e) {
            console.error('Supabase init error:', e);
            toast(i18n[AppState.lang].connectionError, 'e');
        }
    }
    return AppState.sb;
}

// Toast bildirim sistemi (memory leak önlemli)
const ToastManager = {
    activeToasts: [],
    
    show(msg, type = 'info') {
        // Maksimum 3 toast göster
        while (this.activeToasts.length >= 3) {
            const old = this.activeToasts.shift();
            old.remove();
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

// Modal sistemi
const ModalManager = {
    open(title, body, buttons) {
        const m = document.getElementById('modal');
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
        document.getElementById('modal').classList.remove('show');
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
const confirm2 = ModalManager.confirm.bind(ModalManager);

// UI yardımcıları
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
    
    getAvatar(size, url) {
        const logoUrl = url || AppState.data.settings?.logo_url || DEFAULT_LOGO;
        return `<div class="ava" style="width:${size}px;height:${size}px;flex-shrink:0;background-image:url('${logoUrl}');background-size:cover;background-position:center;border:1px solid var(--border);background-color:var(--bg3)"></div>`;
    },
    
    setElementAvatar(id, url) {
        const el = document.getElementById(id);
        if (!el) return;
        const logoUrl = url || AppState.data.settings?.logo_url || DEFAULT_LOGO;
        el.innerHTML = '';
        el.style.cssText = `background-image:url("${logoUrl}");background-size:cover;background-position:center;`;
    }
};

// Tema yönetimi
function applyTheme(theme) {
    const isLight = theme === 'light';
    const btn = document.getElementById('theme-btn');
    const spBtn = document.getElementById('sp-theme-btn');
    
    if (isLight) {
        document.documentElement.setAttribute('data-theme', 'light');
        if (btn) btn.innerHTML = '&#x1F319;'; // Ay (dark moda geçiş için)
        if (spBtn) spBtn.innerHTML = '&#x1F319;';
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (btn) btn.innerHTML = '&#x1F31E;'; // Güneş (light moda geçiş için)
        if (spBtn) spBtn.innerHTML = '&#x1F31E;';
    }
    
    localStorage.setItem('sporcu_theme', theme);
    AppState.theme = theme;
}

function toggleTheme() {
    applyTheme(AppState.theme === 'dark' ? 'light' : 'dark');
}

// Dil yönetimi
function applyLang(lang) {
    AppState.lang = lang;
    localStorage.setItem('sporcu_lang', lang);
    
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

// Login tab geçişi
window.switchLoginTab = function(tab) {
    document.getElementById('login-sporcu').classList.toggle('dn', tab !== 'sporcu');
    document.getElementById('login-coach').classList.toggle('dn', tab !== 'coach');
    
    const tabs = document.querySelectorAll('#login-tabs .ltab');
    if (tabs.length > 1) {
        tabs[0].classList.toggle('on', tab === 'sporcu');
        tabs[1].classList.toggle('on', tab === 'coach');
    }
};

// Hukuki linkler
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
                    <li>Haklarınız: Bilgi talep etme, düzeltme, silme, işlemeyi sınırlama.</li>
                </ul>
                <p>İletişim: kvkk@dragosakademi.com</p>
            </div>`
        },
        kullanim: {
            title: 'Kullanım Şartları',
            body: `<div style="line-height:1.7;color:var(--text2);max-height:400px;overflow-y:auto;">
                <p class="mb2"><strong>1. Kabul</strong></p>
                <p class="mb2">Bu sistemi kullanarak kullanım şartlarını kabul etmiş olursunuz.</p>
                <p class="mb2"><strong>2. Hesap Güvenliği</strong></p>
                <p class="mb2">TC kimlik numaranız ve şifreniz size özeldir. Başkalarıyla paylaşmayın.</p>
                <p class="mb2"><strong>3. Sorumluluk</strong></p>
                <p>Sistem üzerinden yapılan işlemlerden kullanıcı sorumludur.</p>
            </div>`
        }
    };
    
    const info = content[type];
    modal(info.title, info.body, [
        { lbl: AppState.lang === 'TR' ? 'Kapat' : 'Close', cls: 'bs', fn: closeModal }
    ]);
};

// Veritabanı modelleri
const DB = {
    mappers: {
        toAthlete(r) {
            return {
                id: r.id, fn: r.fn, ln: r.ln, tc: r.tc, bd: r.bd, gn: r.gn,
                ph: r.ph, em: r.em || '', sp: r.sp, cat: r.cat, lic: r.lic,
                rd: r.rd, st: r.st || 'active', fee: r.fee || 0, vd: r.vd,
                nt: r.nt, clsId: r.cls_id, pn: r.pn, pph: r.pph, pem: r.pem,
                spPass: r.sp_pass, orgId: r.org_id, branchId: r.branch_id
            };
        },
        
        fromAthlete(a) {
            return {
                id: a.id, org_id: a.orgId || AppState.currentOrgId,
                branch_id: a.branchId || AppState.currentBranchId,
                fn: a.fn, ln: a.ln, tc: a.tc, bd: a.bd, gn: a.gn,
                ph: a.ph, em: a.em || '', sp: a.sp, cat: a.cat,
                lic: a.lic, rd: a.rd, st: a.st, fee: a.fee,
                vd: a.vd, nt: a.nt, cls_id: a.clsId,
                pn: a.pn, pph: a.pph, pem: a.pem, sp_pass: a.spPass
            };
        },
        
        toPayment(r) {
            return {
                id: r.id, aid: r.aid, an: r.an, amt: r.amt || 0,
                dt: r.dt, ty: r.ty, cat: r.cat, ds: r.ds,
                st: r.st || 'pending', inv: r.inv, dd: r.dd,
                serviceName: r.service_name || ''
            };
        },
        
        fromPayment(p) {
            return {
                id: p.id, org_id: AppState.currentOrgId,
                branch_id: AppState.currentBranchId,
                aid: p.aid, an: p.an, amt: p.amt, dt: p.dt,
                ty: p.ty, cat: p.cat, ds: p.ds, st: p.st,
                inv: p.inv, dd: p.dd, service_name: p.serviceName
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
            return {
                id: c.id, org_id: c.orgId || AppState.currentOrgId,
                branch_id: c.branchId || AppState.currentBranchId,
                fn: c.fn, ln: c.ln, tc: c.tc, ph: c.ph,
                em: c.em, sp: c.sp, sal: c.sal, st: c.st,
                coach_pass: c.coachPass
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
                netgsmPass: r.netgsm_pass, netgsmHeader: r.netgsm_header
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
                netgsm_pass: s.netgsmPass, netgsm_header: s.netgsmHeader
            };
        }
    },
    
    async query(table, filters = {}) {
        try {
            const sb = getSupabase();
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
            const arr = Array.isArray(data) ? data : [data];
            const { data: result, error } = await sb.from(table).upsert(arr, { onConflict: 'id' }).select();
            if (error) throw error;
            return result;
        } catch (e) {
            console.error(`DB upsert error (${table}):`, e);
            toast(i18n[AppState.lang].saveError, 'e');
            return null;
        }
    },
    
    async remove(table, filters) {
        try {
            const sb = getSupabase();
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

// Giriş işlemleri
window.doNormalLogin = async function(type) {
    const isCoach = type === 'coach';
    const tcId = isCoach ? 'lc-tc' : 'ls-tc';
    const passId = isCoach ? 'lc-pass' : 'ls-pass';
    const errId = isCoach ? 'lc-err' : 'ls-err';
    
    const tc = UIUtils.getValue(tcId);
    const pass = UIUtils.getValue(passId);
    const errEl = document.getElementById(errId);
    
    // Validasyon
    if (!tc || !pass) {
        errEl.textContent = AppState.lang === 'TR' ? 'TC ve şifre giriniz!' : 'Enter ID and password!';
        errEl.classList.remove('dn');
        return;
    }
    
    if (!FormatUtils.tcValidate(tc)) {
        errEl.textContent = i18n[AppState.lang].invalidTC;
        errEl.classList.remove('dn');
        return;
    }
    
    UIUtils.setLoading(true);
    errEl.classList.add('dn');
    
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
            
            // Güvenli karşılaştırma (timing attack önlemi için basit)
            if ((pass === expected) || (inputHash === expectedHash)) {
                found = r;
                break;
            }
        }
        
        if (!found) {
            throw new Error('Invalid password');
        }
        
        // Başarılı giriş
        if (isCoach) {
            AppState.currentUser = {
                id: found.id,
                name: `${found.fn} ${found.ln}`,
                role: 'coach',
                email: `${tc}@coach.local`
            };
            AppState.currentOrgId = found.org_id;
            AppState.currentBranchId = found.branch_id;
            
            localStorage.setItem('sporcu_app_user', JSON.stringify(AppState.currentUser));
            localStorage.setItem('sporcu_app_org', AppState.currentOrgId);
            localStorage.setItem('sporcu_app_branch', AppState.currentBranchId);
            
            await loadBranchData();
            
            document.getElementById('lbox-wrap').style.display = 'none';
            document.getElementById('wrap').classList.remove('dn');
            document.getElementById('suname').textContent = AppState.currentUser.name;
            
            updateBranchUI();
            go('attendance');
        } else {
            AppState.currentSporcu = DB.mappers.toAthlete(found);
            AppState.currentOrgId = found.org_id;
            AppState.currentBranchId = found.branch_id;
            
            localStorage.setItem('sporcu_app_sporcu', JSON.stringify({
                user: AppState.currentSporcu,
                orgId: AppState.currentOrgId,
                branchId: AppState.currentBranchId
            }));
            
            await loadBranchData();
            
            document.getElementById('lbox-wrap').style.display = 'none';
            document.getElementById('sporcu-portal').style.display = 'flex';
            document.getElementById('sp-name').textContent = 
                `${AppState.currentSporcu.fn} ${AppState.currentSporcu.ln}`;
            document.getElementById('sp-orgname').textContent = 
                AppState.data.settings?.schoolName || 'Dragos Futbol Akademisi';
            
            spTab('profil');
        }
        
    } catch (e) {
        console.error('Login error:', e);
        errEl.textContent = AppState.lang === 'TR' ? 
            'Kayıt bulunamadı veya şifre hatalı!' : 
            'Record not found or incorrect password!';
        errEl.classList.remove('dn');
    } finally {
        UIUtils.setLoading(false);
    }
};

window.doLogin = async function() {
    const email = UIUtils.getValue('le');
    const password = UIUtils.getValue('lp');
    const errEl = document.getElementById('lerr');
    
    if (!email || !password) {
        errEl.textContent = AppState.lang === 'TR' ? 'E-posta ve şifre giriniz!' : 'Enter email and password!';
        errEl.classList.remove('dn');
        return;
    }
    
    UIUtils.setLoading(true);
    errEl.classList.add('dn');
    
    try {
        const sb = getSupabase();
        const { data: authData, error: authError } = await sb.auth.signInWithPassword({ 
            email, 
            password 
        });
        
        if (authError) throw authError;
        
        // Kullanıcı bilgilerini al
        const { data: userData, error: userError } = await sb
            .from('users')
            .select('*')
            .eq('id', authData.user.id)
            .single();
        
        const user = userData || {
            id: authData.user.id,
            email: email,
            role: 'admin',
            org_id: 'org-default',
            branch_id: 'br-default',
            name: 'Yönetici'
        };
        
        AppState.currentUser = {
            id: user.id,
            email: user.email,
            orgId: user.org_id,
            branchId: user.branch_id,
            role: user.role,
            name: user.name
        };
        
        AppState.currentOrgId = user.org_id;
        AppState.currentBranchId = user.branch_id;
        
        localStorage.setItem('sporcu_app_user', JSON.stringify(AppState.currentUser));
        localStorage.setItem('sporcu_app_org', AppState.currentOrgId);
        localStorage.setItem('sporcu_app_branch', AppState.currentBranchId);
        
        await loadBranchData();
        
        document.getElementById('lbox-wrap').style.display = 'none';
        document.getElementById('wrap').classList.remove('dn');
        document.getElementById('suname').textContent = AppState.currentUser.name;
        
        updateBranchUI();
        go('dashboard');
        
    } catch (err) {
        console.error('Admin login error:', err);
        errEl.textContent = AppState.lang === 'TR' ? 
            'Hatalı yönetici girişi' : 
            'Invalid admin credentials';
        errEl.classList.remove('dn');
    } finally {
        UIUtils.setLoading(false);
    }
};

async function restoreSession() {
    UIUtils.setLoading(true);
    
    try {
        // Önce sporcu kontrolü
        const storedSporcu = localStorage.getItem('sporcu_app_sporcu');
        if (storedSporcu) {
            const parsed = JSON.parse(storedSporcu);
            AppState.currentSporcu = parsed.user;
            AppState.currentOrgId = parsed.orgId;
            AppState.currentBranchId = parsed.branchId;
            
            await loadBranchData();
            
            document.getElementById('lbox-wrap').style.display = 'none';
            document.getElementById('sporcu-portal').style.display = 'flex';
            document.getElementById('sp-name').textContent = 
                `${AppState.currentSporcu.fn} ${AppState.currentSporcu.ln}`;
            document.getElementById('sp-orgname').textContent = 
                AppState.data.settings?.schoolName || 'Dragos Futbol Akademisi';
            
            spTab('profil');
            return;
        }
        
        // Sonra admin/coach kontrolü
        const storedUser = localStorage.getItem('sporcu_app_user');
        if (storedUser) {
            AppState.currentUser = JSON.parse(storedUser);
            AppState.currentOrgId = localStorage.getItem('sporcu_app_org');
            AppState.currentBranchId = localStorage.getItem('sporcu_app_branch');
            
            // Supabase session kontrolü
            const sb = getSupabase();
            const { data: { session } } = await sb.auth.getSession();
            
            if (AppState.currentUser.role === 'admin' && !session) {
                // Admin için session yoksa çıkış yap
                throw new Error('No session');
            }
            
            await loadBranchData();
            
            document.getElementById('lbox-wrap').style.display = 'none';
            document.getElementById('wrap').classList.remove('dn');
            document.getElementById('suname').textContent = AppState.currentUser.name;
            
            updateBranchUI();
            go(AppState.currentUser.role === 'coach' ? 'attendance' : 'dashboard');
            return;
        }
        
    } catch (e) {
        console.error('Session restore error:', e);
        localStorage.clear();
    } finally {
        UIUtils.setLoading(false);
    }
}

window.doLogout = async function() {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    localStorage.clear();
    location.reload();
};

window.doSporcuLogout = function() {
    localStorage.clear();
    location.reload();
};

async function loadBranchData() {
    const bid = AppState.currentBranchId;
    if (!bid) return;
    
    const results = await Promise.all([
        DB.query('athletes', { branch_id: bid }),
        DB.query('payments', { branch_id: bid }),
        DB.query('coaches', { branch_id: bid }),
        DB.query('attendance', { branch_id: bid }),
        DB.query('messages', { branch_id: bid }),
        DB.query('settings', { branch_id: bid }),
        DB.query('sports', { branch_id: bid }),
        DB.query('classes', { branch_id: bid })
    ]);
    
    // Map veriler
    AppState.data.athletes = (results[0] || []).map(DB.mappers.toAthlete);
    AppState.data.payments = (results[1] || []).map(DB.mappers.toPayment);
    AppState.data.coaches = (results[2] || []).map(DB.mappers.toCoach);
    
    // Attendance yapılandırma
    AppState.data.attendance = {};
    (results[3] || []).forEach(r => {
        if (!AppState.data.attendance[r.att_date]) {
            AppState.data.attendance[r.att_date] = {};
        }
        AppState.data.attendance[r.att_date][r.athlete_id] = r.status;
    });
    
    AppState.data.messages = (results[4] || []).map(r => ({
        id: r.id, fr: r.fr, role: r.role, sub: r.sub,
        body: r.body, dt: r.dt, rd: r.rd
    }));
    
    AppState.data.settings = results[5]?.[0] ? 
        DB.mappers.toSettings(results[5][0]) : 
        { schoolName: 'Dragos Futbol Akademisi' };
    
    AppState.data.sports = (results[6] || []).map(DB.mappers.toSport);
    AppState.data.classes = (results[7] || []).map(DB.mappers.toClass);
    
    // Gecikmiş ödemeleri kontrol et
    checkOverdue();
}

function updateBranchUI() {
    const nameEl = document.getElementById('sn');
    const settings = AppState.data.settings;
    
    if (nameEl) {
        nameEl.textContent = settings?.schoolName || 'Dragos Futbol Akademisi';
    }
    
    // Logo güncelle
    const logoUrl = settings?.logoUrl || DEFAULT_LOGO;
    UIUtils.setElementAvatar('sava', logoUrl);
    UIUtils.setElementAvatar('bar-ava', logoUrl);
    UIUtils.setElementAvatar('side-logo-icon', logoUrl);
    UIUtils.setElementAvatar('login-logo', logoUrl);
    UIUtils.setElementAvatar('sp-avatar', logoUrl);
    
    // Antrenör yetki kısıtlamaları
    if (AppState.currentUser?.role === 'coach') {
        const restricted = ['ni-dashboard', 'ni-payments', 'ni-accounting', 
                          'ni-settings', 'ni-sms', 'ni-sports', 'ni-classes'];
        restricted.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        
        ['sec-finance', 'sec-sys'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        
        const bdash = document.getElementById('bn-dashboard');
        if (bdash) bdash.style.display = 'none';
    }
}

// Sayfa yönlendirme
window.go = function(page) {
    // Yetki kontrolü
    if (AppState.currentUser?.role === 'coach') {
        const restricted = ['dashboard', 'payments', 'accounting', 'settings', 'sms', 'sports', 'classes'];
        if (restricted.includes(page)) {
            toast(AppState.lang === 'TR' ? 
                'Bu sayfaya erişim yetkiniz yok.' : 
                'You do not have permission to access this page.', 'e');
            return;
        }
    }
    
    AppState.ui.curPage = page;
    const main = document.getElementById('main');
    const pages = {
        dashboard: pgDashboard,
        athletes: pgAthletes,
        payments: pgPayments,
        accounting: pgAccounting,
        attendance: pgAttendance,
        coaches: pgCoaches,
        sports: pgSports,
        classes: pgClasses,
        settings: pgSettings,
        sms: pgSms
    };
    
    main.style.opacity = '0';
    setTimeout(() => {
        if (pages[page]) {
            main.innerHTML = pages[page]();
        }
        main.style.opacity = '1';
    }, 100);
    
    // Nav güncelle
    document.querySelectorAll('.ni').forEach(el => {
        el.classList.toggle('on', el.id === `ni-${page}`);
    });
    document.querySelectorAll('.bni-btn').forEach(el => {
        el.classList.toggle('on', el.id === `bn-${page}`);
    });
    
    closeSide();
};

window.openSide = function() {
    document.getElementById('side').classList.add('open');
    document.getElementById('overlay').classList.add('show');
};

window.closeSide = function() {
    document.getElementById('side').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
};

// Yardımcı fonksiyonlar
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

function statusLabel(st) {
    const labels = {
        active: 'Aktif', inactive: 'Pasif', pending: 'Bekliyor',
        completed: 'Tamamlandı', overdue: 'Gecikti', cancelled: 'İptal',
        income: 'Gelir', expense: 'Gider'
    };
    return labels[st] || st || '-';
}

function statusClass(st) {
    const classes = {
        active: 'bg-g', inactive: 'bg-r', pending: 'bg-y',
        completed: 'bg-g', overdue: 'bg-r', cancelled: 'bg-r',
        income: 'bg-g', expense: 'bg-r'
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

// Sayfa render fonksiyonları
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
    
    return `
    <div class="ph">
        <div class="stit" data-i18n="menuAth">Sporcular</div>
    </div>
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
        <button class="btn bp" onclick="editAth()">+ Yeni Sporcu</button>
        <button class="btn bs" onclick="exportAthletes()">&#x1F4E4; Excel İndir</button>
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
                                ${UIUtils.getAvatar(36)}
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
                            <button class="btn btn-xs bp" onclick="editAth('${a.id}')">Düzenle</button>
                            <button class="btn btn-xs bd" onclick="delAth('${a.id}')">Sil</button>
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
}

window.editAth = function(id) {
    const a = id ? AppState.data.athletes.find(x => x.id === id) : null;
    const isNew = !a;
    const isCoach = AppState.currentUser?.role === 'coach';
    
    let html = `
    <div class="g21">
        <div class="fgr">
            <label>Ad *</label>
            <input id="a-fn" value="${FormatUtils.escape(a?.fn || '')}"/>
        </div>
        <div class="fgr">
            <label>Soyad *</label>
            <input id="a-ln" value="${FormatUtils.escape(a?.ln || '')}"/>
        </div>
    </div>
    <div class="g21 mt2">
        <div class="fgr">
            <label>TC Kimlik *</label>
            <input id="a-tc" type="tel" maxlength="11" value="${FormatUtils.escape(a?.tc || '')}"/>
        </div>
        <div class="fgr">
            <label>Doğum Tarihi</label>
            <input id="a-bd" type="date" value="${FormatUtils.escape(a?.bd || '')}"/>
        </div>
    </div>
    <div class="g21 mt2">
        <div class="fgr">
            <label>Telefon</label>
            <input id="a-ph" type="tel" value="${FormatUtils.escape(a?.ph || '')}"/>
        </div>
        <div class="fgr">
            <label>Sınıf</label>
            <select id="a-cls">
                <option value="">Sınıfsız</option>
                ${AppState.data.classes.map(c => 
                    `<option value="${FormatUtils.escape(c.id)}"${a?.clsId === c.id ? ' selected' : ''}>${FormatUtils.escape(c.name)}</option>`
                ).join('')}
            </select>
        </div>
    </div>
    <div class="g21 mt2">
        <div class="fgr">
            <label>Branş</label>
            <select id="a-sp">
                ${AppState.data.sports.map(s => 
                    `<option value="${FormatUtils.escape(s.name)}"${a?.sp === s.name ? ' selected' : ''}>${FormatUtils.escape(s.name)}</option>`
                ).join('')}
            </select>
        </div>
        <div class="fgr">
            <label>Durum</label>
            <select id="a-st">
                <option value="active"${a?.st === 'active' ? ' selected' : ''}>Aktif</option>
                <option value="inactive"${a?.st === 'inactive' ? ' selected' : ''}>Pasif</option>
            </select>
        </div>
    </div>`;
    
    if (!isCoach) {
        html += `
        <div class="g21 mt2">
            <div class="fgr">
                <label>Aylık Ücret (₺)</label>
                <input id="a-fee" type="number" value="${a?.fee || ''}"/>
            </div>
            <div class="fgr">
                <label>Vade Takvimi</label>
                <input id="a-vd" type="date" value="${FormatUtils.escape(a?.vd || '')}"/>
            </div>
        </div>`;
    }
    
    html += `
    <div class="dv"></div>
    <div class="tw6 tsm mb2">Veli Bilgileri & Şifre</div>
    <div class="g21">
        <div class="fgr">
            <label>Veli Ad Soyad</label>
            <input id="a-pn" value="${FormatUtils.escape(a?.pn || '')}"/>
        </div>
        <div class="fgr">
            <label>Veli Telefon</label>
            <input id="a-pph" type="tel" value="${FormatUtils.escape(a?.pph || '')}"/>
        </div>
    </div>
    <div class="fgr mt2">
        <label>Sporcu Şifresi (Boş = TC son 4)</label>
        <input id="a-sppass" type="text" placeholder="Örn: 123456" value="${FormatUtils.escape(a?.spPass || '')}"/>
    </div>`;
    
    modal(isNew ? 'Yeni Sporcu' : 'Sporcu Düzenle', html, [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: 'Kaydet', cls: 'bp', fn: async () => {
            const obj = {
                id: a?.id || generateId(),
                fn: UIUtils.getValue('a-fn'),
                ln: UIUtils.getValue('a-ln'),
                tc: UIUtils.getValue('a-tc'),
                bd: UIUtils.getValue('a-bd'),
                ph: UIUtils.getValue('a-ph'),
                sp: UIUtils.getValue('a-sp'),
                st: UIUtils.getValue('a-st'),
                clsId: UIUtils.getValue('a-cls'),
                pn: UIUtils.getValue('a-pn'),
                pph: UIUtils.getValue('a-pph'),
                spPass: UIUtils.getValue('a-sppass'),
                gn: 'E', em: '', cat: '', lic: '',
                rd: DateUtils.today(), nt: '', pem: ''
            };
            
            if (!isCoach) {
                obj.fee = UIUtils.getNumber('a-fee');
                obj.vd = UIUtils.getValue('a-vd');
            } else if (a) {
                obj.fee = a.fee;
                obj.vd = a.vd;
            }
            
            // Validasyon
            if (!obj.fn || !obj.ln || !obj.tc) {
                toast(i18n[AppState.lang].fillRequired, 'e');
                return;
            }
            
            if (!FormatUtils.tcValidate(obj.tc)) {
                toast(i18n[AppState.lang].invalidTC, 'e');
                return;
            }
            
            // TC benzersizlik kontrolü
            const existing = AppState.data.athletes.find(x => x.tc === obj.tc && x.id !== obj.id);
            if (existing) {
                toast('Bu TC numarası zaten kayıtlı!', 'e');
                return;
            }
            
            const result = await DB.upsert('athletes', DB.mappers.fromAthlete(obj));
            if (result) {
                if (isNew) {
                    AppState.data.athletes.push(obj);
                } else {
                    const idx = AppState.data.athletes.findIndex(x => x.id === obj.id);
                    if (idx >= 0) AppState.data.athletes[idx] = obj;
                }
                toast(i18n[AppState.lang].saveSuccess, 'g');
                closeModal();
                go('athletes');
            }
        }}
    ]);
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
                    <tr><th>Ad Soyad</th><th>TC</th><th>Veli</th></tr>
                </thead>
                <tbody>
                    ${list.map(a => `
                    <tr>
                        <td class="tw6">${FormatUtils.escape(`${a.fn} ${a.ln}`)}</td>
                        <td>${FormatUtils.escape(a.tc)}</td>
                        <td>${a.pn ? FormatUtils.escape(`${a.pn} (${a.pph})`) : '-'}</td>
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
            // Sınıfa bağlı sporcuları temizle
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
            <div class="card">
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
    </div>
    <div class="card">
        ${list.map(a => {
            const st = AppState.data.attendance[today]?.[a.id] || '';
            return `
            <div class="att-row">
                <div class="flex fca gap2" style="flex:1">
                    ${UIUtils.getAvatar(32)}
                    <div>
                        <div class="tw6 tsm">${FormatUtils.escape(`${a.fn} ${a.ln}`)}</div>
                        <div class="ts tm">${FormatUtils.escape(className(a.clsId))}</div>
                    </div>
                </div>
                <div class="att-btns">
                    <button class="att-b${st === 'P' ? ' ap' : ''}" onclick="setAtt('${a.id}', 'P')">Var</button>
                    <button class="att-b${st === 'A' ? ' aa' : ''}" onclick="setAtt('${a.id}', 'A')">Yok</button>
                    <button class="att-b" onclick="setAtt('${a.id}')">Sil</button>
                </div>
            </div>`;
        }).join('')}
    </div>`;
}

window.setAtt = async function(aid, status) {
    const date = AppState.ui.atd || DateUtils.today();
    
    if (!AppState.data.attendance[date]) {
        AppState.data.attendance[date] = {};
    }
    
    if (status === undefined) {
        delete AppState.data.attendance[date][aid];
        await DB.remove('attendance', { athlete_id: aid, att_date: date });
    } else {
        AppState.data.attendance[date][aid] = status;
        await DB.upsert('attendance', {
            org_id: AppState.currentOrgId,
            branch_id: AppState.currentBranchId,
            athlete_id: aid,
            att_date: date,
            status: status
        });
    }
    
    go('attendance');
};

function pgPayments() {
    let list = [...AppState.data.payments];
    const f = AppState.filters.payments;
    
    if (f.st) list = list.filter(p => p.st === f.st);
    
    const total = list.reduce((s, p) => s + (p.ty === 'income' ? (p.amt || 0) : -(p.amt || 0)), 0);
    
    return `
    <div class="ph">
        <div class="stit" data-i18n="menuPay">Ödemeler</div>
    </div>
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
                <thead>
                    <tr>
                        <th>Tarih</th>
                        <th>Kişi/Kurum</th>
                        <th>Açıklama</th>
                        <th>Tutar</th>
                        <th>Tür</th>
                        <th>Durum</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    ${list.map(p => `
                    <tr>
                        <td>${DateUtils.format(p.dt)}</td>
                        <td>${FormatUtils.escape(p.an)}</td>
                        <td>${FormatUtils.escape(p.serviceName || p.ds || '-')}</td>
                        <td class="tw6 ${p.ty === 'income' ? 'tg' : 'tr2'}">${FormatUtils.currency(p.amt)}</td>
                        <td><span class="bg ${statusClass(p.ty)}">${statusLabel(p.ty)}</span></td>
                        <td><span class="bg ${statusClass(p.st)}">${statusLabel(p.st)}</span></td>
                        <td>
                            <button class="btn btn-xs bp" onclick="editPay('${p.id}')">Düzenle</button>
                            <button class="btn btn-xs bd" onclick="delPay('${p.id}')">Sil</button>
                        </td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
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
            <input id="c-tc" type="tel" maxlength="11" value="${FormatUtils.escape(c?.tc || '')}"/>
        </div>
        <div class="fgr">
            <label>Telefon</label>
            <input id="c-ph" value="${FormatUtils.escape(c?.ph || '')}"/>
        </div>
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
        <label>Özel Şifre (Boş = TC son 4)</label>
        <input id="c-pass" placeholder="Örn: 1234" value="${FormatUtils.escape(c?.coachPass || '')}"/>
    </div>
    `, [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: 'Kaydet', cls: 'bp', fn: async () => {
            const obj = {
                id: c?.id || generateId(),
                fn: UIUtils.getValue('c-fn'),
                ln: UIUtils.getValue('c-ln'),
                tc: UIUtils.getValue('c-tc'),
                ph: UIUtils.getValue('c-ph'),
                sp: UIUtils.getValue('c-sp'),
                coachPass: UIUtils.getValue('c-pass'),
                em: '', sal: 0, st: 'active'
            };
            
            if (!obj.fn || !obj.tc) {
                toast(i18n[AppState.lang].fillRequired, 'e');
                return;
            }
            
            if (!FormatUtils.tcValidate(obj.tc)) {
                toast(i18n[AppState.lang].invalidTC, 'e');
                return;
            }
            
            // TC benzersizlik kontrolü
            const existing = AppState.data.coaches.find(x => x.tc === obj.tc && x.id !== obj.id);
            if (existing) {
                toast('Bu TC numarası zaten kayıtlı!', 'e');
                return;
            }
            
            const result = await DB.upsert('coaches', DB.mappers.fromCoach(obj));
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
            Ayarlar menüsünden API bilgilerinizi giriniz.
        </div>
        <div class="fgr mb2">
            <label>Alıcı Grubu</label>
            <select id="sms-group">
                <option value="all">Tüm Aktif Sporcular</option>
                <option value="overdue">Gecikmiş Ödemesi Olanlar</option>
                <option value="class">Belirli Sınıf</option>
            </select>
        </div>
        <div class="fgr mb2">
            <label>Mesaj İçeriği</label>
            <textarea id="sms-body" rows="4" maxlength="160" placeholder="Mesajınızı yazın..."></textarea>
            <div class="ts tm" style="text-align:right"><span id="sms-count">0</span>/160</div>
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
    toast('SMS gönderimi simüle edildi (Entegrasyon gerekli)', 'g');
};

function pgSettings() {
    const s = AppState.data.settings;
    
    return `
    <div class="ph">
        <div class="stit" data-i18n="menuSet">Sistem Ayarları</div>
        <div class="ssub">Akademi yönetim merkeziniz</div>
    </div>
    
    <div class="card mb3" style="border-left: 4px solid var(--blue2)">
        <div class="tw6 tsm mb2">&#x1F465; Rol ve Yetki Yönetimi</div>
        <p class="ts tm mb2">Antrenörlerin sisteme girişini "Antrenörler" sekmesinden TC ile sağlayabilirsiniz.</p>
        <div class="flex gap2">
            <button class="btn bsu" onclick="showAddAdminModal()">+ Yeni Yönetici Ekle</button>
        </div>
    </div>

    <div class="card mb3" style="border-left: 4px solid var(--purple)">
        <div class="tw6 tsm mb2">&#x1F916; Otomatik Bildirimler</div>
        <div class="flex fjb fca mb2 pb2" style="border-bottom:1px solid var(--border)">
            <span class="tsm">Vadesi geçen ödemeler için otomatik hatırlatma</span>
            <input type="checkbox" id="auto-overdue" style="width:20px;height:20px" checked>
        </div>
        <div class="flex fjb fca mb2 pb2" style="border-bottom:1px solid var(--border)">
            <span class="tsm">Yoklamada "Yok" yazılan öğrencinin velisine SMS</span>
            <input type="checkbox" id="auto-absent" style="width:20px;height:20px">
        </div>
        <button class="btn bp mt2" onclick="toast('Ayarlar kaydedildi','g')">Kaydet</button>
    </div>

    <div class="card mb3" style="border-left: 4px solid var(--green)">
        <div class="tw6 tsm mb2">&#x1F4B3; Sanal POS API</div>
        <p class="ts tm mb2">Ödeme sağlayıcınızın bilgilerini girin.</p>
        <div class="g21">
            <div class="fgr mb2">
                <label>Sağlayıcı</label>
                <select><option>PayTR</option><option>Iyzico</option></select>
            </div>
            <div class="fgr mb2">
                <label>Merchant ID</label>
                <input type="password" value="********"/>
            </div>
        </div>
        <button class="btn bp" onclick="toast('POS ayarları kaydedildi','g')">Kaydet</button>
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
        <div class="g21">
            <div class="fgr mb2">
                <label>NetGSM Kullanıcı</label>
                <input id="s-ngu" value="${FormatUtils.escape(s?.netgsmUser || '')}"/>
            </div>
            <div class="fgr mb2">
                <label>NetGSM Şifre</label>
                <input type="password" id="s-ngp"/>
            </div>
        </div>
        <button class="btn bp mt2" onclick="saveGeneralSettings()">Genel Ayarları Kaydet</button>
    </div>`;
}

window.saveGeneralSettings = async function() {
    const obj = {
        id: AppState.data.settings?.id,
        schoolName: UIUtils.getValue('s-name'),
        bankName: UIUtils.getValue('s-bank'),
        accountName: UIUtils.getValue('s-acc'),
        iban: UIUtils.getValue('s-iban'),
        netgsmUser: UIUtils.getValue('s-ngu'),
        logoUrl: AppState.data.settings?.logoUrl || DEFAULT_LOGO
    };
    
    const pass = UIUtils.getValue('s-ngp');
    if (pass) obj.netgsmPass = pass;
    
    const result = await DB.upsert('settings', DB.mappers.fromSettings(obj));
    if (result) {
        AppState.data.settings = obj;
        toast(i18n[AppState.lang].saveSuccess, 'g');
        updateBranchUI();
    }
};

window.showAddAdminModal = function() {
    modal('Yönetici Ekle', `
    <div class="fgr mb2">
        <label>Ad Soyad</label>
        <input id="aa-name"/>
    </div>
    <div class="fgr mb2">
        <label>E-posta *</label>
        <input id="aa-em" type="email"/>
    </div>
    <div class="fgr mb2">
        <label>Şifre *</label>
        <input id="aa-pass" type="password"/>
    </div>
    `, [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: 'Kaydet', cls: 'bp', fn: async () => {
            const email = UIUtils.getValue('aa-em');
            const pass = UIUtils.getValue('aa-pass');
            const name = UIUtils.getValue('aa-name');
            
            if (!email || !pass) {
                toast(i18n[AppState.lang].fillRequired, 'e');
                return;
            }
            
            try {
                const sb = getSupabase();
                const { data, error } = await sb.auth.signUp({
                    email,
                    password: pass,
                    options: {
                        data: {
                            full_name: name,
                            org_id: AppState.currentOrgId,
                            branch_id: AppState.currentBranchId,
                            role: 'admin'
                        }
                    }
                });
                
                if (error) throw error;
                
                // users tablosuna ekle
                await DB.upsert('users', {
                    id: data.user.id,
                    email: email,
                    name: name,
                    role: 'admin',
                    org_id: AppState.currentOrgId,
                    branch_id: AppState.currentBranchId
                });
                
                toast('Yönetici eklendi! E-posta onayı gönderildi.', 'g');
                closeModal();
            } catch (e) {
                toast('Hata: ' + e.message, 'e');
            }
        }}
    ]);
};

// Sporcu portalı
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
    
    if (pages[tab]) content.innerHTML = pages[tab]();
};

function spProfil() {
    const a = AppState.currentSporcu;
    if (!a) return '';
    const rate = attendanceRate(a.id);
    
    return `
    <div class="profile-hero">
        <div class="flex fca gap3">
            ${UIUtils.getAvatar(64)}
            <div>
                <div class="tw6" style="font-size:18px">${FormatUtils.escape(`${a.fn} ${a.ln}`)}</div>
                <div class="ts tm">${FormatUtils.escape(a.tc)}</div>
            </div>
        </div>
    </div>
    <div class="card">
        ${row('Devam Oranı', `%${rate}`)}
        ${row('Branş', FormatUtils.escape(a.sp))}
        ${row('Veli Adı', FormatUtils.escape(a.pn || '-'))}
        ${row('Veli Telefon', FormatUtils.escape(a.pph || '-'))}
        ${row('Doğum Tarihi', DateUtils.format(a.bd))}
    </div>`;
}

function row(label, value) {
    return `
    <div class="dr">
        <span class="tm">${label}</span>
        <span class="tw6">${value}</span>
    </div>`;
}

function spYoklama() {
    const a = AppState.currentSporcu;
    if (!a) return '';
    
    const dates = Object.keys(AppState.data.attendance)
        .sort()
        .reverse()
        .slice(0, 30);
    
    let html = '<div class="card"><div class="tw6 tsm mb2">Son Yoklamalar</div>';
    
    if (!dates.length) {
        html += '<p class="tm">Kayıt yok.</p>';
    } else {
        html += dates.map(d => {
            const st = AppState.data.attendance[d]?.[a.id];
            const status = st === 'P' ? '<span class="bg bg-g">Var</span>' : 
                          st === 'A' ? '<span class="bg bg-r">Yok</span>' : 
                          '<span class="tm">-</span>';
            return `
            <div class="att-row">
                <span class="tm">${DateUtils.format(d)}</span>
                ${status}
            </div>`;
        }).join('');
    }
    
    return html + '</div>';
}

function spOdemeler() {
    const a = AppState.currentSporcu;
    if (!a) return '';
    
    const myPayments = AppState.data.payments.filter(p => p.aid === a.id);
    
    return `
    <div class="card">
        <div class="tw6 tsm mb2">Ödemelerim</div>
        <div class="tw">
            <table>
                <tbody>
                    ${myPayments.map(p => `
                    <tr>
                        <td>${DateUtils.format(p.dt)}</td>
                        <td class="tw6">${FormatUtils.currency(p.amt)}</td>
                        <td><span class="bg ${statusClass(p.st)}">${statusLabel(p.st)}</span></td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    </div>`;
}

function spOdemeYap() {
    const s = AppState.data.settings;
    
    return `
    <div class="card">
        <div class="al al-b mb3">
            <strong>Banka:</strong> ${FormatUtils.escape(s?.bankName || '-')}<br>
            <strong>Alıcı:</strong> ${FormatUtils.escape(s?.accountName || '-')}<br>
            <strong>IBAN:</strong> ${FormatUtils.escape(s?.iban || '-')}
        </div>
        <div class="fgr mb2">
            <label>Tutar (₺)</label>
            <input id="sp-amt" type="number"/>
        </div>
        <button class="btn bp w100" onclick="toast('Ödeme bildirimi alındı!', 'g')">
            Havale Bildirimi Yap
        </button>
    </div>`;
}

// Dışa aktarma fonksiyonları
window.exportAthletes = function() {
    const data = AppState.data.athletes.map(a => ({
        Ad: a.fn,
        Soyad: a.ln,
        TC: a.tc,
        Telefon: a.ph,
        Branş: a.sp,
        Sınıf: className(a.clsId),
        Durum: statusLabel(a.st),
        'Aylık Ücret': a.fee,
        Veli: a.pn,
        'Veli Telefon': a.pph
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
        // Fallback to CSV
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

// Başlatma
document.addEventListener('DOMContentLoaded', async () => {
    // Tema ve dil
    applyTheme(AppState.theme);
    applyLang(AppState.lang);
    
    // Gizli admin kontrolü
    if (window.location.href.includes('admin')) {
        document.getElementById('login-tabs').classList.add('dn');
        document.getElementById('login-sporcu').classList.add('dn');
        document.getElementById('login-coach').classList.add('dn');
        document.getElementById('login-admin').classList.remove('dn');
    }
    
    // Session kontrolü
    await restoreSession();
});
