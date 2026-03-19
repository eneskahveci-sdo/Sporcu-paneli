# Geliştirme Görevi — Dragos Futbol Akademisi
## 7 Geliştirme — Tek Prompt

### KRİTİK KURALLAR
- `script.js` dosyasına kesinlikle dokunma.
- Tüm JS değişiklikleri `script-fixes.js` dosyasına yapılır.
- HTML değişiklikleri yalnızca `index.html` dosyasına yapılır.
- CSS değişiklikleri yalnızca `style.css` dosyasına yapılır.
- Supabase SQL değişiklikleri `RLS_POLICIES.sql` ve `supabase/migrations/` içine yapılır.
- Her değişiklikten sonra sözdizimi hatası kontrol et.

---

## GELİŞTİRME 1 — Sporcu Aramasında Sayfa Yenileme Titremesi Düzelt

**Sorun:** Arama kutusuna her harf girildiğinde `go('athletes')` çağrılıyor. `go()` içinde `main.style.opacity = '0'` → 100ms bekle → içerik yaz → `opacity = '1'` animasyonu var. Bu her tuş basışında sayfanın titremesine yol açıyor.

**Dosya:** `script-fixes.js`

**Bul:** `__renderAthletes` fonksiyonunu. İçindeki arama input'unu bul:
```
oninput=\"AppState.filters.athletes.q=this.value;go(\\'athletes\\')\"
```

**Değiştir:** `go('athletes')` yerine doğrudan DOM'u güncelle:
```javascript
oninput=\"AppState.filters.athletes.q=this.value;__renderAthletesInPlace()\"
```

**Ardından** `__renderAthletes` fonksiyonundan ÖNCE şu yardımcı fonksiyonu ekle:

```javascript
function __renderAthletesInPlace() {
    var main = document.getElementById('main');
    if (!main) { go('athletes'); return; }
    var f = AppState.filters.athletes;
    var list = AppState.data.athletes.slice();
    if (f.st && f.st !== 'all') list = list.filter(function(a) { return a.st === f.st; });
    if (f.sp) list = list.filter(function(a) { return a.sp === f.sp; });
    if (f.cls) list = list.filter(function(a) { return a.clsId === f.cls; });
    if (f.q) {
        var q = f.q.toLowerCase();
        list = list.filter(function(a) {
            return (a.fn + ' ' + a.ln).toLowerCase().includes(q) || a.tc.includes(q);
        });
    }
    var isAdmin = AppState.currentUser && AppState.currentUser.role === 'admin';
    var tbody = main.querySelector('tbody');
    if (!tbody) { go('athletes'); return; }
    tbody.innerHTML = list.map(function(a) {
        var del = isAdmin ? '<button class="btn btn-xs bd" onclick="delAth(\'' + a.id + '\')">Sil</button>' : '';
        return '<tr><td><div class="flex fca gap2" style="cursor:pointer" onclick="go(\'athleteProfile\',{id:\'' + a.id + '\'})">'
            + UIUtils.getAvatar(36, null, FormatUtils.initials(a.fn, a.ln))
            + '<div><div class="tw6" style="color:var(--blue2)">' + FormatUtils.escape(a.fn) + ' ' + FormatUtils.escape(a.ln) + '</div>'
            + '<div class="ts tm">' + DateUtils.age(a.bd) + ' yaş</div></div></div></td>'
            + '<td>' + FormatUtils.escape(a.tc) + '</td>'
            + '<td>' + sportEmoji(a.sp) + ' ' + FormatUtils.escape(a.sp) + '</td>'
            + '<td>' + FormatUtils.escape(className(a.clsId)) + '</td>'
            + '<td><span class="bg ' + statusClass(a.st) + '">' + statusLabel(a.st) + '</span></td>'
            + '<td><button class="btn btn-xs bp" onclick="go(\'athleteProfile\',{id:\'' + a.id + '\'})">Profil</button> '
            + '<button class="btn btn-xs bs" onclick="editAth(\'' + a.id + '\')">Düzenle</button> ' + del + '</td></tr>';
    }).join('');
}
window.__renderAthletesInPlace = __renderAthletesInPlace;
```

