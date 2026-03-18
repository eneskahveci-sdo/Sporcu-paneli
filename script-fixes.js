// ═══════════════════════════════════════════════════════════
// HATA DÜZELTMELERİ V10 — script.js'den SONRA yüklenir
//
// V10 DEĞİŞİKLİKLER:
// - PayTR initiatePayTRPayment v4: email .local fix, TL basket, detaylı debug
// - PayTR Edge Function v5 ile uyumlu
// - V9 özellikleri korundu
// ═══════════════════════════════════════════════════════════

console.log('script-fixes.js V10 yukleniyor...');

// ────────────────────────────────────────────────────────
// CROSS-ORIGIN "Script error." FILTRESİ
// Tarayıcılar, farklı origin'den yüklenen script hatalarını
// güvenlik nedeniyle "Script error." olarak maskeler.
// Bu maskelenmiş hatalar bilgi içermez ve kullanıcıya
// gereksiz toast bildirimi gösterilmesini engelliyoruz.
// ────────────────────────────────────────────────────────
(function() {
    var _origOnerror = window.onerror;
    window.onerror = function(msg, url, line, col, error) {
        // Cross-origin script hataları: msg="Script error.", url="", line=0, col=0, error=null
        if (msg === 'Script error.' && !url && line === 0 && col === 0 && !error) {
            // Sadece debug için log, toast gösterme
            console.warn('[CrossOrigin] Maskelenmiş cross-origin hatası engellendi');
            return true; // Hatanın yayılmasını durdur
        }
        if (typeof _origOnerror === 'function') {
            return _origOnerror.apply(this, arguments);
        }
        return false;
    };
})();

// ────────────────────────────────────────────────────────
// 0) KRİTİK FIX: spTab() — data-tab attribute bazlı eşleştirme
//    Orijinal spTab textContent ile eşleştiriyordu, i18n bozuyordu
// ────────────────────────────────────────────────────────
window.spTab = function(tab) {
    // Tab butonlarını data-tab attribute ile eşleştir
    document.querySelectorAll('.sp-tab').forEach(function(el) {
        var elTab = el.getAttribute('data-tab');
        if (elTab) {
            el.classList.toggle('on', elTab === tab);
        }
    });

    var content = document.getElementById('sp-content');
    var pages = {
        'profil': spProfil,
        'yoklama': spYoklama,
        'odemeler': spOdemeler,
        'odeme-yap': spOdemeYap
    };

    // Ödeme sekmelerine geçince DB'den taze payments çek
    if ((tab === 'odeme-yap' || tab === 'odemeler') && AppState.currentSporcu) {
        if (content) content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text2)">⏳ Yükleniyor...</div>';
        refreshSporcuPayments().then(function() {
            if (content && pages[tab]) content.innerHTML = pages[tab]();
        });
        return;
    }

    if (content && pages[tab]) content.innerHTML = pages[tab]();
};

// ────────────────────────────────────────────────────────
// 1) KVKK ve KULLANIM ŞARTLARI — Bağımsız overlay
// ────────────────────────────────────────────────────────
window.showLegal = function(type) {
    var kvkkBody = '<div style="line-height:1.8;color:var(--text2);max-height:60vh;overflow-y:auto;padding-right:8px;-webkit-overflow-scrolling:touch">'
        + '<h2 style="color:var(--text);font-size:16px;font-weight:700;margin:0 0 12px">Dragos Futbol Akademisi \u2013 Ki\u015Fisel Verilerin Korunmas\u0131</h2>'
        + '<p style="margin-bottom:10px;font-size:13px">6698 say\u0131l\u0131 KVKK kapsam\u0131nda veri sorumlusu Dragos Futbol Akademisi\'dir.</p>'
        + '<p style="font-size:14px;font-weight:600;margin:14px 0 6px">İşlenen Veriler:</p>'
        + '<ul style="margin:6px 0 12px 20px;font-size:13px"><li>Ad, soyad, telefon, e-posta</li><li>Veli ve sporcu bilgileri</li><li>Doğum tarihi, iletişim mesajları</li></ul>'
        + '<p style="font-size:14px;font-weight:600;margin:14px 0 6px">Haklar\u0131n\u0131z:</p>'
        + '<ul style="margin:6px 0 12px 20px;font-size:13px"><li>Verilerinizin işlenip işlenmediğini öğrenme</li><li>Düzeltilmesini veya silinmesini talep etme</li><li>İletişim bilgileri üzerinden başvurma</li></ul></div>';

    var kullanimBody = '<div style="line-height:1.8;color:var(--text2);max-height:60vh;overflow-y:auto;padding-right:8px;-webkit-overflow-scrolling:touch">'
        + '<h2 style="color:var(--text);font-size:16px;font-weight:700;margin:0 0 12px">Kullan\u0131m \u015Eartlar\u0131</h2>'
        + '<p style="margin-bottom:10px;font-size:13px">Bu sistemi kullanarak kullanım şartlarını kabul etmiş olursunuz.</p>'
        + '<p style="font-size:14px;font-weight:600;margin:14px 0 6px">İçerik Kullanımı:</p>'
        + '<p style="margin-bottom:10px;font-size:13px">Tüm içerikler Dragos Futbol Akademisi\'ne aittir ve izinsiz kopyalanamaz.</p>'
        + '<p style="font-size:14px;font-weight:600;margin:14px 0 6px">Hesap Güvenliği:</p>'
        + '<p style="margin-bottom:10px;font-size:13px">TC kimlik numaranız ve şifreniz size özeldir.</p></div>';

    var title = type === 'kvkk' ? 'KVKK Aydınlatma Metni' : type === 'kullanim' ? 'Kullanım Şartları' : '';
    var body = type === 'kvkk' ? kvkkBody : type === 'kullanim' ? kullanimBody : '';
    if (!title) return;

    var lboxWrap = document.getElementById('lbox-wrap');
    var isLoginScreen = lboxWrap && lboxWrap.style.display !== 'none' && lboxWrap.offsetParent !== null;

    if (isLoginScreen) {
        _openLegalOverlay(title, body);
    } else {
        if (typeof modal === 'function') {
            modal(title, body, [{ lbl: 'Kapat', cls: 'bs', fn: closeModal }]);
        } else {
            _openLegalOverlay(title, body);
        }
    }
};

function _openLegalOverlay(title, body) {
    var existing = document.getElementById('legal-overlay-modal');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.id = 'legal-overlay-modal';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:2100;padding:16px;opacity:0;transition:opacity .2s ease';
    var box = document.createElement('div');
    box.style.cssText = 'background:var(--bg,#0f1623);border:1px solid var(--border,#1e3352);border-radius:16px;width:100%;max-width:600px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,.5);overflow:hidden';
    box.innerHTML = '<div style="padding:20px;border-bottom:1px solid var(--border,#1e3352);display:flex;justify-content:space-between;align-items:center"><div style="font-size:18px;font-weight:800;color:var(--text,#e2e8f0)">' + _escHtml(title) + '</div><button onclick="document.getElementById(\'legal-overlay-modal\').style.opacity=\'0\';setTimeout(function(){var e=document.getElementById(\'legal-overlay-modal\');if(e)e.remove()},200)" style="background:var(--bg3,#151e2d);border:1px solid var(--border,#1e3352);border-radius:8px;padding:8px 12px;cursor:pointer;color:var(--text,#e2e8f0);font-size:16px;min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center">✕</button></div><div style="padding:20px;overflow-y:auto;flex:1;-webkit-overflow-scrolling:touch">' + body + '</div><div style="padding:16px 20px;border-top:1px solid var(--border,#1e3352);display:flex;justify-content:flex-end;background:var(--bg2,#0f1623);border-radius:0 0 16px 16px"><button class="btn bs" onclick="document.getElementById(\'legal-overlay-modal\').style.opacity=\'0\';setTimeout(function(){var e=document.getElementById(\'legal-overlay-modal\');if(e)e.remove()},200)" style="padding:12px 24px;min-height:44px">Kapat</button></div>';
    overlay.appendChild(box);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) { overlay.style.opacity = '0'; setTimeout(function() { if (overlay.parentNode) overlay.remove(); }, 200); } });
    document.body.appendChild(overlay);
    requestAnimationFrame(function() { overlay.style.opacity = '1'; });
}

function _escHtml(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// ────────────────────────────────────────────────────────
// 2) GİDER KATEGORİLERİ
// ────────────────────────────────────────────────────────
var EXPENSE_CATEGORIES = [
    { id: 'saha_kirasi', name: 'Saha Kirası', icon: '🏟️' },
    { id: 'antrenor_maasi', name: 'Antrenör Maaşı', icon: '👨‍🏫' },
    { id: 'malzeme', name: 'Malzeme/Ekipman', icon: '⚽' },
    { id: 'ulasim', name: 'Ulaşım', icon: '🚌' },
    { id: 'sigorta', name: 'Sigorta', icon: '🛡️' },
    { id: 'bakim', name: 'Bakım/Onarım', icon: '🔧' },
    { id: 'diger', name: 'Diğer', icon: '📋' }
];

function getExpenseCategoryName(catId) {
    var c = EXPENSE_CATEGORIES.find(function(x) { return x.id === catId; });
    return c ? c.name : (catId || 'Belirtilmedi');
}
function getExpenseCategoryIcon(catId) {
    var c = EXPENSE_CATEGORIES.find(function(x) { return x.id === catId; });
    return c ? c.icon : '📋';
}

// ────────────────────────────────────────────────────────
// 3) MAKBUZ SİSTEMİ
// ────────────────────────────────────────────────────────
window.generateReceipt = function(paymentId) {
    var p = AppState.data.payments.find(function(x) { return x.id === paymentId; });
    if (!p) { toast('Ödeme bulunamadı!', 'e'); return; }

    var s = AppState.data.settings || {};
    var year = new Date().getFullYear();
    var counter = (s.receiptCounter || 0) + 1;
    var receiptNo = 'MKB-' + year + '-' + String(counter).padStart(4, '0');

    // jsPDF ile makbuz oluştur
    try {
        var jsPDF = window.jspdf ? window.jspdf.jsPDF : (window.jsPDF || null);
        if (!jsPDF) { _generateReceiptHTML(p, receiptNo, s); return; }

        // Düzeltme #5: Türkçe karakterleri PDF için ASCII'ye çevir
        function trToAscii(str) {
            return String(str || '')
                .replace(/ş/g,'s').replace(/Ş/g,'S')
                .replace(/ı/g,'i').replace(/İ/g,'I')
                .replace(/ğ/g,'g').replace(/Ğ/g,'G')
                .replace(/ü/g,'u').replace(/Ü/g,'U')
                .replace(/ö/g,'o').replace(/Ö/g,'O')
                .replace(/ç/g,'c').replace(/Ç/g,'C');
        }

        var doc = new jsPDF({ unit: 'mm', format: 'a5' });

        // Header
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text(trToAscii(s.schoolName || 'Dragos Futbol Akademisi'), 74, 20, { align: 'center' });

        var headerY = 28;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        var addrText = trToAscii(s.address || '');
        if (addrText) {
            var addrLines = doc.splitTextToSize(addrText, 110);
            doc.text(addrLines, 74, headerY, { align: 'center' });
            headerY += addrLines.length * 4;
        }
        if (s.ownerPhone) {
            doc.text('Tel: ' + trToAscii(s.ownerPhone), 74, headerY, { align: 'center' });
            headerY += 5;
        }

        // Çizgi
        doc.setLineWidth(0.5);
        doc.line(10, headerY + 2, 138, headerY + 2);

        // Makbuz No ve Tarih
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('ODEME MAKBUZU', 74, headerY + 12, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('Makbuz No: ' + receiptNo, 10, headerY + 22);
        doc.text('Tarih: ' + DateUtils.format(p.dt), 100, headerY + 22);

        // Detaylar
        doc.setLineWidth(0.3);
        doc.line(10, headerY + 26, 138, headerY + 26);
        var y = headerY + 36;
        var addRow = function(label, value) {
            doc.setFont(undefined, 'bold');
            doc.text(label, 10, y);
            doc.setFont(undefined, 'normal');
            doc.text(String(value || '-'), 60, y);
            y += 8;
        };

        addRow('Sporcu:', trToAscii(p.an || '-'));
        addRow('Aciklama:', trToAscii(p.serviceName || p.ds || 'Aidat'));
        addRow('Tutar:', FormatUtils.currency(p.amt));
        addRow('Odeme Yontemi:', trToAscii(statusLabel(p.payMethod || '-')));
        addRow('Durum:', p.st === 'completed' ? 'Odendi' : trToAscii(statusLabel(p.st)));
        if (p.slipCode) addRow('Slip Kodu:', trToAscii(p.slipCode));

        // Alt çizgi
        doc.line(10, y + 2, 138, y + 2);

        // Footer
        y += 12;
        doc.setFontSize(9);
        doc.text('Bu makbuz elektronik ortamda olusturulmustur.', 74, y, { align: 'center' });
        doc.text(trToAscii(s.schoolName || 'Dragos Futbol Akademisi'), 74, y + 6, { align: 'center' });

        doc.save('Makbuz_' + receiptNo + '.pdf');

        // Makbuz numarasını kaydet
        _saveReceiptNo(p.id, receiptNo, counter);
        toast('✅ Makbuz oluşturuldu: ' + receiptNo, 'g');

    } catch (e) {
        console.error('PDF error:', e);
        _generateReceiptHTML(p, receiptNo, s);
    }
};

function _generateReceiptHTML(p, receiptNo, s) {
    // Fallback: HTML tabanlı yazdırma
    var w = window.open('', '_blank', 'width=400,height=600');
    if (!w) { toast('Popup engellenmiş!', 'e'); return; }
    w.document.write('<html><head><title>Makbuz ' + receiptNo + '</title><style>body{font-family:Arial;padding:20px;max-width:400px;margin:auto}h1{text-align:center;font-size:18px}h2{text-align:center;font-size:14px;color:#666}.line{border-top:1px solid #333;margin:12px 0}.row{display:flex;justify-content:space-between;padding:6px 0}.label{font-weight:bold;color:#555}.footer{text-align:center;font-size:11px;color:#999;margin-top:20px}@media print{body{padding:10px}}</style></head><body>');
    w.document.write('<h1>' + _escHtml(s.schoolName || 'Dragos Futbol Akademisi') + '</h1>');
    if (s.address) w.document.write('<div style="text-align:center;font-size:12px;color:#555;margin-bottom:2px">' + _escHtml(s.address) + '</div>');
    if (s.ownerPhone) w.document.write('<div style="text-align:center;font-size:12px;color:#555;margin-bottom:4px">Tel: ' + _escHtml(s.ownerPhone) + '</div>');
    w.document.write('<h2>ÖDEME MAKBUZU</h2>');
    w.document.write('<div class="line"></div>');
    w.document.write('<div class="row"><span class="label">Makbuz No:</span><span>' + receiptNo + '</span></div>');
    w.document.write('<div class="row"><span class="label">Tarih:</span><span>' + DateUtils.format(p.dt) + '</span></div>');
    w.document.write('<div class="line"></div>');
    w.document.write('<div class="row"><span class="label">Sporcu:</span><span>' + _escHtml(p.an) + '</span></div>');
    w.document.write('<div class="row"><span class="label">Açıklama:</span><span>' + _escHtml(p.serviceName || p.ds || 'Aidat') + '</span></div>');
    w.document.write('<div class="row"><span class="label">Tutar:</span><span><strong>' + FormatUtils.currency(p.amt) + '</strong></span></div>');
    w.document.write('<div class="row"><span class="label">Ödeme Yöntemi:</span><span>' + statusLabel(p.payMethod || '-') + '</span></div>');
    if (p.slipCode) w.document.write('<div class="row"><span class="label">Slip Kodu:</span><span>' + _escHtml(p.slipCode) + '</span></div>');
    w.document.write('<div class="line"></div>');
    w.document.write('<div class="footer">Bu makbuz elektronik ortamda oluşturulmuştur.<br>' + _escHtml(s.schoolName || 'Dragos Futbol Akademisi') + '</div>');
    w.document.write('</body></html>');
    w.document.close();
    setTimeout(function() { w.print(); }, 500);

    _saveReceiptNo(p.id, receiptNo, (s.receiptCounter || 0) + 1);
    toast('✅ Makbuz oluşturuldu: ' + receiptNo, 'g');
}

async function _saveReceiptNo(paymentId, receiptNo, counter) {
    try {
        var sb = getSupabase();
        if (!sb) return;
        // Ödemeye makbuz no kaydet
        await sb.from('payments').update({ receipt_no: receiptNo }).eq('id', paymentId);
        // AppState güncelle
        var idx = AppState.data.payments.findIndex(function(p) { return p.id === paymentId; });
        if (idx >= 0) AppState.data.payments[idx].receiptNo = receiptNo;
        // Sayacı güncelle
        if (AppState.data.settings) {
            AppState.data.settings.receiptCounter = counter;
            await DB.upsert('settings', DB.mappers.fromSettings(AppState.data.settings));
        }
    } catch (e) { console.warn('Receipt save error:', e); }
}

// ────────────────────────────────────────────────────────
// 4) KASA/BANKA TRANSFERİ
// ────────────────────────────────────────────────────────
if (window.AppState && window.AppState.data && !AppState.data.cashTransfers) AppState.data.cashTransfers = [];

window.showCashTransferModal = function() {
    modal('💱 Kasa ↔ Banka Transfer', '<div class="fgr mb2"><label>Transfer Yönü</label><select id="ct-dir"><option value="cash_to_bank">Kasadan → Bankaya</option><option value="bank_to_cash">Bankadan → Kasaya</option></select></div><div class="fgr mb2"><label>Tutar (₺) *</label><input id="ct-amt" type="number" placeholder="0"/></div><div class="fgr mb2"><label>Açıklama</label><input id="ct-desc" placeholder="Transfer açıklaması"/></div><div class="fgr mb2"><label>Tarih</label><input id="ct-dt" type="date" value="' + DateUtils.today() + '"/></div>', [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: '💱 Transfer Yap', cls: 'bp', fn: async function() {
            var dir = UIUtils.getValue('ct-dir');
            var amt = UIUtils.getNumber('ct-amt');
            var desc = UIUtils.getValue('ct-desc') || 'Transfer';
            var dt = UIUtils.getValue('ct-dt') || DateUtils.today();
            if (!amt || amt <= 0) { toast('Tutar giriniz!', 'e'); return; }
            var obj = { id: generateId(), direction: dir, amount: amt, description: desc, dt: dt };
            try {
                var sb = getSupabase();
                if (sb) {
                    await sb.from('cash_transfers').insert({
                        id: obj.id, org_id: AppState.currentOrgId, branch_id: AppState.currentBranchId,
                        direction: dir, amount: amt, description: desc, dt: dt
                    });
                }
                AppState.data.cashTransfers.push(obj);
                toast('✅ Transfer kaydedildi!', 'g');
                closeModal();
                go('accounting');
            } catch (e) { toast('Hata: ' + e.message, 'e'); }
        }}
    ]);
};

function getCashBankBalances() {
    var cashIn = 0, cashOut = 0, bankIn = 0, bankOut = 0;
    AppState.data.payments.filter(function(p) { return p.st === 'completed'; }).forEach(function(p) {
        var isCash = p.payMethod === 'nakit';
        if (p.ty === 'income') {
            if (isCash) cashIn += (p.amt || 0); else bankIn += (p.amt || 0);
        } else {
            if (isCash) cashOut += (p.amt || 0); else bankOut += (p.amt || 0);
        }
    });
    // Transferler
    (AppState.data.cashTransfers || []).forEach(function(t) {
        if (t.direction === 'cash_to_bank') { cashOut += t.amount; bankIn += t.amount; }
        else { bankOut += t.amount; cashIn += t.amount; }
    });
    return { cash: cashIn - cashOut, bank: bankIn - bankOut, cashIn: cashIn, cashOut: cashOut, bankIn: bankIn, bankOut: bankOut };
}

// ────────────────────────────────────────────────────────
// 5) WHATSAPP BİLDİRİM SİSTEMİ
// ────────────────────────────────────────────────────────
window.sendWhatsAppMessage = async function(phone, message) {
    var s = AppState.data.settings || {};
    if (!s.waActive || !s.waApiToken || !s.waPhoneId) {
        toast('WhatsApp ayarları yapılandırılmamış!', 'e');
        return false;
    }
    var cleanPhone = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+/, '');
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
    if (!cleanPhone.startsWith('90')) cleanPhone = '90' + cleanPhone;

    try {
        var resp = await fetch('https://graph.facebook.com/v18.0/' + s.waPhoneId + '/messages', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + s.waApiToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ messaging_product: 'whatsapp', to: cleanPhone, type: 'text', text: { body: message } })
        });
        var result = await resp.json();
        // Mesaj geçmişine kaydet
        try {
            var sb = getSupabase();
            if (sb) {
                await sb.from('wa_messages').insert({
                    id: generateId(), org_id: AppState.currentOrgId, branch_id: AppState.currentBranchId,
                    phone: cleanPhone, message: message, status: resp.ok ? 'sent' : 'failed'
                });
            }
        } catch (e) { /* ignore */ }
        return resp.ok;
    } catch (e) {
        console.error('WhatsApp error:', e);
        return false;
    }
};

