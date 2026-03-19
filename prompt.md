# Geliştirme Görevi — Dragos Futbol Akademisi

## 10 Özellik — Tek Prompt

### KRİTİK KURAL

**`script.js` dosyasına kesinlikle dokunma.** Tüm değişiklikler `script-fixes.js` ve `index.html` dosyalarına yapılacak. `script-fixes.js` zaten `pgAccountingV8`, `editPay`, `__renderAthletes` gibi override’lar ile aynı pattern’i kullanıyor — yeni eklemeler de aynı şekilde yapılacak.

### ÖNEMLİ TEKNİK NOTLAR

- `go()` sayfaları `main.innerHTML = pages[page]()` ile render ediyor. `innerHTML` ile eklenen `<script>` tagları tarayıcı tarafından çalıştırılmaz. Chart ve Calendar başlatma kodu `registerGoHook('after', ...)` ile yapılacak.
- `script-fixes.js` en sona ekleme yapıldığında `script.js`’teki tüm fonksiyonlar zaten tanımlı olduğundan `typeof` kontrolüne gerek yok.
- `generateReceipt`, `printProfile` zaten çalışıyor — dokunma.
- `buildBarChart`, `buildDonutChart` SVG fonksiyonları korunuyor — Chart.js bunların yanına ekleniyor.

-----

## GELİŞTİRME 1 — Sporcu Listesine Canlı Arama

**Dosya:** `script-fixes.js`

**Bul:** `__renderAthletes` fonksiyonu içindeki arama input’u. İçinde `onchange` geçen şu kısım:

```
onchange=\"AppState.filters.athletes.q=this.value;go(\\'athletes\\')\"
```

`onchange` kelimesini `oninput` ile değiştir. Başka hiçbir şeye dokunma.

**Neden güvenli:** Sadece event tipi değişiyor. Filtre altyapısı aynen çalışıyor.

-----

## GELİŞTİRME 2 — Yoklama Geçmişi Görünümü

**Dosya:** `script-fixes.js`

`script-fixes.js`‘in en sonuna (tüm kodun altına) şu override’ı ekle:

```javascript
// ── YOKLAMA GEÇMİŞİ OVERRIDE ──────────────────────────────
var _origPgAttendance = typeof pgAttendance === 'function' ? pgAttendance : null;
window.pgAttendanceV2 = function() {
    var base = _origPgAttendance ? _origPgAttendance() : '';

    var atcls = AppState.ui.atcls || '';
    var allDates = Object.keys(AppState.data.attendance).filter(function(d) {
        var dayData = AppState.data.attendance[d];
        var list = AppState.data.athletes.filter(function(a) {
            return a.st === 'active' && (!atcls || a.clsId === atcls);
        });
        return list.some(function(a) { return dayData[a.id]; });
    }).sort().reverse().slice(0, 10);

    var historyHtml = '<div class="card mt3">'
        + '<div class="tw6 tsm mb2">📅 Son 10 Günlük Geçmiş</div>'
        + (allDates.length === 0
            ? '<p class="tm ts" style="text-align:center;padding:16px">Henüz kayıtlı yoklama yok.</p>'
            : allDates.map(function(d) {
                var dayData = AppState.data.attendance[d];
                var list = AppState.data.athletes.filter(function(a) {
                    return a.st === 'active' && (!atcls || a.clsId === atcls);
                });
                var p = list.filter(function(a) { return dayData[a.id] === 'P'; }).length;
                var ab = list.filter(function(a) { return dayData[a.id] === 'A'; }).length;
                var ex = list.filter(function(a) { return dayData[a.id] === 'E'; }).length;
                var total = list.length;
                var rate = total > 0 ? Math.round((p / total) * 100) : 0;
                return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">'
                    + '<div style="min-width:90px;font-size:13px;color:var(--text2)">' + (typeof DateUtils !== 'undefined' ? DateUtils.format(d) : d) + '</div>'
                    + '<div style="flex:1;height:8px;background:var(--bg3);border-radius:4px;overflow:hidden">'
                    + '<div style="width:' + rate + '%;height:100%;background:var(--green);border-radius:4px"></div></div>'
                    + '<div style="font-size:12px;min-width:120px;text-align:right">'
                    + '<span style="color:var(--green)">✅' + p + '</span> '
                    + '<span style="color:var(--red)">❌' + ab + '</span> '
                    + '<span style="color:var(--yellow)">🔵' + ex + '</span> '
                    + '<span style="color:var(--text3);margin-left:4px">%' + rate + '</span></div></div>';
            }).join(''))
        + '</div>';

    return base + historyHtml;
};

// go() pages objesini güncelle
window.registerGoHook('before', function(page) {
    if (page === 'attendance' && typeof window.pgAttendanceV2 === 'function') {
        var orig = window.go;
        // pages objesi go() içinde local tanımlı, hook ile müdahale edemeyiz
        // Bunun yerine after hook ile DOM'a ekle
    }
});

window.registerGoHook('after', function(page) {
    if (page === 'attendance' && typeof window.pgAttendanceV2 === 'function') {
        var main = document.getElementById('main');
        if (!main) return;
        // Geçmiş bloğu zaten render edildi mi?
        if (main.querySelector('.mt3')) return;
        var atcls = AppState.ui.atcls || '';
        var allDates = Object.keys(AppState.data.attendance).filter(function(d) {
            var dayData = AppState.data.attendance[d];
            var list = AppState.data.athletes.filter(function(a) {
                return a.st === 'active' && (!atcls || a.clsId === atcls);
            });
            return list.some(function(a) { return dayData[a.id]; });
        }).sort().reverse().slice(0, 10);

        if (allDates.length === 0) return;

        var div = document.createElement('div');
        div.className = 'card mt3';
        div.innerHTML = '<div class="tw6 tsm mb2">📅 Son 10 Günlük Geçmiş</div>'
            + allDates.map(function(d) {
                var dayData = AppState.data.attendance[d];
                var list = AppState.data.athletes.filter(function(a) {
                    return a.st === 'active' && (!atcls || a.clsId === atcls);
                });
                var p = list.filter(function(a) { return dayData[a.id] === 'P'; }).length;
                var ab = list.filter(function(a) { return dayData[a.id] === 'A'; }).length;
                var ex = list.filter(function(a) { return dayData[a.id] === 'E'; }).length;
                var total = list.length;
                var rate = total > 0 ? Math.round((p / total) * 100) : 0;
                return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">'
                    + '<div style="min-width:90px;font-size:13px;color:var(--text2)">' + DateUtils.format(d) + '</div>'
                    + '<div style="flex:1;height:8px;background:var(--bg3);border-radius:4px;overflow:hidden">'
                    + '<div style="width:' + rate + '%;height:100%;background:var(--green);border-radius:4px"></div></div>'
                    + '<div style="font-size:12px;min-width:120px;text-align:right">'
                    + '<span style="color:var(--green)">✅' + p + '</span> '
                    + '<span style="color:var(--red)">❌' + ab + '</span> '
                    + '<span style="color:var(--yellow)">🔵' + ex + '</span> '
                    + '<span style="color:var(--text3);margin-left:4px">%' + rate + '</span></div></div>';
            }).join('');
        main.appendChild(div);
    }
});
```

