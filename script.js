/* ============================================================
   DRAGOS FUTBOL AKADEMİSİ — FULL PRO SÜRÜM
   ============================================================ */
const SUPA_URL = 'https://wfarbydojxtufnkjuhtc.supabase.co';
const SUPA_KEY = 'sb_publishable_w1_nXk_7TM1ePWHMN2CDcQ_1ufk0kYC';
const sb = supabase.createClient(SUPA_URL, SUPA_KEY);

let currentUser = null;
let athletes = [], payments = [], coaches = [], branches = [];

// Canlı Saat
setInterval(() => {
    const el = document.getElementById('live-clock');
    if(el) el.textContent = new Date().toLocaleTimeString('tr-TR');
}, 1000);

window.switchLoginTab = (tab) => {
    document.getElementById('login-sporcu').classList.toggle('dn', tab !== 'sporcu');
    document.getElementById('login-coach').classList.toggle('dn', tab !== 'coach');
    document.querySelectorAll('.ltab').forEach((el, i) => el.classList.toggle('on', (i===0 && tab==='sporcu') || (i===1 && tab==='coach')));
};

window.doLogin = async () => {
    const e = document.getElementById('le').value, p = document.getElementById('lp').value;
    const { data, error } = await sb.auth.signInWithPassword({ email: e, password: p });
    if(error) return alert("Hatalı Giriş Bilgileri!");
    currentUser = { name: 'Sistem Yöneticisi', role: 'admin', id: data.user.id };
    loginSuccess();
};

window.doNormalLogin = async (type) => {
    const tc = document.getElementById(type==='coach'?'lc-tc':'ls-tc').value;
    const { data, error } = await sb.from(type === 'coach' ? 'coaches' : 'athletes').select('*').eq('tc', tc).single();
    if(!data) return alert("Kayıtlı kullanıcı bulunamadı!");
    currentUser = { name: data.fn + ' ' + data.ln, role: type, id: data.id };
    loginSuccess();
};

function loginSuccess() {
    localStorage.setItem('sporcu_app_user', JSON.stringify(currentUser));
    document.getElementById('lbox-wrap').classList.add('dn');
    document.getElementById('wrap').classList.remove('dn');
    document.getElementById('suname').textContent = currentUser.name;
    loadFullData();
}

async function loadFullData() {
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
    
    // Yetki kısıtlaması (Antrenörler için)
    if(currentUser.role !== 'admin') {
        ['ni-payments','ni-accounting','ni-branches','ni-org-manage','ni-settings','sec-finance','sec-platform','sec-sys'].forEach(id => {
            const el = document.getElementById(id); if(el) el.style.display = 'none';
        });
    }
    go('dashboard');
}

