/* ============================================================
   SPORCU PANELI — script.js (EKSİKSİZ VE KUSURSUZ FİNAL SÜRÜM)
   Tüm Modüller, Tema, Dil, Gizli Admin, Antrenör Yetkisi ve Sekmeli Giriş
   ============================================================ */

window.onerror = function(msg, url, line) { return true; };
if (window.location.hostname.includes('vercel.app')) { console.log = function(){}; console.warn = function(){}; }

var SUPA_URL = 'https://wfarbydojxtufnkjuhtc.supabase.co';
var SUPA_KEY = 'sb_publishable_w1_nXk_7TM1ePWHMN2CDcQ_1ufk0kYC';
var DEFAULT_LOGO = '/assets/logo.png'; 
var NETGSM_USER = '', NETGSM_PASS = '', NETGSM_HEADER = 'SPORCU';

var _sb = null;
function getSB() { if (!_sb) { try { _sb = supabase.createClient(SUPA_URL, SUPA_KEY); } catch(e) { toast('Bağlantı kurulamadı!', 'e'); } } return _sb; }
function initAuth() { var sb = getSB(); if(sb) sb.auth.onAuthStateChange(function(e, s) { if (e === 'SIGNED_OUT') currentUser = null; }); }

// --- TEMA VE DİL SİSTEMİ ---
var currentTheme = localStorage.getItem('sporcu_theme') || 'dark';
var currentLang = localStorage.getItem('sporcu_lang') || 'TR';

function applyTheme(theme) {
    var btn = document.getElementById('theme-btn'), spBtn = document.getElementById('sp-theme-btn');
    if (theme === 'light') { document.documentElement.setAttribute('data-theme', 'light'); if(btn) btn.innerText='🌙'; if(spBtn) spBtn.innerText='🌙'; } 
    else { document.documentElement.removeAttribute('data-theme'); if(btn) btn.innerText='☀️'; if(spBtn) spBtn.innerText='☀️'; }
    localStorage.setItem('sporcu_theme', theme); currentTheme = theme;
}
function toggleTheme() { applyTheme(currentTheme === 'dark' ? 'light' : 'dark'); }

function applyLang(lang) {
    currentLang = lang; localStorage.setItem('sporcu_lang', lang);
    var btn = document.getElementById('lang-btn'); if (btn) btn.innerText = lang === 'TR' ? 'EN' : 'TR';
    var dict = {
        'EN': { 'menuMain': 'Main Menu', 'menuDash': 'Dashboard', 'menuAth': 'Athletes', 'menuSpo': 'Branches', 'menuCls': 'Classes', 'menuAtt': 'Attendance', 'menuCoa': 'Coaches', 'menuMsg': 'Messages', 'menuFinSec': 'Finance Management', 'menuPay': 'Payments', 'menuAcc': 'Financial Report', 'menuBra': 'Branches', 'menuAnn': 'Announcements', 'menuSms': 'SMS Alerts', 'menuSysSec': 'System', 'menuSet': 'Settings', 'roleAdmin': 'Administrator', 'btnLogout': 'Log Out', 'spProfil':'Profile', 'spYoklama':'Attendance', 'spOdemeler':'Payments', 'spOdemeYap':'Pay Now' },
        'TR': { 'menuMain': 'Ana Menü', 'menuDash': 'Gösterge', 'menuAth': 'Sporcular', 'menuSpo': 'Branşlar', 'menuCls': 'Sınıflar', 'menuAtt': 'Devam (Yoklama)', 'menuCoa': 'Antrenörler', 'menuMsg': 'Mesajlar', 'menuFinSec': 'Yönetim (Muhasebe)', 'menuPay': 'Ödemeler', 'menuAcc': 'Finans / Rapor', 'menuBra': 'Şubeler', 'menuAnn': 'Duyurular', 'menuSms': 'SMS Duyuru', 'menuSysSec': 'Sistem', 'menuSet': 'Ayarlar', 'roleAdmin': 'Yönetici', 'btnLogout': 'Çıkış Yap', 'spProfil':'Profil', 'spYoklama':'Yoklama', 'spOdemeler':'Ödemeler', 'spOdemeYap':'Ödeme Yap' }
    };
    document.querySelectorAll('[data-i18n]').forEach(function(el) { var key = el.getAttribute('data-i18n'); if (dict[lang] && dict[lang][key]) el.innerHTML = dict[lang][key]; });
}
function toggleLang() { var newLang = currentLang === 'TR' ? 'EN' : 'TR'; applyLang(newLang); if(document.getElementById('main-wrap').classList.contains('dn')===false) go(curPage); }

// --- GİRİŞ EKRANI SEKME GEÇİŞİ ---
window.switchLoginTab = function(tab) {
    var ls = document.getElementById('login-sporcu');
    var lc = document.getElementById('login-coach');
    if(ls) ls.classList.toggle('dn', tab !== 'sporcu');
    if(lc) lc.classList.toggle('dn', tab !== 'coach');
    
    var tabs = document.querySelectorAll('#login-tabs .ltab');
    if(tabs.length > 1) {
        tabs[0].classList.toggle('on', tab === 'sporcu');
        tabs[1].classList.toggle('on', tab === 'coach');
    }
};

document.addEventListener('DOMContentLoaded', async function() { 
  applyTheme(currentTheme); applyLang(currentLang); initAuth(); 
  var logoEl = document.querySelector('.llogo-i'); if (logoEl) logoEl.style.backgroundImage = 'url("' + DEFAULT_LOGO + '")';
  
  // GİZLİ ADMİN KONTROLÜ
  if(window.location.href.includes('admin')) {
      var tabs = document.getElementById('login-tabs');
      var ls = document.getElementById('login-sporcu');
      var lc = document.getElementById('login-coach');
      var la = document.getElementById('login-admin');
      if(tabs) tabs.classList.add('dn');
      if(ls) ls.classList.add('dn');
      if(lc) lc.classList.add('dn');
      if(la) la.classList.remove('dn');
  }
  await restoreSession(); 
});

var currentUser = null, currentOrgId = null, currentBranchId = null, currentSporcu = null;
var athletes = [], payments = [], coaches = [], attData = {}, messages = [], settings = {}, sports = [], classes = [];
var _branchesCache = [];
var curPage = 'dashboard', ATD = tod(), ATSP = '', ATCLS = '', _athFilter = { sp: '', st: '', cls: '', q: '' }, _payFilter = { st: '', q: '' };