**Neden güvenli:** `go()` çağrısı yok, opacity animasyonu yok. Sadece `tbody` içeriği değişiyor. Sekme değişikliği ve filtre dropdown'ları hâlâ `go('athletes')` kullanıyor — sadece yazarken titreme kaldırıldı.

---

## GELİŞTİRME 2 — Classes Tablosuna Antrenman Günü ve Saati Ekle

### Adım 1: Supabase SQL

`supabase/migrations/003_classes_schedule.sql` adında yeni dosya oluştur:

```sql
-- 003_classes_schedule.sql
-- Classes tablosuna antrenman programı alanları ekleniyor
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_days jsonb DEFAULT '[]';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_time text DEFAULT '';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS schedule_time_end text DEFAULT '';
```

Aynı SQL'i `RLS_POLICIES.sql` dosyasının en sonuna da ekle.

### Adım 2: Mapper Override

**Dosya:** `script-fixes.js` en sonuna ekle:

```javascript
// ── CLASSES MAPPER OVERRIDE — schedule alanları ─────────────
(function() {
    var _origToClass = DB.mappers.toClass;
    var _origFromClass = DB.mappers.fromClass;
    DB.mappers.toClass = function(r) {
        var base = _origToClass(r);
        base.scheduleDays = r.schedule_days || [];
        base.scheduleTime = r.schedule_time || '';
        base.scheduleTimeEnd = r.schedule_time_end || '';
        return base;
    };
    DB.mappers.fromClass = function(c) {
        var base = _origFromClass(c);
        base.schedule_days = c.scheduleDays || [];
        base.schedule_time = c.scheduleTime || '';
        base.schedule_time_end = c.scheduleTimeEnd || '';
        return base;
    };
})();
```

### Adım 3: editClass Override

**Dosya:** `script-fixes.js` en sonuna ekle:

```javascript
// ── EDIT CLASS OVERRIDE — gün ve saat alanları ──────────────
var _origEditClass = window.editClass;
window.editClass = function(id) {
    var c = id ? AppState.data.classes.find(function(x) { return x.id === id; }) : null;
    var isNew = !c;
    var days = ['pazartesi','salı','çarşamba','perşembe','cuma','cumartesi','pazar'];
    var dayLabels = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
    var curDays = (c && c.scheduleDays) || [];
    var dayCheckboxes = days.map(function(d, i) {
        var checked = curDays.indexOf(d) > -1 ? 'checked' : '';
        return '<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;cursor:pointer;font-size:13px">'
            + '<input type="checkbox" value="' + d + '" class="cls-day-cb" ' + checked + ' style="width:auto;accent-color:var(--blue2)"/> '
            + dayLabels[i] + '</label>';
    }).join('');
    modal(isNew ? 'Yeni Sınıf' : 'Sınıf Düzenle',
        '<div class="fgr mb2"><label>Sınıf Adı *</label><input id="c-name" value="' + FormatUtils.escape(c ? c.name : '') + '"/></div>'
        + '<div class="g21 mb2">'
        + '<div class="fgr"><label>Branş</label><select id="c-sp">' + AppState.data.sports.map(function(s) { return '<option value="' + s.id + '"' + (c && c.spId === s.id ? ' selected' : '') + '>' + FormatUtils.escape(s.name) + '</option>'; }).join('') + '</select></div>'
        + '<div class="fgr"><label>Antrenör</label><select id="c-coach"><option value="">Seçiniz</option>' + AppState.data.coaches.map(function(co) { return '<option value="' + co.id + '"' + (c && c.coachId === co.id ? ' selected' : '') + '>' + FormatUtils.escape(co.fn + ' ' + co.ln) + '</option>'; }).join('') + '</select></div>'
        + '</div>'
        + '<div class="fgr mb2"><label>Antrenman Günleri</label><div style="padding:8px 0">' + dayCheckboxes + '</div></div>'
        + '<div class="g21 mb2">'
        + '<div class="fgr"><label>Başlangıç Saati</label><input type="time" id="c-time" value="' + (c ? c.scheduleTime : '') + '"/></div>'
        + '<div class="fgr"><label>Bitiş Saati</label><input type="time" id="c-time-end" value="' + (c ? c.scheduleTimeEnd : '') + '"/></div>'
        + '</div>',
        [
            { lbl: 'İptal', cls: 'bs', fn: closeModal },
            { lbl: 'Kaydet', cls: 'bp', fn: async function() {
                var name = UIUtils.getValue('c-name');
                if (!name) { toast(i18n[AppState.lang].fillRequired, 'e'); return; }
                var selDays = [];
                document.querySelectorAll('.cls-day-cb:checked').forEach(function(cb) { selDays.push(cb.value); });
                var obj = {
                    id: c ? c.id : generateId(),
                    name: name,
                    coachId: UIUtils.getValue('c-coach'),
                    spId: UIUtils.getValue('c-sp'),
                    cap: 20,
                    scheduleDays: selDays,
                    scheduleTime: UIUtils.getValue('c-time') || '',
                    scheduleTimeEnd: UIUtils.getValue('c-time-end') || ''
                };
                var result = await DB.upsert('classes', DB.mappers.fromClass(obj));
                if (result) {
                    if (isNew) { AppState.data.classes.push(obj); }
                    else { var idx = AppState.data.classes.findIndex(function(x) { return x.id === obj.id; }); if (idx >= 0) AppState.data.classes[idx] = obj; }
                    toast(i18n[AppState.lang].saveSuccess, 'g');
                    closeModal();
                    go('classes');
                }
            }}
        ]
    );
};
```