window.sendBulkWhatsApp = async function() {
    var group = UIUtils.getValue('wa-group');
    var msg = UIUtils.getValue('wa-body');
    if (!msg) { toast('Mesaj içeriği giriniz!', 'e'); return; }

    var targets = [];
    if (group === 'all') {
        targets = AppState.data.athletes.filter(function(a) { return a.st === 'active' && (a.pph || a.ph); });
    } else if (group === 'overdue') {
        var overdueIds = {};
        AppState.data.payments.filter(function(p) { return p.st === 'overdue'; }).forEach(function(p) { overdueIds[p.aid] = true; });
        targets = AppState.data.athletes.filter(function(a) { return overdueIds[a.id] && (a.pph || a.ph); });
    }

    if (targets.length === 0) { toast('Gönderilecek kişi bulunamadı!', 'e'); return; }

    var sent = 0, failed = 0;
    for (var i = 0; i < targets.length; i++) {
        var phone = targets[i].pph || targets[i].ph;
        var personMsg = msg.replace('{sporcu_adi}', targets[i].fn + ' ' + targets[i].ln).replace('{tutar}', FormatUtils.currency(targets[i].fee));
        var ok = await sendWhatsAppMessage(phone, personMsg);
        if (ok) sent++; else failed++;
    }
    toast('✅ ' + sent + ' mesaj gönderildi' + (failed > 0 ? ', ' + failed + ' başarısız' : ''), sent > 0 ? 'g' : 'e');
};