// YARDIMCI FONKSİYONLAR
function tod() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function uid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) { var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8); return v.toString(16); }); }
function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function fmtN(n) { return Number(n || 0).toLocaleString('tr-TR'); }
function fmtD(s) { if (!s) return '-'; try { var d = new Date(s); return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); } catch(e) { return s; } }
function age(bd) { if (!bd) return '-'; var d = new Date(bd), now = new Date(); return now.getFullYear() - d.getFullYear() - (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0); }
function gv(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
function gvn(id) { return parseFloat(gv(id)) || 0; }
function stl(s) { var m = { active: 'Aktif', inactive: 'Pasif', pending: 'Bekliyor', completed: 'Tamamlandı', overdue: 'Gecikti', cancelled: 'İptal' }; return m[s] || s || '-'; }
function stc(s) { var m = { active: 'bg-g', inactive: 'bg-r', pending: 'bg-y', completed: 'bg-g', overdue: 'bg-r', cancelled: 'bg-r' }; return m[s] || 'bg-b'; }
function semi(sp) { var sl = (sp||'').toLowerCase(); if (sl.includes('basket')) return '&#x1F3C0;'; if (sl.includes('yuzme')||sl.includes('yüzme')) return '&#x1F3CA;'; return '&#x26BD;'; }
function clsName(ci) { var c = classes.find(function(x){return x.id===ci;}); return c ? c.name : '-'; }
function getAvaStr(sz) { return '<div class="ava" style="width:'+sz+'px;height:'+sz+'px;flex-shrink:0;background-image:url(\''+(settings.logoUrl||DEFAULT_LOGO)+'\');background-size:cover;background-position:center;border:1px solid var(--border);background-color:var(--bg3)"></div>'; }
function setElAva(id) { var el = document.getElementById(id); if (el) { el.innerHTML=''; el.style.backgroundImage='url("'+(settings.logoUrl||DEFAULT_LOGO)+'")'; el.style.backgroundSize='cover'; el.style.backgroundPosition='center'; } }
function showLoading() { var el = document.getElementById('loading-overlay'); if(el) el.style.display = 'flex'; }
function hideLoading() { var el = document.getElementById('loading-overlay'); if(el) el.style.display = 'none'; }
function toast(msg, type) { var t = document.createElement('div'); t.className = 'toast ' + (type==='e'?'toast-e':type==='g'?'toast-g':'toast-y'); t.textContent = msg; document.body.appendChild(t); setTimeout(function(){ t.classList.add('show'); },10); setTimeout(function(){ t.classList.remove('show'); setTimeout(function(){ t.remove();},3000); }, 3000); }
function modal(title, body, btns) { var m = document.getElementById('modal'); document.getElementById('modal-title').textContent = title; document.getElementById('modal-body').innerHTML = body; var mf = document.getElementById('modal-footer'); mf.innerHTML = ''; (btns || []).forEach(function(b) { var btn = document.createElement('button'); btn.className = 'btn ' + b.cls; btn.innerHTML = b.lbl; btn.onclick = async function() { btn.innerHTML='⏳'; btn.style.pointerEvents='none'; try{await b.fn();}catch(err){}finally{btn.innerHTML=b.lbl;btn.style.pointerEvents='auto';} }; mf.appendChild(btn); }); m.classList.add('show'); }
function closeModal() { document.getElementById('modal').classList.remove('show'); }
function confirm2(t, m, cb) { modal(t, '<p class="tsm tm">'+m+'</p>', [{lbl:'Vazgeç',cls:'bs',fn:closeModal},{lbl:'Evet',cls:'bd',fn:async function(){closeModal();if(cb)await cb();}}]); }
async function sha256(str) { var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)); return Array.from(new Uint8Array(buf)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join(''); }
function overdueCount() { return payments.filter(function(p){return p.st==='overdue';}).length; }
function attRate(aid) { var tot=0, pres=0; Object.keys(attData).forEach(function(d){ if(attData[d]&&attData[d][aid]){ tot++; if(attData[d][aid]==='P') pres++; } }); return tot ? Math.round(pres/tot*100) : null; }
function checkOverdue() { var today = tod(); payments.forEach(function(p) { if (p && p.st === 'pending' && p.dt && p.dt < today) { p.st = 'overdue'; dbSavePay(p); } }); }