---

## GELİŞTİRME 3 — Yoklama Sayfasını Antrenman Günlerine Göre Ayarla

**Dosya:** `script-fixes.js` en sonuna ekle:

```javascript
// ── YOKLAMA OVERRIDE — antrenman günü kontrolü ───────────────
(function() {
    var _origPgAttendance = typeof pgAttendance === 'function' ? pgAttendance : null;

    function getClassesForDate(dateStr) {
        var d = new Date(dateStr + 'T12:00:00');
        var dayNames = ['pazar','pazartesi','salı','çarşamba','perşembe','cuma','cumartesi'];
        var dayName = dayNames[d.getDay()];
        return AppState.data.classes.filter(function(cls) {
            return cls.scheduleDays && cls.scheduleDays.indexOf(dayName) > -1;
        });
    }

    function isTrainingDay(dateStr) {
        return getClassesForDate(dateStr).length > 0;
    }

    function getNextTrainingDate() {
        var d = new Date();
        for (var i = 0; i < 14; i++) {
            var str = d.toISOString().split('T')[0];
            if (isTrainingDay(str)) return str;
            d.setDate(d.getDate() + 1);
        }
        return DateUtils.today();
    }

    window.pgAttendance = function() {
        var hasSchedule = AppState.data.classes.some(function(c) { return c.scheduleDays && c.scheduleDays.length > 0; });
        if (!hasSchedule && _origPgAttendance) return _origPgAttendance();

        var today = AppState.ui.atd || DateUtils.today();
        if (!AppState.ui._attDateSet) {
            AppState.ui._attDateSet = true;
            if (!isTrainingDay(today)) {
                today = getNextTrainingDate();
                AppState.ui.atd = today;
            }
        }
        AppState.ui.atd = today;

        var classesForDay = getClassesForDate(today);
        var isTraining = classesForDay.length > 0;

        if (isTraining && classesForDay.length > 0) {
            var validCls = classesForDay.find(function(c) { return c.id === AppState.ui.atcls; });
            if (!validCls) AppState.ui.atcls = classesForDay[0].id;
        }

        var selClsId = AppState.ui.atcls || '';
        var list = AppState.data.athletes.filter(function(a) {
            return a.st === 'active' && (!selClsId || a.clsId === selClsId);
        });

        var attDay = AppState.data.attendance[today] || {};
        var totalActive = list.length;
        var filled  = list.filter(function(a) { return attDay[a.id]; }).length;
        var present = list.filter(function(a) { return attDay[a.id] === 'P'; }).length;
        var absent  = list.filter(function(a) { return attDay[a.id] === 'A'; }).length;
        var excused = list.filter(function(a) { return attDay[a.id] === 'E'; }).length;
        var allFilled = totalActive > 0 && filled === totalActive;

        var clsOptions = classesForDay.map(function(c) {
            var ts = (c.scheduleTime && c.scheduleTimeEnd) ? ' (' + c.scheduleTime + '-' + c.scheduleTimeEnd + ')' : '';
            return '<option value="' + FormatUtils.escape(c.id) + '"' + (selClsId === c.id ? ' selected' : '') + '>'
                + FormatUtils.escape(c.name) + ts + '</option>';
        }).join('');

        var html = '<div class="ph"><div class="stit">✅ Devam Takibi</div></div>';
        html += '<div class="card mb3"><div class="flex fca gap3 fwrap">'
            + '<div class="fgr" style="flex:1;min-width:180px"><input type="date" value="' + today
            + '" onchange="AppState.ui.atd=this.value;AppState.ui._attDateSet=true;go(\'attendance\')" style="font-weight:700"/></div>';

        if (isTraining && classesForDay.length > 1) {
            html += '<div class="fgr"><select class="fs" onchange="AppState.ui.atcls=this.value;go(\'attendance\')">' + clsOptions + '</select></div>';
        } else if (isTraining && classesForDay.length === 1) {
            var c0 = classesForDay[0];
            var ts0 = (c0.scheduleTime && c0.scheduleTimeEnd) ? c0.scheduleTime + ' – ' + c0.scheduleTimeEnd : '';
            html += '<div style="font-size:14px;font-weight:600;color:var(--blue2);padding:8px 12px;background:rgba(59,130,246,.1);border-radius:8px">🏫 '
                + FormatUtils.escape(c0.name) + (ts0 ? ' · ' + ts0 : '') + '</div>';
        }
        html += '</div>';

        if (!isTraining) {
            var dayLabels2 = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
            var dn2 = dayLabels2[new Date(today + 'T12:00:00').getDay()];
            html += '<div class="al al-y mt3">📅 <strong>' + dn2 + '</strong> günü için tanımlı antrenman yok. '
                + '<button class="btn btn-sm bp" style="margin-left:8px" onclick="AppState.ui.atd=\'' + getNextTrainingDate()
                + '\';AppState.ui._attDateSet=true;go(\'attendance\')">En yakın antrenman gününe git →</button></div>';
        } else if (totalActive > 0) {
            html += '<div class="flex gap3 mt3" style="flex-wrap:wrap">'
                + '<div class="ts"><span class="tw6 tb">' + filled + '/' + totalActive + '</span> girdi</div>'
                + '<div class="ts">✅ <span class="tw6">' + present + '</span> Var</div>'
                + '<div class="ts">❌ <span class="tw6">' + absent + '</span> Yok</div>'
                + '<div class="ts">🔵 <span class="tw6">' + excused + '</span> İzinli</div></div>'
                + '<div class="mt3">'
                + (allFilled
                    ? '<button class="btn bp w100" style="background:var(--green)" onclick="finalizeAttendance(\'' + today + '\')">✅ Yoklama Tamamlandı — ' + DateUtils.format(today) + ' Tarihe Kaydet</button>'
                    : '<button class="btn bs w100" onclick="finalizeAttendance(\'' + today + '\')"' + (filled === 0 ? ' disabled' : '') + '>📁 Kısmi Kaydet (' + filled + '/' + totalActive + ' girdi)</button>')
                + '</div>';
        }
        html += '</div>';

        html += '<div class="card">';
        if (!isTraining) {
            html += '<p class="tm ts" style="text-align:center;padding:20px">Antrenman günü olmadığı için yoklama listesi gösterilmiyor.</p>';
        } else if (list.length === 0) {
            html += '<p class="tm ts" style="text-align:center;padding:20px">Bu sınıfta aktif sporcu yok.</p>';
        } else {
            html += list.map(function(a) {
                var st = attDay[a.id] || '';
                return '<div class="att-row">'
                    + '<div class="flex fca gap2" style="flex:1;cursor:pointer" onclick="go(\'athleteProfile\',{id:\'' + FormatUtils.escape(a.id) + '\'})">'
                    + UIUtils.getAvatar(32, null, FormatUtils.initials(a.fn, a.ln))
                    + '<div><div class="tw6 tsm">' + FormatUtils.escape(a.fn + ' ' + a.ln) + '</div>'
                    + '<div class="ts tm">' + FormatUtils.escape(className(a.clsId)) + '</div></div></div>'
                    + '<div class="att-btns">'
                    + '<button class="att-b' + (st==='P'?' ap':'') + '" onclick="event.stopPropagation();setAtt(\'' + FormatUtils.escape(a.id) + '\',\'P\')">Var</button>'
                    + '<button class="att-b' + (st==='A'?' aa':'') + '" onclick="event.stopPropagation();setAtt(\'' + FormatUtils.escape(a.id) + '\',\'A\')">Yok</button>'
                    + '<button class="att-b' + (st==='E'?' al2':'') + '" onclick="event.stopPropagation();setAtt(\'' + FormatUtils.escape(a.id) + '\',\'E\')">İzinli</button>'
                    + '<button class="att-b" onclick="event.stopPropagation();setAtt(\'' + FormatUtils.escape(a.id) + '\')">Sil</button>'
                    + '</div></div>';
            }).join('');
        }
        html += '</div>';
        return html;
    };
})();
```

