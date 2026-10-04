# REKABET PLANI: ORMEN Atelier ve EasternGraphics (pCon)

> 4 Ekim 2026. Bu bir ürün stratejisi belgesidir. Kod kararları `KARARLAR.md`'de, iş sırası `PLAN.md`'de.

## 1. Rakibi doğru tanımak

Saloni'nin sitesindeki oda planlayıcı Saloni'nin kendi yazılımı değil. Altta "EasternGraphics tarafından desteklenmektedir" yazıyor. EasternGraphics, Almanya merkezli bir yazılım firması. **pCon** adlı ürün ailesini mobilya üreticilerine **lisansla** satıyor: oda planlayıcı, ürün konfigüratörü, katalog. Kökeni ofis mobilyası ve Avrupa pazarı.

Genel bilgi olarak bildiğim, **doğrulamadığım** noktalar (fiyatlar ve sözleşme şartları elimde yok, uydurmuyorum):
- Ürün verisi, OFML adlı bir sektör standardıyla hazırlanıyor. Bu veriyi hazırlamak uzmanlık istiyor ve çoğu zaman ayrıca ücretlendiriliyor.
- Güçlü oldukları alanlar: kat planı, ürün varyantları, CAD çıktısı, büyük kataloglar, profesyonel kullanıcı (mimar, satış danışmanı).

Saloni ekran görüntülerinden **gördüğüm** zayıflıklar:
- Telefonda karışık bir arayüz. Clone, Delete, Multiple selection gibi menüler İngilizce kalmış.
- Kumaş ve renk ikinci planda. Koltuk gri ve soluk, sarı bir seçim kutusunun içinde duruyor.
- İlk ekran bomboş gri bir oda. Etkileyici bir ilk izlenim yok.
- Kullanıcıdan mimar gibi düşünmesi bekleniyor: duvar kalınlığı, oda şekli, kat planı yükleme.

## 2. Bizim farkımız: aynı oyunu oynamıyoruz

| | EasternGraphics (pCon) | ORMEN Atelier |
|---|---|---|
| Kime satıyor | Mobilya üreticisine yazılım lisansı | Mobilyacıya **bedava**; gelir kumaş satışından |
| Merkezde ne var | Mobilya ürünü ve varyantları | **Kumaş**: gerçek ölçek, doğru renk, kod |
| Kullanıcı | Mimar, satış danışmanı | Showroom'daki sıradan müşteri, mobilyacı |
| Veri hazırlığı | Uzman işi, maliyetli | Fotoğraf + cm ölçüsü; model yoksa **parametrik koltuk** |
| Dil ve kanal | Çok dilli, Avrupa odaklı | Türkçe, WhatsApp ve QR odaklı |
| Sonuç | Plan ve teklif | Plan + **numune talebi + ORMEN sipariş kodu** |

**Konumlanma cümlesi:** "Avrupalılar mobilya planlıyor; biz müşteriye kumaşı sevdiriyoruz, planı da kusursuz gösteriyoruz."

Onların en güçlü olduğu yerde (büyük CAD, ofis mobilyası, ERP ve fiyat) **kavga etmiyoruz.** Onların zayıf olduğu üç yerde açık ara öne geçiyoruz:

1. **Kumaş gerçekliği:** Gerçek ölçek, ölçülmüş renk doğruluğu (ΔE testi), yakından bakınca örgü okunuyor, karşılaştırma sürgüsü. Bunu yapan bir rakip görmedim.
2. **Sıfır öğrenme:** Açılır açılmaz dönen, giydirilmiş, ışıklı bir koltuk. Plan isteyen için tek düğmeyle 2D.
3. **Model engeli yok:** Siteler'deki atölyelerin çoğunun 3D modeli yok. pCon'un en büyük giriş bariyeri tam olarak bu. Bizim cevabımız parametrik koltuk üreticisi ve Faz 3'teki fotoğraftan giydirme.

## 3. Yol haritası: nerede nasıl kazanırız