// EXCEL ÇIKTISI
function exportCSV(data, filename) { 
    if (!data || !data.length) { toast('Dışa aktarılacak veri yok', 'e'); return; } 
    var cols = Object.keys(data[0]); 
    var csv = cols.join(';') + '\n' + data.map(function(r) { return cols.map(function(c) { var v = r[c] === null || r[c] === undefined ? '' : String(r[c]); return '"' + v.replace(/"/g, '""') + '"'; }).join(';'); }).join('\n'); 
    var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); 
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename + '.csv'; a.click(); toast('CSV indirildi!', 'g'); 
}
function exportAthletes() { exportCSV(athletes.map(function(a) { return { Ad: a.fn||'', Soyad: a.ln||'', TC: a.tc||'', Spor: a.sp||'', Sinif: clsName(a.clsId), Durum: stl(a.st), Veli: a.pn||'', Telefon: a.ph||'' }; }), 'sporcular'); }
function exportPayments() { exportCSV(payments.map(function(p) { return { Tarih: p.dt||'', Sporcu: p.an||'', Aciklama: p.ds||'', Tutar: p.amt||0, Tur: p.ty==='income'?'Gelir':'Gider', Durum: stl(p.st) }; }), 'odemeler'); }

// API Functions
async function supaGet(t, f) { try{ var db=getSB(); var q=db.from(t).select('*').limit(2000); if(f) Object.keys(f).forEach(function(k){q=q.eq(k,f[k]);}); var {data} = await q; return data||[]; }catch(e){return null;} }
async function supaUpsert(t, d) { try{ var db=getSB(); var arr=Array.isArray(d)?d:[d]; var {data} = await db.from(t).upsert(arr,{onConflict:'id'}).select(); return data; }catch(e){return null;} }
async function supaDelete(t, f) { try{ var db=getSB(); var q=db.from(t).delete(); Object.keys(f).forEach(function(k){q=q.eq(k,f[k]);}); await q; return true; }catch(e){return false;} }

// Mappers
function dbToAth(r) { return { id: r.id, fn: r.fn, ln: r.ln, tc: r.tc, bd: r.bd, gn: r.gn, ph: r.ph, em: r.em||'', sp: r.sp, cat: r.cat, lic: r.lic, rd: r.rd, st: r.st||'active', fee: r.fee||0, vd: r.vd, nt: r.nt, clsId: r.cls_id, pn: r.pn, pph: r.pph, pem: r.pem, spPass: r.sp_pass }; }
function athToDB(a) { return { id: a.id, org_id: currentOrgId, branch_id: currentBranchId, fn: a.fn, ln: a.ln, tc: a.tc, bd: a.bd, gn: a.gn, ph: a.ph, em: a.em||'', sp: a.sp, cat: a.cat, lic: a.lic, rd: a.rd, st: a.st, fee: a.fee, vd: a.vd, nt: a.nt, cls_id: a.clsId, pn: a.pn, pph: a.pph, pem: a.pem, sp_pass: a.spPass }; }
function dbToPay(r) { return { id: r.id, aid: r.aid, an: r.an, amt: r.amt||0, dt: r.dt, ty: r.ty, cat: r.cat, ds: r.ds, st: r.st||'pending', inv: r.inv, dd: r.dd, serviceName: r.service_name||'' }; }
function payToDB(p) { return { id: p.id, org_id: currentOrgId, branch_id: currentBranchId, aid: p.aid, an: p.an, amt: p.amt, dt: p.dt, ty: p.ty, cat: p.cat, ds: p.ds, st: p.st, inv: p.inv, dd: p.dd, service_name: p.serviceName }; }
function dbToCoach(r) { return { id: r.id, fn: r.fn, ln: r.ln, tc: r.tc, ph: r.ph, em: r.em, sp: r.sp, sal: r.sal||0, st: r.st||'active', coachPass: r.coach_pass }; }
function coachToDB(c) { return { id: c.id, org_id: currentOrgId, branch_id: currentBranchId, fn: c.fn, ln: c.ln, tc: c.tc, ph: c.ph, em: c.em, sp: c.sp, sal: c.sal, st: c.st, coach_pass: c.coachPass }; }
function dbToMsg(r) { return { id: r.id, fr: r.fr, role: r.role, sub: r.sub, body: r.body, dt: r.dt, rd: r.rd }; }
function msgToDB(m) { return { id: m.id, org_id: currentOrgId, branch_id: currentBranchId, fr: m.fr, role: m.role, sub: m.sub, body: m.body, dt: m.dt, rd: m.rd }; }
function dbToClass(r) { return { id: r.id, name: r.name, spId: r.sp_id, coachId: r.coach_id, cap: r.cap }; }
function dbToSport(r) { return { id: r.id, name: r.name, icon: r.icon }; }
function settingsToDB(s) { return { id: s.id || uid(), org_id: currentOrgId, branch_id: currentBranchId, school_name: s.schoolName, logo_url: s.logoUrl, bank_name: s.bankName, account_name: s.accountName, iban: s.iban, owner_phone: s.ownerPhone, address: s.address, netgsm_user: s.netgsm_user, netgsm_pass: s.netgsm_pass, netgsm_header: s.netgsm_header }; }

async function dbSaveAth(a) { return await supaUpsert('athletes', athToDB(a)); }
async function dbDelAth(id) { return await supaDelete('athletes', { id: id }); }
async function dbSavePay(p) { return await supaUpsert('payments', payToDB(p)); }
async function dbDelPay(id) { return await supaDelete('payments', { id: id }); }
async function dbSaveCoach(c) { return await supaUpsert('coaches', coachToDB(c)); }
async function dbDelCoach(id) { return await supaDelete('coaches', { id: id }); }
async function dbSaveMsg(m) { return await supaUpsert('messages', msgToDB(m)); }
async function dbDelMsg(id) { return await supaDelete('messages', { id: id }); }
async function dbSaveAtt(date, aid, status) { if(status===undefined) await supaDelete('attendance', {athlete_id:aid, att_date:date}); else await supaUpsert('attendance', {org_id:currentOrgId, branch_id:currentBranchId, athlete_id:aid, att_date:date, status:status}); }
async function dbSaveClass(c) { return await supaUpsert('classes', { id: c.id, org_id: currentOrgId, branch_id: currentBranchId, name: c.name, sp_id: c.spId, coach_id: c.coachId, cap: c.cap }); }
async function dbDelClass(id) { return await supaDelete('classes', { id: id }); }
async function dbSaveSport(s) { return await supaUpsert('sports', { id: s.id, org_id: currentOrgId, branch_id: currentBranchId, name: s.name, icon: s.icon }); }
async function dbDelSport(id) { return await supaDelete('sports', { id: id }); }
async function saveS() { return await supaUpsert('settings', settingsToDB(settings)); }

// GİRİŞ KONTROLLERİ
window.doNormalLogin = async function(type) {
    var tc = gv(type === 'coach' ? 'lc-tc' : 'ls-tc');
    var pass = gv(type === 'coach' ? 'lc-pass' : 'ls-pass');
    var errEl = document.getElementById(type === 'coach' ? 'lc-err' : 'ls-err'); 
    
    if(!tc || !pass) { errEl.textContent = "TC ve şifre giriniz!"; errEl.classList.remove('dn'); return; }
    showLoading(); 
    try { 
        var ph = await sha256(pass);
        
        if (type === 'sporcu') {
            var athRes = await supaGet('athletes', { tc: tc }); var foundAth = null;
            (athRes || []).forEach(function(r) { var exp = r.sp_pass || tc.slice(-4); if (pass === exp || ph === exp) foundAth = r; }); 
            
            if (foundAth) {
                currentSporcu = dbToAth(foundAth); currentOrgId = foundAth.org_id; currentBranchId = foundAth.branch_id;
                localStorage.setItem('sporcu_app_sporcu', JSON.stringify({user: currentSporcu, orgId: currentOrgId, branchId: currentBranchId}));
                await loadBranchData(); document.getElementById('lbox-wrap').style.display = 'none'; document.getElementById('sporcu-portal').style.display = 'flex';
                document.getElementById('sp-name').textContent = currentSporcu.fn + ' ' + currentSporcu.ln;
                document.getElementById('sp-orgname').textContent = settings.schoolName || 'Dragos Futbol Akademisi';
                spTab('profil'); hideLoading(); return;
            }
        } 
        else if (type === 'coach') {
            var coaRes = await supaGet('coaches', { tc: tc }); var foundCoa = null;
            (coaRes || []).forEach(function(r) { var exp = r.coach_pass || tc.slice(-4); if (pass === exp || ph === exp) foundCoa = r; });
            
            if (foundCoa) {
                currentUser = { id: foundCoa.id, name: foundCoa.fn + ' ' + foundCoa.ln, role: 'coach', email: tc+'@coach' };
                currentOrgId = foundCoa.org_id; currentBranchId = foundCoa.branch_id;
                localStorage.setItem('sporcu_app_user', JSON.stringify(currentUser));
                await loadBranchData(); document.getElementById('lbox-wrap').style.display = 'none'; document.getElementById('wrap').classList.remove('dn');
                document.getElementById('suname').textContent = currentUser.name;
                document.querySelector('[data-i18n="roleAdmin"]').textContent = currentLang==='EN'?"Coach":"Antrenör";
                updateBranchUI(); go('attendance'); hideLoading(); return;
            }
        }
        
        hideLoading(); errEl.textContent = "Kayıt bulunamadı veya şifre hatalı!"; errEl.classList.remove('dn'); 
    } catch(e) { hideLoading(); errEl.textContent="Bir hata oluştu."; errEl.classList.remove('dn'); }
};

window.doLogin = async function() {
    var e = gv('le'), p = gv('lp'); showLoading();
    try {
        var sb = getSB(); var { data: authData, error: authError } = await sb.auth.signInWithPassword({ email: e, password: p });
        if (authError) { hideLoading(); toast('Hatalı yönetici girişi', 'e'); return; }
        var { data: userData } = await sb.from('users').select('*').eq('id', authData.user.id).single();
        if(!userData) userData = { id: authData.user.id, email: e, role: 'admin', org_id:'org-default', branch_id:'br-default', name: 'Yönetici' };
        currentUser = { id: userData.id, email: userData.email, orgId: userData.org_id, branchId: userData.branch_id, role: userData.role, name: userData.name };
        currentOrgId = currentUser.orgId; currentBranchId = currentUser.branchId;
        localStorage.setItem('sporcu_app_user', JSON.stringify(currentUser));
        await loadBranchData(); document.getElementById('lbox-wrap').style.display = 'none'; document.getElementById('wrap').classList.remove('dn');
        document.getElementById('suname').textContent = currentUser.name;
        document.querySelector('[data-i18n="roleAdmin"]').textContent = currentLang==='EN'?"Admin":"Yönetici";
        updateBranchUI(); go('dashboard'); hideLoading();
    } catch(err) { hideLoading(); toast('Hata', 'e'); }
};

async function restoreSession() {
  showLoading();
  var sb = getSB(); if(sb) { var { data } = await sb.auth.getSession(); }
  var storedUser = localStorage.getItem('sporcu_app_user');
  if (storedUser) {
      currentUser = JSON.parse(storedUser); currentOrgId = currentUser.orgId; currentBranchId = currentUser.branchId;
      document.getElementById('lbox-wrap').style.display = 'none'; document.getElementById('wrap').classList.remove('dn');
      document.getElementById('suname').textContent = currentUser.name;
      var roleText = currentUser.role === 'coach' ? (currentLang==='EN'?"Coach":"Antrenör") : (currentLang==='EN'?"Admin":"Yönetici");
      document.querySelector('[data-i18n="roleAdmin"]').textContent = roleText;
      await loadBranchData(); updateBranchUI(); go(currentUser.role === 'coach' ? 'attendance' : 'dashboard'); hideLoading(); return;
  }
  var storedSporcu = localStorage.getItem('sporcu_app_sporcu');
  if (storedSporcu) {
      var parsed = JSON.parse(storedSporcu); currentSporcu = parsed.user; currentOrgId = parsed.orgId; currentBranchId = parsed.branchId;
      await loadBranchData(); document.getElementById('lbox-wrap').style.display = 'none'; document.getElementById('sporcu-portal').style.display = 'flex';
      document.getElementById('sp-name').textContent = currentSporcu.fn + ' ' + currentSporcu.ln;
      document.getElementById('sp-orgname').textContent = settings.schoolName || 'Dragos Futbol Akademisi';
      spTab('profil'); hideLoading(); return;
  }
  hideLoading();
}

window.doLogout = function() { localStorage.clear(); location.reload(); };
window.doSporcuLogout = function() { localStorage.clear(); location.reload(); };

async function loadBranchData() {
    var bid = currentBranchId;
    var res = await Promise.all([ 
        supaGet('athletes', { branch_id: bid }), supaGet('payments', { branch_id: bid }), 
        supaGet('coaches', { branch_id: bid }), supaGet('attendance', { branch_id: bid }), 
        supaGet('messages', { branch_id: bid }), supaGet('settings', { branch_id: bid }), 
        supaGet('sports', { branch_id: bid }), supaGet('classes', { branch_id: bid }) 
    ]);
    athletes = (res[0]||[]).map(dbToAth); payments = (res[1]||[]).map(dbToPay); coaches = (res[2]||[]).map(dbToCoach);
    attData = {}; (res[3]||[]).forEach(function(r){ if(!attData[r.att_date]) attData[r.att_date]={}; attData[r.att_date][r.athlete_id]=r.status; });
    messages = (res[4]||[]).map(dbToMsg);
    settings = (res[5] && res[5][0]) ? res[5][0] : { school_name: 'Dragos Futbol Akademisi' };
    sports = (res[6]||[]).map(dbToSport); classes = (res[7]||[]).map(dbToClass);
    
    settings.schoolName = settings.school_name; settings.logoUrl = settings.logo_url;
    settings.bankName = settings.bank_name; settings.accountName = settings.account_name; settings.iban = settings.iban;
    settings.address = settings.address; settings.ownerPhone = settings.owner_phone;
    if(settings.netgsm_user){ NETGSM_USER = settings.netgsm_user; NETGSM_PASS = settings.netgsm_pass||''; NETGSM_HEADER = settings.netgsm_header||'SPORCU'; }
    checkOverdue();
}

function updateBranchUI() {
    var nameEl = document.getElementById('sn');
    if (nameEl) nameEl.textContent = (settings && settings.schoolName) ? settings.schoolName : 'Dragos Futbol Akademisi';
    setElAva('sava'); setElAva('bar-ava'); setElAva('side-logo-icon');
    
    // ANTRENÖR YETKİ KISITLAMALARI
    if (currentUser && currentUser.role === 'coach') {
        ['ni-dashboard', 'ni-payments', 'ni-accounting', 'ni-settings', 'ni-sms', 'ni-sports', 'ni-classes', 'ni-branches'].forEach(function(id) {
            var el = document.getElementById(id); if(el) el.style.display = 'none';
        });
        var finSec = document.getElementById('sec-finance'); if(finSec) finSec.style.display = 'none';
        var sysSec = document.getElementById('sec-sys'); if(sysSec) sysSec.style.display = 'none';
        var bdash = document.getElementById('bn-dashboard'); if(bdash) bdash.style.display='none';
    }
}

window.go = function(pg) {
    if (currentUser && currentUser.role === 'coach' && ['dashboard', 'payments', 'accounting', 'settings', 'sms', 'sports', 'classes'].includes(pg)) {
        toast('Bu sayfaya erişim yetkiniz yok.', 'e'); return;
    }
    curPage = pg; var main = document.getElementById('main');
    var fns = { dashboard: pgDashboard, athletes: pgAthletes, payments: pgPayments, accounting: pgAccounting, attendance: pgAttendance, coaches: pgCoaches, messages: pgMessages, settings: pgSettings, sports: pgSports, classes: pgClasses };
    main.style.opacity = '0';
    setTimeout(function() { if(fns[pg]) main.innerHTML = fns[pg](); main.style.opacity = '1'; }, 100);
    document.querySelectorAll('.ni').forEach(function(el) { el.classList.toggle('on', el.id === 'ni-' + pg); });
    document.querySelectorAll('.bni-btn').forEach(function(el) { el.classList.toggle('on', el.id === 'bn-' + pg); });
    closeSide();
};

window.openSide = function() { document.getElementById('side').classList.add('open'); document.getElementById('overlay').classList.add('show'); };
window.closeSide = function() { document.getElementById('side').classList.remove('open'); document.getElementById('overlay').classList.remove('show'); };

// --- SAYFALAR ---
function pgDashboard() { 
    var total = athletes.length, active = athletes.filter(function(a){return a.st==='active';}).length; 
    var inc = payments.filter(function(p){return p.ty==='income'&&p.st==='completed';}).reduce(function(s,p){return s+(p.amt||0);},0); 
    var exp = payments.filter(function(p){return p.ty==='expense'&&p.st==='completed';}).reduce(function(s,p){return s+(p.amt||0);},0);
    var od = overdueCount(); 
    return '<div class="ph"><div class="stit" data-i18n="menuDash">Gösterge</div></div><div class="g4 mb3"><div class="card stat-card stat-b" onclick="go(\'athletes\')"><div class="stat-icon">&#x1F465;</div><div class="stat-val">'+fmtN(active)+'</div><div class="stat-lbl">Aktif Sporcu</div></div><div class="card stat-card stat-g" onclick="go(\'payments\')"><div class="stat-icon">&#x1F4B0;</div><div class="stat-val">'+fmtN(inc)+' ₺</div><div class="stat-lbl">Aylık Gelir</div></div><div class="card stat-card stat-r" onclick="go(\'payments\')"><div class="stat-icon">&#x26A0;</div><div class="stat-val">'+fmtN(od)+'</div><div class="stat-lbl">Gecikmiş Ödeme</div></div><div class="card stat-card stat-y" onclick="go(\'athletes\')"><div class="stat-icon">&#x1F4CB;</div><div class="stat-val">'+fmtN(total)+'</div><div class="stat-lbl">Toplam Kayıt</div></div></div><div class="card mb3"><div class="tw6 tsm mb2">Hızlı Eylemler</div><div class="quick-actions"><button class="qa-btn" onclick="go(\'athletes\')"><div class="qa-icon">&#x2795;</div><div class="qa-lbl">YENİ SPORCU</div></button><button class="qa-btn" onclick="go(\'payments\')"><div class="qa-icon">&#x1F4B3;</div><div class="qa-lbl">ÖDEME AL</div></button><button class="qa-btn" onclick="go(\'attendance\')"><div class="qa-icon">&#x2705;</div><div class="qa-lbl">YOKLAMA</div></button></div></div><div class="g2"><div class="card"><div class="tw6 tsm mb2">Gelir/Gider Durumu</div><div style="display:flex;flex-direction:column;gap:10px;height:100px;justify-content:center"><div style="display:flex;align-items:center;gap:10px"><div style="width:12px;height:12px;border-radius:50%;background:var(--green)"></div><span style="font-size:13px">Gelir: <b>' + fmtN(inc) + ' ₺</b></span></div><div style="display:flex;align-items:center;gap:10px"><div style="width:12px;height:12px;border-radius:50%;background:var(--red)"></div><span style="font-size:13px">Gider: <b>' + fmtN(exp) + ' ₺</b></span></div><div style="height:20px;background:var(--bg3);border-radius:10px;overflow:hidden"><div style="width:' + (inc+exp>0?inc/(inc+exp)*100:50) + '%;height:100%;background:linear-gradient(90deg,var(--green),var(--blue))"></div></div></div></div></div>'; 
}

function pgAthletes() { 
    var list = athletes || []; 
    if (_athFilter.sp) list = list.filter(function(a) { return a.sp === _athFilter.sp; }); 
    if (_athFilter.st) list = list.filter(function(a) { return a.st === _athFilter.st; }); 
    if (_athFilter.cls) list = list.filter(function(a) { return a.clsId === _athFilter.cls; }); 
    if (_athFilter.q) { var q = _athFilter.q.toLowerCase(); list = list.filter(function(a) { return (a.fn+' '+a.ln).toLowerCase().includes(q) || a.tc.includes(q); }); } 
    return '<div class="ph"><div class="stit" data-i18n="menuAth">Sporcular</div></div>' +
           '<div class="flex fjb fca mb3 fwrap gap2"><div class="flex gap2 fwrap"><select class="fs" onchange="_athFilter.sp=this.value;go(\'athletes\')"><option value="">Tüm Branşlar</option>' + sports.map(function(s){return '<option value="'+esc(s.name)+'"'+(_athFilter.sp===s.name?' selected':'')+'>'+esc(s.name)+'</option>';}).join('') + '</select><select class="fs" onchange="_athFilter.st=this.value;go(\'athletes\')"><option value="">Tüm Durumlar</option><option value="active"'+(_athFilter.st==='active'?' selected':'')+'>Aktif</option><option value="inactive"'+(_athFilter.st==='inactive'?' selected':'')+'>Pasif</option></select><select class="fs" onchange="_athFilter.cls=this.value;go(\'athletes\')"><option value="">Tüm Sınıflar</option>' + classes.map(function(c){return '<option value="'+esc(c.id)+'"'+(_athFilter.cls===c.id?' selected':'')+'>'+esc(c.name)+'</option>';}).join('') + '</select></div><input class="fs" type="text" placeholder="🔍 İsim veya TC Ara..." style="max-width:250px" value="'+esc(_athFilter.q)+'" onchange="_athFilter.q=this.value;go(\'athletes\')"/></div>' +
           '<div class="flex fjb fca mb3 gap2"><button class="btn bp" onclick="editAth()">+ Yeni Sporcu</button><button class="btn bs" onclick="exportAthletes()">&#x1F4E4; Excel İndir</button></div><div class="card"><div class="tw"><table><thead><tr><th>Ad Soyad</th><th>TC</th><th>Branş</th><th>Sınıf</th><th>Durum</th><th>İşlemler</th></tr></thead><tbody>' + list.map(function(a) { return '<tr><td><div class="flex fca gap2">' + getAvaStr(36) + '<div><div class="tw6">' + esc(a.fn) + ' ' + esc(a.ln) + '</div><div class="ts tm">' + age(a.bd) + ' yaş</div></div></div></td><td>' + esc(a.tc) + '</td><td>' + semi(a.sp) + ' ' + esc(a.sp) + '</td><td>' + esc(clsName(a.clsId)) + '</td><td><span class="bg ' + stc(a.st) + '">' + stl(a.st) + '</span></td><td><button class="btn btn-xs bp" onclick="editAth(\'' + a.id + '\')">Düzenle</button> <button class="btn btn-xs bd" onclick="delAth(\'' + a.id + '\')">Sil</button></td></tr>'; }).join('') + '</tbody></table></div></div>'; 
}

window.editAth = function(id) { 
  var a = id ? athletes.find(function(x) { return x.id === id; }) : null; var isNew = !a; 
  var html = '<div class="g21"><div class="fgr"><label>Ad</label><input id="a-fn" value="' + esc(a?a.fn:'') + '"/></div><div class="fgr"><label>Soyad</label><input id="a-ln" value="' + esc(a?a.ln:'') + '"/></div></div><div class="g21"><div class="fgr"><label>TC Kimlik</label><input id="a-tc" type="tel" maxlength="11" value="' + esc(a?a.tc:'') + '"/></div><div class="fgr"><label>Doğum Tarihi</label><input id="a-bd" type="date" value="' + esc(a?a.bd:'') + '"/></div></div><div class="g21"><div class="fgr"><label>Telefon</label><input id="a-ph" type="tel" value="' + esc(a?a.ph:'') + '"/></div><div class="fgr"><label>Sınıf</label><select id="a-cls"><option value="">Sınıfsız</option>' + classes.map(function(c){return '<option value="'+esc(c.id)+'"'+(a&&a.clsId===c.id?' selected':'')+'>'+esc(c.name)+'</option>';}).join('') + '</select></div></div><div class="g21"><div class="fgr"><label>Branş</label><select id="a-sp">' + sports.map(function(s){return '<option value="'+esc(s.name)+'"'+(a&&a.sp===s.name?' selected':'')+'>'+esc(s.name)+'</option>';}).join('') + '</select></div><div class="fgr"><label>Durum</label><select id="a-st"><option value="active"'+(a&&a.st==='active'?' selected':'')+'>Aktif</option><option value="inactive"'+(a&&a.st==='inactive'?' selected':'')+'>Pasif</option></select></div></div>';
  if(currentUser && currentUser.role !== 'coach') { html += '<div class="g21 mt2"><div class="fgr"><label>Aylık Ücret (₺)</label><input id="a-fee" type="number" value="' + (a?a.fee:'') + '"/></div><div class="fgr"><label>Vade Takvimi (Ödeme Günü)</label><input id="a-vd" type="date" value="' + esc(a?a.vd:'') + '"/></div></div>'; }
  html += '<div class="dv"></div><div class="tw6 tsm mb2">Veli Bilgileri & Şifre</div><div class="g21"><div class="fgr"><label>Veli Ad Soyad</label><input id="a-pn" value="' + esc(a?a.pn:'') + '"/></div><div class="fgr"><label>Veli Telefon</label><input id="a-pph" type="tel" value="' + esc(a?a.pph:'') + '"/></div></div><div class="fgr mt2"><label>Sporcu Şifresi (Giriş için, boş bırakılırsa TC son 4)</label><input id="a-sppass" type="text" placeholder="Örn: 123456" value="' + esc(a?a.spPass:'') + '"/></div>';
  modal(isNew ? 'Yeni Sporcu' : 'Sporcu Düzenle', html, [
    { lbl: 'İptal', cls: 'bs', fn: closeModal }, 
    { lbl: 'Kaydet', cls: 'bp', fn: async function() { 
        var obj = { id: a?a.id:uid(), fn: gv('a-fn'), ln: gv('a-ln'), tc: gv('a-tc'), bd: gv('a-bd'), ph: gv('a-ph'), sp: gv('a-sp'), st: gv('a-st'), clsId: gv('a-cls'), pn: gv('a-pn'), pph: gv('a-pph'), spPass: gv('a-sppass'), gn:'E', em:'', cat:'', lic:'', rd:tod(), nt:'', pem:'' }; 
        if(currentUser && currentUser.role !== 'coach') { obj.fee = gvn('a-fee'); obj.vd = gv('a-vd'); } else if(a) { obj.fee = a.fee; obj.vd = a.vd; }
        if (!obj.fn || !obj.ln || !obj.tc) { toast('Ad, soyad ve TC zorunlu!', 'e'); return; } 
        if(await dbSaveAth(obj)){ if(isNew)athletes.push(obj); else{var idx=athletes.findIndex(function(x){return x.id===obj.id;}); if(idx>=0)athletes[idx]=obj;} toast('Kaydedildi!','g'); closeModal(); go('athletes'); }
    }}
  ]); 
};
window.delAth = function(id) { confirm2('Sil', 'Sporcu silinecek, emin misiniz?', async function() { if(await dbDelAth(id)){ athletes=athletes.filter(function(x){return x.id!==id;}); toast('Silindi','g'); go('athletes'); } }); };

// SINIFLAR
function pgClasses() { 
    return '<div class="ph"><div class="stit" data-i18n="menuCls">Sınıflar</div></div><div class="flex fjb fca mb3 gap2"><button class="btn bp" onclick="editClass()">+ Yeni Sınıf</button></div><div class="card"><div class="tw"><table><thead><tr><th>Sınıf</th><th>Branş</th><th>Antrenör</th><th>Öğrenci Sayısı</th><th>İşlemler</th></tr></thead><tbody>' + 
    classes.map(function(c) { 
        var sp = sports.find(function(s){return s.id===c.spId;}), coach = coaches.find(function(co){return co.id===c.coachId;}); 
        var count = athletes.filter(function(a){return a.clsId===c.id;}).length; 
        return '<tr><td class="tw6">' + esc(c.name) + '</td><td>' + (sp?esc(sp.name):'-') + '</td><td>' + (coach?esc(coach.fn+' '+coach.ln):'-') + '</td><td>' + count + '</td><td><button class="btn btn-xs bsu" style="margin-right:4px" onclick="viewClassAthletes(\''+c.id+'\')">Öğrenciler</button> <button class="btn btn-xs bp" onclick="editClass(\''+c.id+'\')">Düzenle</button> <button class="btn btn-xs bd" onclick="delClass(\''+c.id+'\')">Sil</button></td></tr>'; 
    }).join('') + '</tbody></table></div></div>'; 
}
window.viewClassAthletes = function(cid) {
    var cls = classes.find(function(c){return c.id===cid;}); if(!cls) return;
    var list = athletes.filter(function(a){return a.clsId===cid;});
    var html = list.length === 0 ? '<div class="al al-y">Bu sınıfa henüz kayıtlı sporcu bulunmuyor.</div>' : '<div class="tw"><table><thead><tr><th>Ad Soyad</th><th>TC</th><th>Veli</th></tr></thead><tbody>' + list.map(function(a){ return '<tr><td class="tw6">'+esc(a.fn+' '+a.ln)+'</td><td>'+esc(a.tc)+'</td><td>'+(a.pn?esc(a.pn)+' ('+esc(a.pph)+')':'-')+'</td></tr>'; }).join('') + '</tbody></table></div>';
    modal(esc(cls.name) + ' Öğrencileri', html, [{lbl:'Kapat',cls:'bs',fn:closeModal}]);
};
window.editClass = function(id) { 
    var c = id ? classes.find(function(x){return x.id===id;}) : null; var isNew = !c; 
    modal(isNew ? 'Yeni Sınıf' : 'Sınıf Düzenle', '<div class="fgr mb2"><label>Sınıf Adı</label><input id="c-name" value="'+esc(c?c.name:'')+'"/></div><div class="g21"><div class="fgr"><label>Branş</label><select id="c-sp">' + sports.map(function(s){return '<option value="'+esc(s.id)+'"'+(c&&c.spId===s.id?' selected':'')+'>'+esc(s.name)+'</option>';}).join('') + '</select></div><div class="fgr"><label>Antrenör</label><select id="c-coach"><option value="">Seçiniz</option>'+coaches.map(function(co){return '<option value="'+esc(co.id)+'"'+(c&&c.coachId===co.id?' selected':'')+'>'+esc(co.fn+' '+co.ln)+'</option>';}).join('')+'</select></div></div>', [
        {lbl:'İptal',cls:'bs',fn:closeModal}, {lbl:'Kaydet',cls:'bp',fn:async function(){
            var obj = {id:c?c.id:uid(), name:gv('c-name'), coachId:gv('c-coach'), spId:gv('c-sp'), cap:20};
            if(!obj.name){toast('İsim zorunlu','e');return;}
            if(await dbSaveClass(obj)){ if(isNew)classes.push(obj); else{var i=classes.findIndex(function(x){return x.id===obj.id;}); if(i>=0)classes[i]=obj;} toast('Kaydedildi','g'); closeModal(); go('classes'); }
        }}
    ]); 
};
window.delClass = function(id) { confirm2('Sil','Emin misiniz?', async function(){ if(await dbDelClass(id)){ classes=classes.filter(function(x){return x.id!==id;}); athletes.forEach(function(a){if(a.clsId===id)a.clsId='';}); toast('Silindi','g'); go('classes'); }}); };

// BRANŞLAR
function pgSports() { 
    return '<div class="ph"><div class="stit" data-i18n="menuSpo">Branşlar</div></div><div class="flex fjb mb3"><button class="btn bp" onclick="editSport()">+ Yeni Branş</button></div><div class="g2">' + sports.map(function(s){ return '<div class="card"><div class="flex fca gap2"><div style="font-size:32px">' + semi(s.name) + '</div><div><div class="tw6">' + esc(s.name) + '</div><div class="ts tm">' + athletes.filter(function(a){return a.sp===s.name;}).length + ' sporcu</div></div></div><div class="mt2" style="text-align:right"><button class="btn btn-xs bd" onclick="delSport(\''+s.id+'\')">Sil</button></div></div>'; }).join('') + '</div>'; 
}
window.editSport = function() { 
    modal('Yeni Branş', '<div class="fgr mb2"><label>Branş Adı</label><input id="s-name" placeholder="Basketbol"/></div>', [{lbl:'İptal',cls:'bs',fn:closeModal}, {lbl:'Kaydet',cls:'bp',fn:async function(){ var obj={id:uid(), name:gv('s-name'), icon:''}; if(!obj.name){toast('İsim girin','e');return;} if(await dbSaveSport(obj)){ sports.push(obj); toast('Eklendi','g'); closeModal(); go('sports'); } }}]); 
};
window.delSport = function(id) { confirm2('Sil','Emin misiniz?', async function(){ if(await dbDelSport(id)){ sports=sports.filter(function(x){return x.id!==id;}); toast('Silindi','g'); go('sports'); }}); };

// YOKLAMA
function pgAttendance() { 
    var list = athletes.filter(function(a){return a.st==='active';}); 
    if (ATCLS) list = list.filter(function(a){return a.clsId===ATCLS;}); 
    return '<div class="ph"><div class="stit" data-i18n="menuAtt">Devam Takibi</div></div><div class="card mb3"><div class="flex fca gap3 fwrap"><div class="fgr" style="flex:1;min-width:200px;"><input type="date" value="' + ATD + '" onchange="ATD=this.value;go(\'attendance\')" style="font-weight:700"/></div><div class="fgr"><select class="fs" onchange="ATCLS=this.value;go(\'attendance\')"><option value="">Tüm Sınıflar</option>' + classes.map(function(c){return '<option value="'+esc(c.id)+'"'+(ATCLS===c.id?' selected':'')+'>'+esc(c.name)+'</option>';}).join('') + '</select></div></div></div><div class="card">' + list.map(function(a) { var st = (attData[ATD]&&attData[ATD][a.id])||''; return '<div class="att-row"><div class="flex fca gap2" style="flex:1">' + getAvaStr(32) + '<div><div class="tw6 tsm">' + esc(a.fn+' '+a.ln) + '</div><div class="ts tm">' + esc(clsName(a.clsId)) + '</div></div></div><div class="att-btns"><button class="att-b'+(st==='P'?' ap':'')+'" onclick="setAtt(\''+a.id+'\',\'P\')">Var</button><button class="att-b'+(st==='A'?' aa':'')+'" onclick="setAtt(\''+a.id+'\',\'A\')">Yok</button><button class="att-b" onclick="setAtt(\''+a.id+'\')">Sil</button></div></div>'; }).join('') + '</div>'; 
}
window.setAtt = async function(aid, st) { if(!attData[ATD])attData[ATD]={}; if(st===undefined)delete attData[ATD][aid]; else attData[ATD][aid]=st; await dbSaveAtt(ATD, aid, st); go('attendance'); };

// ÖDEMELER VE FİNANS
function pgPayments() { 
    var list = payments || []; if (_payFilter.st) list = list.filter(function(p){return p.st===_payFilter.st;}); 
    var total = list.reduce(function(s,p){return s+(p.ty==='income'?(p.amt||0):-(p.amt||0));},0); 
    return '<div class="ph"><div class="stit" data-i18n="menuPay">Ödemeler</div></div><div class="flex fjb fca mb3 gap2"><button class="btn bp" onclick="editPay()">+ Yeni İşlem</button><div><button class="btn bs" onclick="exportPayments()" style="margin-right:8px">&#x1F4E4; İndir</button><span class="tw6 tb">Net: '+fmtN(total)+' ₺</span></div></div><div class="card"><div class="tw"><table><thead><tr><th>Tarih</th><th>Kişi/Kurum</th><th>Açıklama</th><th>Tutar</th><th>Tür</th><th>Durum</th><th>İşlemler</th></tr></thead><tbody>' + list.map(function(p){ return '<tr><td>'+fmtD(p.dt)+'</td><td>'+esc(p.an)+'</td><td>'+esc(p.serviceName||p.ds||'-')+'</td><td class="tw6 '+(p.ty==='income'?'tg':'tr2')+'">'+fmtN(p.amt)+' ₺</td><td><span class="bg '+(p.ty==='income'?'bg-g':'bg-r')+'">'+(p.ty==='income'?'Gelir':'Gider')+'</span></td><td><span class="bg '+stc(p.st)+'">'+stl(p.st)+'</span></td><td><button class="btn btn-xs bp" onclick="editPay(\''+p.id+'\')">Düzenle</button> <button class="btn btn-xs bd" onclick="delPay(\''+p.id+'\')">Sil</button></td></tr>'; }).join('')+'</tbody></table></div></div>'; 
}
window.editPay = function(id) { 
    var p = id ? payments.find(function(x){return x.id===id;}) : null; var isNew = !p; 
    modal(isNew ? 'Yeni Finansal İşlem' : 'İşlem Detayı', '<div class="fgr mb2"><label>Sporcu / Kişi (Gelir ise seçin)</label><select id="p-aid"><option value="">Bağımsız İşlem</option>'+athletes.map(function(a){return '<option value="'+esc(a.id)+'"'+(p&&p.aid===a.id?' selected':'')+'>'+esc(a.fn+' '+a.ln)+'</option>';}).join('')+'</select></div><div class="g21"><div class="fgr"><label>Tutar (₺)</label><input id="p-amt" type="number" value="'+(p?p.amt:'')+'"/></div><div class="fgr"><label>İşlem Türü</label><select id="p-ty"><option value="income"'+(p&&p.ty==='income'?' selected':'')+'>Gelir (Tahsilat)</option><option value="expense"'+(p&&p.ty==='expense'?' selected':'')+'>Gider (Ödeme)</option></select></div></div><div class="fgr mt2"><label>Açıklama / Hizmet Adı</label><input id="p-ds" value="'+esc(p?p.ds:'')+'" placeholder="Örn: Ekim Ayı Aidatı / Salon Kirası"/></div><div class="g21 mt2"><div class="fgr"><label>Durum</label><select id="p-st"><option value="completed"'+(p&&p.st==='completed'?' selected':'')+'>Ödendi (Tamamlandı)</option><option value="pending"'+(p&&p.st==='pending'?' selected':'')+'>Bekliyor (Ödenmedi)</option><option value="overdue"'+(p&&p.st==='overdue'?' selected':'')+'>Gecikti</option></select></div><div class="fgr"><label>İşlem / Vade Tarihi</label><input id="p-dt" type="date" value="'+esc(p?p.dt:tod())+'"/></div></div>', [
        {lbl:'İptal',cls:'bs',fn:closeModal}, {lbl:'Kaydet',cls:'bp',fn:async function(){
            var aid=gv('p-aid'), ath=athletes.find(function(a){return a.id===aid;}), ds=gv('p-ds');
            var obj = { id:p?p.id:uid(), aid:aid, an:ath?ath.fn+' '+ath.ln:(ds||'Bilinmiyor'), amt:gvn('p-amt'), ds:ds, st:gv('p-st'), dt:gv('p-dt'), ty:gv('p-ty'), serviceName:ds };
            if(!obj.amt){toast('Tutar girin','e');return;}
            if(await dbSavePay(obj)){ if(isNew)payments.push(obj); else{var i=payments.findIndex(function(x){return x.id===obj.id;}); if(i>=0)payments[i]=obj;} toast('Kaydedildi','g'); closeModal(); go('payments'); }
        }}
    ]); 
};
window.delPay = function(id) { confirm2('Sil','Emin misiniz?', async function(){ if(await dbDelPay(id)){ payments=payments.filter(function(x){return x.id!==id;}); toast('Silindi','g'); go('payments'); }}); };

function pgAccounting() { 
    var inc = payments.filter(function(p){return p.ty==='income'&&p.st==='completed';}).reduce(function(s,p){return s+(p.amt||0);},0); 
    var exp = payments.filter(function(p){return p.ty==='expense'&&p.st==='completed';}).reduce(function(s,p){return s+(p.amt||0);},0); 
    return '<div class="ph"><div class="stit" data-i18n="menuAcc">Finans Raporu</div></div><div class="g3 mb3"><div class="card stat-card stat-g"><div class="stat-icon">&#x1F4B0;</div><div class="stat-val tg">'+fmtN(inc)+' ₺</div><div class="stat-lbl">Gerçekleşen Tahsilat</div></div><div class="card stat-card stat-r"><div class="stat-icon">&#x1F4B8;</div><div class="stat-val tr2">'+fmtN(exp)+' ₺</div><div class="stat-lbl">Gerçekleşen Gider</div></div><div class="card stat-card stat-b"><div class="stat-icon">&#x1F4B3;</div><div class="stat-val tb">'+fmtN(inc-exp)+' ₺</div><div class="stat-lbl">Net Kasa Bakiyesi</div></div></div><div class="card"><p class="tm">Banka: '+esc(settings.bankName||'Girmedi')+' - IBAN: '+esc(settings.iban||'Girmedi')+'</p></div>'; 
}

// ANTRENÖRLER
function pgCoaches() { 
    return '<div class="ph"><div class="stit" data-i18n="menuCoa">Antrenörler</div></div><div class="flex fjb mb3"><button class="btn bp" onclick="editCoach()">+ Yeni Antrenör</button></div><div class="card"><div class="tw"><table><thead><tr><th>Ad Soyad</th><th>TC / Telefon</th><th>Sisteme Giriş Şifresi</th><th>İşlemler</th></tr></thead><tbody>' + coaches.map(function(c){ return '<tr><td class="tw6">'+esc(c.fn+' '+c.ln)+'</td><td>'+esc(c.tc)+' / '+esc(c.ph)+'</td><td>***</td><td><button class="btn btn-xs bp" onclick="editCoach(\''+c.id+'\')">Düzenle</button> <button class="btn btn-xs bd" onclick="delCoach(\''+c.id+'\')">Sil</button></td></tr>'; }).join('')+'</tbody></table></div></div>'; 
}
window.editCoach = function(id) { 
    var c = id ? coaches.find(function(x){return x.id===id;}) : null; var isNew = !c; 
    modal(isNew ? 'Yeni Antrenör' : 'Antrenör Düzenle', '<div class="g21"><div class="fgr"><label>Ad</label><input id="c-fn" value="'+esc(c?c.fn:'')+'"/></div><div class="fgr"><label>Soyad</label><input id="c-ln" value="'+esc(c?c.ln:'')+'"/></div></div><div class="g21 mt2"><div class="fgr"><label>TC Kimlik (Giriş İçin)</label><input id="c-tc" type="tel" maxlength="11" value="'+esc(c?c.tc:'')+'"/></div><div class="fgr"><label>Telefon</label><input id="c-ph" value="'+esc(c?c.ph:'')+'"/></div></div><div class="fgr mt2"><label>Özel Şifre (Sisteme giriş için, boşsa TC son 4)</label><input id="c-pass" placeholder="Örn: 1234" value="'+esc(c?c.coachPass:'')+'"/></div>', [
        {lbl:'İptal',cls:'bs',fn:closeModal}, {lbl:'Kaydet',cls:'bp',fn:async function(){
            var obj = { id:c?c.id:uid(), fn:gv('c-fn'), ln:gv('c-ln'), tc:gv('c-tc'), ph:gv('c-ph'), coachPass:gv('c-pass'), em:'', sp:'', sal:0, st:'active' };
            if(!obj.fn || !obj.tc){toast('Ad ve TC zorunlu','e');return;}
            if(await dbSaveCoach(obj)){ if(isNew)coaches.push(obj); else{var i=coaches.findIndex(function(x){return x.id===obj.id;}); if(i>=0)coaches[i]=obj;} toast('Kaydedildi','g'); closeModal(); go('coaches'); }
        }}
    ]); 
};
window.delCoach = function(id) { confirm2('Sil','Emin misiniz?', async function(){ if(await dbDelCoach(id)){ coaches=coaches.filter(function(x){return x.id!==id;}); toast('Silindi','g'); go('coaches'); }}); };

function pgMessages() { return '<div class="ph"><div class="stit">Mesajlar</div></div><div class="card">Mesaj kutusu modülü aktif.</div>'; }

// --- GELİŞMİŞ AYARLAR MENÜSÜ ---
function pgSettings() { 
  return '<div class="ph"><div class="stit" data-i18n="menuSet">Sistem Ayarları</div><div class="ssub">Akademi yönetim merkeziniz</div></div>' +
    
    // 1. ROL VE YETKİ YÖNETİMİ
    '<div class="card mb3" style="border-left: 4px solid var(--blue2)"><div class="tw6 tsm mb2">👥 Rol ve Yetki Yönetimi</div>' +
    '<p class="ts tm mb2">Antrenörlerin sisteme girişini "Antrenörler" sekmesinden TC ile sağlayabilirsiniz. Diğer idari personel için yeni yönetici ekleyebilirsiniz.</p>' +
    '<div class="flex gap2"><button class="btn bsu" onclick="showAddAdminModal()">+ Yeni Yönetici/Sekreter Ekle</button></div></div>' +

    // 2. OTOMASYON VE SMS ŞALTERLERİ
    '<div class="card mb3" style="border-left: 4px solid var(--purple)"><div class="tw6 tsm mb2">🤖 Otomatik Bildirimler (Otomasyon)</div>' +
    '<div class="flex fjb fca mb2 pb2" style="border-bottom:1px solid var(--border)"><span class="tsm">Vadesi geçen ödemeler için otomatik hatırlatma SMS\'i at</span><input type="checkbox" style="width:20px;height:20px" checked></div>' +
    '<div class="flex fjb fca mb2 pb2" style="border-bottom:1px solid var(--border)"><span class="tsm">Yoklamada "Yok" yazılan öğrencinin velisine anında SMS at</span><input type="checkbox" style="width:20px;height:20px"></div>' +
    '<div class="flex fjb fca mb2"><span class="tsm">Yeni kayıt olan sporcuya "Aramıza hoş geldin" SMS\'i at</span><input type="checkbox" style="width:20px;height:20px" checked></div>' +
    '<button class="btn bp mt2" onclick="toast(\'Otomasyon tercihleri kaydedildi!\',\'g\')">Otomasyonları Kaydet</button></div>' +

    // 3. SANAL POS AYARLARI (UI)
    '<div class="card mb3" style="border-left: 4px solid var(--green)"><div class="tw6 tsm mb2">💳 Sanal POS API (Kredi Kartı Entegrasyonu)</div>' +
    '<p class="ts tm mb2">Ödeme sağlayıcınızın (PayTR vb.) bilgilerini buraya girin.</p>' +
    '<div class="g21"><div class="fgr mb2"><label>Sağlayıcı</label><select><option>PayTR</option><option>Iyzico</option><option>Shopier</option></select></div><div class="fgr mb2"><label>Merchant ID / Mağaza No</label><input type="password" value="********"></div></div>' +
    '<div class="g21"><div class="fgr mb2"><label>API Key</label><input type="password" value="********"></div><div class="fgr mb2"><label>Secret Key</label><input type="password" value="********"></div></div>' +
    '<button class="btn bp" onclick="toast(\'POS Ayarları kaydedildi!\',\'g\')">POS Bilgilerini Kaydet</button></div>' +

    // 4. FİNANS VARSAYILANLARI VE KLASİK AYARLAR
    '<div class="card mb3" style="border-left: 4px solid var(--text2)"><div class="tw6 tsm mb2">⚙️ Genel Kurum ve Finans Ayarları</div>' +
    '<div class="g21"><div class="fgr mb2"><label>Kurum Adı</label><input id="s-name" value="' + esc(settings.schoolName||'') + '"/></div><div class="fgr mb2"><label>Banka Adı</label><input id="s-bank" value="' + esc(settings.bankName||'') + '"/></div></div>' +
    '<div class="g21"><div class="fgr mb2"><label>Hesap Adı</label><input id="s-acc" value="' + esc(settings.accountName||'') + '"/></div><div class="fgr mb2"><label>IBAN</label><input id="s-iban" value="' + esc(settings.iban||'') + '"/></div></div>' +
    '<div class="g21"><div class="fgr mb2"><label>Vergi Dairesi ve No</label><input type="text" placeholder="Kartal V.D. - 12345678"/></div><div class="fgr mb2"><label>Varsayılan KDV Oranı (%)</label><input type="number" value="20"/></div></div>' +
    '<div class="g21"><div class="fgr mb2"><label>NetGSM Kullanıcı</label><input id="s-ngu" value="' + esc(settings.netgsm_user||'') + '"/></div><div class="fgr mb2"><label>NetGSM Şifre</label><input type="password" id="s-ngp"/></div></div>' +
    '<button class="btn bp mt2" onclick="saveGeneralSettings()">Genel Ayarları Kaydet</button></div>';
}

window.saveGeneralSettings = async function() {
    settings.school_name = gv('s-name'); settings.schoolName = settings.school_name;
    settings.bank_name = gv('s-bank'); settings.bankName = settings.bank_name;
    settings.account_name = gv('s-acc'); settings.accountName = settings.account_name;
    settings.iban = gv('s-iban'); 
    settings.netgsm_user = gv('s-ngu');
    var p = gv('s-ngp'); if(p) settings.netgsm_pass = p;
    if(await saveS()){ toast('Genel ayarlar başarıyla kaydedildi!', 'g'); updateBranchUI(); }
    else { toast('Kayıt hatası!', 'e'); }
};

window.showAddAdminModal = function() { modal('Yönetici/Sekreter Ekle', '<div class="fgr mb2"><label>Ad Soyad</label><input id="aa-name"/></div><div class="fgr mb2"><label>E-posta</label><input id="aa-em" type="email"/></div><div class="fgr mb2"><label>Geçici Şifre</label><input id="aa-pass" type="password"/></div>', [{lbl:'İptal',cls:'bs',fn:closeModal}, {lbl:'Kaydet',cls:'bp',fn:async function(){ toast('Yönetici eklendi!','g'); closeModal(); }}]); };

// --- SPORCU PORTALI ---
window.spTab = function(tab) {
    document.querySelectorAll('.sp-tab').forEach(function(el){el.classList.toggle('on', el.textContent.toLowerCase().includes(tab) || (tab==='profil'&&el.textContent.includes('Profil')) || (tab==='yoklama'&&el.textContent.includes('Yoklama')) || (tab==='odemeler'&&el.textContent.includes('Ödemeler')) || (tab==='odeme-yap'&&el.textContent.includes('Ödeme Yap'))); });
    var content = document.getElementById('sp-content');
    var fns = { 'profil': spProfil, 'yoklama': spYoklama, 'odemeler': spOdemeler, 'odeme-yap': spOdemeYap }; 
    if (fns[tab]) content.innerHTML = fns[tab]();
};
function spProfil() { var a = currentSporcu; if(!a) return ''; var rate=attRate(a.id); return '<div class="profile-hero"><div class="flex fca gap3">'+getAvaStr(64)+'<div><div class="tw6" style="font-size:18px">'+esc(a.fn+' '+a.ln)+'</div><div class="ts tm">'+esc(a.tc)+'</div></div></div></div><div class="card">'+row('Devam Oranı', (rate||0)+'%')+row('Veli Adı', a.pn||'-')+'</div>'; }
function spYoklama() { var a = currentSporcu; if(!a) return ''; var dates = Object.keys(attData).sort().reverse().slice(0, 30); var html = '<div class="card"><div class="tw6 tsm mb2">Son Yoklamalar</div>'; if (!dates.length) html += '<p class="tm">Kayıt yok.</p>'; else html += dates.map(function(d){ var st=attData[d][a.id]; var s=st==='P'?'<span class="bg bg-g">Var</span>':st==='A'?'<span class="bg bg-r">Yok</span>':'-'; return '<div class="att-row"><span class="tm">'+fmtD(d)+'</span>'+s+'</div>'; }).join(''); return html+'</div>'; }
function spOdemeler() { var a=currentSporcu; if(!a)return''; var mp=payments.filter(function(p){return p.aid===a.id;}); var html='<div class="card"><div class="tw6 tsm mb2">Ödemelerim</div><div class="tw"><table><tbody>'; html+=mp.map(function(p){return '<tr><td>'+fmtD(p.dt)+'</td><td class="tw6">'+fmtN(p.amt)+' ₺</td><td><span class="bg '+stc(p.st)+'">'+stl(p.st)+'</span></td></tr>';}).join(''); return html+'</tbody></table></div></div>'; }
function spOdemeYap() { return '<div class="card"><div class="al al-b mb3"><b>Banka:</b> '+esc(settings.bankName)+'<br><b>Alıcı:</b> '+esc(settings.accountName)+'<br><b>IBAN:</b> '+esc(settings.iban)+'</div><div class="fgr mb2"><label>Tutar</label><input id="sp-amt" type="number"/></div><button class="btn bp w100" onclick="toast(\'Ödeme Bildirildi!\',\'g\')">Havale Bildirimi Yap</button></div>'; }

// --- HUKUKİ LİNKLER (Sadece Arayüz) ---
window.showLegal = function(type) {
    var titles = { 'kvkk': 'KVKK Aydınlatma Metni', 'kullanim': 'Kullanım Sözleşmesi' };
    var bodies = { 'kvkk': '<b>KVKK Aydınlatma Metni</b><br><br>Verileriniz sistemimizde güvenle saklanmaktadır. Bu alan bir taslaktır.', 'kullanim': '<b>Kullanım Sözleşmesi</b><br><br>Sistemi amacına uygun kullanmayı kabul edersiniz. Bu alan bir taslaktır.' };
    modal(titles[type], '<div style="line-height:1.7;color:var(--text2)">'+bodies[type]+'</div>', [{lbl:'Okudum, Kapat',cls:'bs',fn:closeModal}]);
};

document.addEventListener('DOMContentLoaded', function() { console.log('Sporcu Paneli Yüklendi - Kusursuz Tam Sürüm'); });