---

## GELİŞTİRME 4 — Takvimi Antrenman Günlerine Göre Ayarla

**Dosya:** `script-fixes.js`

Mevcut `initCalendarChart` fonksiyonunu bul ve tamamen şununla değiştir:

```javascript
function initCalendarChart() {
    if (!window.FullCalendar) { setTimeout(initCalendarChart, 300); return; }
    var el = document.getElementById('fc-calendar');
    if (!el) return;
    if (el._fc) { el._fc.destroy(); el._fc = null; }

    var dayNames = ['pazar','pazartesi','salı','çarşamba','perşembe','cuma','cumartesi'];
    var events = [];
    var hasSchedule = AppState.data.classes.some(function(c) { return c.scheduleDays && c.scheduleDays.length > 0; });
    var colors = ['#3b82f6','#8b5cf6','#06b6d4','#f97316','#22c55e'];

    if (hasSchedule) {
        var startD = new Date(); startD.setDate(startD.getDate() - 60);
        var endD = new Date(); endD.setDate(endD.getDate() + 90);
        AppState.data.classes.forEach(function(cls, ci) {
            if (!cls.scheduleDays || !cls.scheduleDays.length) return;
            var color = colors[ci % colors.length];
            var ts = (cls.scheduleTime && cls.scheduleTimeEnd) ? cls.scheduleTime + '-' + cls.scheduleTimeEnd : (cls.scheduleTime || '');
            var cur = new Date(startD);
            while (cur <= endD) {
                var dn = dayNames[cur.getDay()];
                if (cls.scheduleDays.indexOf(dn) > -1) {
                    var ds = cur.getFullYear() + '-' + String(cur.getMonth()+1).padStart(2,'0') + '-' + String(cur.getDate()).padStart(2,'0');
                    var dayAtt = AppState.data.attendance[ds] || {};
                    var athInCls = AppState.data.athletes.filter(function(a) { return a.clsId === cls.id && a.st === 'active'; });
                    var p = athInCls.filter(function(a) { return dayAtt[a.id] === 'P'; }).length;
                    var ab = athInCls.filter(function(a) { return dayAtt[a.id] === 'A'; }).length;
                    var hasAtt = athInCls.some(function(a) { return dayAtt[a.id]; });
                    var isPast = ds < DateUtils.today();
                    var title = FormatUtils.escape(cls.name);
                    if (ts) title += ' ' + ts;
                    if (hasAtt) title += '  ✅' + p + ' ❌' + ab;
                    var bgColor = hasAtt
                        ? (p >= athInCls.length * 0.8 ? '#22c55e' : p > 0 ? '#eab308' : '#ef4444')
                        : (isPast ? 'rgba(148,163,184,0.35)' : color);
                    events.push({
                        title: title, start: ds,
                        backgroundColor: bgColor, borderColor: 'transparent', textColor: '#fff',
                        extendedProps: { clsId: cls.id, clsName: cls.name, present: p, absent: ab, hasAtt: hasAtt, isPast: isPast, ts: ts }
                    });
                }
                cur.setDate(cur.getDate() + 1);
            }
        });
    } else {
        Object.keys(AppState.data.attendance).forEach(function(date) {
            var dayData = AppState.data.attendance[date];
            var p = 0, ab = 0, ex = 0;
            Object.values(dayData).forEach(function(st) { if(st==='P') p++; else if(st==='A') ab++; else if(st==='E') ex++; });
            var total = p + ab + ex;
            if (!total) return;
            var rate = Math.round((p / total) * 100);
            events.push({ title: '✅'+p+' ❌'+ab, start: date, backgroundColor: rate>=80?'#22c55e':rate>=50?'#eab308':'#ef4444', borderColor: 'transparent', extendedProps: { present:p, absent:ab, excused:ex, rate:rate } });
        });
    }

    var cal = new FullCalendar.Calendar(el, {
        initialView: 'dayGridMonth', locale: 'tr',
        headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,listMonth' },
        buttonText: { today: 'Bugün', month: 'Ay', list: 'Liste' },
        events: events,
        eventClick: function(info) {
            var ep = info.event.extendedProps;
            if (ep.clsName !== undefined) {
                var msg = '🏫 ' + (ep.clsName||'') + (ep.ts ? ' · ' + ep.ts : '');
                if (ep.hasAtt) msg += '  |  ✅ ' + ep.present + ' Var  ❌ ' + ep.absent + ' Yok';
                else msg += (ep.isPast ? '  |  Yoklama girilmedi' : '  |  Planlandı');
                if (typeof toast === 'function') toast(msg, 'g');
                AppState.ui.atd = info.event.startStr;
                AppState.ui.atcls = ep.clsId;
                AppState.ui._attDateSet = true;
                go('attendance');
            } else {
                if (typeof toast === 'function') toast('✅'+ep.present+' Var  ❌'+ep.absent+' Yok  — %'+ep.rate+' devam', 'g');
            }
        },
        height: 'auto',
        dayCellDidMount: function(arg) {
            var dn = dayNames[arg.date.getDay()];
            var isTraining = AppState.data.classes.some(function(c) { return c.scheduleDays && c.scheduleDays.indexOf(dn) > -1; });
            if (isTraining) arg.el.style.backgroundColor = 'rgba(59,130,246,0.05)';
        }
    });
    cal.render();
    el._fc = cal;
}
```

