// =================================================================
// ux-enhancements.js — Kullanım Kolaylığı İyileştirmeleri
// İzole eklenti: mevcut kodu değiştirmez (delAth/delPay hariç minimal hook).
//   1. Tablo sıralama (sort)      — liste başlıklarına tıkla
//   2. Global arama (Ctrl/Cmd+K)  — her yerden sporcu/ödeme ara
//   3. Silmede geri al (undo)     — window.showUndoToast() helper
// Tüm fonksiyonlar defansif: AppState/DB/go yoksa sessiz çıkar.
// =================================================================
(function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────
    // ORTAK YARDIMCILAR
    // ─────────────────────────────────────────────────────────────
    function esc(s) {
        if (window.FormatUtils && FormatUtils.escape) return FormatUtils.escape(s);
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // ═════════════════════════════════════════════════════════════
    // 1) TABLO SIRALAMA (generic, DOM tabanlı)
    // ═════════════════════════════════════════════════════════════
    // Hücre değerini karşılaştırılabilir tipe çevir: sayı / tarih / metin
    function cellValue(td) {
        var raw = (td.getAttribute('data-sort') || td.textContent || '').trim();

        // Tarih: DD.MM.YYYY veya DD/MM/YYYY
        var dm = raw.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/);
        if (dm) return { t: 'n', v: +(dm[3] + dm[2].padStart(2, '0') + dm[1].padStart(2, '0')) };
        // Tarih: YYYY-MM-DD
        var dm2 = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dm2) return { t: 'n', v: +(dm2[1] + dm2[2] + dm2[3]) };

        // Para / sayı: "1.234,56 ₺" → 1234.56  |  "1,234.56" de desteklenir
        var num = raw.replace(/[₺$€\s]/g, '');
        if (/^-?[\d.,]+%?$/.test(num) && /\d/.test(num)) {
            var cleaned;
            if (num.indexOf(',') > -1 && num.indexOf('.') > -1) {
                // Hangi ayraç son? Türkçe: nokta=binlik, virgül=ondalık
                cleaned = num.lastIndexOf(',') > num.lastIndexOf('.')
                    ? num.replace(/\./g, '').replace(',', '.')
                    : num.replace(/,/g, '');
            } else if (num.indexOf(',') > -1) {
                cleaned = num.replace(',', '.');
            } else {
                cleaned = num;
            }
            cleaned = cleaned.replace('%', '');
            var f = parseFloat(cleaned);
            if (!isNaN(f)) return { t: 'n', v: f };
        }

        // Metin (Türkçe locale)
        return { t: 's', v: raw.toLocaleLowerCase('tr') };
    }

    function sortTable(table, colIndex, dir) {
        var tbody = table.tBodies[0];
        if (!tbody) return;
        var rows = Array.prototype.slice.call(tbody.rows);
        if (rows.length < 2) return;

        rows.sort(function (a, b) {
            var ca = a.cells[colIndex], cb = b.cells[colIndex];
            if (!ca || !cb) return 0;
            var va = cellValue(ca), vb = cellValue(cb);
            var res;
            if (va.t === 'n' && vb.t === 'n') res = va.v - vb.v;
            else res = String(va.v).localeCompare(String(vb.v), 'tr', { numeric: true });
            return dir === 'desc' ? -res : res;
        });

        var frag = document.createDocumentFragment();
        rows.forEach(function (r) { frag.appendChild(r); });
        tbody.appendChild(frag);
    }

    function makeHeaderSortable(table) {
        if (table.getAttribute('data-ux-sort') === '1') return;
        var thead = table.tHead;
        if (!thead || !thead.rows.length) return;
        table.setAttribute('data-ux-sort', '1');

        var ths = thead.rows[thead.rows.length - 1].cells;
        Array.prototype.forEach.call(ths, function (th, idx) {
            var label = (th.textContent || '').trim();
            // İşlem/boş sütunları atla
            if (!label || /İşlem|İşlemler|Actions/i.test(label)) return;

            th.style.cursor = 'pointer';
            th.style.userSelect = 'none';
            th.title = 'Sıralamak için tıkla';
            if (th.querySelector('.ux-sort-ar') == null) {
                var ar = document.createElement('span');
                ar.className = 'ux-sort-ar';
                ar.style.cssText = 'opacity:.35;font-size:10px;margin-left:4px';
                ar.textContent = '⇅';
                th.appendChild(ar);
            }

            th.addEventListener('click', function () {
                var cur = table.getAttribute('data-ux-col');
                var curDir = table.getAttribute('data-ux-dir') || 'asc';
                var dir = (String(idx) === cur && curDir === 'asc') ? 'desc' : 'asc';
                table.setAttribute('data-ux-col', String(idx));
                table.setAttribute('data-ux-dir', dir);

                sortTable(table, idx, dir);

                // Ok göstergelerini güncelle
                Array.prototype.forEach.call(ths, function (h) {
                    var a = h.querySelector('.ux-sort-ar');
                    if (a) { a.textContent = '⇅'; a.style.opacity = '.35'; }
                });
                var arr = th.querySelector('.ux-sort-ar');
                if (arr) { arr.textContent = dir === 'asc' ? '▲' : '▼'; arr.style.opacity = '1'; }
            });
        });
    }

    function scanTables() {
        var root = document.getElementById('main') || document.body;
        var tables = root.querySelectorAll('table');
        Array.prototype.forEach.call(tables, makeHeaderSortable);
    }

    // #main içeriği her değiştiğinde (go() render) sıralamayı yeniden bağla
    function initSortObserver() {
        var main = document.getElementById('main');
        if (!main) { setTimeout(initSortObserver, 500); return; }
        var deb;
        var obs = new MutationObserver(function () {
            clearTimeout(deb);
            deb = setTimeout(scanTables, 80);
        });
        obs.observe(main, { childList: true, subtree: true });
        scanTables();
    }

    // ═════════════════════════════════════════════════════════════
    // 2) SİLMEDE GERİ AL — window.showUndoToast(msg, onUndo)
    // ═════════════════════════════════════════════════════════════
    window.showUndoToast = function (msg, onUndo, seconds) {
        seconds = seconds || 6;
        var old = document.getElementById('ux-undo');
        if (old) old.remove();

        var box = document.createElement('div');
        box.id = 'ux-undo';
        box.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%) translateY(20px);' +
            'background:#1f2937;color:#fff;padding:12px 16px;border-radius:10px;display:flex;align-items:center;gap:14px;' +
            'box-shadow:0 8px 30px rgba(0,0,0,.4);z-index:100001;font-size:14px;opacity:0;transition:all .25s;max-width:92vw';

        var txt = document.createElement('span');
        txt.textContent = msg;

        var btn = document.createElement('button');
        btn.textContent = '↶ Geri Al';
        btn.style.cssText = 'background:#3b82f6;color:#fff;border:0;border-radius:7px;padding:7px 14px;font-weight:700;cursor:pointer;font-size:13px;white-space:nowrap';

        var timer;
        function close() {
            clearTimeout(timer);
            box.style.opacity = '0';
            box.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(function () { box.remove(); }, 250);
        }

        btn.addEventListener('click', function () {
            btn.disabled = true;
            btn.textContent = '⏳';
            Promise.resolve(typeof onUndo === 'function' ? onUndo() : null)
                .then(function () { close(); })
                .catch(function (e) {
                    console.error('[undo] hata:', e);
                    if (window.toast) toast('Geri alma başarısız', 'e');
                    close();
                });
        });

        box.appendChild(txt);
        box.appendChild(btn);
        document.body.appendChild(box);
        requestAnimationFrame(function () {
            box.style.opacity = '1';
            box.style.transform = 'translateX(-50%) translateY(0)';
        });
        timer = setTimeout(close, seconds * 1000);
    };

    // ═════════════════════════════════════════════════════════════
    // 3) GLOBAL ARAMA (Ctrl/Cmd + K)
    // ═════════════════════════════════════════════════════════════
    var searchOpen = false;

    function buildOverlay() {
        var ov = document.createElement('div');
        ov.id = 'ux-search-ov';
        ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:100000;display:flex;' +
            'align-items:flex-start;justify-content:center;padding-top:12vh;backdrop-filter:blur(2px)';

        var panel = document.createElement('div');
        panel.style.cssText = 'background:var(--bg2,#161b22);border:1px solid var(--border,#30363d);border-radius:14px;' +
            'width:560px;max-width:92vw;max-height:70vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.5);display:flex;flex-direction:column';

        var input = document.createElement('input');
        input.id = 'ux-search-in';
        input.type = 'text';
        input.placeholder = '🔍 Sporcu adı, TC, ödeme açıklaması ara…';
        input.autocomplete = 'off';
        input.style.cssText = 'width:100%;padding:16px 18px;border:0;border-bottom:1px solid var(--border,#30363d);' +
            'background:transparent;color:var(--text,#c9d1d9);font-size:16px;outline:none;box-sizing:border-box';

        var results = document.createElement('div');
        results.id = 'ux-search-res';
        results.style.cssText = 'overflow-y:auto;padding:6px';

        var hint = document.createElement('div');
        hint.style.cssText = 'padding:14px 18px;color:var(--text3,#8b949e);font-size:12px;border-top:1px solid var(--border,#30363d)';
        hint.innerHTML = '<b>↑↓</b> gez &nbsp; <b>Enter</b> aç &nbsp; <b>Esc</b> kapat';

        panel.appendChild(input);
        panel.appendChild(results);
        panel.appendChild(hint);
        ov.appendChild(panel);

        ov.addEventListener('click', function (e) { if (e.target === ov) closeSearch(); });
        input.addEventListener('input', function () { renderResults(input.value); });
        input.addEventListener('keydown', onSearchKey);

        return ov;
    }

    function searchData(q) {
        q = (q || '').trim().toLocaleLowerCase('tr');
        var out = [];
        if (!q || !window.AppState || !AppState.data) return out;

        var ql = q.replace(/\s+/g, ' ');
        // Sporcular
        (AppState.data.athletes || []).forEach(function (a) {
            var name = ((a.fn || '') + ' ' + (a.ln || '')).toLocaleLowerCase('tr');
            if (name.indexOf(ql) > -1 || (a.tc || '').indexOf(q) > -1) {
                out.push({
                    type: 'ath', id: a.id,
                    title: ((a.fn || '') + ' ' + (a.ln || '')).trim(),
                    sub: '👤 Sporcu' + (a.tc ? ' • ' + a.tc : '') + (a.sp ? ' • ' + a.sp : '')
                });
            }
        });
        // Ödemeler
        (AppState.data.payments || []).forEach(function (p) {
            var hay = ((p.ds || '') + ' ' + (p.an || '') + ' ' + (p.amt || '')).toLocaleLowerCase('tr');
            if (hay.indexOf(ql) > -1) {
                var amt = window.FormatUtils && FormatUtils.currency ? FormatUtils.currency(p.amt || 0) : (p.amt || 0) + '₺';
                out.push({
                    type: 'pay', id: p.id,
                    title: (p.ds || p.an || 'Ödeme') + ' — ' + amt,
                    sub: '💳 ' + (p.an || '') + (p.dt ? ' • ' + p.dt : '') + ' • ' + (p.st || '')
                });
            }
        });
        return out.slice(0, 40);
    }

    var curResults = [], curIdx = 0;

    function renderResults(q) {
        var box = document.getElementById('ux-search-res');
        if (!box) return;
        curResults = searchData(q);
        curIdx = 0;
        if (!q.trim()) {
            box.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text3,#8b949e);font-size:13px">Aramaya başla…</div>';
            return;
        }
        if (!curResults.length) {
            box.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text3,#8b949e);font-size:13px">Sonuç bulunamadı.</div>';
            return;
        }
        box.innerHTML = curResults.map(function (r, i) {
            return '<div class="ux-sr" data-i="' + i + '" style="padding:10px 14px;border-radius:8px;cursor:pointer;' +
                (i === 0 ? 'background:var(--bg3,#21262d)' : '') + '">' +
                '<div style="font-weight:600;color:var(--text,#c9d1d9);font-size:14px">' + esc(r.title) + '</div>' +
                '<div style="font-size:12px;color:var(--text3,#8b949e);margin-top:2px">' + esc(r.sub) + '</div>' +
                '</div>';
        }).join('');

        Array.prototype.forEach.call(box.querySelectorAll('.ux-sr'), function (el) {
            el.addEventListener('click', function () { openResult(+el.getAttribute('data-i')); });
            el.addEventListener('mouseenter', function () { highlight(+el.getAttribute('data-i')); });
        });
    }

    function highlight(i) {
        curIdx = i;
        var box = document.getElementById('ux-search-res');
        if (!box) return;
        Array.prototype.forEach.call(box.querySelectorAll('.ux-sr'), function (el) {
            el.style.background = (+el.getAttribute('data-i') === i) ? 'var(--bg3,#21262d)' : '';
        });
    }

    function openResult(i) {
        var r = curResults[i];
        if (!r) return;
        closeSearch();
        if (typeof window.go !== 'function') return;
        if (r.type === 'ath') go('athleteProfile', { id: r.id });
        else if (r.type === 'pay') go('payments');
    }

    function onSearchKey(e) {
        if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); if (curResults.length) highlight(Math.min(curIdx + 1, curResults.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); if (curResults.length) highlight(Math.max(curIdx - 1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); if (curResults.length) openResult(curIdx); }
    }

    function openSearch() {
        if (searchOpen) return;
        // Sadece giriş yapılmış admin/antrenör için (sporcu portalında gerek yok)
        if (!window.AppState || !AppState.currentUser) return;
        searchOpen = true;
        var ov = buildOverlay();
        document.body.appendChild(ov);
        var input = document.getElementById('ux-search-in');
        renderResults('');
        if (input) input.focus();
    }

    function closeSearch() {
        searchOpen = false;
        var ov = document.getElementById('ux-search-ov');
        if (ov) ov.remove();
    }

    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            if (searchOpen) closeSearch(); else openSearch();
        }
    });

    // ─────────────────────────────────────────────────────────────
    // BAŞLAT
    // ─────────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSortObserver);
    } else {
        initSortObserver();
    }

    console.log('✅ ux-enhancements.js yüklendi (sıralama + Ctrl+K arama + geri al)');
})();
