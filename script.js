/* ============================================================
   DRAGOS FUTBOL AKADEMİSİ — EKSİKSİZ PRO KOD YAPISI
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
    currentUser = { name: 'Sistem Yöneticisi', role: 'admin', id: data.user.id };
    loginSuccess();
};

window.doNormalLogin = async (type) => {
    const tc = document.getElementById(type==='coach'?'lc-tc':'ls-tc').value;
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
    loadAllData();
}

async function loadAllData() {
    // Veritabanından tüm tabloları EKSİKSİZ çekiyoruz
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
    
    // Yetki yönetimi
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
    document.getElementById('bar-title').textContent = document.getElementById('ni-'+pg)?.textContent.split(' ').slice(1).join(' ') || 'Panel';
    
    if(pg === 'dashboard') {
        main.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:30px">
            <div class="card stat-card" style="border-color:var(--blue)"><h2>${athletes.length}</h2><p class="tm">Toplam Sporcu</p></div>
            <div class="card stat-card" style="border-color:var(--green)"><h2>${branches.length}</h2><p class="tm">Aktif Şube</p></div>
            <div class="card stat-card" style="border-color:var(--yellow)"><h2>${coaches.length}</h2><p class="tm">Antrenör</p></div>
            <div class="card stat-card" style="border-color:var(--red)"><h2>${payments.length}</h2><p class="tm">Mali Kayıt</p></div>
        </div>
        <div class="card"><h3>Son Kayıtlar</h3><p class="tm">Sisteme yeni dahil olan sporcular burada listelenir.</p></div>`;
    } 
    else if(pg === 'athletes') {
        main.innerHTML = `
        <div class="card">
            <div class="fjb flex mb3"><h3>Sporcu Listesi</h3><button class="btn bp">+ Yeni Sporcu Kaydet</button></div>
            <div class="tw"><table><thead><tr><th>Ad Soyad</th><th>TC No</th><th>Branş</th><th>Durum</th></tr></thead>
            <tbody>${athletes.map(a => `<tr><td><b>${a.fn} ${a.ln}</b></td><td>${a.tc}</td><td>${a.sp || 'Futbol'}</td><td><span style="color:var(--green)">● Aktif</span></td></tr>`).join('')}</tbody></table></div>
        </div>`;
    }
    else if(pg === 'branches') {
        main.innerHTML = `
        <div class="card">
            <div class="fjb flex mb3"><h3>Şube Yönetimi</h3><button class="btn bp">+ Yeni Şube Ekle</button></div>
            <div class="tw"><table><thead><tr><th>Şube Adı</th><th>Sporcu Sayısı</th><th>Durum</th></tr></thead>
            <tbody>${branches.map(b => `<tr><td><b>${b.name}</b></td><td>${athletes.length}</td><td><span style="color:var(--green)">Aktif</span></td></tr>`).join('')}</tbody></table></div>
        </div>`;
    }
    else if(pg === 'coaches') {
        main.innerHTML = `
        <div class="card">
            <div class="fjb flex mb3"><h3>Antrenörler</h3><button class="btn bp">+ Yeni Antrenör</button></div>
            <div class="tw"><table><thead><tr><th>Ad Soyad</th><th>TC</th><th>İşlem</th></tr></thead>
            <tbody>${coaches.map(c => `<tr><td><b>${c.fn} ${c.ln}</b></td><td>${c.tc}</td><td><button class="btn bs">Detay</button></td></tr>`).join('')}</tbody></table></div>
        </div>`;
    }
    else if(pg === 'org-manage') {
        main.innerHTML = `
        <div class="card"><h3>🛡️ Kurum Yönetimi</h3><p class="tm mt3"><b>Sorumlu:</b> ${currentUser.name}</p><p class="tm">Sistemin genel yönetici ayarları ve log kayıtları buradan yönetilir.</p><button class="btn bs mt3">+ Yönetici Ekle</button></div>`;
    }
    else if(pg === 'announcements') {
        main.innerHTML = `
        <div class="card"><h3>📢 Duyuru Paneli</h3><div class="fgr mt3"><label>Duyuru Başlığı</label><input placeholder="Duyuru Başlığı..."/></div><div class="fgr"><label>Mesaj</label><textarea style="width:100%;height:100px;background:var(--bg3);border:1px solid var(--border);color:#fff;border-radius:10px;padding:10px"></textarea></div><button class="btn bp mt3">Duyuruyu Yayınla</button></div>`;
    }
    else { main.innerHTML = `<div class="card"><h3>${pg.toUpperCase()}</h3><p class="tm">Bu bölüm üzerinde çalışmalar devam ediyor.</p></div>`; }
};

window.showLegal = (type) => {
    document.getElementById('modal-title').textContent = type.toUpperCase();
    document.getElementById('modal-body').textContent = type === 'kvkk' ? "Kişisel verileriniz 6698 sayılı kanuna uygun olarak Dragos Futbol Akademisi bünyesinde güvenle saklanmaktadır." : "Bu sistemi kullanarak akademi kurallarını ve ödeme şartlarını kabul etmiş sayılırsınız.";
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
    if(stored) { currentUser = JSON.parse(stored); loginSuccess(); }
});
