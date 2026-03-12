// =================================================================
// DRAGOS AKADEMİ - OTOMATİK GÜVENLİ GİRİŞ VE MİGRASYON SİSTEMİ
// Eski güvenlik yamalarına gerek kalmadan Supabase RLS ile çalışır.
// =================================================================
console.log("🛡️ Dragos Pro: Akıllı Kapı Görevlisi ve RLS Aktif!");

// Orijinal doNormalLogin fonksiyonunu güvenli versiyonla eziyoruz
window.doNormalLogin = async function(role) {
    const tcInputId = role === 'coach' ? 'lc-tc' : 'ls-tc';
    const passInputId = role === 'coach' ? 'lc-pass' : 'ls-pass';
    
    const tcEl = document.getElementById(tcInputId);
    const passEl = document.getElementById(passInputId);
    
    if (!tcEl || !passEl) return;
    
    const tc = tcEl.value.trim();
    const pass = passEl.value.trim();
    
    if (!tc || !pass) {
        alert("Lütfen TC Kimlik No ve şifre (son 4 hane) giriniz.");
        return;
    }

    // Arka plan için sistemin ürettiği sanal e-posta
    const email = tc + (role === 'coach' ? '@coach.dragos.local' : '@sporcu.dragos.local');

    try {
        // Butonu devre dışı bırakıp kullanıcıya bilgi verelim
        const btn = event && event.target && event.target.tagName === 'BUTTON' ? event.target : null;
        const originalText = btn ? btn.innerText : 'Giriş';
        if (btn) btn.innerText = 'Giriş Yapılıyor...';

        // 1. ADIM: Doğrudan güvenli sistemden (Supabase Auth) girmeyi dene
        let { data: authData, error: authError } = await window.supabase.auth.signInWithPassword({
            email: email,
            password: pass
        });

        // 2. ADIM: Kullanıcı ilk kez giriyorsa (Auth'ta yoksa) otomatik taşıma yap
        if (authError && (authError.message.includes('Invalid login') || authError.status === 400)) {
            console.log("İlk giriş tespit edildi, yetki kontrolü yapılıyor...");
            
            // Veritabanında (athletes/coaches) bu TC ve şifre var mı sor
            const { data: isValid, error: rpcError } = await window.supabase.rpc('verify_user_credentials', {
                p_tc: tc,
                p_pass: pass,
                p_role: role
            });

            if (isValid) {
                // Kayıt var ve şifre doğru. Arka planda güvenli sisteme kaydet
                const { error: signUpError } = await window.supabase.auth.signUp({
                    email: email,
                    password: pass,
                    options: {
                        data: { role: role, tc_no: tc } // RLS politikaları için gereken bilgiler
                    }
                });

                if (signUpError) throw signUpError;

                // Kayıt başarılı, şimdi asıl girişi yap ve Token'ı al
                const retryLogin = await window.supabase.auth.signInWithPassword({ email, password: pass });
                authData = retryLogin.data;
                authError = retryLogin.error;
            } else {
                alert("🛑 TC Kimlik No sistemde bulunamadı veya Şifre (son 4 hane) hatalı!");
                if (btn) btn.innerText = originalText;
                return;
            }
        } else if (authError) {
            alert("Giriş sırasında bir hata oluştu: " + authError.message);
            if (btn) btn.innerText = originalText;
            return;
        }

        // 3. ADIM: BAŞARILI GİRİŞ
        if (!authError && authData.session) {
            // LocalStorage'a gerekli rol ve TC'yi eski arayüzün çalışması için ekle
            if (window.StorageManager) {
                StorageManager.set('user_role', role);
                StorageManager.set('user_tc', tc);
            } else {
                localStorage.setItem('user_role', JSON.stringify(role));
                localStorage.setItem('user_tc', JSON.stringify(tc));
            }
            
            // Arayüzdeki giriş pencerelerini kapat
            const loginModal = document.getElementById('login-modal');
            const overlay = document.getElementById('overlay');
            if(loginModal) loginModal.classList.add('dn');
            if(overlay) overlay.classList.add('dn');
            
            // Verileri yükle veya sayfayı yenile
            if (typeof window.loadAllData === 'function') {
                window.loadAllData();
            } else {
                window.location.reload();
            }
        }

    } catch (err) {
        console.error("Beklenmeyen Hata:", err);
        alert("Sistemsel bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
        // Butonu eski haline getir
        const btn = event && event.target && event.target.tagName === 'BUTTON' ? event.target : null;
        if (btn && btn.innerText === 'Giriş Yapılıyor...') btn.innerText = 'Giriş Yap';
    }
};