// ────────────────────────────────────────────────────────
// 6) GELİŞMİŞ FİNANS RAPORU (pgAccounting override)
// ────────────────────────────────────────────────────────
function getMonthlyData(year) {
    var months = [];
    for (var m = 0; m < 12; m++) {
        var monthStr = year + '-' + String(m + 1).padStart(2, '0');
        var inc = 0, exp = 0;
        AppState.data.payments.filter(function(p) { return p.st === 'completed' && p.dt && p.dt.startsWith(monthStr); }).forEach(function(p) {
            if (p.ty === 'income') inc += (p.amt || 0); else exp += (p.amt || 0);
        });
        months.push({ month: m, income: inc, expense: exp, label: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'][m] });
    }
    return months;
}

function getBranchIncomeDistribution() {
    var dist = {};
    AppState.data.payments.filter(function(p) { return p.ty === 'income' && p.st === 'completed'; }).forEach(function(p) {
        if (p.aid) {
            var ath = AppState.data.athletes.find(function(a) { return a.id === p.aid; });
            var sp = ath ? (ath.sp || 'Belirtilmedi') : 'Belirtilmedi';
            dist[sp] = (dist[sp] || 0) + (p.amt || 0);
        }
    });
    return Object.keys(dist).map(function(k) { return { name: k, value: dist[k] }; }).sort(function(a, b) { return b.value - a.value; });
}

function getExpenseCategoryDistribution() {
    var dist = {};
    AppState.data.payments.filter(function(p) { return p.ty === 'expense' && p.st === 'completed'; }).forEach(function(p) {
        var cat = p.cat || 'diger';
        dist[cat] = (dist[cat] || 0) + (p.amt || 0);
    });
    return Object.keys(dist).map(function(k) { return { id: k, name: getExpenseCategoryName(k), icon: getExpenseCategoryIcon(k), value: dist[k] }; }).sort(function(a, b) { return b.value - a.value; });
}

function buildBarChart(data, maxHeight) {
    var max = Math.max.apply(null, data.map(function(d) { return Math.max(d.income, d.expense); }));
    if (max === 0) max = 1;
    var bars = '';
    var labels = '';
    data.forEach(function(d) {
        var ih = Math.max(2, (d.income / max) * maxHeight);
        var eh = Math.max(2, (d.expense / max) * maxHeight);
        bars += '<div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:2px;justify-content:flex-end;min-width:0">';
        bars += '<div style="display:flex;align-items:flex-end;gap:2px;height:' + maxHeight + 'px">';
        bars += '<div class="chart-bar chart-bar-income" style="height:' + ih + 'px;flex:1;min-width:6px" title="Gelir: ' + FormatUtils.currency(d.income) + '"></div>';
        bars += '<div class="chart-bar chart-bar-expense" style="height:' + eh + 'px;flex:1;min-width:6px" title="Gider: ' + FormatUtils.currency(d.expense) + '"></div>';
        bars += '</div>';
        bars += '<div style="font-size:10px;color:var(--text3);margin-top:4px">' + d.label + '</div>';
        bars += '</div>';
    });
    return '<div style="display:flex;align-items:flex-end;gap:4px;padding:8px 0">' + bars + '</div>';
}

function buildDonutChart(data, size, label) {
    if (!data.length) return '<div class="empty-state">Veri yok</div>';
    var total = data.reduce(function(s, d) { return s + d.value; }, 0);
    var colors = ['#3b82f6', '#22c55e', '#ef4444', '#eab308', '#f97316', '#a855f7', '#06b6d4', '#ec4899'];
    var r = size / 2 - 10;
    var circ = 2 * Math.PI * r;
    var offset = 0;
    var paths = '';
    data.forEach(function(d, i) {
        var pct = d.value / total;
        var dashLen = pct * circ;
        var color = colors[i % colors.length];
        paths += '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="20" stroke-dasharray="' + dashLen + ' ' + (circ - dashLen) + '" stroke-dashoffset="' + (-offset) + '" style="transition:all .6s ease"/>';
        offset += dashLen;
    });
    var legend = data.map(function(d, i) {
        var pct = total > 0 ? Math.round(d.value / total * 100) : 0;
        return '<div class="chart-legend-item"><div class="chart-legend-dot" style="background:' + colors[i % colors.length] + '"></div><span>' + FormatUtils.escape(d.name) + ' (' + pct + '%) ' + FormatUtils.currency(d.value) + '</span></div>';
    }).join('');
    return '<div class="donut-chart"><svg width="' + size + '" height="' + size + '">' + paths + '</svg><div class="donut-center"><div class="donut-center-val">' + FormatUtils.currency(total) + '</div><div class="donut-center-lbl">' + (label || 'Toplam') + '</div></div></div><div class="chart-legend" style="flex-wrap:wrap;margin-top:12px">' + legend + '</div>';
}

function changePercent(current, previous) {
    if (!previous) return { pct: current > 0 ? 100 : 0, cls: current > 0 ? 'up' : 'neutral' };
    var pct = Math.round(((current - previous) / previous) * 100);
    return { pct: Math.abs(pct), cls: pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral', sign: pct >= 0 ? '+' : '-' };
}

// Override pgAccounting
var _origPgAccounting = typeof pgAccounting === 'function' ? pgAccounting : null;

window.pgAccountingV8 = function() {
    var now = new Date();
    var thisYear = now.getFullYear();
    var thisMonth = now.getMonth();
    var prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    var prevMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    var monthlyThis = getMonthlyData(thisYear);
    var monthlyPrev = getMonthlyData(thisYear - 1);

    var thisMonthInc = monthlyThis[thisMonth].income;
    var thisMonthExp = monthlyThis[thisMonth].expense;
    var prevMonthInc = thisMonth === 0 ? monthlyPrev[11].income : monthlyThis[prevMonth].income;
    var prevMonthExp = thisMonth === 0 ? monthlyPrev[11].expense : monthlyThis[prevMonth].expense;

    var yearInc = monthlyThis.reduce(function(s, m) { return s + m.income; }, 0);
    var yearExp = monthlyThis.reduce(function(s, m) { return s + m.expense; }, 0);
    var prevYearInc = monthlyPrev.reduce(function(s, m) { return s + m.income; }, 0);
    var prevYearExp = monthlyPrev.reduce(function(s, m) { return s + m.expense; }, 0);

    var incChange = changePercent(thisMonthInc, prevMonthInc);
    var expChange = changePercent(thisMonthExp, prevMonthExp);
    var yearIncChange = changePercent(yearInc, prevYearInc);

    var balances = getCashBankBalances();
    var branchDist = getBranchIncomeDistribution();
    var expDist = getExpenseCategoryDistribution();
    var s = AppState.data.settings || {};

    // Günlük kasa
    var todayStr = DateUtils.today();
    var todayCashIn = 0, todayCashOut = 0;
    AppState.data.payments.filter(function(p) { return p.st === 'completed' && p.dt === todayStr && p.payMethod === 'nakit'; }).forEach(function(p) {
        if (p.ty === 'income') todayCashIn += (p.amt || 0); else todayCashOut += (p.amt || 0);
    });

    return '<div class="ph"><div class="stit">📊 Finans Raporu</div><div class="ssub">Detaylı gelir-gider analizi ve kasa takibi</div></div>'

    // Kasa & Banka Kartları
    + '<div class="g3 mb3">'
    + '<div class="card kasa-card" style="border-left:4px solid var(--green)"><div class="kasa-card-icon">🏦</div><div class="kasa-card-val tg">' + FormatUtils.currency(balances.bank) + '</div><div class="kasa-card-lbl">Banka Bakiyesi</div></div>'
    + '<div class="card kasa-card" style="border-left:4px solid var(--blue2)"><div class="kasa-card-icon">💵</div><div class="kasa-card-val tb">' + FormatUtils.currency(balances.cash) + '</div><div class="kasa-card-lbl">Kasa (Nakit)</div></div>'
    + '<div class="card kasa-card" style="border-left:4px solid var(--purple)"><div class="kasa-card-icon">💰</div><div class="kasa-card-val tpur">' + FormatUtils.currency(balances.cash + balances.bank) + '</div><div class="kasa-card-lbl">Toplam Bakiye</div></div>'
    + '</div>'

    // Transfer butonu + Günlük kasa
    + '<div class="flex fjb fca mb3 fwrap gap2">'
    + '<button class="btn bpur" onclick="showCashTransferModal()">💱 Kasa ↔ Banka Transfer</button>'
    + '<div class="flex gap3 fca"><span class="ts">Bugün Nakit: <strong class="tg">+' + FormatUtils.currency(todayCashIn) + '</strong> / <strong class="tr2">-' + FormatUtils.currency(todayCashOut) + '</strong></span></div>'
    + '</div>'

    // Bu Ay vs Geçen Ay
    + '<div class="g2 mb3">'
    + '<div class="card"><div class="flex fjb fca mb2"><div class="tw6 tsm">Bu Ay Gelir</div><span class="change-badge ' + incChange.cls + '">' + (incChange.sign || '') + incChange.pct + '%</span></div><div class="stat-val tg">' + FormatUtils.currency(thisMonthInc) + '</div><div class="ts tm">Geçen ay: ' + FormatUtils.currency(prevMonthInc) + '</div></div>'
    + '<div class="card"><div class="flex fjb fca mb2"><div class="tw6 tsm">Bu Ay Gider</div><span class="change-badge ' + expChange.cls + '">' + (expChange.sign || '') + expChange.pct + '%</span></div><div class="stat-val tr2">' + FormatUtils.currency(thisMonthExp) + '</div><div class="ts tm">Geçen ay: ' + FormatUtils.currency(prevMonthExp) + '</div></div>'
    + '</div>'

    // Yıllık karşılaştırma
    + '<div class="card mb3"><div class="flex fjb fca mb2"><div class="tw6 tsm">📈 ' + thisYear + ' Yılı Aylık Gelir-Gider</div><span class="change-badge ' + yearIncChange.cls + '">vs ' + (thisYear - 1) + ': ' + (yearIncChange.sign || '') + yearIncChange.pct + '%</span></div>'
    + '<div class="flex gap3 mb2"><span class="ts">Yıllık Gelir: <strong class="tg">' + FormatUtils.currency(yearInc) + '</strong></span><span class="ts">Yıllık Gider: <strong class="tr2">' + FormatUtils.currency(yearExp) + '</strong></span><span class="ts">Net: <strong class="tb">' + FormatUtils.currency(yearInc - yearExp) + '</strong></span></div>'
    + buildBarChart(monthlyThis, 160)
    + '<div class="chart-legend"><div class="chart-legend-item"><div class="chart-legend-dot" style="background:var(--green)"></div><span>Gelir</span></div><div class="chart-legend-item"><div class="chart-legend-dot" style="background:var(--red)"></div><span>Gider</span></div></div>'
    + '</div>'

    // Branş bazlı gelir + Gider kategorileri
    + '<div class="g2 mb3">'
    + '<div class="card"><div class="tw6 tsm mb3">⚽ Branş Bazlı Gelir Dağılımı</div>' + buildDonutChart(branchDist, 200, 'Toplam Gelir') + '</div>'
    + '<div class="card"><div class="tw6 tsm mb3">📂 Gider Kategorileri</div>' + buildDonutChart(expDist.map(function(d) { return { name: d.icon + ' ' + d.name, value: d.value }; }), 200, 'Toplam Gider') + '</div>'
    + '</div>'

    // Banka bilgileri
    + '<div class="card"><div class="tw6 tsm mb2">🏦 Banka Bilgileri</div>'
    + '<p class="tm"><strong>Banka:</strong> ' + FormatUtils.escape(s.bankName || 'Girilmedi') + '<br><strong>Alıcı:</strong> ' + FormatUtils.escape(s.accountName || 'Girilmedi') + '<br><strong>IBAN:</strong> ' + FormatUtils.escape(s.iban || 'Girilmedi') + '</p></div>';
};

// ────────────────────────────────────────────────────────
// 7) SMS/WhatsApp SAYFASI (pgSms override)
// ────────────────────────────────────────────────────────
window.pgSmsV8 = function() {
    var s = AppState.data.settings || {};
    var waActive = s.waActive;
    return '<div class="ph"><div class="stit">📱 Bildirimler / WhatsApp</div><div class="ssub">Toplu mesaj gönderimi ve bildirim yönetimi</div></div>'

    + '<div class="g2 mb3">'
    // WhatsApp bölümü
    + '<div class="card" style="border-left:4px solid #25d366">'
    + '<div class="tw6 tsm mb2" style="color:#25d366">💬 WhatsApp Mesajı</div>'
    + (waActive ? '' : '<div class="al al-y mb2" style="font-size:12px">⚠️ WhatsApp entegrasyonu aktif değil. Ayarlardan yapılandırın.</div>')
    + '<div class="fgr mb2"><label>Alıcı Grubu</label><select id="wa-group"><option value="all">Tüm Aktif Sporcular</option><option value="overdue">Gecikmiş Ödemesi Olanlar</option></select></div>'
    + '<div class="fgr mb2"><label>Mesaj İçeriği</label><textarea id="wa-body" rows="4" placeholder="Mesajınızı yazın... ({sporcu_adi}, {tutar} değişkenleri kullanılabilir)"></textarea></div>'
    + '<div class="flex gap2"><button class="btn bsu w100" onclick="sendBulkWhatsApp()" ' + (waActive ? '' : 'disabled') + '>💬 WhatsApp Gönder</button></div>'
    + '</div>'

    // SMS bölümü (mevcut)
    + '<div class="card" style="border-left:4px solid var(--blue2)">'
    + '<div class="tw6 tsm mb2">📩 SMS Duyuru (NetGSM)</div>'
    + '<div class="al al-b mb2" style="font-size:12px">SMS gönderimi için Ayarlar > NetGSM entegrasyonu gereklidir.</div>'
    + '<div class="fgr mb2"><label>Alıcı Grubu</label><select id="sms-group"><option value="all">Tüm Aktif Sporcular</option><option value="overdue">Gecikmiş Ödemesi Olanlar</option></select></div>'
    + '<div class="fgr mb2"><label>Mesaj İçeriği</label><textarea id="sms-body" rows="4" maxlength="160" placeholder="Mesajınızı yazın..."></textarea></div>'
    + '<button class="btn bp w100" onclick="sendBulkSms()">📩 SMS Gönder</button>'
    + '</div>'
    + '</div>'

    // Mesaj şablonları
    + '<div class="card mb3"><div class="tw6 tsm mb2">📋 Hızlı Şablonlar</div>'
    + '<div class="g2">'
    + '<button class="btn bs" onclick="document.getElementById(\'wa-body\').value=\'Sayın veli, {sporcu_adi} için aylık aidat tutarı {tutar} olup ödeme tarihi yaklaşmaktadır. Dragos Futbol Akademisi\'">Aidat Hatırlatma</button>'
    + '<button class="btn bs" onclick="document.getElementById(\'wa-body\').value=\'Sayın veli, {sporcu_adi} için ödemeniz gecikmiştir. Lütfen en kısa sürede ödemenizi yapınız. Dragos Futbol Akademisi\'">Gecikme Uyarısı</button>'
    + '<button class="btn bs" onclick="document.getElementById(\'wa-body\').value=\'Sayın veli, yarınki antrenman programında değişiklik yapılmıştır. Detaylar için akademimizi arayınız. Dragos Futbol Akademisi\'">Program Değişikliği</button>'
    + '<button class="btn bs" onclick="document.getElementById(\'wa-body\').value=\'Sayın veli, hafta sonu maçı için sporcunuzun katılımını onaylayınız. Dragos Futbol Akademisi\'">Maç Duyurusu</button>'
    + '</div></div>';
};

// ────────────────────────────────────────────────────────
// 8) editPay OVERRIDE — Gider kategorisi eklendi + Makbuz butonu
// ────────────────────────────────────────────────────────
var _origEditPay = window.editPay;
window.editPay = function(id) {
    var p = id ? AppState.data.payments.find(function(x) { return x.id === id; }) : null;
    var isNew = !p;

    var catOpts = EXPENSE_CATEGORIES.map(function(c) {
        return '<option value="' + c.id + '"' + (p && p.cat === c.id ? ' selected' : '') + '>' + c.icon + ' ' + c.name + '</option>';
    }).join('');

    modal(isNew ? 'Yeni Finansal İşlem' : 'İşlem Detayı', '<div class="fgr mb2"><label>Sporcu / Kişi</label><select id="p-aid"><option value="">Bağımsız İşlem</option>' + AppState.data.athletes.map(function(a) { return '<option value="' + FormatUtils.escape(a.id) + '"' + (p && p.aid === a.id ? ' selected' : '') + '>' + FormatUtils.escape(a.fn + ' ' + a.ln) + '</option>'; }).join('') + '</select></div>'
    + '<div class="g21"><div class="fgr"><label>Tutar (₺) *</label><input id="p-amt" type="number" value="' + (p ? p.amt : '') + '"/></div><div class="fgr"><label>İşlem Türü</label><select id="p-ty" onchange="document.getElementById(\'p-cat-row\').style.display=this.value===\'expense\'?\'block\':\'none\'"><option value="income"' + (p && p.ty === 'income' ? ' selected' : '') + '>Gelir (Tahsilat)</option><option value="expense"' + (p && p.ty === 'expense' ? ' selected' : '') + '>Gider (Ödeme)</option></select></div></div>'
    + '<div id="p-cat-row" style="display:' + (p && p.ty === 'expense' ? 'block' : 'none') + '" class="mt2"><div class="fgr"><label>Gider Kategorisi</label><select id="p-cat"><option value="">Kategori Seçin</option>' + catOpts + '</select></div></div>'
    + '<div class="fgr mt2"><label>Açıklama / Hizmet Adı</label><input id="p-ds" value="' + FormatUtils.escape(p ? (p.ds || '') : '') + '" placeholder="Örn: Ekim Ayı Aidatı"/></div>'
    + '<div class="g21 mt2"><div class="fgr"><label>Durum</label><select id="p-st"><option value="completed"' + (p && p.st === 'completed' ? ' selected' : '') + '>Ödendi</option><option value="pending"' + (p && p.st === 'pending' ? ' selected' : '') + '>Bekliyor</option><option value="overdue"' + (p && p.st === 'overdue' ? ' selected' : '') + '>Gecikti</option></select></div><div class="fgr"><label>Tarih</label><input id="p-dt" type="date" value="' + FormatUtils.escape(p ? (p.dt || DateUtils.today()) : DateUtils.today()) + '"/></div></div>'
    + '<div class="fgr mt2"><label>Ödeme Yöntemi</label><select id="p-method"><option value="">Belirtilmedi</option><option value="nakit"' + (p && p.payMethod === 'nakit' ? ' selected' : '') + '>💵 Nakit</option><option value="kredi_karti"' + (p && p.payMethod === 'kredi_karti' ? ' selected' : '') + '>💳 Kredi Kartı</option><option value="havale"' + (p && p.payMethod === 'havale' ? ' selected' : '') + '>🏦 Havale/EFT</option><option value="paytr"' + (p && p.payMethod === 'paytr' ? ' selected' : '') + '>🔵 PayTR Online</option></select></div>'
    , [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        ...(p && p.st === 'completed' ? [{ lbl: '🧾 Makbuz', cls: 'bpur', fn: function() { closeModal(); generateReceipt(p.id); } }] : []),
        { lbl: 'Kaydet', cls: 'bp', fn: async function() {
            var aid = UIUtils.getValue('p-aid');
            var ath = AppState.data.athletes.find(function(a) { return a.id === aid; });
            var ds = UIUtils.getValue('p-ds');
            var ty = UIUtils.getValue('p-ty');

            var obj = {
                id: p ? p.id : generateId(),
                aid: aid,
                an: ath ? (ath.fn + ' ' + ath.ln) : (ds || 'Bilinmiyor'),
                amt: UIUtils.getNumber('p-amt'),
                ds: ds,
                st: UIUtils.getValue('p-st'),
                dt: UIUtils.getValue('p-dt'),
                ty: ty,
                cat: ty === 'expense' ? UIUtils.getValue('p-cat') : '',
                serviceName: ds,
                payMethod: UIUtils.getValue('p-method') || (p ? p.payMethod : '') || ''
            };

            if (!obj.amt) { toast(i18n[AppState.lang].fillRequired, 'e'); return; }

            var result = await DB.upsert('payments', DB.mappers.fromPayment(obj));
            if (result) {
                if (isNew) { AppState.data.payments.push(obj); }
                else { var idx = AppState.data.payments.findIndex(function(x) { return x.id === obj.id; }); if (idx >= 0) AppState.data.payments[idx] = obj; }
                toast(i18n[AppState.lang].saveSuccess, 'g');
                closeModal();
                go('payments');
            }
        }}
    ]);
};

// ────────────────────────────────────────────────────────
// 9) go() override artık script.js içinde birleştirildi.
// ────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────
// 10) ATHLETES + ONKAYIT RENDER (from V7, preserved)
// ────────────────────────────────────────────────────────
function __renderAthletes() {
    var list = AppState.data.athletes.slice();
    var f = AppState.filters.athletes;
    if (f.sp) list = list.filter(function(a) { return a.sp === f.sp; });
    if (f.st) list = list.filter(function(a) { return a.st === f.st; });
    if (f.cls) list = list.filter(function(a) { return a.clsId === f.cls; });
    if (f.q) { var q = f.q.toLowerCase(); list = list.filter(function(a) { return (a.fn + ' ' + a.ln).toLowerCase().includes(q) || a.tc.includes(q); }); }

    var isAdmin = AppState.currentUser && AppState.currentUser.role === 'admin';
    var spOpts = AppState.data.sports.map(function(s) { return '<option value="' + FormatUtils.escape(s.name) + '"' + (f.sp === s.name ? ' selected' : '') + '>' + FormatUtils.escape(s.name) + '</option>'; }).join('');
    var clOpts = AppState.data.classes.map(function(c) { return '<option value="' + FormatUtils.escape(c.id) + '"' + (f.cls === c.id ? ' selected' : '') + '>' + FormatUtils.escape(c.name) + '</option>'; }).join('');

    var trows = list.map(function(a) {
        var del = isAdmin ? '<button class="btn btn-xs bd" onclick="delAth(\'' + a.id + '\')">Sil</button>' : '';
        return '<tr><td><div class="flex fca gap2" style="cursor:pointer" onclick="go(\'athleteProfile\',{id:\'' + a.id + '\'})">' + UIUtils.getAvatar(36, null, FormatUtils.initials(a.fn, a.ln)) + '<div><div class="tw6" style="color:var(--blue2)">' + FormatUtils.escape(a.fn) + ' ' + FormatUtils.escape(a.ln) + '</div><div class="ts tm">' + DateUtils.age(a.bd) + ' yaş</div></div></div></td><td>' + FormatUtils.escape(a.tc) + '</td><td>' + sportEmoji(a.sp) + ' ' + FormatUtils.escape(a.sp) + '</td><td>' + FormatUtils.escape(className(a.clsId)) + '</td><td><span class="bg ' + statusClass(a.st) + '">' + statusLabel(a.st) + '</span></td><td><button class="btn btn-xs bp" onclick="go(\'athleteProfile\',{id:\'' + a.id + '\'})">Profil</button> <button class="btn btn-xs bs" onclick="editAth(\'' + a.id + '\')">Düzenle</button> ' + del + '</td></tr>';
    }).join('');

    var addBtn = isAdmin ? '<button class="btn bp" onclick="editAth()">+ Yeni Sporcu</button>' : '<div></div>';
    var expBtn = isAdmin ? '<div class="flex gap2 fwrap"><button class="btn bsu" onclick="importAthletesFromExcel()">📊 Excel\'den İçe Aktar</button><button class="btn bs" onclick="exportAthletes()">📤 Excel İndir</button></div>' : '';

    return '<div class="ph"><div class="stit">Sporcular</div></div>'
        + '<div class="flex fjb fca mb3 fwrap gap2"><div class="flex gap2 fwrap"><select class="fs" onchange="AppState.filters.athletes.sp=this.value;go(\'athletes\')"><option value="">Tüm Branşlar</option>' + spOpts + '</select><select class="fs" onchange="AppState.filters.athletes.st=this.value;go(\'athletes\')"><option value="">Tüm Durumlar</option><option value="active"' + (f.st === 'active' ? ' selected' : '') + '>Aktif</option><option value="inactive"' + (f.st === 'inactive' ? ' selected' : '') + '>Pasif</option></select><select class="fs" onchange="AppState.filters.athletes.cls=this.value;go(\'athletes\')"><option value="">Tüm Sınıflar</option>' + clOpts + '</select></div><input class="fs" type="text" placeholder="🔍 İsim veya TC Ara..." style="max-width:250px" value="' + FormatUtils.escape(f.q) + '" onchange="AppState.filters.athletes.q=this.value;go(\'athletes\')"/></div>'
        + '<div class="flex fjb fca mb3 gap2 fwrap">' + addBtn + expBtn + '</div>'
        + '<div class="card"><div class="tw"><table><thead><tr><th>Ad Soyad</th><th>TC</th><th>Branş</th><th>Sınıf</th><th>Durum</th><th>İşlemler</th></tr></thead><tbody>' + trows + '</tbody></table></div></div>';
}

function __renderOnKayit() {
    var isAdmin = AppState.currentUser && AppState.currentUser.role === 'admin';
    var onKayitlar = AppState.data.onKayitlar || [];
    var pendingCount = onKayitlar.filter(function(o) { return o.status === 'new'; }).length;
    var inner = '';

    if (onKayitlar.length === 0) {
        inner = '<div style="text-align:center;padding:40px;color:var(--text3)"><div style="font-size:48px;margin-bottom:12px">📋</div><div class="tw6 tsm mb2">Henüz ön kayıt başvurusu yok.</div><button class="btn bs" onclick="refreshOnKayitlar()">↻ Tekrar Kontrol Et</button></div>';
    } else {
        var rows = onKayitlar.map(function(ok) {
            var ad = ((ok.fn || '') + ' ' + (ok.ln || '')).trim() || ok.studentName || '-';
            var sty = ok.status === 'new' ? 'background:rgba(234,179,8,.07)' : 'opacity:.65';
            var bdg = ok.status === 'new' ? '<span class="bg bg-y">⏳ Bekliyor</span>' : '<span class="bg bg-g">✅ İşlendi</span>';
            var btns = '';
            if (ok.status === 'new') {
                btns += '<button class="btn btn-xs bp" onclick="convertOnKayit(\'' + ok.id + '\')">✅ Onayla</button> ';
                btns += '<button class="btn btn-xs bs" onclick="editOnKayit(\'' + ok.id + '\')">✏️ Düzenle</button> ';
            }
            if (isAdmin) btns += '<button class="btn btn-xs bd" onclick="delOnKayit(\'' + ok.id + '\')">Sil</button>';
            return '<tr style="' + sty + '"><td class="ts">' + (ok.createdAt ? DateUtils.format(ok.createdAt) : '-') + '</td><td class="tw6">' + FormatUtils.escape(ad) + '</td><td class="ts">' + FormatUtils.escape(ok.tc || '-') + '</td><td class="ts">' + (ok.bd ? DateUtils.format(ok.bd) : '-') + '</td><td>' + FormatUtils.escape(ok.className || '-') + '</td><td class="ts">' + FormatUtils.escape(ok.parentName || '-') + '<br><small style="color:var(--text2)">' + FormatUtils.escape(ok.parentPhone || '') + '</small></td><td>' + bdg + '</td><td>' + btns + '</td></tr>';
        }).join('');
        inner = '<div class="tw" style="overflow-x:auto"><table><thead><tr><th>Tarih</th><th>Ad Soyad</th><th>TC</th><th>Doğum</th><th>Sınıf Talebi</th><th>Veli / Telefon</th><th>Durum</th><th>İşlemler</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }

    return '<div class="ph"><div class="stit">📝 Ön Kayıt Başvuruları ' + (pendingCount > 0 ? '<span style="background:var(--yellow);color:#000;border-radius:10px;padding:2px 10px;font-size:12px;font-weight:800;margin-left:8px">' + pendingCount + ' Yeni</span>' : '') + '</div></div>'
        + '<div class="flex fjb fca mb3"><button class="btn bs" onclick="refreshOnKayitlar()">↻ Yenile</button></div>'
        + '<div class="card">' + inner + '</div>';
}

// ────────────────────────────────────────────────────────
// 11) loadOnKayitlar + loadCashTransfers
// ────────────────────────────────────────────────────────
async function loadOnKayitlar() {
    try {
        var sb = getSupabase(); if (!sb) return;
        var bid = AppState.currentBranchId;
        var oid = AppState.currentOrgId;
        if (!bid && !oid) return;
        var data = null, error = null;
        if (bid) { var r = await sb.from('on_kayitlar').select('*').eq('branch_id', bid).order('created_at', { ascending: false }); data = r.data; error = r.error; }
        if ((!data || data.length === 0) && oid) { var r2 = await sb.from('on_kayitlar').select('*').eq('org_id', oid).order('created_at', { ascending: false }); data = r2.data; error = r2.error; }
        if (error) { if (error.message && error.message.includes('on_kayitlar')) console.warn('on_kayitlar tablosu bulunamadı'); return; }
        if (data) {
            AppState.data.onKayitlar = data.map(function(r) { return { id: r.id, studentName: r.student_name || ((r.fn || '') + ' ' + (r.ln || '')).trim(), fn: r.fn || '', ln: r.ln || '', bd: r.bd || '', tc: r.tc || '', clsId: r.cls_id || '', className: r.class_name || '', parentName: r.parent_name || '', parentPhone: r.parent_phone || '', status: r.status || 'new', createdAt: r.created_at || '', orgId: r.org_id || '', branchId: r.branch_id || '' }; });
            var nc = AppState.data.onKayitlar.filter(function(o) { return o.status === 'new'; }).length;
            var badge = document.getElementById('onkayit-badge');
            if (badge) { if (nc > 0) { badge.textContent = nc; badge.classList.remove('dn'); } else badge.classList.add('dn'); }
        }
    } catch (e) { console.warn('loadOnKayitlar exception:', e); }
}

async function loadCashTransfers() {
    try {
        var sb = getSupabase(); if (!sb) return;
        var filter = AppState.currentBranchId ? { branch_id: AppState.currentBranchId } : { org_id: AppState.currentOrgId };
        var { data, error } = await sb.from('cash_transfers').select('*').eq(Object.keys(filter)[0], Object.values(filter)[0]);
        if (error) { console.warn('cash_transfers error:', error); return; }
        AppState.data.cashTransfers = (data || []).map(function(r) { return { id: r.id, direction: r.direction, amount: r.amount, description: r.description, dt: r.dt }; });
    } catch (e) { console.warn('loadCashTransfers:', e); }
}

// Hook into loadBranchData to also load cash transfers
var _origLoadBranch = window.loadBranchData || (typeof loadBranchData === 'function' ? loadBranchData : null);
// We'll call loadCashTransfers after restoreSession completes
// by hooking into DOMContentLoaded

// ────────────────────────────────────────────────────────
// 12) refreshOnKayitlar, convertOnKayit, editOnKayit, etc.
// ────────────────────────────────────────────────────────
window.refreshOnKayitlar = async function() {
    var btn = null;
    try { if (typeof event !== 'undefined' && event && event.target) btn = event.target; } catch(e) {}
    if (btn) { btn.textContent = '...'; btn.disabled = true; }
    await loadOnKayitlar();
    if (btn) { btn.textContent = '↻ Yenile'; btn.disabled = false; }
    if (AppState.ui && AppState.ui.curPage === 'athletes') go('athletes');
    else if (AppState.ui && AppState.ui.curPage === 'onkayit') go('onkayit');
    else if (AppState.ui && AppState.ui.curPage === 'settings') __origGo.call(window, 'settings');
};

window.convertOnKayit = async function(id) {
    var ok = (AppState.data.onKayitlar || []).find(function(x) { return x.id === id; });
    if (!ok) return;
    if (ok.tc) { var existing = AppState.data.athletes.find(function(a) { return a.tc === ok.tc; }); if (existing) { toast('Bu TC zaten kayıtlı!', 'e'); return; } }
    var cls = AppState.data.classes.find(function(c) { return c.id === ok.clsId || c.name === ok.className; });
    var sp = '';
    if (cls) { var sport = AppState.data.sports.find(function(s) { return s.id === cls.spId; }); if (sport) sp = sport.name; }
    var athleteObj = { id: generateId(), fn: ok.fn || '', ln: ok.ln || '', tc: ok.tc || '', bd: ok.bd || null, gn: 'E', ph: '', em: '', sp: sp, cat: '', lic: '', rd: DateUtils.today(), st: 'active', fee: 0, vd: null, nt: '', clsId: cls ? cls.id : (ok.clsId || ''), pn: ok.parentName || '', pph: ok.parentPhone || '', pem: '', spPass: '', orgId: ok.orgId || AppState.currentOrgId || '', branchId: ok.branchId || AppState.currentBranchId || '', address: '', city: '', emergency: '', blood: '', height: '', weight: '', health: '', school: '' };
    try {
        var result = await DB.upsert('athletes', DB.mappers.fromAthlete(athleteObj));
        if (result) {
            AppState.data.athletes.push(athleteObj);
            var sb = getSupabase(); if (sb) await sb.from('on_kayitlar').update({ status: 'done' }).eq('id', id);
            var idx = (AppState.data.onKayitlar || []).findIndex(function(x) { return x.id === id; }); if (idx >= 0) AppState.data.onKayitlar[idx].status = 'done';
            toast('✅ ' + athleteObj.fn + ' ' + athleteObj.ln + ' sporcular listesine kaydedildi!', 'g');
            if (AppState.ui.curPage === 'onkayit') go('onkayit'); else if (AppState.ui.curPage === 'athletes') go('athletes');
        }
    } catch(e) { toast('Hata: ' + (e.message || ''), 'e'); }
};

window.editOnKayit = function(id) {
    var ok = (AppState.data.onKayitlar || []).find(function(x) { return x.id === id; });
    if (!ok) { toast('Ön kayıt bulunamadı!', 'e'); return; }
    var classes = AppState.data.classes || [];
    var clsOpts = classes.map(function(c) { var sel = (ok.clsId === c.id || ok.className === c.name) ? ' selected' : ''; return '<option value="' + FormatUtils.escape(c.id) + '" data-name="' + FormatUtils.escape(c.name) + '"' + sel + '>' + FormatUtils.escape(c.name) + '</option>'; }).join('');
    modal('✏️ Ön Kayıt Düzenle', '<div class="g21 mb2"><div class="fgr"><label>Ad *</label><input id="eok-fn" value="' + FormatUtils.escape(ok.fn || '') + '"/></div><div class="fgr"><label>Soyad *</label><input id="eok-ln" value="' + FormatUtils.escape(ok.ln || '') + '"/></div></div><div class="g21 mb2"><div class="fgr"><label>Doğum Tarihi *</label><input id="eok-bd" type="date" value="' + FormatUtils.escape(ok.bd || '') + '"/></div><div class="fgr"><label>TC Kimlik</label><input id="eok-tc" type="text" inputmode="numeric" maxlength="11" value="' + FormatUtils.escape(ok.tc || '') + '"/></div></div><div class="fgr mb2"><label>Sınıf *</label><select id="eok-cls"><option value="">Seçiniz</option>' + clsOpts + '</select></div><div class="dv"></div><div class="fgr mb2"><label>Veli Adı *</label><input id="eok-pn" value="' + FormatUtils.escape(ok.parentName || '') + '"/></div><div class="fgr mb2"><label>Veli Telefon *</label><input id="eok-pph" type="tel" value="' + FormatUtils.escape(ok.parentPhone || '') + '"/></div>', [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: 'Kaydet', cls: 'bp', fn: async function() {
            var fn = (document.getElementById('eok-fn') || {}).value?.trim() || '';
            var ln = (document.getElementById('eok-ln') || {}).value?.trim() || '';
            var bd = (document.getElementById('eok-bd') || {}).value || '';
            var tc = ((document.getElementById('eok-tc') || {}).value || '').replace(/\D/g, '');
            var clsEl = document.getElementById('eok-cls');
            var clsId = clsEl ? clsEl.value : '';
            var clsName = clsEl && clsEl.selectedIndex >= 0 ? (clsEl.options[clsEl.selectedIndex].dataset.name || clsEl.options[clsEl.selectedIndex].textContent) : '';
            var pn = (document.getElementById('eok-pn') || {}).value?.trim() || '';
            var pph = (document.getElementById('eok-pph') || {}).value?.trim() || '';
            if (!fn || !ln || !bd || !clsId || !pn || !pph) { toast('Zorunlu alanları doldurun!', 'e'); return; }
            var idx = (AppState.data.onKayitlar || []).findIndex(function(x) { return x.id === id; });
            if (idx >= 0) { Object.assign(AppState.data.onKayitlar[idx], { fn: fn, ln: ln, studentName: fn + ' ' + ln, bd: bd, tc: tc, clsId: clsId, className: clsName, parentName: pn, parentPhone: pph }); }
            try {
                var sb = getSupabase();
                if (sb) await sb.from('on_kayitlar').update({ student_name: fn + ' ' + ln, fn: fn, ln: ln, bd: bd || null, tc: tc || null, cls_id: clsId || null, class_name: clsName, parent_name: pn, parent_phone: pph }).eq('id', id);
                toast('✅ Güncellendi!', 'g');
            } catch(e) { toast('Hata: ' + (e.message || ''), 'e'); }
            closeModal();
            if (AppState.ui.curPage === 'onkayit') go('onkayit');
            else if (AppState.ui.curPage === 'athletes') go('athletes');
        }}
    ]);
    setTimeout(function() { if (typeof setupTCInput === 'function') setupTCInput('eok-tc'); }, 100);
};

// ────────────────────────────────────────────────────────
// 13) Ön Kayıt butonu yönetici modunda gizle
// ────────────────────────────────────────────────────────
var __origSwitchTab = window.switchLoginTab;
window.switchLoginTab = function(tab) {
    if (__origSwitchTab) __origSwitchTab(tab);
    var btn = document.getElementById('on-kayit-btn');
    if (btn) { var adm = document.getElementById('login-admin'); btn.style.display = (adm && !adm.classList.contains('dn')) ? 'none' : 'block'; }
};
setTimeout(function() { if (window.location.href.includes('admin')) { var btn = document.getElementById('on-kayit-btn'); if (btn) btn.style.display = 'none'; } }, 100);

// ────────────────────────────────────────────────────────
// 14) showOnKayitForm + submitOnKayit (from V7)
// ────────────────────────────────────────────────────────
window.showOnKayitForm = async function() {
    var classes = AppState.data.classes || [];
    var fOrg = AppState.currentOrgId || '';
    var fBranch = AppState.currentBranchId || '';
    if (classes.length === 0) { try { var sb = getSupabase(); if (sb) { var r = await sb.from('classes').select('*').limit(50); if (r.data && r.data.length) { classes = r.data.map(DB.mappers.toClass); if (!fOrg) fOrg = r.data[0].org_id || ''; if (!fBranch) fBranch = r.data[0].branch_id || ''; } } } catch(e) {} }
    if (!fOrg && !fBranch) { try { var sb2 = getSupabase(); if (sb2) { var r2 = await sb2.from('settings').select('org_id, branch_id').limit(1); if (r2.data && r2.data.length) { fOrg = r2.data[0].org_id || ''; fBranch = r2.data[0].branch_id || ''; } } } catch(e) {} }
    var opts = classes.map(function(c) { return '<option value="' + FormatUtils.escape(c.id) + '" data-name="' + FormatUtils.escape(c.name) + '">' + FormatUtils.escape(c.name) + '</option>'; }).join('');
    var h = '<div id="onkayit-modal" style="position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:2000;padding:16px"><input type="hidden" id="ok-org-id" value="' + fOrg + '"/><input type="hidden" id="ok-branch-id" value="' + fBranch + '"/><div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;width:100%;max-width:520px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden"><div style="padding:20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center"><div><div style="font-size:18px;font-weight:800">📝 Ön Kayıt Formu</div></div><button onclick="document.getElementById(\'onkayit-modal\').remove()" style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:6px;cursor:pointer;color:var(--text);min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center">✕</button></div><div style="padding:20px;overflow-y:auto;flex:1"><div class="g21 mb2"><div class="fgr"><label>Ad *</label><input id="ok-fn"/></div><div class="fgr"><label>Soyad *</label><input id="ok-ln"/></div></div><div class="g21 mb2"><div class="fgr"><label>Doğum Tarihi *</label><input id="ok-bd" type="date"/></div><div class="fgr"><label>TC Kimlik</label><input id="ok-tc" type="text" inputmode="numeric" maxlength="11"/></div></div><div class="fgr mb2"><label>Sınıf *</label><select id="ok-cls"><option value="">Seçiniz</option>' + opts + '</select></div><div class="dv"></div><div class="g21 mb2"><div class="fgr"><label>Veli Adı *</label><input id="ok-pn"/></div><div class="fgr"><label>Veli Soyadı</label><input id="ok-psn"/></div></div><div class="fgr mb2"><label>Veli Telefon *</label><input id="ok-pph" type="tel"/></div></div><div style="padding:16px;border-top:1px solid var(--border);display:flex;gap:12px;justify-content:flex-end"><button class="btn bs" onclick="document.getElementById(\'onkayit-modal\').remove()">İptal</button><button class="btn bp" onclick="submitOnKayit()">Ön Kayıt Yap</button></div></div></div>';
    document.body.insertAdjacentHTML('beforeend', h);
    setTimeout(function() { setupTCInput('ok-tc'); }, 100);
};

window.submitOnKayit = async function() {
    var fn = (document.getElementById('ok-fn') || {}).value?.trim() || '';
    var ln = (document.getElementById('ok-ln') || {}).value?.trim() || '';
    var bd = (document.getElementById('ok-bd') || {}).value || '';
    var tc = ((document.getElementById('ok-tc') || {}).value || '').replace(/\D/g, '');
    var clsEl = document.getElementById('ok-cls');
    var clsId = clsEl ? clsEl.value : '';
    var clsName = clsEl && clsEl.selectedIndex >= 0 ? (clsEl.options[clsEl.selectedIndex].dataset.name || clsEl.options[clsEl.selectedIndex].textContent) : '';
    var pn = (document.getElementById('ok-pn') || {}).value?.trim() || '';
    var psn = (document.getElementById('ok-psn') || {}).value?.trim() || '';
    var pph = (document.getElementById('ok-pph') || {}).value?.trim() || '';
    if (!fn || !ln || !bd || !clsId || !pn || !pph) { toast('Zorunlu alanları doldurun!', 'e'); return; }
    var rOrg = AppState.currentOrgId || (document.getElementById('ok-org-id') || {}).value || '';
    var rBranch = AppState.currentBranchId || (document.getElementById('ok-branch-id') || {}).value || '';
    if (!rOrg && !rBranch) { toast('Kurum bilgisi alınamadı.', 'e'); return; }
    var id = generateId();
    var sName = fn + ' ' + ln;
    var pName = psn ? (pn + ' ' + psn) : pn;
    try {
        var sb = getSupabase();
        if (sb) await sb.from('on_kayitlar').insert({ id: id, student_name: sName, fn: fn, ln: ln, bd: bd || null, tc: tc || null, cls_id: clsId || null, class_name: clsName, parent_name: pName, parent_phone: pph, status: 'new', created_at: DateUtils.today(), org_id: rOrg, branch_id: rBranch });
    } catch(e) { console.error('submitOnKayit:', e); }
    if (!AppState.data.onKayitlar) AppState.data.onKayitlar = [];
    AppState.data.onKayitlar.unshift({ id: id, studentName: sName, fn: fn, ln: ln, bd: bd, tc: tc, clsId: clsId, className: clsName, parentName: pName, parentPhone: pph, status: 'new', createdAt: DateUtils.today(), orgId: rOrg, branchId: rBranch });
    try { await sendOnKayitSms(pph, fn, ln, clsName); } catch(e) {}
    var m = document.getElementById('onkayit-modal'); if (m) m.remove();
    toast('✅ Ön kayıt başarıyla alındı!', 'g');
};

// ────────────────────────────────────────────────────────
// 15) Sporcu portalında makbuz indirme butonu (spOdemeler override)
// ────────────────────────────────────────────────────────
var _origSpOdemeler = typeof spOdemeler === 'function' ? spOdemeler : null;
window.spOdemeler = function() {
    var a = AppState.currentSporcu;
    if (!a) return '';
    var completed = AppState.data.payments.filter(function(p) { return p.aid === a.id && p.st === 'completed'; }).sort(function(x, y) { return new Date(y.dt) - new Date(x.dt); });
    var pending = AppState.data.payments.filter(function(p) { return p.aid === a.id && p.notifStatus === 'pending_approval'; }).sort(function(x, y) { return new Date(y.dt) - new Date(x.dt); });
    var pendingPlans = AppState.data.payments.filter(function(p) { return p.aid === a.id && p.source === 'plan' && p.st !== 'completed'; }).sort(function(x, y) { return x.dt.localeCompare(y.dt); });
    var totalPaid = completed.reduce(function(s, p) { return s + (p.amt || 0); }, 0);
    var totalDebt = pendingPlans.reduce(function(s, p) { return s + (p.amt || 0); }, 0);
    var mIcon = function(m) { return ({ nakit: '💵', kredi_karti: '💳', havale: '🏦', paytr: '🔵' })[m] || '💰'; };
    var mLabel = function(m) { return ({ nakit: 'Nakit', kredi_karti: 'Kredi Kartı', havale: 'Havale/EFT', paytr: 'PayTR Online' })[m] || (m || 'Ödeme'); };

    var html = '<div class="sp-stats-row mb3"><div class="stat-box"><div class="stat-box-value tg">' + FormatUtils.currency(totalPaid) + '</div><div class="stat-box-label">Toplam Ödenen</div></div><div class="stat-box"><div class="stat-box-value ' + (totalDebt > 0 ? 'tr2' : 'tg') + '">' + FormatUtils.currency(totalDebt) + '</div><div class="stat-box-label">Toplam Borç</div></div><div class="stat-box"><div class="stat-box-value ' + (pending.length > 0 ? 'to' : 'tg') + '">' + pending.length + '</div><div class="stat-box-label">Onay Bekleyen</div></div></div>';

    if (pendingPlans.length > 0) {
        html += '<div class="card mb3" style="border-left:3px solid var(--red)"><div class="flex fjb fca mb2"><div class="tw6 ts" style="color:var(--red)">📋 Bekleyen Planlarım (' + pendingPlans.length + ')</div><button class="btn bp btn-sm" onclick="spTab(\'odeme-yap\')">Ödeme Yap →</button></div>';
        pendingPlans.forEach(function(p) { html += '<div class="payment-card"><div class="payment-info"><div class="payment-amount">' + FormatUtils.currency(p.amt) + '</div><div class="payment-date">' + FormatUtils.escape(p.ds || 'Aidat') + ' • Vade: ' + DateUtils.format(p.dt) + '</div></div><span class="bg ' + (p.st === 'overdue' ? 'bg-r' : 'bg-y') + '">' + (p.st === 'overdue' ? 'Gecikmiş' : 'Bekliyor') + '</span></div>'; });
        html += '</div>';
    }

    html += '<div class="card"><div class="tw6 tsm mb3">✅ Ödeme Geçmişim</div>';
    if (completed.length === 0) {
        html += '<div class="empty-state"><div style="font-size:44px;margin-bottom:10px">📭</div><div class="tw6 ts">Henüz onaylanmış ödeme yok</div></div>';
    } else {
        completed.forEach(function(p) {
            html += '<div class="payment-card" style="gap:12px"><div style="font-size:28px;flex-shrink:0">' + mIcon(p.payMethod) + '</div><div class="payment-info" style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px"><span class="payment-amount tg">' + FormatUtils.currency(p.amt) + '</span></div><div class="payment-date">' + DateUtils.format(p.dt) + ' • ' + FormatUtils.escape(p.serviceName || p.ds || 'Aidat') + '</div><div class="ts tm" style="margin-top:2px">' + mLabel(p.payMethod) + '</div></div><div class="flex fc gap2" style="align-items:flex-end;flex-shrink:0"><span class="bg bg-g">Ödendi ✓</span><button class="btn btn-xs bpur" onclick="generateReceipt(\'' + p.id + '\')">🧾 Makbuz</button></div></div>';
        });
    }
    html += '</div>';
    return html;
};

// ────────────────────────────────────────────────────────
// 16) Settings: WhatsApp ayarları (hook into pgSettings)
// ────────────────────────────────────────────────────────
window.saveWhatsAppSettings = async function() {
    var obj = Object.assign({}, AppState.data.settings || {}, {
        waApiToken: UIUtils.getValue('s-wa-token').trim(),
        waPhoneId: UIUtils.getValue('s-wa-phone').trim(),
        waReminderDay: parseInt(UIUtils.getValue('s-wa-day')) || 1,
        waActive: document.getElementById('s-wa-active')?.checked || false
    });
    var mapped = DB.mappers.fromSettings(obj);
    // Add WhatsApp fields manually since fromSettings may not have them
    mapped.wa_api_token = obj.waApiToken || '';
    mapped.wa_phone_id = obj.waPhoneId || '';
    mapped.wa_reminder_day = obj.waReminderDay || 1;
    mapped.wa_active = obj.waActive || false;
    var result = await DB.upsert('settings', mapped);
    if (result) { AppState.data.settings = obj; toast('WhatsApp ayarları kaydedildi!', 'g'); }
};

// WhatsApp kartı ve ön kayıt düzenle butonu artık script.js pgSettings() içinde birleştirildi.

// ────────────────────────────────────────────────────────
// 17) DOMContentLoaded: iOS Safari fix + misc
// ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {

    // iOS Safari legal link fix
    var links = document.querySelectorAll('.login-legal button, .login-legal a');
    links.forEach(function(link) {
        link.addEventListener('touchend', function(e) {
            e.preventDefault();
            var href = link.getAttribute('onclick') || '';
            if (href.indexOf('kvkk') !== -1) window.showLegal('kvkk');
            else if (href.indexOf('kullanim') !== -1) window.showLegal('kullanim');
        }, { passive: false });
    });
});
// ═══════════════════════════════════════════════════════════
// DB.MAPPERS GUARD FIX — V9.1 PATCH
// script-fixes.js'in EN SONUNDAKİ DB.mappers guard bloğunun
// yerini alır. Retry mekanizması ile mapper extend garantisi.
// ═══════════════════════════════════════════════════════════
//
// KULLANIM:
// script-fixes.js'in en altındaki şu satırları SİLİN:
//
//   if (!window.DB || !DB.mappers || typeof DB.mappers.fromSettings !== 'function') {
//       console.error('script-fixes.js: DB.mappers hazır değil — mapper extend atlandı.');
//   } else {
//       ... (tüm extend blokları)
//   }
//
// Yerine aşağıdaki kodu YAPIŞTIRIN:
// ═══════════════════════════════════════════════════════════
 
function _extendMappers() {
    if (typeof DB === 'undefined' || !DB.mappers || typeof DB.mappers.fromSettings !== 'function') {
        return false; // henüz hazır değil
    }
 
    // Zaten extend edilmişse tekrar yapma
    if (window._mappersExtended) return true;
    window._mappersExtended = true;
 
    console.log('✅ DB.mappers extend ediliyor...');
 
    // Extend settings mapper
    var _origFromSettings = DB.mappers.fromSettings;
    DB.mappers.fromSettings = function(s) {
        var base = _origFromSettings(s);
        base.wa_api_token = s.waApiToken || '';
        base.wa_phone_id = s.waPhoneId || '';
        base.wa_reminder_day = s.waReminderDay || 1;
        base.wa_active = s.waActive || false;
        base.receipt_counter = s.receiptCounter || 0;
        return base;
    };
 
    var _origToSettings = DB.mappers.toSettings;
    DB.mappers.toSettings = function(r) {
        var base = _origToSettings(r);
        base.waApiToken = r.wa_api_token || '';
        base.waPhoneId = r.wa_phone_id || '';
        base.waReminderDay = r.wa_reminder_day || 1;
        base.waActive = r.wa_active || false;
        base.receiptCounter = r.receipt_counter || 0;
        return base;
    };
 
    // Extend payment mapper
    var _origToPayment = DB.mappers.toPayment;
    DB.mappers.toPayment = function(r) {
        var base = _origToPayment(r);
        base.receiptNo = r.receipt_no || '';
        return base;
    };
 
    var _origFromPayment = DB.mappers.fromPayment;
    DB.mappers.fromPayment = function(p) {
        var base = _origFromPayment(p);
        base.receipt_no = p.receiptNo || '';
        return base;
    };
 
    console.log('✅ DB.mappers extend tamamlandı!');
    return true;
}
 
// Hemen dene
if (!_extendMappers()) {
    console.warn('⏳ DB.mappers henüz hazır değil — retry başlatılıyor...');
    // 100ms, 300ms, 500ms, 1000ms, 2000ms aralıklarla dene
    var _retryDelays = [100, 300, 500, 1000, 2000];
    _retryDelays.forEach(function(delay) {
        setTimeout(function() {
            if (!window._mappersExtended) {
                if (_extendMappers()) {
                    console.log('✅ DB.mappers extend ' + delay + 'ms sonra başarılı!');
                }
            }
        }, delay);
    });
}
 
console.log('✅ Script-fixes V9.1 yüklendi — DB.mappers retry fix dahil');

// ────────────────────────────────────────────────────────
// PayTR FIX: submitSpPayment override
// Orijinal submitSpPayment, local scope'daki initiatePayTRPayment'ı
// çağırıyor. window.initiatePayTRPayment override'ımızı kullanması
// için submitSpPayment'ı da override ediyoruz.
// ────────────────────────────────────────────────────────

window.submitSpPayment = async function() {
    var desc = UIUtils.getValue('sp-desc');
    var method = AppState.ui.selectedPayMethod;
    var a = AppState.currentSporcu;
    var planId = AppState.ui.activePlanId;
    var planIds = AppState.ui.activePlanIds || (planId ? [planId] : []);

    if (!method) { toast('Lütfen ödeme yöntemi seçiniz!', 'e'); return; }

    var plans = planIds.map(function(id) { return AppState.data.payments.find(function(p) { return p.id === id; }); }).filter(Boolean);
    var totalAmt = plans.length > 0 ? plans.reduce(function(s, p) { return s + (p.amt || 0); }, 0) : (a.fee || 0);
    if (!totalAmt || totalAmt <= 0) { toast('Ödenecek tutar bulunamadı!', 'e'); return; }

    if (method === 'paytr') {
        await window.initiatePayTRPayment(totalAmt, desc);
        return;
    }

    // PayTR değilse: havale/nakit/kredi kartı bildirimi
    var sb = getSupabase();
    if (!sb) { toast('Bağlantı hatası.', 'e'); return; }

    try {
        var payList = plans.length > 0 ? plans : [null];
        for (var i = 0; i < payList.length; i++) {
            var plan = payList[i];
            var amt = plan ? plan.amt : totalAmt;
            var payObj = {
                id: generateId(),
                aid: a.id,
                an: a.fn + ' ' + a.ln,
                amt: amt,
                ds: desc || (plan && plan.ds) || 'Veli bildirimi',
                st: 'pending',
                dt: (plan && plan.dt) || DateUtils.today(),
                ty: 'income',
                serviceName: desc || (plan && plan.ds) || 'Veli bildirimi',
                source: 'parent_notification',
                notifStatus: 'pending_approval',
                payMethod: method
            };
            var result = await sb.from('payments').insert(DB.mappers.fromPayment(payObj));
            if (result.error) throw result.error;
            AppState.data.payments.push(payObj);
        }
        var methodLabel = method === 'nakit' ? 'Nakit' : method === 'kredi_karti' ? 'Kredi Kartı' : 'Havale';
        var count = plans.length > 1 ? ' (' + plans.length + ' ay)' : '';
        toast('✅ ' + methodLabel + ' ödeme bildiriminiz alındı' + count + '! Yönetici onaylayacak.', 'g');
        AppState.ui.activePlanId = null;
        AppState.ui.activePlanIds = null;
        var payForm = document.getElementById('sp-pay-form');
        if (payForm) payForm.style.display = 'none';
        spTab('odemeler');
    } catch(e) {
        toast('Bildirim gönderilemedi: ' + (e.message || e), 'e');
    }
};

// ────────────────────────────────────────────────────────
// PayTR FIX v4: initiatePayTRPayment — email fix + detaylı hata mesajları
// v4 Düzeltmeler:
// - Email: .local domain kullanılmıyor, fallback email kullanılıyor
// - user_basket: TL cinsinden fiyat (PayTR resmi dokümanına uygun)
// - Hata durumunda PayTR debug bilgisi console'a yazılır
// - Adım adım debug logları
// ────────────────────────────────────────────────────────

window.initiatePayTRPayment = async function(amt, desc) {
    var s = AppState.data.settings;
    var a = AppState.currentSporcu;

    if (!s || !s.paytrActive || !s.paytrMerchantId) {
        toast('PayTR ayarları yapılandırılmamış. Yöneticiye başvurun.', 'e');
        return;
    }

    var sb = getSupabase();
    if (!sb) { toast('Bağlantı hatası', 'e'); return; }

    UIUtils.setLoading(true);
    try {
        // PayTR: merchant_oid sadece alfanumerik olmalı, max 64 karakter
        var orderId = 'PAY' + (typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID().replace(/-/g, '').slice(0, 20)
            : a.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) + Date.now());
        var amtKurus = Math.round(amt * 100);

        // ─── user_basket: PayTR Base64 encode bekler ───
        // PayTR resmi doküman: basket fiyatları TL cinsinden string
        // Örnek: [["Sample Product 1", "18.00", 1]]
        var basketDesc = (desc || 'Aidat').replace(/[^\x00-\x7F]/g, function(ch) {
            var map = {'ç':'c','Ç':'C','ğ':'g','Ğ':'G','ı':'i','İ':'I','ö':'o','Ö':'O','ş':'s','Ş':'S','ü':'u','Ü':'U'};
            return map[ch] || '';
        });
        var amtTL = amt.toFixed(2); // TL cinsinden: "2500.00"
        var basketArr = [[basketDesc, amtTL, 1]];
        var basketJson = JSON.stringify(basketArr);
        var userBasket = btoa(basketJson);

        console.log('[PayTR v4] basket:', { amtTL: amtTL, amtKurus: amtKurus, basketJson: basketJson });

        // user_name: PayTR 60 karakter limiti, Türkçe → ASCII
        var userName = (a.fn + ' ' + a.ln).substring(0, 60).replace(/[^\x00-\x7F]/g, function(ch) {
            var map = {'ç':'c','Ç':'C','ğ':'g','Ğ':'G','ı':'i','İ':'I','ö':'o','Ö':'O','ş':'s','Ş':'S','ü':'u','Ü':'U'};
            return map[ch] || '';
        });

        // v4 FIX: Email — .local domain PayTR tarafından reddedilebilir
        var email = a.em;
        if (!email || email.indexOf('@') === -1 || email.endsWith('.local')) {
            email = 'musteri@dragosakademi.com';
        }

        var requestBody = {
            merchant_id: s.paytrMerchantId,
            merchant_oid: orderId,
            email: email,
            payment_amount: String(amtKurus),
            user_name: userName,
            user_address: 'Turkiye',
            user_phone: a.pph || a.ph || '05000000000',
            merchant_ok_url: window.location.origin + window.location.pathname + '?paytr=ok&oid=' + orderId,
            merchant_fail_url: window.location.origin + window.location.pathname + '?paytr=fail&oid=' + orderId,
            user_basket: userBasket,
            currency: 'TL',
            test_mode: '0',
            no_installment: '1',
            max_installment: '0',
            lang: 'tr'
        };

        // Doğrudan fetch ile Edge Function çağır
        var supabaseUrl = 'https://wfarbydojxtufnkjuhtc.supabase.co';
        var supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYXJieWRvanh0dWZua2p1aHRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTA1MzUsImV4cCI6MjA4ODIyNjUzNX0.-v9mu-jvt-sFOLyki5uKvEbh3uY_3e3wHniKj8PezYw';

        console.log('[PayTR v4] Edge Function çağrılıyor:', orderId);
        console.log('[PayTR v4] İstek özeti:', {
            merchant_oid: orderId,
            payment_amount: requestBody.payment_amount,
            email: requestBody.email,
            user_basket_len: userBasket.length,
            currency: requestBody.currency,
            test_mode: requestBody.test_mode
        });

        var response = await fetch(supabaseUrl + '/functions/v1/paytr-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseAnonKey,
                'Authorization': 'Bearer ' + supabaseAnonKey
            },
            body: JSON.stringify(requestBody)
        });

        console.log('[PayTR v4] Response status:', response.status);

        var textResp = await response.text();
        console.log('[PayTR v4] Raw response:', textResp.substring(0, 500));

        var tokenData;
        try {
            tokenData = JSON.parse(textResp);
        } catch(jsonErr) {
            console.error('[PayTR v4] Response JSON parse hatası:', textResp);
            throw new Error('Edge Function yanıt parse hatası');
        }

        console.log('[PayTR v4] Parsed response:', tokenData);

        if (!response.ok || !tokenData || !tokenData.token) {
            var errMsg = tokenData && tokenData.error ? tokenData.error :
                         tokenData && tokenData.msg ? tokenData.msg :
                         'Token alınamadı (HTTP ' + response.status + ')';

            // Debug bilgisini console'a yaz (sadece geliştirici için)
            console.error('[PayTR] Edge function version:', tokenData && tokenData.version || 'unknown');
            if (tokenData && tokenData.debug) {
                console.error('[PayTR] Debug info:', JSON.stringify(tokenData.debug, null, 2));
            }
            if (tokenData && tokenData.paytr_response) {
                console.error('[PayTR] PayTR response:', JSON.stringify(tokenData.paytr_response, null, 2));
            }
            if (tokenData && tokenData.troubleshooting) {
                console.error('[PayTR] Çözüm önerileri:');
                tokenData.troubleshooting.forEach(function(t) { console.error('  → ' + t); });
            }

            // Kullanıcıya daha anlaşılır hata mesajı göster
            var userMsg = 'Ödeme sistemi şu an kullanılamıyor. Lütfen daha sonra tekrar deneyin.';
            if (errMsg.indexOf('paytr_token') !== -1) {
                userMsg = 'Ödeme token doğrulaması başarısız. PayTR Merchant Key ve Salt ayarlarını kontrol edin. Supabase Secrets\'ta PAYTR_MERCHANT_KEY ve PAYTR_MERCHANT_SALT değerlerinin PayTR panelindeki değerlerle birebir aynı olduğundan emin olun.';
            } else if (errMsg.indexOf('credentials eksik') !== -1 || errMsg.indexOf('Secrets') !== -1) {
                userMsg = 'PayTR API anahtarları tanımlı değil. Supabase Secrets\'ta PAYTR_MERCHANT_ID, PAYTR_MERCHANT_KEY ve PAYTR_MERCHANT_SALT tanımlanmalı.';
            } else if (errMsg.indexOf('notify_url') !== -1) {
                userMsg = 'PayTR bildirim URL\'si oluşturulamadı. SUPABASE_URL veya PAYTR_NOTIFY_URL ayarını kontrol edin.';
            }
            throw new Error(userMsg);
        }

        // Bekleyen ödeme kaydı oluştur
        var pendingPay = {
            id: orderId,
            aid: a.id,
            an: a.fn + ' ' + a.ln,
            amt: amt,
            ds: desc || 'PayTR Ödemesi',
            st: 'pending',
            dt: DateUtils.today(),
            ty: 'income',
            serviceName: desc || 'PayTR Ödemesi',
            source: 'paytr',
            notifStatus: '',
            payMethod: 'paytr'
        };
        await sb.from('payments').insert(DB.mappers.fromPayment(pendingPay));
        AppState.data.payments.push(pendingPay);

        // postMessage listener için orderId'yi kaydet
        AppState._paytrCurrentOrderId = orderId;

        // PayTR iframe aç
        showPayTRModal(tokenData.token, orderId);

    } catch (e) {
        console.error('[PayTR v4] Error:', e);
        toast('PayTR hatası: ' + e.message, 'e');
    } finally {
        UIUtils.setLoading(false);
    }
};

