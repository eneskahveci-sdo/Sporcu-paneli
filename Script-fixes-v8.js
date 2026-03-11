/* =========================================================================
   DRAGOS AKADEMİ V8 - PATCH & FEATURES DOSYASI
   Mobil navigasyon fix, Makbuz (Print), Chart.js Grafikler, Kasa/Banka Takibi
   ========================================================================= */

(function initV8Patch() {
    console.log("V8 Patch Yükleniyor...");

    // 1. CSS VE KÜTÜPHANE ENJEKSİYONU
    const v8Styles = `
        <style>
            /* iOS Navigasyon Fix - Alt Kısım Boşluğu ve Touch Target */
            .sp-nav { padding-bottom: env(safe-area-inset-bottom, 20px) !important; z-index: 2000 !important; }
            .sp-tab { min-height: 44px !important; display: flex; flex-direction: column; align-items: center; justify-content: center; }
            
            /* Makbuz Yazdırma Kuralları */
            @media print {
                body > *:not(#print-receipt-container) { display: none !important; }
                #print-receipt-container { 
                    display: block !important; position: absolute; left: 0; top: 0; 
                    width: 100%; padding: 20px; font-family: sans-serif; background: #fff; z-index: 9999;
                }
                .receipt-header { border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 10px; }
                .receipt-body p { font-size: 16px; margin: 8px 0; }
            }
        </style>
    `;
    document.head.insertAdjacentHTML('beforeend', v8Styles);
    
    // Chart.js Yüklemesi
    if (!window.Chart) {
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/chart.js";
        document.head.appendChild(script);
    }

    // 2. MAKBUZ ŞABLONUNU DOM'A EKLE
    if (!document.getElementById('print-receipt-container')) {
        const receiptHTML = `
            <div id="print-receipt-container" style="display: none;">
                <div class="receipt-header">
                    <h2>Dragos Futbol Akademisi</h2>
                    <p>Makbuz No: <span id="receipt-no"></span></p>
                </div>
                <div class="receipt-body">
                    <p><strong>Tarih:</strong> <span id="receipt-date"></span></p>
                    <p><strong>Sporcu:</strong> <span id="receipt-athlete"></span></p>
                    <p><strong>Tutar:</strong> <span id="receipt-amount"></span> TL</p>
                    <p><strong>Ödeme Yöntemi:</strong> <span id="receipt-method"></span></p>
                    <p><strong>Kategori:</strong> <span id="receipt-category"></span></p>
                    <p><strong>Açıklama:</strong> <span id="receipt-desc"></span></p>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', receiptHTML);
    }

    // 3. VERİTABANI EŞLEŞTİRMELERİNİ (MAPPERS) GÜNCELLE
    setTimeout(() => {
        if (window.DB && window.DB.mappers) {
            if (window.DB.mappers.payments) {
                Object.assign(window.DB.mappers.payments, { category: 'category', accountType: 'account_type' });
            }
            if (window.DB.mappers.settings) {
                Object.assign(window.DB.mappers.settings, { waApiToken: 'wa_api_token', waPhoneId: 'wa_phone_id', waNotifyDay: 'wa_notify_day' });
            }
        }
    }, 500);

    // 4. SPORCU PORTALI NAVİGASYON OVERRIDE (Hata Çözümü)
    window.spTab = function(tabId, event) {
        // Hedef butonu belirle ve active sınıfını sadece ona ver
        document.querySelectorAll('.sp-tab').forEach(btn => btn.classList.remove('active'));
        if (event && event.currentTarget) {
            event.currentTarget.classList.add('active');
        } else {
            // Fallback (event gelmezse)
            document.querySelectorAll('.sp-tab').forEach(btn => {
                if(btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabId)) {
                    btn.classList.add('active');
                }
            });
        }

        // Ana uygulamanın render fonksiyonlarını tetikle
        if (tabId === 'profil' && typeof window.spProfil === 'function') window.spProfil();
        else if (tabId === 'yoklama' && typeof window.spYoklama === 'function') window.spYoklama();
        else if (tabId === 'odemeler' && typeof window.spOdemeler === 'function') window.spOdemeler();
        else if (tabId === 'odemeYap' && typeof window.spOdemeYap === 'function') window.spOdemeYap();
    };

    // 5. MAKBUZ YAZDIRMA FONKSİYONU
    window.printReceipt = function(paymentId) {
        if (!window.AppState || !window.AppState.payments) return alert("Ödeme verileri yüklenemedi.");
        const payment = window.AppState.payments.find(p => p.id === paymentId);
        if(!payment) return alert("Ödeme kaydı bulunamadı.");

        const athlete = window.AppState.athletes ? window.AppState.athletes.find(a => a.id === payment.athleteId) : null;
        const athleteName = athlete ? athlete.name + ' ' + athlete.surname : 'Bilinmeyen Sporcu';

        document.getElementById('receipt-no').textContent = 'MKB-' + new Date(payment.date).getFullYear() + '-' + String(payment.id).padStart(4, '0');
        document.getElementById('receipt-date').textContent = new Date(payment.date).toLocaleDateString('tr-TR');
        document.getElementById('receipt-athlete').textContent = window.FormatUtils ? window.FormatUtils.escape(athleteName) : athleteName;
        document.getElementById('receipt-amount').textContent = payment.amount;
        document.getElementById('receipt-method').textContent = window.FormatUtils ? window.FormatUtils.escape(payment.payMethod) : payment.payMethod;
        document.getElementById('receipt-category').textContent = payment.category || '-';
        document.getElementById('receipt-desc').textContent = window.FormatUtils ? window.FormatUtils.escape(payment.description || '') : (payment.description || '');

        window.print(); 
    };

    // 6. FİNANS GRAFİKLERİ VE KASA/BANKA HESAPLAYICI
    window.renderFinancialCharts = function() {
        setTimeout(() => {
            const ctx = document.getElementById('chart-income-expense');
            if(!ctx || !window.Chart || !window.AppState || !window.AppState.payments) return;

            let kasaTotal = 0, bankaTotal = 0, incomeTotal = 0, expenseTotal = 0;
            
            // Hesaplama döngüsü
            window.AppState.payments.forEach(p => {
                const amount = parseFloat(p.amount) || 0;
                const isIncome = p.type === 'income';

                if (isIncome) incomeTotal += amount;
                else expenseTotal += amount;

                if(p.payMethod === 'Nakit' || p.accountType === 'Kasa') {
                    kasaTotal += (isIncome ? amount : -amount);
                } else {
                    bankaTotal += (isIncome ? amount : -amount);
                }
            });

            // Grafiği çiz
            new window.Chart(ctx, {
                type: 'bar',
                data: {
                    labels: ['Genel Finansal Durum'],
                    datasets: [
                        { label: 'Toplam Gelir', data: [incomeTotal], backgroundColor: '#4ade80' },
                        { label: 'Toplam Gider', data: [expenseTotal], backgroundColor: '#f87171' }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
            
            console.log("Finans Raporu - Kasa:", kasaTotal, "Banka:", bankaTotal);
        }, 300);
    };

})();
