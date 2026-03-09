// ═══════════════════════════════════════════════════════════
// HATA DÜZELTMELERİ V5 — script.js'den SONRA yüklenir
//
// KVKK/Kullanım Şartları EN ÜSTTE tanımlanır (hiçbir async
// kod çalışmadan önce). Böylece DB hatası olsa bile çalışır.
// ═══════════════════════════════════════════════════════════

console.log('script-fixes.js yukleniyor...');

// ────────────────────────────────────────────────────────
// 1) KVKK ve KULLANIM ŞARTLARI — EN ÜSTTE, SENKRON
// ────────────────────────────────────────────────────────
window.showLegal = function(type) {
    var kvkkBody = '<div style="line-height:1.8;color:var(--text2);max-height:60vh;overflow-y:auto;padding-right:8px">'
        + '<h2 style="color:var(--text);font-size:16px;font-weight:700;margin:0 0 12px">Dragos Futbol Akademisi – Ki\u015Fisel Verilerin Korunmas\u0131 ve \u0130\u015Flenmesi Hakk\u0131nda Ayd\u0131nlatma Metni</h2>'
        + '<p style="margin-bottom:10px;font-size:13px">Dragos Futbol Akademisi olarak, ki\u015Fisel verilerinizin g\u00FCvenli\u011Fi ve gizlili\u011Fi bizim i\u00E7in \u00F6nemlidir. Bu ayd\u0131nlatma metni, taraf\u0131m\u0131za iletilen ki\u015Fisel verilerin hangi ama\u00E7larla i\u015Flendi\u011Fi ve korunmas\u0131na ili\u015Fkin usul ve esaslar\u0131 a\u00E7\u0131klamak amac\u0131yla haz\u0131rlanm\u0131\u015Ft\u0131r.</p>'
        + '<p style="font-size:14px;font-weight:600;color:var(--text);margin:14px 0 6px">1. Veri Sorumlusu</p>'
        + '<p style="margin-bottom:10px;font-size:13px">6698 say\u0131l\u0131 Ki\u015Fisel Verilerin Korunmas\u0131 Kanunu (\"KVKK\") kapsam\u0131nda veri sorumlusu Dragos Futbol Akademisi\'dir.</p>'
        + '<p style="font-size:14px;font-weight:600;color:var(--text);margin:14px 0 6px">2. \u0130\u015Flenen Ki\u015Fisel Veriler</p>'
        + '<p style="margin-bottom:6px;font-size:13px">Web sitemiz, kay\u0131t formlar\u0131 veya ileti\u015Fim kanallar\u0131 arac\u0131l\u0131\u011F\u0131yla a\u015Fa\u011F\u0131daki ki\u015Fisel veriler i\u015Flenebilir:</p>'
        + '<ul style="margin:6px 0 12px 20px;font-size:13px"><li>Ad ve soyad</li><li>Telefon numaras\u0131</li><li>E-posta adresi</li><li>Veli bilgileri</li><li>Sporcu bilgileri</li><li>Do\u011Fum tarihi</li><li>\u0130leti\u015Fim mesajlar\u0131</li><li>IP adresi ve site kullan\u0131m bilgileri</li></ul>'
        + '<p style="font-size:14px;font-weight:600;color:var(--text);margin:14px 0 6px">3. Ki\u015Fisel Verilerin \u0130\u015Flenme Ama\u00E7lar\u0131</p>'
        + '<p style="margin-bottom:6px;font-size:13px">Toplanan ki\u015Fisel veriler a\u015Fa\u011F\u0131daki ama\u00E7larla i\u015Flenebilir:</p>'
        + '<ul style="margin:6px 0 12px 20px;font-size:13px"><li>Futbol okulu kay\u0131t i\u015Flemlerinin ger\u00E7ekle\u015Ftirilmesi</li><li>Sporcu ve veli ileti\u015Fiminin sa\u011Flanmas\u0131</li><li>Antrenman, etkinlik ve organizasyon bilgilendirmeleri</li><li>Hizmet kalitesinin art\u0131r\u0131lmas\u0131</li><li>Yasal y\u00FCk\u00FCml\u00FCl\u00FCklerin yerine getirilmesi</li><li>Web sitesi kullan\u0131m\u0131n\u0131n geli\u015Ftirilmesi</li></ul>'
        + '<p style="font-size:14px;font-weight:600;color:var(--text);margin:14px 0 6px">4. Verilerin Aktar\u0131lmas\u0131</p>'
        + '<p style="margin-bottom:6px;font-size:13px">Ki\u015Fisel verileriniz;</p>'
        + '<ul style="margin:6px 0 12px 20px;font-size:13px"><li>Yasal y\u00FCk\u00FCml\u00FCl\u00FCkler kapsam\u0131nda yetkili kamu kurumlar\u0131na</li><li>Teknik altyap\u0131 sa\u011Flay\u0131c\u0131lar\u0131na</li><li>Hukuki zorunluluk bulunan durumlarda ilgili kurumlara</li></ul>'
        + '<p style="margin-bottom:10px;font-size:13px">aktar\u0131labilir.</p>'
        + '<p style="font-size:14px;font-weight:600;color:var(--text);margin:14px 0 6px">5. Verilerin Saklanma S\u00FCresi</p>'
        + '<p style="margin-bottom:10px;font-size:13px">Ki\u015Fisel veriler, i\u015Flenme amac\u0131 ortadan kalkana kadar veya yasal saklama s\u00FCresi boyunca muhafaza edilir.</p>'
        + '<p style="font-size:14px;font-weight:600;color:var(--text);margin:14px 0 6px">6. KVKK Kapsam\u0131ndaki Haklar\u0131n\u0131z</p>'
        + '<p style="margin-bottom:6px;font-size:13px">KVKK\'n\u0131n 11. maddesi kapsam\u0131nda a\u015Fa\u011F\u0131daki haklara sahipsiniz:</p>'
        + '<ul style="margin:6px 0 12px 20px;font-size:13px"><li>Ki\u015Fisel verilerinizin i\u015Flenip i\u015Flenmedi\u011Fini \u00F6\u011Frenme</li><li>\u0130\u015Flenmi\u015Fse bilgi talep etme</li><li>Amac\u0131na uygun kullan\u0131l\u0131p kullan\u0131lmad\u0131\u011F\u0131n\u0131 \u00F6\u011Frenme</li><li>Eksik veya yanl\u0131\u015F i\u015Flenmi\u015Fse d\u00FCzeltilmesini isteme</li><li>Kanuna uygun olarak silinmesini veya yok edilmesini talep etme</li></ul>'
        + '<p style="margin-bottom:10px;font-size:13px">Bu haklar\u0131n\u0131z\u0131 kullanmak i\u00E7in web sitemizde yer alan ileti\u015Fim bilgileri \u00FCzerinden Dragos Futbol Akademisi ile ileti\u015Fime ge\u00E7ebilirsiniz.</p>'
        + '</div>';

    var kullanimBody = '<div style="line-height:1.8;color:var(--text2);max-height:60vh;overflow-y:auto;padding-right:8px">'
        + '<h2 style="color:var(--text);font-size:16px;font-weight:700;margin:0 0 12px">Kullan\u0131m \u015Eartlar\u0131</h2>'
        + '<p style="margin-bottom:10px;font-size:13px">Bu web sitesini ziyaret eden t\u00FCm kullan\u0131c\u0131lar a\u015Fa\u011F\u0131daki kullan\u0131m \u015Fartlar\u0131n\u0131 kabul etmi\u015F say\u0131l\u0131r.</p>'
        + '<p style="font-size:14px;font-weight:600;color:var(--text);margin:14px 0 6px">1. Genel H\u00FCk\u00FCmler</p>'
        + '<p style="margin-bottom:10px;font-size:13px">Dragos Futbol Akademisi web sitesi, futbol e\u011Fitimi faaliyetleri hakk\u0131nda bilgilendirme yapmak amac\u0131yla haz\u0131rlanm\u0131\u015Ft\u0131r.</p>'
        + '<p style="font-size:14px;font-weight:600;color:var(--text);margin:14px 0 6px">2. \u0130\u00E7erik Kullan\u0131m\u0131</p>'
        + '<p style="margin-bottom:6px;font-size:13px">Web sitesinde yer alan:</p>'
        + '<ul style="margin:6px 0 12px 20px;font-size:13px"><li>Metinler</li><li>G\u00F6rseller</li><li>Logolar</li><li>Videolar</li><li>Tasar\u0131mlar</li></ul>'
        + '<p style="margin-bottom:10px;font-size:13px">Dragos Futbol Akademisi\'ne aittir ve izinsiz kopyalanamaz, \u00E7o\u011Falt\u0131lamaz veya ticari ama\u00E7la kullan\u0131lamaz.</p>'
        + '<p style="font-size:14px;font-weight:600;color:var(--text);margin:14px 0 6px">3. Kullan\u0131c\u0131 Sorumluluklar\u0131</p>'
        + '<p style="margin-bottom:6px;font-size:13px">Kullan\u0131c\u0131lar web sitesini kullan\u0131rken:</p>'
        + '<ul style="margin:6px 0 12px 20px;font-size:13px"><li>Yasalara uygun davranmay\u0131</li><li>Yan\u0131lt\u0131c\u0131 veya zarar verici i\u015Flem yapmamay\u0131</li><li>Site altyap\u0131s\u0131na zarar vermemeyi</li></ul>'
        + '<p style="margin-bottom:10px;font-size:13px">kabul eder.</p>'
        + '<p style="font-size:14px;font-weight:600;color:var(--text);margin:14px 0 6px">4. Bilgilendirme \u0130\u00E7eri\u011Fi</p>'
        + '<p style="margin-bottom:10px;font-size:13px">Web sitesinde yer alan bilgiler bilgilendirme ama\u00E7l\u0131d\u0131r. Dragos Futbol Akademisi gerekli g\u00F6rd\u00FC\u011F\u00FC durumlarda i\u00E7erikleri de\u011Fi\u015Ftirme hakk\u0131n\u0131 sakl\u0131 tutar.</p>'
        + '<p style="font-size:14px;font-weight:600;color:var(--text);margin:14px 0 6px">5. D\u0131\u015F Ba\u011Flant\u0131lar</p>'
        + '<p style="margin-bottom:10px;font-size:13px">Web sitesi \u00FC\u00E7\u00FCnc\u00FC taraf sitelere ba\u011Flant\u0131lar i\u00E7erebilir. Bu sitelerin i\u00E7eriklerinden Dragos Futbol Akademisi sorumlu de\u011Fildir.</p>'
        + '<p style="font-size:14px;font-weight:600;color:var(--text);margin:14px 0 6px">6. De\u011Fi\u015Fiklik Hakk\u0131</p>'
        + '<p style="margin-bottom:10px;font-size:13px">Dragos Futbol Akademisi, kullan\u0131m \u015Fartlar\u0131n\u0131 \u00F6nceden bildirim yapmaks\u0131z\u0131n de\u011Fi\u015Ftirme hakk\u0131na sahiptir.</p>'
        + '<p style="font-size:14px;font-weight:600;color:var(--text);margin:14px 0 6px">7. Y\u00FCr\u00FCrl\u00FCk</p>'
        + '<p style="margin-bottom:10px;font-size:13px">Bu kullan\u0131m \u015Fartlar\u0131 web sitesine eri\u015Fim sa\u011Fland\u0131\u011F\u0131 anda y\u00FCr\u00FCrl\u00FC\u011Fe girer.</p>'
        + '</div>';

    if (type === 'kvkk') {
        modal('KVKK Ayd\u0131nlatma Metni', kvkkBody, [{ lbl: 'Kapat', cls: 'bs', fn: closeModal }]);
    } else if (type === 'kullanim') {
        modal('Kullan\u0131m \u015Eartlar\u0131', kullanimBody, [{ lbl: 'Kapat', cls: 'bs', fn: closeModal }]);
    }
};

