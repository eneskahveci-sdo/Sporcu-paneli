// ============================================================
// SPORCU PANELİ — Ödeme Akışı İyileştirmeleri v1.0
// 1. spOdemeler: 3 adımlı wizard (Plan Seç → Yöntem → Onayla)
// 2. initiatePayTRPayment: yükleme durumu göstergesi
// 3. editPay: Gelişmiş alanlar gizlenebilir bölümde
// ============================================================

(function () {
    'use strict';

    // ─── WIZARD ADIM ÇUBUĞU ─────────────────────────────────────────────────────

    function _wzStepBar(activeStep) {
        var labels = ['Plan Seç', 'Yöntem', 'Onayla'];
        var out = '<div class="sp-wz-bar mb3">';
        labels.forEach(function (lbl, i) {
            var n = i + 1;
            var cls = n < activeStep ? 'done' : (n === activeStep ? 'active' : '');
            out += '<div class="sp-wz-step ' + cls + '">'
                + '<div class="sp-wz-dot">' + (n < activeStep ? '✓' : n) + '</div>'
                + '<div class="sp-wz-lbl">' + lbl + '</div>'
                + '</div>';
            if (i < 2) out += '<div class="sp-wz-line' + (n < activeStep ? ' done' : '') + '"></div>';
        });
        return out + '</div>';
    }

    window._spWizardGoStep = function (step) {
        AppState.ui.spWizardStep = step;
        var el = document.getElementById('sp-content');
        if (el) el.innerHTML = spOdemeler();
    };

    // ─── spOdemeler: 3 ADIMLI WIZARD ────────────────────────────────────────────

    window.spOdemeler = function () {
        var a = AppState.currentSporcu;
        if (!a) return '';

        var activeSubTab = AppState.ui.spPaySubTab || 'aidat';
        var s = AppState.data.settings || {};
        var hasPayTR = !!(s.paytrActive && s.paytrMerchantId);
        var hasBank  = !!(s.iban || s.bankName);

        var allPay   = (AppState.data.payments || []).filter(function (p) { return p.aid === a.id; });
        var typePay  = allPay.filter(function (p) { return (p.paymentType || 'aidat') === activeSubTab; });

        var completed        = typePay.filter(function (p) { return p.st === 'completed'; }).sort(function (x, y) { return new Date(y.dt) - new Date(x.dt); });
        var awaitApproval    = typePay.filter(function (p) { return p.notifStatus === 'pending_approval'; }).sort(function (x, y) { return new Date(y.dt) - new Date(x.dt); });
        var pendingPlans     = typePay.filter(function (p) { return p.st !== 'completed' && p.notifStatus !== 'pending_approval'; }).sort(function (x, y) {
            if (!x.dt && !y.dt) return 0; if (!x.dt) return 1; if (!y.dt) return -1;
            return x.dt.localeCompare(y.dt);
        });

        var totalPaid = completed.reduce(function (acc, p) { return acc + (p.amt || 0); }, 0);
        var totalDebt = pendingPlans.reduce(function (acc, p) { return acc + (p.amt || 0); }, 0);
        var tabLabel  = activeSubTab === 'aidat' ? 'Aidat' : 'Spor Malzemesi';

        var mIcon  = function (m) { return ({nakit:'💵',kredi_karti:'💳',havale:'🏦',paytr:'🔵'})[m] || '💰'; };
        var mLabel = function (m) { return ({nakit:'Nakit',kredi_karti:'Kredi Kartı',havale:'Havale/EFT',paytr:'PayTR Online'})[m] || (m || 'Ödeme'); };

        // Plan seçimi yoksa her zaman adım 1'e sıfırla
        if (!AppState.ui.activePlanIds || AppState.ui.activePlanIds.length === 0) {
            AppState.ui.spWizardStep = 1;
        }
        var step = AppState.ui.spWizardStep || 1;
        var html = '';

        // ════════════════════════════════════════════════════════════════════════
        // ADIM 1: Plan Seçimi
        // ════════════════════════════════════════════════════════════════════════
        if (step === 1) {

            // Alt sekme (Aidat / Spor Malzemesi)
            html += '<div class="tab-nav mb3" style="max-width:400px">'
                + '<button class="tab-btn ' + (activeSubTab === 'aidat' ? 'active' : '') + '" onclick="AppState.ui.spPaySubTab=\'aidat\';AppState.ui.spWizardStep=1;document.getElementById(\'sp-content\').innerHTML=spOdemeler()">💰 Aidatlar</button>'
                + '<button class="tab-btn ' + (activeSubTab === 'spor_malzemesi' ? 'active' : '') + '" onclick="AppState.ui.spPaySubTab=\'spor_malzemesi\';AppState.ui.spWizardStep=1;document.getElementById(\'sp-content\').innerHTML=spOdemeler()">🏋️ Spor Malzemeleri</button>'
                + '</div>';

            // Özet istatistikler
            html += '<div class="sp-stats-row mb3">'
                + '<div class="stat-box"><div class="stat-box-value tg">' + FormatUtils.currency(totalPaid) + '</div><div class="stat-box-label">Ödenen</div></div>'
                + '<div class="stat-box"><div class="stat-box-value ' + (totalDebt > 0 ? 'tr2' : 'tg') + '">' + FormatUtils.currency(totalDebt) + '</div><div class="stat-box-label">Borç</div></div>'
                + '<div class="stat-box"><div class="stat-box-value ' + (awaitApproval.length > 0 ? 'to' : 'tg') + '">' + awaitApproval.length + '</div><div class="stat-box-label">Onay Bekleyen</div></div>'
                + '</div>';

            // Bekleyen planlar
            if (pendingPlans.length > 0) {
                var planRows = '';
                pendingPlans.forEach(function (p) {
                    var isOverdue = p.st === 'overdue';
                    var today = DateUtils.today();
                    var isLate = !isOverdue && p.dt && p.dt < today;
                    var badge = (isOverdue || isLate) ? '<span class="bg bg-r">Gecikmiş</span>' : '<span class="bg bg-y">Bekliyor</span>';
                    planRows += '<div class="sp-plan-cb-row" onclick="var cb=this.querySelector(\'.sp-plan-cb\');cb.checked=!cb.checked;this.classList.toggle(\'checked\',cb.checked);_spUpdateBulkTotal()">'
                        + '<input type="checkbox" class="sp-plan-cb" value="' + FormatUtils.escape(p.id) + '" data-amt="' + (p.amt || 0) + '" onclick="event.stopPropagation();this.parentElement.classList.toggle(\'checked\',this.checked);_spUpdateBulkTotal()"/>'
                        + '<div style="flex:1;min-width:0"><div class="tw6 ts">' + ((isOverdue || isLate) ? '⚠️ ' : '📅 ') + FormatUtils.escape(p.ds || p.serviceName || tabLabel) + '</div>'
                        + '<div class="ts tm mt1">Vade: ' + DateUtils.format(p.dt) + '</div></div>'
                        + '<div style="text-align:right;flex-shrink:0"><div class="tw6 ts tg">' + FormatUtils.currency(p.amt) + '</div>' + badge + '</div>'
                        + '</div>';
                });

                html += '<div class="card mb3" style="border-left:3px solid var(--red)">'
                    + '<div class="tw6 ts mb2" style="color:var(--red)">📋 Bekleyen Ödemelerim (' + pendingPlans.length + ')</div>'
                    + '<div class="sp-debt-bar mb3"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span class="ts tm">Toplam Borç</span><span class="tw6 tr2">' + FormatUtils.currency(totalDebt) + '</span></div><div class="prb"><div style="height:100%;background:var(--red);border-radius:4px;width:100%"></div></div></div>'
                    + '<div class="flex fjb fca gap2 mb2"><button type="button" class="btn btn-xs bs" onclick="selectAllSpPlans()">✅ Tümünü Seç</button>'
                    + '<div id="sp-bulk-total" class="sp-bulk-total" style="display:none"><span class="ts tm">Seçilen:</span><span class="tw6 tg" id="sp-bulk-total-val">₺0</span></div></div>'
                    + '<div class="plan-list" style="gap:8px">' + planRows + '</div>'
                    + '<button class="btn bp w100 mt3" id="sp-bulk-pay-btn" style="display:none" onclick="spPayBulk()">İleri → Ödeme Yöntemi Seç</button>'
                    + '</div>';
            }

            // Onay bekleyen bildirimler
            if (awaitApproval.length > 0) {
                html += '<div class="card mb3" style="border-left:3px solid var(--yellow)"><div class="tw6 ts mb2" style="color:var(--yellow)">⏳ Onay Bekleyen Bildirimlerim</div>';
                awaitApproval.forEach(function (p) {
                    html += '<div class="payment-card" style="border-color:rgba(234,179,8,.35);gap:10px">'
                        + '<div style="font-size:24px;flex-shrink:0">' + mIcon(p.payMethod) + '</div>'
                        + '<div class="payment-info"><div class="payment-amount" style="font-size:16px;color:var(--yellow)">' + FormatUtils.currency(p.amt) + '</div>'
                        + '<div class="payment-date">' + mLabel(p.payMethod) + ' • ' + DateUtils.format(p.dt) + '</div>'
                        + '<div class="ts tm mt1">' + FormatUtils.escape(p.ds || p.serviceName || tabLabel) + '</div></div>'
                        + '<span class="bg bg-y" style="flex-shrink:0;white-space:nowrap">Bekliyor</span></div>';
                });
                html += '</div>';
            }

            // Ödeme geçmişi
            html += '<div class="card"><div class="tw6 tsm mb3">✅ Ödeme Geçmişim</div>';
            if (completed.length === 0) {
                html += '<div class="empty-state"><div style="font-size:44px;margin-bottom:10px">📭</div><div class="tw6 ts">Henüz onaylanmış ödeme yok</div></div>';
            } else {
                completed.forEach(function (p) {
                    html += '<div class="payment-card" style="gap:12px"><div style="font-size:28px;flex-shrink:0">' + mIcon(p.payMethod) + '</div>'
                        + '<div class="payment-info" style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px"><span class="payment-amount tg">' + FormatUtils.currency(p.amt) + '</span></div>'
                        + '<div class="payment-date">' + DateUtils.format(p.dt) + ' • ' + FormatUtils.escape(p.serviceName || p.ds || tabLabel) + '</div>'
                        + '<div class="ts tm" style="margin-top:2px">' + mLabel(p.payMethod) + '</div></div>'
                        + '<div class="flex fc gap2" style="align-items:flex-end;flex-shrink:0"><span class="bg bg-g">Ödendi ✓</span>'
                        + '<button class="btn btn-xs bpur" onclick="generateReceipt(\'' + p.id + '\')">🧾 Makbuz</button></div></div>';
                });
            }
            html += '</div>';
        }

        // ════════════════════════════════════════════════════════════════════════
        // ADIM 2: Yöntem Seçimi
        // ════════════════════════════════════════════════════════════════════════
        else if (step === 2) {
            html += _wzStepBar(2);

            // Seçilen planların özeti
            var selIds   = AppState.ui.activePlanIds || [];
            var selPlans = selIds.map(function (id) { return (AppState.data.payments || []).find(function (p) { return p.id === id; }); }).filter(Boolean);
            var selTotal = selPlans.reduce(function (acc, p) { return acc + (p.amt || 0); }, 0);

            html += '<div class="card mb3" style="background:rgba(34,197,94,.06);border-color:var(--green)">'
                + '<div class="tw6 ts mb2">📋 Seçilen Planlar</div>';
            selPlans.forEach(function (p) {
                html += '<div class="flex fjb fca mb1"><span class="ts">' + FormatUtils.escape(p.ds || p.serviceName || tabLabel) + '</span><span class="tw6 tg">' + FormatUtils.currency(p.amt) + '</span></div>';
            });
            if (selPlans.length > 1) {
                html += '<div style="border-top:1px solid var(--border);margin-top:8px;padding-top:8px" class="flex fjb fca"><span class="tw6 ts">Toplam</span><span class="tw6 tg tsm">' + FormatUtils.currency(selTotal) + '</span></div>';
            }
            html += '</div>';

            // Ödeme yöntemi kartları
            html += '<div class="card mb3"><div class="tw6 tsm mb3">💳 Ödeme Yöntemi Seçin</div><div class="pay-choice-grid mb2">';
            if (hasPayTR) {
                html += '<div class="pay-choice-card" id="pc-paytr" onclick="selectPayChoice(\'paytr\')">'
                    + '<div class="pay-choice-icon">🔵</div>'
                    + '<div class="pay-choice-title">Online Kredi Kartı</div>'
                    + '<div class="pay-choice-desc">PayTR güvenli altyapısı ile kartla ödeyin</div></div>';
            }
            if (hasBank) {
                html += '<div class="pay-choice-card" id="pc-havale" onclick="selectPayChoice(\'havale\')">'
                    + '<div class="pay-choice-icon">🏦</div>'
                    + '<div class="pay-choice-title">Havale / EFT</div>'
                    + '<div class="pay-choice-desc">Banka havalesi ile ödeme yapın</div></div>';
            }
            if (!hasPayTR && !hasBank) {
                html += '<div class="al al-y" style="grid-column:1/-1;border-radius:10px;padding:14px"><div class="tw6 mb1">⚠️ Ödeme yöntemi yapılandırılmamış</div><p class="ts tm">Lütfen akademi yönetimine başvurun.</p></div>';
            }
            html += '</div>';
            html += '<div id="pay-method-detail" class="mb2"></div>';
            html += '</div>';

            html += '<div class="flex gap2 mt2">'
                + '<button class="btn bs" style="flex:1" onclick="_spWizardGoStep(1)">← Geri</button>'
                + '<button class="btn bp" style="flex:2" id="wz-next-btn" disabled onclick="_spWizardGoStep(3)">İleri → Onayla</button>'
                + '</div>';
        }

        // ════════════════════════════════════════════════════════════════════════
        // ADIM 3: Onay ve Ödeme
        // ════════════════════════════════════════════════════════════════════════
        else if (step === 3) {
            html += _wzStepBar(3);

            var method    = AppState.ui.selectedPayMethod;
            var selIds3   = AppState.ui.activePlanIds || [];
            var selPlans3 = selIds3.map(function (id) { return (AppState.data.payments || []).find(function (p) { return p.id === id; }); }).filter(Boolean);
            var selTotal3 = selPlans3.reduce(function (acc, p) { return acc + (p.amt || 0); }, 0);

            // Özet kart
            html += '<div class="card mb3"><div class="tw6 tsm mb3">✅ Ödeme Özeti</div>';
            selPlans3.forEach(function (p) {
                html += '<div class="flex fjb fca gap2 mb2"><span class="ts">' + FormatUtils.escape(p.ds || p.serviceName || 'Aidat') + '</span><span class="tw6 tg">' + FormatUtils.currency(p.amt) + '</span></div>';
            });
            html += '<div style="border-top:2px solid var(--border);margin-top:8px;padding-top:12px" class="flex fjb fca gap2">'
                + '<span class="tw6">Toplam Tutar</span><span class="tw6 tg tsm">' + FormatUtils.currency(selTotal3) + '</span></div>';
            html += '<div class="flex fca gap2 mt2 ts"><span class="tm">Yöntem:</span><span class="tw6">'
                + (method === 'paytr' ? '🔵 PayTR Online' : '🏦 Havale/EFT') + '</span></div>';
            html += '</div>';

            // Yönteme göre detay
            if (method === 'havale') {
                html += '<div class="card mb3" style="border-left:3px solid var(--blue2)">'
                    + '<div class="tw6 ts mb2">🏦 Havale / EFT Bilgileri</div>';
                if (s.bankName)    html += '<div class="ts mb1"><span class="tm">Banka: </span><strong>' + FormatUtils.escape(s.bankName) + '</strong></div>';
                if (s.accountName) html += '<div class="ts mb1"><span class="tm">Alıcı: </span><strong>' + FormatUtils.escape(s.accountName) + '</strong></div>';
                if (s.iban)        html += '<div class="ts mb2"><span class="tm">IBAN: </span><code style="user-select:all;font-size:13px">' + FormatUtils.escape(s.iban) + '</code></div>';
                html += '<div class="ts tm mb3">Havaleyi gönderdikten sonra aşağıdaki butona tıklayın. Yönetici ödemenizi onaylayacak.</div>'
                    + '<div class="fgr"><label>Açıklama <span class="tm ts">(opsiyonel)</span></label><input id="sp-desc" placeholder="Ödeme notu ekleyin..."/></div>'
                    + '</div>';
            } else if (method === 'paytr') {
                html += '<div class="card mb3" style="border-left:3px solid #3b82f6">'
                    + '<div class="ts tm">Devam butonuna tıkladığınızda güvenli ödeme sayfasına yönlendirileceksiniz. 256-bit SSL ile korunan PayTR altyapısı.</div>'
                    + '</div>';
            }

            html += '<div class="flex gap2 mt2">'
                + '<button class="btn bs" style="flex:1" onclick="_spWizardGoStep(2)">← Geri</button>'
                + '<button class="btn bp" style="flex:2" id="pay-submit-btn" onclick="submitSpPayment()">'
                + (method === 'paytr' ? '🔵 PayTR ile Öde' : '✅ Havale Bildirimi Gönder')
                + '</button>'
                + '</div>';
        }

        return html;
    };

    // ─── spPayBulk OVERRIDE: Adım 2'ye geç ─────────────────────────────────────

    window.spPayBulk = function () {
        var cbs = document.querySelectorAll('.sp-plan-cb:checked');
        var ids = [];
        cbs.forEach(function (cb) { ids.push(cb.value); });
        if (ids.length === 0) { toast('Lütfen en az bir plan seçin.', 'e'); return; }
        AppState.ui.activePlanIds  = ids;
        AppState.ui.activePlanId   = ids[0];
        AppState.ui.selectedPayMethod = null;
        _spWizardGoStep(2);
    };

    // ─── selectPayChoice OVERRIDE: Wizard "İleri" butonunu aç ──────────────────

    var _prevSelectPayChoice = window.selectPayChoice;
    window.selectPayChoice = function (choice) {
        if (typeof _prevSelectPayChoice === 'function') _prevSelectPayChoice(choice);
        // Wizard adım 2: İleri butonunu etkinleştir
        var nextBtn = document.getElementById('wz-next-btn');
        if (nextBtn) nextBtn.disabled = false;
        // Seçili kartı vurgula
        document.querySelectorAll('.pay-choice-card').forEach(function (c) { c.classList.remove('active'); });
        var sel = document.getElementById('pc-' + choice);
        if (sel) sel.classList.add('active');
    };

    // ─── initiatePayTRPayment OVERRIDE: Yükleme durumu ──────────────────────────

    var _prevInitiatePayTR = window.initiatePayTRPayment;
    window.initiatePayTRPayment = async function (amt, desc) {
        var btn = document.getElementById('pay-submit-btn');
        var origHtml = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Ödeme hazırlanıyor...'; }
        try {
            await _prevInitiatePayTR(amt, desc);
        } finally {
            if (btn && document.body.contains(btn)) {
                btn.disabled = false;
                btn.innerHTML = origHtml;
            }
        }
    };

    // ─── editPay OVERRIDE: Gelişmiş alanları gizle ──────────────────────────────

    window.editPay = function (id) {
        var p = id ? (AppState.data.payments || []).find(function (x) { return x.id === id; }) : null;
        var isNew = !p;
        var showAdv = !!(p && p.payMethod);

        var catOpts = EXPENSE_CATEGORIES.map(function (c) {
            return '<option value="' + c.id + '"' + (p && p.cat === c.id ? ' selected' : '') + '>' + c.icon + ' ' + c.name + '</option>';
        }).join('');

        var formHtml = ''
            // Sporcu
            + '<div class="fgr mb2"><label>Sporcu / Kişi</label><select id="p-aid"><option value="">Bağımsız İşlem</option>'
            + (AppState.data.athletes || []).map(function (a) {
                return '<option value="' + FormatUtils.escape(a.id) + '"' + (p && p.aid === a.id ? ' selected' : '') + '>'
                    + FormatUtils.escape((a.fn || '') + ' ' + (a.ln || '')) + '</option>';
            }).join('') + '</select></div>'
            // Tutar + Tür
            + '<div class="g21"><div class="fgr"><label>Tutar (₺) *</label><input id="p-amt" type="number" value="' + (p ? p.amt : '') + '"/></div>'
            + '<div class="fgr"><label>İşlem Türü</label><select id="p-ty" onchange="document.getElementById(\'p-cat-row\').style.display=this.value===\'expense\'?\'block\':\'none\'">'
            + '<option value="income"' + (p && p.ty === 'income' ? ' selected' : '') + '>Gelir (Tahsilat)</option>'
            + '<option value="expense"' + (p && p.ty === 'expense' ? ' selected' : '') + '>Gider (Ödeme)</option>'
            + '</select></div></div>'
            // Gider kategorisi (koşullu)
            + '<div id="p-cat-row" style="display:' + (p && p.ty === 'expense' ? 'block' : 'none') + '" class="mt2">'
            + '<div class="fgr"><label>Gider Kategorisi</label><select id="p-cat"><option value="">Kategori Seçin</option>' + catOpts + '</select></div></div>'
            // Açıklama
            + '<div class="fgr mt2"><label>Açıklama / Hizmet Adı</label><input id="p-ds" value="' + FormatUtils.escape(p ? (p.ds || '') : '') + '" placeholder="Örn: Ekim Ayı Aidatı"/></div>'
            // Durum + Tarih
            + '<div class="g21 mt2">'
            + '<div class="fgr"><label>Durum</label><select id="p-st">'
            + '<option value="completed"' + (p && p.st === 'completed' ? ' selected' : '') + '>Ödendi</option>'
            + '<option value="pending"'   + (p && p.st === 'pending'   ? ' selected' : '') + '>Bekliyor</option>'
            + '<option value="overdue"'   + (p && p.st === 'overdue'   ? ' selected' : '') + '>Gecikti</option>'
            + '</select></div>'
            + '<div class="fgr"><label>Tarih</label><input id="p-dt" type="date" value="' + FormatUtils.escape(p ? (p.dt || DateUtils.today()) : DateUtils.today()) + '"/></div>'
            + '</div>'
            // Gelişmiş bölüm
            + '<div class="mt3">'
            + '<button type="button" class="btn btn-xs bs w100" style="display:flex;justify-content:space-between" '
            + 'onclick="var d=document.getElementById(\'p-adv\');var open=d.style.display!==\'none\';d.style.display=open?\'none\':\'block\';this.innerHTML=open?\'Gelişmiş ▾\':\'Gelişmiş ▴\'">'
            + (showAdv ? 'Gelişmiş ▴' : 'Gelişmiş ▾')
            + '</button>'
            + '<div id="p-adv" style="display:' + (showAdv ? 'block' : 'none') + '">'
            + '<div class="fgr mt2"><label>Ödeme Yöntemi</label><select id="p-method">'
            + '<option value="">Belirtilmedi</option>'
            + '<option value="nakit"'       + (p && p.payMethod === 'nakit'       ? ' selected' : '') + '>💵 Nakit</option>'
            + '<option value="havale"'      + (p && p.payMethod === 'havale'      ? ' selected' : '') + '>🏦 Havale/EFT</option>'
            + '<option value="kredi_karti"' + (p && p.payMethod === 'kredi_karti' ? ' selected' : '') + '>💳 Kredi Kartı</option>'
            + '<option value="paytr"'       + (p && p.payMethod === 'paytr'       ? ' selected' : '') + '>🔵 PayTR Online</option>'
            + '</select></div>'
            + '</div></div>';

        modal(isNew ? 'Yeni Finansal İşlem' : 'İşlem Detayı', formHtml, [
            { lbl: 'İptal', cls: 'bs', fn: closeModal },
            ...(p && p.st === 'completed' ? [{ lbl: '🧾 Makbuz', cls: 'bpur', fn: function () { closeModal(); generateReceipt(p.id); } }] : []),
            {
                lbl: 'Kaydet', cls: 'bp', fn: async function () {
                    var aid = UIUtils.getValue('p-aid');
                    var ath = (AppState.data.athletes || []).find(function (a) { return a.id === aid; });
                    var ds  = UIUtils.getValue('p-ds');
                    var ty  = UIUtils.getValue('p-ty');

                    if (!AppState.currentOrgId || !AppState.currentBranchId) {
                        toast('Organizasyon bilgileri eksik. Lütfen çıkış yapıp tekrar giriş yapınız.', 'e');
                        return;
                    }

                    var obj = {
                        id:          p ? p.id : generateId(),
                        aid:         aid,
                        an:          ath ? ((ath.fn || '') + ' ' + (ath.ln || '')) : (ds || 'Bilinmiyor'),
                        amt:         UIUtils.getNumber('p-amt'),
                        ds:          ds,
                        st:          UIUtils.getValue('p-st'),
                        dt:          UIUtils.getValue('p-dt'),
                        ty:          ty,
                        cat:         ty === 'expense' ? UIUtils.getValue('p-cat') : (p ? (p.cat || '') : ''),
                        serviceName: ds,
                        payMethod:   UIUtils.getValue('p-method') || (p ? p.payMethod : '') || '',
                        orgId:       p ? (p.orgId    || AppState.currentOrgId)    : AppState.currentOrgId,
                        branchId:    p ? (p.branchId || AppState.currentBranchId) : AppState.currentBranchId,
                        source:      p ? (p.source      || 'manual') : 'manual',
                        notifStatus: p ? (p.notifStatus || '')       : '',
                        slipCode:    p ? (p.slipCode    || '')       : '',
                        receiptNo:   p ? (p.receiptNo   || '')       : '',
                        paymentType: p ? (p.paymentType || 'aidat')  : 'aidat'
                    };

                    if (!obj.amt || obj.amt <= 0) { toast(i18n[AppState.lang].fillRequired, 'e'); return; }
                    if (obj.amt > 99999) { toast('Tutar 99.999 TL\'yi geçemez.', 'e'); return; }

                    var result = await DB.upsert('payments', DB.mappers.fromPayment(obj));
                    if (result) {
                        if (isNew) {
                            if (!AppState.data.payments) AppState.data.payments = [];
                            AppState.data.payments.push(obj);
                        } else {
                            var idx = (AppState.data.payments || []).findIndex(function (x) { return x.id === obj.id; });
                            if (idx >= 0) AppState.data.payments[idx] = obj;
                        }
                        toast(i18n[AppState.lang].saveSuccess, 'g');
                        closeModal();
                        go('payments');
                    }
                }
            }
        ]);
    };

})();