**Neden güvenli:** `registerGoHook('after', ...)` DOM’a yazıldıktan sonra tetiklenir. `appendChild` ile ekler — mevcut içeriğe dokunmaz. `script.js`’e hiç dokunulmaz.

-----

## GELİŞTİRME 3 — Finans Raporuna Tarih Filtresi

**Dosya:** `script-fixes.js`

**Bul:** `pgAccountingV8` fonksiyonunu. Fonksiyonun en başına (`var now = new Date();` satırından önce) şu satırları ekle:

```javascript
if (!AppState.ui.accFilter) AppState.ui.accFilter = 'month';
var accFilter = AppState.ui.accFilter;
```

`getBranchIncomeDistribution` ve `getExpenseCategoryDistribution` çağrılarından önce, fonksiyonun içine şu yardımcı fonksiyonu ekle:

```javascript
function isInPeriod(dateStr) {
    if (!dateStr) return false;
    if (accFilter === 'all') return true;
    var d = new Date(dateStr);
    var now2 = new Date();
    if (accFilter === 'month') return d.getFullYear() === now2.getFullYear() && d.getMonth() === now2.getMonth();
    if (accFilter === 'quarter') { var q = new Date(now2); q.setMonth(q.getMonth() - 3); return d >= q; }
    if (accFilter === 'year') return d.getFullYear() === now2.getFullYear();
    return true;
}
```

`pgAccountingV8`‘in return ettiği HTML string’inin **en başına** (kasa kartlarından önce) şu filtre barını ekle:

```javascript
'<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">'
+ '<span class="tw6 tsm">Dönem:</span>'
+ '<button class="btn btn-sm ' + (accFilter==='month'?'bp':'bs') + '" onclick="AppState.ui.accFilter=\'month\';go(\'accounting\')">Bu Ay</button>'
+ '<button class="btn btn-sm ' + (accFilter==='quarter'?'bp':'bs') + '" onclick="AppState.ui.accFilter=\'quarter\';go(\'accounting\')">Son 3 Ay</button>'
+ '<button class="btn btn-sm ' + (accFilter==='year'?'bp':'bs') + '" onclick="AppState.ui.accFilter=\'year\';go(\'accounting\')">Bu Yıl</button>'
+ '<button class="btn btn-sm ' + (accFilter==='all'?'bp':'bs') + '" onclick="AppState.ui.accFilter=\'all\';go(\'accounting\')">Tümü</button>'
+ '</div>'
```

`getBranchIncomeDistribution` ve `getExpenseCategoryDistribution` fonksiyonlarının içindeki `.filter` zincirlerine `.filter(function(p){ return isInPeriod(p.dt); })` ekle — sadece bu iki fonksiyon içinde, başka yerde değil.

**Neden güvenli:** `AppState.ui` dinamik property kabul eder. `pgAccountingV8` zaten `go('accounting')` ile yenileniyor. `script.js`’e dokunulmaz.

-----

## GELİŞTİRME 4 — Dashboard Dinamik Özet

**Dosya:** `script-fixes.js`

`script-fixes.js`‘in en sonuna şu override’ı ekle:

```javascript
// ── DASHBOARD OVERRIDE ─────────────────────────────────────
var _origPgDashboard = typeof pgDashboard === 'function' ? pgDashboard : null;

window.pgDashboardV2 = function() {
    // Antrenör paneli
    var isCoach = AppState.currentUser && AppState.currentUser.role === 'coach';
    if (isCoach) {
        var coachRecord = AppState.data.coaches.find(function(c) { return c.id === AppState.currentUser.id; })
            || AppState.data.coaches.find(function(c) { return AppState.currentUser.tc && c.tc === AppState.currentUser.tc; })
            || null;
        var myClassIds = AppState.data.classes.filter(function(c) { return coachRecord && c.coachId === coachRecord.id; }).map(function(c) { return c.id; });
        var myAthletes = AppState.data.athletes.filter(function(a) { return a.st === 'active' && myClassIds.indexOf(a.clsId) > -1; });
        var todayAtt = AppState.data.attendance[DateUtils.today()] || {};
        var presentToday = myAthletes.filter(function(a) { return todayAtt[a.id] === 'P'; }).length;
        var absentToday  = myAthletes.filter(function(a) { return todayAtt[a.id] === 'A'; }).length;
        var notEntered   = myAthletes.filter(function(a) { return !todayAtt[a.id]; }).length;
        var lowAtt = myAthletes.filter(function(a) {
            var stats = getAttendanceStats(a.id);
            return stats.total > 5 && stats.rate < 50;
        });
        var myClasses = AppState.data.classes.filter(function(c) { return coachRecord && c.coachId === coachRecord.id; });

        return '<div class="ph"><div class="stit">🏃 Antrenör Paneli</div></div>'
            + '<div class="g3 mb3">'
            + '<div class="card stat-card stat-g"><div class="stat-icon">👥</div><div class="stat-val">' + myAthletes.length + '</div><div class="stat-lbl">Gruptaki Sporcu</div></div>'
            + '<div class="card stat-card stat-b"><div class="stat-icon">✅</div><div class="stat-val">' + presentToday + '</div><div class="stat-lbl">Bugün Gelen</div></div>'
            + '<div class="card stat-card stat-r"><div class="stat-icon">❌</div><div class="stat-val">' + absentToday + '</div><div class="stat-lbl">Bugün Gelmedi</div></div>'
            + '</div>'
            + (notEntered > 0 ? '<div class="al al-y mb3">⚠️ ' + notEntered + ' sporcu için yoklama girilmedi. <button class="btn btn-sm bp" onclick="go(\'attendance\')" style="margin-left:8px">Yoklamaya Git →</button></div>' : '')
            + (lowAtt.length > 0
                ? '<div class="card mb3" style="border-left:4px solid var(--red)"><div class="tw6 tsm mb2">⚠️ Devamsızlık Riski (%50 altı)</div>'
                    + lowAtt.map(function(a) {
                        var stats = getAttendanceStats(a.id);
                        return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">'
                            + '<span class="tw6 tsm">' + FormatUtils.escape(a.fn + ' ' + a.ln) + '</span>'
                            + '<span class="badge badge-red">%' + stats.rate + ' devam</span></div>';
                    }).join('')
                    + '</div>'
                : '<div class="al al-g mb3">✅ Tüm sporcular düzenli devam ediyor.</div>')
            + '<div class="card"><div class="tw6 tsm mb2">📋 Grubum</div>'
            + myClasses.map(function(cls) {
                var cnt = AppState.data.athletes.filter(function(a) { return a.clsId === cls.id && a.st === 'active'; }).length;
                return '<div class="ts mb1">🏫 ' + FormatUtils.escape(cls.name) + ' — ' + cnt + ' sporcu</div>';
            }).join('')
            + '</div>';
    }

    // Yönetici paneli — orijinal + özet
    var base = _origPgDashboard ? _origPgDashboard() : '';
    var todayStr = DateUtils.today();
    var attToday = AppState.data.attendance[todayStr] || {};
    var activeAthletes = AppState.data.athletes.filter(function(a) { return a.st === 'active'; });
    var todayPresent = activeAthletes.filter(function(a) { return attToday[a.id] === 'P'; }).length;
    var todayAbsent  = activeAthletes.filter(function(a) { return attToday[a.id] === 'A'; }).length;
    var attEntered   = activeAthletes.filter(function(a) { return attToday[a.id]; }).length;
    var overdueList  = AppState.data.payments.filter(function(p) { return p.st === 'overdue'; });
    var overdueNames = overdueList.slice(0, 3).map(function(p) {
        var a = AppState.data.athletes.find(function(x) { return x.id === p.aid; });
        return a ? a.fn + ' ' + a.ln : null;
    }).filter(Boolean);
    var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    var newThisWeek = AppState.data.athletes.filter(function(a) { return a.rd && new Date(a.rd) >= weekAgo; }).length;

    var ozet = '<div class="card mb3" style="border-left:4px solid var(--blue2)">'
        + '<div class="tw6 tsm mb3">📋 Bugünün Özeti — ' + DateUtils.format(todayStr) + '</div>'
        + '<div class="g3" style="margin-bottom:12px">'
        + '<div style="text-align:center;padding:12px;background:var(--bg3);border-radius:10px"><div style="font-size:22px;font-weight:800;color:var(--green)">' + todayPresent + '</div><div style="font-size:12px;color:var(--text2)">Bugün Var</div></div>'
        + '<div style="text-align:center;padding:12px;background:var(--bg3);border-radius:10px"><div style="font-size:22px;font-weight:800;color:var(--red)">' + todayAbsent + '</div><div style="font-size:12px;color:var(--text2)">Bugün Yok</div></div>'
        + '<div style="text-align:center;padding:12px;background:var(--bg3);border-radius:10px"><div style="font-size:22px;font-weight:800;color:var(--blue2)">' + attEntered + '/' + activeAthletes.length + '</div><div style="font-size:12px;color:var(--text2)">Girilen</div></div>'
        + '</div>'
        + (attEntered === 0 ? '<div class="al al-y" style="font-size:13px">⚠️ Bugün henüz yoklama girilmedi.</div>' : '')
        + (overdueList.length > 0 ? '<div class="al al-r mt2" style="font-size:13px">🔴 ' + overdueList.length + ' gecikmiş ödeme — ' + overdueNames.join(', ') + (overdueNames.length < overdueList.length ? ' ve diğerleri' : '') + '</div>' : '')
        + (newThisWeek > 0 ? '<div class="al al-g mt2" style="font-size:13px">🆕 Bu hafta ' + newThisWeek + ' yeni sporcu kaydı.</div>' : '')
        + '</div>';

    // Otomatik uyarılar
    var alerts = buildAutoAlerts ? buildAutoAlerts() : [];
    var alertHtml = alerts.length > 0
        ? '<div class="card mb3"><div class="tw6 tsm mb2">🔔 Otomatik Uyarılar</div>'
            + alerts.map(function(a) {
                return '<div class="al al-' + (a.type==='danger'?'r':a.type==='warning'?'y':'b') + ' mb2" style="cursor:pointer;display:flex;align-items:center;gap:8px" onclick="' + a.action + '">'
                    + '<span>' + a.icon + '</span><span style="flex:1;font-size:13px">' + FormatUtils.escape(a.msg) + '</span><span style="font-size:11px;color:var(--text3)">→</span></div>';
            }).join('')
            + '</div>'
        : '';

    // Özeti ve uyarıları orijinal dashboard'un başına ekle
    // "ph" div'inden sonra, stat kartlarından önce
    return base.replace('<div class="g4 mb3">', ozet + alertHtml + '<div class="g4 mb3">');
};

// go() pages tablosuna bağla
window.registerGoHook('before', function(page, params) {
    if (page === 'dashboard') {
        if (typeof window.pgDashboardV2 === 'function') {
            var origGo = window.go;
            // pages objesi go() içinde local — doğrudan override edemeyiz
            // after hook ile ekstra içerik ekleyeceğiz
        }
    }
});
```