console.log('KVKK/Kullanim showLegal tanimlandi');


// ────────────────────────────────────────────────────────
// 2) ÖN KAYIT BUTONU — Yönetici modunda gizle
// ────────────────────────────────────────────────────────
var __origSwitchTab = window.switchLoginTab;
window.switchLoginTab = function(tab) {
    if (__origSwitchTab) __origSwitchTab(tab);
    var btn = document.getElementById('on-kayit-btn');
    if (btn) {
        var adm = document.getElementById('login-admin');
        btn.style.display = (adm && !adm.classList.contains('dn')) ? 'none' : 'block';
    }
};
setTimeout(function() {
    if (window.location.href.includes('admin')) {
        var btn = document.getElementById('on-kayit-btn');
        if (btn) btn.style.display = 'none';
    }
}, 100);


// ────────────────────────────────────────────────────────
// 3) loadOnKayitlar — Global function, tablo yoksa sessiz
// ────────────────────────────────────────────────────────
async function loadOnKayitlar() {
    try {
        var sb = getSupabase();
        if (!sb) return;
        var bid = AppState.currentBranchId;
        var oid = AppState.currentOrgId;
        if (!bid && !oid) return;

        var data = null, error = null;

        if (bid) {
            var r1 = await sb.from('on_kayitlar').select('*').eq('branch_id', bid).order('created_at', { ascending: false });
            data = r1.data; error = r1.error;
        }
        if ((!data || data.length === 0) && oid) {
            var r2 = await sb.from('on_kayitlar').select('*').eq('org_id', oid).order('created_at', { ascending: false });
            data = r2.data; error = r2.error;
        }
        if ((!data || data.length === 0) && !error) {
            var r3 = await sb.from('on_kayitlar').select('*').order('created_at', { ascending: false }).limit(100);
            data = r3.data; error = r3.error;
        }

        // Tablo yoksa sessizce çık (hata verme)
        if (error) {
            if (error.message && error.message.includes('on_kayitlar')) {
                console.warn('on_kayitlar tablosu bulunamadi — Supabase\'de olusturun.');
            } else {
                console.warn('loadOnKayitlar hata:', error);
            }
            if (!AppState.data.onKayitlar) AppState.data.onKayitlar = [];
            return;
        }

        if (data) {
            AppState.data.onKayitlar = data.map(function(r) {
                return {
                    id: r.id,
                    studentName: r.student_name || ((r.fn || '') + ' ' + (r.ln || '')).trim(),
                    fn: r.fn || (r.student_name ? r.student_name.split(' ')[0] : '') || '',
                    ln: r.ln || (r.student_name ? r.student_name.split(' ').slice(1).join(' ') : '') || '',
                    bd: r.bd || r.birth_date || '',
                    tc: r.tc || '',
                    clsId: r.cls_id || '',
                    className: r.class_name || '',
                    parentName: r.parent_name || '',
                    parentPhone: r.parent_phone || '',
                    status: r.status || 'new',
                    createdAt: r.created_at || '',
                    orgId: r.org_id || '',
                    branchId: r.branch_id || ''
                };
            });
            var nc = AppState.data.onKayitlar.filter(function(o) { return o.status === 'new'; }).length;
            var badge = document.getElementById('onkayit-badge');
            if (badge) {
                if (nc > 0) { badge.textContent = nc; badge.classList.remove('dn'); }
                else { badge.classList.add('dn'); }
            }
        }
    } catch (e) {
        console.warn('loadOnKayitlar exception:', e);
        if (!AppState.data.onKayitlar) AppState.data.onKayitlar = [];
    }
}


