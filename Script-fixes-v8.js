/* =========================================================================
   DRAGOS AKADEMİ V8 - GÜVENLİK, ÖZELLİKLER VE MENÜ DÜZELTMESİ
   Ana dosyalara dokunulmaz, RLS ile uyumlu çalışır.
   ========================================================================= */

(function initV8Patch() {
    // 1. ZORUNLU CSS (Menü görünürlüğü ve Makbuz)
    const v8Styles = `
        <style>
            .sp-nav { display: flex !important; flex-direction: row !important; justify-content: space-around !important; visibility: visible !important; opacity: 1 !important; position: relative !important; width: 100% !important; background: #f8f9fa !important; padding: 10px 0 !important; margin-bottom: 20px !important; border-radius: 8px !important; box-shadow: 0 2px 5px rgba(0,0,0,0.1) !important; z-index: 9999 !important; min-height: 60px !important; }
            .sp-tab { display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; min-height: 44px !important; padding: 10px 20px !important; background: transparent !important; border: none !important; color: #555 !important; font-weight: bold !important; cursor: pointer !important; }
            .sp-tab.active { color: #007bff !important; border-bottom: 3px solid #007bff !important; }
            @media print { body > *:not(#print-receipt-container) { display: none !important; } #print-receipt-container { display: block !important; position: absolute; left: 0; top: 0; width: 100%; padding: 20px; font-family: sans-serif; background: #fff; z-index: 9999; } .receipt-header { border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px; } }
        </style>
    `;
    document.head.insertAdjacentHTML('beforeend', v8Styles);
    
    // 2. DOM EKLEMELERİ
    if (!window.Chart) { const script = document.createElement('script'); script.src = "https://cdn.jsdelivr.net/npm/chart.js"; document.head.appendChild(script); }
    if (!document.getElementById('print-receipt-container')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="print-receipt-container" style="display: none;">
                <div class="receipt-header"><h2>Dragos Futbol Akademisi</h2><p>Makbuz No: <span id="receipt-no"></span></p></div>
                <div class="receipt-body"><p><strong>Tarih:</strong> <span id="receipt-date"></span></p><p><strong>Sporcu:</strong> <span id="receipt-athlete"></span></p><p><strong>Tutar:</strong> <span id="receipt-amount"></span> TL</p><p><strong>Yöntem:</strong> <span id="receipt-method"></span></p><p><strong>Kategori:</strong> <span id="receipt-category"></span></p></div>
            </div>
        `);
    }

    // 3. FONKSİYON OVERRIDE'LARI VE GÜVENLİK
    setTimeout(() => {
        if (window.DB && window.DB.mappers) {
            if (window.DB.mappers.payments) Object.assign(window.DB.mappers.payments, { category: 'category', accountType: 'account_type' });
            if (window.DB.mappers.settings) Object.assign(window.DB.mappers.settings, { waApiToken: 'wa_api_token', waPhoneId: 'wa_phone_id', waNotifyDay: 'wa_notify_day' });
        }
    }, 500);

    window.spTab = function(tabId, event) {
        document.querySelectorAll('.sp-tab').forEach(btn => btn.classList.remove('active'));
        if (event && event.currentTarget) { event.currentTarget.classList.add('active'); } 
        else { document.querySelectorAll('.sp-tab').forEach(btn => { const metin = btn.textContent.trim().toLowerCase(); if (metin.includes(tabId.toLowerCase()) || (tabId === 'odemeYap' && metin.includes('ödeme yap'))) btn.classList.add('active'); }); }
        if (tabId === 'profil' && typeof window.spProfil === 'function') window.spProfil(); else if (tabId === 'yoklama' && typeof window.spYoklama === 'function') window.spYoklama(); else if (tabId === 'odemeler' && typeof window.spOdemeler === 'function') window.spOdemeler(); else if (tabId === 'odemeYap' && typeof window.spOdemeYap === 'function') window.spOdemeYap();
    };

    window.printReceipt = function(paymentId) {
        if (!window.AppState || !window.AppState.payments) return alert("Veriler yüklenemedi.");
        const payment = window.AppState.payments.find(p => p.id === paymentId);
        if(!payment) return alert("Kayıt bulunamadı.");
        const athlete = window.AppState.athletes ? window.AppState.athletes.find(a => a.id === payment.athleteId) : null;
        document.getElementById('receipt-no').textContent = 'MKB-' + new Date(payment.date).getFullYear() + '-' + String(payment.id).padStart(4, '0');
        document.getElementById('receipt-date').textContent = new Date(payment.date).toLocaleDateString('tr-TR');
        document.getElementById('receipt-athlete').textContent = athlete ? athlete.name + ' ' + athlete.surname : 'Bilinmeyen';
        document.getElementById('receipt-amount').textContent = payment.amount;
        document.getElementById('receipt-method').textContent = payment.payMethod;
        document.getElementById('receipt-category').textContent = payment.category || '-';
        window.print();
    };

    window.renderFinancialCharts = function() {
        setTimeout(() => {
            const ctx = document.getElementById('chart-income-expense');
            if(!ctx || !window.Chart || !window.AppState || !window.AppState.payments) return;
            let incomeTotal = 0, expenseTotal = 0;
            window.AppState.payments.forEach(p => {
                const amount = parseFloat(p.amount) || 0;
                if (p.type === 'income') incomeTotal += amount; else expenseTotal += amount;
            });
            new window.Chart(ctx, { type: 'bar', data: { labels: ['Genel Finansal Durum'], datasets: [{ label: 'Gelir', data: [incomeTotal], backgroundColor: '#4ade80' }, { label: 'Gider', data: [expenseTotal], backgroundColor: '#f87171' }] }, options: { responsive: true, maintainAspectRatio: false } });
        }, 300);
    };

    // Konsol üzerinden basit hack girişimlerini zorlaştırıcı önlem (Obfuscation kalkanı)
    Object.freeze(window.printReceipt);
    Object.freeze(window.renderFinancialCharts);
})();
