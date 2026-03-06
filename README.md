# Sporcu Paneli - Guvenlik Guncellemesi

## Degisen Dosyalar

Bu pakette sadece **gerekli guvenlik duzeltmeleri** yapilmistir:

| Dosya | Aciklama |
|-------|----------|
| `index.html` | Ana HTML dosyasi (orijinal yapisi korundu) |
| `script.js` | **Guvenlik duzeltmeli** JavaScript dosyasi |
| `RLS_POLICIES.sql` | Supabase RLS politikaları (calistirilmali!) |

## Guvenlik Duzeltmeleri

### 1. Supabase Auth Entegrasyonu (Kritik!)

**Eski (Guvensiz):**
```javascript
// TUM kullanicilar tarayiciya cekiliyordu!
var allUsers = await supaGet('users') || [];
// Sifre tarayicida kontrol ediliyordu
if (u.pass === p || u.pass === ph) { ... }
```

**Yeni (Guvenli):**
```javascript
// Sifre Supabase sunucusunda kontrol ediliyor
var { data, error } = await sb.auth.signInWithPassword({
  email: e,
  password: p
});
```

### 2. Session Yonetimi

- `onAuthStateChange` ile oturum durumu izleniyor
- 15 dakika hareketsizlikte otomatik cikis
- Cikis yaparken auth session temizleniyor

### 3. RLS Politikalari

`RLS_POLICIES.sql` dosyasini Supabase SQL Editor'de calistirin!

## Kurulum Adimlari

### 1. Supabase Auth Ayarlari

Supabase Dashboard > Authentication > Settings:

```
Site URL: https://siteniz.com
Redirect URLs: https://siteniz.com/*
```

### 2. RLS Politikalari

Supabase Dashboard > SQL Editor:
- `RLS_POLICIES.sql` icerigini yapistirin
- Run butonuna basin

### 3. Users Tablosu Guncelleme

Mevcut kullanicilar icin Supabase Auth kullanicisi olusturun:

```sql
-- Mevcut kullanicilarinizi auth.users'a eklemek icin
-- Supabase Dashboard > Authentication > Users > Add User
-- Veya kullanicilardan sifre sifirlama ile yeni sifre almalarini isteyin
```

### 4. Dosyalari Yukleyin

```
/fixed/
  index.html    -> Ana dizine
  script.js     -> Ana dizine
  RLS_POLICIES.sql -> Supabase'de calistir
```

## Onemli Notlar

1. **Mevcut kullanicilar** icin Supabase Auth hesabi olusturulmali
2. **Logo** artik `/assets/logo.png` dosyasindan yukleniyor (Base64 kaldirildi)
3. Tum **orijinal ozellikler** calisiyor: QR, SMS, Excel, vb.

## Test Kontrol Listesi

- [ ] Kurum girisi calisiyor
- [ ] Sporcu/Veli girisi calisiyor
- [ ] Sifre sifirlama calisiyor
- [ ] Kayit olma calisiyor
- [ ] QR yoklama calisiyor
- [ ] Excel import/export calisiyor
- [ ] SMS gonderimi calisiyor
- [ ] Tum sayfalar aciliyor

## Sorun Cozumu

### "E-posta veya sifre hatali" hatasi

Kullanici Supabase Auth'da kayitli degil. Cozum:
1. Supabase Dashboard > Authentication > Users
2. Kullaniciyi manuel ekleyin VEYA
3. Kayit ol sayfasindan yeni hesap olusturun

### RLS hatasi

RLS politikalarini calistirmadiniz. `RLS_POLICIES.sql` dosyasini Supabase'de calistirin.