// ────────────────────────────────────────────────────────
// 4) go() MONKEY-PATCH — athletes sayfası özel render
// ────────────────────────────────────────────────────────
var __origGo = window.go;

window.go = function(page, params) {
    if (page !== 'athletes') return __origGo.call(window, page, params);

    AppState.ui.curPage = page;
    var main = document.getElementById('main');
    if (!main) return;
    main.style.opacity = '0';
    setTimeout(function() {
        main.innerHTML = __renderAthletes();
        main.style.opacity = '1';
    }, 100);
    document.querySelectorAll('.ni').forEach(function(el) { el.classList.toggle('on', el.id === 'ni-athletes'); });
    document.querySelectorAll('.bni-btn').forEach(function(el) { el.classList.toggle('on', el.id === 'bn-athletes'); });
    closeSide();
};


// ────────────────────────────────────────────────────────
// 5) ATHLETES RENDER — admin + coach ön kayıt görebilir
// ────────────────────────────────────────────────────────
function __renderAthletes() {
    var list = AppState.data.athletes.slice();
    var f = AppState.filters.athletes;
    if (f.sp) list = list.filter(function(a) { return a.sp === f.sp; });
    if (f.st) list = list.filter(function(a) { return a.st === f.st; });
    if (f.cls) list = list.filter(function(a) { return a.clsId === f.cls; });
    if (f.q) { var q = f.q.toLowerCase(); list = list.filter(function(a) { return (a.fn + ' ' + a.ln).toLowerCase().includes(q) || a.tc.includes(q); }); }

    var isAdmin = AppState.currentUser && AppState.currentUser.role === 'admin';
    var isCoach = AppState.currentUser && AppState.currentUser.role === 'coach';
    var onKayitlar = AppState.data.onKayitlar || [];
    var pendingCount = onKayitlar.filter(function(o) { return o.status === 'new'; }).length;

    // Ön Kayıt Bölümü
    var okSec = '';
    if (isAdmin || isCoach) {
        var inner = '';
        if (onKayitlar.length === 0) {
            inner = '<div style="text-align:center;padding:20px;color:var(--text3)"><div style="font-size:32px;margin-bottom:8px">&#x1F4CB;</div><div class="ts">Hen\u00FCz \u00F6n kay\u0131t ba\u015Fvurusu yok.</div><button class="btn btn-sm bs mt2" onclick="refreshOnKayitlar()">Tekrar Kontrol Et</button></div>';
        } else {
            var rows = '';
            onKayitlar.forEach(function(ok) {
                var ad = ((ok.fn || '') + ' ' + (ok.ln || '')).trim() || ok.studentName || '-';
                var sty = ok.status === 'new' ? 'background:rgba(234,179,8,.07)' : 'opacity:.65';
                var bdg = ok.status === 'new' ? '<span class="bg bg-y">&#x23F3; Bekliyor</span>' : '<span class="bg bg-g">&#x2705; \u0130\u015Flendi</span>';
                var btns = '';
                if (ok.status === 'new') btns += '<button class="btn btn-xs bp" onclick="convertOnKayit(\'' + ok.id + '\')">Kay\u0131t A\u00E7</button> ';
                if (isAdmin) btns += '<button class="btn btn-xs bd" onclick="delOnKayit(\'' + ok.id + '\')">Sil</button>';
                rows += '<tr style="' + sty + '"><td class="ts">' + (ok.createdAt ? DateUtils.format(ok.createdAt) : '-') + '</td><td class="tw6">' + FormatUtils.escape(ad) + '</td><td class="ts">' + FormatUtils.escape(ok.tc || '-') + '</td><td class="ts">' + (ok.bd ? DateUtils.format(ok.bd) : '-') + '</td><td>' + FormatUtils.escape(ok.className || '-') + '</td><td class="ts">' + FormatUtils.escape(ok.parentName || '-') + '<br><small style="color:var(--text2)">' + FormatUtils.escape(ok.parentPhone || '') + '</small></td><td>' + bdg + '</td><td>' + btns + '</td></tr>';
            });
            inner = '<div class="tw" style="overflow-x:auto"><table><thead><tr><th>Tarih</th><th>Ad Soyad</th><th>TC</th><th>Do\u011Fum</th><th>S\u0131n\u0131f Talebi</th><th>Veli / Telefon</th><th>Durum</th><th>\u0130\u015Flemler</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
        }
        var pBadge = pendingCount > 0 ? '<span style="background:var(--yellow);color:#000;border-radius:10px;padding:1px 8px;font-size:11px;font-weight:800;margin-left:6px">' + pendingCount + ' Yeni</span>' : '';
        okSec = '<div class="card mb3" style="border-left:4px solid var(--yellow)"><div class="flex fjb fca mb3"><div class="tw6 tsm">&#x1F4DD; \u00D6n Kay\u0131t Ba\u015Fvurular\u0131 ' + pBadge + '</div><button class="btn btn-sm bs" onclick="refreshOnKayitlar()">&#x21BB; Yenile</button></div>' + inner + '</div>';
    }

    var spOpts = AppState.data.sports.map(function(s) { return '<option value="' + FormatUtils.escape(s.name) + '"' + (f.sp === s.name ? ' selected' : '') + '>' + FormatUtils.escape(s.name) + '</option>'; }).join('');
    var clOpts = AppState.data.classes.map(function(c) { return '<option value="' + FormatUtils.escape(c.id) + '"' + (f.cls === c.id ? ' selected' : '') + '>' + FormatUtils.escape(c.name) + '</option>'; }).join('');

    var trows = list.map(function(a) {
        var del = isAdmin ? '<button class="btn btn-xs bd" onclick="delAth(\'' + a.id + '\')">Sil</button>' : '';
        return '<tr><td><div class="flex fca gap2">' + UIUtils.getAvatar(36, null, FormatUtils.initials(a.fn, a.ln)) + '<div><div class="tw6">' + FormatUtils.escape(a.fn) + ' ' + FormatUtils.escape(a.ln) + '</div><div class="ts tm">' + DateUtils.age(a.bd) + ' ya\u015F</div></div></div></td><td>' + FormatUtils.escape(a.tc) + '</td><td>' + sportEmoji(a.sp) + ' ' + FormatUtils.escape(a.sp) + '</td><td>' + FormatUtils.escape(className(a.clsId)) + '</td><td><span class="bg ' + statusClass(a.st) + '">' + statusLabel(a.st) + '</span></td><td><button class="btn btn-xs bp" onclick="go(\'athleteProfile\',{id:\'' + a.id + '\'})">Profil</button> <button class="btn btn-xs bs" onclick="editAth(\'' + a.id + '\')">D\u00FCzenle</button> ' + del + '</td></tr>';
    }).join('');

    var addBtn = isAdmin ? '<button class="btn bp" onclick="editAth()">+ Yeni Sporcu</button>' : '<div></div>';
    var expBtn = isAdmin ? '<div class="flex gap2"><button class="btn bsu" onclick="importAthletesFromExcel()">&#x1F4CA; Excel\'den \u0130\u00E7e Aktar</button><button class="btn bs" onclick="exportAthletes()">&#x1F4E4; Excel \u0130ndir</button></div>' : '';

    return '<div class="ph"><div class="stit" data-i18n="menuAth">Sporcular</div></div>' + okSec
        + '<div class="flex fjb fca mb3 fwrap gap2"><div class="flex gap2 fwrap"><select class="fs" onchange="AppState.filters.athletes.sp=this.value;go(\'athletes\')"><option value="">T\u00FCm Bran\u015Flar</option>' + spOpts + '</select><select class="fs" onchange="AppState.filters.athletes.st=this.value;go(\'athletes\')"><option value="">T\u00FCm Durumlar</option><option value="active"' + (f.st === 'active' ? ' selected' : '') + '>Aktif</option><option value="inactive"' + (f.st === 'inactive' ? ' selected' : '') + '>Pasif</option></select><select class="fs" onchange="AppState.filters.athletes.cls=this.value;go(\'athletes\')"><option value="">T\u00FCm S\u0131n\u0131flar</option>' + clOpts + '</select></div><input class="fs" type="text" placeholder="&#x1F50D; \u0130sim veya TC Ara..." style="max-width:250px" value="' + FormatUtils.escape(f.q) + '" onchange="AppState.filters.athletes.q=this.value;go(\'athletes\')"/></div>'
        + '<div class="flex fjb fca mb3 gap2">' + addBtn + expBtn + '</div>'
        + '<div class="card"><div class="tw"><table><thead><tr><th>Ad Soyad</th><th>TC</th><th>Bran\u015F</th><th>S\u0131n\u0131f</th><th>Durum</th><th>\u0130\u015Flemler</th></tr></thead><tbody>' + trows + '</tbody></table></div></div>';
}


