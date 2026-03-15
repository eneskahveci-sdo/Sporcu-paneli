# 🛠️ Dragos Futbol Akademisi — Yeni Özellikler Promptu

Aşağıdaki özellikleri mevcut projeye ekle. Mevcut çalışan hiçbir işlevi bozma.

> ⚠️ **KURALLAR:**
> - Mevcut dosya yapısını koru: `index.html`, `script.js`, `script-fixes.js`, `ui-improvements.js`, `Security.js`, `style.css`
> - Tüm giriş akışları çalışmaya devam etmeli: Admin, Sporcu/Veli, Antrenör
> - PayTR entegrasyonuna dokunma — henüz aktif değil
> - Supabase veritabanı yapısına uyumlu çalış (`payments`, `athletes`, `settings` tabloları)
> - Türkçe arayüz kullan

---

## 1. Ödeme Planı Oluştururken Çoklu Sporcu Seçimi (Admin Panel)

**Konum:** Sidebar → Ödemeler → Ödeme Planları → "Sporcu Ödeme Planı Oluştur" butonu

**Mevcut durum:** Tek sporcu seçilebiliyor.

**İstenen:**
- Sporcu seçimi alanı **çoklu seçim (multi-select)** desteklesin.
- Checkbox listesi veya arama yapılabilen multi-select dropdown kullan.
- Seçilen sporcuların isimleri seçim alanının altında etiket (tag/chip) olarak görünsün, yanlarında ✕ ile tek tek kaldırılabilsin.
- "Tümünü Seç" ve "Seçimi Temizle" butonları olsun.
- Plan oluşturulduğunda seçilen **her sporcu için ayrı ayrı** ödeme planı kaydı oluşturulsun.

---

## 2. Mevcut Ödeme Planlarını Sporcuya Göre Grupla (Admin Panel)

**Konum:** Sidebar → Ödemeler → Ödeme Planları → "Mevcut Ödeme Planları" listesi

**Mevcut durum:** Tüm planlar düz liste halinde gösteriliyor, çok kalabalık ve karışık.

**İstenen:**
- Ödeme planları **sporcu ismine göre gruplanmış** şekilde listelensin.
- Her sporcu bir **açılır-kapanır (accordion/collapse)** kart olsun:
  - Kart başlığı: Sporcu adı soyadı + toplam plan sayısı + toplam borç tutarı
  - Kart açıldığında o sporcuya ait tüm ödeme planı satırları görünsün
- Üstte **arama kutusu** olsun — sporcu ismine göre filtreleme yapılabilsin.
- Varsayılan olarak kartlar **kapalı** gelsin, tıklayınca açılsın.

---

## 3. Sporcu/Veli Portalında Çoklu Ay Seçerek Toplu Ödeme (Sporcu Paneli)

**Konum:** Sporcu/Veli girişi → "Ödeme Yap" sekmesi

**Mevcut durum:** Tek tek ödeme yapılıyor.

**İstenen:**
- Ödeme planındaki bekleyen aylar **checkbox listesi** olarak gösterilsin.
- Sporcu birden fazla ayı seçebilsin (çoklu seçim).
- Seçilen ayların **toplam tutarı** anlık olarak hesaplanıp gösterilsin.
- "Tümünü Seç" butonu olsun.
- Ödeme yöntemi seçildikten sonra **seçilen tüm aylar için tek seferde** ödeme işlemi başlatılsın.
- Her seçilen ay için ayrı ödeme kaydı (`payments` tablosuna) oluşturulsun.

---

## 4. Ödeme Sonrası Otomatik Makbuz Oluşturma

### 4a. Havale/EFT Ödemesi → Admin Onayı Sonrası Makbuz

**Akış:**
1. Sporcu "Havale/EFT" ile ödeme yapar → ödeme kaydı `pending_approval` olarak kaydedilir
2. Admin panelinde yönetici bu ödemeyi onaylar (`completed` durumuna geçirir)
3. **Onay anında otomatik olarak** makbuz oluşturulsun (mevcut `generateReceipt()` fonksiyonunu çağır)
4. Makbuz PDF olarak indirilsin veya sporcu portalında görüntülenebilsin

### 4b. Kredi Kartı Ödemesi → Ödeme Tamamlandığında Otomatik Makbuz

**Akış:**
1. Sporcu "Kredi Kartı" ile ödeme yapar
2. Ödeme başarılı olduğunda (`completed` durumu) **otomatik olarak** makbuz oluşturulsun
3. Makbuz hemen ekranda gösterilsin ve PDF indirme butonu sunulsun
4. Makbuz üzerinde "Kredi Kartı ile Ödendi" ibaresi bulunsun

**Makbuz detayları:** Mevcut `generateReceipt()` fonksiyonunu kullan. Makbuz numarası otomatik artmalı. Makbuz içeriği: kurum adı, sporcu adı, tutar, tarih, ödeme yöntemi, makbuz numarası.

---

## 5. Sidebar "Gösterge" İsmini "Ana Sayfa" Olarak Değiştir

**Konum:** Admin paneli sidebar menüsü ve alt navigasyon çubuğu

**Ne yapılacak:**
- `index.html`'deki sidebar menüde `Gösterge` yazan yeri `Ana Sayfa` olarak değiştir
- Alt navigasyon çubuğundaki (bottom nav) `Ana` yazan yeri de `Ana Sayfa` olarak değiştir
- `script.js`'teki `i18n` nesnesinde `menuDash` değerini:
  - TR: `'Ana Sayfa'`
  - EN: `'Home'`
- `data-i18n="menuDash"` attribute kullanan tüm elementler otomatik güncellenecektir
- Header'daki (#bar-title) varsayılan başlık da `Ana Sayfa` olsun

---

## ÖNCELİK SIRASI

| # | Özellik | Karmaşıklık |
|---|---------|-------------|
| 5 | Sidebar isim değişikliği | 🟢 Kolay (5 dk) |
| 1 | Çoklu sporcu seçimi | 🟡 Orta (30 dk) |
| 2 | Planları sporcuya göre grupla | 🟡 Orta (25 dk) |
| 3 | Çoklu ay seçerek toplu ödeme | 🟡 Orta (30 dk) |
| 4 | Otomatik makbuz oluşturma | 🟡 Orta (20 dk) |

---

## TEST KONTROL LİSTESİ

Her özellikten sonra bunları test et:

1. ✅ Admin girişi → Dashboard (Ana Sayfa) açılıyor mu?
2. ✅ Sidebar'da "Ana Sayfa" yazıyor mu?
3. ✅ Ödemeler → Ödeme Planları → Çoklu sporcu seçerek plan oluşturulabiliyor mu?
4. ✅ Mevcut ödeme planları sporcu ismine göre gruplanmış mı?
5. ✅ Sporcu girişi → Ödeme Yap → Birden fazla ay seçip toplu ödeme yapılabiliyor mu?
6. ✅ Havale ödemesi admin onayı sonrası makbuz oluşuyor mu?
7. ✅ Kredi kartı ödemesi tamamlandığında makbuz otomatik oluşuyor mu?
8. ✅ Tüm mevcut özellikler bozulmadan çalışıyor mu?
