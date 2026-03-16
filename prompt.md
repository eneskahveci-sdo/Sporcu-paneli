# 🔧 Dragos Futbol Akademisi — Hata Tespiti ve Düzeltme Kılavuzu

> **ÖNEMLİ KURAL:** `script.js` dosyası hiçbir şekilde değiştirilmeyecek! Tüm düzeltmeler `script-fixes.js`, `vercel.json`, `Security.js` veya yeni Edge Function dosyaları üzerinden yapılacak. Mevcut çalışan hiçbir fonksiyon bozulmayacak!

---

## HATA #1 — KRİTİK: PayTR iframe CSP (Content Security Policy) Tarafından Engelleniyor

### Sorun
`vercel.json` içindeki CSP başlığında `frame-src` direktifi tanımlı değil. PayTR ödeme iframe'i `https://www.paytr.com/odeme/guvenli/...` adresinden yükleniyor ama tarayıcı bunu engelliyor. Ayrıca `X-Frame-Options: DENY` başlığı da tüm iframe'leri engelliyor.

**Ek sorun:** `Permissions-Policy: payment=()` başlığı Payment Request API'yi devre dışı bırakıyor.

### Dosya: `vercel.json`
### Çözüm

CSP başlığına `frame-src` direktifini ekle ve `X-Frame-Options`'ı PayTR iframe'i için uyumlu hale getir:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" },
        { "key": "X-XSS-Protection", "value": "1; mode=block" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com https://esm.sh https://cdn.skypack.dev; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; connect-src 'self' https://*.supabase.co https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://unpkg.com https://esm.sh https://cdn.skypack.dev https://graph.facebook.com https://www.paytr.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; frame-src https://www.paytr.com; frame-ancestors 'self'; object-src 'none'; base-uri 'self'" }
      ]
    }
  ]
}
```

**Değişiklikler:**
1. `frame-src https://www.paytr.com` eklendi (iframe izni)
2. `frame-ancestors 'none'` → `frame-ancestors 'self'` olarak değiştirildi
3. `X-Frame-Options: DENY` → `X-Frame-Options: SAMEORIGIN` olarak değiştirildi
4. `Permissions-Policy`'den `payment=()` kaldırıldı

---

## HATA #2 — KRİTİK: `paytr-token` Edge Function Mevcut Değil

### Sorun
`script.js` satır 4685'te `sb.functions.invoke('paytr-token', {...})` çağrılıyor ama `supabase/functions/` dizininde sadece `send-sms` fonksiyonu var. `paytr-token` fonksiyonu hiç oluşturulmamış. Bu yüzden PayTR ödeme tokeni alınamıyor.

### Dosya: `supabase/functions/paytr-token/index.ts` (YENİ OLUŞTURULACAK)
### Çözüm

`supabase/functions/paytr-token/index.ts` dosyasını oluştur:

