// ═══════════════════════════════════════════════════════════
// ÖN KAYIT HATA DÜZELTMELERİ — Bu dosya script.js'den SONRA yüklenir
// showOnKayitForm, submitOnKayit, loadOnKayitlar fonksiyonlarını override eder
// ═══════════════════════════════════════════════════════════

// Override: showOnKayitForm — settings tablosundan da org/branch çekmeyi dene
window.showOnKayitForm = async function() {
    let classes = AppState.data.classes || [];
    let formOrgId    = AppState.currentOrgId    || '';
    let formBranchId = AppState.currentBranchId || '';

    // 1) Sınıfları çek (giriş yapmamış kullanıcı için de)
    if (classes.length === 0) {
        try {
            const sb = getSupabase();
            if (sb) {
                const { data } = await sb.from('classes').select('*').limit(50);
                if (data && data.length > 0) {
                    classes = data.map(DB.mappers.toClass);
                    if (!formOrgId)    formOrgId    = data[0].org_id    || '';
                    if (!formBranchId) formBranchId = data[0].branch_id || '';
                }
            }
        } catch(e) { console.warn('showOnKayitForm classes error:', e); }
    }

    // 2) Hâlâ org/branch yoksa settings tablosundan dene
    if (!formOrgId && !formBranchId) {
        try {
            const sb = getSupabase();
            if (sb) {
                const { data: settingsRows } = await sb.from('settings').select('org_id, branch_id').limit(1);
                if (settingsRows && settingsRows.length > 0) {
                    formOrgId    = settingsRows[0].org_id    || '';
                    formBranchId = settingsRows[0].branch_id || '';
                }
            }
        } catch(e) { console.warn('showOnKayitForm settings fallback error:', e); }
    }

    // 3) Son çare: athletes tablosundan dene
    if (!formOrgId && !formBranchId) {
        try {
            const sb = getSupabase();
            if (sb) {
                const { data: athRows } = await sb.from('athletes').select('org_id, branch_id').limit(1);
                if (athRows && athRows.length > 0) {
                    formOrgId    = athRows[0].org_id    || '';
                    formBranchId = athRows[0].branch_id || '';
                }
            }
        } catch(e) { /* ignore */ }
    }

    const classOptions = classes.map(c =>
        `<option value="${FormatUtils.escape(c.id)}" data-name="${FormatUtils.escape(c.name)}">${FormatUtils.escape(c.name)}</option>`
    ).join('');
    
    const formHtml = `
    <div id="onkayit-modal" style="position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:2000;padding:16px;">
        <input type="hidden" id="ok-org-id" value="${formOrgId}"/>
        <input type="hidden" id="ok-branch-id" value="${formBranchId}"/>
        <div style="background:var(--bg2);border:1px solid var(--border);border-radius:16px;width:100%;max-width:520px;max-height:90vh;display:flex;flex-direction:column;overflow:hidden;">
            <div style="padding:20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
                <div>
                    <div style="font-size:18px;font-weight:800">📝 Ön Kayıt Formu</div>
                    <div style="font-size:12px;color:var(--text2)">Bilgilerinizi eksiksiz doldurunuz</div>
                </div>
                <button onclick="document.getElementById('onkayit-modal').remove()" style="background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:6px;cursor:pointer;color:var(--text)">✕</button>
            </div>
            <div style="padding:20px;overflow-y:auto;flex:1">
                <div style="background:rgba(59,130,246,.1);border:1px solid rgba(59,130,246,.3);border-radius:8px;padding:12px;font-size:13px;color:var(--blue2);margin-bottom:16px">
                    ℹ️ Ön kayıt talebiniz yöneticimize iletilecektir.
                </div>
                <div class="tw6 tsm mb2">Öğrenci Bilgileri</div>
                <div class="g21 mb2">
                    <div class="fgr"><label>Ad *</label><input id="ok-fn" placeholder="Adı"/></div>
                    <div class="fgr"><label>Soyad *</label><input id="ok-ln" placeholder="Soyadı"/></div>
                </div>
                <div class="g21 mb2">
                    <div class="fgr"><label>Doğum Tarihi *</label><input id="ok-bd" type="date"/></div>
                    <div class="fgr"><label>TC Kimlik No</label><input id="ok-tc" type="text" inputmode="numeric" maxlength="11" placeholder="11 Haneli TC"/></div>
                </div>
                <div class="fgr mb2">
                    <label>Kayıt Olmak İstediği Sınıf *</label>
                    <select id="ok-cls">
                        <option value="">Sınıf Seçiniz</option>
                        ${classOptions}
                    </select>
                </div>
                <div class="dv"></div>
                <div class="tw6 tsm mb2">Veli Bilgileri</div>
                <div class="g21 mb2">
                    <div class="fgr"><label>Veli Adı *</label><input id="ok-pn" placeholder="Adı Soyadı"/></div>
                    <div class="fgr"><label>Veli Soyadı</label><input id="ok-psn" placeholder="Soyadı"/></div>
                </div>
                <div class="fgr mb2">
                    <label>Veli Telefon * (SMS gönderilecek)</label>
                    <input id="ok-pph" type="tel" placeholder="05XX XXX XX XX"/>
                </div>
                <div style="font-size:12px;color:var(--text3)">📱 Kayıt onayı SMS olarak gönderilecektir.</div>
            </div>
            <div style="padding:16px;border-top:1px solid var(--border);display:flex;gap:12px;justify-content:flex-end;background:var(--bg3);border-radius:0 0 16px 16px">
                <button class="btn bs" onclick="document.getElementById('onkayit-modal').remove()">İptal</button>
                <button class="btn bp" onclick="submitOnKayit()">Ön Kayıt Yap</button>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', formHtml);
    setTimeout(() => setupTCInput('ok-tc'), 100);
};

// Override: submitOnKayit — hata yönetimi ve DB insert düzeltmesi
window.submitOnKayit = async function() {
    const fn = document.getElementById('ok-fn')?.value.trim();
    const ln = document.getElementById('ok-ln')?.value.trim();
    const bd = document.getElementById('ok-bd')?.value;
    const tc = document.getElementById('ok-tc')?.value.replace(/\D/g,'');
    const clsEl = document.getElementById('ok-cls');
    const clsId = clsEl?.value;
    const clsName = clsEl?.options[clsEl.selectedIndex]?.dataset?.name || clsEl?.options[clsEl.selectedIndex]?.textContent || '';
    const pn = document.getElementById('ok-pn')?.value.trim();
    const psn = document.getElementById('ok-psn')?.value.trim();
    const pph = document.getElementById('ok-pph')?.value.trim();
    
    if (!fn || !ln || !bd || !clsId || !pn || !pph) {
        toast('Lütfen zorunlu alanları doldurunuz!', 'e');
        return;
    }
    
    const resolvedOrgId    = AppState.currentOrgId    || document.getElementById('ok-org-id')?.value    || '';
    const resolvedBranchId = AppState.currentBranchId || document.getElementById('ok-branch-id')?.value || '';

    if (!resolvedOrgId && !resolvedBranchId) {
        toast('Kurum bilgisi alınamadı. Lütfen tekrar deneyin.', 'e');
        return;
    }

    const onKayitId = generateId();
    const studentName = `${fn} ${ln}`;
    const parentName = psn ? `${pn} ${psn}` : pn;
    const createdAt = DateUtils.today();
    
    // Veritabanına kaydet
    let dbSuccess = false;
    try {
        const sb = getSupabase();
        if (sb) {
            const insertData = {
                id: onKayitId,
                student_name: studentName,
                fn: fn,
                ln: ln,
                bd: bd || null,
                tc: tc || null,
                cls_id: clsId || null,
                class_name: clsName,
                parent_name: parentName,
                parent_phone: pph,
                status: 'new',
                created_at: createdAt,
                org_id: resolvedOrgId,
                branch_id: resolvedBranchId
            };
            
            console.log('Inserting on_kayit:', insertData);
            
            const { data, error } = await sb.from('on_kayitlar').insert(insertData).select();
            
            if (error) {
                console.error('on_kayitlar insert error:', error);
                // Hata detayını göster
                toast(`Kayıt hatası: ${error.message || error.details || JSON.stringify(error)}`, 'e');
            } else {
                dbSuccess = true;
                console.log('on_kayitlar insert success:', data);
            }
        }
    } catch(e) {
        console.error('On kayit db exception:', e);
        toast(`Kayıt hatası: ${e.message}`, 'e');
    }
    
    // Lokal state'e de ekle (panel açıksa hemen görünsün)
    if (!AppState.data.onKayitlar) AppState.data.onKayitlar = [];
    AppState.data.onKayitlar.unshift({
        id: onKayitId,
        studentName: studentName,
        fn, ln, bd, tc,
        clsId, className: clsName,
        parentName: parentName,
        parentPhone: pph,
        status: 'new',
        createdAt: createdAt,
        orgId: resolvedOrgId,
        branchId: resolvedBranchId
    });
    
    // Badge güncelle
    const newCount = AppState.data.onKayitlar.filter(o => o.status === 'new').length;
    const badge = document.getElementById('onkayit-badge');
    if (badge) {
        badge.textContent = newCount;
        if (newCount > 0) badge.classList.remove('dn');
    }
    
    // SMS gönder
    await sendOnKayitSms(pph, fn, ln, clsName);
    
    document.getElementById('onkayit-modal')?.remove();
    
    if (dbSuccess) {
        toast(`✅ Ön kayıt başarıyla alındı! ${pph} numarasına SMS gönderildi.`, 'g');
    } else {
        toast(`⚠️ Ön kayıt yerel olarak kaydedildi ancak sunucuya gönderilemedi. Lütfen yöneticiye bildirin.`, 'e');
    }
};

// Override: loadOnKayitlar — daha sağlam sorgu, fallback mekanizması
async function loadOnKayitlar() {
    try {
        const sb = getSupabase();
        if (!sb) return;

        const bid = AppState.currentBranchId;
        const oid = AppState.currentOrgId;

        if (!bid && !oid) {
            console.warn('loadOnKayitlar: org/branch id yok');
            return;
        }

        // Önce branch_id ile dene
        let data = null;
        let error = null;

        if (bid) {
            const result = await sb.from('on_kayitlar').select('*').eq('branch_id', bid).order('created_at', { ascending: false });
            data = result.data;
            error = result.error;
        }

        // branch_id ile sonuç yoksa veya hata varsa, org_id ile dene
        if ((!data || data.length === 0) && oid) {
            const result = await sb.from('on_kayitlar').select('*').eq('org_id', oid).order('created_at', { ascending: false });
            data = result.data;
            error = result.error;
        }

        // Hâlâ sonuç yoksa filtresiz dene (tek akademi senaryosu)
        if ((!data || data.length === 0) && !error) {
            const result = await sb.from('on_kayitlar').select('*').order('created_at', { ascending: false }).limit(100);
            data = result.data;
            error = result.error;
        }

        if (error) {
            console.warn('On kayit sorgu hatası:', error);
            return;
        }
        
        if (data) {
            AppState.data.onKayitlar = data.map(r => ({
                id: r.id,
                studentName: r.student_name || `${r.fn || ''} ${r.ln || ''}`.trim(),
                fn: r.fn || (r.student_name ? r.student_name.split(' ')[0] : '') || '',
                ln: r.ln || (r.student_name ? r.student_name.split(' ').slice(1).join(' ') : '') || '',
                bd: r.bd || r.birth_date || '',
                tc: r.tc || '',
                clsId: r.cls_id || '',
                className: r.class_name || '',
                parentName: r.parent_name || '',
                parentPhone: r.parent_phone || '',
                status: r.status || 'new',
                createdAt: r.created_at || '',
                orgId: r.org_id || '',
                branchId: r.branch_id || ''
            }));
            
            console.log(`loadOnKayitlar: ${data.length} kayıt yüklendi`);
            
            // Badge güncelle
            const newCount = AppState.data.onKayitlar.filter(o => o.status === 'new').length;
            const badge = document.getElementById('onkayit-badge');
            if (badge) {
                if (newCount > 0) { badge.textContent = newCount; badge.classList.remove('dn'); }
                else { badge.classList.add('dn'); }
            }
        }
    } catch(e) {
        console.warn('On kayitlar yükleme hatası:', e);
    }
}

// convertOnKayit'ı da düzelt — prefill mapping
window.convertOnKayit = function(id) {
    const ok = AppState.data.onKayitlar.find(x => x.id === id);
    if (!ok) return;
    closeModal();
    
    // Sınıf ID'sini bul
    const cls = AppState.data.classes.find(c => c.id === ok.clsId || c.name === ok.className);
    
    // editAth'a prefill olarak gönder
    editAth(null, {
        fn: ok.fn || '',
        ln: ok.ln || '',
        tc: ok.tc || '',
        bd: ok.bd || '',
        pn: ok.parentName || '',
        pph: ok.parentPhone || '',
        clsId: cls?.id || ok.clsId || '',
        sp: ''
    });
    
    // Ön kaydı "done" olarak işaretle
    setTimeout(async () => {
        try {
            const sb = getSupabase();
            if (sb) await sb.from('on_kayitlar').update({ status: 'done' }).eq('id', id);
            const idx = AppState.data.onKayitlar.findIndex(x => x.id === id);
            if (idx >= 0) AppState.data.onKayitlar[idx].status = 'done';
        } catch(e) { console.warn('convertOnKayit status update error:', e); }
    }, 500);
};

console.log('✅ Ön kayıt hata düzeltmeleri yüklendi');