// ────────────────────────────────────────────────────────
// 6) refreshOnKayitlar
// ────────────────────────────────────────────────────────
window.refreshOnKayitlar = async function() {
    var btn = null;
    try { if (typeof event !== 'undefined' && event && event.target) btn = event.target; } catch(e) {}
    if (btn) { btn.textContent = '...'; btn.disabled = true; }
    await loadOnKayitlar();
    if (btn) { btn.textContent = '\u21BB Yenile'; btn.disabled = false; }
    if (AppState.ui && AppState.ui.curPage === 'athletes') go('athletes');
    else if (AppState.ui && AppState.ui.curPage === 'settings') __origGo.call(window, 'settings');
};


// ────────────────────────────────────────────────────────
// 7) convertOnKayit
// ────────────────────────────────────────────────────────
window.convertOnKayit = function(id) {
    var ok = (AppState.data.onKayitlar || []).find(function(x) { return x.id === id; });
    if (!ok) return;
    closeModal();
    var cls = AppState.data.classes.find(function(c) { return c.id === ok.clsId || c.name === ok.className; });
    editAth(null, { fn: ok.fn || '', ln: ok.ln || '', tc: ok.tc || '', bd: ok.bd || '', pn: ok.parentName || '', pph: ok.parentPhone || '', clsId: cls ? cls.id : (ok.clsId || ''), sp: '' });
    setTimeout(async function() {
        try {
            var sb = getSupabase();
            if (sb) await sb.from('on_kayitlar').update({ status: 'done' }).eq('id', id);
            var idx = (AppState.data.onKayitlar || []).findIndex(function(x) { return x.id === id; });
            if (idx >= 0) AppState.data.onKayitlar[idx].status = 'done';
        } catch(e) { console.warn('convertOnKayit error:', e); }
    }, 500);
};