```typescript
// Supabase Edge Function: paytr-token
// PayTR iframe token'ı sunucu tarafında oluşturur.
// Merchant Key ve Salt yalnızca Supabase Secrets'tan okunur — frontend'e asla gönderilmez.

import { createHmac } from "node:crypto";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  // API key doğrulama
  const apikey = req.headers.get('apikey') || req.headers.get('authorization')?.replace('Bearer ', '');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!apikey || !supabaseAnonKey || apikey !== supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json();

    const merchantId = body.merchant_id;
    const merchantKey = Deno.env.get('PAYTR_MERCHANT_KEY');
    const merchantSalt = Deno.env.get('PAYTR_MERCHANT_SALT');

    if (!merchantId || !merchantKey || !merchantSalt) {
      return new Response(
        JSON.stringify({ error: 'PayTR yapılandırması eksik. Supabase Secrets kontrol edin.' }),
        { status: 503, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const merchantOid = body.merchant_oid;
    const email = body.email;
    const paymentAmount = body.payment_amount; // kuruş cinsinden
    const userName = body.user_name;
    const userAddress = body.user_address || 'Türkiye';
    const userPhone = body.user_phone;
    const merchantOkUrl = body.merchant_ok_url;
    const merchantFailUrl = body.merchant_fail_url;
    const userBasket = body.user_basket; // JSON string
    const currency = body.currency || 'TL';
    const testMode = body.test_mode || '0';
    const noInstallment = '1';
    const maxInstallment = '0';
    const userIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const timeout_limit = '30';
    const debug_on = '0';

    // PayTR token hash hesaplama
    // Hash string: merchant_id + user_ip + merchant_oid + email + payment_amount +
    //              user_basket + no_installment + max_installment + currency + test_mode
    const hashStr = `${merchantId}${userIp}${merchantOid}${email}${paymentAmount}${userBasket}${noInstallment}${maxInstallment}${currency}${testMode}`;
    
    // HMAC hesapla: hash(hashStr + merchantSalt, merchantKey)
    const paytrToken = createHmac('sha256', merchantKey)
      .update(hashStr + merchantSalt)
      .digest('base64');

    // PayTR API'ye token isteği gönder
    const formData = new URLSearchParams();
    formData.append('merchant_id', merchantId);
    formData.append('user_ip', userIp);
    formData.append('merchant_oid', merchantOid);
    formData.append('email', email);
    formData.append('payment_amount', String(paymentAmount));
    formData.append('paytr_token', paytrToken);
    formData.append('user_basket', userBasket);
    formData.append('user_name', userName);
    formData.append('user_address', userAddress);
    formData.append('user_phone', userPhone);
    formData.append('merchant_ok_url', merchantOkUrl);
    formData.append('merchant_fail_url', merchantFailUrl);
    formData.append('timeout_limit', timeout_limit);
    formData.append('debug_on', debug_on);
    formData.append('no_installment', noInstallment);
    formData.append('max_installment', maxInstallment);
    formData.append('currency', currency);
    formData.append('test_mode', testMode);
    formData.append('lang', 'tr');

    const paytrResp = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      body: formData,
    });

    const paytrResult = await paytrResp.json();

    if (paytrResult.status === 'success') {
      return new Response(
        JSON.stringify({ token: paytrResult.token }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    } else {
      console.error('PayTR token hatası:', paytrResult);
      return new Response(
        JSON.stringify({ error: paytrResult.reason || 'Token alınamadı' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

  } catch (err) {
    console.error('PayTR token edge function hatası:', err);
    return new Response(
      JSON.stringify({ error: 'Sunucu hatası: ' + (err as Error).message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
```

**Sonrasında Supabase CLI ile deploy et:**
```bash
supabase functions deploy paytr-token --no-verify-jwt
```

**Supabase Secrets ayarla:**
```bash
supabase secrets set PAYTR_MERCHANT_KEY=XXXXXXX PAYTR_MERCHANT_SALT=XXXXXXX
```

---

## HATA #3 — KRİTİK: `paytr-webhook` Edge Function Mevcut Değil

### Sorun
PayTR, ödeme sonucu için webhook çağrısı yapar. `script.js` satır 3679'da webhook URL'i gösteriliyor (`/functions/v1/paytr-webhook`) ama bu fonksiyon oluşturulmamış. Ödeme tamamlansa bile `payments` tablosu güncellenmez.

### Dosya: `supabase/functions/paytr-webhook/index.ts` (YENİ OLUŞTURULACAK)
### Çözüm

`supabase/functions/paytr-webhook/index.ts` dosyasını oluştur:

```typescript
// Supabase Edge Function: paytr-webhook
// PayTR ödeme sonucu webhook callback'i.
// PayTR bu endpoint'e POST yapar, hash doğrulaması yapılır, payments tablosu güncellenir.

import { createHmac } from "node:crypto";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await req.formData();

    const merchantOid = formData.get('merchant_oid') as string;
    const status = formData.get('status') as string; // 'success' veya 'failed'
    const totalAmount = formData.get('total_amount') as string;
    const hash = formData.get('hash') as string;
    const failedReasonCode = formData.get('failed_reason_code') as string || '';
    const failedReasonMsg = formData.get('failed_reason_msg') as string || '';

    const merchantKey = Deno.env.get('PAYTR_MERCHANT_KEY');
    const merchantSalt = Deno.env.get('PAYTR_MERCHANT_SALT');

    if (!merchantKey || !merchantSalt) {
      console.error('PayTR webhook: Secrets eksik');
      return new Response('OK', { status: 200 }); // PayTR'ye OK dönmezsen tekrar dener
    }

    // Hash doğrulama
    const hashStr = `${merchantOid}${merchantSalt}${status}${totalAmount}`;
    const expectedHash = createHmac('sha256', merchantKey)
      .update(hashStr)
      .digest('base64');

    if (hash !== expectedHash) {
      console.error('PayTR webhook: Hash doğrulaması başarısız!');
      return new Response('OK', { status: 200 });
    }

    // Supabase service_role client (RLS bypass)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(supabaseUrl, supabaseServiceKey);

    if (status === 'success') {
      await sb.from('payments').update({
        st: 'completed',
        source: 'paytr',
        notif_status: 'approved',
        pay_method: 'paytr'
      }).eq('id', merchantOid);

      console.log(`PayTR webhook: Ödeme başarılı — ${merchantOid}`);
    } else {
      await sb.from('payments').update({
        st: 'failed',
        notif_status: ''
      }).eq('id', merchantOid);

      console.log(`PayTR webhook: Ödeme başarısız — ${merchantOid} — ${failedReasonCode}: ${failedReasonMsg}`);
    }

    // PayTR'ye mutlaka "OK" dönülmeli, aksi halde tekrar tekrar çağırır
    return new Response('OK', { status: 200 });

  } catch (err) {
    console.error('PayTR webhook hatası:', err);
    return new Response('OK', { status: 200 });
  }
});
```

**Deploy:**
```bash
supabase functions deploy paytr-webhook --no-verify-jwt
```

---

## HATA #4 — KRİTİK: Sporcu/Veli `anon` Role ile `payments` Tablosuna INSERT Yapamıyor

### Sorun
Sporcu/veli girişi Supabase Auth kullanmıyor — `login_with_tc` RPC ile doğrulama yapılıyor ve tüm sorgular `anon` key ile çalışıyor. Ancak RLS_POLICIES.sql'de `payments` tablosuna `anon` rolünün sadece `SELECT` izni var. INSERT/UPDATE yok. Bu yüzden:
- Havale/Nakit ödeme bildirimi gönderilemiyor (`submitSpPayment` → satır 4643)
- PayTR pending ödeme kaydı oluşturulamıyor (`initiatePayTRPayment` → satır 4727)

### Dosya: Supabase SQL Editor'de çalıştırılacak SQL
### Çözüm

Aşağıdaki SQL'i Supabase Dashboard → SQL Editor'de çalıştır:

```sql
-- Sporcu/veli paneli anon role ile ödeme bildirimi ve PayTR pending kayıt oluşturabilmeli
GRANT INSERT ON payments TO anon;

-- Mevcut RLS policy zaten authenticated için var, anon için INSERT policy ekle
CREATE POLICY "payments_insert_anon" ON payments
  FOR INSERT TO anon
  WITH CHECK (true);

-- PayTR webhook sonrası güncelleme yapabilmesi için (opsiyonel, service_role zaten bypass eder)
-- Ama handlePayTRCallback frontend'den çağrılabiliyor (satır 4765), anon ile UPDATE gerekli
GRANT UPDATE ON payments TO anon;

CREATE POLICY "payments_update_anon" ON payments
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);
```

> **GÜVENLİK NOTU:** Uzun vadede sporcu/veli girişini de Supabase Auth üzerinden `authenticated` role'e taşımak en güvenli çözümdür. Şu an için `anon` INSERT izni gereklidir çünkü `login_with_tc` RPC yalnızca veri doğrulaması yapar, JWT token oluşturmaz.

---

## HATA #5 — ORTA: `on_kayitlar` Tablosu RLS Tanımsız

### Sorun
`on_kayitlar` tablosu `RLS_POLICIES.sql`'de hiç tanımlı değil. Ön kayıt formu login sayfasından `anon` olarak çalışıyor ve `INSERT` yapıyor (satır 5006). Tablo Supabase'de manuel oluşturulmuş olabilir ama RLS politikaları eksikse:
- Ya hiçbir sorgu çalışmıyor (RLS aktif, policy yok)
- Ya da tüm veriler herkese açık (RLS kapalı)

### Dosya: Supabase SQL Editor'de çalıştırılacak SQL
### Çözüm