**Bunun yerine** `registerGoHook('after', ...)` ile dashboard render edildikten sonra özet kartı DOM’a ekle:

```javascript
// ── DASHBOARD AFTER HOOK — Özet Kartı ──────────────────────
window.registerGoHook('after', function(page) {
    if (page !== 'dashboard') return;
    if (AppState.currentUser && AppState.currentUser.role === 'coach') return; // Antrenör için farklı

    var main = document.getElementById('main');
    if (!main) return;
    if (main.querySelector('#dash-ozet')) return; // Zaten eklendi

    var todayStr = DateUtils.today();
    var attToday = AppState.data.attendance[todayStr] || {};
    var activeAthletes = AppState.data.athletes.filter(function(a) { return a.st === 'active'; });
    var todayPresent = activeAthletes.filter(function(a) { return attToday[a.id] === 'P'; }).length;
    var todayAbsent  = activeAthletes.filter(function(a) { return attToday[a.id] === 'A'; }).length;
    var attEntered   = activeAthletes.filter(function(a) { return attToday[a.id]; }).length;
    var overdueList  = AppState.data.payments.filter(function(p) { return p.st === 'overdue'; });
    var overdueNames = overdueList.slice(0, 3).map(function(p) {
        var a = AppState.data.athletes.find(function(x) { return x.id === p.aid; });
        return a ? a.fn + ' ' + a.ln : null;
    }).filter(Boolean);
    var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    var newThisWeek = AppState.data.athletes.filter(function(a) { return a.rd && new Date(a.rd) >= weekAgo; }).length;

    var div = document.createElement('div');
    div.id = 'dash-ozet';
    div.className = 'card mb3';
    div.style.borderLeft = '4px solid var(--blue2)';
    div.innerHTML = '<div class="tw6 tsm mb3">📋 Bugünün Özeti — ' + DateUtils.format(todayStr) + '</div>'
        + '<div class="g3" style="margin-bottom:12px">'
        + '<div style="text-align:center;padding:12px;background:var(--bg3);border-radius:10px"><div style="font-size:22px;font-weight:800;color:var(--green)">' + todayPresent + '</div><div style="font-size:12px;color:var(--text2)">Bugün Var</div></div>'
        + '<div style="text-align:center;padding:12px;background:var(--bg3);border-radius:10px"><div style="font-size:22px;font-weight:800;color:var(--red)">' + todayAbsent + '</div><div style="font-size:12px;color:var(--text2)">Bugün Yok</div></div>'
        + '<div style="text-align:center;padding:12px;background:var(--bg3);border-radius:10px"><div style="font-size:22px;font-weight:800;color:var(--blue2)">' + attEntered + '/' + activeAthletes.length + '</div><div style="font-size:12px;color:var(--text2)">Girilen</div></div>'
        + '</div>'
        + (attEntered === 0 ? '<div class="al al-y" style="font-size:13px">⚠️ Bugün henüz yoklama girilmedi.</div>' : '')
        + (overdueList.length > 0 ? '<div class="al al-r mt2" style="font-size:13px">🔴 ' + overdueList.length + ' gecikmiş ödeme — ' + overdueNames.join(', ') + (overdueNames.length < overdueList.length ? ' ve diğerleri' : '') + '</div>' : '')
        + (newThisWeek > 0 ? '<div class="al al-g mt2" style="font-size:13px">🆕 Bu hafta ' + newThisWeek + ' yeni sporcu kaydı.</div>' : '');

    // Stat kartlarından (g4 mb3) önce ekle
    var statGrid = main.querySelector('.g4.mb3');
    if (statGrid) {
        main.insertBefore(div, statGrid);
    } else {
        var ph = main.querySelector('.ph');
        if (ph && ph.nextSibling) main.insertBefore(div, ph.nextSibling);
        else main.appendChild(div);
    }
});

// ── ANTRENÖR DASHBOARD AFTER HOOK ──────────────────────────
window.registerGoHook('after', function(page) {
    if (page !== 'dashboard') return;
    if (!AppState.currentUser || AppState.currentUser.role !== 'coach') return;

    var main = document.getElementById('main');
    if (!main || main.querySelector('#coach-panel')) return;

    var coachRecord = AppState.data.coaches.find(function(c) { return c.id === AppState.currentUser.id; })
        || AppState.data.coaches.find(function(c) { return AppState.currentUser.tc && c.tc === AppState.currentUser.tc; })
        || null;
    var myClassIds = AppState.data.classes.filter(function(c) { return coachRecord && c.coachId === coachRecord.id; }).map(function(c) { return c.id; });
    var myAthletes = AppState.data.athletes.filter(function(a) { return a.st === 'active' && myClassIds.indexOf(a.clsId) > -1; });
    var todayAtt = AppState.data.attendance[DateUtils.today()] || {};
    var presentToday = myAthletes.filter(function(a) { return todayAtt[a.id] === 'P'; }).length;
    var absentToday  = myAthletes.filter(function(a) { return todayAtt[a.id] === 'A'; }).length;
    var notEntered   = myAthletes.filter(function(a) { return !todayAtt[a.id]; }).length;
    var lowAtt = myAthletes.filter(function(a) {
        var stats = getAttendanceStats(a.id);
        return stats.total > 5 && stats.rate < 50;
    });
    var myClasses = AppState.data.classes.filter(function(c) { return coachRecord && c.coachId === coachRecord.id; });

    main.innerHTML = '<div class="ph"><div class="stit">🏃 Antrenör Paneli</div></div>'
        + '<div class="g3 mb3" id="coach-panel">'
        + '<div class="card stat-card stat-g"><div class="stat-icon">👥</div><div class="stat-val">' + myAthletes.length + '</div><div class="stat-lbl">Gruptaki Sporcu</div></div>'
        + '<div class="card stat-card stat-b"><div class="stat-icon">✅</div><div class="stat-val">' + presentToday + '</div><div class="stat-lbl">Bugün Gelen</div></div>'
        + '<div class="card stat-card stat-r"><div class="stat-icon">❌</div><div class="stat-val">' + absentToday + '</div><div class="stat-lbl">Bugün Gelmedi</div></div>'
        + '</div>'
        + (notEntered > 0 ? '<div class="al al-y mb3">⚠️ ' + notEntered + ' sporcu için yoklama girilmedi. <button class="btn btn-sm bp" onclick="go(\'attendance\')" style="margin-left:8px">Yoklamaya Git →</button></div>' : '')
        + (lowAtt.length > 0
            ? '<div class="card mb3" style="border-left:4px solid var(--red)"><div class="tw6 tsm mb2">⚠️ Devamsızlık Riski</div>'
                + lowAtt.map(function(a) { var s = getAttendanceStats(a.id); return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span class="tw6 tsm">' + FormatUtils.escape(a.fn + ' ' + a.ln) + '</span><span class="badge badge-red">%' + s.rate + '</span></div>'; }).join('')
                + '</div>'
            : '<div class="al al-g mb3">✅ Tüm sporcular düzenli devam ediyor.</div>')
        + '<div class="card"><div class="tw6 tsm mb2">📋 Grubum</div>'
        + myClasses.map(function(cls) { var cnt = AppState.data.athletes.filter(function(a) { return a.clsId === cls.id && a.st === 'active'; }).length; return '<div class="ts mb1">🏫 ' + FormatUtils.escape(cls.name) + ' — ' + cnt + ' sporcu</div>'; }).join('')
        + '</div>';
});
```

