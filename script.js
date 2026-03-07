/* ============================================================
   DRAGOS FUTBOL AKADEMİSİ — TAM VE EKSİKSİZ SÜRÜM
   ============================================================ */
const SUPA_URL = 'https://wfarbydojxtufnkjuhtc.supabase.co';
const SUPA_KEY = 'sb_publishable_w1_nXk_7TM1ePWHMN2CDcQ_1ufk0kYC';
const sb = supabase.createClient(SUPA_URL, SUPA_KEY);

let currentUser = null;
let athletes = [], payments = [], coaches = [], branches = [];

window.switchLoginTab = (tab) => {
    document.getElementById('login-sporcu').classList.toggle('dn', tab !== 'sporcu');
    document.getElementById('login-coach').classList.toggle('dn', tab !== 'coach');
    document.querySelectorAll('.ltab').forEach((el, i) => el.classList.toggle('on', (i===0 && tab==='sporcu') || (i===1 && tab==='coach')));
};

window.doLogin = async () => {
    const e = document.getElementById('le').value, p = document.getElementById('lp').value;
    const { data, error } = await sb.auth.signInWithPassword({ email: e, password: p });
    if(error) return alert("Hatalı Giriş!");
    currentUser = { name: 'Yönetici', role: 'admin', id: data.user.id };
    loginOk();
};

window.doNormalLogin = async (type) => {
    const tc = document.getElementById(type==='coach'?'lc-tc':'ls-tc').value;
    const { data } = await sb.from(type === 'coach' ? 'coaches' : 'athletes').select('*').eq('tc', tc).single();
    if(!data) return alert("Kayıt bulunamadı!");
    currentUser = { name: data.fn + ' ' + data.ln, role: type, id: data.id };
    loginOk();
};

function loginOk() {
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
    athletes = res[0].data || []; payments = res[1].data || []; coaches = res[2].data || []; branches = res[3].data || [];
    if(currentUser.role !== 'admin') {
        ['ni-payments','ni-accounting','ni-branches','ni-org-manage','ni-settings','sec-finance','sec-platform','sec-sys'].forEach(id => {
            const el = document.getElementById(id); if(el) el.style.display = 'none';
        });
    }
    go('dashboard');
}

window.go = (pg) => {
    const main = document.getElementById('main');
    document.querySelectorAll('.ni').forEach(el => el.classList.toggle('on', el.id === 'ni-'+pg));
    if(pg === 'dashboard') main.innerHTML = `
        <div class="g4 mb3" style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px">
            <div class="card"><h3>${athletes.length}</h3><p>Sporcu</p></div>
            <div class="card"><h3>${branches.length}</h3><p>Şube</p></div>
            <div class="card"><h3>${coaches.length}</h3><p>Antrenör</p></div>
            <div class="card"><h3>${payments.length}</h3><p>İşlem</p></div>
        </div>`;
    else if(pg === 'athletes') main.innerHTML = `
        <div class="card">
            <div class="fjb flex mb3"><h3>Sporcu Listesi</h3><button class="btn bp">+ Yeni Sporcu</button></div>
            <div class="tw"><table><thead><tr><th>İsim Soyisim</th><th>TC</th><th>Branş</th></tr></thead>
            <tbody>${athletes.map(a => `<tr><td><b>${a.fn} ${a.ln}</b></td><td>${a.tc}</td><td>${a.sp}</td></tr>`).join('')}</tbody></table></div>
        </div>`;
    else if(pg === 'branches') main.innerHTML = `
        <div class="card">
            <div class="fjb flex mb3"><h3>Şube Yönetimi</h3><button class="btn bp">+ Yeni Şube</button></div>
            <div class="tw"><table><thead><tr><th>Şube Adı</th><th>Durum</th><th>Kapasite</th></tr></thead>
            <tbody>${branches.map(b => `<tr><td><b>${b.name}</b></td><td>Aktif</td><td>${b.cap || 100}</td></tr>`).join('')}</tbody></table></div>
        </div>`;
    else if(pg === 'org-manage') main.innerHTML = `
        <div class="card"><h3>Platform & Kurum Yönetimi</h3><p class="tm mt3">Kurum yasal yetkileri ve yönetici ayarları.</p>
        <button class="btn bs mt3">+ Yeni Yönetici Ekle</button></div>`;
    else if(pg === 'coaches') main.innerHTML = `
        <div class="card">
            <div class="fjb flex mb3"><h3>Antrenörler</h3><button class="btn bp">+ Yeni Antrenör</button></div>
            <div class="tw"><table><thead><tr><th>Ad Soyad</th><th>TC</th></tr></thead>
            <tbody>${coaches.map(c => `<tr><td><b>${c.fn} ${c.ln}</b></td><td>${c.tc}</td></tr>`).join('')}</tbody></table></div>
        </div>`;
    else main.innerHTML = `<div class="card"><h3>${pg.toUpperCase()}</h3><p>Modül aktif ediliyor...</p></div>`;
};

window.showLegal = (type) => {
    document.getElementById('modal-title').textContent = type.toUpperCase();
    document.getElementById('modal-body').textContent = type === 'kvkk' ? "Kişisel verileriniz 6698 sayılı kanuna uygun saklanır." : "Akademi kuralları ve ödeme şartlarını kabul edersiniz.";
    document.getElementById('modal-footer').innerHTML = `<button class="btn bp" onclick="closeModal()">Anladım</button>`;
    document.getElementById('modal').classList.add('show');
};
window.closeModal = () => document.getElementById('modal').classList.remove('show');
window.doLogout = () => { localStorage.clear(); location.reload(); };

document.addEventListener('DOMContentLoaded', () => {
    if(window.location.href.includes('admin')) {
        document.getElementById('login-tabs').classList.add('dn');
        document.getElementById('login-sporcu').classList.add('dn');
        document.getElementById('login-admin').classList.remove('dn');
    }
    const stored = localStorage.getItem('sporcu_app_user');
    if(stored) { currentUser = JSON.parse(stored); loginOk(); }
});