---

## GELİŞTİRME 5 — Sidebar Akordiyon Gruplaması

### Adım 1: index.html sidebar'ını değiştir

**Dosya:** `index.html`

`<div id="side" role="complementary">` ile `</div><div id="main-wrap">` arasındaki TÜM içeriği sil ve şununla değiştir:

```html
<div id="side" role="complementary">
  <div class="slogo" id="side-logo-area">
    <div class="slogo-icon" id="side-logo-icon" aria-hidden="true">&#x26BD;</div>
    <img id="side-logo-img" style="display:none;width:38px;height:38px;border-radius:10px;object-fit:cover;border:2px solid var(--border2)" src="" alt="Kurum logosu"/>
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" id="sn">Dragos Akademisi</div>
      <div style="font-size:11px;color:var(--text3)" id="sn2">Yönetim Paneli</div>
    </div>
  </div>
  <nav class="snav" role="navigation" aria-label="Ana menü">
    <div class="acc-group" id="accg-general">
      <button class="acc-header" onclick="toggleAccordion('general')" aria-expanded="true"><span class="acc-title">Genel</span><svg class="acc-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></button>
      <div class="acc-body" id="accb-general">
        <button class="ni on" id="ni-dashboard" onclick="go('dashboard')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg><span>Ana Sayfa</span></button>
      </div>
    </div>
    <div class="acc-group" id="accg-athletes">
      <button class="acc-header" onclick="toggleAccordion('athletes')" aria-expanded="true"><span class="acc-title">Sporcular</span><svg class="acc-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></button>
      <div class="acc-body" id="accb-athletes">
        <button class="ni" id="ni-athletes" onclick="go('athletes')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg><span>Sporcular</span></button>
        <button class="ni" id="ni-onkayit" onclick="go('onkayit')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><span>Ön Kayıt</span><span id="onkayit-badge" class="dn" style="background:var(--yellow);color:#000;border-radius:10px;padding:1px 7px;font-size:10px;font-weight:800;margin-left:auto">0</span></button>
        <button class="ni" id="ni-coaches" onclick="go('coaches')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg><span>Antrenörler</span></button>
      </div>
    </div>
    <div class="acc-group" id="accg-academy">
      <button class="acc-header" onclick="toggleAccordion('academy')" aria-expanded="true"><span class="acc-title">Akademi</span><svg class="acc-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></button>
      <div class="acc-body" id="accb-academy">
        <button class="ni" id="ni-sports" onclick="go('sports')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/></svg><span>Branşlar</span></button>
        <button class="ni" id="ni-classes" onclick="go('classes')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg><span>Sınıflar</span></button>
        <button class="ni" id="ni-attendance" onclick="go('attendance')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg><span>Devam (Yoklama)</span></button>
        <button class="ni" id="ni-calendar" onclick="go('calendar')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg><span>Takvim</span></button>
      </div>
    </div>
    <div class="acc-group" id="accg-finance">
      <button class="acc-header" onclick="toggleAccordion('finance')" aria-expanded="true" id="sec-finance"><span class="acc-title">Muhasebe</span><svg class="acc-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></button>
      <div class="acc-body" id="accb-finance">
        <button class="ni" id="ni-payments" onclick="go('payments')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span>Ödemeler</span></button>
        <button class="ni" id="ni-accounting" onclick="go('accounting')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg><span>Finans / Rapor</span></button>
        <button class="ni" id="ni-sms" onclick="go('sms')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg><span>Bildirimler</span></button>
      </div>
    </div>
    <div class="acc-group" id="accg-system">
      <button class="acc-header" onclick="toggleAccordion('system')" aria-expanded="true" id="sec-sys"><span class="acc-title">Sistem</span><svg class="acc-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg></button>
      <div class="acc-body" id="accb-system">
        <button class="ni" id="ni-settings" onclick="go('settings')"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg><span>Ayarlar</span></button>
      </div>
    </div>
    <div style="margin:8px;padding:12px;background:var(--bg3);border-radius:12px;border:1px solid var(--border)">
      <div class="flex fca gap2 mb2">
        <div class="ava" style="width:32px;height:32px;font-size:12px;flex-shrink:0" id="sava">A</div>
        <div style="flex:1;min-width:0">
          <div class="tw6 tsm trunc" id="suname">Admin</div>
          <div class="ts" style="color:var(--text3)">Yönetici</div>
        </div>
      </div>
      <button class="btn bs btn-sm w100" onclick="doLogout()">Çıkış Yap</button>
    </div>
  </nav>
</div>
```