console.log('✅ PayTR initiatePayTRPayment v4 override yüklendi');

// ────────────────────────────────────────────────────────
// PayTR FIX v3: postMessage listener
// PayTR iframe ödeme sonrası window.postMessage ile bildirim gönderiyor.
// Orijinal kodda bu dinlenmiyordu → ödeme tamamlansa da frontend'de
// "pending" kalıyordu. Webhook DB'yi güncelliyor ama UI yansımıyordu.
// ────────────────────────────────────────────────────────
(function installPayTRMessageListener() {
    // Daha önce eklenmiş mi kontrol et (double-load guard)
    if (window.__paytrMessageListenerInstalled) return;
    window.__paytrMessageListenerInstalled = true;

    window.addEventListener('message', async function(event) {
        // Güvenlik: sadece PayTR'dan gelen mesajları kabul et
        if (!event.origin || !event.origin.includes('paytr.com')) return;

        var data = event.data;
        if (!data) return;

        // PayTR mesaj formatı: { status: 'success'|'failed', merchant_oid: '...' }
        // veya string olarak gelebilir
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch(e) { return; }
        }

        var orderId = data.merchant_oid || AppState._paytrCurrentOrderId;
        var status  = data.status; // 'success' veya 'failed'

        if (!orderId || !status) return;

        console.log('[PayTR postMessage]', status, orderId);

        // Modal'ı kapat
        if (typeof closeModal === 'function') closeModal();

        // handlePayTRCallback ile senkronize et (varsa)
        if (typeof window.handlePayTRCallback === 'function') {
            await window.handlePayTRCallback(orderId, status === 'success' ? 'success' : 'fail');
        }
    });

    console.log('✅ PayTR postMessage listener kuruldu');
})();