-----

## GELİŞTİRME 5 — Otomatik Bildirim Kuralları

**Dosya:** `script-fixes.js`

En sona şu fonksiyonu ekle:

```javascript
// ── OTOMATİK UYARILAR ──────────────────────────────────────
function buildAutoAlerts() {
    var alerts = [];
    var today = DateUtils.today();

    var dueTodayList = AppState.data.payments.filter(function(p) {
        return (p.st === 'pending' || p.st === 'overdue') && p.dt === today;
    });
    if (dueTodayList.length > 0) {
        alerts.push({ type: 'warning', icon: '📅', msg: 'Bugün vadesi gelen ' + dueTodayList.length + ' ödeme var.', action: "go('payments')" });
    }

    var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    var weekAgoStr = weekAgo.toISOString().split('T')[0];
    var recentDates = Object.keys(AppState.data.attendance).filter(function(d) { return d >= weekAgoStr; });
    var noAttClasses = AppState.data.classes.filter(function(cls) {
        return !recentDates.some(function(d) {
            return Object.keys(AppState.data.attendance[d] || {}).some(function(aid) {
                var a = AppState.data.athletes.find(function(x) { return x.id === aid; });
                return a && a.clsId === cls.id;
            });
        });
    });
    if (noAttClasses.length > 0) {
        alerts.push({ type: 'info', icon: '📋', msg: noAttClasses.map(function(c) { return c.name; }).join(', ') + ' grubunda 7+ gündür yoklama girilmedi.', action: "go('attendance')" });
    }

    var riskAthletes = AppState.data.athletes.filter(function(a) {
        if (a.st !== 'active') return false;
        var stats = getAttendanceStats(a.id);
        return stats.total > 5 && stats.rate < 30;
    });
    if (riskAthletes.length > 0) {
        alerts.push({ type: 'danger', icon: '⚠️', msg: riskAthletes.length + ' sporcu %30 altında devam oranıyla risk altında.', action: "go('athletes')" });
    }

    AppState.data.autoAlerts = alerts;
    if (typeof refreshNotifBadges === 'function') refreshNotifBadges();
    return alerts;
}
window.buildAutoAlerts = buildAutoAlerts;
```

Geliştirme 4’teki dashboard `after` hook’u içinde `buildAutoAlerts()` çağrısı zaten var — ayrıca bir şey ekleme.

`loadBranchData` tamamlandıktan sonra `buildAutoAlerts` çalışsın. `script-fixes.js` en sonuna şunu ekle:

```javascript
window.registerGoHook('after', function(page) {
    if (page === 'dashboard' && AppState.currentUser && AppState.currentUser.role === 'admin') {
        if (typeof buildAutoAlerts === 'function') buildAutoAlerts();
    }
});
```

-----

## GELİŞTİRME 6 — Veli Portalına Antrenör İletişim Kartı

**Dosya:** `script-fixes.js`

`script-fixes.js`‘in en sonuna şu after hook’u ekle:

```javascript
// ── VELİ PROFİL — ANTRENÖR İLETİŞİM KARTI ─────────────────
window.registerGoHook('after', function(page) {
    if (page !== 'dashboard' && page !== 'athleteProfile') return;
    // Sporcu portalı için sp-content'e bak
    var spContent = document.getElementById('sp-content');
    if (!spContent || spContent.querySelector('#coach-contact-card')) return;

    var a = AppState.currentSporcu;
    if (!a) return;
    var cls = AppState.data.classes.find(function(c) { return c.id === a.clsId; });
    var coach = cls ? AppState.data.coaches.find(function(c) { return c.id === cls.coachId; }) : null;
    if (!coach || !coach.ph) return;

    var card = document.createElement('div');
    card.id = 'coach-contact-card';
    card.className = 'info-card';
    card.innerHTML = '<div class="info-card-title">📞 Antrenörümle İletişim</div>'
        + '<div class="info-row"><span class="info-label">Antrenör</span><span class="info-value tw6">' + FormatUtils.escape(coach.fn + ' ' + coach.ln) + '</span></div>'
        + (coach.ph ? '<div class="info-row"><span class="info-label">Telefon</span><a href="tel:' + FormatUtils.escape(coach.ph) + '" class="info-value tb">' + FormatUtils.escape(coach.ph) + '</a></div>' : '')
        + (coach.ph ? '<div class="mt2"><a href="https://wa.me/90' + coach.ph.replace(/\D/g,'').slice(-10) + '" target="_blank" rel="noopener" class="btn w100" style="background:#25d366;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;text-decoration:none">💬 WhatsApp ile Yaz</a></div>' : '');

    var sidebar = spContent.querySelector('.profile-sidebar');
    if (sidebar) sidebar.appendChild(card);
});
```

**Neden güvenli:** `AppState.currentSporcu` null kontrolü var. `coach.ph` null ise kart gösterilmez. `querySelector('#coach-contact-card')` ile iki kez eklenmesi önlenir.

-----

## GELİŞTİRME 7 — Aktif / Pasif Sporcu Sekme Ayrımı

**Dosya:** `script-fixes.js`

**Bul:** `__renderAthletes` fonksiyonunu. Fonksiyonun en başına şu satırları ekle:

```javascript
if (f.st === undefined || f.st === null || f.st === '') {
    f.st = 'active';
    AppState.filters.athletes.st = 'active';
}
var totalActive   = AppState.data.athletes.filter(function(a){ return a.st === 'active'; }).length;
var totalInactive = AppState.data.athletes.filter(function(a){ return a.st === 'inactive'; }).length;
var currentTab    = f.st;
```

Return edilen HTML string’inin başındaki `<div class="ph">...</div>` bloğunun hemen arkasına (filtre satırından önce) şu sekme barını ekle:

```javascript
+ '<div style="display:flex;gap:0;margin-bottom:16px;border-bottom:2px solid var(--border)">'
+ '<button onclick="AppState.filters.athletes.st=\'active\';go(\'athletes\')" style="padding:10px 20px;border:none;background:none;cursor:pointer;font-weight:700;font-size:14px;border-bottom:' + (currentTab==='active'?'3px solid var(--blue2);color:var(--blue2)':'3px solid transparent;color:var(--text2)') + ';margin-bottom:-2px">✅ Aktif <span style="background:var(--green);color:#fff;border-radius:10px;padding:1px 8px;font-size:11px;margin-left:4px">' + totalActive + '</span></button>'
+ '<button onclick="AppState.filters.athletes.st=\'inactive\';go(\'athletes\')" style="padding:10px 20px;border:none;background:none;cursor:pointer;font-weight:700;font-size:14px;border-bottom:' + (currentTab==='inactive'?'3px solid var(--blue2);color:var(--blue2)':'3px solid transparent;color:var(--text2)') + ';margin-bottom:-2px">📦 Pasif <span style="background:var(--text3);color:#fff;border-radius:10px;padding:1px 8px;font-size:11px;margin-left:4px">' + totalInactive + '</span></button>'
+ '<button onclick="AppState.filters.athletes.st=\'\';go(\'athletes\')" style="padding:10px 20px;border:none;background:none;cursor:pointer;font-weight:700;font-size:14px;border-bottom:' + (currentTab===\'\'?\'3px solid var(--blue2);color:var(--blue2)':\'3px solid transparent;color:var(--text2)\') + \';margin-bottom:-2px\">👥 Tümü</button>'
+ '</div>'
```

**Ardından** filtre satırındaki durum `<select>` dropdown’ını bul — içinde `Tüm Durumlar`, `Aktif`, `Pasif` geçen `<select>` bloğu. Bu bloğu string’den çıkar. `onchange="AppState.filters.athletes.st=` ile başlayıp `</select>'` ile biten kısım.

-----

## GELİŞTİRME 8 — Chart.js Entegrasyonu

### Adım 1: CDN

**Dosya:** `index.html`

Module scriptlerden önce:

```html
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js" crossorigin="anonymous"></script>
```

### Adım 2: Fonksiyonlar ve Hook

**Dosya:** `script-fixes.js` — en sona ekle:

```javascript
// ── CHART.JS ───────────────────────────────────────────────
function initDashboardChart() {
    if (!window.Chart) { setTimeout(initDashboardChart, 300); return; }
    var ctx = document.getElementById('dash-chart');
    if (!ctx) return;
    if (ctx._ci) { ctx._ci.destroy(); }
    var months = [], incomes = [], expenses = [];
    for (var i = 5; i >= 0; i--) {
        var d = new Date(); d.setMonth(d.getMonth() - i);
        var ym = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
        months.push(['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'][d.getMonth()]);
        var inc = 0, exp = 0;
        AppState.data.payments.forEach(function(p) {
            if (p.st==='completed' && p.dt && p.dt.startsWith(ym)) { if(p.ty==='income') inc+=(p.amt||0); else exp+=(p.amt||0); }
        });
        incomes.push(inc); expenses.push(exp);
    }
    ctx._ci = new Chart(ctx, {
        type: 'line',
        data: { labels: months, datasets: [
            { label: 'Gelir', data: incomes, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', tension: 0.4, fill: true },
            { label: 'Gider', data: expenses, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', tension: 0.4, fill: true }
        ]},
        options: { responsive: true,
            plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
            scales: {
                x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(148,163,184,0.1)' } },
                y: { ticks: { color: '#94a3b8', font: { size: 10 }, callback: function(v){ return '₺'+(v>=1000?(v/1000).toFixed(0)+'K':v); } }, grid: { color: 'rgba(148,163,184,0.1)' } }
            }
        }
    });
}

function initBranchChart() {
    if (!window.Chart) { setTimeout(initBranchChart, 300); return; }
    var ctx = document.getElementById('branch-chart');
    if (!ctx) return;
    if (ctx._ci) { ctx._ci.destroy(); }
    var bd = typeof getBranchIncomeDistribution === 'function' ? getBranchIncomeDistribution() : [];
    if (!bd.length) return;
    ctx._ci = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: bd.map(function(d){return d.name;}), datasets: [{ data: bd.map(function(d){return d.value;}), backgroundColor: ['#3b82f6','#22c55e','#ef4444','#eab308','#f97316','#a855f7'], borderWidth: 0 }] },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, padding: 12 } }, tooltip: { callbacks: { label: function(c){ return c.label+': ₺'+Number(c.raw).toLocaleString('tr-TR'); } } } }, cutout: '60%' }
    });
}

window.registerGoHook('after', function(page) {
    if (page === 'dashboard') setTimeout(initDashboardChart, 150);
    if (page === 'accounting') setTimeout(initBranchChart, 150);
});
```

### Adım 3: Canvas’ları HTML’e ekle

**Dosya:** `script-fixes.js`

`pgAccountingV8` içindeki branş dağılımı satırını bul:

```javascript
+ '<div class="card"><div class="tw6 tsm mb3">⚽ Branş Bazlı Gelir Dağılımı</div>' + buildDonutChart(branchDist, 200, 'Toplam Gelir') + '</div>'
```

Şununla değiştir:

```javascript
+ '<div class="card"><div class="tw6 tsm mb3">⚽ Branş Bazlı Gelir Dağılımı</div><canvas id="branch-chart" height="180"></canvas></div>'
```

Dashboard’daki `dash-chart` canvas’ı için: `registerGoHook('after')` içinde dashboard render sonrası DOM’a canvas ekle:

```javascript
window.registerGoHook('after', function(page) {
    if (page === 'dashboard') {
        var main = document.getElementById('main');
        if (!main) return;
        // Gelir/Gider kartını bul ve canvas ekle
        var cards = main.querySelectorAll('.card');
        cards.forEach(function(card) {
            if (card.textContent.indexOf('Gelir/Gider') > -1 && !card.querySelector('canvas')) {
                card.innerHTML = '<div class="tw6 tsm mb2">📈 Son 6 Ay Gelir/Gider</div><canvas id="dash-chart" height="120"></canvas>';
                setTimeout(initDashboardChart, 150);
            }
        });
    }
    if (page === 'accounting') setTimeout(initBranchChart, 150);
});
```

**NOT:** Yukarıdaki `registerGoHook` çağrısını Geliştirme 2’deki yoklama hook’u ile **birleştir** — tek bir `registerGoHook('after', function(page){...})` içinde tüm sayfaları yönet.

-----

## GELİŞTİRME 9 — FullCalendar Yoklama Takvimi

### Adım 1: CDN

**Dosya:** `index.html`

Chart.js script’inin hemen altına:

```html
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/fullcalendar/6.1.11/index.global.min.js" crossorigin="anonymous"></script>
```

### Adım 2: Fonksiyon ve Sayfa

**Dosya:** `script-fixes.js` — en sona ekle:

