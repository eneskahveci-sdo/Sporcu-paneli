const SUPA_URL = 'https://wfarbydojxtufnkjuhtc.supabase.co';
const SUPA_KEY = 'sb_publishable_w1_nXk_7TM1ePWHMN2CDcQ_1ufk0kYC';
const sb = supabase.createClient(SUPA_URL, SUPA_KEY);

let currentUser = null;
let athletes = [], payments = [], coaches = [], branches = [];

window.switchLoginTab = (tab) => {
    document.getElementById('login-sporcu').classList.toggle('dn', tab !== 'sporcu');
    document.getElementById('login-coach').classList.toggle('dn', tab !== 'coach');
    document.querySelectorAll('.ltab').forEach((el, i) => el.classList.toggle('on', (i === 0 && tab === 'sporcu') || (i === 1 && tab === 'coach')));
};

window.doLogin = async () => {
    const e = document.getElementById('le').value, p = document.getElementById('lp').value;
    const { data, error } = await sb.auth.signInWithPassword({ email: e, password: p });
    if(error) return alert("Hatalı Giriş!");
    currentUser = { name: 'Yönetici', role: 'admin', id: data.user.id };
    loginSuccess();
};

window.doNormalLogin = async (type) => {
    const tc = document.getElementById(type === 'coach' ? 'lc-tc' : 'ls-tc').value;
    const { data } = await sb.from(type === 'coach' ? 'coaches' : 'athletes').select('*').eq('tc', tc).single();
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
    athletes = res[0].data || []; payments = res[1].data || []; coaches = res[2].data || []; branches = res[3].data || [];
    go('dashboard');
}

window.go = (pg) => {
    const main = document.getElementById('main');
    document.querySelectorAll('.ni').forEach(el => el.classList.toggle('on', el.id === 'ni-'+pg));
    if(pg === 'dashboard') main.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:30px">
            <div class="card stat-card"><h2>${athletes.length}</h2><p class="tm">Sporcu</p></div>
            <div class="card stat-card" style="border-color:var(--green)"><h2>${branches.length}</h2><p class="tm">Şube</p></div>
            <div class="card stat-card" style="border-color:var(--yellow)"><h2>${coaches.length}</h2><p class="tm">Antrenör</p></div>
            <div class="card stat-card" style="border-color:var(--red)"><h2>${payments.length}</h2><p class="tm">İşlem</p></div>
        </div>`;
    else if(pg === 'athletes') main.innerHTML = `
        <div class="card">
            <div class="fjb flex mb3"><h3>Sporcu Listesi</h3><button class="btn bp">+ Yeni Kayıt</button></div>
            <div class="tw"><table><thead><tr><th>İsim Soyisim</th><th>TC</th><th>Branş</th></tr></thead>
            <tbody>${athletes.map(a => `<tr><td><b>${a.fn} ${a.ln}</b></td><td>${a.tc}</td><td>${a.sp || 'Futbol'}</td></tr>`).join('')}</tbody></table></div>
        </div>`;
    else if(pg === 'branches') main.innerHTML = `
        <div class="card">
            <div class="fjb flex mb3"><h3>Şube Yönetimi</h3><button class="btn bp">+ Yeni Şube</button></div>
            <div class="tw"><table><thead><tr><th>Şube Adı</th><th>Öğrenci Sayısı</th><th>Durum</th></tr></thead>
            <tbody>${branches.map(b => `<tr><td><b>${b.name}</b></td><td>${athletes.length}</td><td><span style="color:var(--green)">Aktif</span></td></tr>`).join('')}</tbody></table></div>
        </div>`;
    else if(pg === 'org-manage') main.innerHTML = `
        <div class="card"><h3>Kurum Yönetimi</h3><p class="tm mt3">Yönetici: ${currentUser.name}</p><button class="btn bs mt3">+ Yönetici Ekle</button></div>`;
    else main.innerHTML = `<div class="card"><h3>${pg.toUpperCase()}</h3><p class="tm">Yükleniyor...</p></div>`;
};

window.showLegal = (t) => {
    document.getElementById('modal-title').textContent = t.toUpperCase();
    document.getElementById('modal-body').textContent = t === 'kvkk' ? "Kişisel verileriniz KVKK kapsamında korunmaktadır." : "Akademi kurallarını kabul etmiş sayılırsınız.";
    document.getElementById('modal-footer').innerHTML = `<button class="btn bp" onclick="closeModal()">Anladım</button>`;
    document.getElementById('modal').classList.add('show');
};
window.closeModal = () => document.getElementById('modal').classList.remove('show');
window.doLogout = () => { localStorage.clear(); location.reload(); };

document.addEventListener('DOMContentLoaded', () => {
    setInterval(() => { document.getElementById('live-clock').textContent = new Date().toLocaleTimeString(); }, 1000);
    const saved = localStorage.getItem('sporcu_app_user');
    if(saved) { currentUser = JSON.parse(saved); loginSuccess(); }
});