// ── H1: SETTINGS MAPPER — Hukuki alanlar ────────────────────────────────
(function() {
    function _applyH1() {
        if (typeof DB === 'undefined' || !DB || !DB.mappers || typeof DB.mappers.toSettings !== 'function') {
            setTimeout(_applyH1, 300);
            return;
        }
        if (window._h1Applied) return;
        window._h1Applied = true;
    var _origToSettings = DB.mappers.toSettings.bind(DB.mappers);
    DB.mappers.toSettings = function(r) {
        var base = _origToSettings(r);
        base.kvkkText             = r.kvkk_text             || '';
        base.termsText            = r.terms_text            || '';
        base.dataControllerName   = r.data_controller_name  || '';
        base.dataControllerAddr   = r.data_controller_address || '';
        base.dataControllerPhone  = r.data_controller_phone || '';
        base.dataControllerEmail  = r.data_controller_email || '';
        base.dataControllerTaxNo  = r.data_controller_tax_no || '';
        base.dataRetentionYears   = r.data_retention_years  || 5;
        base.breachProcedure      = r.breach_procedure      || '';
        base.cookieBannerEnabled  = r.cookie_banner_enabled !== false;
        return base;
    };

    var _origFromSettings = DB.mappers.fromSettings.bind(DB.mappers);
    DB.mappers.fromSettings = function(s) {
        var base = _origFromSettings(s);
        base.kvkk_text              = s.kvkkText            || '';
        base.terms_text             = s.termsText           || '';
        base.data_controller_name   = s.dataControllerName  || '';
        base.data_controller_address= s.dataControllerAddr  || '';
        base.data_controller_phone  = s.dataControllerPhone || '';
        base.data_controller_email  = s.dataControllerEmail || '';
        base.data_controller_tax_no = s.dataControllerTaxNo || '';
        base.data_retention_years   = s.dataRetentionYears  || 5;
        base.breach_procedure       = s.breachProcedure     || '';
        base.cookie_banner_enabled  = s.cookieBannerEnabled !== false;
        return base;
    };
    console.log('✅ H1: Settings mapper genişletildi');
    } // end _applyH1
    _applyH1();
})();

