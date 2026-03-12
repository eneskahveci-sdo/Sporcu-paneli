// =================================================================
// DRAGOS AKADEMİ - AKILLI GÜVENLİK KALKANI V2
// =================================================================
(function() {
    console.log("🛡️ Akıllı Güvenlik Kalkanı V2 Aktif! (Antrenör Tam Erişim)");

    // 1. VERİ FİLTRELEME YAMASI (Supabase Araya Girme)
    if (window.supabase) {
        const originalFrom = window.supabase.from;
        window.supabase.from = function(table) {
            const queryBuilder = originalFrom.apply(this, arguments);
            const originalSelect = queryBuilder.select;
            
            queryBuilder.select = function() {
                let query = originalSelect.apply(this, arguments);
                
                // Hafızadan kimin giriş yaptığını bul
                const userRole = StorageManager.get('user_role');
                const userTC = StorageManager.get('user_tc');
                
                // SADECE SPORCULARA KISITLAMA UYGULA
                // Eğer giren kişi sporcuysa, sadece kendi verisini ve ödemesini görsün
                if (userRole === 'sporcu' && userTC) {
                    if (table === 'athletes' || table === 'payments') {
                        query = query.eq('tc_no', userTC);
                    }
                }
                
                // NOT: Eğer userRole 'coach' veya 'admin' ise HİÇBİR FİLTRE UYGULANMAZ.
                // Böylece antrenörler tüm sınıfları/sporcuları görebilir, admin her şeyi görür.
                // Henüz giriş yapılmamışsa (Login anı) sorgu orijinal haliyle çalışır.
                
                return query;
            };
            return queryBuilder;
        };
    }

    // 2. WHATSAPP & KASA KORUMASI
    if (typeof DB !== 'undefined' && DB.mappers && DB.mappers.fromSettings) {
        const originalFromSettings = DB.mappers.fromSettings;
        DB.mappers.fromSettings = function(s) {
            const base = originalFromSettings(s);
            const userRole = StorageManager.get('user_role');
            
            // Eğer giriş yapan Admin DEĞİLSE (Yani antrenör veya sporcuysa) WhatsApp şifrelerini gizle
            if (userRole !== 'admin') {
                base.wa_api_token = '***GIZLI_VERI***';
                base.wa_phone_id = '***GIZLI_VERI***';
            }
            return base;
        };
    }

    // 3. BRUTE-FORCE (Kaba Kuvvet) GİRİŞ KORUMASI
    if (window.doNormalLogin) {
        let loginAttempts = {};
        const originalDoNormalLogin = window.doNormalLogin;
        
        window.doNormalLogin = function(role) {
            const tcInputId = role === 'coach' ? 'lc-tc' : 'ls-tc';
            const tcInput = document.getElementById(tcInputId);
            const tcValue = tcInput ? tcInput.value.trim() : 'bilinmeyen';

            const blockTime = localStorage.getItem('block_' + tcValue);
            if (blockTime && Date.now() < parseInt(blockTime)) {
                alert("🛑 Çok fazla hatalı deneme! Güvenlik gereği 1 dakika kilitlendiniz.");
                return;
            }

            loginAttempts[tcValue] = (loginAttempts[tcValue] || 0) + 1;

            if (loginAttempts[tcValue] > 5) {
                localStorage.setItem('block_' + tcValue, Date.now() + 60000);
                alert("🛑 Çok fazla hatalı deneme! Hesabınız 1 dakika kilitlendi.");
                loginAttempts[tcValue] = 0;
                return;
            }

            return originalDoNormalLogin.apply(this, arguments);
        };
    }
})();
// =================================================================