```sql
-- Tablo yoksa oluştur
CREATE TABLE IF NOT EXISTS on_kayitlar (
    id TEXT PRIMARY KEY,
    student_name TEXT,
    fn TEXT,
    ln TEXT,
    bd DATE,
    tc TEXT,
    cls_id TEXT,
    class_name TEXT,
    parent_name TEXT,
    parent_phone TEXT,
    status TEXT DEFAULT 'new',
    created_at DATE,
    org_id TEXT,
    branch_id TEXT
);

-- RLS aktif et
ALTER TABLE on_kayitlar ENABLE ROW LEVEL SECURITY;

-- anon: INSERT (ön kayıt formu login sayfasında çalışıyor)
GRANT SELECT, INSERT ON on_kayitlar TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON on_kayitlar TO authenticated, service_role;

CREATE POLICY "onkayit_select" ON on_kayitlar FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "onkayit_insert" ON on_kayitlar FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "onkayit_update" ON on_kayitlar FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "onkayit_delete" ON on_kayitlar FOR DELETE TO authenticated USING (true);
```

---

## HATA #6 — ORTA: `cash_transfers` Tablosu RLS Tanımsız

### Sorun
`script-fixes.js` satır 290 ve 724-731'de `cash_transfers` tablosuna INSERT ve SELECT yapılıyor ama RLS_POLICIES.sql'de bu tablo tanımlı değil.

### Dosya: Supabase SQL Editor'de çalıştırılacak SQL
### Çözüm

```sql
-- Tablo yoksa oluştur
CREATE TABLE IF NOT EXISTS cash_transfers (
    id TEXT PRIMARY KEY,
    amount NUMERIC,
    type TEXT,
    description TEXT,
    dt DATE,
    org_id TEXT,
    branch_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS aktif et
ALTER TABLE cash_transfers ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON cash_transfers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON cash_transfers TO authenticated, service_role;

CREATE POLICY "cash_transfers_select" ON cash_transfers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "cash_transfers_insert" ON cash_transfers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cash_transfers_update" ON cash_transfers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cash_transfers_delete" ON cash_transfers FOR DELETE TO authenticated USING (true);
```

---

## HATA #7 — ORTA: `wa_messages` Tablosu RLS Tanımsız

### Sorun
`script-fixes.js` satır 346'da `sb.from('wa_messages').insert(...)` çağrılıyor ama bu tablo RLS_POLICIES.sql'de yok.

### Dosya: Supabase SQL Editor'de çalıştırılacak SQL
### Çözüm

```sql
CREATE TABLE IF NOT EXISTS wa_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    phone TEXT,
    message TEXT,
    status TEXT DEFAULT 'sent',
    org_id TEXT,
    branch_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON wa_messages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON wa_messages TO authenticated, service_role;

CREATE POLICY "wa_messages_select" ON wa_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "wa_messages_insert" ON wa_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "wa_messages_update" ON wa_messages FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "wa_messages_delete" ON wa_messages FOR DELETE TO authenticated USING (true);
```

---

## HATA #8 — DÜŞÜK: PayTR Dosyası Boş

### Sorun
Projede `PayTR` adlı boş bir dosya var (0 byte). Bu bir konfigürasyon dosyası olması gerekiyorsa eksik, değilse gereksiz.

### Çözüm
Bu dosyayı silin veya gerekli PayTR konfigürasyon bilgilerini içine ekleyin:
```bash
rm PayTR
```

---

## HATA #9 — DÜŞÜK: `initiatePayTRPayment` Fonksiyonunda user_basket Formatı

### Sorun
`script.js` satır 4696'da `user_basket` şu şekilde gönderiliyor:
```js
user_basket: JSON.stringify([[desc || 'Aidat', amtKurus, 1]])
```
PayTR API'si `user_basket`'ı **Base64 encoded** bekler. Ham JSON string göndermek PayTR API hatasına neden olabilir.

### Dosya: `script-fixes.js` (override eklenecek)
### Çözüm

`script-fixes.js` dosyasına `initiatePayTRPayment` fonksiyonunun override'ını ekle. Tüm fonksiyonu değil, sadece `user_basket` kısmını düzelt. Bunun en temiz yolu, fonksiyonu tamamen override etmektir:

```javascript
// ────────────────────────────────────────────────────────
// PayTR FIX: user_basket Base64 encode + hata yönetimi
// ────────────────────────────────────────────────────────
var _origInitiatePayTR = typeof initiatePayTRPayment === 'function' ? initiatePayTRPayment : null;

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
        var orderId = 'PAY-' + a.id.slice(0, 8) + '-' + Date.now();
        var amtKurus = Math.round(amt * 100);

        // user_basket: PayTR Base64 encode bekler
        var basketRaw = JSON.stringify([[desc || 'Aidat', String(amtKurus), 1]]);
        var userBasket = btoa(unescape(encodeURIComponent(basketRaw)));

        var invokeResult = await sb.functions.invoke('paytr-token', {
            body: {
                merchant_id: s.paytrMerchantId,
                merchant_oid: orderId,
                email: a.em || (a.tc + '@veli.local'),
                payment_amount: amtKurus,
                user_name: a.fn + ' ' + a.ln,
                user_address: 'Türkiye',
                user_phone: a.pph || a.ph || '05000000000',
                merchant_ok_url: window.location.origin + window.location.pathname + '?paytr=ok&oid=' + orderId,
                merchant_fail_url: window.location.origin + window.location.pathname + '?paytr=fail&oid=' + orderId,
                user_basket: userBasket,
                currency: 'TL',
                test_mode: '0',
                org_id: AppState.currentOrgId,
                branch_id: AppState.currentBranchId,
                athlete_id: a.id,
                athlete_name: a.fn + ' ' + a.ln
            }
        });

        var tokenData = invokeResult.data;
        var error = invokeResult.error;

        if (error || !tokenData || !tokenData.token) {
            throw new Error((error && error.message) || (tokenData && tokenData.error) || 'Token alınamadı. Edge function çalışıyor mu?');
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

        // PayTR iframe aç
        showPayTRModal(tokenData.token, orderId);

    } catch (e) {
        console.error('PayTR error:', e);
        toast('PayTR hatası: ' + e.message, 'e');
    } finally {
        UIUtils.setLoading(false);
    }
};
```

**Ayrıca** `merchant_ok_url` ve `merchant_fail_url`'ye `oid` parametresi eklendi — orijinal kodda `oid` dönüş URL'ine eklenmiyordu, bu yüzden `checkPayTRReturn()` (satır 4780-4788) `orderId`'yi bulamıyordu.

---

## HATA #10 — DÜŞÜK: PayTR Callback URL'de `oid` Parametresi Eksik

### Sorun
`script.js` satır 4780-4788'de URL'den `oid` veya `merchant_oid` parametresi okunuyor:
```js
const orderId = params.get('oid') || params.get('merchant_oid');
```
Ancak `merchant_ok_url` ve `merchant_fail_url` oluşturulurken `oid` parametresi eklenmiyor (satır 4697-4698):
```js
merchant_ok_url: window.location.origin + window.location.pathname + '?paytr=ok',
merchant_fail_url: window.location.origin + window.location.pathname + '?paytr=fail',
```
Bu nedenle kullanıcı ödeme sayfasından döndüğünde `orderId` her zaman `null` oluyor.

### Çözüm
Hata #9'daki override'da düzeltildi — URL'lere `&oid=` parametresi eklendi.

---

## HATA #11 — DÜŞÜK: `WhatsApp API Token` CSP'de İzinli Ancak Güvenlik Riski

### Sorun
WhatsApp Business API token'ı (`waApiToken`) `settings` tablosunda saklanıyor ve frontend'den doğrudan `graph.facebook.com` API'sine fetch yapılıyor (script-fixes.js satır 336-338). Bu demek ki:
1. API token tarayıcıda görünür (DevTools → Network)
2. `settings` tablosuna `anon` SELECT izni olduğu için herhangi biri token'ı okuyabilir

### Çözüm (Orta vadeli)
WhatsApp mesaj gönderimini de bir Edge Function üzerinden yapmak en güvenli çözümdür. Ancak şu an çalışıyor, bozulmaması için **acil düzeltme gerekmez**. İleride `send-whatsapp` Edge Function oluşturulması önerilir.

---

## HATA #12 — BİLGİ: `login_with_tc` RPC Fonksiyonu Kontrol Edilmeli

### Sorun
`Security.js`'deki `_securityDoNormalLogin` fonksiyonu `login_with_tc` RPC'sini çağırıyor. RLS_POLICIES.sql'de bu fonksiyon tanımlı. **Eğer bu SQL Supabase'de çalıştırılmamışsa** sporcu/veli girişi çalışmaz. Kontrol edilecek hata kodları:
- `PGRST202`: Fonksiyon bulunamadı (SQL çalıştırılmamış)
- `42883`: pgcrypto extension eksik