// ────────────────────────────────────────────────────────
// 8) showOnKayitForm
// ────────────────────────────────────────────────────────
window.showOnKayitForm = async function() {
    var classes = AppState.data.classes || [];
    var fOrg = AppState.currentOrgId || '';
    var fBranch = AppState.currentBranchId || '';

    if (classes.length === 0) {
        try { var sb = getSupabase(); if (sb) { var r = await sb.from('classes').select('*').limit(50); if (r.data && r.data.length) { classes = r.data.map(DB.mappers.toClass); if (!fOrg) fOrg = r.data[0].org_id || ''; if (!fBranch) fBranch = r.data[0].branch_id || ''; } } } catch(e) {}
    }
    if (!fOrg && !fBranch) {
        try { var sb2 = getSupabase(); if (sb2) { var r2 = await sb2.from('settings').select('org_id, branch_id').limit(1); if (r2.data && r2.data.length) { fOrg = r2.data[0].org_id || ''; fBranch = r2.data[0].branch_id || ''; } } } catch(e) {}
    }
    if (!fOrg && !fBranch) {
        try { var sb3 = getSupabase(); if (sb3) { var r3 = await sb3.from('athletes').select('org_id, branch_id').limit(1); if (r3.data && r3.data.length) { fOrg = r3.data[0].org_id || ''; fBranch = r3.data[0].branch_id || ''; } } } catch(e) {}
    }

    var opts = classes.map(function(c) { return '<option value="' + FormatUtils.escape(c.id) + '" data-name="' + FormatUtils.escape(c.name) + '">' + FormatUtils.escape(c.name) + '</option>'; }).join('');

    var h = '<div id="onkayit-modal" style="position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:2000;padding:16px;"><input type="hidden" id="ok-org-id" value="' + fOrg + '"/><input type="hidden" id="ok-branch-id" value="' + fBranch + '"/><div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;width:100%;max-width:520px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;"><div style="padding:20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:18px;font-weight:800">&#x1F4DD; \u00D6n Kay\u0131t Formu</div><div style="font-size:12px;color:var(--text2)">Bilgilerinizi eksiksiz doldurunuz</div></div><button onclick="document.getElementById(\'onkayit-modal\').remove()" style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:6px;cursor:pointer;color:var(--text)">&#x2715;</button></div><div style="padding:20px;overflow-y:auto;flex:1"><div style="background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.3);border-radius:8px;padding:12px;font-size:13px;color:var(--blue2);margin-bottom:16px">&#x2139;&#xFE0F; \u00D6n kay\u0131t talebiniz y\u00F6neticimize iletilecektir.</div><div class="tw6 tsm mb2">\u00D6\u011Frenci Bilgileri</div><div class="g21 mb2"><div class="fgr"><label>Ad *</label><input id="ok-fn" placeholder="Ad\u0131"/></div><div class="fgr"><label>Soyad *</label><input id="ok-ln" placeholder="Soyad\u0131"/></div></div><div class="g21 mb2"><div class="fgr"><label>Do\u011Fum Tarihi *</label><input id="ok-bd" type="date"/></div><div class="fgr"><label>TC Kimlik No</label><input id="ok-tc" type="text" inputmode="numeric" maxlength="11" placeholder="11 Haneli TC"/></div></div><div class="fgr mb2"><label>Kay\u0131t Olmak \u0130stedi\u011Fi S\u0131n\u0131f *</label><select id="ok-cls"><option value="">S\u0131n\u0131f Se\u00E7iniz</option>' + opts + '</select></div><div class="dv"></div><div class="tw6 tsm mb2">Veli Bilgileri</div><div class="g21 mb2"><div class="fgr"><label>Veli Ad\u0131 *</label><input id="ok-pn" placeholder="Ad\u0131 Soyad\u0131"/></div><div class="fgr"><label>Veli Soyad\u0131</label><input id="ok-psn" placeholder="Soyad\u0131"/></div></div><div class="fgr mb2"><label>Veli Telefon *</label><input id="ok-pph" type="tel" placeholder="05XX XXX XX XX"/></div></div><div style="padding:16px;border-top:1px solid var(--border);display:flex;gap:12px;justify-content:flex-end;background:var(--bg3);border-radius:0 0 16px 16px"><button class="btn bs" onclick="document.getElementById(\'onkayit-modal\').remove()">\u0130ptal</button><button class="btn bp" onclick="submitOnKayit()">\u00D6n Kay\u0131t Yap</button></div></div></div>';

    document.body.insertAdjacentHTML('beforeend', h);
    setTimeout(function() { setupTCInput('ok-tc'); }, 100);
};


