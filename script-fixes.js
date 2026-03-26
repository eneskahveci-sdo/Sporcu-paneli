// ═══════════════════════════════════════════════════════════
// HATA DÜZELTMELERİ V13 — script.js'den SONRA yüklenir
//
// V13 DEĞİŞİKLİKLER:
// - Geliştirme 18: Takvime ders ekleme (Ayarlar), ders varlığı
//   kontrolü, sınıf bazlı yoklama (CMT-PZR 09-10 / 10-11 gibi
//   her grup için ayrı yoklama), class_id attendance kaydı
// - V12 özellikleri korundu (Geliştirme 1-17)
// ═══════════════════════════════════════════════════════════

console.log('script-fixes.js V13 yukleniyor...');

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
    // "odeme-yap" kaldırıldı — eski çağrıları "odemeler" sayfasına yönlendir
    if (tab === 'odeme-yap') tab = 'odemeler';

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
        'odemeler': spOdemeler
    };

    // Ödeme sekmesine geçince DB'den taze payments çek
    if (tab === 'odemeler' && AppState.currentSporcu) {
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
    var p = (AppState.data.payments || []).find(function(x) { return x.id === paymentId; });
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
    // HTML string olarak oluştur, Blob URL ile aç (document.write() kullanmaz)
    var html = '<html><head><title>Makbuz ' + receiptNo + '</title><style>body{font-family:Arial;padding:20px;max-width:400px;margin:auto}h1{text-align:center;font-size:18px}h2{text-align:center;font-size:14px;color:#666}.line{border-top:1px solid #333;margin:12px 0}.row{display:flex;justify-content:space-between;padding:6px 0}.label{font-weight:bold;color:#555}.footer{text-align:center;font-size:11px;color:#999;margin-top:20px}@media print{body{padding:10px}}</style></head><body>';
    html += '<h1>' + _escHtml(s.schoolName || 'Dragos Futbol Akademisi') + '</h1>';
    if (s.address) html += '<div style="text-align:center;font-size:12px;color:#555;margin-bottom:2px">' + _escHtml(s.address) + '</div>';
    if (s.ownerPhone) html += '<div style="text-align:center;font-size:12px;color:#555;margin-bottom:4px">Tel: ' + _escHtml(s.ownerPhone) + '</div>';
    html += '<h2>ÖDEME MAKBUZU</h2>';
    html += '<div class="line"></div>';
    html += '<div class="row"><span class="label">Makbuz No:</span><span>' + receiptNo + '</span></div>';
    html += '<div class="row"><span class="label">Tarih:</span><span>' + DateUtils.format(p.dt) + '</span></div>';
    html += '<div class="line"></div>';
    html += '<div class="row"><span class="label">Sporcu:</span><span>' + _escHtml(p.an) + '</span></div>';
    html += '<div class="row"><span class="label">Açıklama:</span><span>' + _escHtml(p.serviceName || p.ds || 'Aidat') + '</span></div>';
    html += '<div class="row"><span class="label">Tutar:</span><span><strong>' + FormatUtils.currency(p.amt) + '</strong></span></div>';
    html += '<div class="row"><span class="label">Ödeme Yöntemi:</span><span>' + statusLabel(p.payMethod || '-') + '</span></div>';
    if (p.slipCode) html += '<div class="row"><span class="label">Slip Kodu:</span><span>' + _escHtml(p.slipCode) + '</span></div>';
    html += '<div class="line"></div>';
    html += '<div class="footer">Bu makbuz elektronik ortamda oluşturulmuştur.<br>' + _escHtml(s.schoolName || 'Dragos Futbol Akademisi') + '</div>';
    html += '</body></html>';
    var blob = new Blob([html], { type: 'text/html' });
    var blobUrl = URL.createObjectURL(blob);
    var w = window.open(blobUrl, '_blank', 'width=400,height=600');
    if (!w) { URL.revokeObjectURL(blobUrl); toast('Popup engellenmiş!', 'e'); return; }
    setTimeout(function() { w.print(); URL.revokeObjectURL(blobUrl); }, 500);

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
        var idx = (AppState.data.payments || []).findIndex(function(p) { return p.id === paymentId; });
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
    (AppState.data.payments || []).filter(function(p) { return p.st === 'completed'; }).forEach(function(p) {
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
        targets = (AppState.data.athletes || []).filter(function(a) { return a.st === 'active' && (a.pph || a.ph); });
    } else if (group === 'overdue') {
        var overdueIds = {};
        (AppState.data.payments || []).filter(function(p) { return p.st === 'overdue'; }).forEach(function(p) { overdueIds[p.aid] = true; });
        targets = (AppState.data.athletes || []).filter(function(a) { return overdueIds[a.id] && (a.pph || a.ph); });
    }

    if (targets.length === 0) { toast('Gönderilecek kişi bulunamadı!', 'e'); return; }

    var sent = 0, failed = 0;
    for (var i = 0; i < targets.length; i++) {
        var phone = targets[i].pph || targets[i].ph;
        var personMsg = msg.replace('{sporcu_adi}', (targets[i].fn || '') + ' ' + (targets[i].ln || '')).replace('{tutar}', FormatUtils.currency(targets[i].fee));
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
        (AppState.data.payments || []).filter(function(p) { return p.st === 'completed' && p.dt && p.dt.startsWith(monthStr); }).forEach(function(p) {
            if (p.ty === 'income') inc += (p.amt || 0); else exp += (p.amt || 0);
        });
        months.push({ month: m, income: inc, expense: exp, label: ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'][m] });
    }
    return months;
}

function isInPeriod(dateStr) {
    if (!dateStr) return false;
    var accFilter = AppState.ui.accFilter || 'month';
    if (accFilter === 'all') return true;
    var d = new Date(dateStr);
    var now2 = new Date();
    if (accFilter === 'month') return d.getFullYear() === now2.getFullYear() && d.getMonth() === now2.getMonth();
    if (accFilter === 'quarter') { var q = new Date(now2); q.setMonth(q.getMonth() - 3); return d >= q; }
    if (accFilter === 'year') return d.getFullYear() === now2.getFullYear();
    return true;
}

function getBranchIncomeDistribution() {
    var dist = {};
    (AppState.data.payments || []).filter(function(p) { return p.ty === 'income' && p.st === 'completed'; }).filter(function(p){ return isInPeriod(p.dt); }).forEach(function(p) {
        if (p.aid) {
            var ath = (AppState.data.athletes || []).find(function(a) { return a.id === p.aid; });
            var sp = ath ? (ath.sp || 'Belirtilmedi') : 'Belirtilmedi';
            dist[sp] = (dist[sp] || 0) + (p.amt || 0);
        }
    });
    return Object.keys(dist).map(function(k) { return { name: k, value: dist[k] }; }).sort(function(a, b) { return b.value - a.value; });
}

function getExpenseCategoryDistribution() {
    var dist = {};
    (AppState.data.payments || []).filter(function(p) { return p.ty === 'expense' && p.st === 'completed'; }).filter(function(p){ return isInPeriod(p.dt); }).forEach(function(p) {
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
    if (!AppState.ui.accFilter) AppState.ui.accFilter = 'month';
    var accFilter = AppState.ui.accFilter;

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
    (AppState.data.payments || []).filter(function(p) { return p.st === 'completed' && p.dt === todayStr && p.payMethod === 'nakit'; }).forEach(function(p) {
        if (p.ty === 'income') todayCashIn += (p.amt || 0); else todayCashOut += (p.amt || 0);
    });

    return '<div class="ph"><div class="stit">📊 Finans Raporu</div><div class="ssub">Detaylı gelir-gider analizi ve kasa takibi</div></div>'

    // Dönem filtresi
    + '<div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">'
    + '<span class="tw6 tsm">Dönem:</span>'
    + '<button class="btn btn-sm ' + (accFilter==='month'?'bp':'bs') + '" onclick="AppState.ui.accFilter=\'month\';go(\'accounting\')">Bu Ay</button>'
    + '<button class="btn btn-sm ' + (accFilter==='quarter'?'bp':'bs') + '" onclick="AppState.ui.accFilter=\'quarter\';go(\'accounting\')">Son 3 Ay</button>'
    + '<button class="btn btn-sm ' + (accFilter==='year'?'bp':'bs') + '" onclick="AppState.ui.accFilter=\'year\';go(\'accounting\')">Bu Yıl</button>'
    + '<button class="btn btn-sm ' + (accFilter==='all'?'bp':'bs') + '" onclick="AppState.ui.accFilter=\'all\';go(\'accounting\')">Tümü</button>'
    + '</div>'

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
    + '<div class="card"><div class="tw6 tsm mb3">⚽ Branş Bazlı Gelir Dağılımı</div><canvas id="branch-chart" height="180"></canvas></div>'
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
    var p = id ? (AppState.data.payments || []).find(function(x) { return x.id === id; }) : null;
    var isNew = !p;

    var catOpts = EXPENSE_CATEGORIES.map(function(c) {
        return '<option value="' + c.id + '"' + (p && p.cat === c.id ? ' selected' : '') + '>' + c.icon + ' ' + c.name + '</option>';
    }).join('');

    modal(isNew ? 'Yeni Finansal İşlem' : 'İşlem Detayı', '<div class="fgr mb2"><label>Sporcu / Kişi</label><select id="p-aid"><option value="">Bağımsız İşlem</option>' + (AppState.data.athletes || []).map(function(a) { return '<option value="' + FormatUtils.escape(a.id) + '"' + (p && p.aid === a.id ? ' selected' : '') + '>' + FormatUtils.escape((a.fn || '') + ' ' + (a.ln || '')) + '</option>'; }).join('') + '</select></div>'
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
            var ath = (AppState.data.athletes || []).find(function(a) { return a.id === aid; });
            var ds = UIUtils.getValue('p-ds');
            var ty = UIUtils.getValue('p-ty');

            var obj = {
                id: p ? p.id : generateId(),
                aid: aid,
                an: ath ? ((ath.fn || '') + ' ' + (ath.ln || '')) : (ds || 'Bilinmiyor'),
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
                if (isNew) { if (!AppState.data.payments) AppState.data.payments = []; AppState.data.payments.push(obj); }
                else { var idx = (AppState.data.payments || []).findIndex(function(x) { return x.id === obj.id; }); if (idx >= 0) AppState.data.payments[idx] = obj; }
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
function __renderAthletesInPlace() {
    var main = document.getElementById('main');
    if (!main) { go('athletes'); return; }
    var f = AppState.filters.athletes;
    var list = (AppState.data.athletes || []).slice();
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

function __renderAthletes() {
    var list = (AppState.data.athletes || []).slice();
    var f = AppState.filters.athletes;
    if (f.st === undefined || f.st === null || f.st === '') {
        f.st = 'active';
        AppState.filters.athletes.st = 'active';
    }
    var totalActive   = (AppState.data.athletes || []).filter(function(a){ return a.st === 'active'; }).length;
    var totalInactive = (AppState.data.athletes || []).filter(function(a){ return a.st === 'inactive'; }).length;
    var currentTab    = f.st;

    if (f.sp) list = list.filter(function(a) { return a.sp === f.sp; });
    if (f.st && f.st !== 'all') list = list.filter(function(a) { return a.st === f.st; });
    if (f.cls) list = list.filter(function(a) { return a.clsId === f.cls; });
    if (f.q) { var q = f.q.toLowerCase(); list = list.filter(function(a) { return (a.fn + ' ' + a.ln).toLowerCase().includes(q) || a.tc.includes(q); }); }

    var isAdmin = AppState.currentUser && AppState.currentUser.role === 'admin';
    var spOpts = (AppState.data.sports || []).map(function(s) { return '<option value="' + FormatUtils.escape(s.name) + '"' + (f.sp === s.name ? ' selected' : '') + '>' + FormatUtils.escape(s.name) + '</option>'; }).join('');
    var clOpts = (AppState.data.classes || []).map(function(c) { return '<option value="' + FormatUtils.escape(c.id) + '"' + (f.cls === c.id ? ' selected' : '') + '>' + FormatUtils.escape(c.name) + '</option>'; }).join('');

    var trows = list.map(function(a) {
        var del = isAdmin ? '<button class="btn btn-xs bd" onclick="delAth(\'' + a.id + '\')">Sil</button>' : '';
        return '<tr><td><div class="flex fca gap2" style="cursor:pointer" onclick="go(\'athleteProfile\',{id:\'' + a.id + '\'})">' + UIUtils.getAvatar(36, null, FormatUtils.initials(a.fn, a.ln)) + '<div><div class="tw6" style="color:var(--blue2)">' + FormatUtils.escape(a.fn) + ' ' + FormatUtils.escape(a.ln) + '</div><div class="ts tm">' + DateUtils.age(a.bd) + ' yaş</div></div></div></td><td>' + FormatUtils.escape(a.tc) + '</td><td>' + sportEmoji(a.sp) + ' ' + FormatUtils.escape(a.sp) + '</td><td>' + FormatUtils.escape(className(a.clsId)) + '</td><td><span class="bg ' + statusClass(a.st) + '">' + statusLabel(a.st) + '</span></td><td><button class="btn btn-xs bp" onclick="go(\'athleteProfile\',{id:\'' + a.id + '\'})">Profil</button> <button class="btn btn-xs bs" onclick="editAth(\'' + a.id + '\')">Düzenle</button> ' + del + '</td></tr>';
    }).join('');

    var addBtn = isAdmin ? '<button class="btn bp" onclick="editAth()">+ Yeni Sporcu</button>' : '<div></div>';
    var expBtn = isAdmin ? '<div class="flex gap2 fwrap"><button class="btn bsu" onclick="importAthletesFromExcel()">📊 Excel\'den İçe Aktar</button><button class="btn bs" onclick="exportAthletes()">📤 Excel İndir</button></div>' : '';

    return '<div class="ph"><div class="stit">Sporcular</div></div>'
        + '<div style="display:flex;gap:0;margin-bottom:16px;border-bottom:2px solid var(--border)">'
        + '<button onclick="AppState.filters.athletes.st=\'active\';go(\'athletes\')" style="padding:10px 20px;border:none;background:none;cursor:pointer;font-weight:700;font-size:14px;border-bottom:' + (currentTab==='active'?'3px solid var(--blue2);color:var(--blue2)':'3px solid transparent;color:var(--text2)') + ';margin-bottom:-2px">✅ Aktif <span style="background:var(--green);color:#fff;border-radius:10px;padding:1px 8px;font-size:11px;margin-left:4px">' + totalActive + '</span></button>'
        + '<button onclick="AppState.filters.athletes.st=\'inactive\';go(\'athletes\')" style="padding:10px 20px;border:none;background:none;cursor:pointer;font-weight:700;font-size:14px;border-bottom:' + (currentTab==='inactive'?'3px solid var(--blue2);color:var(--blue2)':'3px solid transparent;color:var(--text2)') + ';margin-bottom:-2px">📦 Pasif <span style="background:var(--text3);color:#fff;border-radius:10px;padding:1px 8px;font-size:11px;margin-left:4px">' + totalInactive + '</span></button>'
        + '<button onclick="AppState.filters.athletes.st=\'all\';go(\'athletes\')" style="padding:10px 20px;border:none;background:none;cursor:pointer;font-weight:700;font-size:14px;border-bottom:' + (currentTab==='all'?'3px solid var(--blue2);color:var(--blue2)':'3px solid transparent;color:var(--text2)') + ';margin-bottom:-2px">👥 Tümü</button>'
        + '</div>'
        + '<div class="flex fjb fca mb3 fwrap gap2"><div class="flex gap2 fwrap"><select class="fs" onchange="AppState.filters.athletes.sp=this.value;go(\'athletes\')"><option value="">Tüm Branşlar</option>' + spOpts + '</select><select class="fs" onchange="AppState.filters.athletes.cls=this.value;go(\'athletes\')"><option value="">Tüm Sınıflar</option>' + clOpts + '</select></div><input class="fs" type="text" placeholder="🔍 İsim veya TC Ara..." style="max-width:250px" value="' + FormatUtils.escape(f.q) + '" oninput="AppState.filters.athletes.q=this.value;__renderAthletesInPlace()"/></div>'
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
        // bid/oid yoksa bile devam et — org/branch bilgisi olmadan kaydedilen
        // ön kayıtları da çekebilmek için filtresiz sorgu yapılır.
        var data = null, error = null;
        if (bid) {
            // branch_id eşleşen VEYA hiç org/branch kaydedilmemiş kayıtları getir
            var r = await sb.from('on_kayitlar').select('*')
                .or('branch_id.eq.' + bid + ',and(branch_id.is.null,org_id.is.null)')
                .order('created_at', { ascending: false });
            data = r.data; error = r.error;
        } else if (oid) {
            var r2 = await sb.from('on_kayitlar').select('*')
                .or('org_id.eq.' + oid + ',and(branch_id.is.null,org_id.is.null)')
                .order('created_at', { ascending: false });
            data = r2.data; error = r2.error;
        } else {
            // org/branch bilgisi yoksa tüm kayıtları getir (yeni kurulum)
            var r3 = await sb.from('on_kayitlar').select('*')
                .order('created_at', { ascending: false });
            data = r3.data; error = r3.error;
        }
        if (error) { console.warn('loadOnKayitlar query error:', error.message || error); return; }
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
    else if (AppState.ui && AppState.ui.curPage === 'settings') go('settings');
};

window.convertOnKayit = async function(id) {
    var ok = (AppState.data.onKayitlar || []).find(function(x) { return x.id === id; });
    if (!ok) return;
    if (ok.tc) { var existing = (AppState.data.athletes || []).find(function(a) { return a.tc === ok.tc; }); if (existing) { toast('Bu TC zaten kayıtlı!', 'e'); return; } }
    var cls = (AppState.data.classes || []).find(function(c) { return c.id === ok.clsId || c.name === ok.className; });
    var sp = '';
    if (cls) { var sport = (AppState.data.sports || []).find(function(s) { return s.id === cls.spId; }); if (sport) sp = sport.name; }
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
    // Hata mesajlarını temizle
    ['lerr', 'ls-err', 'lc-err'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) { el.textContent = ''; el.classList.add('dn'); }
    });
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
    var rOrg = AppState.currentOrgId || (document.getElementById('ok-org-id') || {}).value || null;
    var rBranch = AppState.currentBranchId || (document.getElementById('ok-branch-id') || {}).value || null;
    // Kurum bilgisi yoksa null ile kaydet — admin "org/branch bilgisi olmayan" filtresiyle görecek
    var id = generateId();
    var sName = fn + ' ' + ln;
    var pName = psn ? (pn + ' ' + psn) : pn;
    var insertOk = false;
    try {
        var sb = getSupabase();
        if (sb) {
            var res = await sb.from('on_kayitlar').insert({ id: id, student_name: sName, fn: fn, ln: ln, bd: bd || null, tc: tc || null, cls_id: clsId || null, class_name: clsName, parent_name: pName, parent_phone: pph, status: 'new', created_at: new Date().toISOString(), org_id: rOrg || null, branch_id: rBranch || null });
            if (res.error) {
                console.error('submitOnKayit DB error:', res.error);
                toast('Ön kayıt kaydedilemedi: ' + (res.error.message || 'Veritabanı hatası'), 'e');
                return;
            }
            insertOk = true;
        } else {
            console.error('submitOnKayit: Supabase client yok');
            toast('Bağlantı hatası. Lütfen sayfayı yenileyip tekrar deneyin.', 'e');
            return;
        }
    } catch(e) {
        console.error('submitOnKayit:', e);
        toast('Ön kayıt kaydedilemedi: ' + (e.message || 'Bağlantı hatası'), 'e');
        return;
    }
    if (insertOk) {
        if (!AppState.data.onKayitlar) AppState.data.onKayitlar = [];
        AppState.data.onKayitlar.unshift({ id: id, studentName: sName, fn: fn, ln: ln, bd: bd, tc: tc, clsId: clsId, className: clsName, parentName: pName, parentPhone: pph, status: 'new', createdAt: new Date().toISOString(), orgId: rOrg, branchId: rBranch });
        var m = document.getElementById('onkayit-modal'); if (m) m.remove();
        toast('✅ Ön kayıt başarıyla alındı!', 'g');
    }
};

// ────────────────────────────────────────────────────────
// 15) Sporcu portalında birleşik ödemeler sayfası
//     Geçmiş ödemeler + bekleyen ödemeler + toplu ödeme + makbuz
// ────────────────────────────────────────────────────────
var _origSpOdemeler = typeof spOdemeler === 'function' ? spOdemeler : null;
window.spOdemeler = function() {
    var a = AppState.currentSporcu;
    if (!a) return '';
    var s = AppState.data.settings;
    var hasPayTR = s && s.paytrActive && s.paytrMerchantId;
    var hasBank = s && (s.iban || s.bankName);

    var completed = (AppState.data.payments || []).filter(function(p) { return p.aid === a.id && p.st === 'completed'; }).sort(function(x, y) { return new Date(y.dt) - new Date(x.dt); });
    var pending = (AppState.data.payments || []).filter(function(p) { return p.aid === a.id && p.notifStatus === 'pending_approval'; }).sort(function(x, y) { return new Date(y.dt) - new Date(x.dt); });
    var pendingPayments = (AppState.data.payments || []).filter(function(p) { return p.aid === a.id && p.st !== 'completed' && p.notifStatus !== 'pending_approval'; }).sort(function(x, y) { if (!x.dt && !y.dt) return 0; if (!x.dt) return 1; if (!y.dt) return -1; return x.dt.localeCompare(y.dt); });
    var totalPaid = completed.reduce(function(s, p) { return s + (p.amt || 0); }, 0);
    var totalDebt = pendingPayments.reduce(function(s, p) { return s + (p.amt || 0); }, 0);
    var mIcon = function(m) { return ({ nakit: '💵', kredi_karti: '💳', havale: '🏦', paytr: '🔵' })[m] || '💰'; };
    var mLabel = function(m) { return ({ nakit: 'Nakit', kredi_karti: 'Kredi Kartı', havale: 'Havale/EFT', paytr: 'PayTR Online' })[m] || (m || 'Ödeme'); };

    // ── Özet istatistikler ──
    var html = '<div class="sp-stats-row mb3"><div class="stat-box"><div class="stat-box-value tg">' + FormatUtils.currency(totalPaid) + '</div><div class="stat-box-label">Toplam Ödenen</div></div><div class="stat-box"><div class="stat-box-value ' + (totalDebt > 0 ? 'tr2' : 'tg') + '">' + FormatUtils.currency(totalDebt) + '</div><div class="stat-box-label">Toplam Borç</div></div><div class="stat-box"><div class="stat-box-value ' + (pending.length > 0 ? 'to' : 'tg') + '">' + pending.length + '</div><div class="stat-box-label">Onay Bekleyen</div></div></div>';

    // ── Bekleyen ödemeler — checkbox ile seçim ve ödeme yapabilme ──
    if (pendingPayments.length > 0) {
        var planRows = '';
        pendingPayments.forEach(function(p) {
            var isOverdue = p.st === 'overdue';
            var today = typeof DateUtils !== 'undefined' ? DateUtils.today() : new Date().toISOString().slice(0, 10);
            var isLate = !isOverdue && p.dt && p.dt < today;
            var badge = (isOverdue || isLate)
                ? '<span class="bg bg-r">Gecikmiş</span>'
                : '<span class="bg bg-y">Bekliyor</span>';
            planRows += '<div class="sp-plan-cb-row" onclick="var cb=this.querySelector(\'.sp-plan-cb\');cb.checked=!cb.checked;this.classList.toggle(\'checked\',cb.checked);_spUpdateBulkTotal()">'
                + '<input type="checkbox" class="sp-plan-cb" value="' + FormatUtils.escape(p.id) + '" data-amt="' + (p.amt || 0) + '" onclick="event.stopPropagation();this.parentElement.classList.toggle(\'checked\',this.checked);_spUpdateBulkTotal()"/>'
                + '<div style="flex:1;min-width:0">'
                + '<div class="tw6 ts">' + ((isOverdue || isLate) ? '⚠️ ' : '📅 ') + FormatUtils.escape(p.ds || p.serviceName || 'Aidat') + '</div>'
                + '<div class="ts tm mt1">Vade: ' + DateUtils.format(p.dt) + '</div>'
                + '</div>'
                + '<div style="text-align:right;flex-shrink:0">'
                + '<div class="tw6 ts tg">' + FormatUtils.currency(p.amt) + '</div>'
                + badge
                + '</div></div>';
        });

        html += '<div class="card mb3" style="border-left:3px solid var(--red)">';
        html += '<div class="tw6 ts mb2" style="color:var(--red)">📋 Bekleyen Ödemelerim (' + pendingPayments.length + ')</div>';

        // Borç barı
        html += '<div class="sp-debt-bar mb3"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span class="ts tm">Toplam Bekleyen Borç</span><span class="tw6 tr2">' + FormatUtils.currency(totalDebt) + '</span></div><div class="prb"><div style="height:100%;background:var(--red);border-radius:4px;width:100%"></div></div></div>';

        // Toplu seçim kontrolleri
        html += '<div class="flex fjb fca gap2 mb2"><button type="button" class="btn btn-xs bs" onclick="selectAllSpPlans()">✅ Tümünü Seç</button><div id="sp-bulk-total" class="sp-bulk-total" style="display:none"><span class="ts tm">Seçilen toplam:</span><span class="tw6 tg" id="sp-bulk-total-val">₺0</span></div></div>';
        html += '<button class="btn bp w100 mb3" id="sp-bulk-pay-btn" style="display:none" onclick="spPayBulk()">💳 Seçilenleri Öde</button>';

        // Plan satırları
        html += '<div class="plan-list" style="gap:8px">' + planRows + '</div>';
        html += '</div>';
    }

    // ── Ödeme formu (gizli, plan seçilince açılır) ──
    html += '<div class="card mb3" id="sp-pay-form" style="display:none">';
    html += '<div class="sp-pay-form-header mb3"><div class="tw6 tsm">💳 Ödeme Yöntemi Seç</div><button class="btn bs btn-sm" onclick="document.getElementById(\'sp-pay-form\').style.display=\'none\'">✕ Kapat</button></div>';
    html += '<div id="sp-plan-info" class="sp-plan-info-box mb3"></div>';
    html += '<div class="pay-choice-grid mb3">';
    if (hasBank) {
        html += '<div class="pay-choice-card" id="pc-havale" onclick="selectPayChoice(\'havale\')"><div class="pay-choice-icon">🏦</div><div class="pay-choice-title">Havale / EFT</div><div class="pay-choice-desc">Banka havalesi veya EFT ile ödeme yapın</div></div>';
    }
    if (hasPayTR) {
        html += '<div class="pay-choice-card" id="pc-paytr" onclick="selectPayChoice(\'paytr\')"><div class="pay-choice-icon">🔵</div><div class="pay-choice-title">Online Kredi Kartı</div><div class="pay-choice-desc">PayTR güvenli altyapısı ile kartla ödeyin</div></div>';
    }
    if (!hasBank && !hasPayTR) {
        html += '<div class="al al-y" style="grid-column:1/-1;border-radius:10px;padding:14px"><div class="tw6 mb1">⚠️ Ödeme yöntemi bulunamadı</div><p class="ts tm">Yönetici henüz ödeme yöntemlerini yapılandırmamış. Lütfen akademi yönetimine başvurun.</p></div>';
    }
    html += '</div>';
    html += '<div id="pay-method-detail" class="mb2"></div>';
    html += '<div class="fgr mb2 dn" id="sp-desc-wrapper"><label>Açıklama <span class="tm ts">(opsiyonel)</span></label><input id="sp-desc" placeholder="Ödeme notu ekleyin..."/></div>';
    html += '<button class="btn bp w100 mt2" id="pay-submit-btn" style="display:none" onclick="submitSpPayment()">Bildirim Gönder</button>';
    html += '</div>';

    // ── Onay bekleyen bildirimler ──
    if (pending.length > 0) {
        html += '<div class="card mb3" style="border-left:3px solid var(--yellow)"><div class="tw6 ts mb2" style="color:var(--yellow)">⏳ Onay Bekleyen Bildirimlerim</div>';
        pending.forEach(function(p) {
            html += '<div class="payment-card" style="border-color:rgba(234,179,8,.35);gap:10px"><div style="font-size:24px;flex-shrink:0">' + mIcon(p.payMethod) + '</div><div class="payment-info"><div class="payment-amount" style="font-size:16px;color:var(--yellow)">' + FormatUtils.currency(p.amt) + '</div><div class="payment-date">' + mLabel(p.payMethod) + ' • ' + DateUtils.format(p.dt) + '</div><div class="ts tm mt1">' + FormatUtils.escape(p.ds || p.serviceName || 'Aidat') + '</div></div><span class="bg bg-y" style="flex-shrink:0;white-space:nowrap">Bekliyor</span></div>';
        });
        html += '</div>';
    }

    // ── Ödeme geçmişi ──
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
        waApiToken: (UIUtils.getValue('s-wa-token') || '').trim(),
        waPhoneId: (UIUtils.getValue('s-wa-phone') || '').trim(),
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

    var plans = planIds.map(function(id) { return (AppState.data.payments || []).find(function(p) { return p.id === id; }); }).filter(Boolean);
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
        var userName = ((a.fn || '') + ' ' + (a.ln || '')).substring(0, 60).replace(/[^\x00-\x7F]/g, function(ch) {
            var map = {'ç':'c','Ç':'C','ğ':'g','Ğ':'G','ı':'i','İ':'I','ö':'o','Ö':'O','ş':'s','Ş':'S','ü':'u','Ü':'U'};
            return map[ch] || '';
        });

        // v4 FIX: Email — .local domain PayTR tarafından reddedilebilir
        var email = a.em || '';
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
        var insertResult = await sb.from('payments').insert(DB.mappers.fromPayment(pendingPay));
        if (insertResult.error) throw insertResult.error;
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
        if (!event.origin) return;
        var validOrigins = ['https://www.paytr.com', 'https://paytr.com'];
        var isPayTR = validOrigins.indexOf(event.origin) !== -1 || /^https:\/\/[a-z0-9-]+\.paytr\.com$/.test(event.origin);
        if (!isPayTR) return;

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

// ── H2: showLegal OVERRIDE — Dinamik KVKK/Kullanım Şartları metni ────────
window.showLegal = function(type) {
    var s = (AppState && AppState.data && AppState.data.settings) || {};
    var ctrl = s.dataControllerName || 'Dragos Futbol Akademisi';
    var addr = s.dataControllerAddr || 'Cevizli, Hacılar Cd. No:72, 34846 Maltepe/İstanbul';
    var phone = s.dataControllerPhone || '0549 514 72 27';
    var email = s.dataControllerEmail || 'dragosfutbolakademisi@gmail.com';
    var years = s.dataRetentionYears || 5;

    var defaultKvkk = '<div style="line-height:1.8;font-size:13px;color:var(--text2);overflow-y:auto;padding-right:8px">'
        + '<p style="margin-bottom:14px"><b>KİŞİSEL VERİLERİN KORUNMASI KANUNU AYDINLATMA METNİ</b></p>'

        + '<p style="margin-bottom:6px"><b>1. VERİ SORUMLUSU</b></p>'
        + '<p style="margin-bottom:4px"><b>' + FormatUtils.escape(ctrl) + '</b></p>'
        + (addr  ? '<p style="margin-bottom:2px">📍 ' + FormatUtils.escape(addr)  + '</p>' : '')
        + (phone ? '<p style="margin-bottom:2px">📞 ' + FormatUtils.escape(phone) + '</p>' : '')
        + (email ? '<p style="margin-bottom:12px">✉️ ' + FormatUtils.escape(email) + '</p>' : '')

        + '<p style="margin-bottom:6px"><b>2. İŞLENEN KİŞİSEL VERİLER</b></p>'
        + '<p style="margin-bottom:12px">Ad-soyad, TC kimlik numarası, doğum tarihi, cinsiyet, telefon numarası, e-posta adresi, veli/vasi adı ve iletişim bilgileri, ödeme kayıtları, aidat bilgileri, yoklama ve devam verileri, spor dalı ve kategori bilgileri.</p>'

        + '<p style="margin-bottom:6px"><b>3. İŞLEME AMACI VE HUKUKİ DAYANAK</b></p>'
        + '<p style="margin-bottom:4px">Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>'
        + '<ul style="margin-left:16px;margin-bottom:12px">'
        + '<li>Sporcu kaydı ve üyelik yönetimi (KVKK Madde 5/2-c — sözleşmenin ifası)</li>'
        + '<li>Aidat tahsilatı ve ödeme takibi (KVKK Madde 5/2-c — sözleşmenin ifası)</li>'
        + '<li>Yoklama ve devam takibi (KVKK Madde 5/2-c — sözleşmenin ifası)</li>'
        + '<li>Veli bilgilendirme ve SMS bildirimleri (KVKK Madde 5/2-a — açık rıza)</li>'
        + '<li>Yasal yükümlülüklerin yerine getirilmesi (KVKK Madde 5/2-ç — kanuni yükümlülük)</li>'
        + '</ul>'

        + '<p style="margin-bottom:6px"><b>4. VERİLERİN AKTARILDIĞI TARAFLAR</b></p>'
        + '<p style="margin-bottom:4px">Kişisel verileriniz aşağıdaki üçüncü taraflarla paylaşılmaktadır:</p>'
        + '<ul style="margin-left:16px;margin-bottom:12px">'
        + '<li><b>PayTR Bilişim Hizmetleri A.Ş.</b> — online ödeme altyapısı (kart bilgileri tarafımızca saklanmaz)</li>'
        + '<li><b>Supabase Inc.</b> — veri tabanı altyapısı (Frankfurt, Almanya — AB GDPR kapsamında)</li>'
        + '<li><b>Vercel Inc.</b> — web uygulama barındırma (ABD — SCCs kapsamında)</li>'
        + '</ul>'
        + '<p style="margin-bottom:12px">Yurt dışına aktarım KVKK Madde 9 kapsamında açık rızanıza veya yeterli koruma güvencesine dayalı olarak gerçekleştirilmektedir.</p>'

        + '<p style="margin-bottom:6px"><b>5. VERİ SAKLAMA SÜRESİ</b></p>'
        + '<p style="margin-bottom:12px">Aktif sporcu verileri üyelik süresince; üyelik sona erişinden itibaren ' + years + ' yıl süreyle saklanır. Ödeme kayıtları Vergi Usul Kanunu gereği 5 yıl muhafaza edilir. Süre sonunda veriler güvenli şekilde imha edilir.</p>'

        + '<p style="margin-bottom:6px"><b>6. GÜVENLİK ÖNLEMLERİ</b></p>'
        + '<p style="margin-bottom:12px">Verileriniz şifreli bağlantı (HTTPS/TLS) ile iletilir; şifreler bcrypt algoritmasıyla hash\'lenerek saklanır. Yetkisiz erişime karşı erişim kontrolü ve rol tabanlı yetkilendirme uygulanmaktadır.</p>'

        + '<p style="margin-bottom:6px"><b>7. HAKLARINIZ (KVKK Madde 11)</b></p>'
        + '<p style="margin-bottom:4px">Veri sorumlusuna başvurarak aşağıdaki haklarınızı kullanabilirsiniz:</p>'
        + '<ul style="margin-left:16px;margin-bottom:12px">'
        + '<li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>'
        + '<li>İşlenmişse buna ilişkin bilgi talep etme</li>'
        + '<li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>'
        + '<li>Yurt içi veya yurt dışında aktarıldığı üçüncü kişileri öğrenme</li>'
        + '<li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>'
        + '<li>KVKK Madde 7 kapsamında silinmesini veya yok edilmesini isteme</li>'
        + '<li>Düzeltme/silme işlemlerinin üçüncü kişilere bildirilmesini isteme</li>'
        + '<li>Otomatik sistemlerle analiz sonucu aleyhinize çıkan karara itiraz etme</li>'
        + '<li>Kanuna aykırı işleme nedeniyle uğradığınız zararın giderilmesini talep etme</li>'
        + '</ul>'

        + '<p style="margin-bottom:6px"><b>8. BAŞVURU YÖNTEMİ</b></p>'
        + '<p style="margin-bottom:4px">Haklarınızı kullanmak için aşağıdaki kanallardan başvurabilirsiniz:</p>'
        + '<ul style="margin-left:16px;margin-bottom:4px">'
        + (email ? '<li>E-posta: <b>' + FormatUtils.escape(email) + '</b></li>' : '')
        + (addr  ? '<li>Yazılı başvuru: <b>' + FormatUtils.escape(addr) + '</b></li>' : '')
        + '</ul>'
        + '<p style="margin-bottom:12px">Başvurularınızda kimliğinizi doğrulayan bilgiler (ad-soyad, TC kimlik numarası) bulunmalıdır. Talepler 30 gün içinde ücretsiz olarak yanıtlanır. Sporcu profilinizden de "Verilerimi Sil" butonunu kullanabilirsiniz.</p>'

        + '<p style="font-size:11px;color:var(--text3)">Son güncelleme: Mart 2026</p>'
        + '</div>';

    var defaultTerms = '<div style="line-height:1.8;font-size:13px;color:var(--text2);overflow-y:auto;padding-right:8px">'
        + '<p style="margin-bottom:14px"><b>KULLANIM ŞARTLARI</b></p>'
        + '<p style="margin-bottom:12px"><b>' + FormatUtils.escape(ctrl) + '</b> sporcu yönetim sistemini kullanarak aşağıdaki şartları okuduğunuzu ve kabul ettiğinizi beyan etmiş sayılırsınız.</p>'

        + '<p style="margin-bottom:6px"><b>1. HİZMET KAPSAMI</b></p>'
        + '<p style="margin-bottom:12px">Bu sistem; sporcu kaydı, yoklama takibi, aidat yönetimi, veli bilgilendirme ve antrenman programı görüntüleme amacıyla sunulmaktadır. Hizmet yalnızca kayıtlı sporcu ve antrenörlere yöneliktir.</p>'

        + '<p style="margin-bottom:6px"><b>2. HESAP GÜVENLİĞİ</b></p>'
        + '<p style="margin-bottom:4px">Sisteme giriş bilgileriniz (TC kimlik numarası ve şifre) size özeldir. Şifrenizi:</p>'
        + '<ul style="margin-left:16px;margin-bottom:8px">'
        + '<li>Kimseyle paylaşmayınız</li>'
        + '<li>Başkasının cihazında kaydetmeyiniz</li>'
        + '<li>Düzenli aralıklarla değiştiriniz</li>'
        + '</ul>'
        + '<p style="margin-bottom:12px">Hesabınızdan gerçekleştirilen tüm işlemlerden siz sorumlusunuz. Yetkisiz erişim şüphesi durumunda derhal ' + (email ? FormatUtils.escape(email) : 'akademi yetkilisi') + ' ile iletişime geçiniz.</p>'

        + '<p style="margin-bottom:6px"><b>3. YASAKLI KULLANIMLAR</b></p>'
        + '<p style="margin-bottom:4px">Aşağıdaki kullanımlar kesinlikle yasaktır:</p>'
        + '<ul style="margin-left:16px;margin-bottom:12px">'
        + '<li>Başkasının TC kimlik numarası veya bilgileriyle sisteme giriş yapmak</li>'
        + '<li>Sistemi kötüye kullanmak, test etmek veya açıklarını araştırmak</li>'
        + '<li>Diğer kullanıcıların verilerine yetkisiz erişmeye çalışmak</li>'
        + '<li>Otomatik araçlar (bot, scraper vb.) ile sistemi kullanmak</li>'
        + '<li>Sisteme zarar verecek yazılım veya kod çalıştırmak</li>'
        + '</ul>'

        + '<p style="margin-bottom:6px"><b>4. ÖDEME KOŞULLARI</b></p>'
        + '<p style="margin-bottom:12px">Online ödemeler <b>PayTR</b> güvenli ödeme altyapısı üzerinden gerçekleştirilir; kart bilgileri tarafımızca saklanmaz. Ödeme onaylandıktan sonra sistem kaydı otomatik güncellenir. Ödeme anlaşmazlıklarında önce akademiyle, çözüm sağlanamazsa PayTR ile iletişime geçilmelidir.</p>'

        + '<p style="margin-bottom:6px"><b>5. İADE POLİTİKASI</b></p>'
        + '<p style="margin-bottom:12px">Aidat ödemeleri ilgili ay başlamadan önce iptal bildiriminde bulunulması halinde iade edilebilir. Ay başladıktan sonra yapılan iptallerde iade yapılmaz. İade talepleri ' + (email ? FormatUtils.escape(email) : 'akademi yönetimine') + ' iletilmelidir; talepler 5 iş günü içinde değerlendirilir.</p>'

        + '<p style="margin-bottom:6px"><b>6. VERİ DOĞRULUĞU</b></p>'
        + '<p style="margin-bottom:12px">Sisteme girdiğiniz bilgilerin (ad, soyad, TC numarası, iletişim bilgileri vb.) doğruluğundan siz sorumlusunuz. Yanlış bilgi nedeniyle yaşanan sorunlardan akademi sorumlu tutulamaz.</p>'

        + '<p style="margin-bottom:6px"><b>7. HİZMET KESİNTİSİ</b></p>'
        + '<p style="margin-bottom:12px">Planlı bakım, teknik arıza veya üçüncü taraf altyapı sorunları nedeniyle hizmette geçici kesintiler yaşanabilir. Bu durumlarda önceden bildirim yapılmaya çalışılır; ancak kesintilerden doğan zararlar için sorumluluk kabul edilmez.</p>'

        + '<p style="margin-bottom:6px"><b>8. FİKRİ MÜLKİYET</b></p>'
        + '<p style="margin-bottom:12px">Sistemdeki tüm içerik, tasarım ve yazılım <b>' + FormatUtils.escape(ctrl) + '</b>\'ne aittir. İzinsiz kopyalanamaz, dağıtılamaz veya ticari amaçla kullanılamaz.</p>'

        + '<p style="margin-bottom:6px"><b>9. UYGULANACAK HUKUK VE YETKİLİ MAHKEME</b></p>'
        + '<p style="margin-bottom:12px">Bu şartlar Türkiye Cumhuriyeti hukukuna tabidir. Uyuşmazlıklarda İstanbul mahkemeleri ve icra daireleri yetkilidir.</p>'

        + '<p style="margin-bottom:6px"><b>10. İLETİŞİM VE ŞİKAYET</b></p>'
        + '<p style="margin-bottom:4px">Kullanım şartlarına ilişkin sorularınız ve şikayetleriniz için:</p>'
        + (email ? '<p style="margin-bottom:2px">✉️ ' + FormatUtils.escape(email) + '</p>' : '')
        + (phone ? '<p style="margin-bottom:2px">📞 ' + FormatUtils.escape(phone) + '</p>' : '')
        + (addr  ? '<p style="margin-bottom:12px">📍 ' + FormatUtils.escape(addr)  + '</p>' : '')

        + '<p style="margin-bottom:6px"><b>11. DEĞİŞİKLİKLER</b></p>'
        + '<p style="margin-bottom:12px">Kullanım şartları önceden bildirim yapılmaksızın güncellenebilir. Güncel metin her zaman sistem üzerinden erişilebilir durumdadır. Sistemi kullanmaya devam etmeniz güncel şartları kabul ettiğiniz anlamına gelir.</p>'

        + '<p style="font-size:11px;color:var(--text3)">Son güncelleme: Mart 2026</p>'
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
window.showOnKayitForm = async function() {
    if (_origShowOnKayitForm) await _origShowOnKayitForm.apply(this, arguments);
    // Form render edildikten sonra KVKK checkbox ekle (retry ile)
    var _tryAddKvkk = function(attempt) {
        var formBody = document.querySelector('#onkayit-modal [style*="overflow-y:auto"]');
        if (!formBody || document.getElementById('ok-kvkk-consent')) {
            if (!formBody && attempt < 10) setTimeout(function() { _tryAddKvkk(attempt + 1); }, 200);
            return;
        }
        var div = document.createElement('div');
        div.style.cssText = 'margin-top:12px;padding:12px;background:var(--bg3);border-radius:8px;border:1px solid var(--border)';
        div.innerHTML = '<label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;font-size:13px;line-height:1.5">'
            + '<input type="checkbox" id="ok-kvkk-consent" style="margin-top:2px;width:18px;height:18px;flex-shrink:0"/>'
            + '<span><b>KVKK Onayı *</b> — '
            + '<a href="#" onclick="showLegal(\'kvkk\');return false;" style="color:var(--blue2)">Kişisel Verilerin Korunması Kanunu Aydınlatma Metni</a>\'ni okudum ve kişisel verilerimin işlenmesine <b>açık rıza</b> veriyorum.</span>'
            + '</label>';
        formBody.appendChild(div);
    };
    setTimeout(function() { _tryAddKvkk(0); }, 100);
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
    var doDelete = async function() {
        var sb = typeof getSupabase === 'function' ? getSupabase() : null;
        if (!sb) return;
        try {
            if (athleteId) await sb.from('athletes').delete().eq('id', athleteId);
            await sb.from('deletion_requests').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', reqId);
            toast('✅ Sporcu verileri silindi', 'g');
            loadDeletionRequests();
        } catch(e) {
            console.error('Deletion error:', e);
            toast('Silme hatası: ' + (e.message || e), 'e');
        }
    };
    if (typeof confirm2 === 'function') {
        confirm2('Veri Silme', 'Sporcu verileri kalıcı olarak silinecek. Emin misiniz?', doDelete);
    } else {
        if (confirm('Sporcu verileri kalıcı olarak silinecek. Emin misiniz?')) {
            doDelete().catch(function(e) { console.error('Deletion error:', e); });
        }
    }
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
    if (res.error || !res.data) { el.innerHTML = '<p class="ts tm">Veri alınamadı.</p>'; return; }
    var total = res.data.length;
    var approved = res.data.filter(function(r) { return r.kvkk_consent; }).length;
    el.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">'
        + '<div style="background:var(--bg3);border-radius:8px;padding:12px;text-align:center"><div class="ts tm">Toplam Başvuru</div><div style="font-size:24px;font-weight:700">' + total + '</div></div>'
        + '<div style="background:var(--bg3);border-radius:8px;padding:12px;text-align:center"><div class="ts tm">KVKK Onaylı</div><div style="font-size:24px;font-weight:700;color:var(--green)">' + approved + '</div></div>'
        + '</div>'
        + '<p class="ts tm">' + (total - approved) + ' başvuruda KVKK onayı eksik (eski kayıtlar).</p>';
};

console.log('✅ H7: Admin hukuki gereksinimler kartı aktif');

// ── OTOMATİK UYARILAR ──────────────────────────────────────
function buildAutoAlerts() {
    var alerts = [];
    var today = DateUtils.today();

    var dueTodayList = (AppState.data.payments || []).filter(function(p) {
        return (p.st === 'pending' || p.st === 'overdue') && p.dt === today;
    });
    if (dueTodayList.length > 0) {
        alerts.push({ type: 'warning', icon: '📅', msg: 'Bugün vadesi gelen ' + dueTodayList.length + ' ödeme var.', action: "go('payments')" });
    }

    var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    var weekAgoStr = weekAgo.toISOString().split('T')[0];
    var recentDates = Object.keys(AppState.data.attendance || {}).filter(function(d) { return d >= weekAgoStr; });
    var noAttClasses = (AppState.data.classes || []).filter(function(cls) {
        return !recentDates.some(function(d) {
            return Object.keys(AppState.data.attendance[d] || {}).some(function(aid) {
                var a = (AppState.data.athletes || []).find(function(x) { return x.id === aid; });
                return a && a.clsId === cls.id;
            });
        });
    });
    if (noAttClasses.length > 0) {
        alerts.push({ type: 'info', icon: '📋', msg: noAttClasses.map(function(c) { return c.name; }).join(', ') + ' grubunda 7+ gündür yoklama girilmedi.', action: "go('attendance')" });
    }

    var riskAthletes = (AppState.data.athletes || []).filter(function(a) {
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
        (AppState.data.payments || []).forEach(function(p) {
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

// ── FULLCALENDAR ────────────────────────────────────────────
function pgCalendar() {
    return '<div class="ph" style="margin-bottom:12px"><div class="stit" style="font-size:18px;font-weight:700">📅 Antrenman Takvimi</div></div>'
        + '<div class="card" style="min-height:400px;padding:12px"><div id="fc-calendar"></div></div>';
}
window.pgCalendar = pgCalendar;

function initCalendarChart() {
    if (!window.FullCalendar) { setTimeout(initCalendarChart, 300); return; }
    var el = document.getElementById('fc-calendar');
    if (!el) return;
    if (el._fc) { el._fc.destroy(); el._fc = null; }

    var dayNames = ['pazar','pazartesi','salı','çarşamba','perşembe','cuma','cumartesi'];
    var events = [];
    var hasSchedule = (AppState.data.classes || []).some(function(c) { return c.scheduleDays && c.scheduleDays.length > 0; });
    var colors = ['#3b82f6','#8b5cf6','#06b6d4','#f97316','#22c55e'];

    if (hasSchedule) {
        var startD = new Date(); startD.setDate(startD.getDate() - 60);
        var endD = new Date(); endD.setDate(endD.getDate() + 90);
        (AppState.data.classes || []).forEach(function(cls, ci) {
            if (!cls.scheduleDays || !cls.scheduleDays.length) return;
            var color = colors[ci % colors.length];
            var ts = (cls.scheduleTime && cls.scheduleTimeEnd) ? cls.scheduleTime + '-' + cls.scheduleTimeEnd : (cls.scheduleTime || '');
            var cur = new Date(startD);
            while (cur <= endD) {
                var dn = dayNames[cur.getDay()];
                if (cls.scheduleDays.indexOf(dn) > -1) {
                    var ds = cur.getFullYear() + '-' + String(cur.getMonth()+1).padStart(2,'0') + '-' + String(cur.getDate()).padStart(2,'0');
                    var dayAtt = (AppState.data.attendance || {})[ds] || {};
                    var athInCls = (AppState.data.athletes || []).filter(function(a) { return a.clsId === cls.id && a.st === 'active'; });
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
        Object.keys(AppState.data.attendance || {}).forEach(function(date) {
            var dayData = (AppState.data.attendance || {})[date] || {};
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
        firstDay: 1,
        headerToolbar: { left: 'prev,next', center: 'title', right: 'today' },
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
            var isTraining = (AppState.data.classes || []).some(function(c) { return c.scheduleDays && c.scheduleDays.indexOf(dn) > -1; });
            if (isTraining) arg.el.style.backgroundColor = 'rgba(59,130,246,0.05)';
        }
    });
    cal.render();
    el._fc = cal;
}

// go() override — sadece calendar sayfası için
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

// ── TEK BİRLEŞİK AFTER HOOK ────────────────────────────────
window.registerGoHook('after', function(page) {

    // Yoklama geçmişi (Geliştirme 2)
    if (page === 'attendance') {
        var main = document.getElementById('main');
        if (!main) return;
        if (main.querySelector('.yoklama-gecmis')) return;
        var atcls = AppState.ui.atcls || '';
        var allDates = Object.keys(AppState.data.attendance || {}).filter(function(d) {
            var dayData = (AppState.data.attendance || {})[d] || {};
            var list = (AppState.data.athletes || []).filter(function(a) {
                return a.st === 'active' && (!atcls || a.clsId === atcls);
            });
            return list.some(function(a) { return dayData[a.id]; });
        }).sort().reverse().slice(0, 10);

        if (allDates.length === 0) return;

        var div = document.createElement('div');
        div.className = 'card mt3 yoklama-gecmis';
        div.innerHTML = '<div class="tw6 tsm mb2">📅 Son 10 Günlük Geçmiş</div>'
            + allDates.map(function(d) {
                var dayData = (AppState.data.attendance || {})[d] || {};
                var list = (AppState.data.athletes || []).filter(function(a) {
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

    // Dashboard özeti — yönetici (Geliştirme 4)
    if (page === 'dashboard' && AppState.currentUser && AppState.currentUser.role !== 'coach') {
        var main = document.getElementById('main');
        if (!main) return;
        if (main.querySelector('#dash-ozet')) return;

        var todayStr = DateUtils.today();
        var attToday = (AppState.data.attendance || {})[todayStr] || {};
        var activeAthletes = (AppState.data.athletes || []).filter(function(a) { return a.st === 'active'; });
        var todayPresent = activeAthletes.filter(function(a) { return attToday[a.id] === 'P'; }).length;
        var todayAbsent  = activeAthletes.filter(function(a) { return attToday[a.id] === 'A'; }).length;
        var attEntered   = activeAthletes.filter(function(a) { return attToday[a.id]; }).length;
        var overdueList  = (AppState.data.payments || []).filter(function(p) { return p.st === 'overdue'; });
        var overdueNames = overdueList.slice(0, 3).map(function(p) {
            var a = (AppState.data.athletes || []).find(function(x) { return x.id === p.aid; });
            return a ? ((a.fn || '') + ' ' + (a.ln || '')) : null;
        }).filter(Boolean);
        var weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
        var newThisWeek = (AppState.data.athletes || []).filter(function(a) { return a.rd && new Date(a.rd) >= weekAgo; }).length;

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

        var statGrid = main.querySelector('.g4.mb3');
        if (statGrid) {
            main.insertBefore(div, statGrid);
        } else {
            var ph = main.querySelector('.ph');
            if (ph && ph.nextSibling) main.insertBefore(div, ph.nextSibling);
            else main.appendChild(div);
        }
    }

    // Dashboard — antrenör paneli (Geliştirme 4)
    if (page === 'dashboard' && AppState.currentUser && AppState.currentUser.role === 'coach') {
        var main = document.getElementById('main');
        if (!main || main.querySelector('#coach-panel')) return;

        var coachRecord = (AppState.data.coaches || []).find(function(c) { return c.id === AppState.currentUser.id; })
            || (AppState.data.coaches || []).find(function(c) { return AppState.currentUser.tc && c.tc === AppState.currentUser.tc; })
            || null;
        var myClassIds = (AppState.data.classes || []).filter(function(c) { return coachRecord && c.coachId === coachRecord.id; }).map(function(c) { return c.id; });
        var myAthletes = (AppState.data.athletes || []).filter(function(a) { return a.st === 'active' && myClassIds.indexOf(a.clsId) > -1; });
        var todayAtt = (AppState.data.attendance || {})[DateUtils.today()] || {};
        var presentToday = myAthletes.filter(function(a) { return todayAtt[a.id] === 'P'; }).length;
        var absentToday  = myAthletes.filter(function(a) { return todayAtt[a.id] === 'A'; }).length;
        var notEntered   = myAthletes.filter(function(a) { return !todayAtt[a.id]; }).length;
        var lowAtt = myAthletes.filter(function(a) {
            var stats = getAttendanceStats(a.id);
            return stats.total > 5 && stats.rate < 50;
        });
        var myClasses = (AppState.data.classes || []).filter(function(c) { return coachRecord && c.coachId === coachRecord.id; });

        main.innerHTML = '<div class="ph"><div class="stit">🏃 Antrenör Paneli</div></div>'
            + '<div class="g3 mb3" id="coach-panel">'
            + '<div class="card stat-card stat-g"><div class="stat-icon">👥</div><div class="stat-val">' + myAthletes.length + '</div><div class="stat-lbl">Gruptaki Sporcu</div></div>'
            + '<div class="card stat-card stat-b"><div class="stat-icon">✅</div><div class="stat-val">' + presentToday + '</div><div class="stat-lbl">Bugün Gelen</div></div>'
            + '<div class="card stat-card stat-r"><div class="stat-icon">❌</div><div class="stat-val">' + absentToday + '</div><div class="stat-lbl">Bugün Gelmedi</div></div>'
            + '</div>'
            + (notEntered > 0 ? '<div class="al al-y mb3">⚠️ ' + notEntered + ' sporcu için yoklama girilmedi. <button class="btn btn-sm bp" onclick="go(\'attendance\')" style="margin-left:8px">Yoklamaya Git →</button></div>' : '')
            + (lowAtt.length > 0
                ? '<div class="card mb3" style="border-left:4px solid var(--red)"><div class="tw6 tsm mb2">⚠️ Devamsızlık Riski</div>'
                    + lowAtt.map(function(a) { var s = getAttendanceStats(a.id); return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)"><span class="tw6 tsm">' + FormatUtils.escape((a.fn || '') + ' ' + (a.ln || '')) + '</span><span class="badge badge-red">%' + s.rate + '</span></div>'; }).join('')
                    + '</div>'
                : '<div class="al al-g mb3">✅ Tüm sporcular düzenli devam ediyor.</div>')
            + '<div class="card"><div class="tw6 tsm mb2">📋 Grubum</div>'
            + myClasses.map(function(cls) { var cnt = (AppState.data.athletes || []).filter(function(a) { return a.clsId === cls.id && a.st === 'active'; }).length; return '<div class="ts mb1">🏫 ' + FormatUtils.escape(cls.name) + ' — ' + cnt + ' sporcu</div>'; }).join('')
            + '</div>';
    }

    // Otomatik uyarılar (Geliştirme 5)
    if (page === 'dashboard' && AppState.currentUser && AppState.currentUser.role === 'admin') {
        if (typeof buildAutoAlerts === 'function') buildAutoAlerts();
    }

    // Veli profil — antrenör iletişim kartı (Geliştirme 6)
    if (typeof AppState.currentSporcu !== 'undefined' && AppState.currentSporcu) {
        var spContent = document.getElementById('sp-content');
        if (spContent && !spContent.querySelector('#coach-contact-card')) {
            var a = AppState.currentSporcu;
            var cls = (AppState.data.classes || []).find(function(c) { return c.id === a.clsId; });
            var coach = cls ? (AppState.data.coaches || []).find(function(c) { return c.id === cls.coachId; }) : null;
            if (coach && coach.ph) {
                var card = document.createElement('div');
                card.id = 'coach-contact-card';
                card.className = 'info-card';
                card.innerHTML = '<div class="info-card-title">📞 Antrenörümle İletişim</div>'
                    + '<div class="info-row"><span class="info-label">Antrenör</span><span class="info-value tw6">' + FormatUtils.escape((coach.fn || '') + ' ' + (coach.ln || '')) + '</span></div>'
                    + (coach.ph ? '<div class="info-row"><span class="info-label">Telefon</span><a href="tel:' + FormatUtils.escape(coach.ph) + '" class="info-value tb">' + FormatUtils.escape(coach.ph) + '</a></div>' : '')
                    + (coach.ph ? '<div class="mt2"><a href="https://wa.me/90' + coach.ph.replace(/\D/g,'').slice(-10) + '" target="_blank" rel="noopener" class="btn w100" style="background:#25d366;color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;gap:6px;text-decoration:none">💬 WhatsApp ile Yaz</a></div>' : '');

                var sidebar = spContent.querySelector('.profile-sidebar');
                if (sidebar) sidebar.appendChild(card);
            }
        }
    }

    // Chart.js — Dashboard (Geliştirme 8)
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

    // Chart.js — Accounting (Geliştirme 8)
    if (page === 'accounting') setTimeout(initBranchChart, 150);

    // Takvim menü aktif (Geliştirme 9)
    if (page === 'calendar') {
        document.querySelectorAll('.ni').forEach(function(el) {
            el.classList.toggle('on', el.id === 'ni-calendar');
        });
    }
});

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

// ── EDIT CLASS OVERRIDE — gün ve saat alanları ──────────────
var _origEditClass = window.editClass;
window.editClass = function(id) {
    var c = id ? (AppState.data.classes || []).find(function(x) { return x.id === id; }) : null;
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
        + '<div class="fgr"><label>Branş</label><select id="c-sp">' + (AppState.data.sports || []).map(function(s) { return '<option value="' + s.id + '"' + (c && c.spId === s.id ? ' selected' : '') + '>' + FormatUtils.escape(s.name) + '</option>'; }).join('') + '</select></div>'
        + '<div class="fgr"><label>Antrenör</label><select id="c-coach"><option value="">Seçiniz</option>' + (AppState.data.coaches || []).map(function(co) { return '<option value="' + co.id + '"' + (c && c.coachId === co.id ? ' selected' : '') + '>' + FormatUtils.escape((co.fn || '') + ' ' + (co.ln || '')) + '</option>'; }).join('') + '</select></div>'
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
                    if (isNew) { if (!AppState.data.classes) AppState.data.classes = []; AppState.data.classes.push(obj); }
                    else { var idx = (AppState.data.classes || []).findIndex(function(x) { return x.id === obj.id; }); if (idx >= 0) AppState.data.classes[idx] = obj; }
                    toast(i18n[AppState.lang].saveSuccess, 'g');
                    closeModal();
                    go('classes');
                }
            }}
        ]
    );
};

// ── YOKLAMA OVERRIDE — antrenman günü kontrolü ───────────────
(function() {
    var _origPgAttendance = typeof pgAttendance === 'function' ? pgAttendance : null;

    function getClassesForDate(dateStr) {
        var d = new Date(dateStr + 'T12:00:00');
        var dayNames = ['pazar','pazartesi','salı','çarşamba','perşembe','cuma','cumartesi'];
        var dayName = dayNames[d.getDay()];
        return (AppState.data.classes || []).filter(function(cls) {
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
        var hasSchedule = (AppState.data.classes || []).some(function(c) { return c.scheduleDays && c.scheduleDays.length > 0; });
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
        var list = (AppState.data.athletes || []).filter(function(a) {
            return a.st === 'active' && (!selClsId || a.clsId === selClsId);
        });

        var attDay = (AppState.data.attendance || {})[today] || {};
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

// ── AKORDİYON SİDEBAR ──────────────────────────────────────
(function() {
    var KEY = 'sidebar_acc_v2';
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
        ['academy','finance'].forEach(function(g) {
            var body = document.getElementById('accb-' + g);
            var hdr  = body ? body.previousElementSibling : null;
            if (!body || !hdr) return;
            // Default closed (HTML has collapsed class), open only if saved state says open
            if (s[g] === true) {
                body.classList.remove('collapsed');
                hdr.setAttribute('aria-expanded', 'true');
            }
        });
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
    else { init(); }
})();

// ── updateBranchUI OVERRIDE — akordiyon uyumlu ──────────────
var _origUpdateBranchUI2 = typeof updateBranchUI === 'function' ? updateBranchUI : null;
window.updateBranchUI = function() {
    if (_origUpdateBranchUI2) _origUpdateBranchUI2();
    if (AppState.currentUser && AppState.currentUser.role === 'coach') {
        ['accg-finance'].forEach(function(g) {
            var el = document.getElementById(g); if (el) el.style.display = 'none';
        });
        ['ni-sports','ni-classes','ni-settings','ni-dashboard'].forEach(function(id) {
            var el = document.getElementById(id); if (el) el.style.display = 'none';
        });
    }
};

// ── CLASSES SAYFASI OVERRIDE — schedule göster ──────────────
window.registerGoHook('after', function(page) {
    if (page !== 'classes') return;
    var main = document.getElementById('main');
    if (!main) return;
    var rows = main.querySelectorAll('tbody tr');
    rows.forEach(function(row) {
        var editBtn = row.querySelector('button.bp');
        if (!editBtn) return;
        var onclickStr = editBtn.getAttribute('onclick') || '';
        var match = onclickStr.match(/editClass\('([^']+)'\)/);
        if (!match) return;
        var clsId = match[1];
        var cls = (AppState.data.classes || []).find(function(c) { return c.id === clsId; });
        if (!cls || !cls.scheduleDays || !cls.scheduleDays.length) return;
        var dayMap = { pazartesi:'Pzt', salı:'Sal', çarşamba:'Çar', perşembe:'Per', cuma:'Cum', cumartesi:'Cmt', pazar:'Paz' };
        var dayStr = cls.scheduleDays.map(function(d) { return dayMap[d] || d; }).join(', ');
        var timeStr = (cls.scheduleTime && cls.scheduleTimeEnd) ? cls.scheduleTime + '-' + cls.scheduleTimeEnd : '';
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

// ═══════════════════════════════════════════════════════════
// GELİŞTİRME 18: TAKVİME DERS EKLEME & SINIF BAZLI YOKLAMA
// ═══════════════════════════════════════════════════════════

// ── DERS VARLIĞI KONTROL FONKSİYONU ─────────────────────────
// Verilen tarih ve sınıf için ders olup olmadığını kontrol eder
// ve yoklama alınabilir duruma getirir
window.checkLessonExists = function(date, classId) {
    if (!date) date = DateUtils.today();
    var d = new Date(date + 'T12:00:00');
    var dayNames = ['pazar','pazartesi','salı','çarşamba','perşembe','cuma','cumartesi'];
    var dayName = dayNames[d.getDay()];

    if (classId) {
        var cls = (AppState.data.classes || []).find(function(c) { return c.id === classId; });
        if (!cls || !cls.scheduleDays || cls.scheduleDays.indexOf(dayName) < 0) return null;
        return cls;
    }
    // classId verilmezse o gün dersi olan tüm sınıfları döndür
    var classes = (AppState.data.classes || []).filter(function(c) {
        return c.scheduleDays && c.scheduleDays.indexOf(dayName) > -1;
    });
    return classes.length > 0 ? classes : null;
};

// ── DERS YOKLAMASI AL FONKSİYONU ────────────────────────────
// Ders varlığını kontrol edip yoklama sayfasına yönlendirir
window.takeLessonAttendance = function(date, classId) {
    if (!date) date = DateUtils.today();
    var lesson = window.checkLessonExists(date, classId);
    if (!lesson) {
        toast('⚠️ Bu tarihte bu sınıf için planlanmış ders bulunamadı.', 'e');
        return false;
    }
    // Ders var — yoklama sayfasına yönlendir
    AppState.ui.atd = date;
    AppState.ui.atcls = classId;
    AppState.ui._attDateSet = true;
    go('attendance');
    toast('📋 ' + (lesson.name || 'Ders') + ' yoklaması açılıyor...', 'g');
    return true;
};

// ── setAtt OVERRIDE — class_id kaydı ────────────────────────
(function() {
    var _origSetAtt = window.setAtt;
    window.setAtt = async function(aid, status) {
        var date = AppState.ui.atd || DateUtils.today();
        var classId = AppState.ui.atcls || null;

        if (!AppState.data.attendance) AppState.data.attendance = {};
        if (!AppState.data.attendance[date]) {
            AppState.data.attendance[date] = {};
        }

        if (status === undefined) {
            delete AppState.data.attendance[date][aid];
            var sb = getSupabase();
            if (sb) {
                try {
                    var q = sb.from('attendance')
                        .delete()
                        .eq('athlete_id', aid)
                        .eq('att_date', date)
                        .eq('org_id', AppState.currentOrgId);
                    if (classId) q = q.eq('class_id', classId);
                    await q;
                } catch(e) {
                    console.error('Attendance delete error:', e);
                    toast('Yoklama silinemedi: ' + (e.message || e), 'e');
                }
            }
        } else {
            AppState.data.attendance[date][aid] = status;
            var sb = getSupabase();
            if (sb) {
                try {
                    var matchQ = sb.from('attendance')
                        .select('id')
                        .eq('athlete_id', aid)
                        .eq('att_date', date)
                        .eq('org_id', AppState.currentOrgId);
                    if (classId) matchQ = matchQ.eq('class_id', classId);

                    var resp = await matchQ.maybeSingle();
                    var existing = resp.data;

                    if (existing && existing.id) {
                        await sb.from('attendance')
                            .update({ status: status })
                            .eq('id', existing.id);
                    } else {
                        var record = {
                            id: generateId(),
                            org_id: AppState.currentOrgId,
                            branch_id: AppState.currentBranchId,
                            athlete_id: aid,
                            att_date: date,
                            status: status
                        };
                        if (classId) record.class_id = classId;
                        await sb.from('attendance').insert(record);
                    }
                } catch(e) {
                    console.error('Attendance save error:', e);
                    toast('Yoklama kaydedilemedi: ' + (e.message || e), 'e');
                }
            }
        }
        go('attendance');
    };
})();

// ── AYARLAR SAYFASI OVERRIDE — Takvime Ders Ekleme ──────────
(function() {
    var _origPgSettings = window.pgSettings;
    window.pgSettings = function() {
        var baseHtml = _origPgSettings ? _origPgSettings() : '';

        // Takvime Ders Ekleme kartı oluştur
        var dayMap = { pazartesi:'Pzt', salı:'Sal', çarşamba:'Çar', perşembe:'Per', cuma:'Cum', cumartesi:'Cmt', pazar:'Paz' };
        var scheduledClasses = (AppState.data.classes || []).filter(function(c) {
            return c.scheduleDays && c.scheduleDays.length > 0;
        });

        var classRows = '';
        if (scheduledClasses.length === 0) {
            classRows = '<p class="tm ts" style="text-align:center;padding:16px">Henüz takvime eklenmiş ders bulunmuyor.</p>';
        } else {
            // Sınıfları gün+saat grubuna göre grupla
            var groups = {};
            scheduledClasses.forEach(function(cls) {
                var dayStr = cls.scheduleDays.map(function(d) { return dayMap[d] || d; }).join(', ');
                var timeStr = (cls.scheduleTime && cls.scheduleTimeEnd) ? cls.scheduleTime + '-' + cls.scheduleTimeEnd : 'Saat belirtilmedi';
                var key = dayStr + ' | ' + timeStr;
                if (!groups[key]) groups[key] = [];
                groups[key].push(cls);
            });

            Object.keys(groups).forEach(function(groupKey) {
                classRows += '<div style="background:var(--bg3);border-radius:10px;padding:12px;margin-bottom:10px">';
                classRows += '<div style="font-weight:600;font-size:13px;color:var(--blue2);margin-bottom:8px">📅 ' + FormatUtils.escape(groupKey) + '</div>';
                groups[groupKey].forEach(function(cls) {
                    var athCount = (AppState.data.athletes || []).filter(function(a) { return a.clsId === cls.id && a.st === 'active'; }).length;
                    var coachStr = cls.coachId ? coachName(cls.coachId) : '-';
                    classRows += '<div class="flex fjb fca" style="padding:6px 0;border-bottom:1px solid var(--border)">'
                        + '<div>'
                        + '<div class="tw6 tsm">' + FormatUtils.escape(cls.name) + '</div>'
                        + '<div class="ts tm">Antrenör: ' + FormatUtils.escape(coachStr) + ' · ' + athCount + ' sporcu</div>'
                        + '</div>'
                        + '<div class="flex gap2">'
                        + '<button class="btn btn-xs bp" onclick="editClass(\'' + FormatUtils.escape(cls.id) + '\')">✏️</button>'
                        + '<button class="btn btn-xs bs" onclick="takeLessonAttendance(DateUtils.today(),\'' + FormatUtils.escape(cls.id) + '\')">📋 Yoklama</button>'
                        + '<button class="btn btn-xs bd" onclick="deleteLessonFromCalendar(\'' + FormatUtils.escape(cls.id) + '\')">🗑️</button>'
                        + '</div></div>';
                });
                classRows += '</div>';
            });
        }

        // Bugün ders kontrolü
        var today = DateUtils.today();
        var todayLessons = window.checkLessonExists(today);
        var todayInfo = '';
        if (todayLessons && todayLessons.length > 0) {
            todayInfo = '<div class="al al-g mb3" style="font-size:13px">✅ Bugün <strong>' + todayLessons.length + '</strong> ders planlanmış: '
                + todayLessons.map(function(c) {
                    var ts = (c.scheduleTime && c.scheduleTimeEnd) ? c.scheduleTime + '-' + c.scheduleTimeEnd : '';
                    return '<strong>' + FormatUtils.escape(c.name) + '</strong>' + (ts ? ' (' + ts + ')' : '');
                }).join(', ') + '</div>';
        } else {
            todayInfo = '<div class="al al-y mb3" style="font-size:13px">📅 Bugün için planlanmış ders bulunmuyor.</div>';
        }

        // ── Mevcut Sınıflar Listesi ─────────────────────────────
        var allClasses = AppState.data.classes || [];
        var classListHtml = '';
        if (allClasses.length === 0) {
            classListHtml = '<p class="tm ts" style="text-align:center;padding:12px">Henüz sınıf bulunmuyor.</p>';
        } else {
            allClasses.forEach(function(cls) {
                var sport = cls.spId ? (AppState.data.sports || []).find(function(s) { return s.id === cls.spId; }) : null;
                var branchName = sport ? sport.name : '-';
                var coachStr = cls.coachId ? coachName(cls.coachId) : '-';
                var dayStr = (cls.scheduleDays && cls.scheduleDays.length > 0)
                    ? cls.scheduleDays.map(function(d) { return dayMap[d] || d; }).join(', ')
                    : '-';
                var timeStr = (cls.scheduleTime && cls.scheduleTimeEnd)
                    ? cls.scheduleTime + ' – ' + cls.scheduleTimeEnd
                    : (cls.scheduleTime || '-');
                // Öğrenci eşleşmesi: clsId (cls_id) üzerinden
                var students = (AppState.data.athletes || []).filter(function(a) { return a.clsId === cls.id; });
                var activeCount = students.filter(function(a) { return a.st === 'active'; }).length;
                var clsUid = 'cls-stu-' + (cls.id || '').replace(/[^a-zA-Z0-9]/g, '');

                classListHtml += '<div style="background:var(--bg3);border-radius:8px;padding:10px 12px;margin-bottom:8px">';

                // Sınıf bilgileri - kompakt satır
                classListHtml += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">';
                classListHtml += '<div style="flex:1;min-width:0">';
                classListHtml += '<div style="font-weight:600;font-size:13px;margin-bottom:2px">' + FormatUtils.escape(cls.name || '') + '</div>';
                classListHtml += '<div style="font-size:12px;color:var(--text2);line-height:1.6">'
                    + 'Branş: ' + FormatUtils.escape(branchName)
                    + ' · Antrenör: ' + FormatUtils.escape(coachStr)
                    + '<br>Günler: ' + FormatUtils.escape(dayStr)
                    + ' · Saat: ' + FormatUtils.escape(timeStr)
                    + ' · <strong>' + activeCount + '</strong> öğrenci'
                    + '</div>';
                classListHtml += '</div>';
                classListHtml += '<button class="btn btn-xs bs" onclick="editClass(\'' + FormatUtils.escape(cls.id) + '\')" style="flex-shrink:0">✏️</button>';
                classListHtml += '</div>';

                // Öğrenci alt listesi - aç/kapat
                classListHtml += '<div style="margin-top:6px">';
                classListHtml += '<button onclick="toggleClassStudents(\'' + clsUid + '\',this,' + students.length + ')" '
                    + 'aria-expanded="false" aria-controls="' + clsUid + '" '
                    + 'style="background:none;border:none;color:var(--blue2);font-size:12px;font-weight:600;cursor:pointer;padding:2px 0">▸ Öğrenciler (' + students.length + ')</button>';
                classListHtml += '<div id="' + clsUid + '" style="display:none;margin-top:4px">';

                if (students.length === 0) {
                    classListHtml += '<div style="font-size:12px;color:var(--text3);padding:4px 0">Bu sınıfta öğrenci yok.</div>';
                } else {
                    students.forEach(function(ath) {
                        var fullName = ((ath.fn || '') + ' ' + (ath.ln || '')).trim() || '-';
                        var stLabel = ath.st === 'active'
                            ? '<span style="color:var(--green);font-size:11px">● Aktif</span>'
                            : '<span style="color:var(--text3);font-size:11px">● Pasif</span>';
                        classListHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0;font-size:12px;border-bottom:1px solid var(--border)">'
                            + '<span style="color:var(--text)">' + FormatUtils.escape(fullName) + '</span>'
                            + stLabel
                            + '</div>';
                    });
                }

                classListHtml += '</div></div>';
                classListHtml += '</div>';
            });
        }

        var lessonCard = '<div class="card mb3" style="border-left:4px solid var(--blue2)">'
            + '<div class="flex fjb fca mb3">'
            + '<div>'
            + '<div class="tw6 tsm">📅 Takvim Ders Yönetimi</div>'
            + '<div class="ts tm">Takvime ders ekleyin, düzenleyin ve sınıf bazlı yoklama alın</div>'
            + '</div>'
            + '<button class="btn bsu btn-sm" onclick="showAddLessonToCalendarModal()">➕ Yeni Ders Ekle</button>'
            + '</div>'
            + todayInfo
            + classRows
            + '<div class="al al-b mt3" style="font-size:12px">'
            + 'ℹ️ Her sınıf grubu ve saat dilimi için ayrı yoklama alınır. '
            + 'Örn: CMT-PZR 09:00-10:00 ve CMT-PZR 10:00-11:00 grupları ayrı yoklama listesine sahiptir.'
            + '</div>'
            + '<div style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px">'
            + '<div class="tw6 tsm mb2">📋 Mevcut Sınıflar</div>'
            + classListHtml
            + '</div>'
            + '</div>';

        // Ders yönetimi kartını ayarlar sayfasının başına ekle (role yönetiminden sonra)
        var insertPoint = baseHtml.indexOf('<div class="card mb3" style="border-left: 4px solid var(--purple)">');
        if (insertPoint > -1) {
            return baseHtml.slice(0, insertPoint) + lessonCard + baseHtml.slice(insertPoint);
        }
        // Fallback: sona ekle
        return baseHtml + lessonCard;
    };
})();

// ── SINIF ÖĞRENCİ LİSTESİ AÇ/KAPAT ─────────────────────────
window.toggleClassStudents = function(elId, btn, count) {
    var el = document.getElementById(elId);
    if (!el) return;
    var isHidden = el.style.display === 'none';
    el.style.display = isHidden ? 'block' : 'none';
    btn.textContent = (isHidden ? '▾' : '▸') + ' Öğrenciler (' + count + ')';
    btn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
};

// ── YENİ DERS EKLEME MODALI ─────────────────────────────────
window.showAddLessonToCalendarModal = function() {
    var days = ['pazartesi','salı','çarşamba','perşembe','cuma','cumartesi','pazar'];
    var dayLabels = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];
    var dayCheckboxes = days.map(function(d, i) {
        return '<label style="display:inline-flex;align-items:center;gap:4px;margin-right:10px;cursor:pointer;font-size:13px">'
            + '<input type="checkbox" value="' + d + '" class="lesson-day-cb" style="width:auto;accent-color:var(--blue2)"/> '
            + dayLabels[i] + '</label>';
    }).join('');

    modal('📅 Takvime Yeni Ders Ekle',
        '<div class="al al-b mb3" style="font-size:12px">Ders eklemek için sınıf adı, antrenman günleri ve saat aralığını belirleyin. Her sınıf grubu ve saat dilimi için ayrı yoklama alınacaktır.</div>'
        + '<div class="fgr mb2"><label>Ders / Sınıf Adı *</label><input id="lesson-name" placeholder="Örn: CMT-PZR 09:00-10:00"/></div>'
        + '<div class="g21 mb2">'
        + '<div class="fgr"><label>Branş</label><select id="lesson-sp">' + (AppState.data.sports || []).map(function(s) { return '<option value="' + s.id + '">' + FormatUtils.escape(s.name) + '</option>'; }).join('') + '</select></div>'
        + '<div class="fgr"><label>Antrenör</label><select id="lesson-coach"><option value="">Seçiniz</option>' + (AppState.data.coaches || []).map(function(co) { return '<option value="' + co.id + '">' + FormatUtils.escape((co.fn || '') + ' ' + (co.ln || '')) + '</option>'; }).join('') + '</select></div>'
        + '</div>'
        + '<div class="fgr mb2"><label>Antrenman Günleri *</label><div style="padding:8px 0">' + dayCheckboxes + '</div></div>'
        + '<div class="g21 mb2">'
        + '<div class="fgr"><label>Başlangıç Saati *</label><input type="time" id="lesson-time" value="09:00"/></div>'
        + '<div class="fgr"><label>Bitiş Saati *</label><input type="time" id="lesson-time-end" value="10:00"/></div>'
        + '</div>',
        [
            { lbl: 'İptal', cls: 'bs', fn: closeModal },
            { lbl: '📅 Takvime Ekle', cls: 'bp', fn: async function() {
                var name = UIUtils.getValue('lesson-name');
                if (!name) { toast('Ders adı zorunludur!', 'e'); return; }
                var selDays = [];
                document.querySelectorAll('.lesson-day-cb:checked').forEach(function(cb) { selDays.push(cb.value); });
                if (selDays.length === 0) { toast('En az bir antrenman günü seçmelisiniz!', 'e'); return; }
                var time = UIUtils.getValue('lesson-time');
                var timeEnd = UIUtils.getValue('lesson-time-end');
                if (!time || !timeEnd) { toast('Başlangıç ve bitiş saati zorunludur!', 'e'); return; }

                var obj = {
                    id: generateId(),
                    name: name,
                    coachId: UIUtils.getValue('lesson-coach'),
                    spId: UIUtils.getValue('lesson-sp'),
                    cap: 20,
                    scheduleDays: selDays,
                    scheduleTime: time,
                    scheduleTimeEnd: timeEnd
                };
                var result = await DB.upsert('classes', DB.mappers.fromClass(obj));
                if (result) {
                    AppState.data.classes.push(obj);
                    toast('✅ "' + name + '" dersi takvime eklendi!', 'g');
                    closeModal();
                    go('settings');
                }
            }}
        ]
    );
};

// ── DERSİ TAKVİMDEN SİL ────────────────────────────────────
window.deleteLessonFromCalendar = async function(classId) {
    var cls = (AppState.data.classes || []).find(function(c) { return c.id === classId; });
    if (!cls) { toast('Sınıf bulunamadı!', 'e'); return; }

    modal('⚠️ Ders Silme Onayı',
        '<p>"<strong>' + FormatUtils.escape(cls.name) + '</strong>" dersini takvimden silmek istediğinize emin misiniz?</p>'
        + '<p class="ts tm mt2">Bu işlem sınıfı ve takvim programını kalıcı olarak siler. Sporcuların yoklama geçmişi etkilenmez.</p>',
        [
            { lbl: 'İptal', cls: 'bs', fn: closeModal },
            { lbl: '🗑️ Sil', cls: 'bd', fn: async function() {
                var result = await DB.remove('classes', { id: classId });
                if (result) {
                    AppState.data.classes = (AppState.data.classes || []).filter(function(c) { return c.id !== classId; });
                    toast('🗑️ "' + cls.name + '" dersi takvimden silindi.', 'g');
                    closeModal();
                    go('settings');
                }
            }}
        ]
    );
};

// ── YOKLAMA SAYFASI — SINIF GRUBU & SAAT BAZLI YOKLAMA ─────
// pgAttendance zaten yukarıda override edildi (line ~2477)
// Aşağıda ek olarak: Bugünkü tüm dersler için toplu yoklama özeti
window.registerGoHook('after', function(page) {
    if (page !== 'attendance') return;
    var main = document.getElementById('main');
    if (!main) return;
    if (main.querySelector('.per-class-summary')) return;

    var today = AppState.ui.atd || DateUtils.today();
    var lessons = window.checkLessonExists(today);
    if (!lessons || lessons.length <= 1) return;

    // Birden fazla ders varsa, her biri için özet göster
    var summary = '<div class="per-class-summary card mt3" style="border-left:4px solid var(--blue2)">';
    summary += '<div class="tw6 tsm mb2">📊 Günün Tüm Dersleri — ' + DateUtils.format(today) + '</div>';
    var attDay = (AppState.data.attendance || {})[today] || {};

    lessons.forEach(function(cls) {
        var athInCls = (AppState.data.athletes || []).filter(function(a) { return a.clsId === cls.id && a.st === 'active'; });
        var present = athInCls.filter(function(a) { return attDay[a.id] === 'P'; }).length;
        var absent = athInCls.filter(function(a) { return attDay[a.id] === 'A'; }).length;
        var filled = athInCls.filter(function(a) { return attDay[a.id]; }).length;
        var ts = (cls.scheduleTime && cls.scheduleTimeEnd) ? cls.scheduleTime + '-' + cls.scheduleTimeEnd : '';
        var isSelected = AppState.ui.atcls === cls.id;

        summary += '<div class="flex fjb fca" style="padding:8px;margin-bottom:4px;border-radius:8px;background:' + (isSelected ? 'rgba(59,130,246,.12)' : 'var(--bg3)') + ';cursor:pointer" '
            + 'onclick="AppState.ui.atcls=\'' + FormatUtils.escape(cls.id) + '\';AppState.ui._attDateSet=true;go(\'attendance\')">'
            + '<div>'
            + '<div class="tw6 tsm" style="' + (isSelected ? 'color:var(--blue2)' : '') + '">' + FormatUtils.escape(cls.name) + (ts ? ' <span class="tm ts">(' + ts + ')</span>' : '') + '</div>'
            + '<div class="ts tm">' + athInCls.length + ' sporcu · ' + filled + '/' + athInCls.length + ' yoklama girildi</div>'
            + '</div>'
            + '<div class="flex gap2 fca">'
            + '<span class="ts" style="color:var(--green)">✅' + present + '</span>'
            + '<span class="ts" style="color:var(--red)">❌' + absent + '</span>'
            + (isSelected ? '<span style="font-size:11px;background:var(--blue2);color:#fff;padding:2px 8px;border-radius:10px">Aktif</span>' : '')
            + '</div></div>';
    });
    summary += '</div>';

    main.insertAdjacentHTML('beforeend', summary);
});

// ═══════════════════════════════════════════════════════════════════
// GELİŞTİRME 19-21: Bildirimler, Mesajlar, Ödeme Tipi Ayrımı
// ═══════════════════════════════════════════════════════════════════

// ── PAYMENT MAPPER: payment_type desteği ──────────────────────────
(function() {
    function extendPaymentMappers() {
        if (!window.DB || !DB.mappers || !DB.mappers.toPayment) return false;

        var _prevToPayment = DB.mappers.toPayment;
        DB.mappers.toPayment = function(r) {
            var base = _prevToPayment(r);
            base.paymentType = r.payment_type || 'aidat';
            return base;
        };

        var _prevFromPayment = DB.mappers.fromPayment;
        DB.mappers.fromPayment = function(p) {
            var base = _prevFromPayment(p);
            base.payment_type = p.paymentType || 'aidat';
            return base;
        };

        console.log('✅ payment_type mapper eklendi');
        return true;
    }

    if (!extendPaymentMappers()) {
        [200, 500, 1000, 2000, 3000].forEach(function(d) {
            setTimeout(function() { extendPaymentMappers(); }, d);
        });
    }
})();

// ── Güvenli Supabase client erişimi ────────────────────────────────
function _getSafeSupabaseClient() {
    var sb = (typeof getSupabase === 'function') ? getSupabase() : (AppState.sb || null);
    if (sb && typeof sb.from === 'function') return sb;
    return null;
}

// ── NOTIFICATIONS PAGE (Admin & Antrenör) ─────────────────────────
window.pgNotificationsPage = function() {
    var isCoach = AppState.currentUser && AppState.currentUser.role === 'coach';
    var senderRole = isCoach ? 'coach' : 'admin';
    var senderName = AppState.currentUser ? AppState.currentUser.name : 'Yönetici';

    // Sporcu listesi — antrenör sadece kendi sınıflarındaki sporcuları görsün
    var athletes = (AppState.data.athletes || []).filter(function(a) { return a.st === 'active'; });
    if (isCoach) {
        var coachRecord = (AppState.data.coaches || []).find(function(c) { return c.id === AppState.currentUser.id; })
            || (AppState.data.coaches || []).find(function(c) { return AppState.currentUser.tc && c.tc === AppState.currentUser.tc; })
            || null;
        var myClassIds = (AppState.data.classes || []).filter(function(c) { return coachRecord && c.coachId === coachRecord.id; }).map(function(c) { return c.id; });
        athletes = athletes.filter(function(a) { return myClassIds.indexOf(a.clsId) > -1; });
    }

    var athleteItems = athletes.map(function(a) {
        return '<label class="ms-item" data-name="' + FormatUtils.escape(((a.fn || '') + ' ' + (a.ln || '')).toLowerCase()) + '">'
            + '<input type="checkbox" class="notif-ath-cb" value="' + FormatUtils.escape(a.id) + '"/>'
            + '<span>' + FormatUtils.escape((a.fn || '') + ' ' + (a.ln || '')) + '</span></label>';
    }).join('');

    var html = '<div class="ph"><div class="stit">📨 Bildirimler</div>'
        + '<div class="ssub">' + (isCoach ? 'Grubunuzdaki sporculara mesaj gönderin' : 'Sporculara mesaj gönderin ve bildirim yönetimi') + '</div></div>';

    // ── Mesaj gönderme formu ──
    html += '<div class="card mb3" style="border-left:4px solid var(--blue2)">'
        + '<div class="tw6 tsm mb3">✉️ Yeni Mesaj Gönder</div>';

    if (athletes.length === 0) {
        html += '<div class="al al-y">⚠️ Gönderilebilecek sporcu bulunamadı.</div>';
    } else {
        html += '<div class="fgr mb2"><label>Alıcı Sporcu(lar) *</label>'
            + '<input id="notif-ath-search" type="text" placeholder="Sporcu ara..." oninput="filterNotifAthletes()" style="margin-bottom:6px"/>'
            + '<div class="flex gap2 mb2">'
            + '<button type="button" class="btn btn-xs bs" onclick="toggleAllNotifAthletes(true)">✅ Tümünü Seç</button>'
            + '<button type="button" class="btn btn-xs bd" onclick="toggleAllNotifAthletes(false)">✕ Temizle</button>'
            + '</div>'
            + '<div id="notif-ath-list" style="max-height:180px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:4px">' + athleteItems + '</div>'
            + '<div id="notif-ath-tags" class="flex fwrap gap1 mt1" style="min-height:0"></div>'
            + '</div>';

        html += '<div class="fgr mb2"><label>Mesaj Başlığı</label>'
            + '<input id="notif-title" type="text" placeholder="Başlık (opsiyonel)"/></div>';

        html += '<div class="fgr mb2"><label>Mesaj İçeriği *</label>'
            + '<textarea id="notif-body" rows="4" placeholder="Mesajınızı yazın..."></textarea></div>';

        html += '<button class="btn bp w100" onclick="sendNotifMessage()">📤 Mesaj Gönder</button>';
    }
    html += '</div>';

    // ── Mesaj geçmişi ──
    html += '<div class="card" id="notif-history-card"><div class="tw6 tsm mb2">📋 Gönderilen Mesajlar</div>'
        + '<div id="notif-history" style="min-height:40px"><div style="text-align:center;padding:20px;color:var(--text2)">⏳ Yükleniyor...</div></div></div>';

    return html;
};

// ── Sporcu filtre/seçim fonksiyonları ─────────────────────────────
window.filterNotifAthletes = function() {
    var q = (document.getElementById('notif-ath-search') || {}).value || '';
    q = q.toLowerCase();
    document.querySelectorAll('#notif-ath-list .ms-item').forEach(function(el) {
        el.style.display = (el.dataset.name || '').indexOf(q) > -1 ? '' : 'none';
    });
};

window.toggleAllNotifAthletes = function(check) {
    document.querySelectorAll('#notif-ath-list .notif-ath-cb').forEach(function(cb) {
        if (check) { if (cb.closest('.ms-item').style.display !== 'none') cb.checked = true; }
        else cb.checked = false;
    });
    _updateNotifTags();
};

function _updateNotifTags() {
    var tags = document.getElementById('notif-ath-tags');
    if (!tags) return;
    var checked = document.querySelectorAll('#notif-ath-list .notif-ath-cb:checked');
    if (checked.length === 0) { tags.innerHTML = ''; return; }
    var html = '';
    checked.forEach(function(cb) {
        var label = cb.closest('.ms-item');
        var name = label ? label.querySelector('span').textContent : '';
        html += '<span class="ath-tag">' + FormatUtils.escape(name) + ' <span class="ath-tag-x" onclick="document.querySelector(\'.notif-ath-cb[value=&quot;' + cb.value + '&quot;]\').checked=false;_updateNotifTags()">✕</span></span>';
    });
    tags.innerHTML = '<span class="ts tm" style="margin-right:4px">' + checked.length + ' seçili:</span>' + html;
}

// ── Mesaj gönder ─────────────────────────────────────────────────
window.sendNotifMessage = async function() {
    var checked = document.querySelectorAll('#notif-ath-list .notif-ath-cb:checked');
    var title = (document.getElementById('notif-title') || {}).value || '';
    var body = (document.getElementById('notif-body') || {}).value || '';

    if (checked.length === 0) { toast('En az bir sporcu seçiniz!', 'e'); return; }
    if (!body.trim()) { toast('Mesaj içeriği yazınız!', 'e'); return; }

    var isCoach = AppState.currentUser && AppState.currentUser.role === 'coach';
    var senderRole = isCoach ? 'coach' : 'admin';
    var senderName = AppState.currentUser ? AppState.currentUser.name : 'Yönetici';
    var senderId = AppState.currentUser ? AppState.currentUser.id : '';

    var sb = _getSafeSupabaseClient();
    if (!sb) { toast('Bağlantı hatası!', 'e'); console.warn('_sendNotif: geçerli Supabase client bulunamadı'); return; }

    var sent = 0;
    var errors = 0;

    for (var i = 0; i < checked.length; i++) {
        var cb = checked[i];
        var ath = (AppState.data.athletes || []).find(function(a) { return a.id === cb.value; });
        var recipientName = ath ? ((ath.fn || '') + ' ' + (ath.ln || '')) : '';

        var msgObj = {
            org_id: AppState.currentOrgId || '',
            branch_id: AppState.currentBranchId || '',
            sender_id: senderId,
            sender_name: senderName,
            sender_role: senderRole,
            recipient_id: cb.value,
            recipient_name: recipientName,
            title: title.trim(),
            body: body.trim(),
            is_read: false
        };

        try {
            var result = await sb.from('messages').insert(msgObj);
            if (result.error) { console.error('Mesaj gönderme hatası:', result.error); errors++; }
            else { sent++; }
        } catch(e) { console.error('Mesaj gönderme exception:', e); errors++; }
    }

    if (sent > 0) {
        toast('✅ ' + sent + ' sporcuya mesaj gönderildi!', 'g');
        // Formu temizle
        var titleEl = document.getElementById('notif-title');
        var bodyEl = document.getElementById('notif-body');
        if (titleEl) titleEl.value = '';
        if (bodyEl) bodyEl.value = '';
        document.querySelectorAll('#notif-ath-list .notif-ath-cb:checked').forEach(function(cb) { cb.checked = false; });
        _updateNotifTags();
        // Geçmişi yenile
        _loadNotifHistory();
    }
    if (errors > 0) { toast('⚠️ ' + errors + ' mesaj gönderilemedi.', 'e'); }
};

// ── Mesaj geçmişi yükle ──────────────────────────────────────────
function _loadNotifHistory() {
    var sb = _getSafeSupabaseClient();
    if (!sb) {
        console.warn('_loadNotifHistory: geçerli Supabase client bulunamadı');
        return;
    }

    var container = document.getElementById('notif-history');
    if (!container) return;

    var isCoach = AppState.currentUser && AppState.currentUser.role === 'coach';
    var senderId = AppState.currentUser ? AppState.currentUser.id : '';

    try {
        var query = sb.from('messages').select('*').order('created_at', { ascending: false }).limit(50);
        if (isCoach) {
            query = query.eq('sender_id', senderId);
        }

        query.then(function(res) {
            if (res.error) {
                console.warn('_loadNotifHistory sorgu hatası:', res.error.message || res.error);
                container.innerHTML = '<div class="al al-r">Mesaj geçmişi yüklenemedi.</div>';
                return;
            }
            var data = res.data || [];
            if (data.length === 0) {
                container.innerHTML = '<div class="empty-state"><div style="font-size:36px;margin-bottom:8px">📭</div><div class="tw6 ts">Henüz gönderilmiş mesaj yok</div></div>';
                return;
            }

            var html = '';
            data.forEach(function(m) {
                var dt = m.created_at ? new Date(m.created_at) : null;
                var dateStr = dt ? dt.toLocaleDateString('tr-TR') + ' ' + dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
                var roleLabel = m.sender_role === 'coach' ? '🏃 Antrenör' : '👤 Yönetici';
                html += '<div style="padding:10px 12px;background:var(--bg3);border-radius:10px;margin-bottom:8px;border:1px solid var(--border)">'
                    + '<div class="flex fjb fca fwrap gap1">'
                    + '<div style="flex:1;min-width:0">'
                    + (m.title ? '<div class="tw6 tsm">' + FormatUtils.escape(m.title) + '</div>' : '')
                    + '<div class="ts" style="word-break:break-word;white-space:pre-wrap;margin-top:2px">' + FormatUtils.escape(m.body) + '</div>'
                    + '</div>'
                    + '<div style="text-align:right;flex-shrink:0">'
                    + '<div class="ts tm">' + FormatUtils.escape(m.recipient_name || '') + '</div>'
                    + '<div style="font-size:11px;color:var(--text3)">' + dateStr + '</div>'
                    + '<div style="font-size:11px;color:var(--text3)">' + roleLabel + '</div>'
                    + '</div></div></div>';
            });
            container.innerHTML = html;
        }).catch(function(err) {
            console.warn('_loadNotifHistory exception:', err);
            if (container) container.innerHTML = '<div class="al al-r">Mesaj geçmişi yüklenemedi.</div>';
        });
    } catch(e) {
        console.warn('_loadNotifHistory exception:', e);
    }
}

// ── NOTIFICATIONS PAGE'İ go() SİSTEMİNE EKLE ─────────────────────
window.registerGoHook('before', function(page) {
    if (page === 'notifications') {
        var main = document.getElementById('main');
        if (!main) return false;
        main.style.opacity = '0';
        setTimeout(function() {
            main.innerHTML = pgNotificationsPage();
            main.style.opacity = '1';
            // Checkbox tıklanınca tag güncelle
            setTimeout(function() {
                document.querySelectorAll('#notif-ath-list .notif-ath-cb').forEach(function(cb) {
                    cb.addEventListener('change', _updateNotifTags);
                });
                _loadNotifHistory();
            }, 50);
        }, 100);

        document.querySelectorAll('.ni').forEach(function(el) {
            el.classList.toggle('on', el.id === 'ni-notifications');
        });
        document.querySelectorAll('.bni-btn').forEach(function(el) {
            el.classList.remove('on');
        });
        if (typeof closeSide === 'function') closeSide();
        AppState.ui.curPage = 'notifications';
        return false; // Prevent default go() handling
    }
});

// ── updateBranchUI: Antrenör panelinde Bildirimler butonunu göster ──
var _origUpdateBranchUI3 = typeof updateBranchUI === 'function' ? updateBranchUI : null;
window.updateBranchUI = function() {
    if (_origUpdateBranchUI3) _origUpdateBranchUI3();
    if (AppState.currentUser && AppState.currentUser.role === 'coach') {
        // Bildirimler butonu antrenör için görünür olsun
        var notifBtn = document.getElementById('ni-notifications');
        if (notifBtn) notifBtn.style.display = '';
        // Eski SMS butonu gizli kalmalı
        var smsBtn = document.getElementById('ni-sms');
        if (smsBtn) smsBtn.style.display = 'none';
    }
};

// ── SPORCU MESAJLAR SEKMESİ ──────────────────────────────────────
window.spMesajlar = function() {
    var a = AppState.currentSporcu;
    if (!a) return '<div class="empty-state"><div style="font-size:44px;margin-bottom:10px">📭</div><div class="tw6 ts">Mesaj bulunmuyor</div></div>';

    return '<div style="text-align:center;padding:40px;color:var(--text2)">⏳ Mesajlar yükleniyor...</div>';
};

function _loadSporcuMessages() {
    var a = AppState.currentSporcu;
    if (!a) return;

    var sb = _getSafeSupabaseClient();
    if (!sb) {
        console.warn('_loadSporcuMessages: geçerli Supabase client bulunamadı');
        _updateMsgBadge(0);
        return;
    }

    var container = document.getElementById('sp-content');
    if (!container) return;

    try {
        sb.from('messages')
            .select('*')
            .eq('recipient_id', a.id)
            .order('created_at', { ascending: false })
            .limit(100)
            .then(function(res) {
                if (res.error) {
                    console.warn('_loadSporcuMessages sorgu hatası:', res.error.message || res.error);
                    container.innerHTML = '<div class="al al-r" style="margin:20px">Mesajlar yüklenemedi.</div>';
                    _updateMsgBadge(0);
                    return;
                }

                var data = res.data || [];

                // Rozet güncelle
                var unread = data.filter(function(m) { return !m.is_read; }).length;
                _updateMsgBadge(unread);

                if (data.length === 0) {
                    container.innerHTML = '<div class="empty-state" style="margin-top:40px"><div style="font-size:56px;margin-bottom:12px">📭</div><div class="tw6" style="font-size:16px;margin-bottom:4px">Mesaj Bulunmuyor</div><div class="ts tm">Yönetici veya antrenörünüzden gelen mesajlar burada görünecektir.</div></div>';
                    return;
                }

                var html = '<div style="max-width:800px;margin:0 auto">';
                html += '<div class="tw6 tsm mb3">📩 Mesajlarım (' + data.length + ')</div>';

                data.forEach(function(m) {
                    var dt = m.created_at ? new Date(m.created_at) : null;
                    var dateStr = dt ? dt.toLocaleDateString('tr-TR') + ' ' + dt.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '';
                    var roleLabel = m.sender_role === 'coach' ? '🏃 Antrenör' : '👤 Yönetici';
                    var isUnread = !m.is_read;
                    var borderColor = isUnread ? 'var(--blue2)' : 'var(--border)';
                    var bgStyle = isUnread ? 'background:rgba(59,130,246,.06);' : '';

                    html += '<div class="card mb2" style="border-left:3px solid ' + borderColor + ';' + bgStyle + 'padding:16px" data-msg-id="' + FormatUtils.escape(m.id) + '">';

                    if (m.title) {
                        html += '<div class="flex fjb fca mb1">'
                            + '<div class="tw6 tsm">' + FormatUtils.escape(m.title) + '</div>'
                            + (isUnread ? '<span class="bg bg-b" style="font-size:10px">Yeni</span>' : '')
                            + '</div>';
                    } else if (isUnread) {
                        html += '<div style="text-align:right;margin-bottom:4px"><span class="bg bg-b" style="font-size:10px">Yeni</span></div>';
                    }

                    html += '<div class="ts" style="word-break:break-word;white-space:pre-wrap;line-height:1.6;color:var(--text);margin-bottom:8px">' + FormatUtils.escape(m.body) + '</div>';
                    html += '<div class="flex fjb fca" style="border-top:1px solid var(--border);padding-top:8px;margin-top:4px">'
                        + '<span style="font-size:11px;color:var(--text3)">' + roleLabel + (m.sender_name ? ' · ' + FormatUtils.escape(m.sender_name) : '') + '</span>'
                        + '<span style="font-size:11px;color:var(--text3)">' + dateStr + '</span>'
                        + '</div>';
                    html += '</div>';
                });
                html += '</div>';
                container.innerHTML = html;

                // Okunmamış mesajları okundu olarak işaretle
                var unreadIds = data.filter(function(m) { return !m.is_read; }).map(function(m) { return m.id; });
                if (unreadIds.length > 0) {
                    sb.from('messages').update({ is_read: true }).in('id', unreadIds).then(function() {
                        // Rozeti güncelle
                        setTimeout(function() { _updateMsgBadge(0); }, 1500);
                    }).catch(function(err) {
                        console.warn('_loadSporcuMessages mark-read hatası:', err);
                    });
                }
            }).catch(function(err) {
                console.warn('_loadSporcuMessages exception:', err);
                _updateMsgBadge(0);
                if (container) container.innerHTML = '<div class="al al-r" style="margin:20px">Mesajlar yüklenemedi.</div>';
            });
    } catch(e) {
        console.warn('_loadSporcuMessages exception:', e);
        _updateMsgBadge(0);
    }
}

function _updateMsgBadge(count) {
    var badge = document.getElementById('sp-msg-badge');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('dn');
    } else {
        badge.classList.add('dn');
    }
}

// ── Sporcu portal: mesajlar sekmesi desteği ──────────────────────
// spTab override — mesajlar sekmesini ekle
var _prevSpTab = window.spTab;
window.spTab = function(tab) {
    if (tab === 'odeme-yap') tab = 'odemeler';

    document.querySelectorAll('.sp-tab').forEach(function(el) {
        var elTab = el.getAttribute('data-tab');
        if (elTab) {
            el.classList.toggle('on', elTab === tab);
            if (elTab === tab) el.setAttribute('aria-selected', 'true');
            else el.setAttribute('aria-selected', 'false');
        }
    });

    var content = document.getElementById('sp-content');
    var pages = {
        'profil': spProfil,
        'yoklama': spYoklama,
        'odemeler': spOdemeler,
        'mesajlar': spMesajlar
    };

    if (tab === 'odemeler' && AppState.currentSporcu) {
        if (content) content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text2)">⏳ Yükleniyor...</div>';
        refreshSporcuPayments().then(function() {
            if (content && pages[tab]) content.innerHTML = pages[tab]();
        });
        return;
    }

    if (tab === 'mesajlar') {
        if (content) content.innerHTML = spMesajlar();
        _loadSporcuMessages();
        return;
    }

    if (content && pages[tab]) content.innerHTML = pages[tab]();
};

// ── Sporcu portal yüklendiğinde mesaj sayısını kontrol et ────────
function _checkUnreadMessages() {
    var a = AppState.currentSporcu;
    if (!a) return;

    var sb = _getSafeSupabaseClient();
    if (!sb) {
        console.warn('_checkUnreadMessages: geçerli Supabase client bulunamadı');
        _updateMsgBadge(0);
        return;
    }

    try {
        sb.from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('recipient_id', a.id)
            .eq('is_read', false)
            .then(function(res) {
                if (res.error) {
                    console.warn('_checkUnreadMessages sorgu hatası:', res.error.message || res.error);
                    _updateMsgBadge(0);
                    return;
                }
                _updateMsgBadge(res.count || 0);
            }).catch(function(err) {
                console.warn('_checkUnreadMessages exception:', err);
                _updateMsgBadge(0);
            });
    } catch(e) {
        console.warn('_checkUnreadMessages exception:', e);
        _updateMsgBadge(0);
    }
}

// Portal açıldığında rozeti kontrol et
// Her tab geçişinde de kontrol et (spTab override zaten yapıldı)
// İlk açılışta kontrol et
setTimeout(function() {
    try { if (AppState.currentSporcu) _checkUnreadMessages(); } catch(e) { console.warn('İlk mesaj kontrolü başarısız:', e); }
}, 1500);
// MutationObserver ile sporcu portal görünür olunca kontrol et
(function() {
    var portal = document.getElementById('sporcu-portal');
    if (portal) {
        var obs = new MutationObserver(function() {
            if (portal.style.display === 'flex') {
                try { setTimeout(_checkUnreadMessages, 500); } catch(e) { console.warn('Portal mesaj kontrolü başarısız:', e); }
                obs.disconnect();
            }
        });
        obs.observe(portal, { attributes: true, attributeFilter: ['style'] });
    }
})();

// ── ÖDEMELER: AYDINLAR / SPOR MALZEMELERİ ALT TABLARI ───────────
var _origSpOdemeler = window.spOdemeler;
window.spOdemeler = function() {
    var a = AppState.currentSporcu;
    if (!a) return '';

    var activeSubTab = AppState.ui.spPaySubTab || 'aidat';

    // Alt tab bar
    var html = '<div class="tab-nav mb3" style="max-width:400px">'
        + '<button class="tab-btn ' + (activeSubTab === 'aidat' ? 'active' : '') + '" onclick="AppState.ui.spPaySubTab=\'aidat\';document.getElementById(\'sp-content\').innerHTML=spOdemeler()">💰 Aidatlar</button>'
        + '<button class="tab-btn ' + (activeSubTab === 'spor_malzemesi' ? 'active' : '') + '" onclick="AppState.ui.spPaySubTab=\'spor_malzemesi\';document.getElementById(\'sp-content\').innerHTML=spOdemeler()">🏋️ Spor Malzemeleri</button>'
        + '</div>';

    // Filtrelenmiş ödeme verileri
    var s = AppState.data.settings || {};
    var hasPayTR = s && s.paytrActive && s.paytrMerchantId;
    var hasBank = s && (s.iban || s.bankName);

    var allPayments = (AppState.data.payments || []).filter(function(p) { return p.aid === a.id; });
    var typePayments = allPayments.filter(function(p) { return (p.paymentType || 'aidat') === activeSubTab; });

    var completed = typePayments.filter(function(p) { return p.st === 'completed'; }).sort(function(x, y) { return new Date(y.dt) - new Date(x.dt); });
    var pending = typePayments.filter(function(p) { return p.notifStatus === 'pending_approval'; }).sort(function(x, y) { return new Date(y.dt) - new Date(x.dt); });
    var pendingPayments = typePayments.filter(function(p) { return p.st !== 'completed' && p.notifStatus !== 'pending_approval'; }).sort(function(x, y) { if (!x.dt && !y.dt) return 0; if (!x.dt) return 1; if (!y.dt) return -1; return x.dt.localeCompare(y.dt); });
    var totalPaid = completed.reduce(function(s, p) { return s + (p.amt || 0); }, 0);
    var totalDebt = pendingPayments.reduce(function(s, p) { return s + (p.amt || 0); }, 0);
    var mIcon = function(m) { return ({ nakit: '💵', kredi_karti: '💳', havale: '🏦', paytr: '🔵' })[m] || '💰'; };
    var mLabel = function(m) { return ({ nakit: 'Nakit', kredi_karti: 'Kredi Kartı', havale: 'Havale/EFT', paytr: 'PayTR Online' })[m] || (m || 'Ödeme'); };

    var tabLabel = activeSubTab === 'aidat' ? 'Aidat' : 'Spor Malzemesi';

    // ── Özet istatistikler ──
    html += '<div class="sp-stats-row mb3"><div class="stat-box"><div class="stat-box-value tg">' + FormatUtils.currency(totalPaid) + '</div><div class="stat-box-label">Ödenen (' + tabLabel + ')</div></div><div class="stat-box"><div class="stat-box-value ' + (totalDebt > 0 ? 'tr2' : 'tg') + '">' + FormatUtils.currency(totalDebt) + '</div><div class="stat-box-label">Borç (' + tabLabel + ')</div></div><div class="stat-box"><div class="stat-box-value ' + (pending.length > 0 ? 'to' : 'tg') + '">' + pending.length + '</div><div class="stat-box-label">Onay Bekleyen</div></div></div>';

    // ── Bekleyen ödemeler ──
    if (pendingPayments.length > 0) {
        var planRows = '';
        pendingPayments.forEach(function(p) {
            var isOverdue = p.st === 'overdue';
            var today = typeof DateUtils !== 'undefined' ? DateUtils.today() : new Date().toISOString().slice(0, 10);
            var isLate = !isOverdue && p.dt && p.dt < today;
            var badge = (isOverdue || isLate)
                ? '<span class="bg bg-r">Gecikmiş</span>'
                : '<span class="bg bg-y">Bekliyor</span>';
            planRows += '<div class="sp-plan-cb-row" onclick="var cb=this.querySelector(\'.sp-plan-cb\');cb.checked=!cb.checked;this.classList.toggle(\'checked\',cb.checked);_spUpdateBulkTotal()">'
                + '<input type="checkbox" class="sp-plan-cb" value="' + FormatUtils.escape(p.id) + '" data-amt="' + (p.amt || 0) + '" onclick="event.stopPropagation();this.parentElement.classList.toggle(\'checked\',this.checked);_spUpdateBulkTotal()"/>'
                + '<div style="flex:1;min-width:0">'
                + '<div class="tw6 ts">' + ((isOverdue || isLate) ? '⚠️ ' : '📅 ') + FormatUtils.escape(p.ds || p.serviceName || tabLabel) + '</div>'
                + '<div class="ts tm mt1">Vade: ' + DateUtils.format(p.dt) + '</div>'
                + '</div>'
                + '<div style="text-align:right;flex-shrink:0">'
                + '<div class="tw6 ts tg">' + FormatUtils.currency(p.amt) + '</div>'
                + badge
                + '</div></div>';
        });

        html += '<div class="card mb3" style="border-left:3px solid var(--red)">';
        html += '<div class="tw6 ts mb2" style="color:var(--red)">📋 Bekleyen ' + tabLabel + ' Ödemelerim (' + pendingPayments.length + ')</div>';

        html += '<div class="sp-debt-bar mb3"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span class="ts tm">Toplam Bekleyen Borç</span><span class="tw6 tr2">' + FormatUtils.currency(totalDebt) + '</span></div><div class="prb"><div style="height:100%;background:var(--red);border-radius:4px;width:100%"></div></div></div>';

        html += '<div class="flex fjb fca gap2 mb2"><button type="button" class="btn btn-xs bs" onclick="selectAllSpPlans()">✅ Tümünü Seç</button><div id="sp-bulk-total" class="sp-bulk-total" style="display:none"><span class="ts tm">Seçilen toplam:</span><span class="tw6 tg" id="sp-bulk-total-val">₺0</span></div></div>';
        html += '<button class="btn bp w100 mb3" id="sp-bulk-pay-btn" style="display:none" onclick="spPayBulk()">💳 Seçilenleri Öde</button>';

        html += '<div class="plan-list" style="gap:8px">' + planRows + '</div>';
        html += '</div>';
    }

    // ── Ödeme formu ──
    html += '<div class="card mb3" id="sp-pay-form" style="display:none">';
    html += '<div class="sp-pay-form-header mb3"><div class="tw6 tsm">💳 Ödeme Yöntemi Seç</div><button class="btn bs btn-sm" onclick="document.getElementById(\'sp-pay-form\').style.display=\'none\'">✕ Kapat</button></div>';
    html += '<div id="sp-plan-info" class="sp-plan-info-box mb3"></div>';
    html += '<div class="pay-choice-grid mb3">';
    if (hasBank) {
        html += '<div class="pay-choice-card" id="pc-havale" onclick="selectPayChoice(\'havale\')"><div class="pay-choice-icon">🏦</div><div class="pay-choice-title">Havale / EFT</div><div class="pay-choice-desc">Banka havalesi veya EFT ile ödeme yapın</div></div>';
    }
    if (hasPayTR) {
        html += '<div class="pay-choice-card" id="pc-paytr" onclick="selectPayChoice(\'paytr\')"><div class="pay-choice-icon">🔵</div><div class="pay-choice-title">Online Kredi Kartı</div><div class="pay-choice-desc">PayTR güvenli altyapısı ile kartla ödeyin</div></div>';
    }
    if (!hasBank && !hasPayTR) {
        html += '<div class="al al-y" style="grid-column:1/-1;border-radius:10px;padding:14px"><div class="tw6 mb1">⚠️ Ödeme yöntemi bulunamadı</div><p class="ts tm">Yönetici henüz ödeme yöntemlerini yapılandırmamış. Lütfen akademi yönetimine başvurun.</p></div>';
    }
    html += '</div>';
    html += '<div id="pay-method-detail" class="mb2"></div>';
    html += '<div class="fgr mb2 dn" id="sp-desc-wrapper"><label>Açıklama <span class="tm ts">(opsiyonel)</span></label><input id="sp-desc" placeholder="Ödeme notu ekleyin..."/></div>';
    html += '<button class="btn bp w100 mt2" id="pay-submit-btn" style="display:none" onclick="submitSpPayment()">Bildirim Gönder</button>';
    html += '</div>';

    // ── Onay bekleyen bildirimler ──
    if (pending.length > 0) {
        html += '<div class="card mb3" style="border-left:3px solid var(--yellow)"><div class="tw6 ts mb2" style="color:var(--yellow)">⏳ Onay Bekleyen Bildirimlerim</div>';
        pending.forEach(function(p) {
            html += '<div class="payment-card" style="border-color:rgba(234,179,8,.35);gap:10px"><div style="font-size:24px;flex-shrink:0">' + mIcon(p.payMethod) + '</div><div class="payment-info"><div class="payment-amount" style="font-size:16px;color:var(--yellow)">' + FormatUtils.currency(p.amt) + '</div><div class="payment-date">' + mLabel(p.payMethod) + ' • ' + DateUtils.format(p.dt) + '</div><div class="ts tm mt1">' + FormatUtils.escape(p.ds || p.serviceName || tabLabel) + '</div></div><span class="bg bg-y" style="flex-shrink:0;white-space:nowrap">Bekliyor</span></div>';
        });
        html += '</div>';
    }

    // ── Ödeme geçmişi ──
    html += '<div class="card"><div class="tw6 tsm mb3">✅ ' + tabLabel + ' Ödeme Geçmişim</div>';
    if (completed.length === 0) {
        html += '<div class="empty-state"><div style="font-size:44px;margin-bottom:10px">📭</div><div class="tw6 ts">Henüz onaylanmış ' + tabLabel.toLowerCase() + ' ödemesi yok</div></div>';
    } else {
        completed.forEach(function(p) {
            html += '<div class="payment-card" style="gap:12px"><div style="font-size:28px;flex-shrink:0">' + mIcon(p.payMethod) + '</div><div class="payment-info" style="flex:1;min-width:0"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px"><span class="payment-amount tg">' + FormatUtils.currency(p.amt) + '</span></div><div class="payment-date">' + DateUtils.format(p.dt) + ' • ' + FormatUtils.escape(p.serviceName || p.ds || tabLabel) + '</div><div class="ts tm" style="margin-top:2px">' + mLabel(p.payMethod) + '</div></div><div class="flex fc gap2" style="align-items:flex-end;flex-shrink:0"><span class="bg bg-g">Ödendi ✓</span><button class="btn btn-xs bpur" onclick="generateReceipt(\'' + p.id + '\')">🧾 Makbuz</button></div></div>';
        });
    }
    html += '</div>';

    // Ödeme yoksa tipleri göster
    if (typePayments.length === 0 && pendingPayments.length === 0 && completed.length === 0 && pending.length === 0) {
        html = html.replace('</div><!-- stats end -->', '');
        // İstatistiklerden sonra boş durum mesajı zaten gösterildi
    }

    return html;
};

// ── ADMIN ÖDEME PLANI: TİP SEÇİMİ EKLEMESİ ─────────────────────
// pgPayments sayfasında ödeme planı oluşturma formuna tip alanı ekle
window.registerGoHook('after', function(page) {
    if (page !== 'payments') return;
    var main = document.getElementById('main');
    if (!main) return;

    // Açıklama inputunun altına ödeme tipi seçimi ekle
    var descInput = main.querySelector('#plan-desc');
    if (descInput && !main.querySelector('#plan-type')) {
        var typeDiv = document.createElement('div');
        typeDiv.className = 'fgr mb2';
        typeDiv.innerHTML = '<label>Ödeme Tipi</label>'
            + '<select id="plan-type" style="padding:10px 12px">'
            + '<option value="aidat">💰 Aidat</option>'
            + '<option value="spor_malzemesi">🏋️ Spor Malzemesi</option>'
            + '</select>';
        descInput.parentElement.parentElement.insertBefore(typeDiv, descInput.parentElement.nextSibling);
    }
});

// ── createPaymentPlan override: paymentType dahil ────────────────
var _origCreatePaymentPlan = window.createPaymentPlan;
window.createPaymentPlan = async function() {
    var selectedIds = _getSelectedAthleteIds();
    var amt = parseFloat((document.getElementById('plan-amt') || {}).value);
    var month = (document.getElementById('plan-month') || {}).value;
    var desc = ((document.getElementById('plan-desc') || {}).value || '').trim();
    var paymentType = (document.getElementById('plan-type') || {}).value || 'aidat';

    if (selectedIds.length === 0) { toast('En az bir sporcu seçiniz!', 'e'); return; }
    if (!amt || amt <= 0) { toast('Tutar giriniz!', 'e'); return; }
    if (!month) { toast('Ay seçiniz!', 'e'); return; }

    var dt = month + '-01';
    var months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    var parts = month.split('-');
    var y = parts[0], m = parts[1];
    var typeLabel = paymentType === 'spor_malzemesi' ? 'Spor Malzemesi' : 'Aidatı';
    var autoDesc = desc || (months[parseInt(m)-1] + ' ' + y + ' ' + typeLabel);
    var created = 0, skipped = 0;

    for (var i = 0; i < selectedIds.length; i++) {
        var aid = selectedIds[i];
        var ath = (AppState.data.athletes || []).find(function(a) { return a.id === aid; });
        if (!ath) continue;
        var exists = (AppState.data.payments || []).find(function(p) { return p.source === 'plan' && p.aid === aid && p.dt === dt && (p.paymentType || 'aidat') === paymentType; });
        if (exists) { skipped++; continue; }
        var obj = {
            id: generateId(), aid: aid, an: (ath.fn || '') + ' ' + (ath.ln || ''),
            amt: amt, dt: dt, ty: 'income', st: 'pending',
            ds: autoDesc, serviceName: autoDesc,
            source: 'plan', notifStatus: '', payMethod: '',
            paymentType: paymentType
        };
        var result = await DB.upsert('payments', DB.mappers.fromPayment(obj));
        if (result) {
            AppState.data.payments.push(obj);
            created++;
        }
    }
    var msg = '✅ ' + created + ' sporcu için ' + autoDesc + ' planı oluşturuldu!';
    if (skipped > 0) msg += ' (' + skipped + ' sporcu zaten mevcut, atlandı)';
    toast(msg, 'g');
    go('payments');
};

// ── showBulkPlanModal override: paymentType dahil ────────────────
var _origShowBulkPlanModal = window.showBulkPlanModal;
window.showBulkPlanModal = function() {
    var months = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    var now = new Date();
    var bulkAthCheckboxes = _buildAthleteCheckboxes('bulk-ath-cb', false);
    modal('📆 Toplu Ödeme Planı Oluştur', '<div class="al al-b mb3" style="font-size:13px">'
        + 'Seçili sporcular için başlangıç ayından itibaren belirtilen ay sayısı kadar plan oluşturur.'
        + '</div>'
        + '<div class="fgr mb2">'
        + '<label>Sporcu(lar) *</label>'
        + '<input id="bulk-ath-search" type="text" placeholder="Sporcu ara..." oninput="filterBulkAthletes()" style="margin-bottom:6px"/>'
        + '<div class="flex gap2 mb2">'
        + '<button type="button" class="btn btn-xs bs" onclick="toggleAllBulkAthletes(true)">✅ Tümünü Seç</button>'
        + '<button type="button" class="btn btn-xs bd" onclick="toggleAllBulkAthletes(false)">✕ Temizle</button>'
        + '</div>'
        + '<div id="bulk-ath-list" style="max-height:150px;overflow-y:auto;border:1px solid var(--border);border-radius:8px;padding:4px">' + bulkAthCheckboxes + '</div>'
        + '</div>'
        + '<div class="g21 mb2">'
        + '<div class="fgr"><label>Başlangıç Ayı *</label><input id="bulk-start" type="month" value="' + now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '"/></div>'
        + '<div class="fgr"><label>Ay Sayısı *</label><input id="bulk-count" type="number" min="1" max="24" value="12"/></div>'
        + '</div>'
        + '<div class="g21 mb2">'
        + '<div class="fgr"><label>Aylık Tutar (₺) *</label><input id="bulk-amt" type="number" placeholder="Tutar giriniz"/></div>'
        + '<div class="fgr"><label>Ödeme Tipi</label><select id="bulk-type" style="padding:10px 12px"><option value="aidat">💰 Aidat</option><option value="spor_malzemesi">🏋️ Spor Malzemesi</option></select></div>'
        + '</div>'
    , [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: '✅ Planları Oluştur', cls: 'bp', fn: async function() {
            var selectedIds = Array.from(document.querySelectorAll('#bulk-ath-list .bulk-ath-cb:checked')).map(function(cb) { return cb.value; });
            var startMonth = (document.getElementById('bulk-start') || {}).value;
            var count = parseInt((document.getElementById('bulk-count') || {}).value) || 0;
            var amt = parseFloat((document.getElementById('bulk-amt') || {}).value) || 0;
            var paymentType = (document.getElementById('bulk-type') || {}).value || 'aidat';
            if (selectedIds.length === 0 || !startMonth || count < 1 || amt <= 0) { toast('Tüm alanları doldurun!', 'e'); return; }
            var created = 0;
            var parts = startMonth.split('-').map(Number);
            var sy = parts[0], sm = parts[1];
            var typeLabel = paymentType === 'spor_malzemesi' ? 'Spor Malzemesi' : 'Aidatı';
            for (var j = 0; j < selectedIds.length; j++) {
                var aid = selectedIds[j];
                var ath = (AppState.data.athletes || []).find(function(a) { return a.id === aid; });
                if (!ath) continue;
                for (var i = 0; i < count; i++) {
                    var d = new Date(sy, sm - 1 + i, 1);
                    var yy = d.getFullYear(), mm = d.getMonth();
                    var dt = yy + '-' + String(mm+1).padStart(2,'0') + '-01';
                    var exists = (AppState.data.payments || []).find(function(p) { return p.source === 'plan' && p.aid === aid && p.dt === dt && (p.paymentType || 'aidat') === paymentType; });
                    if (exists) continue;
                    var autoDesc = months[mm] + ' ' + yy + ' ' + typeLabel;
                    var obj = {
                        id: generateId(), aid: aid, an: (ath.fn || '') + ' ' + (ath.ln || ''),
                        amt: amt, dt: dt, ty: 'income', st: 'pending',
                        ds: autoDesc, serviceName: autoDesc,
                        source: 'plan', notifStatus: '', payMethod: '',
                        paymentType: paymentType
                    };
                    await DB.upsert('payments', DB.mappers.fromPayment(obj));
                    AppState.data.payments.push(obj);
                    created++;
                }
            }
            toast('✅ ' + selectedIds.length + ' sporcu için ' + created + ' plan oluşturuldu!', 'g');
            closeModal();
            go('payments');
        }}
    ]);
};

// ═══════════════════════════════════════════════════════════════════
// GELİŞTİRME 22-27: ENVANTER YÖNETİM SİSTEMİ
// ═══════════════════════════════════════════════════════════════════

// ── AppState: Envanter verisi ────────────────────────────────────
if (!AppState.data.inventoryItems) AppState.data.inventoryItems = [];
if (!AppState.data.inventoryMovements) AppState.data.inventoryMovements = [];

// ── DB Mappers: inventory_items ──────────────────────────────────
if (!DB.mappers.toInventoryItem) {
    DB.mappers.toInventoryItem = function(r) {
        return {
            id: r.id,
            name: r.name || '',
            category: r.category || '',
            sku: r.sku || '',
            unit: r.unit || 'adet',
            unitPrice: r.unit_price || 0,
            stockQty: r.stock_qty || 0,
            criticalStock: r.critical_stock || 5,
            status: r.status || 'active',
            orgId: r.org_id || '',
            branchId: r.branch_id || '',
            createdAt: r.created_at || ''
        };
    };
    DB.mappers.fromInventoryItem = function(item) {
        var out = {};
        if (item.id !== undefined) out.id = item.id;
        if (item.name !== undefined) out.name = item.name;
        if (item.category !== undefined) out.category = item.category;
        if (item.sku !== undefined) out.sku = item.sku;
        if (item.unit !== undefined) out.unit = item.unit;
        if (item.unitPrice !== undefined) out.unit_price = item.unitPrice;
        if (item.stockQty !== undefined) out.stock_qty = item.stockQty;
        if (item.criticalStock !== undefined) out.critical_stock = item.criticalStock;
        if (item.status !== undefined) out.status = item.status;
        out.org_id = item.orgId || AppState.currentOrgId || '';
        out.branch_id = item.branchId || AppState.currentBranchId || '';
        return out;
    };
}

// ── DB Mappers: inventory_movements ──────────────────────────────
if (!DB.mappers.toInventoryMovement) {
    DB.mappers.toInventoryMovement = function(r) {
        return {
            id: r.id,
            itemId: r.item_id || '',
            itemName: r.item_name || '',
            movementType: r.movement_type || '',
            quantityDelta: r.quantity_delta || 0,
            note: r.note || '',
            relatedPaymentId: r.related_payment_id || '',
            athleteId: r.athlete_id || '',
            athleteName: r.athlete_name || '',
            createdAt: r.created_at || '',
            orgId: r.org_id || '',
            branchId: r.branch_id || ''
        };
    };
    DB.mappers.fromInventoryMovement = function(m) {
        var out = {};
        if (m.id !== undefined) out.id = m.id;
        if (m.itemId !== undefined) out.item_id = m.itemId;
        if (m.itemName !== undefined) out.item_name = m.itemName;
        if (m.movementType !== undefined) out.movement_type = m.movementType;
        if (m.quantityDelta !== undefined) out.quantity_delta = m.quantityDelta;
        if (m.note !== undefined) out.note = m.note;
        if (m.relatedPaymentId !== undefined) out.related_payment_id = m.relatedPaymentId;
        if (m.athleteId !== undefined) out.athlete_id = m.athleteId;
        if (m.athleteName !== undefined) out.athlete_name = m.athleteName;
        out.org_id = m.orgId || AppState.currentOrgId || '';
        out.branch_id = m.branchId || AppState.currentBranchId || '';
        return out;
    };
}

// ── Payment Mapper extension: inventory fields ───────────────────
(function() {
    function extendPaymentMappersForInventory() {
        if (!window.DB || !DB.mappers || !DB.mappers.toPayment) return false;
        var _prevToPaymentInv = DB.mappers.toPayment;
        DB.mappers.toPayment = function(r) {
            var base = _prevToPaymentInv(r);
            base.inventoryItemId = r.inventory_item_id || '';
            base.inventoryItemName = r.inventory_item_name || '';
            base.inventoryQty = r.inventory_qty || 0;
            base.inventoryUnitPrice = r.inventory_unit_price || 0;
            return base;
        };
        var _prevFromPaymentInv = DB.mappers.fromPayment;
        DB.mappers.fromPayment = function(p) {
            var base = _prevFromPaymentInv(p);
            if (p.inventoryItemId !== undefined) base.inventory_item_id = p.inventoryItemId;
            if (p.inventoryItemName !== undefined) base.inventory_item_name = p.inventoryItemName;
            if (p.inventoryQty !== undefined) base.inventory_qty = p.inventoryQty;
            if (p.inventoryUnitPrice !== undefined) base.inventory_unit_price = p.inventoryUnitPrice;
            return base;
        };
        return true;
    }
    if (!extendPaymentMappersForInventory()) {
        [200, 500, 1000, 2000].forEach(function(d) {
            setTimeout(function() { extendPaymentMappersForInventory(); }, d);
        });
    }
})();

// ── Envanter verisi yükleme ──────────────────────────────────────
window.loadInventoryData = async function() {
    try {
        var sb = typeof getSupabase === 'function' ? getSupabase() : AppState.sb;
        if (!sb) return;
        var filters = {};
        if (AppState.currentOrgId) filters.org_id = AppState.currentOrgId;
        if (AppState.currentBranchId) filters.branch_id = AppState.currentBranchId;

        var q1 = sb.from('inventory_items').select('*');
        if (filters.org_id) q1 = q1.eq('org_id', filters.org_id);
        if (filters.branch_id) q1 = q1.eq('branch_id', filters.branch_id);
        var res1 = await q1;
        if (res1.data) {
            AppState.data.inventoryItems = res1.data.map(DB.mappers.toInventoryItem);
        }

        var q2 = sb.from('inventory_movements').select('*').order('created_at', { ascending: false }).limit(500);
        if (filters.org_id) q2 = q2.eq('org_id', filters.org_id);
        if (filters.branch_id) q2 = q2.eq('branch_id', filters.branch_id);
        var res2 = await q2;
        if (res2.data) {
            AppState.data.inventoryMovements = res2.data.map(DB.mappers.toInventoryMovement);
        }
    } catch (e) {
        console.warn('Envanter verisi yüklenemedi:', e);
    }
};

// ── Envanter sayfası: go('inventory') hook ───────────────────────
window.registerGoHook('before', function(page) {
    if (page === 'inventory') {
        // Coach erişimi engelle
        if (AppState.currentUser && AppState.currentUser.role === 'coach') {
            toast('Bu sayfaya erişim yetkiniz yok.', 'e');
            return false;
        }
        var main = document.getElementById('main');
        if (!main) return false;
        main.style.opacity = '0';
        setTimeout(function() {
            main.innerHTML = pgInventory();
            main.style.opacity = '1';
        }, 100);

        document.querySelectorAll('.ni').forEach(function(el) {
            el.classList.toggle('on', el.id === 'ni-inventory');
        });
        document.querySelectorAll('.bni-btn').forEach(function(el) {
            el.classList.remove('on');
        });
        if (typeof closeSide === 'function') closeSide();
        AppState.ui.curPage = 'inventory';

        // Envanter verisini yükle
        loadInventoryData().then(function() {
            var main2 = document.getElementById('main');
            if (main2 && AppState.ui.curPage === 'inventory') {
                main2.innerHTML = pgInventory();
            }
        });

        return false;
    }
});

// ── Envanter sayfası render ──────────────────────────────────────
window.pgInventory = function() {
    var items = AppState.data.inventoryItems || [];
    var activeItems = items.filter(function(i) { return i.status !== 'deleted'; });
    var criticalItems = activeItems.filter(function(i) { return i.stockQty <= i.criticalStock && i.status === 'active'; });

    // İstatistik kartları
    var totalProducts = activeItems.length;
    var totalStock = activeItems.reduce(function(s, i) { return s + i.stockQty; }, 0);
    var totalValue = activeItems.reduce(function(s, i) { return s + (i.stockQty * i.unitPrice); }, 0);

    var html = '<div class="ph"><div class="stit">📦 Envanter Yönetimi</div><div class="ssub">Ürün stok takibi ve yönetimi</div></div>';

    // Stat cards
    html += '<div class="g3 mb3">'
        + '<div class="card kasa-card" style="border-left:4px solid var(--blue)"><div class="kasa-card-icon">📦</div><div class="kasa-card-val tb">' + totalProducts + '</div><div class="kasa-card-lbl">Toplam Ürün</div></div>'
        + '<div class="card kasa-card" style="border-left:4px solid var(--green)"><div class="kasa-card-icon">📊</div><div class="kasa-card-val tg">' + totalStock + '</div><div class="kasa-card-lbl">Toplam Stok</div></div>'
        + '<div class="card kasa-card" style="border-left:4px solid var(--purple)"><div class="kasa-card-icon">💰</div><div class="kasa-card-val tpur">' + FormatUtils.currency(totalValue) + '</div><div class="kasa-card-lbl">Stok Değeri</div></div>'
        + '</div>';

    // Kritik stok uyarısı
    if (criticalItems.length > 0) {
        html += '<div class="al al-y mb3" style="border-radius:12px;padding:14px"><div class="flex fca gap2"><span style="font-size:20px">⚠️</span><div><div class="tw6 tsm">Kritik Stok Uyarısı</div><div class="ts tm mt1">' + criticalItems.length + ' ürün kritik stok seviyesinin altında: '
            + criticalItems.map(function(i) { return '<strong>' + FormatUtils.escape(i.name) + '</strong> (' + i.stockQty + ' ' + FormatUtils.escape(i.unit) + ')'; }).join(', ')
            + '</div></div></div></div>';
    }

    // Butonlar
    html += '<div class="flex fjb fca mb3 fwrap gap2">'
        + '<button class="btn bp" onclick="showAddInventoryModal()">+ Yeni Ürün Ekle</button>'
        + '<button class="btn bs" onclick="showInventoryMovements()">📋 Stok Hareketleri</button>'
        + '</div>';

    // Ürün tablosu
    if (activeItems.length === 0) {
        html += '<div class="card"><div class="empty-state" style="padding:48px;text-align:center"><div style="font-size:56px;margin-bottom:14px">📦</div><div class="tw6 tsm">Henüz ürün eklenmemiş</div><div class="ts tm mt2">Yeni ürün eklemek için yukarıdaki butonu kullanın.</div></div></div>';
    } else {
        html += '<div class="card inv-table-wrap"><div class="tw" style="overflow-x:auto"><table class="inv-table"><thead><tr>'
            + '<th>Ürün</th><th>Kategori</th><th>SKU</th><th>Birim</th><th>Birim Fiyat</th><th>Stok</th><th>Kritik</th><th>Durum</th><th>İşlem</th>'
            + '</tr></thead><tbody>';

        activeItems.forEach(function(item) {
            var isCritical = item.stockQty <= item.criticalStock;
            var stockClass = isCritical ? 'inv-stock-critical' : 'inv-stock-ok';
            var statusBadge = item.status === 'active'
                ? '<span class="bg bg-g">Aktif</span>'
                : '<span class="bg bg-y">Pasif</span>';

            html += '<tr class="' + (isCritical ? 'inv-row-critical' : '') + '">'
                + '<td><div class="tw6">' + FormatUtils.escape(item.name) + '</div></td>'
                + '<td>' + FormatUtils.escape(item.category || '-') + '</td>'
                + '<td class="ts tm">' + FormatUtils.escape(item.sku || '-') + '</td>'
                + '<td>' + FormatUtils.escape(item.unit) + '</td>'
                + '<td class="tw6">' + FormatUtils.currency(item.unitPrice) + '</td>'
                + '<td><span class="' + stockClass + '">' + item.stockQty + '</span></td>'
                + '<td class="ts tm">' + item.criticalStock + '</td>'
                + '<td>' + statusBadge + '</td>'
                + '<td><div class="flex gap1 fwrap">'
                + '<button class="btn btn-xs bp" onclick="showStockAddModal(\'' + FormatUtils.escape(item.id) + '\')">+ Stok</button>'
                + '<button class="btn btn-xs bs" onclick="showEditInventoryModal(\'' + FormatUtils.escape(item.id) + '\')">✏️</button>'
                + '<button class="btn btn-xs bd" onclick="deleteInventoryItem(\'' + FormatUtils.escape(item.id) + '\')">🗑</button>'
                + '</div></td>'
                + '</tr>';
        });

        html += '</tbody></table></div></div>';
    }

    return html;
};

// ── Ürün ekleme modalı ───────────────────────────────────────────
window.showAddInventoryModal = function() {
    modal('📦 Yeni Ürün Ekle',
        '<div class="g21 mb2">'
        + '<div class="fgr"><label>Ürün Adı *</label><input id="inv-name" type="text" placeholder="Örn: Forma"/></div>'
        + '<div class="fgr"><label>Kategori</label><input id="inv-category" type="text" placeholder="Örn: Giyim"/></div>'
        + '</div>'
        + '<div class="g21 mb2">'
        + '<div class="fgr"><label>SKU</label><input id="inv-sku" type="text" placeholder="Örn: FRM-001"/></div>'
        + '<div class="fgr"><label>Birim</label><select id="inv-unit" style="padding:10px 12px">'
        + '<option value="adet">Adet</option><option value="çift">Çift</option><option value="paket">Paket</option><option value="kg">Kg</option><option value="metre">Metre</option>'
        + '</select></div>'
        + '</div>'
        + '<div class="g21 mb2">'
        + '<div class="fgr"><label>Birim Fiyat (₺) *</label><input id="inv-price" type="number" min="0" step="0.01" placeholder="0.00"/></div>'
        + '<div class="fgr"><label>Başlangıç Stok *</label><input id="inv-stock" type="number" min="0" value="0"/></div>'
        + '</div>'
        + '<div class="fgr mb2"><label>Kritik Stok Seviyesi</label><input id="inv-critical" type="number" min="0" value="5"/></div>'
    , [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: '✅ Kaydet', cls: 'bp', fn: async function() {
            var name = (document.getElementById('inv-name') || {}).value || '';
            var price = parseFloat((document.getElementById('inv-price') || {}).value) || 0;
            var stock = parseInt((document.getElementById('inv-stock') || {}).value) || 0;
            if (!name.trim()) { toast('Ürün adı gerekli!', 'e'); return; }
            if (price <= 0) { toast('Birim fiyat gerekli!', 'e'); return; }

            var item = {
                id: generateId(),
                name: name.trim(),
                category: ((document.getElementById('inv-category') || {}).value || '').trim(),
                sku: ((document.getElementById('inv-sku') || {}).value || '').trim(),
                unit: (document.getElementById('inv-unit') || {}).value || 'adet',
                unitPrice: price,
                stockQty: stock,
                criticalStock: parseInt((document.getElementById('inv-critical') || {}).value) || 5,
                status: 'active',
                orgId: AppState.currentOrgId || '',
                branchId: AppState.currentBranchId || ''
            };

            var result = await DB.upsert('inventory_items', DB.mappers.fromInventoryItem(item));
            if (result) {
                AppState.data.inventoryItems.push(item);
                // Stok girişi hareketi
                if (stock > 0) {
                    var mov = {
                        id: generateId(),
                        itemId: item.id,
                        itemName: item.name,
                        movementType: 'stock_in',
                        quantityDelta: stock,
                        note: 'Başlangıç stoğu',
                        orgId: AppState.currentOrgId || '',
                        branchId: AppState.currentBranchId || ''
                    };
                    await DB.upsert('inventory_movements', DB.mappers.fromInventoryMovement(mov));
                    AppState.data.inventoryMovements.unshift(mov);
                }
                toast('✅ Ürün eklendi!', 'g');
                closeModal();
                go('inventory');
            }
        }}
    ]);
};

// ── Ürün düzenleme modalı ────────────────────────────────────────
window.showEditInventoryModal = function(itemId) {
    var item = (AppState.data.inventoryItems || []).find(function(i) { return i.id === itemId; });
    if (!item) { toast('Ürün bulunamadı!', 'e'); return; }

    modal('✏️ Ürün Düzenle',
        '<div class="g21 mb2">'
        + '<div class="fgr"><label>Ürün Adı *</label><input id="inv-name" type="text" value="' + FormatUtils.escape(item.name) + '"/></div>'
        + '<div class="fgr"><label>Kategori</label><input id="inv-category" type="text" value="' + FormatUtils.escape(item.category) + '"/></div>'
        + '</div>'
        + '<div class="g21 mb2">'
        + '<div class="fgr"><label>SKU</label><input id="inv-sku" type="text" value="' + FormatUtils.escape(item.sku) + '"/></div>'
        + '<div class="fgr"><label>Birim</label><select id="inv-unit" style="padding:10px 12px">'
        + '<option value="adet"' + (item.unit === 'adet' ? ' selected' : '') + '>Adet</option>'
        + '<option value="çift"' + (item.unit === 'çift' ? ' selected' : '') + '>Çift</option>'
        + '<option value="paket"' + (item.unit === 'paket' ? ' selected' : '') + '>Paket</option>'
        + '<option value="kg"' + (item.unit === 'kg' ? ' selected' : '') + '>Kg</option>'
        + '<option value="metre"' + (item.unit === 'metre' ? ' selected' : '') + '>Metre</option>'
        + '</select></div>'
        + '</div>'
        + '<div class="g21 mb2">'
        + '<div class="fgr"><label>Birim Fiyat (₺) *</label><input id="inv-price" type="number" min="0" step="0.01" value="' + item.unitPrice + '"/></div>'
        + '<div class="fgr"><label>Kritik Stok Seviyesi</label><input id="inv-critical" type="number" min="0" value="' + item.criticalStock + '"/></div>'
        + '</div>'
        + '<div class="fgr mb2"><label>Durum</label><select id="inv-status" style="padding:10px 12px">'
        + '<option value="active"' + (item.status === 'active' ? ' selected' : '') + '>Aktif</option>'
        + '<option value="passive"' + (item.status === 'passive' ? ' selected' : '') + '>Pasif</option>'
        + '</select></div>'
    , [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: '💾 Güncelle', cls: 'bp', fn: async function() {
            var name = (document.getElementById('inv-name') || {}).value || '';
            var price = parseFloat((document.getElementById('inv-price') || {}).value) || 0;
            if (!name.trim()) { toast('Ürün adı gerekli!', 'e'); return; }
            if (price <= 0) { toast('Birim fiyat gerekli!', 'e'); return; }

            item.name = name.trim();
            item.category = ((document.getElementById('inv-category') || {}).value || '').trim();
            item.sku = ((document.getElementById('inv-sku') || {}).value || '').trim();
            item.unit = (document.getElementById('inv-unit') || {}).value || 'adet';
            item.unitPrice = price;
            item.criticalStock = parseInt((document.getElementById('inv-critical') || {}).value) || 5;
            item.status = (document.getElementById('inv-status') || {}).value || 'active';

            var result = await DB.upsert('inventory_items', DB.mappers.fromInventoryItem(item));
            if (result) {
                toast('✅ Ürün güncellendi!', 'g');
                closeModal();
                go('inventory');
            }
        }}
    ]);
};

// ── Stok artırma modalı ──────────────────────────────────────────
window.showStockAddModal = function(itemId) {
    var item = (AppState.data.inventoryItems || []).find(function(i) { return i.id === itemId; });
    if (!item) { toast('Ürün bulunamadı!', 'e'); return; }

    modal('📦 Stok Girişi — ' + FormatUtils.escape(item.name),
        '<div class="al al-b mb3" style="border-radius:10px;padding:12px"><div class="ts">Mevcut stok: <strong>' + item.stockQty + ' ' + FormatUtils.escape(item.unit) + '</strong></div></div>'
        + '<div class="fgr mb2"><label>Eklenecek Miktar *</label><input id="stock-add-qty" type="number" min="1" value="1"/></div>'
        + '<div class="fgr mb2"><label>Not</label><input id="stock-add-note" type="text" placeholder="Tedarikçiden alındı vb."/></div>'
    , [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: '+ Stok Ekle', cls: 'bp', fn: async function() {
            var qty = parseInt((document.getElementById('stock-add-qty') || {}).value) || 0;
            if (qty <= 0) { toast('Geçerli bir miktar girin!', 'e'); return; }
            var note = ((document.getElementById('stock-add-note') || {}).value || '').trim();

            item.stockQty += qty;
            await DB.upsert('inventory_items', DB.mappers.fromInventoryItem(item));

            var mov = {
                id: generateId(),
                itemId: item.id,
                itemName: item.name,
                movementType: 'stock_in',
                quantityDelta: qty,
                note: note || 'Manuel stok girişi',
                orgId: AppState.currentOrgId || '',
                branchId: AppState.currentBranchId || ''
            };
            await DB.upsert('inventory_movements', DB.mappers.fromInventoryMovement(mov));
            AppState.data.inventoryMovements.unshift(mov);

            toast('✅ ' + qty + ' ' + item.unit + ' stok eklendi. Yeni stok: ' + item.stockQty, 'g');
            closeModal();
            go('inventory');
        }}
    ]);
};

// ── Ürün silme ───────────────────────────────────────────────────
window.deleteInventoryItem = function(itemId) {
    var item = (AppState.data.inventoryItems || []).find(function(i) { return i.id === itemId; });
    if (!item) return;

    modal('🗑 Ürün Sil', '<div class="al al-r mb3" style="border-radius:10px;padding:14px"><div class="tw6 mb1">⚠️ Dikkat</div><p class="ts">"<strong>' + FormatUtils.escape(item.name) + '</strong>" ürünü silinecek. Bu işlem geri alınamaz.</p></div>', [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: '🗑 Sil', cls: 'bd', fn: async function() {
            item.status = 'deleted';
            await DB.upsert('inventory_items', DB.mappers.fromInventoryItem(item));
            toast('Ürün silindi.', 'g');
            closeModal();
            go('inventory');
        }}
    ]);
};

// ── Stok hareketleri görüntüleme ─────────────────────────────────
window.showInventoryMovements = function() {
    var movements = AppState.data.inventoryMovements || [];
    var rows = '';
    if (movements.length === 0) {
        rows = '<div class="empty-state" style="padding:32px;text-align:center"><div style="font-size:44px;margin-bottom:10px">📋</div><div class="tw6 ts">Henüz stok hareketi yok</div></div>';
    } else {
        rows = '<div class="tw" style="overflow-x:auto;max-height:400px;overflow-y:auto"><table class="inv-table"><thead><tr><th>Tarih</th><th>Ürün</th><th>Tür</th><th>Miktar</th><th>Not</th><th>Sporcu</th></tr></thead><tbody>';
        movements.slice(0, 100).forEach(function(m) {
            var typeLabel = m.movementType === 'stock_in' ? '<span class="bg bg-g">Giriş</span>'
                : m.movementType === 'sale' ? '<span class="bg bg-b">Satış</span>'
                : '<span class="bg bg-y">' + FormatUtils.escape(m.movementType) + '</span>';
            var qtyClass = m.quantityDelta > 0 ? 'tg' : 'tr2';
            var qtySign = m.quantityDelta > 0 ? '+' : '';
            var dateStr = m.createdAt ? DateUtils.format(m.createdAt.substring(0, 10)) : '-';
            rows += '<tr>'
                + '<td class="ts">' + dateStr + '</td>'
                + '<td class="tw6">' + FormatUtils.escape(m.itemName || '-') + '</td>'
                + '<td>' + typeLabel + '</td>'
                + '<td class="tw6 ' + qtyClass + '">' + qtySign + m.quantityDelta + '</td>'
                + '<td class="ts tm">' + FormatUtils.escape(m.note || '-') + '</td>'
                + '<td class="ts">' + FormatUtils.escape(m.athleteName || '-') + '</td>'
                + '</tr>';
        });
        rows += '</tbody></table></div>';
    }

    modal('📋 Stok Hareketleri', rows, [
        { lbl: 'Kapat', cls: 'bs', fn: closeModal }
    ]);
};

// ── Sporcu profiline envanter satışı: addPaymentForAthlete override
var _origAddPaymentForAthlete = window.addPaymentForAthlete;
window.addPaymentForAthlete = function(aid) {
    var a = (AppState.data.athletes || []).find(function(x) { return x.id === aid; });
    if (!a) return;

    var invItems = (AppState.data.inventoryItems || []).filter(function(i) { return i.status === 'active' && i.stockQty > 0; });
    var invOptions = invItems.map(function(i) {
        return '<option value="' + FormatUtils.escape(i.id) + '">' + FormatUtils.escape(i.name) + ' (' + i.stockQty + ' ' + FormatUtils.escape(i.unit) + ' — ' + FormatUtils.currency(i.unitPrice) + ')</option>';
    }).join('');

    modal('Yeni Ödeme Ekle', '<div class="fgr mb2"><label>Sporcu</label><input value="' + FormatUtils.escape((a.fn || '') + ' ' + (a.ln || '')) + '" disabled/></div>'
        + '<div class="fgr mb3"><label>Ödeme Tipi</label><select id="p-payment-type" onchange="togglePaymentTypeFields()" style="padding:10px 12px">'
        + '<option value="aidat">💰 Aidat</option>'
        + '<option value="spor_malzemesi">🏋️ Spor Malzemesi</option>'
        + '</select></div>'

        // Aidat alanları
        + '<div id="aidat-fields">'
        + '<div class="g21">'
        + '<div class="fgr"><label>Tutar (₺) *</label><input id="p-amt" type="number" value="' + (a.fee || '') + '"/></div>'
        + '<div class="fgr"><label>İşlem Türü</label><select id="p-ty"><option value="income">Gelir (Tahsilat)</option><option value="expense">Gider</option></select></div>'
        + '</div>'
        + '<div class="fgr mt2"><label>Açıklama</label><input id="p-ds" value="Aylık Aidat"/></div>'
        + '<div class="g21 mt2">'
        + '<div class="fgr"><label>Durum</label><select id="p-st"><option value="completed">Ödendi</option><option value="pending">Bekliyor</option></select></div>'
        + '<div class="fgr"><label>Tarih</label><input id="p-dt" type="date" value="' + DateUtils.today() + '"/></div>'
        + '</div>'
        + '</div>'

        // Spor malzemesi alanları
        + '<div id="malzeme-fields" style="display:none">'
        + '<div class="fgr mb2"><label>Ürün *</label><select id="p-inv-item" onchange="updateInvPrice()" style="padding:10px 12px">'
        + '<option value="">Ürün seçin...</option>' + invOptions
        + '</select></div>'
        + '<div class="g21 mb2">'
        + '<div class="fgr"><label>Adet *</label><input id="p-inv-qty" type="number" min="1" value="1" onchange="updateInvTotal()" oninput="updateInvTotal()"/></div>'
        + '<div class="fgr"><label>Birim Fiyat (₺)</label><input id="p-inv-price" type="number" readonly style="background:var(--bg3)"/></div>'
        + '</div>'
        + '<div class="fgr mb2"><label>Toplam Tutar (₺)</label><input id="p-inv-total" type="number" readonly style="background:var(--bg3);font-weight:700"/></div>'
        + '<div class="fgr mb2"><label>Tarih</label><input id="p-inv-date" type="date" value="' + DateUtils.today() + '"/></div>'
        + '<div class="fgr mb2"><label>Durum</label><select id="p-inv-st" style="padding:10px 12px"><option value="completed">Ödendi</option><option value="pending">Bekliyor</option></select></div>'
        + (invItems.length === 0 ? '<div class="al al-y" style="border-radius:10px;padding:12px"><div class="tw6 tsm mb1">⚠️ Stokta ürün yok</div><div class="ts tm">Önce Envanter sayfasından ürün ekleyin.</div></div>' : '')
        + '</div>'
    , [
        { lbl: 'İptal', cls: 'bs', fn: closeModal },
        { lbl: 'Kaydet', cls: 'bp', fn: async function() {
            var paymentType = (document.getElementById('p-payment-type') || {}).value || 'aidat';

            if (paymentType === 'aidat') {
                // Orijinal aidat akışı
                var obj = {
                    id: generateId(),
                    aid: aid,
                    an: a.fn + ' ' + a.ln,
                    amt: parseFloat((document.getElementById('p-amt') || {}).value) || 0,
                    ds: (document.getElementById('p-ds') || {}).value || '',
                    st: (document.getElementById('p-st') || {}).value || 'completed',
                    dt: (document.getElementById('p-dt') || {}).value || DateUtils.today(),
                    ty: (document.getElementById('p-ty') || {}).value || 'income',
                    serviceName: (document.getElementById('p-ds') || {}).value || 'Aylık Aidat',
                    paymentType: 'aidat'
                };
                if (!obj.amt) { toast('Tutar giriniz!', 'e'); return; }
                var result = await DB.upsert('payments', DB.mappers.fromPayment(obj));
                if (result) {
                    AppState.data.payments.push(obj);
                    toast('Ödeme kaydedildi!', 'g');
                    closeModal();
                    go('athleteProfile', { id: aid });
                }
            } else {
                // Spor malzemesi satışı
                var itemId = (document.getElementById('p-inv-item') || {}).value;
                var qty = parseInt((document.getElementById('p-inv-qty') || {}).value) || 0;
                var invDate = (document.getElementById('p-inv-date') || {}).value || DateUtils.today();
                var invStatus = (document.getElementById('p-inv-st') || {}).value || 'completed';

                if (!itemId) { toast('Ürün seçiniz!', 'e'); return; }
                if (qty <= 0) { toast('Geçerli adet giriniz!', 'e'); return; }

                var invItem = (AppState.data.inventoryItems || []).find(function(i) { return i.id === itemId; });
                if (!invItem) { toast('Ürün bulunamadı!', 'e'); return; }
                if (invItem.stockQty < qty) { toast('Stok yetersiz! Mevcut: ' + invItem.stockQty + ' ' + invItem.unit, 'e'); return; }

                var unitPrice = invItem.unitPrice;
                var totalAmt = unitPrice * qty;

                // 1) payments tablosuna kayıt
                var payObj = {
                    id: generateId(),
                    aid: aid,
                    an: a.fn + ' ' + a.ln,
                    amt: totalAmt,
                    ds: invItem.name + ' x' + qty,
                    st: invStatus,
                    dt: invDate,
                    ty: 'income',
                    serviceName: invItem.name + ' x' + qty,
                    paymentType: 'spor_malzemesi',
                    inventoryItemId: invItem.id,
                    inventoryItemName: invItem.name,
                    inventoryQty: qty,
                    inventoryUnitPrice: unitPrice
                };
                var payResult = await DB.upsert('payments', DB.mappers.fromPayment(payObj));
                if (!payResult) { toast('Ödeme kaydedilemedi!', 'e'); return; }
                AppState.data.payments.push(payObj);

                // 2) inventory_movements tablosuna satış kaydı
                var movObj = {
                    id: generateId(),
                    itemId: invItem.id,
                    itemName: invItem.name,
                    movementType: 'sale',
                    quantityDelta: -qty,
                    note: a.fn + ' ' + a.ln + ' — ' + qty + ' ' + invItem.unit + ' satış',
                    relatedPaymentId: payObj.id,
                    athleteId: aid,
                    athleteName: a.fn + ' ' + a.ln,
                    orgId: AppState.currentOrgId || '',
                    branchId: AppState.currentBranchId || ''
                };
                await DB.upsert('inventory_movements', DB.mappers.fromInventoryMovement(movObj));
                AppState.data.inventoryMovements.unshift(movObj);

                // 3) inventory_items stok düşür
                invItem.stockQty -= qty;
                await DB.upsert('inventory_items', DB.mappers.fromInventoryItem(invItem));

                toast('✅ ' + invItem.name + ' x' + qty + ' satışı kaydedildi! Toplam: ' + FormatUtils.currency(totalAmt), 'g');
                closeModal();
                go('athleteProfile', { id: aid });
            }
        }}
    ]);
};

// ── Ödeme tipi geçiş yardımcıları ───────────────────────────────
window.togglePaymentTypeFields = function() {
    var type = (document.getElementById('p-payment-type') || {}).value;
    var aidatFields = document.getElementById('aidat-fields');
    var malzemeFields = document.getElementById('malzeme-fields');
    if (aidatFields) aidatFields.style.display = type === 'aidat' ? '' : 'none';
    if (malzemeFields) malzemeFields.style.display = type === 'spor_malzemesi' ? '' : 'none';
};

window.updateInvPrice = function() {
    var itemId = (document.getElementById('p-inv-item') || {}).value;
    var invItem = (AppState.data.inventoryItems || []).find(function(i) { return i.id === itemId; });
    var priceEl = document.getElementById('p-inv-price');
    if (priceEl) priceEl.value = invItem ? invItem.unitPrice : 0;
    updateInvTotal();
};

window.updateInvTotal = function() {
    var price = parseFloat((document.getElementById('p-inv-price') || {}).value) || 0;
    var qty = parseInt((document.getElementById('p-inv-qty') || {}).value) || 0;
    var totalEl = document.getElementById('p-inv-total');
    if (totalEl) totalEl.value = (price * qty).toFixed(2);
};

// ── Envanter veri yükleme — mevcut veri yükleme akışına entegre ──
window.registerGoHook('after', function(page) {
    if (page === 'dashboard' || page === 'payments' || page === 'accounting') {
        // Bu sayfalara geçince envanter verisi de yükle (gerekirse)
        if ((AppState.data.inventoryItems || []).length === 0) {
            loadInventoryData();
        }
    }
});

// ── Envanter accordion auto-open: inventory sayfasına gidince ────
window.registerGoHook('after', function(page) {
    if (page === 'inventory') {
        // Muhasebe accordion'ını aç
        var body = document.getElementById('accb-finance');
        if (body && body.classList.contains('collapsed')) {
            toggleAccordion('finance');
        }
    }
});

// ── updateBranchUI override: Envanter butonunu coach için gizle ──
var _origUpdateBranchUI4 = typeof updateBranchUI === 'function' ? updateBranchUI : null;
window.updateBranchUI = function() {
    if (_origUpdateBranchUI4) _origUpdateBranchUI4();
    if (AppState.currentUser && AppState.currentUser.role === 'coach') {
        var invBtn = document.getElementById('ni-inventory');
        if (invBtn) invBtn.style.display = 'none';
    }
};

// ── Finans / Rapor: pgAccountingV8 override — envanter ile ──────
var _origPgAccountingV8 = window.pgAccountingV8;
window.pgAccountingV8 = function() {
    var baseHtml = _origPgAccountingV8();

    // Aidat vs Envanter gelir ayrımı
    var allCompleted = (AppState.data.payments || []).filter(function(p) { return p.ty === 'income' && p.st === 'completed'; });
    var aidatIncome = 0, envIncome = 0;
    allCompleted.forEach(function(p) {
        if ((p.paymentType || 'aidat') === 'spor_malzemesi') {
            envIncome += (p.amt || 0);
        } else {
            aidatIncome += (p.amt || 0);
        }
    });
    var totalIncome = aidatIncome + envIncome;

    // Dönem filtresi uygula
    var filteredCompleted = allCompleted.filter(function(p) { return isInPeriod(p.dt); });
    var fAidatIncome = 0, fEnvIncome = 0;
    filteredCompleted.forEach(function(p) {
        if ((p.paymentType || 'aidat') === 'spor_malzemesi') {
            fEnvIncome += (p.amt || 0);
        } else {
            fAidatIncome += (p.amt || 0);
        }
    });

    // Ürün bazlı satış dağılımı
    var productSales = {};
    filteredCompleted.filter(function(p) { return (p.paymentType || 'aidat') === 'spor_malzemesi'; }).forEach(function(p) {
        var name = p.inventoryItemName || p.ds || 'Bilinmeyen Ürün';
        if (!productSales[name]) productSales[name] = { name: name, totalAmount: 0, totalQty: 0 };
        productSales[name].totalAmount += (p.amt || 0);
        productSales[name].totalQty += (p.inventoryQty || 0);
    });
    var productSalesList = Object.keys(productSales).map(function(k) { return productSales[k]; }).sort(function(a, b) { return b.totalAmount - a.totalAmount; });

    // Envanter gelir kartlarını oluştur
    var envSection = '<div class="card mb3" style="border-left:4px solid var(--blue2)">'
        + '<div class="tw6 tsm mb3">📦 Gelir Dağılımı: Aidat vs Envanter Satış</div>'
        + '<div class="g3 mb3">'
        + '<div style="text-align:center;padding:16px;background:var(--bg3);border-radius:12px"><div class="stat-box-value tg" style="font-size:20px">' + FormatUtils.currency(fAidatIncome) + '</div><div class="ts tm mt1">💰 Aidat Geliri</div></div>'
        + '<div style="text-align:center;padding:16px;background:var(--bg3);border-radius:12px"><div class="stat-box-value tb" style="font-size:20px">' + FormatUtils.currency(fEnvIncome) + '</div><div class="ts tm mt1">📦 Envanter Satış Geliri</div></div>'
        + '<div style="text-align:center;padding:16px;background:var(--bg3);border-radius:12px"><div class="stat-box-value tpur" style="font-size:20px">' + FormatUtils.currency(fAidatIncome + fEnvIncome) + '</div><div class="ts tm mt1">💎 Genel Toplam Gelir</div></div>'
        + '</div>';

    // Gelir dağılımı çubuk
    var totalF = fAidatIncome + fEnvIncome || 1;
    var aidatPct = Math.round((fAidatIncome / totalF) * 100);
    var envPct = 100 - aidatPct;
    envSection += '<div class="mb3"><div class="flex fjb fca mb1"><span class="ts tm">Aidat: %' + aidatPct + '</span><span class="ts tm">Envanter: %' + envPct + '</span></div>'
        + '<div class="prb" style="height:12px;border-radius:6px;overflow:hidden;display:flex">'
        + '<div style="width:' + aidatPct + '%;background:var(--green);height:100%"></div>'
        + '<div style="width:' + envPct + '%;background:var(--blue2);height:100%"></div>'
        + '</div>'
        + '<div class="flex gap3 mt2"><div class="flex fca gap1"><div style="width:10px;height:10px;border-radius:50%;background:var(--green)"></div><span class="ts tm">Aidat</span></div><div class="flex fca gap1"><div style="width:10px;height:10px;border-radius:50%;background:var(--blue2)"></div><span class="ts tm">Envanter</span></div></div>'
        + '</div>';

    // Ürün bazlı satış tablosu
    if (productSalesList.length > 0) {
        envSection += '<div class="tw6 tsm mb2 mt3">🛒 Ürün Bazlı Satış Dağılımı</div>'
            + '<div class="tw" style="overflow-x:auto"><table class="inv-table"><thead><tr><th>Ürün</th><th>Satış Adedi</th><th>Toplam Gelir</th></tr></thead><tbody>';
        productSalesList.forEach(function(ps) {
            envSection += '<tr><td class="tw6">' + FormatUtils.escape(ps.name) + '</td><td>' + ps.totalQty + '</td><td class="tw6 tg">' + FormatUtils.currency(ps.totalAmount) + '</td></tr>';
        });
        envSection += '</tbody></table></div>';
    } else {
        envSection += '<div class="ts tm" style="text-align:center;padding:16px">Seçili dönemde envanter satışı bulunmuyor.</div>';
    }

    envSection += '</div>';

    // baseHtml'in sonuna envanter bölümünü ekle (banka bilgileri kartından önce)
    var bankCardIndex = baseHtml.lastIndexOf('<div class="card"><div class="tw6 tsm mb2">🏦 Banka Bilgileri');
    if (bankCardIndex > -1) {
        baseHtml = baseHtml.substring(0, bankCardIndex) + envSection + baseHtml.substring(bankCardIndex);
    } else {
        baseHtml += envSection;
    }

    return baseHtml;
};

// ── Sporcu profil: ödeme geçmişinde envanter satışlarını göster ──
// generatePaymentHistory override — spor malzemesi kayıtlarını farklı göster
var _origGeneratePaymentHistory = typeof generatePaymentHistory === 'function' ? generatePaymentHistory : null;
window.generatePaymentHistory = function(athleteId) {
    var payments = (AppState.data.payments || []).filter(function(p) { return p.aid === athleteId; });
    if (payments.length === 0) {
        return '<div class="empty-state" style="padding:32px;text-align:center"><div style="font-size:44px;margin-bottom:10px">📭</div><div class="tw6 ts">Henüz ödeme kaydı yok</div></div>';
    }

    // Ayrı listeler
    var aidatPayments = payments.filter(function(p) { return (p.paymentType || 'aidat') === 'aidat'; });
    var envPayments = payments.filter(function(p) { return (p.paymentType || 'aidat') === 'spor_malzemesi'; });

    var html = '';

    // Aidat ödemeleri
    html += '<div class="tw6 tsm mb2">💰 Aidat Ödemeleri (' + aidatPayments.length + ')</div>';
    if (aidatPayments.length > 0) {
        html += '<div class="tw mb3" style="overflow-x:auto"><table><thead><tr><th>Tarih</th><th>Açıklama</th><th>Tutar</th><th>Durum</th><th>İşlem</th></tr></thead><tbody>';
        aidatPayments.sort(function(a, b) { return new Date(b.dt) - new Date(a.dt); }).forEach(function(p) {
            var statusBadge = p.st === 'completed' ? '<span class="bg bg-g">Ödendi</span>' : p.st === 'overdue' ? '<span class="bg bg-r">Gecikmiş</span>' : '<span class="bg bg-y">Bekliyor</span>';
            html += '<tr><td>' + DateUtils.format(p.dt) + '</td><td>' + FormatUtils.escape(p.ds || p.serviceName || 'Aidat') + '</td><td class="tw6">' + FormatUtils.currency(p.amt) + '</td><td>' + statusBadge + '</td><td><button class="btn btn-xs bs" onclick="editPay(\'' + p.id + '\')">✏️</button></td></tr>';
        });
        html += '</tbody></table></div>';
    } else {
        html += '<div class="ts tm mb3">Aidat kaydı bulunamadı.</div>';
    }

    // Spor malzemesi ödemeleri
    html += '<div class="tw6 tsm mb2">🏋️ Spor Malzemesi Satışları (' + envPayments.length + ')</div>';
    if (envPayments.length > 0) {
        html += '<div class="tw" style="overflow-x:auto"><table><thead><tr><th>Tarih</th><th>Ürün</th><th>Adet</th><th>Birim Fiyat</th><th>Toplam</th><th>Durum</th></tr></thead><tbody>';
        envPayments.sort(function(a, b) { return new Date(b.dt) - new Date(a.dt); }).forEach(function(p) {
            var statusBadge = p.st === 'completed' ? '<span class="bg bg-g">Ödendi</span>' : p.st === 'overdue' ? '<span class="bg bg-r">Gecikmiş</span>' : '<span class="bg bg-y">Bekliyor</span>';
            html += '<tr><td>' + DateUtils.format(p.dt) + '</td><td class="tw6">' + FormatUtils.escape(p.inventoryItemName || p.ds || '-') + '</td><td>' + (p.inventoryQty || '-') + '</td><td>' + FormatUtils.currency(p.inventoryUnitPrice || 0) + '</td><td class="tw6 tg">' + FormatUtils.currency(p.amt) + '</td><td>' + statusBadge + '</td></tr>';
        });
        html += '</tbody></table></div>';
    } else {
        html += '<div class="ts tm">Spor malzemesi satış kaydı bulunamadı.</div>';
    }

    return html;
};

// ── GELİŞTİRME 28: Tarayıcı geri tuşu ile uygulama içi navigasyon ──
(function() {
    var navByPopState = false;
    var allowedPages = ['dashboard','athletes','athleteProfile','payments','accounting','attendance','coaches','sports','classes','settings','sms','onkayit','calendar','notifications','inventory'];

    // go() çağrıldığında history'ye state ekle
    window.registerGoHook('after', function(page, params) {
        if (navByPopState) { navByPopState = false; return; }
        if (allowedPages.indexOf(page) === -1) return;
        var state = { page: page };
        if (params && typeof params.id === 'string') state.id = params.id;
        window.history.pushState(state, '', window.location.pathname);
    });

    // Tarayıcı geri tuşuna basıldığında önceki sayfaya dön
    window.addEventListener('popstate', function(e) {
        if (e.state && typeof e.state.page === 'string' && allowedPages.indexOf(e.state.page) !== -1) {
            navByPopState = true;
            var params = {};
            if (typeof e.state.id === 'string') params.id = e.state.id;
            window.go(e.state.page, params);
        } else {
            // İlk sayfa state'i yoksa dashboard'a dön ve geri çıkmayı engelle
            navByPopState = true;
            window.history.pushState({ page: 'dashboard' }, '', window.location.pathname);
            window.go('dashboard');
        }
    });

    // Sayfa ilk yüklendiğinde mevcut sayfayı history'ye kaydet
    var curPage = (typeof AppState !== 'undefined' && AppState.ui && AppState.ui.curPage) ? AppState.ui.curPage : 'dashboard';
    window.history.replaceState({ page: curPage }, '', window.location.pathname);
})();

console.log('✅ Geliştirme 1-28 uygulandı — script-fixes.js V15');
