/* ============================================================
   SPORCU PANELI — script.js (GÜNCEL: Global Hata Yakalayıcı & Tam Onarım)
   Dragos Futbol Akademisi Yönetim Sistemi
   ============================================================ */

// ANA HATA YAKALAYICI: Eğer sistem çökerse bize sebebini ekranda söyleyecek!
window.onerror = function(msg, url, line, col, error) {
    var err = "SİSTEM HATASI!\nMesaj: " + msg + "\nSatır: " + line;
    console.error(err, error);
    alert(err + "\n\nLütfen bu hatayı geliştiriciye iletin.");
    return true;
};

if (window.location.hostname.includes('vercel.app')) {
    console.log = function() {};
    console.warn = function() {};
}

function translateAuthError(errMsg) {
    var dict = {
        'Invalid login credentials': 'E-posta adresiniz veya şifreniz hatalı.',
        'Email not confirmed': 'Lütfen giriş yapmadan önce e-postanızı onaylayın.',
        'User already registered': 'Bu e-posta adresi ile kayıtlı bir hesap zaten var.',
        'Password should be at least 6 characters': 'Şifreniz en az 6 karakterden oluşmalıdır.'
    };
    return dict[errMsg] || 'İşlem başarısız. Lütfen tekrar deneyin.';
}

var SUPA_URL = 'https://wfarbydojxtufnkjuhtc.supabase.co';
var SUPA_KEY = 'sb_publishable_w1_nXk_7TM1ePWHMN2CDcQ_1ufk0kYC';
var SUPER_ADMIN_EMAIL = 'eneskahveci@spor.com';
var SUPER_ADMIN_ORG = 'org-default';
var DEFAULT_LOGO = '/assets/logo.png'; 
var NETGSM_USER = '', NETGSM_PASS = '', NETGSM_HEADER = 'SPORCU';

var _sb = null;
function getSB() {
  if (!_sb) { try { _sb = supabase.createClient(SUPA_URL, SUPA_KEY); } catch(e) { alert('Supabase bağlantı hatası: ' + e); } }
  return _sb;
}

var _authSession = null;
function initAuth() {
  var sb = getSB(); if (!sb) return;
  sb.auth.onAuthStateChange(function(event, session) { _authSession = session; if (event === 'SIGNED_OUT') { currentUser = null; } });
}

document.addEventListener('DOMContentLoaded', async function() { 
  initAuth(); 
  var logoEl = document.querySelector('.llogo-i');
  if (logoEl) {
    logoEl.innerHTML = '';
    logoEl.style.backgroundImage = 'url("' + DEFAULT_LOGO + '")';
    logoEl.style.backgroundSize = 'cover';
    logoEl.style.backgroundPosition = 'center';
  }
  await restoreSession(); 
});

async function restoreSession() {
  showLoading();
  try {
    var sb = getSB(); 
    if (sb) {
        var { data } = await sb.auth.getSession();
        if (data && data.session) {
          var storedUser = localStorage.getItem('sporcu_app_user');
          if (storedUser) {
            currentUser = JSON.parse(storedUser); currentOrgId = currentUser.orgId || 'org-default'; currentBranchId = currentUser.branchId || 'br-default';
            document.getElementById('lbox-wrap').style.display = 'none'; document.getElementById('wrap').classList.remove('dn');
            var dname = currentUser.name || currentUser.email.split('@')[0];
            var setEl = function(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; };
            setEl('suname', dname); 
            await loadBranchData(); updateBranchUI(); updateBadges(); go('dashboard'); resetSessionTimer(); hideLoading(); return;
          }
        }
    }
    
    var storedSporcu = localStorage.getItem('sporcu_app_sporcu');
    if (storedSporcu) {
      var parsed = JSON.parse(storedSporcu); currentSporcu = parsed.user; currentOrgId = parsed.orgId; currentBranchId = parsed.branchId;
      await loadBranchData(); var orgs = await supaGet('orgs', { id: currentOrgId }); var orgName = orgs && orgs[0] ? orgs[0].name : 'Akademi';
      document.getElementById('lbox-wrap').style.display = 'none'; document.getElementById('sporcu-portal').style.display = 'flex';
      var sn = document.getElementById('sp-name'); if (sn) sn.textContent = currentSporcu.fn + ' ' + currentSporcu.ln;
      var on = document.getElementById('sp-orgname'); if (on) on.textContent = (settings && settings.schoolName) ? settings.schoolName : orgName;
      updateBranchUI(); spTab('profil'); hideLoading(); return;
    }
  } catch (e) { console.error("Session restore error:", e); }
  hideLoading();
}

// ── DB SORGULARI ──────────
async function supaGet(t, f, extra) {
  try { var db = getSB(); if (!db) return null; var q = db.from(t).select('*').limit(2000); if (f) Object.keys(f).forEach(function(k) { q = q.eq(k, f[k]); }); if (extra) { var m = extra.match(/^(\w+)=(gte|lte|gt|lt|neq|like|ilike)\.(.+)$/); if (m) { var ops = { gte: 'gte', lte: 'lte', gt: 'gt', lt: 'lt', neq: 'neq', like: 'like', ilike: 'ilike' }; if (ops[m[2]]) q = q[ops[m[2]]](m[1], m[3]); } } var { data, error } = await q; if (error) { console.error('Okuma Hatası ('+t+'):', error.message); return null; } return data || []; } catch(e) { return null; }
}

async function supaPost(t, d) {
  try { var db = getSB(); if (!db) return null; var { data, error } = await db.from(t).insert(d).select(); if (error) { toast('Kayıt Hatası: ' + error.message, 'e'); return null; } return data; } catch(e) { toast('Sistem Hatası', 'e'); return null; }
}

async function supaUpsert(t, d) {
  try {
    var db = getSB(); if (!db) return null;
    var arr = Array.isArray(d) ? d : [d];
    var { data, error } = await db.from(t).upsert(arr, { onConflict: 'id' }).select();
    if (error) { toast('Veritabanı Hatası: ' + error.message, 'e'); return null; }
    return data;
  } catch(e) { toast('Kod Hatası: ' + e.message, 'e'); return null; }
}

async function supaDelete(t, f) {
  try { var db = getSB(); if (!db) return false; var q = db.from(t).delete(); Object.keys(f).forEach(function(k) { q = q.eq(k, f[k]); }); var { error } = await q; if (error) { toast('Silme Hatası: ' + error.message, 'e'); return false; } return true; } catch(e) { return false; }
}

async function supaPatch(t, d, f) {
  try { var db = getSB(); if (!db) return null; var q = db.from(t).update(d); Object.keys(f).forEach(function(k) { q = q.eq(k, f[k]); }); var { data, error } = await q.select(); if (error) { toast('Güncelleme Hatası: ' + error.message, 'e'); return null; } return data; } catch(e) { return null; }
}

async function sendSMS(phone, msg) {
  if (!NETGSM_USER || !phone) return false; var clean = phone.replace(/\D/g, ''); if (clean.startsWith('0')) clean = '90' + clean.slice(1); else if (!clean.startsWith('90')) clean = '90' + clean;
  try { await fetch('https://api.netgsm.com.tr/sms/send/get/?usercode=' + encodeURIComponent(NETGSM_USER) + '&password=' + encodeURIComponent(NETGSM_PASS) + '&gsmno=' + clean + '&message=' + encodeURIComponent(msg) + '&msgheader=' + encodeURIComponent(NETGSM_HEADER), { mode: 'no-cors' }); return true; } catch(e) { return false; }
}
async function sendBulkSMS(phones, msg) { var sent = 0; for (var i = 0; i < phones.length; i++) { if (await sendSMS(phones[i], msg)) sent++; await new Promise(function(r) { setTimeout(r, 100); }); } return sent; }
async function sha256(str) { var buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)); return Array.from(new Uint8Array(buf)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join(''); }
function showLoading() { var el = document.getElementById('loading-overlay'); if(el) el.style.display = 'flex'; }
function hideLoading() { var el = document.getElementById('loading-overlay'); if(el) el.style.display = 'none'; }

var currentUser = null, currentOrgId = null, currentBranchId = null;
var currentSporcu = null, currentSporcuOrgId = null, currentSporcuBranchId = null;
var acct = { email: '', pass: '' };
var athletes = [], payments = [], coaches = [], attData = {}, messages = [], settings = {};
var sports = [], classes = [];
var _orgsCache = [], _usersCache = [], _branchesCache = [];
var curPage = 'dashboard';
var ATD = tod(), ATSP = '', ATCLS = '';
var _athFilter = { sp: '', st: '', cls: '', q: '' };
var _payFilter = { st: '', q: '' };
var _confirmCb = null, _forgotCtx = null;

function tod() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

function uid() { 
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    }); 
}