// ────────────────────────────────────────────────────────
// 9) submitOnKayit
// ────────────────────────────────────────────────────────
window.submitOnKayit = async function() {
    var fn = ((document.getElementById('ok-fn') || {}).value || '').trim();
    var ln = ((document.getElementById('ok-ln') || {}).value || '').trim();
    var bd = (document.getElementById('ok-bd') || {}).value || '';
    var tc = ((document.getElementById('ok-tc') || {}).value || '').replace(/\D/g, '');
    var clsEl = document.getElementById('ok-cls');
    var clsId = clsEl ? clsEl.value : '';
    var clsName = '';
    if (clsEl && clsEl.selectedIndex >= 0) { var opt = clsEl.options[clsEl.selectedIndex]; clsName = (opt && opt.dataset && opt.dataset.name) || (opt ? opt.textContent : '') || ''; }
    var pn = ((document.getElementById('ok-pn') || {}).value || '').trim();
    var psn = ((document.getElementById('ok-psn') || {}).value || '').trim();
    var pph = ((document.getElementById('ok-pph') || {}).value || '').trim();

    if (!fn || !ln || !bd || !clsId || !pn || !pph) { toast('L\u00FCtfen zorunlu alanlar\u0131 doldurunuz!', 'e'); return; }

    var rOrg = AppState.currentOrgId || (document.getElementById('ok-org-id') || {}).value || '';
    var rBranch = AppState.currentBranchId || (document.getElementById('ok-branch-id') || {}).value || '';
    if (!rOrg && !rBranch) { toast('Kurum bilgisi al\u0131namad\u0131. Sayfay\u0131 yenileyip tekrar deneyin.', 'e'); return; }

    var id = generateId();
    var sName = fn + ' ' + ln;
    var pName = psn ? (pn + ' ' + psn) : pn;
    var dt = DateUtils.today();
    var ok = false;

    try {
        var sb = getSupabase();
        if (sb) {
            var res = await sb.from('on_kayitlar').insert({
                id: id, student_name: sName, fn: fn, ln: ln, bd: bd || null, tc: tc || null,
                cls_id: clsId || null, class_name: clsName, parent_name: pName, parent_phone: pph,
                status: 'new', created_at: dt, org_id: rOrg, branch_id: rBranch
            }).select();
            if (res.error) {
                console.error('on_kayitlar insert error:', res.error);
                // Tablo yoksa kullanıcıya anlamlı mesaj
                if (res.error.message && res.error.message.includes('on_kayitlar')) {
                    toast('Hata: on_kayitlar tablosu Supabase\'de bulunamad\u0131. Y\u00F6neticiye ba\u015Fvurun.', 'e');
                } else {
                    toast('Hata: ' + (res.error.message || ''), 'e');
                }
            } else {
                ok = true;
            }
        }
    } catch(e) { console.error('submitOnKayit exception:', e); }

    if (!AppState.data.onKayitlar) AppState.data.onKayitlar = [];
    AppState.data.onKayitlar.unshift({ id: id, studentName: sName, fn: fn, ln: ln, bd: bd, tc: tc, clsId: clsId, className: clsName, parentName: pName, parentPhone: pph, status: 'new', createdAt: dt, orgId: rOrg, branchId: rBranch });

    var nc = AppState.data.onKayitlar.filter(function(o) { return o.status === 'new'; }).length;
    var badge = document.getElementById('onkayit-badge');
    if (badge) { badge.textContent = nc; if (nc > 0) badge.classList.remove('dn'); }

    try { await sendOnKayitSms(pph, fn, ln, clsName); } catch(e) {}
    var m = document.getElementById('onkayit-modal'); if (m) m.remove();
    toast(ok ? '\u2705 \u00D6n kay\u0131t ba\u015Far\u0131yla al\u0131nd\u0131!' : '\u26A0 Sunucuya g\u00F6nderilemedi.', ok ? 'g' : 'e');
};


console.log('\u2705 Script-fixes V5 yuklendi');