window.go = (pg) => {
    const main = document.getElementById('main');
    document.getElementById('bar-title').textContent = document.getElementById('ni-'+pg)?.textContent.split(' ').slice(1).join(' ') || 'Panel';
    document.querySelectorAll('.ni').forEach(el => el.classList.toggle('on', el.id === 'ni-'+pg));
    
    if(pg === 'dashboard') {
        main.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:30px">
            <div class="card stat-card" style="border-color:var(--blue)"><h2>${athletes.length}</h2><p class="tm">Toplam Sporcu</p></div>
            <div class="card stat-card" style="border-color:var(--green)"><h2>${branches.length}</h2><p class="tm">Aktif Şube</p></div>
            <div class="card stat-card" style="border-color:var(--yellow)"><h2>${coaches.length}</h2><p class="tm">Antrenör Sayısı</p></div>
            <div class="card stat-card" style="border-color:var(--red)"><h2>${payments.length}</h2><p class="tm">Mali İşlem</p></div>
        </div>
        <div class="g2" style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
            <div class="card"><h3>Son Kayıtlar</h3><p class="tm">Sisteme yeni dahil olan sporcular.</p></div>
            <div class="card"><h3>Bekleyen Ödemeler</h3><p class="tm">Vadesi yaklaşan aidatlar.</p></div>
        </div>`;
    } 
    else if(pg === 'athletes') {
        main.innerHTML = `
        <div class="card">
            <div class="fjb flex mb3">
                <div><h3>Sporcu Veritabanı</h3><p class="tm ts">Tüm kayıtlı öğrencilerin detaylı listesi.</p></div>
                <button class="btn bp" onclick="alert('Yeni Sporcu Formu Açılıyor...')">+ Yeni Sporcu Kaydı</button>
            </div>
            <div class="tw"><table><thead><tr><th>İsim Soyisim</th><th>TC Kimlik</th><th>Branş</th><th>Durum</th></tr></thead>
            <tbody>${athletes.map(a => `<tr><td><b>${a.fn} ${a.ln}</b></td><td>${a.tc}</td><td>${a.sp || 'Futbol'}</td><td><span style="color:var(--green)">● Aktif</span></td></tr>`).join('')}</tbody></table></div>
        </div>`;
    }
    else if(pg === 'branches') {
        main.innerHTML = `
        <div class="card">
            <div class="fjb flex mb3">
                <div><h3>Şube Yönetim Merkezi</h3><p class="tm ts">Lokasyon bazlı akademi şubeleri.</p></div>
                <button class="btn bp" onclick="alert('Yeni Şube Ekle')">+ Yeni Şube Tanımla</button>
            </div>
            <div class="tw"><table><thead><tr><th>Şube Adı</th><th>Lokasyon</th><th>Öğrenci Sayısı</th><th>Durum</th></tr></thead>
            <tbody>${branches.length ? branches.map(b => `<tr><td><b>${b.name}</b></td><td>İstanbul</td><td>${athletes.length}</td><td><span style="color:var(--green)">Açık</span></td></tr>`).join('') : '<tr><td colspan="4" class="tc tm">Kayıtlı şube bulunamadı.</td></tr>'}</tbody></table></div>
        </div>`;
    }
    else if(pg === 'org-manage') {
        main.innerHTML = `
        <div class="card">
            <h3>🛡️ Kurum Yönetimi & Platform Güvenliği</h3>
            <div style="margin:20px 0; padding:20px; background:rgba(255,255,255,0.05); border-radius:12px">
                <div class="tw6 mb2">Sistem Yetkilisi</div>
                <p class="tm"><b>Aktif Kullanıcı:</b> ${currentUser.name}</p>
                <p class="tm"><b>Rolü:</b> ${currentUser.role === 'admin' ? 'Tam Yetkili Yönetici' : 'Antrenör'}</p>
            </div>
            <div class="flex gap3">
                <button class="btn bs" onclick="alert('Loglar yükleniyor...')">İşlem Günlükleri</button>
                <button class="btn bp" onclick="alert('Yönetici Ekleme Paneli')">+ Yönetici Ekle</button>
            </div>
        </div>`;
    }
    else if(pg === 'announcements') {
        main.innerHTML = `
        <div class="card">
            <h3>📢 Duyuru ve Bildirim Merkezi</h3>
            <p class="tm mb3">Tüm veli ve sporculara SMS/Panel üzerinden duyuru gönderin.</p>
            <div class="fgr"><label>Duyuru Başlığı</label><input placeholder="Örn: Tatil Duyurusu"/></div>
            <div class="fgr"><label>Mesaj İçeriği</label><textarea style="width:100%;background:var(--bg3);border:1px solid var(--border);color:#fff;padding:15px;border-radius:10px;min-height:100px"></textarea></div>
            <div class="flex fjb mt3">
                <label class="ts tm"><input type="checkbox" checked> SMS olarak da gönder</label>
                <button class="btn bp" onclick="alert('Duyuru Yayınlandı!')">Duyuruyu Yayınla</button>
            </div>
        </div>`;
    }
    else {
        main.innerHTML = `
        <div class="card tc" style="padding:100px 0">
            <div style="font-size:50px;margin-bottom:20px">🚧</div>
            <h3>${pg.toUpperCase()} MODÜLÜ</h3>
            <p class="tm">Bu bölüm üzerinde çalışmalarımız devam ediyor. Çok yakında hizmete girecektir.</p>
            <button class="btn bs mt3" onclick="go('dashboard')">Geri Dön</button>
        </div>`;
    }
};

window.showLegal = (type) => {
    document.getElementById('modal-title').textContent = type === 'kvkk' ? "KVKK Aydınlatma Metni" : "Kullanım Sözleşmesi";
    document.getElementById('modal-body').innerHTML = type === 'kvkk' 
        ? "Dragos Futbol Akademisi olarak sporcularımızın ve velilerimizin kişisel verilerini (TC, Telefon, Ad-Soyad) 6698 sayılı KVKK kanunu kapsamında Supabase şifreli sunucularında güvenle saklamaktayız. Verileriniz üçüncü şahıslarla asla paylaşılmaz."
        : "Bu sistemi kullanarak akademi kurallarını, aidat ödeme şartlarını ve tesis kullanım talimatlarını kabul etmiş sayılırsınız. Ödemelerin gecikmesi durumunda sistem otomatik uyarı gönderme yetkisine sahiptir.";
    document.getElementById('modal-footer').innerHTML = `<button class="btn bp" onclick="closeModal()">Okudum, Anladım</button>`;
    document.getElementById('modal').classList.add('show');
};

window.closeModal = () => document.getElementById('modal').classList.remove('show');
window.doLogout = () => { localStorage.clear(); location.reload(); };

document.addEventListener('DOMContentLoaded', () => {
    // Admin URL Kontrolü
    if(window.location.href.includes('admin')) {
        document.getElementById('login-tabs').classList.add('dn');
        document.getElementById('login-sporcu').classList.add('dn');
        document.getElementById('login-admin').classList.remove('dn');
    }
    // Oturum Kontrolü
    const stored = localStorage.getItem('sporcu_app_user');
    if(stored) { currentUser = JSON.parse(stored); loginSuccess(); }
});