### Adım 2: CSS ekle

**Dosya:** `style.css` — en sona ekle:

```css
.acc-group{margin-bottom:2px}.acc-header{width:100%;display:flex;align-items:center;justify-content:space-between;padding:7px 12px;border-radius:8px;background:none;color:var(--text3);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;cursor:pointer;transition:all .2s;min-height:34px}.acc-header:hover{background:var(--bg3);color:var(--text2)}.acc-title{flex:1;text-align:left}.acc-arrow{width:13px;height:13px;transition:transform .25s;opacity:.5;flex-shrink:0}.acc-body{overflow:hidden;transition:max-height .3s ease,opacity .25s;max-height:500px;opacity:1}.acc-body.collapsed{max-height:0!important;opacity:0;pointer-events:none}.acc-header[aria-expanded="false"] .acc-arrow{transform:rotate(-90deg)}.slogo{padding:14px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border);background:var(--bg3)}.slogo-icon{width:36px;height:36px;background:var(--grad);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:17px;color:#fff;font-weight:800;overflow:hidden;flex-shrink:0;box-shadow:0 2px 6px rgba(59,130,246,.25)}html[data-theme="light"] .slogo-icon{color:#FFED00}
```

### Adım 3: Akordiyon JS

**Dosya:** `script-fixes.js` — en sona ekle:

```javascript
// ── AKORDİYON SİDEBAR ──────────────────────────────────────
(function() {
    var KEY = 'sidebar_acc_v1';
    function getState() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch(e) { return {}; } }
    function saveState(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch(e) {} }

    window.toggleAccordion = function(g) {
        var body = document.getElementById('accb-' + g);
        var hdr  = body ? body.previousElementSibling : null;
        if (!body || !hdr) return;
        var open = !body.classList.contains('collapsed');
        body.classList.toggle('collapsed', open);
        hdr.setAttribute('aria-expanded', open ? 'false' : 'true');
        var s = getState(); s[g] = !open; saveState(s);
    };

    function init() {
        var s = getState();
        ['general','athletes','academy','finance','system'].forEach(function(g) {
            var body = document.getElementById('accb-' + g);
            var hdr  = body ? body.previousElementSibling : null;
            if (!body || !hdr) return;
            if (s[g] === false) {
                body.classList.add('collapsed');
                hdr.setAttribute('aria-expanded', 'false');
            }
        });
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
    else { init(); }
})();
```

---

## GELİŞTİRME 6 — updateBranchUI Antrenör Kısıtlaması Güncelle

**Dosya:** `script-fixes.js` — en sona ekle:

```javascript
// ── updateBranchUI OVERRIDE — akordiyon uyumlu ──────────────
var _origUpdateBranchUI2 = typeof updateBranchUI === 'function' ? updateBranchUI : null;
window.updateBranchUI = function() {
    if (_origUpdateBranchUI2) _origUpdateBranchUI2();
    if (AppState.currentUser && AppState.currentUser.role === 'coach') {
        ['accg-finance','accg-system'].forEach(function(g) {
            var el = document.getElementById(g); if (el) el.style.display = 'none';
        });
        ['ni-sports','ni-classes'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.style.display = 'none';
        });
    }
};
```