// ── T1: SUNUCU BAĞLANTI HATASI — Otomatik yeniden bağlanma ──────────────
(function() {
    var _failCount = 0;
    var _reconnectTimer = null;
    var _MAX_FAILS = 3;
    var _connected = true;

    var _origFetch = window.fetch;
    window.fetch = function(url, opts) {
        return _origFetch.apply(this, arguments)
            .then(function(resp) {
                if (typeof url === 'string' && url.indexOf('supabase.co') !== -1 && resp.ok) {
                    if (!_connected) { _connected = true; _failCount = 0; _hideConnBanner(); }
                }
                return resp;
            })
            .catch(function(err) {
                if (typeof url === 'string' && url.indexOf('supabase.co') !== -1) {
                    _failCount++;
                    if (_failCount >= _MAX_FAILS && _connected) {
                        _connected = false;
                        _showConnBanner();
                        _startReconnect();
                    }
                }
                throw err;
            });
    };

    function _showConnBanner() {
        if (document.getElementById('_conn-banner')) return;
        var b = document.createElement('div');
        b.id = '_conn-banner';
        b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99998;background:#c0392b;color:#fff;text-align:center;padding:10px 16px;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:12px;box-shadow:0 2px 8px rgba(0,0,0,.3)';
        b.innerHTML = '🔌 Sunucu bağlantısı kesildi — yeniden bağlanılıyor...<button onclick="location.reload()" style="background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px;margin-left:8px">Sayfayı Yenile</button>';
        document.body.prepend(b);
    }

    function _hideConnBanner() {
        var b = document.getElementById('_conn-banner');
        if (!b) return;
        b.style.background = '#27ae60';
        b.innerHTML = '✅ Bağlantı yeniden kuruldu!';
        setTimeout(function() { if (b.parentNode) b.parentNode.removeChild(b); }, 2500);
    }

    function _startReconnect() {
        if (_reconnectTimer) return;
        var attempt = 0;
        var delays = [3000, 5000, 10000, 15000, 30000];
        function _try() {
            attempt++;
            var delay = delays[Math.min(attempt - 1, delays.length - 1)];
            _reconnectTimer = setTimeout(function() {
                _reconnectTimer = null;
                var sb = typeof getSupabase === 'function' ? getSupabase() : null;
                if (!sb) { _try(); return; }
                sb.from('settings').select('id').limit(1)
                    .then(function(r) {
                        if (!r.error) { _connected = true; _failCount = 0; _hideConnBanner(); }
                        else _try();
                    })
                    .catch(function() { _try(); });
            }, delay);
        }
        _try();
    }
    console.log('✅ T1: Bağlantı hatası handler aktif');
})();