function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function fmtN(n) { return Number(n || 0).toLocaleString('tr-TR'); }
function fmtD(s) { if (!s) return '-'; try { var d = new Date(s); return d.getDate() + '.' + (d.getMonth() + 1) + '.' + d.getFullYear(); } catch(e) { return s; } }
function age(bd) { if (!bd) return '-'; var d = new Date(bd), now = new Date(); return now.getFullYear() - d.getFullYear() - (now < new Date(now.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0); }
function gv(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
function gvn(id) { return parseFloat(gv(id)) || 0; }
function stl(s) { var m = { active: 'Aktif', inactive: 'Pasif', pending: 'Bekliyor', completed: 'Tamamlandı', overdue: 'Gecikti', cancelled: 'İptal' }; return m[s] || s || '-'; }
function stc(s) { var m = { active: 'bg-g', inactive: 'bg-r', pending: 'bg-y', completed: 'bg-g', overdue: 'bg-r', cancelled: 'bg-r' }; return m[s] || 'bg-b'; }
function semi(sp) { var sl = (sp||'').toLowerCase(); if (sl.indexOf('futbol') >= 0) return '&#x26BD;'; if (sl.indexOf('basketbol') >= 0) return '&#x1F3C0;'; if (sl.indexOf('yuzme') >= 0 || sl.indexOf('yüzme') >= 0) return '&#x1F3CA;'; if (sl.indexOf('tenis') >= 0) return '&#x1F3BE;'; if (sl.indexOf('voleybol') >= 0) return '&#x1F3D0;'; if (sl.indexOf('gures') >= 0 || sl.indexOf('güreş') >= 0) return '&#x1F94B;'; if (sl.indexOf('boks') >= 0) return '&#x1F94A;'; if (sl.indexOf('jimnastik') >= 0) return '&#x1F938;'; if (sl.indexOf('atletizm') >= 0) return '&#x1F3C3;'; return '&#x1F3C5;'; }
function clsName(ci) { for (var i = 0; i < classes.length; i++) { if (classes[i].id === ci) return classes[i].name; } return '-'; }
function attRate(aid) { var tot = 0, pres = 0; Object.keys(attData).forEach(function(d) { if (attData[d] && attData[d][aid]) { tot++; if (attData[d][aid] === 'P') pres++; } }); return tot ? Math.round(pres / tot * 100) : null; }
function overdueCount() { var n = 0; payments.forEach(function(p) { if (p.st === 'overdue') n++; }); return n; }
function pendingCount() { var n = 0; payments.forEach(function(p) { if (p.needsApproval && p.st === 'pending') n++; }); return n; }
function unreadCount() { var n = 0; messages.forEach(function(m) { if (!m.rd) n++; }); return n; }
function row(lbl, val) { return '<div class="dr"><span class="dl tm tsm">' + lbl + '</span><span class="dvl tw6 tsm">' + val + '</span></div>'; }
function getBranch(id) { for (var i = 0; i < _branchesCache.length; i++) { if (_branchesCache[i].id === (id || currentBranchId)) return _branchesCache[i]; } return null; }

function getLogo() { 
    return (settings && settings.logoUrl) ? settings.logoUrl : DEFAULT_LOGO; 
}

function getAvaStr(sz) {
  var sizeStyle = sz ? 'width:'+sz+'px;height:'+sz+'px;flex-shrink:0;' : 'flex-shrink:0;';
  return '<div class="ava" style="' + sizeStyle + 'background-image:url(\'' + getLogo() + '\');background-size:cover;background-position:center;color:transparent;border:1px solid var(--border);background-color:var(--bg3)"></div>';
}

function setElAva(id) {
  var el = document.getElementById(id);
  if (el) {
    el.innerHTML = '';
    el.style.backgroundImage = 'url("' + getLogo() + '")';
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
    el.style.backgroundColor = 'var(--bg3)';
    el.style.border = '1px solid var(--border)';
  }
}

// ── DB Mappers ──────────
function dbToAth(r) { return { id: r.id, fn: r.fn, ln: r.ln, tc: r.tc, bd: r.bd, gn: r.gn, ph: r.ph, em: r.em || '', sp: r.sp, cat: r.cat, lic: r.lic, rd: r.rd, st: r.st || 'active', fee: r.fee || 0, vd: r.vd, nt: r.nt, ci: r.ci, clsId: r.cls_id, pn: r.pn, pph: r.pph, pem: r.pem, spPass: r.sp_pass }; }
function athToDB(a) { return { id: a.id, org_id: currentOrgId, branch_id: currentBranchId, fn: a.fn, ln: a.ln, tc: a.tc, bd: a.bd, gn: a.gn, ph: a.ph, em: a.em || '', sp: a.sp, cat: a.cat, lic: a.lic, rd: a.rd, st: a.st, fee: a.fee, vd: a.vd, nt: a.nt, ci: a.ci, cls_id: a.clsId, pn: a.pn, pph: a.pph, pem: a.pem, sp_pass: a.spPass }; }
function dbToPay(r) { return { id: r.id, aid: r.aid, an: r.an, amt: r.amt || 0, dt: r.dt, ty: r.ty, cat: r.cat, ds: r.ds, st: r.st || 'pending', inv: r.inv, dd: r.dd, payMethod: r.pay_method, havaleNote: r.havale_note, needsApproval: r.needs_approval, approvedBy: r.approved_by, approvedAt: r.approved_at }; }
function payToDB(p) { return { id: p.id, org_id: currentOrgId, branch_id: currentBranchId, aid: p.aid, an: p.an, amt: p.amt, dt: p.dt, ty: p.ty, cat: p.cat, ds: p.ds, st: p.st, inv: p.inv, dd: p.dd, pay_method: p.payMethod, havale_note: p.havaleNote, needs_approval: p.needsApproval, approved_by: p.approvedBy, approved_at: p.approvedAt }; }
function dbToCoach(r) { return { id: r.id, fn: r.fn, ln: r.ln, ph: r.ph, em: r.em, sp: r.sp, sal: r.sal || 0, st: r.st || 'active', sd: r.sd, nt: r.nt }; }
function coachToDB(c) { return { id: c.id, org_id: currentOrgId, branch_id: currentBranchId, fn: c.fn, ln: c.ln, ph: c.ph, em: c.em, sp: c.sp, sal: c.sal, st: c.st, sd: c.sd, nt: c.nt }; }
function dbToMsg(r) { return { id: r.id, fr: r.fr, role: r.role, sub: r.sub, body: r.body, dt: r.dt, rd: r.rd }; }
function msgToDB(m) { return { id: m.id, org_id: currentOrgId, branch_id: currentBranchId, fr: m.fr, role: m.role, sub: m.sub, body: m.body, dt: m.dt, rd: m.rd }; }
function dbToSport(r) { return { id: r.id, name: r.name, icon: r.icon }; }
function dbToClass(r) { return { id: r.id, name: r.name, spId: r.sp_id, coachId: r.coach_id, cap: r.cap, schedule: r.schedule }; }
function dbToSettings(r) { return { id: r.id, schoolName: r.school_name, logoUrl: r.logo_url, bankName: r.bank_name, accountName: r.account_name, iban: r.iban, ownerPhone: r.owner_phone, address: r.address, netgsmUser: r.netgsm_user, netgsmPass: r.netgsm_pass, netgsmHeader: r.netgsm_header }; }
function settingsToDB(s) { return { id: s.id || uid(), org_id: currentOrgId, branch_id: currentBranchId, school_name: s.schoolName, logo_url: s.logoUrl, bank_name: s.bankName, account_name: s.accountName, iban: s.iban, owner_phone: s.ownerPhone, address: s.address, netgsm_user: s.netgsmUser, netgsm_pass: s.netgsmPass, netgsm_header: s.netgsmHeader, updated_at: new Date().toISOString() }; }

function invalidateCache() { if (currentBranchId) localStorage.removeItem('branchData_' + currentBranchId); }
async function dbSaveAth(a) { invalidateCache(); return await supaUpsert('athletes', athToDB(a)); }
async function dbSavePay(p) { invalidateCache(); return await supaUpsert('payments', payToDB(p)); }
async function dbSaveCoach(c) { invalidateCache(); return await supaUpsert('coaches', coachToDB(c)); }
async function dbDelAth(id) { invalidateCache(); return await supaDelete('athletes', { id: id }); }
async function dbDelPay(id) { invalidateCache(); return await supaDelete('payments', { id: id }); }
async function dbDelCoach(id) { invalidateCache(); return await supaDelete('coaches', { id: id }); }
async function dbSaveMsg(m) { invalidateCache(); return await supaUpsert('messages', msgToDB(m)); }
async function dbDelMsg(id) { invalidateCache(); return await supaDelete('messages', { id: id }); }
async function dbSaveAtt(date, aid, status) { invalidateCache(); if (status === undefined) await supaDelete('attendance', { org_id: currentOrgId, branch_id: currentBranchId, athlete_id: aid, att_date: date }); else await supaUpsert('attendance', { org_id: currentOrgId, branch_id: currentBranchId, athlete_id: aid, att_date: date, status: status }); }
async function dbSaveSport(s) { invalidateCache(); return await supaUpsert('sports', { id: s.id, org_id: currentOrgId, branch_id: currentBranchId, name: s.name, icon: s.icon }); }
async function dbDelSport(id) { invalidateCache(); return await supaDelete('sports', { id: id }); }
async function dbSaveClass(c) { invalidateCache(); return await supaUpsert('classes', { id: c.id, org_id: currentOrgId, branch_id: currentBranchId, name: c.name, sp_id: c.spId, coach_id: c.coachId, cap: c.cap, schedule: c.schedule }); }
async function dbDelClass(id) { invalidateCache(); return await supaDelete('classes', { id: id }); }

async function saveS() { 
  invalidateCache(); 
  var res = await supaUpsert('settings', settingsToDB(settings)); 
  if (res) { return true; } else { return false; }
}

function checkOverdue() { var today = tod(); payments.forEach(function(p) { if (p.st === 'pending' && p.dd && p.dd < today && !p.needsApproval) { p.st = 'overdue'; dbSavePay(p); } }); }

async function loadBranchData(forceRefresh = false) {
  showLoading();
  try {
    var bid = currentBranchId; var cacheKey = 'branchData_' + bid;
    
    if (!forceRefresh) { 
        var cached = localStorage.getItem(cacheKey); 
        if (cached) { 
            try { 
                var parsed = JSON.parse(cached); 
                if (!parsed || !parsed.settings) throw new Error("Bozuk Onbellek");
                
                if (Date.now() - parsed.timestamp < 5 * 60 * 1000) { 
                    athletes = parsed.athletes || []; 
                    payments = parsed.payments || []; 
                    coaches = parsed.coaches || []; 
                    settings = parsed.settings || {}; 
                    sports = parsed.sports || []; 
                    classes = parsed.classes || []; 
                    attData = parsed.attData || {}; 
                    messages = parsed.messages || []; 
                    if (settings.netgsmUser) { NETGSM_USER = settings.netgsmUser; NETGSM_PASS = settings.netgsmPass || ''; NETGSM_HEADER = settings.netgsmHeader || 'SPORCU'; } 
                    updateBranchUI(); checkOverdue(); hideLoading(); 
                    return; 
                } 
            } catch(e) {
                localStorage.removeItem(cacheKey); 
            } 
        } 
    }
    
    var res = await Promise.all([ supaGet('athletes', { branch_id: bid }), supaGet('payments', { branch_id: bid }), supaGet('coaches', { branch_id: bid }), supaGet('attendance', { branch_id: bid }), supaGet('messages', { branch_id: bid }), supaGet('settings', { branch_id: bid }), supaGet('sports', { branch_id: bid }), supaGet('classes', { branch_id: bid }) ]);
    
    athletes = (res[0] || []).map(dbToAth); payments = (res[1] || []).map(dbToPay); coaches = (res[2] || []).map(dbToCoach);
    attData = {}; (res[3] || []).forEach(function(r) { if (!attData[r.att_date]) attData[r.att_date] = {}; attData[r.att_date][r.athlete_id] = r.status; });
    messages = (res[4] || []).map(dbToMsg);
    var branch = getBranch(bid);
    
    if (res[5] && res[5][0]) { settings = dbToSettings(res[5][0]) || {}; } 
    else { settings = { id: uid(), schoolName: branch ? branch.name : 'Sube' }; }
    
    if (!settings.schoolName || settings.schoolName === 'Sube') settings.schoolName = branch ? branch.name : 'Dragos Futbol Akademisi';
    
    sports = (res[6] || []).map(dbToSport); classes = (res[7] || []).map(dbToClass);
    if (settings.netgsmUser) { NETGSM_USER = settings.netgsmUser; NETGSM_PASS = settings.netgsmPass || ''; NETGSM_HEADER = settings.netgsmHeader || 'SPORCU'; }
    var dataToCache = { timestamp: Date.now(), athletes: athletes, payments: payments, coaches: coaches, settings: settings, sports: sports, classes: classes, attData: attData, messages: messages };
    try { localStorage.setItem(cacheKey, JSON.stringify(dataToCache)); } catch(e) {}
    checkOverdue(); updateBranchUI();
  } catch(e) { console.error('loadBranchData:', e); }
  hideLoading();
}

function openSide() { var el = document.getElementById('side'); var ov = document.getElementById('overlay'); if(el) el.classList.add('open'); if(ov) ov.classList.add('show'); }
function closeSide() { var el = document.getElementById('side'); var ov = document.getElementById('overlay'); if(el) el.classList.remove('open'); if(ov) ov.classList.remove('show'); }

function go(pg) {
  curPage = pg; var titles = { dashboard: 'Gösterge', athletes: 'Sporcular', payments: 'Ödemeler', accounting: 'Muhasebe', attendance: 'Devam Takibi', coaches: 'Antrenörler', messages: 'Mesajlar', settings: 'Ayarlar', branches: 'Şubeler', sports: 'Branşlar', classes: 'Sınıflar', announcements: 'Duyurular', sms: 'SMS Duyuru' };
  var bt = document.getElementById('bar-title'); if (bt) bt.textContent = titles[pg] || pg;
  var main = document.getElementById('main'); if (!main) return;
  var fns = { dashboard: pgDashboard, athletes: pgAthletes, payments: pgPayments, accounting: pgAccounting, attendance: pgAttendance, coaches: pgCoaches, messages: pgMessages, settings: pgSettings, branches: pgBranches, sports: pgSports, classes: pgClasses, announcements: pgAnnouncements, sms: pgSMS, 'pending-orgs': pgPendingOrgs };
  
  main.style.opacity = '0';
  setTimeout(function() { 
      try {
          if (fns[pg]) main.innerHTML = fns[pg](); 
          main.style.opacity = '1'; 
          main.style.transition = 'opacity .15s'; 
      } catch(err) {
          console.error("Sayfa Yükleme Hatası:", err);
          main.innerHTML = '<div style="padding:20px;text-align:center"><div class="al al-r">Arayüz yüklenirken hata oluştu.</div><button class="btn bd" onclick="localStorage.clear();window.location.reload();">Önbelleği Temizle ve Onar</button></div>';
          main.style.opacity = '1';
      }
  }, 60);
  
  document.querySelectorAll('.ni').forEach(function(el) { el.classList.toggle('on', el.id === 'ni-' + pg); }); document.querySelectorAll('.bni-btn').forEach(function(el) { el.classList.toggle('on', el.id === 'bn-' + pg); }); closeSide();
}

function toast(msg, type, duration) {
  var t = document.createElement('div'); var cls = 'toast'; if (type === 'e' || type === 'r') cls += ' toast-e'; else if (type === 'g') cls += ' toast-g'; else if (type === 'y') cls += ' toast-y';
  t.className = cls; t.textContent = msg; document.body.appendChild(t); var dur = duration || (type === 'y' ? 5000 : 2800); setTimeout(function() { t.classList.add('show'); }, 10); setTimeout(function() { t.classList.remove('show'); setTimeout(function() { t.remove(); }, 300); }, dur);
}

function modal(title, body, btns) {
  var m = document.getElementById('modal'); 
  if(!m) return;
  document.getElementById('modal-title').textContent = title; 
  document.getElementById('modal-body').innerHTML = body;
  var mf = document.getElementById('modal-footer'); 
  mf.innerHTML = ''; 
  (btns || []).forEach(function(b) { 
      var btn = document.createElement('button'); 
      btn.className = 'btn ' + b.cls; 
      btn.innerHTML = b.lbl; 
      btn.onclick = function() {
          try { b.fn(); } catch(err) { console.error("Buton Hatası:", err); }
      }; 
      mf.appendChild(btn); 
  }); 
  m.classList.add('show');
}
function closeModal() { var m = document.getElementById('modal'); if(m) m.classList.remove('show'); }

function confirm2(title, msg, cb) { 
    modal(title, '<p style="color:var(--text2);font-size:14px;line-height:1.7">' + msg + '</p>', [ 
        { lbl: 'Vazgeç', cls: 'bs', fn: function() { closeModal(); } }, 
        { lbl: 'Evet, Devam Et', cls: 'bd', fn: function() { closeModal(); if (cb) cb(); } } 
    ]); 
}

function updateBadges() {
  var od = overdueCount() + pendingCount(), un = unreadCount(); var b1 = document.getElementById('badge-pay'), b2 = document.getElementById('badge-msg'); if (b1) { b1.textContent = od; b1.classList.toggle('dn', od === 0); } if (b2) { b2.textContent = un; b2.classList.toggle('dn', un === 0); }
  var isSA = currentUser && currentUser.email === SUPER_ADMIN_EMAIL; var pendingOrgCount = isSA ? _orgsCache.filter(function(o) { return o.status === 'pending'; }).length : 0; var b3 = document.getElementById('badge-orgs'); if (b3) { b3.textContent = pendingOrgCount; b3.style.display = pendingOrgCount > 0 ? 'flex' : 'none'; }
  var orgNavEl = document.getElementById('ni-pending-orgs'), orgSecEl = document.getElementById('nav-sec-orgs'); if (orgNavEl) orgNavEl.style.display = isSA ? 'flex' : 'none'; if (orgSecEl) orgSecEl.style.display = isSA ? 'block' : 'none';
}
function sc(color, icon, val, label, pg) { return '<div class="card stat-card stat-' + color + '" ' + (pg ? 'onclick="go(\'' + pg + '\')"' : '') + '><div class="stat-icon">' + icon + '</div><div class="stat-val">' + val + '</div><div class="stat-lbl">' + label + '</div></div>'; }

function updateBranchUI() {
  var b = getBranch(); var nameEl = document.getElementById('sn'), subEl = document.getElementById('sn2');
  var name = (b && b.name) || (settings && settings.schoolName) || 'Dragos Futbol Akademisi';
  if (nameEl) nameEl.textContent = name.length > 22 ? name.slice(0, 20) + '...' : name; if (subEl) subEl.textContent = (settings && settings.address) || (b ? b.code || 'Merkez Şube' : 'Merkez Şube');
  setElAva('sava'); setElAva('bar-ava'); setElAva('sp-avatar'); setElAva('side-logo-icon');
  var slIcon = document.getElementById('side-logo-icon');
  if(slIcon) { slIcon.style.borderRadius = '50%'; slIcon.style.border = '2px solid var(--border)'; }
}

function exportCSV(data, filename) { if (!data || !data.length) { toast('Dışa aktarılacak veri yok', 'e'); return; } var cols = Object.keys(data[0]); var csv = cols.join(';') + '\n' + data.map(function(r) { return cols.map(function(c) { var v = r[c] === null || r[c] === undefined ? '' : String(r[c]); return '"' + v.replace(/"/g, '""') + '"'; }).join(';'); }).join('\n'); var blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename + '.csv'; a.click(); toast('CSV indirildi!', 'g'); }
function exportAthletes() { exportCSV(athletes.map(function(a) { return { Ad: a.fn, Soyad: a.ln, TC: a.tc, Spor: a.sp, Sinif: clsName(a.clsId), Kategori: a.cat, Durum: stl(a.st), Ucret: a.fee, VeliAdi: a.pn || '', VeliTel: a.pph || '', VeliEmail: a.pem || '' }; }), 'sporcular'); }
function exportPayments() { exportCSV(payments.map(function(p) { return { Tarih: p.dt, Sporcu: p.an, Aciklama: p.ds, Tutar: p.amt, Tur: p.ty === 'income' ? 'Gelir' : 'Gider', Durum: stl(p.st) }; }), 'odemeler'); }

var _qrStream = null;
function showQRScanner() { modal('QR ile Yoklama', '<div id="qr-video-wrap" style="text-align:center"><video id="qr-video" style="width:100%;max-width:300px;border-radius:12px;background:#000" autoplay playsinline></video></div><div id="qr-status" class="al al-b mt2" style="text-align:center">Kamera başlatılıyor...</div><div class="mt2"><label>Manuel TC Giris</label><div class="flex gap2"><input class="fs" id="qr-manual" type="tel" maxlength="11" placeholder="11 haneli TC"/><button class="btn bp" onclick="onQRDetected(document.getElementById(\'qr-manual\').value)">Yoklama Al</button></div></div>', [{ lbl: 'Kapat', cls: 'bs', fn: function() { stopQR(); closeModal(); } }]); setTimeout(startQR, 200); }
async function startQR() { try { var stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); _qrStream = stream; var video = document.getElementById('qr-video'); if (!video) { stream.getTracks().forEach(function(t) { t.stop(); }); return; } video.srcObject = stream; video.play(); var statusEl = document.getElementById('qr-status'); if (statusEl) statusEl.textContent = 'QR kodu veya TC okutun...'; scanQRFrame(video); } catch(e) { var statusEl = document.getElementById('qr-status'); if (statusEl) { statusEl.className = 'al al-y mt2'; statusEl.textContent = 'Kamera izni yok — Manuel TC girebilirsiniz'; } } }
function scanQRFrame(video) { if (!document.getElementById('qr-video')) return; if (typeof BarcodeDetector !== 'undefined') { var bd = new BarcodeDetector({ formats: ['qr_code'] }); var canvas = document.createElement('canvas'); canvas.width = video.videoWidth || 320; canvas.height = video.videoHeight || 240; canvas.getContext('2d').drawImage(video, 0, 0); bd.detect(canvas).then(function(codes) { if (codes && codes.length > 0) onQRDetected(codes[0].rawValue); else setTimeout(function() { scanQRFrame(video); }, 200); }).catch(function() { setTimeout(function() { scanQRFrame(video); }, 200); }); } }
function onQRDetected(val) { if (!val) return; stopQR(); var found = null; athletes.forEach(function(a) { if (a.tc === val || a.id === val) found = a; }); var el = document.getElementById('qr-status'); if (!found) { if (el) { el.className = 'al al-r mt2'; el.textContent = 'Sporcu bulunamadı: ' + val; } return; } if (!attData[ATD]) attData[ATD] = {}; attData[ATD][found.id] = 'P'; dbSaveAtt(ATD, found.id, 'P'); if (el) { el.className = 'al al-g mt2'; el.innerHTML = '&#x2705; ' + esc(found.fn) + ' ' + esc(found.ln) + ' — Yoklama alındı!'; } setTimeout(startQR, 1500); }
function stopQR() { if (_qrStream) { _qrStream.getTracks().forEach(function(t) { t.stop(); }); _qrStream = null; } }

function switchLoginTab(tab) { document.getElementById('login-admin').classList.toggle('dn', tab !== 'admin'); document.getElementById('login-sporcu').classList.toggle('dn', tab !== 'sporcu'); document.querySelectorAll('.ltab').forEach(function(el, i) { el.classList.toggle('on', (i === 0 && tab === 'admin') || (i === 1 && tab === 'sporcu')); }); }
function showErr(id, msg) { var el = document.getElementById(id); if (el) { el.textContent = msg; el.classList.remove('dn'); } }

async function doLogin() {
  var e = gv('le'), p = gv('lp'); if (!e || !p) { showErr('lerr', 'E-posta ve şifre gerekli!'); return; } showLoading();
  try {
    var sb = getSB(); 
    if (!sb) { hideLoading(); showErr('lerr', 'Bağlantı koptu. Lütfen sayfayı yenileyin.'); return; }
    var { data: authData, error: authError } = await sb.auth.signInWithPassword({ email: e, password: p });
    if (authError || !authData.user) { hideLoading(); showErr('lerr', translateAuthError(authError ? authError.message : '')); return; }
    try { await supaPost('login_logs', { user_email: e, role: 'admin', user_agent: navigator.userAgent }); } catch(err){}
    var userId = authData.user.id; var userEmail = authData.user.email; var { data: userData, error: userError } = await sb.from('users').select('*').eq('id', userId).single();
    if (userError || !userData) { userData = { id: userId, email: userEmail, org_id: 'org-default', branch_id: 'br-default', role: 'admin', name: userEmail.split('@')[0] }; }
    var allOrgs = [], allBranches = []; try { allOrgs = await supaGet('orgs') || []; } catch(e2) {} try { allBranches = await supaGet('branches') || []; } catch(e2) {}
    _orgsCache = allOrgs.map(function(o) { return { id: o.id, name: o.name, status: o.status || 'approved', registered_at: o.registered_at }; }); _branchesCache = allBranches.map(function(b) { return { id: b.id, orgId: b.org_id, name: b.name, code: b.code }; }); if (!_branchesCache.length) _branchesCache.push({ id: 'br-default', orgId: 'org-default', name: 'Dragos Futbol Akademisi', code: 'DFA' });
    var found = { id: userData.id, orgId: userData.org_id, branchId: userData.branch_id, email: userData.email, role: userData.role, name: userData.name, phone: userData.phone };
    if (found.email !== SUPER_ADMIN_EMAIL) { var foundOrg = allOrgs.find(function(o) { return o.id === found.orgId; }); if (foundOrg && foundOrg.status === 'pending') { hideLoading(); await sb.auth.signOut(); showErr('lerr', '⏳ Hesabınız henüz onaylanmadı. Yönetici onayı bekleniyor.'); return; } if (foundOrg && foundOrg.status === 'rejected') { hideLoading(); await sb.auth.signOut(); showErr('lerr', '❌ Hesabınız reddedildi. Detay için yöneticiyle iletişime geçin.'); return; } }
    currentUser = found; currentOrgId = found.orgId || (allOrgs[0] && allOrgs[0].id) || 'org-default'; currentBranchId = found.branchId || (allBranches[0] && allBranches[0].id) || 'br-default';
    if (!getBranch(currentBranchId)) _branchesCache.push({ id: currentBranchId, orgId: currentOrgId, name: (settings && settings.schoolName) ? settings.schoolName : 'Merkez Sube', code: 'MRK' }); acct.email = found.email;
    localStorage.setItem('sporcu_app_user', JSON.stringify(currentUser)); await loadBranchData();
    document.getElementById('lbox-wrap').style.display = 'none'; document.getElementById('wrap').classList.remove('dn'); document.getElementById('lerr').classList.add('dn');
    var dname = found.name || found.email.split('@')[0]; var setEl = function(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }; setEl('suname', dname); 
    
    updateBranchUI(); updateBadges(); go('dashboard'); resetSessionTimer(); hideLoading();
  } catch(err) { hideLoading(); showErr('lerr', 'Bağlantı hatası: ' + (err.message || err)); }
}

async function doLogout() { var sb = getSB(); if (sb) await sb.auth.signOut(); Object.keys(localStorage).forEach(function(key){ if(key.startsWith('branchData_')) localStorage.removeItem(key); }); localStorage.removeItem('sporcu_app_user'); currentUser = null; currentOrgId = null; currentBranchId = null; athletes = []; payments = []; coaches = []; attData = {}; messages = []; settings = {}; sports = []; classes = []; document.getElementById('wrap').classList.add('dn'); document.getElementById('lbox-wrap').style.display = 'flex'; var le = document.getElementById('le'), lp = document.getElementById('lp'); if (le) le.value = ''; if (lp) lp.value = ''; if (window._sessionTimer) { clearTimeout(window._sessionTimer); window._sessionTimer = null; } }

var SESSION_TIMEOUT_MS = 15 * 60 * 1000; var _sessionTimer = null; var _sessionWarningTimer = null;
function resetSessionTimer() { if (!currentUser) return; if (_sessionTimer) clearTimeout(_sessionTimer); if (_sessionWarningTimer) clearTimeout(_sessionWarningTimer); _sessionWarningTimer = setTimeout(function() { if (!currentUser) return; toast('⚠️ 1 dakika içinde oturumunuz kapanacak. Devam etmek için herhangi bir yere tıklayın.', 'y'); }, SESSION_TIMEOUT_MS - 60000); _sessionTimer = setTimeout(function() { if (!currentUser) return; toast('⏱️ Oturum süresi doldu. Tekrar giriş yapın.', 'r'); setTimeout(function() { doLogout(); }, 2000); }, SESSION_TIMEOUT_MS); }
function initSessionTimeout() { var events = ['mousedown','mousemove','keydown','scroll','touchstart','click']; events.forEach(function(evt) { document.addEventListener(evt, function() { resetSessionTimer(); }, { passive: true }); }); }
initSessionTimeout();

function showRegister() { document.getElementById('lbox-wrap').innerHTML = '<div class="lbox"><div class="llogo"><div class="llogo-i" style="background-image:url(\''+DEFAULT_LOGO+'\');background-size:cover;background-position:center;border:2px solid var(--border)"></div><h1 style="font-size:20px;font-weight:800">Kurum Kaydı</h1><p style="color:var(--text2);font-size:13px;margin-top:4px">Yeni akademi hesabı oluştur</p></div><div class="fgr mb2"><label>Kurum Adı</label><input id="rg-org" type="text" placeholder="Dragos Futbol Akademisi"/></div><div class="fgr mb2"><label>1. Şube Adı</label><input id="rg-branch" type="text" placeholder="Merkez Şube"/></div><div class="fgr mb2"><label>Yetkili Ad Soyad</label><input id="rg-name" type="text"/></div><div class="fgr mb2"><label>Telefon</label><input id="rg-phone" type="tel" placeholder="05xx..."/></div><div class="fgr mb2"><label>E-posta</label><input id="rg-em" type="email"/></div><div class="fgr mb2"><label>Şifre</label><input id="rg-p1" type="password"/></div><div class="fgr mb3"><label>Şifre Tekrar</label><input id="rg-p2" type="password"/></div><div id="rg-err" class="lerr dn"></div><button class="btn bp w100 mb2" style="padding:12px" onclick="doRegister()">Kayıt Ol</button><button class="btn bs w100" onclick="location.reload()">Geri Dön</button></div>'; }
async function doRegister() { var orgName = gv('rg-org'), branchName = gv('rg-branch') || 'Merkez', name = gv('rg-name'), em = gv('rg-em'), phone = gv('rg-phone'), p1 = gv('rg-p1'), p2 = gv('rg-p2'); var errEl = document.getElementById('rg-err'); function showErr2(m) { errEl.textContent = m; errEl.classList.remove('dn'); } if (!orgName || !name || !em || !p1) { showErr2('Tüm alanlar zorunlu!'); return; } if (p1 !== p2) { showErr2('Şifreler eşleşmiyor!'); return; } if (p1.length < 6) { showErr2('En az 6 karakter olmalı!'); return; } showLoading(); try { var sb = getSB(); if (!sb) { showErr2('Bağlantı koptu.'); return; } var { data: authData, error: authError } = await sb.auth.signUp({ email: em, password: p1 }); if (authError) { hideLoading(); showErr2(translateAuthError(authError.message)); return; } if (!authData.user) { hideLoading(); showErr2('Kayıt başarısız. Lütfen tekrar deneyin.'); return; } var userId = authData.user.id, orgId = 'org-' + Date.now().toString(36), branchId = 'br-' + Date.now().toString(36); await supaPost('orgs', { id: orgId, name: orgName, status: 'pending', registered_at: new Date().toISOString() }); await supaPost('branches', { id: branchId, org_id: orgId, name: branchName, code: branchName.slice(0, 3).toUpperCase() }); await supaPost('users', { id: userId, org_id: orgId, branch_id: branchId, email: em, role: 'admin', name: name, phone: phone }); hideLoading(); document.getElementById('lbox-wrap').innerHTML = '<div class="lbox" style="text-align:center"><div style="font-size:64px;margin-bottom:16px">⏳</div><h2 style="font-size:20px;font-weight:800;margin-bottom:8px">Kaydınız Alındı!</h2><p style="color:var(--text2);line-height:1.6;margin-bottom:20px">Hesabınız incelemeye alındı.<br>Onaylandıktan sonra giriş yapabilirsiniz.<br><b style="color:var(--blue2)">'+esc(orgName)+'</b></p><div class="al al-y" style="text-align:left;margin-bottom:16px">📧 Onay durumu için yöneticiyle iletişime geçin.</div><button class="btn bp w100" onclick="location.reload()">Giriş Sayfasına Dön</button></div>'; } catch(e) { hideLoading(); showErr2('Bir hata oluştu: ' + e.message); } }

async function doSporcuLogin() { var tc = gv('ls-tc'), pass = gv('ls-pass'); var errEl = document.getElementById('ls-err'); showLoading(); try { var res = await supaGet('athletes', { tc: tc }); hideLoading(); var found = null, foundBranch = null, foundOrg = null; var ph = await sha256(pass); (res || []).forEach(function(r) { var exp = r.sp_pass || tc.slice(-4); if (pass === exp || ph === exp) { found = dbToAth(r); foundBranch = r.branch_id; foundOrg = r.org_id; } }); if (found) { try { await supaPost('login_logs', { user_email: tc + '@sporcu', role: 'sporcu', user_agent: navigator.userAgent }); } catch(err){} currentSporcu = found; currentSporcuBranchId = foundBranch; currentSporcuOrgId = foundOrg; currentOrgId = foundOrg; currentBranchId = foundBranch; localStorage.setItem('sporcu_app_sporcu', JSON.stringify({user: found, orgId: foundOrg, branchId: foundBranch})); await loadBranchData(); var orgs = await supaGet('orgs', { id: foundOrg }); var orgName = orgs && orgs[0] ? orgs[0].name : 'Akademi'; document.getElementById('lbox-wrap').style.display = 'none'; document.getElementById('sporcu-portal').style.display = 'flex'; updateBranchUI(); var sn = document.getElementById('sp-name'); if (sn) sn.textContent = found.fn + ' ' + found.ln; var on = document.getElementById('sp-orgname'); if (on) on.textContent = (settings && settings.schoolName) ? settings.schoolName : orgName; errEl.classList.add('dn'); spTab('profil'); } else { errEl.classList.remove('dn'); } } catch(e) { hideLoading(); errEl.classList.remove('dn'); } }
function doSporcuLogout() { currentSporcu = null; localStorage.removeItem('sporcu_app_sporcu'); document.getElementById('sporcu-portal').style.display = 'none'; document.getElementById('lbox-wrap').style.display = 'flex'; }

function showForgotPassword() { document.getElementById('lbox-wrap').innerHTML = '<div class="lbox"><div class="llogo"><div class="llogo-i" style="background-image:url(\''+DEFAULT_LOGO+'\');background-size:cover;background-position:center;border:2px solid var(--border)"></div><h1 style="font-size:18px;font-weight:800">Şifre Sıfırlama</h1></div><div id="fp-step1"><div class="fgr mb3"><label>TC Kimlik veya E-posta</label><input id="fp-id" type="text" placeholder="TC veya e-posta giriniz"/></div><div id="fp-err" class="lerr dn"></div><button class="btn bp w100 mb2" style="padding:12px" onclick="fpSendCode()">Doğrulama Kodu Gönder</button><button class="btn bs w100" onclick="location.reload()">Geri Dön</button></div><div id="fp-step2" class="dn"><p style="color:var(--text2);font-size:13px;text-align:center;margin-bottom:12px" id="fp-phone-hint"></p><div class="al al-b mb3" id="fp-demo-code" style="font-size:18px;text-align:center;font-weight:700;letter-spacing:6px"></div><div class="fgr mb3"><label>6 Haneli Kod</label><input id="fp-code" type="tel" maxlength="6" placeholder="------" style="font-size:22px;letter-spacing:8px;text-align:center"/></div><div id="fp-err2" class="lerr dn"></div><button class="btn bp w100 mb2" style="padding:12px" onclick="fpVerifyCode()">Doğrula</button></div><div id="fp-step3" class="dn"><div class="fgr mb2"><label>Yeni Şifre</label><input id="fp-np1" type="password"/></div><div class="fgr mb3"><label>Şifre Tekrar</label><input id="fp-np2" type="password"/></div><div id="fp-new-err" class="lerr dn"></div><button class="btn bp w100" style="padding:12px" onclick="fpSetNewPassword()">Şifreyi Güncelle</button></div></div>'; }
async function fpSendCode() { var val = gv('fp-id'), errEl = document.getElementById('fp-err'); if (!val) { errEl.textContent = 'Alan boş!'; errEl.classList.remove('dn'); return; } showLoading(); var found = null, type = null, phone = null; if (val.length === 11 && /^\d+$/.test(val)) { var r1 = await supaGet('athletes', { tc: val }); if (r1 && r1.length > 0) { found = r1[0]; type = 'sporcu'; phone = r1[0].ph || ''; } } if (!found) { var r2 = await supaGet('users', { email: val }); if (r2 && r2.length > 0) { found = r2[0]; type = 'admin'; phone = r2[0].phone || ''; } } hideLoading(); if (!found) { errEl.textContent = 'Kayıt bulunamadı!'; errEl.classList.remove('dn'); return; } var code = Math.floor(100000 + Math.random() * 900000).toString(); _forgotCtx = { code: code, expiry: Date.now() + 10 * 60 * 1000, target: found, type: type }; if (phone && NETGSM_USER) await sendSMS(phone, 'Sporcu Paneli doğrulama kodunuz: ' + code + '. 10 dk geçerlidir.'); document.getElementById('fp-step1').classList.add('dn'); document.getElementById('fp-step2').classList.remove('dn'); var hint = document.getElementById('fp-phone-hint'); if (hint) hint.textContent = phone ? 'Kod ' + phone.slice(0, 3) + '***' + phone.slice(-2) + ' numarasına gönderildi' : 'Kod hazır'; var demo = document.getElementById('fp-demo-code'); if (demo) { if (!NETGSM_USER) demo.textContent = code; else demo.style.display = 'none'; } }
function fpVerifyCode() { var code = gv('fp-code'), errEl = document.getElementById('fp-err2'); if (!_forgotCtx) { location.reload(); return; } if (Date.now() > _forgotCtx.expiry) { errEl.textContent = 'Kod süresi doldu!'; errEl.classList.remove('dn'); return; } if (code.trim() !== _forgotCtx.code) { errEl.textContent = 'Yanlış kod!'; errEl.classList.remove('dn'); return; } document.getElementById('fp-step2').classList.add('dn'); document.getElementById('fp-step3').classList.remove('dn'); }
async function fpSetNewPassword() { var p1 = gv('fp-np1'), p2 = gv('fp-np2'), errEl = document.getElementById('fp-new-err'); if (!p1) { errEl.textContent = 'Şifre boş!'; errEl.classList.remove('dn'); return; } if (p1 !== p2) { errEl.textContent = 'Şifreler eşleşmiyor!'; errEl.classList.remove('dn'); return; } if (p1.length < 6) { errEl.textContent = 'En az 6 karakter!'; errEl.classList.remove('dn'); return; } showLoading(); try { var sb = getSB(); if (!sb) return; if (_forgotCtx.type === 'admin' && _forgotCtx.target.email) { var ph = await sha256(p1); await supaPatch('users', { pass: ph }, { id: _forgotCtx.target.id }); } else { var ph = await sha256(p1); await supaPatch('athletes', { sp_pass: ph }, { id: _forgotCtx.target.id }); } hideLoading(); _forgotCtx = null; document.getElementById('lbox-wrap').innerHTML = '<div class="lbox" style="text-align:center"><div style="font-size:48px;margin-bottom:16px">&#x2705;</div><div style="font-size:20px;font-weight:800;margin-bottom:8px">Şifre Güncellendi!</div><button class="btn bp w100 mt3" style="padding:12px" onclick="location.reload()">Giriş Yap</button></div>'; } catch(e) { hideLoading(); errEl.textContent = 'Hata: ' + e.message; errEl.classList.remove('dn'); } }

function pgDashboard() { updateBadges(); var total = athletes.length, active = athletes.filter(function(a) { return a.st === 'active'; }).length; var inc = payments.filter(function(p) { return p.ty === 'income' && p.st === 'completed'; }).reduce(function(s, p) { return s + (p.amt || 0); }, 0); var exp = payments.filter(function(p) { return p.ty === 'expense' && p.st === 'completed'; }).reduce(function(s, p) { return s + (p.amt || 0); }, 0); var od = overdueCount(); var html = '<div class="ph"><div class="stit">Gösterge</div><div class="ssub">Akademi özeti</div></div><div class="g4 mb3">' + sc('b', '&#x1F465;', fmtN(active), 'Aktif Sporcu', 'athletes') + sc('g', '&#x1F4B0;', fmtN(inc) + ' &#x20BA;', 'Aylık Gelir', 'payments') + sc('r', '&#x26A0;', fmtN(od), 'Gecikmiş Ödeme', 'payments') + sc('y', '&#x1F4CB;', fmtN(total), 'Toplam Kayıt', 'athletes') + '</div><div class="card mb3"><div class="tw6 tsm mb2">Hızlı Eylemler</div><div class="quick-actions"><button class="qa-btn" onclick="go(\'athletes\')" style="border-color:var(--blue2)"><div class="qa-icon">&#x2795;</div><div class="qa-lbl">YENİ SPORCU</div></button><button class="qa-btn" onclick="go(\'payments\')" style="border-color:var(--green)"><div class="qa-icon">&#x1F4B3;</div><div class="qa-lbl">ÖDEME AL</div></button><button class="qa-btn" onclick="go(\'attendance\')" style="border-color:var(--yellow)"><div class="qa-icon">&#x2705;</div><div class="qa-lbl">YOKLAMA</div></button><button class="qa-btn" onclick="showQRScanner()" style="border-color:var(--purple)"><div class="qa-icon">&#x1F4F7;</div><div class="qa-lbl">QR OKU</div></button></div></div><div class="g2"><div class="card"><div class="tw6 tsm mb2">Gelir/Gider Dağılımı</div><div id="dash-chart" style="height:180px"></div></div><div class="card"><div class="tw6 tsm mb2">Branş Dağılımı</div><div id="dash-sport-chart" style="height:180px"></div></div></div>'; setTimeout(function() { renderDashCharts(inc, exp); }, 50); return html; }
function renderDashCharts(inc, exp) { var el = document.getElementById('dash-chart'); if (!el) return; el.innerHTML = '<div style="display:flex;flex-direction:column;gap:10px;height:100%;justify-content:center"><div style="display:flex;align-items:center;gap:10px"><div style="width:12px;height:12px;border-radius:50%;background:var(--green)"></div><span style="font-size:13px">Gelir: <b>' + fmtN(inc) + ' &#x20BA;</b></span></div><div style="display:flex;align-items:center;gap:10px"><div style="width:12px;height:12px;border-radius:50%;background:var(--red)"></div><span style="font-size:13px">Gider: <b>' + fmtN(exp) + ' &#x20BA;</b></span></div><div style="height:20px;background:var(--bg3);border-radius:10px;overflow:hidden"><div style="width:' + (inc + exp > 0 ? inc / (inc + exp) * 100 : 50) + '%;height:100%;background:linear-gradient(90deg,var(--green),var(--blue))"></div></div></div>'; var spData = {}; athletes.forEach(function(a) { var sp = a.sp || 'Diger'; spData[sp] = (spData[sp] || 0) + 1; }); var spEl = document.getElementById('dash-sport-chart'); if (spEl) { var bars = Object.keys(spData).map(function(k) { return '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px"><div style="width:100%;max-width:40px;background:var(--grad);border-radius:4px 4px 0 0;min-height:3px;height:' + (spData[k] * 8) + 'px"></div><span style="font-size:10px;color:var(--text2)">' + esc(k) + '</span></div>'; }).join(''); spEl.innerHTML = '<div style="display:flex;align-items:flex-end;gap:6px;height:100%;padding:0 10px">' + bars + '</div>'; } }

function pgAthletes() { var list = athletes; if (_athFilter.sp) list = list.filter(function(a) { return a.sp === _athFilter.sp; }); if (_athFilter.st) list = list.filter(function(a) { return a.st === _athFilter.st; }); if (_athFilter.cls) list = list.filter(function(a) { return a.clsId === _athFilter.cls; }); if (_athFilter.q) { var q = _athFilter.q.toLowerCase(); list = list.filter(function(a) { return (a.fn + ' ' + a.ln).toLowerCase().indexOf(q) >= 0 || a.tc.indexOf(q) >= 0; }); } return '<div class="ph"><div class="stit">Sporcular</div><div class="ssub">Kayıtlı sporcuları yönet</div></div><div class="filters mb3"><select class="fs" onchange="_athFilter.sp=this.value;go(\'athletes\')"><option value="">Tüm Branşlar</option>' + sports.map(function(s) { return '<option value="' + esc(s.name) + '"' + (_athFilter.sp === s.name ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select><select class="fs" onchange="_athFilter.st=this.value;go(\'athletes\')"><option value="">Tüm Durumlar</option><option value="active"' + (_athFilter.st === 'active' ? ' selected' : '') + '>Aktif</option><option value="inactive"' + (_athFilter.st === 'inactive' ? ' selected' : '') + '>Pasif</option></select><select class="fs" onchange="_athFilter.cls=this.value;go(\'athletes\')"><option value="">Tüm Sınıflar</option>' + classes.map(function(c) { return '<option value="' + esc(c.id) + '"' + (_athFilter.cls === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select><input class="fs" type="text" placeholder="Ara..." value="' + esc(_athFilter.q) + '" onchange="_athFilter.q=this.value;go(\'athletes\')"/></div><div class="flex fjb fca mb3 gap2"><button class="btn bp" onclick="editAth()">+ Yeni Sporcu</button><button class="btn bs" onclick="importExcelAthletes()">&#x1F4E5; Excel Yükle</button><button class="btn bs" onclick="exportAthletes()">&#x1F4E4; Excel İndir</button></div><div class="card"><div class="tw"><table><thead><tr><th>Ad Soyad</th><th>TC</th><th>Branş</th><th>Sınıf</th><th>Durum</th><th>Ücret</th><th>İşlemler</th></tr></thead><tbody>' + list.map(function(a) { return '<tr><td><div class="flex fca gap2">' + getAvaStr(36) + '<div><div class="tw6">' + esc(a.fn) + ' ' + esc(a.ln) + '</div><div class="ts tm">' + age(a.bd) + ' yaş</div></div></div></td><td>' + esc(a.tc) + '</td><td>' + semi(a.sp) + ' ' + esc(a.sp) + '</td><td>' + esc(clsName(a.clsId)) + '</td><td><span class="bg ' + stc(a.st) + '">' + stl(a.st) + '</span></td><td class="tw6">' + fmtN(a.fee) + ' &#x20BA;</td><td><button class="btn btn-xs bp" onclick="editAth(\'' + a.id + '\')">Düzenle</button> <button class="btn btn-xs bd" onclick="delAth(\'' + a.id + '\')">Sil</button></td></tr>'; }).join('') + '</tbody></table></div></div>'; }

function editAth(id) { 
  var a = id ? athletes.find(function(x) { return x.id === id; }) : null; var isNew = !a; 
  modal(isNew ? 'Yeni Sporcu' : 'Sporcu Düzenle', '<div class="g21"><div class="fgr"><label>Ad</label><input id="a-fn" value="' + esc(a ? a.fn : '') + '"/></div><div class="fgr"><label>Soyad</label><input id="a-ln" value="' + esc(a ? a.ln : '') + '"/></div></div><div class="g21"><div class="fgr"><label>TC Kimlik</label><input id="a-tc" type="tel" maxlength="11" value="' + esc(a ? a.tc : '') + '"/></div><div class="fgr"><label>Doğum Tarihi</label><input id="a-bd" type="date" value="' + esc(a ? a.bd : '') + '"/></div></div><div class="g21"><div class="fgr"><label>Cinsiyet</label><select id="a-gn"><option value="E"' + (a && a.gn === 'E' ? ' selected' : '') + '>Erkek</option><option value="K"' + (a && a.gn === 'K' ? ' selected' : '') + '>Kadın</option></select></div><div class="fgr"><label>Telefon</label><input id="a-ph" type="tel" value="' + esc(a ? a.ph : '') + '"/></div></div><div class="fgr mb2"><label>E-posta</label><input id="a-em" type="email" value="' + esc(a ? a.em : '') + '"/></div><div class="g21"><div class="fgr"><label>Branş</label><select id="a-sp">' + sports.map(function(s) { return '<option value="' + esc(s.name) + '"' + (a && a.sp === s.name ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></div><div class="fgr"><label>Sınıf</label><select id="a-cls">' + classes.map(function(c) { return '<option value="' + esc(c.id) + '"' + (a && a.clsId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div></div><div class="g21"><div class="fgr"><label>Kategori</label><input id="a-cat" value="' + esc(a ? a.cat : '') + '"/></div><div class="fgr"><label>Lisans No</label><input id="a-lic" value="' + esc(a ? a.lic : '') + '"/></div></div><div class="g21"><div class="fgr"><label>Kayıt Tarihi</label><input id="a-rd" type="date" value="' + esc(a ? a.rd : tod()) + '"/></div><div class="fgr"><label>Durum</label><select id="a-st"><option value="active"' + (a && a.st === 'active' ? ' selected' : '') + '>Aktif</option><option value="inactive"' + (a && a.st === 'inactive' ? ' selected' : '') + '>Pasif</option><option value="pending"' + (a && a.st === 'pending' ? ' selected' : '') + '>Bekliyor</option></select></div></div><div class="g21"><div class="fgr"><label>Aylık Ücret</label><input id="a-fee" type="number" value="' + (a ? a.fee : '') + '"/></div><div class="fgr"><label>Vade Günü</label><input id="a-vd" type="number" value="' + (a ? a.vd : '5') + '"/></div></div><div class="fgr mb2"><label>Notlar</label><textarea id="a-nt">' + esc(a ? a.nt : '') + '</textarea></div><div class="dv"></div><div class="tw6 tsm mb2">Veli Bilgileri</div><div class="g21"><div class="fgr"><label>Veli Ad Soyad</label><input id="a-pn" value="' + esc(a ? a.pn : '') + '"/></div><div class="fgr"><label>Veli Telefon</label><input id="a-pph" type="tel" value="' + esc(a ? a.pph : '') + '"/></div></div><div class="fgr mb2"><label>Veli E-posta</label><input id="a-pem" type="email" value="' + esc(a ? a.pem : '') + '"/></div><div class="fgr mb2"><label>Sporcu Şifresi (Varsayılan: TC son 4)</label><input id="a-sppass" type="text" placeholder="Boş bırak = TC son 4" value="' + esc(a ? a.spPass : '') + '"/></div>', [
    { lbl: 'İptal', cls: 'bs', fn: function(){ closeModal(); } }, 
    { lbl: 'Kaydet', cls: 'bp', fn: async function() { 
        try {
            var obj = { id: a ? a.id : uid(), fn: gv('a-fn'), ln: gv('a-ln'), tc: gv('a-tc'), bd: gv('a-bd'), gn: gv('a-gn'), ph: gv('a-ph'), em: gv('a-em'), sp: gv('a-sp'), cat: gv('a-cat'), lic: gv('a-lic'), rd: gv('a-rd'), st: gv('a-st'), fee: gvn('a-fee'), vd: gvn('a-vd'), nt: gv('a-nt'), clsId: gv('a-cls'), pn: gv('a-pn'), pph: gv('a-pph'), pem: gv('a-pem'), spPass: gv('a-sppass') }; 
            if (!obj.fn || !obj.ln || !obj.tc) { toast('Ad, soyad ve TC zorunlu!', 'e'); return; } 
            var res = await dbSaveAth(obj); 
            if(res) { 
                if (isNew) athletes.push(obj); 
                else { var idx = athletes.findIndex(function(x) { return x.id === obj.id; }); if (idx >= 0) athletes[idx] = obj; } 
                toast('Sporcu kaydedildi!', 'g'); closeModal(); go('athletes'); 
            } 
        } catch(err) { console.error(err); alert("Kayıt sırasında hata oluştu!"); }
    }}
  ]); 
}

function delAth(id) { 
    var a = athletes.find(function(x) { return x.id === id; }); 
    confirm2('Sporcu Sil', '<b>' + esc(a.fn + ' ' + a.ln) + '</b> silinecek. Bu islem geri alınamaz.', async function() { 
        var res = await dbDelAth(id); 
        if(res){ athletes = athletes.filter(function(x) { return x.id !== id; }); toast('Sporcu silindi!', 'g'); go('athletes'); } 
    }); 
}

function importExcelAthletes() { modal('Excel Yükle', '<div class="fgr mb2"><label>Excel dosyası seçin (.xlsx, .xls)</label><input type="file" id="xl-file" accept=".xlsx,.xls" onchange="handleAthleteExcel(this)"/></div><div class="al al-b">Beklenen kolonlar: Ad, Soyad, TC, Telefon, Branş, Kategori, Ücret</div>', [{ lbl: 'Kapat', cls: 'bs', fn: function(){ closeModal(); } }]); }

async function handleAthleteExcel(input) { var file = input.files[0]; if (!file) return; showLoading(); try { var data = await file.arrayBuffer(), wb = XLSX.read(data, { type: 'array' }), ws = wb.Sheets[wb.SheetNames[0]], rows = XLSX.utils.sheet_to_json(ws, { header: 1 }), imported = 0; for (var i = 1; i < rows.length; i++) { var r = rows[i]; if (!r[0] || !r[1]) continue; var obj = { id: uid(), fn: r[0] || '', ln: r[1] || '', tc: String(r[2] || ''), ph: String(r[3] || ''), sp: r[4] || 'Futbol', cat: r[5] || '', fee: parseFloat(r[6]) || 0, st: 'active', rd: tod(), bd: '', gn: 'E', em: '', lic: '', vd: 5, nt: '', clsId: '', pn: '', pph: '', pem: '', spPass: '' }; await dbSaveAth(obj); athletes.push(obj); imported++; } toast(imported + ' sporcu yüklendi!', 'g'); closeModal(); go('athletes'); } catch(e) { toast('Hata: ' + e.message, 'e'); } hideLoading(); }

function pgPayments() { var list = payments; if (_payFilter.st) list = list.filter(function(p) { return p.st === _payFilter.st; }); if (_payFilter.q) { var q = _payFilter.q.toLowerCase(); list = list.filter(function(p) { return (p.an || '').toLowerCase().indexOf(q) >= 0; }); } var total = list.reduce(function(s, p) { return s + (p.amt || 0); }, 0); return '<div class="ph"><div class="stit">Ödemeler</div><div class="ssub">Tüm ödemeleri yönet</div></div><div class="filters mb3"><select class="fs" onchange="_payFilter.st=this.value;go(\'payments\')"><option value="">Tüm Durumlar</option><option value="pending"' + (_payFilter.st === 'pending' ? ' selected' : '') + '>Bekliyor</option><option value="completed"' + (_payFilter.st === 'completed' ? ' selected' : '') + '>Tamamlandı</option><option value="overdue"' + (_payFilter.st === 'overdue' ? ' selected' : '') + '>Gecikti</option></select><input class="fs" type="text" placeholder="Ara..." value="' + esc(_payFilter.q) + '" onchange="_payFilter.q=this.value;go(\'payments\')"/></div><div class="flex fjb fca mb3 gap2"><button class="btn bp" onclick="editPay()">+ Yeni Ödeme</button><button class="btn bs" onclick="exportPayments()">&#x1F4E4; Excel İndir</button><span class="tw6 tb">Toplam: ' + fmtN(total) + ' &#x20BA;</span></div><div class="card"><div class="tw"><table><thead><tr><th>Tarih</th><th>Sporcu</th><th>Açıklama</th><th>Tutar</th><th>Tür</th><th>Durum</th><th>İşlemler</th></tr></thead><tbody>' + list.map(function(p) { var isPending = p.needsApproval && p.st === 'pending', statusClass = isPending ? 'bg-y' : stc(p.st), statusText = isPending ? 'Onay Bekliyor' : stl(p.st); return '<tr><td>' + fmtD(p.dt) + '</td><td><div class="flex fca gap2">' + getAvaStr(28) + '<span class="tw6 tsm">' + esc(p.an) + '</span></div></td><td>' + esc(p.ds) + '</td><td class="tw6">' + fmtN(p.amt) + ' &#x20BA;</td><td><span class="bg ' + (p.ty === 'income' ? 'bg-g' : 'bg-r') + '">' + (p.ty === 'income' ? 'Gelir' : 'Gider') + '</span></td><td><span class="bg ' + statusClass + '">' + statusText + '</span></td><td>' + (isPending ? '<button class="btn btn-xs bsu" onclick="approvePay(\'' + p.id + '\')">Onayla</button> ' : '') + '<button class="btn btn-xs bp" onclick="editPay(\'' + p.id + '\')">Düzenle</button> <button class="btn btn-xs bd" onclick="delPay(\'' + p.id + '\')">Sil</button></td></tr>'; }).join('') + '</tbody></table></div></div>'; }

function editPay(id) { 
    var p = id ? payments.find(function(x) { return x.id === id; }) : null; var isNew = !p; 
    modal(isNew ? 'Yeni Ödeme' : 'Ödeme Düzenle', '<div class="g21"><div class="fgr"><label>Sporcu</label><select id="p-aid">' + athletes.map(function(a) { return '<option value="' + esc(a.id) + '"' + (p && p.aid === a.id ? ' selected' : '') + '>' + esc(a.fn + ' ' + a.ln) + '</option>'; }).join('') + '</select></div><div class="fgr"><label>Tutar</label><input id="p-amt" type="number" value="' + (p ? p.amt : '') + '"/></div></div><div class="g21"><div class="fgr"><label>Tarih</label><input id="p-dt" type="date" value="' + esc(p ? p.dt : tod()) + '"/></div><div class="fgr"><label>Vade</label><input id="p-dd" type="date" value="' + esc(p ? p.dd : '') + '"/></div></div><div class="g21"><div class="fgr"><label>Tür</label><select id="p-ty"><option value="income"' + (p && p.ty === 'income' ? ' selected' : '') + '>Gelir</option><option value="expense"' + (p && p.ty === 'expense' ? ' selected' : '') + '>Gider</option></select></div><div class="fgr"><label>Kategori</label><input id="p-cat" value="' + esc(p ? p.cat : 'Aidat') + '"/></div></div><div class="fgr mb2"><label>Açıklama</label><input id="p-ds" value="' + esc(p ? p.ds : '') + '"/></div><div class="g21"><div class="fgr"><label>Durum</label><select id="p-st"><option value="pending"' + (p && p.st === 'pending' ? ' selected' : '') + '>Bekliyor</option><option value="completed"' + (p && p.st === 'completed' ? ' selected' : '') + '>Tamamlandı</option><option value="overdue"' + (p && p.st === 'overdue' ? ' selected' : '') + '>Gecikti</option><option value="cancelled"' + (p && p.st === 'cancelled' ? ' selected' : '') + '>İptal</option></select></div><div class="fgr"><label>Fatura No</label><input id="p-inv" value="' + esc(p ? p.inv : '') + '"/></div></div>', [
        { lbl: 'İptal', cls: 'bs', fn: function(){ closeModal(); } }, 
        { lbl: 'Kaydet', cls: 'bp', fn: async function() { 
            try {
                var aid = gv('p-aid'), ath = athletes.find(function(a) { return a.id === aid; }); 
                var obj = { id: p ? p.id : uid(), aid: aid, an: ath ? ath.fn + ' ' + ath.ln : '', amt: gvn('p-amt'), dt: gv('p-dt'), ty: gv('p-ty'), cat: gv('p-cat'), ds: gv('p-ds'), st: gv('p-st'), inv: gv('p-inv'), dd: gv('p-dd') }; 
                if (!obj.amt) { toast('Tutar zorunlu!', 'e'); return; } 
                var res = await dbSavePay(obj); 
                if(res) { 
                    if (isNew) payments.push(obj); 
                    else { var idx = payments.findIndex(function(x) { return x.id === obj.id; }); if (idx >= 0) payments[idx] = obj; } 
                    toast('Ödeme kaydedildi!', 'g'); closeModal(); go('payments'); 
                } 
            } catch(err) { console.error(err); alert("Ödeme kaydı hatası!"); }
        }}
    ]); 
}

function approvePay(id) { var p = payments.find(function(x) { return x.id === id; }); if (!p) return; confirm2('Ödeme Onayla', '<b>' + esc(p.an) + '</b> için <b>' + fmtN(p.amt) + ' &#x20BA;</b> ödeme onaylanacak.', async function() { p.needsApproval = false; p.st = 'completed'; p.approvedBy = currentUser ? currentUser.name : 'Admin'; p.approvedAt = new Date().toISOString(); var res = await dbSavePay(p); if(res){ toast('Ödeme onaylandı!', 'g'); go('payments'); } }); }
function delPay(id) { var p = payments.find(function(x) { return x.id === id; }); confirm2('Ödeme Sil', '<b>' + esc(p.ds || 'Odeme') + '</b> silinecek.', async function() { var res = await dbDelPay(id); if(res) { payments = payments.filter(function(x) { return x.id !== id; }); toast('Ödeme silindi!', 'g'); go('payments'); } }); }

function pgAccounting() { var inc = payments.filter(function(p) { return p.ty === 'income' && p.st === 'completed'; }).reduce(function(s, p) { return s + (p.amt || 0); }, 0), exp = payments.filter(function(p) { return p.ty === 'expense' && p.st === 'completed'; }).reduce(function(s, p) { return s + (p.amt || 0); }, 0), bal = inc - exp; return '<div class="ph"><div class="stit">Muhasebe</div><div class="ssub">Finansal özet</div></div><div class="g3 mb3"><div class="card stat-card stat-g"><div class="stat-icon">&#x1F4B0;</div><div class="stat-val tg">' + fmtN(inc) + ' &#x20BA;</div><div class="stat-lbl">Toplam Gelir</div></div><div class="card stat-card stat-r"><div class="stat-icon">&#x1F4B8;</div><div class="stat-val tr2">' + fmtN(exp) + ' &#x20BA;</div><div class="stat-lbl">Toplam Gider</div></div><div class="card stat-card stat-b"><div class="stat-icon">&#x1F4B3;</div><div class="stat-val tb">' + fmtN(bal) + ' &#x20BA;</div><div class="stat-lbl">Net Bakiye</div></div></div><div class="card"><div class="tw6 tsm mb2">Son İşlemler</div><div class="tw"><table><thead><tr><th>Tarih</th><th>Açıklama</th><th>Tutar</th><th>Tür</th></tr></thead><tbody>' + payments.slice(0, 20).map(function(p) { return '<tr><td>' + fmtD(p.dt) + '</td><td>' + esc(p.ds) + '</td><td class="tw6 ' + (p.ty === 'income' ? 'tg' : 'tr2') + '">' + fmtN(p.amt) + ' &#x20BA;</td><td><span class="bg ' + (p.ty === 'income' ? 'bg-g' : 'bg-r') + '">' + (p.ty === 'income' ? 'Gelir' : 'Gider') + '</span></td></tr>'; }).join('') + '</tbody></table></div></div>'; }

function pgAttendance() { var list = athletes.filter(function(a) { return a.st === 'active'; }); if (ATSP) list = list.filter(function(a) { return a.sp === ATSP; }); if (ATCLS) list = list.filter(function(a) { return a.clsId === ATCLS; }); return '<div class="ph"><div class="stit">Devam Takibi</div><div class="ssub">Yoklama al</div></div><div class="card mb3"><div class="flex fca gap3 mb3"><div class="fgr" style="flex:0 0 140px"><label>Tarih</label><input type="date" id="att-date" value="' + ATD + '" onchange="ATD=this.value;go(\'attendance\')"/></div><div class="fgr"><label>Branş Filtre</label><select class="fs" id="att-sp" onchange="ATSP=this.value;go(\'attendance\')"><option value="">Tüm Branşlar</option>' + sports.map(function(s) { return '<option value="' + esc(s.name) + '"' + (ATSP === s.name ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></div><div class="fgr"><label>Sınıf Filtre</label><select class="fs" id="att-cls" onchange="ATCLS=this.value;go(\'attendance\')"><option value="">Tüm Sınıflar</option>' + classes.map(function(c) { return '<option value="' + esc(c.id) + '"' + (ATCLS === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></div><button class="btn bp" style="align-self:flex-end" onclick="showQRScanner()">&#x1F4F7; QR Okut</button></div></div><div class="card"><div class="tw6 tsm mb2">Sporcu Listesi</div><div>' + list.map(function(a) { var st = (attData[ATD] && attData[ATD][a.id]) || ''; return '<div class="att-row"><div class="flex fca gap2" style="flex:1">' + getAvaStr(32) + '<div><div class="tw6 tsm">' + esc(a.fn + ' ' + a.ln) + '</div><div class="ts tm">' + esc(a.sp) + ' · ' + esc(clsName(a.clsId)) + '</div></div></div><div class="att-btns"><button class="att-b' + (st === 'P' ? ' ap' : '') + '" onclick="setAtt(\'' + a.id + '\',\'P\')">Var</button><button class="att-b' + (st === 'A' ? ' aa' : '') + '" onclick="setAtt(\'' + a.id + '\',\'A\')">Yok</button><button class="att-b' + (st === 'L' ? ' al2' : '') + '" onclick="setAtt(\'' + a.id + '\',\'L\')">İzin</button><button class="att-b" onclick="setAtt(\'' + a.id + '\')">Temizle</button></div></div>'; }).join('') + '</div></div>'; }
async function setAtt(aid, st) { if (!attData[ATD]) attData[ATD] = {}; if (st === undefined) delete attData[ATD][aid]; else attData[ATD][aid] = st; await dbSaveAtt(ATD, aid, st); go('attendance'); }

function pgCoaches() { return '<div class="ph"><div class="stit">Antrenörler</div><div class="ssub">Antrenör kadrosu</div></div><div class="flex fjb fca mb3 gap2"><button class="btn bp" onclick="editCoach()">+ Yeni Antrenör</button></div><div class="card"><div class="tw"><table><thead><tr><th>Ad Soyad</th><th>Telefon</th><th>Branş</th><th>Maaş</th><th>Durum</th><th>İşlemler</th></tr></thead><tbody>' + coaches.map(function(c) { return '<tr><td><div class="flex fca gap2">' + getAvaStr(36) + '<span class="tw6 tsm">' + esc(c.fn + ' ' + c.ln) + '</span></div></td><td>' + esc(c.ph) + '</td><td>' + esc(c.sp) + '</td><td class="tw6">' + fmtN(c.sal) + ' &#x20BA;</td><td><span class="bg ' + stc(c.st) + '">' + stl(c.st) + '</span></td><td><button class="btn btn-xs bp" onclick="editCoach(\'' + c.id + '\')">Düzenle</button> <button class="btn btn-xs bd" onclick="delCoach(\'' + c.id + '\')">Sil</button></td></tr>'; }).join('') + '</tbody></table></div></div>'; }
function editCoach(id) { 
    var c = id ? coaches.find(function(x) { return x.id === id; }) : null; var isNew = !c; 
    modal(isNew ? 'Yeni Antrenör' : 'Antrenör Düzenle', '<div class="g21"><div class="fgr"><label>Ad</label><input id="c-fn" value="' + esc(c ? c.fn : '') + '"/></div><div class="fgr"><label>Soyad</label><input id="c-ln" value="' + esc(c ? c.ln : '') + '"/></div></div><div class="g21"><div class="fgr"><label>Telefon</label><input id="c-ph" type="tel" value="' + esc(c ? c.ph : '') + '"/></div><div class="fgr"><label>E-posta</label><input id="c-em" type="email" value="' + esc(c ? c.em : '') + '"/></div></div><div class="g21"><div class="fgr"><label>Branş</label><select id="c-sp">' + sports.map(function(s) { return '<option value="' + esc(s.name) + '"' + (c && c.sp === s.name ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></div><div class="fgr"><label>Maaş</label><input id="c-sal" type="number" value="' + (c ? c.sal : '') + '"/></div></div><div class="g21"><div class="fgr"><label>Durum</label><select id="c-st"><option value="active"' + (c && c.st === 'active' ? ' selected' : '') + '>Aktif</option><option value="inactive"' + (c && c.st === 'inactive' ? ' selected' : '') + '>Pasif</option></select></div><div class="fgr"><label>Başlama Tarihi</label><input id="c-sd" type="date" value="' + esc(c ? c.sd : tod()) + '"/></div></div><div class="fgr mb2"><label>Notlar</label><textarea id="c-nt">' + esc(c ? c.nt : '') + '</textarea></div>', [
        { lbl: 'İptal', cls: 'bs', fn: function(){ closeModal(); } }, 
        { lbl: 'Kaydet', cls: 'bp', fn: async function() { 
            try {
                var obj = { id: c ? c.id : uid(), fn: gv('c-fn'), ln: gv('c-ln'), ph: gv('c-ph'), em: gv('c-em'), sp: gv('c-sp'), sal: gvn('c-sal'), st: gv('c-st'), sd: gv('c-sd'), nt: gv('c-nt') }; 
                if (!obj.fn || !obj.ln) { toast('Ad ve soyad zorunlu!', 'e'); return; } 
                var res = await dbSaveCoach(obj); 
                if(res){ 
                    if (isNew) coaches.push(obj); 
                    else { var idx = coaches.findIndex(function(x) { return x.id === obj.id; }); if (idx >= 0) coaches[idx] = obj; } 
                    toast('Antrenör kaydedildi!', 'g'); closeModal(); go('coaches'); 
                } 
            } catch (err) { console.error(err); alert("Antrenör kayıt hatası!"); }
        }}
    ]); 
}
function delCoach(id) { var c = coaches.find(function(x) { return x.id === id; }); confirm2('Antrenör Sil', '<b>' + esc(c.fn + ' ' + c.ln) + '</b> silinecek.', async function() { var res = await dbDelCoach(id); if(res){ coaches = coaches.filter(function(x) { return x.id !== id; }); toast('Antrenör silindi!', 'g'); go('coaches'); } }); }

function pgMessages() { return '<div class="ph"><div class="stit">Mesajlar</div><div class="ssub">Gelen kutusu</div></div><div class="flex fjb fca mb3 gap2"><button class="btn bp" onclick="newMessage()">+ Yeni Mesaj</button></div><div class="card">' + messages.map(function(m) { return '<div class="att-row" style="cursor:pointer" onclick="viewMessage(\'' + m.id + '\')"><div class="flex fca gap2" style="flex:1">' + getAvaStr(32) + '<div style="flex:1"><div class="flex fjb fca"><span class="tw6 tsm">' + esc(m.sub) + '</span><span class="ts tm">' + fmtD(m.dt) + '</span></div><div class="ts tm trunc">' + esc(m.body.slice(0, 60)) + (m.body.length > 60 ? '...' : '') + '</div></div><span class="bg ' + (m.rd ? 'bg-b' : 'bg-y') + '">' + (m.rd ? 'Okundu' : 'Yeni') + '</span></div></div>'; }).join('') + '</div>'; }
function newMessage() { modal('Yeni Mesaj', '<div class="fgr mb2"><label>Kime</label><select id="m-to"><option value="all">Tüm Sporcular</option>' + athletes.map(function(a) { return '<option value="' + esc(a.id) + '">' + esc(a.fn + ' ' + a.ln) + '</option>'; }).join('') + '</select></div><div class="fgr mb2"><label>Konu</label><input id="m-sub"/></div><div class="fgr mb2"><label>Mesaj</label><textarea id="m-body" rows="5"></textarea></div><div class="flex fca gap2"><input type="checkbox" id="m-sms"/><label style="margin:0">SMS olarak da gönder</label></div>', [{ lbl: 'İptal', cls: 'bs', fn: function(){ closeModal(); } }, { lbl: 'Gönder', cls: 'bp', fn: async function() { var to = gv('m-to'), sub = gv('m-sub'), body = gv('m-body'), sendSms = document.getElementById('m-sms').checked; if (!sub || !body) { toast('Konu ve mesaj zorunlu!', 'e'); return; } var obj = { id: uid(), fr: currentUser ? currentUser.name : 'Admin', role: 'admin', sub: sub, body: body, dt: new Date().toISOString(), rd: false }; var res = await dbSaveMsg(obj); if(res) { messages.push(obj); if (sendSms && NETGSM_USER) { var phones = []; if (to === 'all') athletes.forEach(function(a) { if (a.ph) phones.push(a.ph); }); else { var a = athletes.find(function(x) { return x.id === to; }); if (a && a.ph) phones.push(a.ph); } if (phones.length > 0) { var sent = await sendBulkSMS(phones, sub + ': ' + body); toast(sent + ' SMS gönderildi!', 'g'); } } toast('Mesaj gönderildi!', 'g'); closeModal(); go('messages'); } } }]); }
function viewMessage(id) { var m = messages.find(function(x) { return x.id === id; }); if (!m) return; if (!m.rd) { m.rd = true; dbSaveMsg(m); } modal(esc(m.sub), '<div class="ts tm mb2">Gönderen: ' + esc(m.fr) + ' · ' + fmtD(m.dt) + '</div><div style="line-height:1.7">' + esc(m.body).replace(/\n/g, '<br>') + '</div>', [{ lbl: 'Kapat', cls: 'bs', fn: function(){ closeModal(); } }, { lbl: 'Sil', cls: 'bd', fn: async function() { var res = await dbDelMsg(id); if(res) { messages = messages.filter(function(x) { return x.id !== id; }); closeModal(); go('messages'); } } }]); }

function pgSettings() { 
  return '<div class="ph"><div class="stit">Ayarlar</div><div class="ssub">Sistem ayarları ve yönetim</div></div>' +
    '<div class="card mb3"><div class="tw6 tsm mb2">Kurum Logosu</div>' +
    '<div class="flex fca gap3 mb3"><div class="ava" style="width:64px;height:64px;background-image:url(\''+getLogo()+'\');background-size:cover;background-position:center;border:2px solid var(--border);background-color:var(--bg3)"></div>' +
    '<div class="fgr"><button class="btn bp mb2" onclick="document.getElementById(\'logo-upload\').click()">Logoyu Değiştir</button><button class="btn bd" onclick="removeLogo()">Logoyu Sıfırla</button></div></div>' +
    '<input type="file" id="logo-upload" accept="image/*" class="dn" onchange="handleLogoUpload(this)">' +
    '</div>' +
    '<div class="card mb3"><div class="tw6 tsm mb2">Kurum Bilgileri</div>' + row('Kurum Adı', (settings && settings.schoolName) ? settings.schoolName : '-') + row('Adres', (settings && settings.address) ? settings.address : '-') + row('Telefon', (settings && settings.ownerPhone) ? settings.ownerPhone : '-') + '</div>' +
    '<div class="card mb3"><div class="tw6 tsm mb2">Banka Hesabı</div>' + row('Banka', (settings && settings.bankName) ? settings.bankName : '-') + row('Hesap Adı', (settings && settings.accountName) ? settings.accountName : '-') + row('IBAN', (settings && settings.iban) ? settings.iban : '-') + '</div>' +
    '<div class="card mb3"><div class="tw6 tsm mb2">NetGSM SMS</div>' + row('Kullanıcı', NETGSM_USER ? '***' : 'Ayarlanmadı') + row('Başlık', NETGSM_HEADER) + '</div>' +
    '<div class="card mb3"><div class="tw6 tsm mb2">Güvenlik ve Yönetim</div><p class="ts tm mb2">Yönetici hesapları ve yetkilendirme işlemleri</p><div class="flex gap2" style="flex-wrap:wrap"><button class="btn bsu" onclick="showAddAdminModal()">+ Yeni Yönetici Ekle</button><button class="btn bd" onclick="showChangePasswordModal()">Şifremi Değiştir</button></div></div>' +
    '<div class="flex gap2"><button class="btn bp" onclick="editSettings()">Kurum/Banka Ayarlarını Düzenle</button><button class="btn bs" onclick="go(\'dashboard\')">Geri Dön</button></div>'; 
}

async function handleLogoUpload(input) {
  var file = input.files[0]; if (!file) return;
  showLoading();
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = async function() {
      var canvas = document.createElement('canvas');
      var MAX_SIZE = 150; var w = img.width, h = img.height;
      if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } } else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      var base64 = canvas.toDataURL('image/png', 0.8);
      if(!settings) settings = {};
      settings.logoUrl = base64;
      var success = await saveS(); 
      if(success) { updateBranchUI(); toast('Logo başarıyla güncellendi!', 'g'); go('settings'); }
      hideLoading();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

async function removeLogo() {
  showLoading();
  if(!settings) settings = {};
  settings.logoUrl = '';
  var success = await saveS(); 
  if(success) { updateBranchUI(); toast('Logo sıfırlandı!', 'y'); go('settings'); }
  hideLoading();
}

function editSettings() { 
    modal('Ayarlar Düzenle', '<div class="fgr mb2"><label>Kurum Adı</label><input id="s-name" value="' + esc(settings ? settings.schoolName : '') + '"/></div><div class="fgr mb2"><label>Adres</label><textarea id="s-addr">' + esc(settings ? settings.address : '') + '</textarea></div><div class="fgr mb2"><label>Telefon</label><input id="s-phone" value="' + esc(settings ? settings.ownerPhone : '') + '"/></div><div class="dv"></div><div class="fgr mb2"><label>Banka Adı</label><input id="s-bank" value="' + esc(settings ? settings.bankName : '') + '"/></div><div class="fgr mb2"><label>Hesap Adı</label><input id="s-acc" value="' + esc(settings ? settings.accountName : '') + '"/></div><div class="fgr mb2"><label>IBAN</label><input id="s-iban" value="' + esc(settings ? settings.iban : '') + '"/></div><div class="dv"></div><div class="fgr mb2"><label>NetGSM Kullanıcı</label><input id="s-ng-user" value="' + esc(settings ? settings.netgsmUser : '') + '"/></div><div class="fgr mb2"><label>NetGSM Şifre</label><input id="s-ng-pass" type="password" placeholder="Değiştirmek için girin"/></div><div class="fgr mb2"><label>NetGSM Başlık</label><input id="s-ng-head" value="' + esc(settings ? settings.netgsmHeader || 'SPORCU' : 'SPORCU') + '"/></div>', [
        { lbl: 'İptal', cls: 'bs', fn: function(){ closeModal(); } }, 
        { lbl: 'Kaydet', cls: 'bp', fn: async function() { 
            try {
                if(!settings) settings = {}; 
                settings.schoolName = gv('s-name'); settings.address = gv('s-addr'); settings.ownerPhone = gv('s-phone'); settings.bankName = gv('s-bank'); settings.accountName = gv('s-acc'); settings.iban = gv('s-iban'); settings.netgsmUser = gv('s-ng-user'); 
                var np = gv('s-ng-pass'); if (np) settings.netgsmPass = np; settings.netgsmHeader = gv('s-ng-head'); 
                NETGSM_USER = settings.netgsmUser; NETGSM_PASS = settings.netgsmPass || ''; NETGSM_HEADER = settings.netgsmHeader; 
                var success = await saveS(); 
                if(success) { toast('Ayarlar kaydedildi!', 'g'); closeModal(); go('settings'); } 
            } catch (err) { alert("Ayarlar kaydedilemedi: " + err); }
        }}
    ]); 
}

function showChangePasswordModal() { modal('Şifremi Değiştir', '<div class="fgr mb2"><label>Yeni Şifre</label><input id="cp-p1" type="password" placeholder="En az 6 karakter"/></div><div class="fgr mb2"><label>Yeni Şifre (Tekrar)</label><input id="cp-p2" type="password"/></div>', [{ lbl: 'İptal', cls: 'bs', fn: function(){ closeModal(); } }, { lbl: 'Şifreyi Güncelle', cls: 'bp', fn: async function() { var p1 = gv('cp-p1'), p2 = gv('cp-p2'); if (p1 !== p2) { toast('Şifreler eşleşmiyor!', 'e'); return; } if (p1.length < 6) { toast('Şifre en az 6 karakter olmalıdır!', 'e'); return; } showLoading(); var sb = getSB(); if (!sb) return; var { error } = await sb.auth.updateUser({ password: p1 }); hideLoading(); if (error) { toast('Hata: ' + translateAuthError(error.message), 'e'); } else { toast('Şifreniz başarıyla değiştirildi!', 'g'); closeModal(); } } }]); }

function showAddAdminModal() { modal('Yeni Yönetici Ekle', '<div class="fgr mb2"><label>Ad Soyad</label><input id="aa-name" placeholder="Örn: Ahmet Yılmaz"/></div><div class="fgr mb2"><label>E-posta</label><input id="aa-em" type="email" placeholder="yeni@spor.com"/></div><div class="fgr mb2"><label>Telefon</label><input id="aa-ph" type="tel" placeholder="05xx..."/></div><div class="fgr mb2"><label>Geçici Şifre</label><input id="aa-pass" type="password" placeholder="En az 6 karakter"/></div><div class="al al-b">Eklenen yönetici kendi e-postası ve bu şifre ile panele giriş yapabilir.</div>', [{ lbl: 'İptal', cls: 'bs', fn: function(){ closeModal(); } }, { lbl: 'Yönetici Ekle', cls: 'bp', fn: async function() { var name = gv('aa-name'), em = gv('aa-em'), ph = gv('aa-ph'), pass = gv('aa-pass'); if (!name || !em || !pass) { toast('Ad, e-posta ve şifre zorunlu!', 'e'); return; } if (pass.length < 6) { toast('Şifre en az 6 karakter olmalıdır!', 'e'); return; } showLoading(); try { var tempSb = supabase.createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false, autoRefreshToken: false } }); var { data, error } = await tempSb.auth.signUp({ email: em, password: pass }); if (error) { hideLoading(); toast('Hata: ' + translateAuthError(error.message), 'e'); return; } var userId = data.user.id; await supaPost('users', { id: userId, org_id: currentOrgId, branch_id: currentBranchId, email: em, role: 'admin', name: name, phone: ph }); hideLoading(); toast('Yeni yönetici başarıyla eklendi!', 'g'); closeModal(); } catch(e) { hideLoading(); toast('Beklenmeyen hata: ' + e.message, 'e'); } } }]); }

function pgBranches() { return '<div class="ph"><div class="stit">Şubeler</div><div class="ssub">Şubeleri yönet</div></div><div class="flex fjb fca mb3 gap2"><button class="btn bp" onclick="editBranch()">+ Yeni Şube</button></div><div class="card"><div class="tw"><table><thead><tr><th>Şube Adı</th><th>Kod</th><th>İşlemler</th></tr></thead><tbody>' + _branchesCache.filter(function(b) { return b.orgId === currentOrgId; }).map(function(b) { return '<tr><td class="tw6">' + esc(b.name) + '</td><td>' + esc(b.code) + '</td><td><button class="btn btn-xs bp" onclick="switchBranch(\'' + b.id + '\')">Seç</button></td></tr>'; }).join('') + '</tbody></table></div></div>'; }
function editBranch() { modal('Yeni Şube', '<div class="fgr mb2"><label>Şube Adı</label><input id="br-name"/></div><div class="fgr mb2"><label>Şube Kodu</label><input id="br-code" placeholder="MRK"/></div>', [{ lbl: 'İptal', cls: 'bs', fn: function(){ closeModal(); } }, { lbl: 'Kaydet', cls: 'bp', fn: async function() { var name = gv('br-name'), code = gv('br-code'); if (!name) { toast('Şube adı zorunlu!', 'e'); return; } var obj = { id: 'br-' + Date.now().toString(36), orgId: currentOrgId, name: name, code: code || name.slice(0, 3).toUpperCase() }; var res = await supaPost('branches', { id: obj.id, org_id: obj.orgId, name: obj.name, code: obj.code }); if(res){ _branchesCache.push(obj); toast('Şube oluşturuldu!', 'g'); closeModal(); go('branches'); } } }]); }
function switchBranch(id) { currentBranchId = id; loadBranchData(true).then(function() { toast('Şube değiştirildi!', 'g'); go('dashboard'); }); }

function pgSports() { return '<div class="ph"><div class="stit">Branşlar</div><div class="ssub">Spor branşları</div></div><div class="flex fjb fca mb3 gap2"><button class="btn bp" onclick="editSport()">+ Yeni Branş</button></div><div class="g2">' + sports.map(function(s) { return '<div class="card"><div class="flex fca gap2"><div style="font-size:32px">' + semi(s.name) + '</div><div><div class="tw6">' + esc(s.name) + '</div><div class="ts tm">' + athletes.filter(function(a) { return a.sp === s.name; }).length + ' sporcu</div></div></div></div>'; }).join('') + '</div>'; }
function editSport() { 
    modal('Yeni Branş', '<div class="fgr mb2"><label>Branş Adı</label><input id="sp-name"/></div><div class="fgr mb2"><label>İkon (emoji)</label><input id="sp-icon" placeholder="&#x26BD;"/></div>', [
        { lbl: 'İptal', cls: 'bs', fn: function(){ closeModal(); } }, 
        { lbl: 'Kaydet', cls: 'bp', fn: async function() { 
            try {
                var name = gv('sp-name'), icon = gv('sp-icon'); 
                if (!name) { toast('Branş adı zorunlu!', 'e'); return; } 
                var obj = { id: uid(), org_id: currentOrgId, branch_id: currentBranchId, name: name, icon: icon }; 
                var res = await dbSaveSport(obj); 
                if(res) { sports.push(obj); toast('Branş eklendi!', 'g'); closeModal(); go('sports'); } 
            } catch (err) { alert("Branş kayıt hatası: " + err); }
        }}
    ]); 
}

function pgClasses() { return '<div class="ph"><div class="stit">Sınıflar</div><div class="ssub">Antrenman grupları</div></div><div class="flex fjb fca mb3 gap2"><button class="btn bp" onclick="editClass()">+ Yeni Sınıf</button></div><div class="card"><div class="tw"><table><thead><tr><th>Sınıf</th><th>Branş</th><th>Antrenör</th><th>Kapasite</th><th>Sporcu</th><th>İşlemler</th></tr></thead><tbody>' + classes.map(function(c) { var sp = sports.find(function(s) { return s.id === c.spId; }); var coach = coaches.find(function(co) { return co.id === c.coachId; }); var count = athletes.filter(function(a) { return a.clsId === c.id; }).length; return '<tr><td class="tw6">' + esc(c.name) + '</td><td>' + (sp ? esc(sp.name) : '-') + '</td><td>' + (coach ? esc(coach.fn + ' ' + coach.ln) : '-') + '</td><td>' + (c.cap || '-') + '</td><td>' + count + '</td><td><button class="btn btn-xs bp" onclick="editClass(\'' + c.id + '\')">Düzenle</button> <button class="btn btn-xs bd" onclick="delClass(\'' + c.id + '\')">Sil</button></td></tr>'; }).join('') + '</tbody></table></div></div>'; }
function editClass(id) { 
    var c = id ? classes.find(function(x) { return x.id === id; }) : null; var isNew = !c; 
    modal(isNew ? 'Yeni Sınıf' : 'Sınıf Düzenle', '<div class="fgr mb2"><label>Sınıf Adı</label><input id="cls-name" value="' + esc(c ? c.name : '') + '"/></div><div class="g21"><div class="fgr"><label>Branş</label><select id="cls-sp">' + sports.map(function(s) { return '<option value="' + esc(s.id) + '"' + (c && c.spId === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></div><div class="fgr"><label>Antrenör</label><select id="cls-coach"><option value="">Seçiniz</option>' + coaches.map(function(co) { return '<option value="' + esc(co.id) + '"' + (c && c.coachId === co.id ? ' selected' : '') + '>' + esc(co.fn + ' ' + co.ln) + '</option>'; }).join('') + '</select></div></div><div class="g21"><div class="fgr"><label>Kapasite</label><input id="cls-cap" type="number" value="' + (c ? c.cap : '20') + '"/></div><div class="fgr"><label>Program</label><input id="cls-sch" value="' + esc(c ? c.schedule : '') + '" placeholder="Pzt-Cmt 18:00-20:00"/></div></div>', [
        { lbl: 'İptal', cls: 'bs', fn: function(){ closeModal(); } }, 
        { lbl: 'Kaydet', cls: 'bp', fn: async function() { 
            try {
                var obj = { id: c ? c.id : uid(), name: gv('cls-name'), spId: gv('cls-sp'), coachId: gv('cls-coach'), cap: gvn('cls-cap'), schedule: gv('cls-sch') }; 
                if (!obj.name) { toast('Sınıf adı zorunlu!', 'e'); return; } 
                var res = await dbSaveClass(obj); 
                if(res) { 
                    if (isNew) classes.push(obj); 
                    else { var idx = classes.findIndex(function(x) { return x.id === obj.id; }); if (idx >= 0) classes[idx] = obj; } 
                    toast('Sınıf kaydedildi!', 'g'); closeModal(); go('classes'); 
                } 
            } catch (err) { alert("Sınıf kayıt hatası: " + err); }
        }}
    ]); 
}
function delClass(id) { confirm2('Sınıf Sil', 'Bu sınıf silinecek. Sporcular sınıfsız kalacak.', async function() { var res = await dbDelClass(id); if(res) { classes = classes.filter(function(x) { return x.id !== id; }); athletes.forEach(function(a) { if (a.clsId === id) a.clsId = ''; }); toast('Sınıf silindi!', 'g'); go('classes'); } }); }

function pgAnnouncements() { return '<div class="ph"><div class="stit">Duyurular</div><div class="ssub">Toplu duyurular</div></div><div class="card"><div class="al al-b mb3">&#x1F4E3; Yeni duyuru için Mesajlar > Yeni Mesaj kullanın.</div><div class="tw6 tsm mb2">Son Duyurular</div>' + messages.filter(function(m) { return m.role === 'admin'; }).slice(0, 10).map(function(m) { return '<div class="att-row"><div><div class="tw6 tsm">' + esc(m.sub) + '</div><div class="ts tm">' + fmtD(m.dt) + '</div></div></div>'; }).join('') + '</div>'; }

function pgSMS() { return '<div class="ph"><div class="stit">SMS Duyuru</div><div class="ssub">Toplu SMS gönderimi</div></div><div class="card mb3"><div class="fgr mb2"><label>Alıcılar</label><select id="sms-to"><option value="all">Tüm Sporcular</option><option value="active">Aktif Sporcular</option><option value="overdue">Gecikmiş Ödemesi Olanlar</option></select></div><div class="fgr mb2"><label>Mesaj</label><textarea id="sms-body" rows="4" placeholder="Mesajınızı yazın..."></textarea></div><button class="btn bp w100" onclick="sendBulkSMSFromUI()">Gönder</button></div><div class="card"><div class="tw6 tsm mb2">SMS Geçmişi</div><p class="tm ts">Gelecek versiyonda eklenecek.</p></div>'; }
async function sendBulkSMSFromUI() { if (!NETGSM_USER) { toast('NetGSM ayarları eksik!', 'e'); return; } var to = gv('sms-to'), body = gv('sms-body'); if (!body) { toast('Mesaj boş!', 'e'); return; } var phones = []; if (to === 'all') athletes.forEach(function(a) { if (a.ph) phones.push(a.ph); }); else if (to === 'active') athletes.filter(function(a) { return a.st === 'active'; }).forEach(function(a) { if (a.ph) phones.push(a.ph); }); else if (to === 'overdue') { var oids = payments.filter(function(p) { return p.st === 'overdue'; }).map(function(p) { return p.aid; }); athletes.filter(function(a) { return oids.indexOf(a.id) >= 0; }).forEach(function(a) { if (a.ph) phones.push(a.ph); }); } if (!phones.length) { toast('Alıcı bulunamadı!', 'e'); return; } showLoading(); var sent = await sendBulkSMS(phones, body); hideLoading(); toast(sent + ' SMS gönderildi!', 'g'); }

function pgPendingOrgs() { if (!currentUser || currentUser.email !== SUPER_ADMIN_EMAIL) return '<div class="card"><div class="al al-r">Yetkisiz erişim!</div></div>'; return '<div class="ph"><div class="stit">Kurum Yönetimi</div><div class="ssub">Bekleyen kurumlar</div></div><div class="card"><div class="tw"><table><thead><tr><th>Kurum</th><th>Durum</th><th>Tarih</th><th>İşlemler</th></tr></thead><tbody>' + _orgsCache.map(function(o) { return '<tr><td class="tw6">' + esc(o.name) + '</td><td><span class="bg ' + (o.status === 'approved' ? 'bg-g' : o.status === 'rejected' ? 'bg-r' : 'bg-y') + '">' + stl(o.status) + '</span></td><td>' + fmtD(o.registered_at) + '</td><td>' + (o.status === 'pending' ? '<button class="btn btn-xs bsu" onclick="approveOrg(\'' + o.id + '\')">Onayla</button> <button class="btn btn-xs bd" onclick="rejectOrg(\'' + o.id + '\')">Reddet</button>' : '-') + '</td></tr>'; }).join('') + '</tbody></table></div></div>'; }
async function approveOrg(id) { await supaPatch('orgs', { status: 'approved' }, { id: id }); var org = _orgsCache.find(function(o) { return o.id === id; }); if (org) org.status = 'approved'; toast('Kurum onaylandı!', 'g'); go('pending-orgs'); }
async function rejectOrg(id) { await supaPatch('orgs', { status: 'rejected' }, { id: id }); var org = _orgsCache.find(function(o) { return o.id === id; }); if (org) org.status = 'rejected'; toast('Kurum reddedildi!', 'y'); go('pending-orgs'); }

function spTab(tab) { document.querySelectorAll('.sp-tab').forEach(function(el) { el.classList.toggle('on', el.textContent.toLowerCase().indexOf(tab) >= 0 || (tab === 'profil' && el.textContent.indexOf('Profil') >= 0) || (tab === 'yoklama' && el.textContent.indexOf('Yoklama') >= 0) || (tab === 'odemeler' && el.textContent.indexOf('Ödemeler') >= 0) || (tab === 'odeme-yap' && el.textContent.indexOf('Ödeme Yap') >= 0) || (tab === 'duyurular' && el.textContent.indexOf('Duyurular') >= 0)); }); var content = document.getElementById('sp-content'); var fns = { 'profil': spProfil, 'yoklama': spYoklama, 'odemeler': spOdemeler, 'odeme-yap': spOdemeYap, 'duyurular': spDuyurular }; 
    try {
        if (fns[tab]) content.innerHTML = fns[tab](); 
    } catch (e) {
        content.innerHTML = '<div style="text-align:center;padding:20px"><div class="al al-r">Ekran yüklenirken hata oluştu.</div><button class="btn bd" onclick="localStorage.clear();window.location.reload();">Önbelleği Temizle ve Onar</button></div>';
    }
}
function spProfil() { var a = currentSporcu; if (!a) return '<div class="card"><div class="al al-r">Sporcu bilgisi bulunamadı!</div></div>'; var rate = attRate(a.id); return '<div class="profile-hero"><div class="flex fca gap3">' + getAvaStr(64) + '<div><div class="tw6" style="font-size:18px">' + esc(a.fn + ' ' + a.ln) + '</div><div class="ts tm">' + esc(a.sp) + ' · ' + esc(a.cat) + '</div></div></div></div><div class="card mb3">' + row('TC Kimlik', a.tc) + row('Doğum Tarihi', fmtD(a.bd)) + row('Cinsiyet', a.gn === 'E' ? 'Erkek' : 'Kadın') + row('Telefon', a.ph) + row('E-posta', a.em || '-') + '</div><div class="card mb3"><div class="tw6 tsm mb2">Devam Oranı</div><div class="pr"><div class="prb prb-' + (rate >= 80 ? 'g' : rate >= 50 ? 'y' : 'r') + '" style="width:' + (rate || 0) + '%"></div></div><div class="flex fjb mt2"><span class="ts tm">Devam Oranı</span><span class="tw6">' + (rate || 0) + '%</span></div></div><div class="card"><div class="tw6 tsm mb2">Veli Bilgileri</div>' + row('Veli Adı', a.pn || '-') + row('Veli Telefon', a.pph || '-') + row('Veli E-posta', a.pem || '-') + '</div>'; }
function spYoklama() { var a = currentSporcu; if (!a) return '<div class="card"><div class="al al-r">Sporcu bilgisi bulunamadı!</div></div>'; var dates = Object.keys(attData).sort().reverse().slice(0, 30); var html = '<div class="card"><div class="tw6 tsm mb2">Son Yoklamalar</div>'; if (!dates.length) html += '<p class="tm ts">Henüz yoklama kaydı yok.</p>'; else { html += dates.map(function(d) { var st = attData[d] && attData[d][a.id]; var status = st === 'P' ? '<span class="bg bg-g">Var</span>' : st === 'A' ? '<span class="bg bg-r">Yok</span>' : st === 'L' ? '<span class="bg bg-y">İzin</span>' : '<span class="bg bg-b">-</span>'; return '<div class="att-row"><span class="ts tm">' + fmtD(d) + '</span>' + status + '</div>'; }).join(''); } html += '</div>'; return html; }
function spOdemeler() { var a = currentSporcu; if (!a) return '<div class="card"><div class="al al-r">Sporcu bilgisi bulunamadı!</div></div>'; var myPayments = payments.filter(function(p) { return p.aid === a.id; }); var html = '<div class="card"><div class="tw6 tsm mb2">Ödemelerim</div>'; if (!myPayments.length) html += '<p class="tm ts">Henüz ödeme kaydı yok.</p>'; else { html += '<div class="tw"><table><thead><tr><th>Tarih</th><th>Açıklama</th><th>Tutar</th><th>Durum</th></tr></thead><tbody>' + myPayments.map(function(p) { return '<tr><td>' + fmtD(p.dt) + '</td><td>' + esc(p.ds) + '</td><td class="tw6">' + fmtN(p.amt) + ' &#x20BA;</td><td><span class="bg ' + stc(p.st) + '">' + stl(p.st) + '</span></td></tr>'; }).join('') + '</tbody></table></div>'; } html += '</div>'; return html; }

function spOdemeYap() { 
  var a = currentSporcu; 
  if (!a) return '<div class="card"><div class="al al-r">Sporcu bilgisi bulunamadı!</div></div>'; 
  var bank = (settings && settings.bankName) ? settings.bankName : 'Banka bilgisi girilmedi';
  var acc = (settings && settings.accountName) ? settings.accountName : 'Hesap sahibi girilmedi';
  var iban = (settings && settings.iban) ? settings.iban : 'TR00 0000 0000 0000 0000 0000 00';
  var html = '<div class="card"><div class="tw6 tsm mb2">Yeni Ödeme / Bildirim</div><div class="fgr mb2"><label>Ödeme Türü</label><select id="sp-pay-ty"><option value="aidat">Aidat</option><option value="kayit">Kayıt Ücreti</option><option value="diger">Diğer</option></select></div><div class="fgr mb2"><label>Tutar (TL)</label><input id="sp-pay-amt" type="number" placeholder="Örn: 1500"/></div><div class="fgr mb2"><label>Açıklama</label><input id="sp-pay-ds" placeholder="Örn: Mart Ayı Aidatı"/></div><div class="fgr mb3"><label>Ödeme Yöntemi</label><select id="sp-pay-method"><option value="havale">Havale / EFT ile Öde</option><option value="kart">Kredi Kartı ile Öde (Simülasyon)</option></select></div><div id="sp-havale-info" class="al al-b mb3"><div class="tw6 tsm mb2" style="font-size:14px;color:var(--text)">Banka Hesap Bilgilerimiz</div><div style="font-size:13px; line-height:1.8; color:var(--text)"><b>Banka:</b> ' + esc(bank) + '<br><b>Alıcı:</b> ' + esc(acc) + '<br><b>IBAN:</b> <span style="letter-spacing:1px; font-weight:700;">' + esc(iban) + '</span></div><div class="mt2 pt2" style="border-top:1px solid rgba(59,130,246,0.2); font-size:11px; color:var(--text2);">⚠️ <b>Not:</b> Lütfen açıklama kısmına <b>' + esc(a.fn + ' ' + a.ln) + '</b> ismini eklemeyi unutmayın.</div></div><div id="sp-cc-info" class="mb3 dn"><div class="al al-y mb3" style="font-size:12px;">🔒 <b>256-Bit SSL:</b> Ödemeniz güvenli altyapı ile çekilecektir.</div><div class="fgr mb2"><label>Kart Üzerindeki İsim</label><input id="cc-name" type="text" placeholder="AD SOYAD"/></div><div class="fgr mb2"><label>Kart Numarası</label><input id="cc-number" type="tel" maxlength="19" placeholder="XXXX XXXX XXXX XXXX" oninput="this.value=this.value.replace(/[^\\d]/g,\'\').replace(/(.{4})/g,\'$1 \').trim()"/></div><div class="g21"><div class="fgr"><label>Son Kul. (Ay/Yıl)</label><input id="cc-exp" type="text" maxlength="5" placeholder="AA/YY" oninput="if(this.value.length==2&&!this.value.includes(\'/\'))this.value+=\'/\';"/></div><div class="fgr"><label>CVV</label><input id="cc-cvv" type="tel" maxlength="3" placeholder="123"/></div></div></div><button id="btn-pay-submit" class="btn bp w100" style="padding:14px; font-size:14px;" onclick="submitSpPayment()">Havale Bildirimi Yap</button></div>'; 
  setTimeout(function() { var sel = document.getElementById('sp-pay-method'); if (sel) { sel.onchange = function() { var isHavale = this.value === 'havale'; document.getElementById('sp-havale-info').classList.toggle('dn', !isHavale); document.getElementById('sp-cc-info').classList.toggle('dn', isHavale); document.getElementById('btn-pay-submit').textContent = isHavale ? 'Havale Bildirimi Yap' : 'Güvenli Ödeme Yap'; }; } }, 50); return html; 
}
async function submitSpPayment() { 
  try {
      var a = currentSporcu; if (!a) return; 
      var ty = gv('sp-pay-ty'), amt = gvn('sp-pay-amt'), ds = gv('sp-pay-ds'), method = gv('sp-pay-method'); 
      if (!amt) { toast('Tutar zorunlu!', 'e'); return; } 
      if (method === 'kart') {
          var cn = gv('cc-name'), cnum = gv('cc-number'), cexp = gv('cc-exp'), ccvv = gv('cc-cvv');
          if(!cn || !cnum || !cexp || !ccvv) { toast('Lütfen kart bilgilerini eksiksiz girin!', 'e'); return; }
          if(cnum.length < 15) { toast('Geçersiz kart numarası!', 'e'); return; }
          showLoading(); await new Promise(function(resolve) { setTimeout(resolve, 1500); }); hideLoading(); toast('Ödeme Başarılı!', 'g');
      } else { toast('Ödeme bildirimi gönderildi! Onay bekleniyor.', 'g'); }
      var obj = { id: uid(), aid: a.id, an: a.fn + ' ' + a.ln, amt: amt, dt: tod(), ty: 'income', cat: ty, ds: ds || ty, st: method === 'kart' ? 'completed' : 'pending', inv: '', dd: '', payMethod: method, needsApproval: method !== 'kart' }; 
      var res = await dbSavePay(obj); if(res){ payments.push(obj); spTab('odemeler'); } 
  } catch(err) { console.error(err); alert("Ödeme işleminde hata!"); }
}

function spDuyurular() { var html = '<div class="card"><div class="tw6 tsm mb2">Duyurular</div>'; var announcements = messages.filter(function(m) { return m.role === 'admin'; }); if (!announcements.length) html += '<p class="tm ts">Henüz duyuru yok.</p>'; else { html += announcements.map(function(m) { return '<div class="att-row"><div><div class="tw6 tsm">' + esc(m.sub) + '</div><div class="ts tm">' + fmtD(m.dt) + '</div><div class="ts" style="margin-top:4px">' + esc(m.body.slice(0, 100)) + (m.body.length > 100 ? '...' : '') + '</div></div></div>'; }).join(''); } html += '</div>'; return html; }

document.addEventListener('DOMContentLoaded', function() { console.log('Sporcu Paneli Yüklendi - Hata Koruyucu Sürüm'); });