### Çözüm
Supabase SQL Editor'de kontrol et:
```sql
-- pgcrypto extension aktif mi?
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fonksiyon var mı?
SELECT proname FROM pg_proc WHERE proname = 'login_with_tc';
```
Eğer sonuç boşsa `RLS_POLICIES.sql` dosyasının tamamını Supabase SQL Editor'de çalıştır.

---

## UYGULAMA SIRASI (Checklist)

Aşağıdaki sırayla uygulayın. Her adımdan sonra test edin:

### Adım 1: Supabase SQL — Eksik Tabloları ve İzinleri Oluştur
1. [ ] `on_kayitlar` tablosu + RLS (Hata #5)
2. [ ] `cash_transfers` tablosu + RLS (Hata #6)
3. [ ] `wa_messages` tablosu + RLS (Hata #7)
4. [ ] `payments` tablosuna `anon` INSERT/UPDATE izni (Hata #4)
5. [ ] `login_with_tc` ve `pgcrypto` kontrolü (Hata #12)

### Adım 2: Supabase Edge Functions — PayTR Backend
6. [ ] `supabase/functions/paytr-token/index.ts` oluştur ve deploy et (Hata #2)
7. [ ] `supabase/functions/paytr-webhook/index.ts` oluştur ve deploy et (Hata #3)
8. [ ] Supabase Secrets ayarla: `PAYTR_MERCHANT_KEY`, `PAYTR_MERCHANT_SALT`

### Adım 3: vercel.json — CSP ve Header Düzeltmeleri
9. [ ] `frame-src https://www.paytr.com` ekle (Hata #1)
10. [ ] `frame-ancestors 'self'` olarak değiştir (Hata #1)
11. [ ] `X-Frame-Options: SAMEORIGIN` olarak değiştir (Hata #1)
12. [ ] `Permissions-Policy`'den `payment=()` kaldır (Hata #1)

### Adım 4: script-fixes.js — Frontend Düzeltmeleri
13. [ ] `initiatePayTRPayment` override'ını ekle (Hata #9 + #10)
14. [ ] `PayTR` boş dosyasını sil (Hata #8)

### Adım 5: Test
15. [ ] Sporcu/veli girişi çalışıyor mu? (login_with_tc RPC)
16. [ ] Ön kayıt formu çalışıyor mu? (on_kayitlar INSERT)
17. [ ] Sporcu portalında "Ödeme Yap" → Havale bildirimi gönderilebiliyor mu? (payments INSERT anon)
18. [ ] PayTR ile Öde → iframe açılıyor mu? (CSP frame-src)
19. [ ] PayTR iframe'de ödeme tamamlanınca payments tablosu güncellenıyor mu? (webhook)
20. [ ] Yönetici panelinde ödemeler, nakit transferler, ön kayıtlar görünüyor mu?
21. [ ] WhatsApp mesaj gönderimi çalışıyor mu?

---

## DİKKAT — DOKUNULMAYACAK DOSYALAR

| Dosya | Neden |
|-------|-------|
| `script.js` | Ana kaynak kodu — asla değiştirilmez |
| `Security.js` | Giriş güvenlik modülü — çalışıyor, dokunma |
| `ui-improvements.js` | UI iyileştirmeleri — çalışıyor, dokunma |
| `init.js` | Supabase CDN yükleyici — çalışıyor, dokunma |
| `error-handler.js` | Hata yakalayıcı — çalışıyor, dokunma |
| `style.css` | Stiller — bozulma riski yüksek, dokunma |

## DEĞİŞTİRİLECEK / OLUŞTURULACAK DOSYALAR

| Dosya | İşlem |
|-------|-------|
| `vercel.json` | CSP ve header düzeltmeleri |
| `script-fixes.js` | `initiatePayTRPayment` override eklenmesi |
| `supabase/functions/paytr-token/index.ts` | YENİ — PayTR token Edge Function |
| `supabase/functions/paytr-webhook/index.ts` | YENİ — PayTR webhook Edge Function |
| Supabase SQL Editor | Eksik tablo + RLS policy'ler |
| `PayTR` (boş dosya) | SİL |