// ── T2: OFFLINE MOD BANNER ───────────────────────────────────────────────
(function() {
    function _showOffline() {
        if (document.getElementById('_offline-banner')) return;
        var b = document.createElement('div');
        b.id = '_offline-banner';
        b.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99997;background:#e67e22;color:#fff;text-align:center;padding:8px;font-size:12px;font-weight:600';
        b.textContent = '📵 İnternet bağlantısı yok — veriler önbellekten gösteriliyor';
        document.body.appendChild(b);
    }
    function _hideOffline() {
        var b = document.getElementById('_offline-banner');
        if (!b) return;
        b.style.background = '#27ae60';
        b.textContent = '✅ İnternet bağlantısı yeniden kuruldu';
        setTimeout(function() { if (b.parentNode) b.parentNode.removeChild(b); }, 2000);
    }
    window.addEventListener('offline', _showOffline);
    window.addEventListener('online', _hideOffline);
    if (!navigator.onLine) _showOffline();
    console.log('✅ T2: Offline banner aktif');
})();

// ── T3: SUPABASE REALTIME ────────────────────────────────────────────────
(function() {
    var _realtimeInited = false;

    function _initRealtime() {
        if (_realtimeInited) return;
        var sb = typeof getSupabase === 'function' ? getSupabase() : null;
        if (!sb || !AppState || !AppState.currentOrgId) return;
        _realtimeInited = true;

        // Ödemeler
        sb.channel('rt-payments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, function(payload) {
                if (!AppState.data) return;
                AppState.data.payments = AppState.data.payments || [];
                var ev = payload.eventType;
                var row = payload.new || payload.old;
                if (!row) return;
                var mapped = (DB && DB.mappers && DB.mappers.toPayment) ? DB.mappers.toPayment(row) : row;
                if (ev === 'INSERT') {
                    if (!AppState.data.payments.find(function(x) { return x.id === mapped.id; }))
                        AppState.data.payments.push(mapped);
                } else if (ev === 'UPDATE') {
                    var i = AppState.data.payments.findIndex(function(x) { return x.id === mapped.id; });
                    if (i >= 0) AppState.data.payments[i] = mapped;
                } else if (ev === 'DELETE') {
                    AppState.data.payments = AppState.data.payments.filter(function(x) { return x.id !== (payload.old && payload.old.id); });
                }
                if (AppState.currentPage === 'payments') {
                    try { if (typeof go === 'function') go('payments'); } catch(e) {}
                }
            })
            .subscribe();

        // Ön kayıtlar
        sb.channel('rt-onkayit')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'on_kayitlar' }, function(payload) {
                AppState.data.onKayitlar = AppState.data.onKayitlar || [];
                if (!AppState.data.onKayitlar.find(function(x) { return x.id === payload.new.id; })) {
                    var r = payload.new;
                    AppState.data.onKayitlar.unshift({ id: r.id, studentName: r.student_name || '', fn: r.fn || '', ln: r.ln || '', bd: r.bd || '', tc: r.tc || '', clsId: r.cls_id || '', className: r.class_name || '', parentName: r.parent_name || '', parentPhone: r.parent_phone || '', status: r.status || 'new', createdAt: r.created_at || '', orgId: r.org_id || '', branchId: r.branch_id || '' });
                }
                // Badge güncelle
                var newCount = AppState.data.onKayitlar.filter(function(x) { return x.status === 'new'; }).length;
                document.querySelectorAll('[data-badge="onkayit"]').forEach(function(el) { el.textContent = newCount; });
            })
            .subscribe();

        console.log('✅ T3: Realtime subscriptions aktif');
    }

    // Login sonrası AppState dolunca başlat
    var _rtInterval = setInterval(function() {
        if (AppState && AppState.currentOrgId && typeof getSupabase === 'function' && getSupabase()) {
            clearInterval(_rtInterval);
            setTimeout(_initRealtime, 1500);
        }
    }, 2000);
})();

// ── H2: showLegal OVERRIDE — Dinamik KVKK/Kullanım Şartları metni ────────
window.showLegal = function(type) {
    var s = (AppState && AppState.data && AppState.data.settings) || {};
    var ctrl = s.dataControllerName || 'Dragos Futbol Akademisi';
    var addr = s.dataControllerAddr || '';
    var phone = s.dataControllerPhone || '';
    var email = s.dataControllerEmail || '';
    var years = s.dataRetentionYears || 5;

    var defaultKvkk = '<div style="line-height:1.8;font-size:13px;color:var(--text2);max-height:60vh;overflow-y:auto;padding-right:8px">'
        + '<p><b>VERİ SORUMLUSU:</b> ' + FormatUtils.escape(ctrl) + '</p>'
        + (addr ? '<p><b>Adres:</b> ' + FormatUtils.escape(addr) + '</p>' : '')
        + (phone ? '<p><b>Telefon:</b> ' + FormatUtils.escape(phone) + '</p>' : '')
        + (email ? '<p><b>E-posta:</b> ' + FormatUtils.escape(email) + '</p>' : '')
        + '<p style="margin-top:12px"><b>İŞLENEN KİŞİSEL VERİLER:</b> Ad-soyad, TC kimlik numarası, doğum tarihi, telefon numarası, e-posta, veli bilgileri, ödeme kayıtları, yoklama verileri.</p>'
        + '<p><b>İŞLEME AMACI:</b> Sporcu kayıt ve takibi, aidat tahsilatı, devam takibi, veli bildirimleri.</p>'
        + '<p><b>SAKLAMA SÜRESİ:</b> Aktif sporcu verileri üyelik süresince, pasif sporcu verileri üyelik sona erişinden itibaren ' + years + ' yıl saklanır.</p>'
        + '<p><b>ÜÇÜNCÜ TARAFLARLA PAYLAŞIM:</b> Ödeme işlemleri PayTR Bilişim Hizmetleri A.Ş. altyapısı üzerinden gerçekleştirilir — kart bilgileri tarafımızca saklanmaz. SMS bildirimleri NetGSM altyapısı üzerinden iletilir.</p>'
        + '<p><b>VERİ DEPOLAMA:</b> Verileriniz Supabase (Frankfurt, AB) sunucularında saklanır. Yurt dışı aktarım KVKK Madde 9 kapsamında açık rızanıza dayalıdır.</p>'
        + '<p style="margin-top:12px"><b>HAKLARINIZ (KVKK Madde 11):</b></p>'
        + '<ul style="margin-left:16px;margin-top:4px">'
        + '<li>Verilerinizin işlenip işlenmediğini öğrenme</li>'
        + '<li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>'
        + '<li>Yurt içi veya yurt dışında aktarıldığı üçüncü kişileri öğrenme</li>'
        + '<li>Eksik veya yanlış işlenmiş verilerin düzeltilmesini isteme</li>'
        + '<li>KVKK Madde 7 çerçevesinde silinmesini veya yok edilmesini isteme</li>'
        + '<li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>'
        + '</ul>'
        + '<p style="margin-top:12px">Veri silme talebiniz için sporcu profilinizden "Verilerimi Sil" butonunu kullanabilir veya <b>' + FormatUtils.escape(email || ctrl) + '</b> adresine yazabilirsiniz. Talepler 30 gün içinde yanıtlanır.</p>'
        + '</div>';

    var defaultTerms = '<div style="line-height:1.8;font-size:13px;color:var(--text2);max-height:60vh;overflow-y:auto;padding-right:8px">'
        + '<p><b>' + FormatUtils.escape(ctrl) + '</b> sporcu yönetim sistemini kullanarak aşağıdaki şartları kabul etmiş sayılırsınız.</p>'
        + '<p><b>1. HİZMET KAPSAMI:</b> Bu sistem sporcu kayıt, yoklama takibi ve aidat yönetimi amacıyla kullanılır.</p>'
        + '<p><b>2. GİZLİLİK:</b> Sisteme giriş bilgilerinizi kimseyle paylaşmayınız. Hesabınızdan yapılan işlemlerden sorumlusunuz.</p>'
        + '<p><b>3. ÖDEME:</b> Online ödemeler PayTR güvenli ödeme altyapısı üzerinden gerçekleştirilir.</p>'
        + '<p><b>4. VERİ DOĞRULUĞU:</b> Girdiğiniz bilgilerin doğruluğundan siz sorumlusunuz.</p>'
        + '<p><b>5. DEĞİŞİKLİKLER:</b> Kullanım şartları önceden bildirilmeksizin güncellenebilir.</p>'
        + '</div>';

    var kvkkBody  = s.kvkkText  || defaultKvkk;
    var termsBody = s.termsText || defaultTerms;
    var title = type === 'kvkk' ? 'KVKK Aydınlatma Metni' : 'Kullanım Şartları';
    var body  = type === 'kvkk' ? kvkkBody : termsBody;

    // Bağımsız overlay (Security.js modal'larıyla çakışmasın)
    var existing = document.getElementById('_legal-overlay');
    if (existing) existing.parentNode.removeChild(existing);
    var ov = document.createElement('div');
    ov.id = '_legal-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.innerHTML = '<div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;width:100%;max-width:600px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden">'
        + '<div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">'
        + '<div style="font-weight:700;font-size:16px">' + title + '</div>'
        + '<button onclick="var o=document.getElementById(\'_legal-overlay\');if(o)o.parentNode.removeChild(o)" style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:6px 10px;cursor:pointer;color:var(--text);font-size:16px">✕</button>'
        + '</div>'
        + '<div style="padding:20px;overflow-y:auto;flex:1">' + body + '</div>'
        + '</div>';
    document.body.appendChild(ov);
};
console.log('✅ H2: showLegal dinamik override aktif');

// ── H3: TC KİMLİK MASKELEME ──────────────────────────────────────────────
// Yönetici athletes listesinde TC maskelenir: 12345678901 → 12345****01
// Profil detayı açıkken tam TC gösterilir (zaten modal içinde)
(function() {
    window._maskTC = function(tc) {
        if (!tc || tc.length < 6) return tc || '-';
        return tc.substring(0, 3) + '****' + tc.substring(tc.length - 2);
    };
    // pgAthletes override — TC sütununu maskele
    var _origPgAthletes = window.pgAthletes;
    if (typeof _origPgAthletes === 'function') {
        window.pgAthletes = function() {
            var html = _origPgAthletes.apply(this, arguments);
            // Render edilen HTML'deki TC numaralarını maskele
            // Not: FormatUtils.escape ile çıkan TC değerlerini replace et
            return html.replace(/\b(\d{3})\d{6}(\d{2})\b/g, function(match, p1, p2) {
                if (match.length === 11) return p1 + '****' + p2;
                return match;
            });
        };
    }
    console.log('✅ H3: TC maskeleme aktif');
})();

// ── H4: ÖN KAYIT KVKK RIZASI ─────────────────────────────────────────────
var _origShowOnKayitForm = window.showOnKayitForm;
window.showOnKayitForm = function() {
    _origShowOnKayitForm && _origShowOnKayitForm.apply(this, arguments);
    // Form render edildikten sonra KVKK checkbox ekle
    setTimeout(function() {
        var formBody = document.querySelector('#onkayit-modal [style*="overflow-y:auto"]');
        if (!formBody || document.getElementById('ok-kvkk-consent')) return;
        var div = document.createElement('div');
        div.style.cssText = 'margin-top:12px;padding:12px;background:var(--bg3);border-radius:8px;border:1px solid var(--border)';
        div.innerHTML = '<label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:13px;line-height:1.5">'
            + '<input type="checkbox" id="ok-kvkk-consent" style="margin-top:2px;width:18px;height:18px;flex-shrink:0"/>'
            + '<span><b>KVKK Onayı *</b> — '
            + '<a href="#" onclick="showLegal(\'kvkk\');return false;" style="color:var(--blue2)">Kişisel Verilerin Korunması Kanunu Aydınlatma Metni</a>\'ni okudum ve kişisel verilerimin işlenmesine <b>açık rıza</b> veriyorum.</span>'
            + '</label>';
        formBody.appendChild(div);
    }, 100);
};

var _origSubmitOnKayit = window.submitOnKayit;
window.submitOnKayit = async function() {
    var consent = document.getElementById('ok-kvkk-consent');
    if (consent && !consent.checked) {
        toast('KVKK onayı zorunludur. Lütfen aydınlatma metnini okuyup onaylayın.', 'e');
        return;
    }
    // Orijinal submit'i çalıştır
    await _origSubmitOnKayit.apply(this, arguments);
    // Onay tarihini DB'ye güncelle
    try {
        var sb = typeof getSupabase === 'function' ? getSupabase() : null;
        if (!sb) return;
        // Son eklenen kaydı bul ve consent güncelle
        var last = AppState.data.onKayitlar && AppState.data.onKayitlar[0];
        if (last && last.id) {
            await sb.from('on_kayitlar').update({
                kvkk_consent: true,
                consent_date: DateUtils.today()
            }).eq('id', last.id);
        }
    } catch(e) { console.warn('Consent update:', e.message); }
};
console.log('✅ H4: Ön kayıt KVKK rızası aktif');