---

## GELİŞTİRME 7 — Classes Sayfasında Ders Programını Göster

**Dosya:** `script-fixes.js` — en sona ekle:

Sınıflar listesinde her sınıfın antrenman günü ve saatini göster:

```javascript
// ── CLASSES SAYFASI OVERRIDE — schedule göster ──────────────
window.registerGoHook('after', function(page) {
    if (page !== 'classes') return;
    var main = document.getElementById('main');
    if (!main) return;
    // Tablodaki her satıra schedule bilgisini ekle
    var rows = main.querySelectorAll('tbody tr');
    rows.forEach(function(row) {
        var editBtn = row.querySelector('button.bp');
        if (!editBtn) return;
        var onclickStr = editBtn.getAttribute('onclick') || '';
        var match = onclickStr.match(/editClass\('([^']+)'\)/);
        if (!match) return;
        var clsId = match[1];
        var cls = AppState.data.classes.find(function(c) { return c.id === clsId; });
        if (!cls || !cls.scheduleDays || !cls.scheduleDays.length) return;
        var dayMap = { pazartesi:'Pzt', salı:'Sal', çarşamba:'Çar', perşembe:'Per', cuma:'Cum', cumartesi:'Cmt', pazar:'Paz' };
        var dayStr = cls.scheduleDays.map(function(d) { return dayMap[d] || d; }).join(', ');
        var timeStr = (cls.scheduleTime && cls.scheduleTimeEnd) ? cls.scheduleTime + '-' + cls.scheduleTimeEnd : '';
        // İlk td'ye (sınıf adı) alt satır ekle
        var nameTd = row.querySelector('td:first-child');
        if (nameTd && !nameTd.querySelector('.cls-schedule')) {
            var span = document.createElement('div');
            span.className = 'cls-schedule ts tm';
            span.style.marginTop = '2px';
            span.textContent = '📅 ' + dayStr + (timeStr ? ' · ' + timeStr : '');
            nameTd.appendChild(span);
        }
    });
});
```

---

## GENEL KURALLAR

1. Sıra: 1 → 2 → 3 → 4 → 5 → 6 → 7.
2. `script.js` dosyasına kesinlikle dokunma.
3. Geliştirme 2'deki SQL'i hem yeni migration dosyasına hem RLS_POLICIES.sql sonuna ekle.
4. Geliştirme 5'te eski sidebar HTML'ini tamamen sil, sadece yenisini yaz.
5. Mevcut `registerGoHook('after', ...)` birleşik hook bloğuna dokunma — Geliştirme 7 ayrı bir hook olarak ekleniyor.
6. Her değişiklikten sonra `index.html`'deki `?v=` numarasını artır.

---

## DOKUNMA LİSTESİ

- `script.js` → Kesinlikle dokunma
- `Security.js` → Dokunma
- `sw.js` → Dokunma
- `vercel.json` → Dokunma (ayrı performans promptu var)
- `supabase/functions/` → Dokunma
- `generateReceipt`, `printProfile` → Dokunma
- Mevcut birleşik `registerGoHook('after', ...)` bloğu → İçine ekleme yapma, Geliştirme 7 ayrı bir hook