```javascript
// ── FULLCALENDAR ────────────────────────────────────────────
function pgCalendar() {
    return '<div class="ph"><div class="stit">📅 Antrenman Takvimi</div></div>'
        + '<div class="card" style="min-height:500px"><div id="fc-calendar"></div></div>';
}
window.pgCalendar = pgCalendar;

function initCalendarChart() {
    if (!window.FullCalendar) { setTimeout(initCalendarChart, 300); return; }
    var el = document.getElementById('fc-calendar');
    if (!el) return;
    if (el._fc) { el._fc.destroy(); el._fc = null; }
    var events = [];
    Object.keys(AppState.data.attendance).forEach(function(date) {
        var dayData = AppState.data.attendance[date];
        var p = 0, ab = 0, ex = 0;
        Object.values(dayData).forEach(function(st) { if(st==='P') p++; else if(st==='A') ab++; else if(st==='E') ex++; });
        var total = p + ab + ex;
        if (!total) return;
        var rate = Math.round((p / total) * 100);
        events.push({ title: '✅'+p+' ❌'+ab, start: date, backgroundColor: rate>=80?'#22c55e':rate>=50?'#eab308':'#ef4444', borderColor: 'transparent', extendedProps: { present:p, absent:ab, excused:ex, rate:rate } });
    });
    var cal = new FullCalendar.Calendar(el, {
        initialView: 'dayGridMonth', locale: 'tr',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,listMonth' },
        buttonText: { today: 'Bugün', month: 'Ay', list: 'Liste' },
        events: events,
        eventClick: function(info) {
            var p = info.event.extendedProps;
            if (typeof toast === 'function') toast('✅'+p.present+' Var  ❌'+p.absent+' Yok  🔵'+p.excused+' İzinli  — %'+p.rate+' devam', 'g');
        },
        height: 'auto'
    });
    cal.render(); el._fc = cal;
}

// go() pages tablosuna calendar ekle — go() override
(function() {
    var _goOrig = window.go;
    window.go = function(page, params) {
        if (page === 'calendar') {
            var main = document.getElementById('main');
            if (main) {
                AppState.ui.curPage = page;
                document.querySelectorAll('.ni').forEach(function(el) { el.classList.toggle('on', el.id === 'ni-calendar'); });
                document.querySelectorAll('.bni-btn').forEach(function(el) { el.classList.toggle('on', false); });
                main.style.opacity = '0';
                setTimeout(function() {
                    main.innerHTML = pgCalendar();
                    main.style.opacity = '1';
                    setTimeout(initCalendarChart, 150);
                }, 100);
                if (typeof closeSide === 'function') closeSide();
                return;
            }
        }
        return _goOrig.call(window, page, params);
    };
})();
```

### Adım 3: Menüye Ekle

**Dosya:** `index.html`

Sidebar’da `ni-attendance` butonunun hemen arkasına:

```html
<button class="ni" id="ni-calendar" onclick="go('calendar')">
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
  </svg>
  <span>Takvim</span>
</button>
```

`updateBranchUI` fonksiyonu `script.js`’te — buna dokunma. Bunun yerine `script-fixes.js` en sonuna ekle:

```javascript
// Takvim menü öğesini aktif tut
window.registerGoHook('after', function(page) {
    if (page === 'calendar') {
        document.querySelectorAll('.ni').forEach(function(el) {
            el.classList.toggle('on', el.id === 'ni-calendar');
        });
    }
});
```

-----

## GELİŞTİRME 10 — Tüm After Hook’larını Birleştir

**Dosya:** `script-fixes.js`

Geliştirme 2, 4, 5, 6, 8’de ayrı ayrı `registerGoHook('after', ...)` çağrıları yapıldı. Bunları **tek bir hook** içinde birleştir. Tüm ayrı hook çağrılarını sil ve şunu ekle:

```javascript
// ── TEK BİRLEŞİK AFTER HOOK ────────────────────────────────
window.registerGoHook('after', function(page) {

    // Yoklama geçmişi
    if (page === 'attendance') {
        // Geliştirme 2 kodu buraya
    }

    // Dashboard özeti (yönetici)
    if (page === 'dashboard' && AppState.currentUser && AppState.currentUser.role !== 'coach') {
        // Geliştirme 4 yönetici kodu buraya
    }

    // Dashboard (antrenör)
    if (page === 'dashboard' && AppState.currentUser && AppState.currentUser.role === 'coach') {
        // Geliştirme 4 antrenör kodu buraya
    }

    // Otomatik uyarılar
    if (page === 'dashboard' && AppState.currentUser && AppState.currentUser.role === 'admin') {
        if (typeof buildAutoAlerts === 'function') buildAutoAlerts();
    }

    // Veli profil antrenör kartı
    if (typeof AppState.currentSporcu !== 'undefined' && AppState.currentSporcu) {
        // Geliştirme 6 kodu buraya
    }

    // Chart.js
    if (page === 'dashboard') {
        var main = document.getElementById('main');
        if (main) {
            main.querySelectorAll('.card').forEach(function(card) {
                if (card.textContent.indexOf('Gelir/Gider') > -1 && !card.querySelector('canvas')) {
                    card.innerHTML = '<div class="tw6 tsm mb2">📈 Son 6 Ay Gelir/Gider</div><canvas id="dash-chart" height="120"></canvas>';
                    setTimeout(initDashboardChart, 150);
                }
            });
        }
    }
    if (page === 'accounting') setTimeout(initBranchChart, 150);

    // Takvim menü aktif
    if (page === 'calendar') {
        document.querySelectorAll('.ni').forEach(function(el) {
            el.classList.toggle('on', el.id === 'ni-calendar');
        });
    }
});
```

-----

## GENEL KURALLAR

1. **`script.js`’e kesinlikle dokunma.**
1. Tüm değişiklikler `script-fixes.js` en sonuna veya mevcut `script-fixes.js` fonksiyonları içine yapılır.
1. `index.html`’de sadece CDN script ekleme ve sidebar menü butonu ekleme yapılır.
1. Geliştirme 10’daki birleştirme adımını mutlaka uygula — çakışan hook’lar sorun çıkarır.
1. Her değişiklikten sonra `?v=` numarasını artır.
1. `go()` override sadece Geliştirme 9’da ve sadece `calendar` sayfası için yapılıyor — diğer sayfalar `_goOrig`’e devrediliyor.

-----

## DOKUNMA LİSTESİ

- `script.js` → Kesinlikle dokunma
- `Security.js` → Dokunma
- `sw.js` → Dokunma
- `vercel.json` → Dokunma (ayrı performans promptu var)
- `supabase/` → Dokunma
- `generateReceipt`, `_generateReceiptHTML` → Zaten çalışıyor, dokunma
- `printProfile` → Zaten var, dokunma
- `buildBarChart`, `buildDonutChart` → SVG korunuyor, dokunma
