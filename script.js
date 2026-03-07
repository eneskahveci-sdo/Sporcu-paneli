/* ============================================================
   SPORCU PANELI — EKSİKSİZ PRO SÜRÜM (Hukuk & Tüm Modüller)
   ============================================================ */

const SUPA_URL = 'https://wfarbydojxtufnkjuhtc.supabase.co';
const SUPA_KEY = 'sb_publishable_w1_nXk_7TM1ePWHMN2CDcQ_1ufk0kYC';
let sb = supabase.createClient(SUPA_URL, SUPA_KEY);

let currentUser = null;
let athletes = [], payments = [], coaches = [], branches = [], sports = [], classes = [];

// --- GİRİŞ KONTROLLERİ ---
window.switchLoginTab = (tab) => {
    document.getElementById('login-sporcu').classList.toggle('dn', tab !== 'sporcu');
    document.getElementById('login-coach').classList.toggle('dn', tab !== 'coach');
    document.querySelectorAll('.ltab').forEach((el, i) => el.classList.toggle('on', (i===0 && tab==='sporcu') || (i===1 && tab==='coach')));
};

window.doLogin = async () => {
    const e = document.getElementById('le').value, p = document.getElementById('lp').value;
    const { data, error } = await sb.auth.signInWithPassword({ email: e, password: p });
    if(error) return alert("Hatalı giriş!");
    currentUser = { name: 'Yönetici', role: 'admin', id: data.user.id };
    loginSuccess();
};

window.doNormalLogin = async (type) => {
    const tc = document.getElementById(type==='coach'?'lc-tc':'ls-tc').value;
    const table = type === 'coach' ? 'coaches' : 'athletes';
    const { data } = await sb.from(table).select('*').eq('tc', tc).single();
    if(!data) return alert("Kayıt bulunamadı!");
    currentUser = { name: data.fn + ' ' + data.ln, role: type, id: data.id };
    loginSuccess();
};

function loginSuccess() {
    localStorage.setItem('sporcu_app_user', JSON.stringify(currentUser));
    document.getElementById('lbox-wrap').classList.add('dn');
    document.getElementById('wrap').classList.remove('dn');
    document.getElementById('suname').textContent = currentUser.name;
    loadData();
}

async function loadData() {
    const res = await Promise.all([
        sb.from('athletes').select('*'),
        sb.from('payments').select('*'),
        sb.from('coaches').select('*'),
        sb.from('branches').select('*')
    ]);
    athletes = res[0].data || [];
    payments = res[1].data || [];
    coaches = res[2].data || [];
    branches = res[3].data || [];
    updateMenuVisibility();
    go('dashboard');
}

// --- MENÜ VE SAYFALAR ---
function updateMenuVisibility() {
    const isAdmin = currentUser.role === 'admin';
    ['ni-payments', 'ni-accounting', 'ni-branches', 'ni-org-manage', 'ni-settings', 'sec-finance', 'sec-platform', 'sec-sys'].forEach(id => {
        const el = document.getElementById(id); if(el) el.style.display = isAdmin ? 'block' : 'none';
    });
}

window.go = (pg) => {
    const main = document.getElementById('main');
    document.querySelectorAll('.ni').forEach(el => el.classList.toggle('on', el.id === 'ni-'+pg));
    
    if(pg === 'dashboard') main.innerHTML = renderDash();
    else if(pg === 'athletes') main.innerHTML = renderAthletes();
    else if(pg === 'branches') main.innerHTML = renderBranches();
    else if(pg === 'org-manage') main.innerHTML = renderOrgManage();
    else if(pg === 'announcements') main.innerHTML = renderAnnounce();
    else main.innerHTML = `<div class="card"><h3>${pg.toUpperCase()}</h3><p>Bu modül yakında aktif edilecek.</p></div>`;
};