### A. Şimdi (Faz 1'e ekleniyor)
1. **2D plan görünümü** (bu dilim). pCon'daki "2D" düğmesinin daha iyisi:
   - Tepeden, perspektifsiz, mimari çizim gibi temiz bir plan.
   - Duvar kesitleri koyu (mimari "poşe").
   - Oda ölçüleri, koltuk ölçüleri ve **koltuğun yan duvarlara mesafesi** cm olarak yazılı.
   - 1 metrelik ölçek çubuğu.
   - Kumaş planda da görünür; karşılaştırma planda da çalışır.
2. **Teklif föyü (PDF)**, paylaşım dilimiyle birlikte. Tek sayfada:
   - 3D görsel ve plan.
   - Kumaş künyesi ve büyük ORMEN kodu.
   - Firma logosu.
   - Numune talep QR'ı.
   
   Mobilyacı bunu müşterisine verir, müşteri eve götürür. Kumaş kodu evde dolaşır. Bu, "kilitlemek" amacının fiziksel karşılığı.

### B. Pilot (Faz 2'nin başına çekmeyi öneriyorum)
3. **Parametrik koltuk üreticisi:** Atölye modelini birkaç seçimle tarif eder:
   - Tip: 2'li, 3'lü, köşe (L), berjer, puf.
   - Kol tipi, sırt yüksekliği, ayak tipi.
   - Ölçüler (cm).
   
   Sistem koltuğu kodla üretir ve kumaş hemen gerçek ölçekte oturur. Bugünkü örnek koltuklar bunun çekirdeği. **Türkiye'de en çok satılan köşe takımı** bu sayede GLB beklemeden sisteme girer.
4. **Köşe takımı ve modüler dizilim:** Modülleri yan yana ekleme (sol kol, orta, köşe, şezlong). Mobilya sürükleme değil, "modül ekle" düğmeleri. Basit ama tam bizim pazarımızın ihtiyacı.
5. **Showroom kiosk modu**, Faz 2'de zaten vardı.

### C. Faz 3
6. **Fotoğraftan giydirme** (AI). Modeli hiç olmayan atölye için. Arayüzü hazır.
7. **ORMEN veri paneli:** Hangi kumaş, hangi firmada, hangi odada deneniyor. Rakip bu veriyi üretmiyor; bizim stok ve koleksiyon avantajımız.

### Bilerek yapmadıklarımız
- Serbest duvar çizimi, kapı ve pencere yerleştirme, kat planı yükleme. Satışa katkısı düşük, sadeliği bozar.
- Fiyat, sepet, ERP entegrasyonu. İstem dosyasında yasak.
- CAD (DWG) çıktısı. İhtiyaç çıkarsa Faz 3 sonrası düşünülür.

## 4. Kazandığımızı nasıl anlarız

| Ölçüt | Hedef | Nasıl ölçülür |
|---|---|---|
| İlk anlamlı görüntü | < 3 sn (masaüstü, normal bağlantı) | Playwright performans testi |
| Firma açma süresi | < 2 dk | Panelde zamanlayıcı |
| Satış ziyaretinde "bizde de olsun" | İlk 20 ziyarette %50+ | Fatih Bey'in saha notu |
| Kumaş denemesi / oturum | ≥ 5 | `events` tablosu |
| Numune talebi / 100 oturum | ≥ 3 | `sample_requests` |
| Renk doğruluğu | ΔE00 < 5 | Otomatik test (var) |

## 5. Karar bekleyen konular

1. **Teklif föyü (PDF)** Faz 1'e girsin mi? Önerim: evet, paylaşım dilimiyle birlikte.
2. **Parametrik koltuk ve köşe takımı** Faz 2'nin ilk işi olsun mu? Önerim: evet. Pilot firmaların çoğunda GLB olmayacak.
3. Pilot için **3-5 firma** seçilmesi. İçlerinde en az bir köşe takımı üreticisi olmalı.