// ── H5: ÇEREZ BİLDİRİMİ ─────────────────────────────────────────────────
(function() {
    var COOKIE_KEY = 'dragos_cookie_consent';
    if (localStorage.getItem(COOKIE_KEY)) return; // Zaten onaylandı

    function _showCookieBanner() {
        if (document.getElementById('_cookie-banner')) return;
        var b = document.createElement('div');
        b.id = '_cookie-banner';
        b.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99996;background:var(--bg2);border-top:1px solid var(--border);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;box-shadow:0 -2px 12px rgba(0,0,0,.15)';
        b.innerHTML = '<span style="font-size:12px;color:var(--text2);flex:1;min-width:200px">🍪 Bu site oturum yönetimi ve tercih saklama amacıyla yerel depolama (localStorage) kullanmaktadır. '
            + '<a href="#" onclick="showLegal(\'kvkk\');return false;" style="color:var(--blue2)">KVKK Aydınlatma Metni</a></span>'
            + '<div style="display:flex;gap:8px;flex-shrink:0">'
            + '<button onclick="_acceptCookies()" style="background:var(--blue2);color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">Tamam, Anladım</button>'
            + '</div>';
        document.body.appendChild(b);
    }

    window._acceptCookies = function() {
        localStorage.setItem(COOKIE_KEY, '1');
        var b = document.getElementById('_cookie-banner');
        if (b) b.parentNode.removeChild(b);
    };

    // Sayfa hazır olunca göster
    if (document.readyState === 'complete') {
        setTimeout(_showCookieBanner, 1500);
    } else {
        window.addEventListener('load', function() { setTimeout(_showCookieBanner, 1500); });
    }
    console.log('✅ H5: Çerez bildirimi aktif');
})();

// ── H6: VERİ SİLME TALEBİ ───────────────────────────────────────────────
var _origSpProfil = window.spProfil;
window.spProfil = function() {
    var html = typeof _origSpProfil === 'function' ? _origSpProfil.apply(this, arguments) : '';
    var deleteBtn = '<div class="card mb3" style="border-left:3px solid #e74c3c">'
        + '<div class="tw6 ts mb1" style="color:#e74c3c">⚠️ Veri Silme Talebi</div>'
        + '<p class="tm ts mb2">KVKK Madde 11 kapsamında kişisel verilerinizin silinmesini talep edebilirsiniz. Talebiniz 30 gün içinde yanıtlanır.</p>'
        + '<button class="btn" style="background:#e74c3c;color:#fff;border:none" onclick="submitDeletionRequest()">Verilerimi Silmesini Talep Et</button>'
        + '</div>';
    // Sayfanın sonuna ekle
    return html.replace(/<\/div>\s*$/, '') + deleteBtn + '</div>';
};

window.submitDeletionRequest = async function() {
    var a = AppState.currentSporcu;
    if (!a) { toast('Sporcu bilgisi bulunamadı', 'e'); return; }
    var confirmed = confirm('Kişisel verilerinizin silinmesi talebi oluşturulacak. Devam etmek istiyor musunuz?');
    if (!confirmed) return;
    try {
        var sb = typeof getSupabase === 'function' ? getSupabase() : null;
        if (!sb) { toast('Bağlantı hatası', 'e'); return; }
        await sb.from('deletion_requests').insert({
            athlete_id:   a.id,
            athlete_name: (a.fn || '') + ' ' + (a.ln || ''),
            athlete_tc:   a.tc || '',
            reason:       'Sporcu talebi — KVKK Madde 11',
            status:       'pending',
            org_id:       AppState.currentOrgId || '',
            branch_id:    AppState.currentBranchId || ''
        });
        toast('✅ Silme talebiniz alındı. 30 gün içinde yanıtlanacaktır.', 'g');
    } catch(e) {
        toast('Talep gönderilemedi: ' + e.message, 'e');
    }
};
console.log('✅ H6: Veri silme talebi aktif');

// ── H7: ADMIN AYARLAR — HUKUKİ GEREKSİNİMLER KARTI ─────────────────────
var _origPgSettings = window.pgSettings;
window.pgSettings = function() {
    var base = typeof _origPgSettings === 'function' ? _origPgSettings.apply(this, arguments) : '';
    var s = (AppState && AppState.data && AppState.data.settings) || {};

    var legalCard = `
    <div class="card mb3" style="border-left:4px solid #8e44ad">
        <div class="tw6 tsm mb3">⚖️ Hukuki Gereksinimler (KVKK)</div>

        <!-- Sekmeler -->
        <div style="display:flex;gap:4px;margin-bottom:16px;flex-wrap:wrap" id="legal-tabs">
            <button onclick="showLegalTab('metinler')"   class="btn btn-sm" id="ltab-metinler"   style="background:var(--blue2);color:#fff">📄 Metinler</button>
            <button onclick="showLegalTab('sorumluluk')" class="btn btn-sm" id="ltab-sorumluluk">🏢 Veri Sorumlusu</button>
            <button onclick="showLegalTab('silme')"      class="btn btn-sm" id="ltab-silme">🗑 Silme Talepleri</button>
            <button onclick="showLegalTab('riza')"       class="btn btn-sm" id="ltab-riza">✅ Rıza Yönetimi</button>
        </div>

        <!-- Metinler -->
        <div id="ltab-content-metinler">
            <p class="ts tm mb2">Bu alanlar boş bırakılırsa varsayılan KVKK metni kullanılır. Avukatınızdan aldığınız güncel metni buraya yapıştırın.</p>
            <div class="fgr mb2">
                <label>KVKK Aydınlatma Metni (HTML destekler)</label>
                <textarea id="s-kvkk-text" rows="8" style="width:100%;font-size:12px;font-family:monospace;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text1);resize:vertical">${FormatUtils.escape(s.kvkkText || '')}</textarea>
            </div>
            <div class="fgr mb3">
                <label>Kullanım Şartları (HTML destekler)</label>
                <textarea id="s-terms-text" rows="6" style="width:100%;font-size:12px;font-family:monospace;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text1);resize:vertical">${FormatUtils.escape(s.termsText || '')}</textarea>
            </div>
            <div class="fgr mb3">
                <label>Veri Saklama Süresi (yıl) — Pasif sporcu verileri için</label>
                <input id="s-retention-years" type="number" min="1" max="10" value="${s.dataRetentionYears || 5}" style="max-width:120px"/>
                <div class="ts tm mt1">KVKK metninde otomatik kullanılır.</div>
            </div>
            <button class="btn bp" onclick="saveLegalTexts()">💾 Metinleri Kaydet</button>
            <div id="legal-texts-msg" style="margin-top:8px;font-size:13px"></div>
        </div>

        <!-- Veri Sorumlusu -->
        <div id="ltab-content-sorumluluk" style="display:none">
            <p class="ts tm mb2">KVKK kapsamında veri sorumlusu bilgileri. Aydınlatma metninde otomatik kullanılır.</p>
            <div class="g21 mb2">
                <div class="fgr"><label>Kurum / Şirket Adı</label><input id="s-ctrl-name" value="${FormatUtils.escape(s.dataControllerName || '')}"/></div>
                <div class="fgr"><label>Vergi No / TC</label><input id="s-ctrl-taxno" value="${FormatUtils.escape(s.dataControllerTaxNo || '')}"/></div>
            </div>
            <div class="fgr mb2"><label>Adres</label><input id="s-ctrl-addr" value="${FormatUtils.escape(s.dataControllerAddr || '')}"/></div>
            <div class="g21 mb2">
                <div class="fgr"><label>Telefon</label><input id="s-ctrl-phone" value="${FormatUtils.escape(s.dataControllerPhone || '')}"/></div>
                <div class="fgr"><label>E-posta</label><input id="s-ctrl-email" type="email" value="${FormatUtils.escape(s.dataControllerEmail || '')}"/></div>
            </div>
            <div class="fgr mb3">
                <label>Veri İhlali Prosedürü (iç belge — 72 saat KVKK bildirimi için)</label>
                <textarea id="s-breach" rows="4" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);color:var(--text1);resize:vertical">${FormatUtils.escape(s.breachProcedure || '')}</textarea>
            </div>
            <button class="btn bp" onclick="saveLegalController()">💾 Kaydet</button>
            <div id="legal-ctrl-msg" style="margin-top:8px;font-size:13px"></div>
        </div>

        <!-- Silme Talepleri -->
        <div id="ltab-content-silme" style="display:none">
            <div id="deletion-requests-list"><button class="btn bs btn-sm" onclick="loadDeletionRequests()" style="width:100%">Talepleri Yükle</button></div>
        </div>

        <!-- Rıza Yönetimi -->
        <div id="ltab-content-riza" style="display:none">
            <div id="consent-stats"><button class="btn bs btn-sm" onclick="loadConsentStats()" style="width:100%">Rıza İstatistiklerini Yükle</button></div>
        </div>
    </div>`;

    return base + legalCard;
};

// Sekme değiştirme
window.showLegalTab = function(tab) {
    ['metinler','sorumluluk','silme','riza'].forEach(function(t) {
        var content = document.getElementById('ltab-content-' + t);
        var btn = document.getElementById('ltab-' + t);
        if (content) content.style.display = t === tab ? '' : 'none';
        if (btn) {
            btn.style.background = t === tab ? 'var(--blue2)' : '';
            btn.style.color = t === tab ? '#fff' : '';
        }
    });
};

// Metinleri kaydet
window.saveLegalTexts = async function() {
    var sb = typeof getSupabase === 'function' ? getSupabase() : null;
    var msg = document.getElementById('legal-texts-msg');
    if (!sb) { if (msg) msg.textContent = '❌ Bağlantı hatası'; return; }
    var updates = {
        kvkkText:           document.getElementById('s-kvkk-text')?.value || '',
        termsText:          document.getElementById('s-terms-text')?.value || '',
        dataRetentionYears: parseInt(document.getElementById('s-retention-years')?.value) || 5
    };
    Object.assign(AppState.data.settings, updates);
    await DB.upsert('settings', DB.mappers.fromSettings(AppState.data.settings));
    if (msg) { msg.textContent = '✅ Metinler kaydedildi'; setTimeout(function() { msg.textContent = ''; }, 3000); }
};

// Veri sorumlusu kaydet
window.saveLegalController = async function() {
    var sb = typeof getSupabase === 'function' ? getSupabase() : null;
    var msg = document.getElementById('legal-ctrl-msg');
    if (!sb) { if (msg) msg.textContent = '❌ Bağlantı hatası'; return; }
    var updates = {
        dataControllerName:  document.getElementById('s-ctrl-name')?.value?.trim()  || '',
        dataControllerAddr:  document.getElementById('s-ctrl-addr')?.value?.trim()  || '',
        dataControllerPhone: document.getElementById('s-ctrl-phone')?.value?.trim() || '',
        dataControllerEmail: document.getElementById('s-ctrl-email')?.value?.trim() || '',
        dataControllerTaxNo: document.getElementById('s-ctrl-taxno')?.value?.trim() || '',
        breachProcedure:     document.getElementById('s-breach')?.value             || ''
    };
    Object.assign(AppState.data.settings, updates);
    await DB.upsert('settings', DB.mappers.fromSettings(AppState.data.settings));
    if (msg) { msg.textContent = '✅ Kaydedildi'; setTimeout(function() { msg.textContent = ''; }, 3000); }
};

// Silme taleplerini yükle
window.loadDeletionRequests = async function() {
    var sb = typeof getSupabase === 'function' ? getSupabase() : null;
    var el = document.getElementById('deletion-requests-list');
    if (!sb || !el) return;
    el.innerHTML = '<p class="ts tm">Yükleniyor...</p>';
    var res = await sb.from('deletion_requests').select('*').order('requested_at', { ascending: false });
    if (res.error || !res.data || !res.data.length) {
        el.innerHTML = '<p class="ts tm">Bekleyen silme talebi yok.</p>'; return;
    }
    var rows = res.data.map(function(r) {
        var statusBadge = r.status === 'pending'
            ? '<span class="bg bg-y">Bekliyor</span>'
            : r.status === 'completed'
            ? '<span class="bg bg-g">Tamamlandı</span>'
            : '<span class="bg bg-r">Reddedildi</span>';
        var date = r.requested_at ? r.requested_at.substring(0, 10) : '-';
        return '<tr><td>' + FormatUtils.escape(r.athlete_name || '-') + '</td>'
            + '<td class="ts">' + window._maskTC(r.athlete_tc) + '</td>'
            + '<td class="ts">' + date + '</td>'
            + '<td>' + statusBadge + '</td>'
            + '<td>'
            + (r.status === 'pending' ? '<button class="btn btn-xs bg-g" onclick="completeDeletionRequest(\'' + r.id + '\',\'' + (r.athlete_id || '') + '\')">Onayla & Sil</button> ' : '')
            + (r.status === 'pending' ? '<button class="btn btn-xs bd" onclick="rejectDeletionRequest(\'' + r.id + '\')">Reddet</button>' : '')
            + '</td></tr>';
    }).join('');
    el.innerHTML = '<div class="tw" style="overflow-x:auto"><table><thead><tr><th>Sporcu</th><th>TC</th><th>Tarih</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
};

window.completeDeletionRequest = function(reqId, athleteId) {
    confirm2('Veri Silme', 'Sporcu verileri kalıcı olarak silinecek. Emin misiniz?', async function() {
        var sb = typeof getSupabase === 'function' ? getSupabase() : null;
        if (!sb) return;
        if (athleteId) await sb.from('athletes').delete().eq('id', athleteId);
        await sb.from('deletion_requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', reqId);
        toast('✅ Sporcu verileri silindi', 'g');
        loadDeletionRequests();
    });
};

window.rejectDeletionRequest = async function(reqId) {
    var sb = typeof getSupabase === 'function' ? getSupabase() : null;
    if (!sb) return;
    await sb.from('deletion_requests').update({ status: 'rejected' }).eq('id', reqId);
    toast('Talep reddedildi', 'w');
    loadDeletionRequests();
};

// Rıza istatistikleri
window.loadConsentStats = async function() {
    var sb = typeof getSupabase === 'function' ? getSupabase() : null;
    var el = document.getElementById('consent-stats');
    if (!sb || !el) return;
    el.innerHTML = '<p class="ts tm">Yükleniyor...</p>';
    var res = await sb.from('on_kayitlar').select('kvkk_consent, consent_date').order('created_at', { ascending: false });
    if (res.error) { el.innerHTML = '<p class="ts tm">Veri alınamadı.</p>'; return; }
    var total = res.data.length;
    var approved = res.data.filter(function(r) { return r.kvkk_consent; }).length;
    el.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">'
        + '<div style="background:var(--bg3);border-radius:8px;padding:12px;text-align:center"><div class="ts tm">Toplam Başvuru</div><div style="font-size:24px;font-weight:700">' + total + '</div></div>'
        + '<div style="background:var(--bg3);border-radius:8px;padding:12px;text-align:center"><div class="ts tm">KVKK Onaylı</div><div style="font-size:24px;font-weight:700;color:var(--green)">' + approved + '</div></div>'
        + '</div>'
        + '<p class="ts tm">' + (total - approved) + ' başvuruda KVKK onayı eksik (eski kayıtlar).</p>';
};

console.log('✅ H7: Admin hukuki gereksinimler kartı aktif');
