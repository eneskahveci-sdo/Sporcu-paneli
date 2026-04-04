// ============================================================
// SPORCU PANELİ — Yeni Özellikler
// ============================================================
// 1. Aktivite Logu
// 2. Doğum Günü Widgeti (Dashboard)
// 3. Yedekleme Bildirimi
// 4. Sporcu Fotoğrafı Yükleme
// 5. Gelişmiş Excel Export (Filtreli)
// 6. Vergi Dönemi Raporu (Muhasebe eki)
// 7. Push Bildirimleri
// 8. Şifre Sıfırlama (E-posta ile)
// ============================================================

(function () {
    'use strict';

    // ─── 1. AKTİVİTE LOGU ────────────────────────────────────────────────────────

    window.logActivity = async function (action, entityType, entityId, details) {
        try {
            var sb = window.getSupabase ? getSupabase() : null;
            if (!sb || !window.AppState || !AppState.currentUser) return;
            await sb.from('activity_logs').insert({
                user_name: AppState.currentUser.name || '',
                user_role: AppState.currentUser.role || '',
                action: action,
                entity_type: entityType || '',
                entity_id: String(entityId || ''),
                details: String(details || ''),
                org_id: AppState.currentOrgId || null
            });
        } catch (e) { /* silent — aktivite logu uygulama akışını kesmesin */ }
    };

    var ACTION_LABELS = {
        save_athlete: '👤 Sporcu kaydedildi',
        delete_athlete: '🗑 Sporcu silindi',
        save_payment: '💳 Ödeme kaydedildi',
        delete_payment: '🗑 Ödeme silindi',
        save_coach: '🧑‍🏫 Antrenör kaydedildi',
        delete_coach: '🗑 Antrenör silindi',
        login: '🔐 Giriş yapıldı',
        logout: '🚪 Çıkış yapıldı',
        export: '📤 Dışa aktarıldı',
        photo_upload: '📸 Fotoğraf yüklendi',
        backup: '💾 Yedek alındı'
    };

    window.pgActivityLog = function () {
        var html = '<div class="ph"><div class="stit">📋 Aktivite Logu</div>'
            + '<div class="ssub">Son 100 sistem aktivitesi</div></div>'
            + '<div id="al-list"><div class="card" style="padding:32px;text-align:center"><div class="ts tm">Yükleniyor...</div></div></div>';

        setTimeout(async function () {
            var container = document.getElementById('al-list');
            if (!container) return;
            try {
                var sb = getSupabase();
                if (!sb) { container.innerHTML = '<div class="al al-r">Bağlantı hatası</div>'; return; }
                var q = sb.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(100);
                if (AppState.currentOrgId) q = q.eq('org_id', AppState.currentOrgId);
                var res = await q;
                if (res.error) { container.innerHTML = '<div class="al al-r">Yüklenemedi</div>'; return; }
                var data = res.data || [];
                if (!data.length) {
                    container.innerHTML = '<div class="card" style="padding:32px;text-align:center"><div class="ts tm">Henüz aktivite kaydı yok.</div></div>';
                    return;
                }
                var rows = data.map(function (log) {
                    var dt = log.created_at ? new Date(log.created_at).toLocaleString('tr-TR') : '';
                    var label = ACTION_LABELS[log.action] || log.action;
                    return '<div class="flex fjb fca" style="padding:10px 0;border-bottom:1px solid var(--border)">'
                        + '<div><div class="tw6 tsm">' + label + '</div>'
                        + (log.details ? '<div class="ts tm">' + FormatUtils.escape(log.details) + '</div>' : '')
                        + '</div>'
                        + '<div style="text-align:right"><div class="ts tb">' + FormatUtils.escape(log.user_name) + '</div>'
                        + '<div class="ts tm">' + dt + '</div></div>'
                        + '</div>';
                }).join('');
                container.innerHTML = '<div class="card">' + rows + '</div>';
            } catch (e) {
                container.innerHTML = '<div class="al al-r">Hata: ' + FormatUtils.escape(e.message) + '</div>';
            }
        }, 50);

        return html;
    };

    window.registerGoHook('before', function (page) {
        if (page !== 'activity-log') return;
        AppState.ui.curPage = 'activity-log';
        var main = document.getElementById('main');
        if (!main) return false;
        main.style.opacity = '0';
        setTimeout(function () {
            main.innerHTML = pgActivityLog();
            main.style.opacity = '1';
        }, 100);
        document.querySelectorAll('.ni').forEach(function (el) {
            el.classList.remove('on');
        });
        return false;
    });

    // Ayarlar sayfasına "Aktivite Logu" linki ekle
    window.registerGoHook('after', function (page) {
        if (page !== 'settings') return;
        setTimeout(function () {
            var main = document.getElementById('main');
            if (!main || main.querySelector('#al-link-card')) return;
            main.insertAdjacentHTML('beforeend',
                '<div id="al-link-card" class="card mt3">'
                + '<div class="tw6 tsm mb2">📋 Aktivite Logu</div>'
                + '<p class="ts tm mb2">Sistemde gerçekleştirilen tüm işlemlerin kaydını görüntüleyin.</p>'
                + '<button class="btn bp" onclick="go(\'activity-log\')">Logu Görüntüle</button>'
                + '</div>'
            );
        }, 150);
    });

    // ─── 2. DOĞUM GÜNÜ WİDGETİ ────────────────────────────────────────────────────

    window.registerGoHook('after', function (page) {
        if (page !== 'dashboard') return;
        var today = new Date();
        var upcoming = (AppState.data.athletes || [])
            .filter(function (a) {
                if (!a.bd || a.st !== 'active') return false;
                var parts = a.bd.split('-');
                if (parts.length < 3) return false;
                var bday = new Date(today.getFullYear(), parseInt(parts[1]) - 1, parseInt(parts[2]));
                if (bday < today) bday.setFullYear(today.getFullYear() + 1);
                return Math.round((bday - today) / 86400000) <= 7;
            })
            .map(function (a) {
                var parts = a.bd.split('-');
                var bday = new Date(today.getFullYear(), parseInt(parts[1]) - 1, parseInt(parts[2]));
                if (bday < today) bday.setFullYear(today.getFullYear() + 1);
                return { name: a.fn + ' ' + a.ln, diff: Math.round((bday - today) / 86400000) };
            })
            .sort(function (a, b) { return a.diff - b.diff; });

        if (!upcoming.length) return;

        var html = '<div class="card mb3" style="border-left:4px solid #f59e0b">'
            + '<div class="tw6 tsm mb2">🎂 Yaklaşan Doğum Günleri</div>';
        upcoming.forEach(function (u) {
            html += '<div class="flex fjb fca mb1">'
                + '<span class="tsm">' + FormatUtils.escape(u.name) + '</span>'
                + '<span class="ts ' + (u.diff === 0 ? 'tg tw6' : 'tm') + '">'
                + (u.diff === 0 ? '🎉 Bugün!' : u.diff + ' gün sonra') + '</span>'
                + '</div>';
        });
        html += '</div>';

        var main = document.getElementById('main');
        if (!main) return;
        var g4 = main.querySelector('.g4');
        if (g4) g4.insertAdjacentHTML('afterend', html);
    });

    // ─── 3. YEDEKLEME BİLDİRİMİ ───────────────────────────────────────────────────

    var BACKUP_KEY = 'sporcu_last_backup';

    window.registerGoHook('after', function (page) {
        if (page !== 'dashboard') return;
        var last = localStorage.getItem(BACKUP_KEY);
        if (last && (Date.now() - parseInt(last)) / 86400000 < 7) return;

        var main = document.getElementById('main');
        if (!main) return;
        var ph = main.querySelector('.ph');
        if (!ph) return;

        var msg = last
            ? ('Son yedek ' + Math.floor((Date.now() - parseInt(last)) / 86400000) + ' gün önce alındı.')
            : 'Henüz yedek alınmadı.';

        ph.insertAdjacentHTML('afterend',
            '<div class="al al-y mb3" style="display:flex;justify-content:space-between;align-items:center;gap:12px">'
            + '<span>💾 <strong>Yedekleme:</strong> ' + msg + '</span>'
            + '<button class="btn bs" style="white-space:nowrap;flex-shrink:0" onclick="backupAllData()">Şimdi Yedekle</button>'
            + '</div>'
        );
    });

    window.backupAllData = function () {
        var data = {
            exportDate: new Date().toISOString(),
            athletes: AppState.data.athletes || [],
            payments: AppState.data.payments || [],
            coaches: AppState.data.coaches || [],
            sports: AppState.data.sports || [],
            classes: AppState.data.classes || []
        };
        var json = JSON.stringify(data, null, 2);
        var blob = new Blob([json], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'sporcu-panel-yedek-' + DateUtils.today() + '.json';
        a.click();
        URL.revokeObjectURL(url);
        localStorage.setItem(BACKUP_KEY, String(Date.now()));
        toast('✅ Yedek alındı!', 'g');
        logActivity('backup', 'all', '', 'Tam veri yedeği');
        go('dashboard');
    };

    // ─── 4. SPORCU FOTOĞRAFI ──────────────────────────────────────────────────────

    window.showPhotoUploadModal = function (athleteId) {
        var role = AppState.currentUser && AppState.currentUser.role;
        if (role !== 'admin') { toast('Fotoğraf yükleme sadece yöneticiler içindir.', 'e'); return; }

        modal('📸 Sporcu Fotoğrafı',
            '<p class="ts tm mb2">Önce Supabase Dashboard\'dan <strong>athlete-photos</strong> adında public bir Storage bucket oluşturun.</p>'
            + '<div class="fgr mb2"><label>Fotoğraf (JPG/PNG, maks 2MB)</label>'
            + '<input id="photo-file" type="file" accept="image/jpeg,image/png,image/webp" style="padding:8px"/></div>'
            + '<div id="photo-preview" style="text-align:center;min-height:60px"></div>',
            [
                { lbl: 'İptal', cls: 'bs', fn: closeModal },
                { lbl: '📤 Yükle', cls: 'bp', fn: async function () {
                    var fileInput = document.getElementById('photo-file');
                    if (!fileInput || !fileInput.files || !fileInput.files[0]) {
                        toast('Lütfen bir dosya seçin.', 'e'); return;
                    }
                    var file = fileInput.files[0];
                    if (file.size > 2 * 1024 * 1024) { toast('Dosya 2MB\'den küçük olmalı.', 'e'); return; }

                    try {
                        var sb = getSupabase();
                        var ext = file.name.split('.').pop().toLowerCase();
                        var path = (AppState.currentOrgId || 'default') + '/' + athleteId + '.' + ext;
                        var upRes = await sb.storage.from('athlete-photos').upload(path, file, { upsert: true, contentType: file.type });
                        if (upRes.error) { toast('Yükleme hatası: ' + upRes.error.message, 'e'); return; }

                        var urlRes = sb.storage.from('athlete-photos').getPublicUrl(path);
                        var photoUrl = urlRes.data.publicUrl;

                        var updateRes = await sb.from('athletes').update({ photo_url: photoUrl }).eq('id', athleteId);
                        if (updateRes.error) { toast('Kayıt hatası.', 'e'); return; }

                        var idx = (AppState.data.athletes || []).findIndex(function (a) { return a.id === athleteId; });
                        if (idx >= 0) AppState.data.athletes[idx].photoUrl = photoUrl;

                        toast('✅ Fotoğraf güncellendi!', 'g');
                        closeModal();
                        logActivity('photo_upload', 'athlete', athleteId, '');
                        go('athleteProfile', { id: athleteId });
                    } catch (e) {
                        toast('Hata: ' + e.message, 'e');
                    }
                }}
            ]
        );

        setTimeout(function () {
            var fi = document.getElementById('photo-file');
            if (!fi) return;
            fi.addEventListener('change', function () {
                var prev = document.getElementById('photo-preview');
                if (!prev || !fi.files || !fi.files[0]) return;
                var reader = new FileReader();
                reader.onload = function (e) {
                    prev.innerHTML = '<img src="' + e.target.result + '" style="max-width:100px;max-height:100px;border-radius:50%;object-fit:cover;margin-top:8px"/>';
                };
                reader.readAsDataURL(fi.files[0]);
            });
        }, 100);
    };

    // ─── 5. GELİŞMİŞ EXCEL EXPORT ─────────────────────────────────────────────────

    window.exportAthletes = function () {
        var sports = [];
        (AppState.data.athletes || []).forEach(function (a) {
            if (a.sp && sports.indexOf(a.sp) === -1) sports.push(a.sp);
        });
        var sportOpts = '<option value="">Tüm Branşlar</option>'
            + sports.map(function (s) { return '<option value="' + FormatUtils.escape(s) + '">' + FormatUtils.escape(s) + '</option>'; }).join('');

        modal('📊 Sporcu Listesi Dışa Aktar',
            '<div class="g2 mb2">'
            + '<div class="fgr"><label>Branş</label><select id="exp-sp">' + sportOpts + '</select></div>'
            + '<div class="fgr"><label>Durum</label><select id="exp-st"><option value="">Tümü</option><option value="active">Aktif</option><option value="inactive">Pasif</option></select></div>'
            + '</div>'
            + '<div class="fgr mb2"><label>Ekstra Sütunlar</label>'
            + '<div class="flex gap2 fwrap mt1" style="font-size:13px">'
            + '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="exp-health" checked/> Sağlık</label>'
            + '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="exp-addr" checked/> Adres</label>'
            + '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="exp-school"/> Okul</label>'
            + '</div></div>',
            [
                { lbl: 'İptal', cls: 'bs', fn: closeModal },
                { lbl: '📥 İndir', cls: 'bp', fn: function () {
                    var sp = document.getElementById('exp-sp').value;
                    var st = document.getElementById('exp-st').value;
                    var incHealth = document.getElementById('exp-health').checked;
                    var incAddr = document.getElementById('exp-addr').checked;
                    var incSchool = document.getElementById('exp-school').checked;

                    var list = (AppState.data.athletes || []).filter(function (a) {
                        return (!sp || a.sp === sp) && (!st || a.st === st);
                    });
                    if (!list.length) { toast('Uygun sporcu bulunamadı.', 'e'); return; }

                    var data = list.map(function (a) {
                        var row = {
                            Ad: a.fn, Soyad: a.ln, TC: a.tc,
                            'Doğum Tarihi': DateUtils.format(a.bd),
                            Cinsiyet: a.gn === 'E' ? 'Erkek' : 'Kız',
                            Telefon: a.ph, Email: a.em,
                            Branş: a.sp,
                            Sınıf: window.className ? className(a.clsId) : '',
                            Durum: window.statusLabel ? statusLabel(a.st) : a.st,
                            'Aylık Ücret': a.fee, 'Kan Grubu': a.blood || '',
                            Veli: a.pn, 'Veli Telefon': a.pph, 'Veli Email': a.pem || '',
                            'Kayıt Tarihi': DateUtils.format(a.rd)
                        };
                        if (incHealth) {
                            row['Sağlık Notu'] = a.health || '';
                            row['Boy (cm)'] = a.height || '';
                            row['Kilo (kg)'] = a.weight || '';
                        }
                        if (incAddr) {
                            row['Adres'] = a.address || '';
                            row['Şehir'] = a.city || '';
                        }
                        if (incSchool) row['Okul'] = a.school || '';
                        return row;
                    });
                    closeModal();
                    exportToExcel(data, 'Sporcular');
                    logActivity('export', 'athletes', '', list.length + ' sporcu');
                }}
            ]
        );
    };

    window.exportPayments = function () {
        modal('📊 Ödemeler Dışa Aktar',
            '<div class="g2 mb2">'
            + '<div class="fgr"><label>Başlangıç Tarihi</label><input id="exp-dt1" type="date" value="' + new Date().getFullYear() + '-01-01"/></div>'
            + '<div class="fgr"><label>Bitiş Tarihi</label><input id="exp-dt2" type="date" value="' + DateUtils.today() + '"/></div>'
            + '</div>'
            + '<div class="g2 mb2">'
            + '<div class="fgr"><label>Tür</label><select id="exp-ty"><option value="">Tümü</option><option value="income">Gelir</option><option value="expense">Gider</option></select></div>'
            + '<div class="fgr"><label>Durum</label><select id="exp-pst"><option value="">Tümü</option><option value="completed">Tamamlandı</option><option value="pending">Bekliyor</option><option value="overdue">Gecikmiş</option></select></div>'
            + '</div>',
            [
                { lbl: 'İptal', cls: 'bs', fn: closeModal },
                { lbl: '📥 İndir', cls: 'bp', fn: function () {
                    var dt1 = document.getElementById('exp-dt1').value;
                    var dt2 = document.getElementById('exp-dt2').value;
                    var ty = document.getElementById('exp-ty').value;
                    var pst = document.getElementById('exp-pst').value;
                    var list = (AppState.data.payments || []).filter(function (p) {
                        return (!dt1 || p.dt >= dt1) && (!dt2 || p.dt <= dt2)
                            && (!ty || p.ty === ty) && (!pst || p.st === pst);
                    });
                    if (!list.length) { toast('Uygun ödeme bulunamadı.', 'e'); return; }
                    var data = list.map(function (p) {
                        return {
                            Tarih: DateUtils.format(p.dt), Kişi: p.an,
                            Açıklama: p.serviceName || p.ds || '',
                            'Tutar (₺)': p.amt,
                            'KDV Oranı (%)': p.taxRate || 0,
                            'KDV Tutarı (₺)': p.taxAmount || 0,
                            'KDV Dahil Toplam (₺)': (p.amt || 0) + (p.taxAmount || 0),
                            Tür: p.ty === 'income' ? 'Gelir' : 'Gider',
                            Durum: window.statusLabel ? statusLabel(p.st) : p.st,
                            'Ödeme Yöntemi': p.payMethod || '',
                            Kategori: p.cat || ''
                        };
                    });
                    closeModal();
                    exportToExcel(data, 'Odemeler');
                    logActivity('export', 'payments', '', list.length + ' ödeme');
                }}
            ]
        );
    };

    // ─── 6. VERGİ DÖNEMİ RAPORU ──────────────────────────────────────────────────

    window.registerGoHook('after', function (page) {
        if (page !== 'accounting') return;
        setTimeout(function () {
            var main = document.getElementById('main');
            if (!main || main.querySelector('#tax-report')) return;

            var year = new Date().getFullYear();
            var payments = AppState.data.payments || [];
            var quarters = [
                { label: 'Q1 — Oca/Şub/Mar', months: [0, 1, 2] },
                { label: 'Q2 — Nis/May/Haz', months: [3, 4, 5] },
                { label: 'Q3 — Tem/Ağu/Eyl', months: [6, 7, 8] },
                { label: 'Q4 — Eki/Kas/Ara', months: [9, 10, 11] }
            ];

            var totalInc = 0, totalExp = 0, totalTax = 0;
            var rows = quarters.map(function (q) {
                var qp = payments.filter(function (p) {
                    if (!p.dt || p.st !== 'completed') return false;
                    var d = new Date(p.dt);
                    return d.getFullYear() === year && q.months.indexOf(d.getMonth()) !== -1;
                });
                var inc = qp.filter(function (p) { return p.ty === 'income'; })
                    .reduce(function (s, p) { return s + (p.amt || 0); }, 0);
                var exp = qp.filter(function (p) { return p.ty === 'expense'; })
                    .reduce(function (s, p) { return s + (p.amt || 0); }, 0);
                var tax = qp.reduce(function (s, p) { return s + (p.taxAmount || 0); }, 0);
                totalInc += inc; totalExp += exp; totalTax += tax;
                return '<tr style="border-bottom:1px solid var(--border)">'
                    + '<td style="padding:8px 6px" class="tw6 tsm">' + q.label + '</td>'
                    + '<td style="padding:8px 6px;text-align:right" class="tg">' + FormatUtils.currency(inc) + '</td>'
                    + '<td style="padding:8px 6px;text-align:right" class="tr2">' + FormatUtils.currency(exp) + '</td>'
                    + '<td style="padding:8px 6px;text-align:right" class="tb">' + FormatUtils.currency(inc - exp) + '</td>'
                    + '<td style="padding:8px 6px;text-align:right" class="tm">' + FormatUtils.currency(tax) + '</td>'
                    + '</tr>';
            }).join('');

            var html = '<div id="tax-report" class="card mt3">'
                + '<div class="tw6 tsm mb3">🧾 ' + year + ' Yılı Vergi / KDV Özeti</div>'
                + '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">'
                + '<thead><tr style="border-bottom:2px solid var(--border)">'
                + '<th style="text-align:left;padding:8px 6px">Dönem</th>'
                + '<th style="text-align:right;padding:8px 6px">Gelir</th>'
                + '<th style="text-align:right;padding:8px 6px">Gider</th>'
                + '<th style="text-align:right;padding:8px 6px">Net Kâr</th>'
                + '<th style="text-align:right;padding:8px 6px">KDV</th>'
                + '</tr></thead>'
                + '<tbody>' + rows + '</tbody>'
                + '<tfoot><tr style="border-top:2px solid var(--border);font-weight:700">'
                + '<td style="padding:8px 6px">Yıllık Toplam</td>'
                + '<td style="text-align:right;padding:8px 6px" class="tg">' + FormatUtils.currency(totalInc) + '</td>'
                + '<td style="text-align:right;padding:8px 6px" class="tr2">' + FormatUtils.currency(totalExp) + '</td>'
                + '<td style="text-align:right;padding:8px 6px" class="tb">' + FormatUtils.currency(totalInc - totalExp) + '</td>'
                + '<td style="text-align:right;padding:8px 6px" class="tm">' + FormatUtils.currency(totalTax) + '</td>'
                + '</tr></tfoot>'
                + '</table></div>'
                + '<div class="ts tm mt2">* KDV tutarları yalnızca ödeme formunda KDV girilmişse görünür.</div>'
                + '</div>';

            main.insertAdjacentHTML('beforeend', html);
        }, 150);
    });

    // ─── 7. PUSH BİLDİRİMLERİ ─────────────────────────────────────────────────────

    // Supabase Secrets'a VAPID_PUBLIC_KEY eklendikten sonra buraya yapıştırın.
    var VAPID_PUBLIC_KEY = '';

    function urlBase64ToUint8Array(base64String) {
        var padding = '='.repeat((4 - base64String.length % 4) % 4);
        var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        var rawData = window.atob(base64);
        var output = new Uint8Array(rawData.length);
        for (var i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
        return output;
    }

    window.subscribePushNotifications = async function () {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            toast('Bu tarayıcı push bildirimleri desteklemiyor.', 'e'); return;
        }
        if (!VAPID_PUBLIC_KEY) {
            toast('Push bildirimleri henüz yapılandırılmamış. VAPID_PUBLIC_KEY gereklidir.', 'e'); return;
        }
        try {
            var permission = await Notification.requestPermission();
            if (permission !== 'granted') { toast('Bildirim izni reddedildi.', 'e'); return; }

            var reg = await navigator.serviceWorker.ready;
            var sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            var sb = getSupabase();
            var keys = sub.toJSON().keys;
            await sb.from('push_subscriptions').upsert({
                user_name: AppState.currentUser.name || '',
                user_role: AppState.currentUser.role || '',
                endpoint: sub.endpoint,
                p256dh: keys.p256dh,
                auth_key: keys.auth,
                org_id: AppState.currentOrgId || null
            }, { onConflict: 'endpoint' });

            toast('✅ Push bildirimleri aktif edildi!', 'g');
        } catch (e) {
            toast('Push hatası: ' + e.message, 'e');
        }
    };

    window.unsubscribePushNotifications = async function () {
        try {
            var reg = await navigator.serviceWorker.ready;
            var sub = await reg.pushManager.getSubscription();
            if (!sub) { toast('Zaten abone değilsiniz.', 'e'); return; }
            var sb = getSupabase();
            await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            await sub.unsubscribe();
            toast('Push bildirimleri devre dışı bırakıldı.', 'g');
        } catch (e) {
            toast('Hata: ' + e.message, 'e');
        }
    };

    window.registerGoHook('after', function (page) {
        if (page !== 'settings') return;
        setTimeout(function () {
            var main = document.getElementById('main');
            if (!main || main.querySelector('#push-card')) return;
            main.insertAdjacentHTML('beforeend',
                '<div id="push-card" class="card mt3">'
                + '<div class="tw6 tsm mb2">🔔 Push Bildirimleri</div>'
                + '<p class="ts tm mb2">Gecikmiş ödemelerde tarayıcı bildirimi alın.</p>'
                + (!VAPID_PUBLIC_KEY
                    ? '<div class="al al-y mb2" style="font-size:12px">VAPID_PUBLIC_KEY yapılandırılmamış. Supabase Secrets\'a ekleyin.</div>'
                    : '')
                + '<div class="flex gap2">'
                + '<button class="btn bp" onclick="subscribePushNotifications()">🔔 Abone Ol</button>'
                + '<button class="btn bs" onclick="unsubscribePushNotifications()">🔕 İptal Et</button>'
                + '</div></div>'
            );
        }, 150);
    });

    // ─── 8. ŞİFRE SIFIRLAMA ──────────────────────────────────────────────────────

    window.showPasswordResetModal = function () {
        modal('🔑 Şifremi Unuttum',
            '<p class="ts tm mb2">TC kimlik numaranızı ve kayıtlı e-posta adresinizi girin.</p>'
            + '<div class="fgr mb2"><label>TC Kimlik No</label>'
            + '<input id="pr-tc" type="text" inputmode="numeric" maxlength="11" placeholder="11 haneli TC"/></div>'
            + '<div class="fgr mb2"><label>Rol</label>'
            + '<select id="pr-role"><option value="sporcu">Sporcu / Veli</option><option value="coach">Antrenör</option></select></div>'
            + '<div class="fgr mb2"><label>E-posta Adresi</label>'
            + '<input id="pr-email" type="email" placeholder="ornek@email.com"/></div>'
            + '<div id="pr-result"></div>',
            [
                { lbl: 'İptal', cls: 'bs', fn: closeModal },
                { lbl: '📧 Gönder', cls: 'bp', fn: async function () {
                    var tc = (document.getElementById('pr-tc') || {}).value || '';
                    var role = (document.getElementById('pr-role') || {}).value || '';
                    var email = (document.getElementById('pr-email') || {}).value || '';
                    var resultEl = document.getElementById('pr-result');
                    if (tc.length !== 11) { toast('Geçerli bir TC giriniz.', 'e'); return; }
                    if (!email.includes('@')) { toast('Geçerli bir e-posta giriniz.', 'e'); return; }
                    if (resultEl) resultEl.innerHTML = '<div class="ts tm">Gönderiliyor...</div>';
                    try {
                        var sb = getSupabase();
                        var res = await sb.functions.invoke('reset-password', {
                            body: { tc: tc.trim(), role: role, email: email.trim() }
                        });
                        if (res.error) throw res.error;
                        if (resultEl) resultEl.innerHTML = '<div class="al al-g">✅ TC ve e-posta eşleşiyorsa birkaç dakika içinde mail gelecektir.</div>';
                    } catch (e) {
                        if (resultEl) resultEl.innerHTML = '<div class="al al-r">Hata oluştu. E-posta servisi (RESEND_API_KEY) yapılandırılmamış olabilir.</div>';
                    }
                }}
            ]
        );
    };

    // URL'de ?reset=TOKEN parametresi varsa şifre sıfırlama formunu göster
    (function checkResetToken() {
        var params = new URLSearchParams(window.location.search);
        var token = params.get('reset');
        if (!token) return;

        var attempts = 0;
        var interval = setInterval(function () {
            attempts++;
            if (attempts > 50 || !window.modal) return;
            clearInterval(interval);
            setTimeout(function () {
                modal('🔑 Yeni Şifre Belirle',
                    '<div class="fgr mb2"><label>Yeni Şifre (min 6 karakter)</label>'
                    + '<input id="rp-new" type="password" placeholder="Yeni şifre"/></div>'
                    + '<div class="fgr mb2"><label>Şifre Tekrar</label>'
                    + '<input id="rp-confirm" type="password" placeholder="Şifreyi tekrarlayın"/></div>'
                    + '<div id="rp-result"></div>',
                    [
                        { lbl: 'İptal', cls: 'bs', fn: function () { closeModal(); history.replaceState(null, '', '/'); } },
                        { lbl: '✅ Güncelle', cls: 'bp', fn: async function () {
                            var np = (document.getElementById('rp-new') || {}).value || '';
                            var cp = (document.getElementById('rp-confirm') || {}).value || '';
                            var resultEl = document.getElementById('rp-result');
                            if (np.length < 6) { toast('Şifre en az 6 karakter olmalı.', 'e'); return; }
                            if (np !== cp) { toast('Şifreler eşleşmiyor.', 'e'); return; }
                            try {
                                var sb = getSupabase();
                                var res = await sb.functions.invoke('reset-password', {
                                    body: { token: token, newPassword: np }
                                });
                                if (res.error) throw res.error;
                                if (resultEl) resultEl.innerHTML = '<div class="al al-g">✅ Şifreniz güncellendi! Giriş yapabilirsiniz.</div>';
                                setTimeout(function () { closeModal(); history.replaceState(null, '', '/'); }, 2000);
                            } catch (e) {
                                if (resultEl) resultEl.innerHTML = '<div class="al al-r">Token geçersiz veya süresi dolmuş.</div>';
                            }
                        }}
                    ]
                );
            }, 800);
        }, 200);
    })();

})();