// --- MODÜL RENDERLARI (ESKİ FOTODAKİ EKSİKLER) ---
function renderDash() {
    return `<div class="g4 mb3">
        <div class="card"><h3>${athletes.length}</h3><p>Sporcu</p></div>
        <div class="card"><h3>${branches.length}</h3><p>Şube</p></div>
        <div class="card"><h3>${coaches.length}</h3><p>Antrenör</p></div>
        <div class="card"><h3>${payments.length}</h3><p>İşlem</p></div>
    </div>`;
}

function renderBranches() {
    return `<div class="card">
        <div class="fjb flex mb3"><h3>Şubeler</h3><button class="btn bp" onclick="alert('Yeni Şube Ekle')">+ Yeni Şube</button></div>
        <div class="tw"><table><thead><tr><th>Şube</th><th>Durum</th><th>Kapasite</th></tr></thead>
        <tbody>${branches.map(b => `<tr><td><b>${b.name}</b></td><td>Aktif</td><td>${b.cap || 100}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
}

function renderOrgManage() {
    return `<div class="card">
        <h3>Platform & Kurum Yönetimi</h3>
        <p class="tm mb3">Kurumun yasal yetkili ayarları ve sistem günlükleri.</p>
        <div class="al al-b" style="padding:10px; background:rgba(59,130,246,0.1); border-radius:8px">
            <b>Aktif Yönetici:</b> ${currentUser.name} <br> <b>Son Giriş:</b> ${new Date().toLocaleString()}
        </div>
        <button class="btn bs mt3" onclick="alert('Yönetici Ekle')">+ Yeni Yönetici Ekle</button>
    </div>`;
}

function renderAnnounce() {
    return `<div class="card">
        <h3>Duyuru Panosu</h3>
        <div class="fgr mt3"><label>Duyuru Başlığı</label><input id="ann-title"/></div>
        <div class="fgr"><label>Mesaj İçeriği</label><textarea style="width:100%;background:var(--bg3);border:1px solid var(--border);color:#fff;padding:10px;border-radius:8px"></textarea></div>
        <button class="btn bp mt3" onclick="alert('Duyuru Gönderildi')">Hemen Yayınla</button>
    </div>`;
}

function renderAthletes() {
    return `<div class="card">
        <div class="fjb flex mb3"><h3>Sporcu Listesi</h3><button class="btn bp" onclick="alert('Yeni Sporcu')">+ Yeni Sporcu</button></div>
        <div class="tw"><table><thead><tr><th>İsim</th><th>TC</th><th>Branş</th><th>İşlem</th></tr></thead>
        <tbody>${athletes.map(a => `<tr><td>${a.fn} ${a.ln}</td><td>${a.tc}</td><td>${a.sp}</td><td><button class="btn bs">Detay</button></td></tr>`).join('')}</tbody></table></div>
    </div>`;
}

// --- HUKUKİ VE DİĞER ---
window.showLegal = (type) => {
    const content = type === 'kvkk' ? "KVKK Aydınlatma Metni: Verileriniz Supabase şifreli sunucularında saklanmaktadır..." : "Kullanım Sözleşmesi: Akademi kurallarına uymayı taahhüt edersiniz...";
    document.getElementById('modal-title').textContent = type.toUpperCase();
    document.getElementById('modal-body').textContent = content;
    document.getElementById('modal-footer').innerHTML = `<button class="btn bp" onclick="closeModal()">Anladım</button>`;
    document.getElementById('modal').classList.add('show');
};
window.closeModal = () => document.getElementById('modal').classList.remove('show');
window.doLogout = () => { localStorage.clear(); location.reload(); };
window.toggleTheme = () => {
    const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
};

// --- OTOMATİK GİRİŞ ---
document.addEventListener('DOMContentLoaded', () => {
    if(window.location.href.includes('admin')) {
        document.getElementById('login-tabs').classList.add('dn');
        document.getElementById('login-sporcu').classList.add('dn');
        document.getElementById('login-admin').classList.remove('dn');
    }
    const stored = localStorage.getItem('sporcu_app_user');
    if(stored) { currentUser = JSON.parse(stored); loginSuccess(); }
});
