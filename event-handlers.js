// event-handlers.js — Inline onclick'ler buraya taşındı
// CSP'de 'unsafe-inline' kaldırmak için tüm event listener'lar bu dosyada.
(function () {
    function attach() {

        // ── Modal kapat ──────────────────────────────────────────
        var modalCloseBtn = document.querySelector('#modal .m-head .menu-btn');
        if (modalCloseBtn) modalCloseBtn.addEventListener('click', function () { closeModal(); });

        // ── Ön kayıt butonu ──────────────────────────────────────
        var onKayitBtn = document.getElementById('on-kayit-btn');
        if (onKayitBtn) onKayitBtn.addEventListener('click', function () { showOnKayitForm(); });

        // ── Giriş sekmeleri (data-tab) ───────────────────────────
        document.querySelectorAll('.ltab[data-tab]').forEach(function (tab) {
            tab.addEventListener('click', function () { switchLoginTab(this.dataset.tab); });
        });

        // ── Admin giriş butonu ───────────────────────────────────
        var adminLoginBtn = document.querySelector('#login-admin .btn.bp');
        if (adminLoginBtn) adminLoginBtn.addEventListener('click', function () { doLogin(); });

        // ── Sporcu giriş butonu ──────────────────────────────────
        var sporcuLoginBtn = document.querySelector('#login-sporcu .btn.bp');
        if (sporcuLoginBtn) sporcuLoginBtn.addEventListener('click', function () { doNormalLogin('sporcu'); });

        // ── Antrenör giriş butonu ────────────────────────────────
        var coachLoginBtn = document.querySelector('#login-coach .btn.bp');
        if (coachLoginBtn) coachLoginBtn.addEventListener('click', function () { doNormalLogin('coach'); });

        // ── Yasal metinler (data-legal attribute ile) ────────────
        document.querySelectorAll('.login-legal-btn[data-legal]').forEach(function (btn) {
            btn.addEventListener('click', function () { showLegal(this.dataset.legal); });
        });

        // ── Sporcu portalı: bildirim, tema, çıkış ───────────────
        var spNotifBtn = document.getElementById('sp-notif-btn');
        if (spNotifBtn) spNotifBtn.addEventListener('click', function (e) { toggleNotifPanel(e); });

        var spThemeBtn = document.getElementById('sp-theme-btn');
        if (spThemeBtn) spThemeBtn.addEventListener('click', function () { toggleTheme(); });

        var spLogoutBtn = document.querySelector('#sporcu-portal .btn.bs');
        if (spLogoutBtn) spLogoutBtn.addEventListener('click', function () { doSporcuLogout(); });

        // ── Sporcu portal sekmeleri ──────────────────────────────
        document.querySelectorAll('.sp-tab[data-tab]').forEach(function (tab) {
            tab.addEventListener('click', function () { spTab(this.dataset.tab); });
        });

        // ── Admin panel: overlay, hamburger menü ─────────────────
        var overlay = document.getElementById('overlay');
        if (overlay) overlay.addEventListener('click', function () { closeSide(); });

        var menuBtn = document.querySelector('#head .menu-btn');
        if (menuBtn) menuBtn.addEventListener('click', function () { openSide(); });

        // ── Admin panel: bildirim ve tema ────────────────────────
        var notifBtn = document.getElementById('notif-btn');
        if (notifBtn) notifBtn.addEventListener('click', function (e) { toggleNotifPanel(e); });

        var themeBtn = document.getElementById('theme-btn');
        if (themeBtn) themeBtn.addEventListener('click', function () { toggleTheme(); });

        // ── Admin çıkış ──────────────────────────────────────────
        var logoutBtn = document.getElementById('side-logout-btn') || document.querySelector('#side .btn.bs.w100');
        if (logoutBtn) logoutBtn.addEventListener('click', function () { doLogout(); });

        // ── Sol menü navigasyon butonları (ni-xxx) ───────────────
        document.querySelectorAll('[id^="ni-"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var page = this.id.replace('ni-', '');
                go(page);
            });
        });

        // ── Alt menü navigasyon butonları (bn-xxx) ───────────────
        document.querySelectorAll('[id^="bn-"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var page = this.id.replace('bn-', '');
                go(page);
            });
        });

        // ── Accordion grupları ───────────────────────────────────
        document.querySelectorAll('.acc-group').forEach(function (group) {
            var header = group.querySelector('.acc-header');
            if (header) {
                var groupId = group.id ? group.id.replace('accg-', '') : '';
                header.addEventListener('click', function () {
                    if (groupId) toggleAccordion(groupId);
                });
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attach);
    } else {
        attach();
    }
})();
