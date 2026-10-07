# Gerçek cihaz testi (pilot öncesi 5. şart)

Acil toplantıda (6 Ekim) karar verildi: pilot firmaya gitmeden önce site üç gerçek cihazda, gerçek kumaşla denenecek. Bu sayfa testi yapan kişi (Mert ya da geliştirici) içindir; yarım saat sürer.

## Hazırlık

- Cihazlar:
  1. orta sınıf bir Samsung (Samsung Internet ve Chrome ile ayrı ayrı),
  2. bir iPhone (Safari),
  3. showroomda kullanılacak kiosk tableti.
- Panelde en az **2 gerçek seri** yüklü olmalı. Örnek katalogla yapılan test sayılmaz.
- Telefonlar Wi-Fi'de değil, **mobil veride** denenir; mağazadaki müşteri öyle girer.

## Ölçüm ekranı

Adresin sonuna `?olcum` eklenir:
- telefonlarda `https://atelier.ormentekstil.com.tr/?olcum`,
- kiosk tabletinde `…/f/<firma>?kiosk&olcum`.

Sayfanın sol altında siyah bir kutu çıkar. Kutu sekme kapanana kadar açık kalır, `?olcum=0` ile kapanır. Hiçbir yere bir şey göndermez. Kutudaki satırlar:

| Satır | Ne anlama geliyor |
|---|---|
| Cihaz, Ekran | Telefonun ve tarayıcının adı; ekran boyutu, işlemci çekirdeği, bellek. Bellek iPhone'da "?" görünür; tarayıcı söylemiyor. |
| Kalite | Sitenin cihaza baştan verdiği kalite ve doku boyutu. |
| Piksel oranı | Sahne yavaşlarsa site görüntüyü biraz bulanıklaştırıp hızlanır. "düşmedi" iyi haber; "1 kez düştü" kabul edilebilir. |
| Hareket hâlinde kare hızı | Sahne döndürülürken saniyede kaç kare çizildiği. Önce koltuğu birkaç kez parmakla çevirin. |
| İlk kumaş | Sayfa açıldıktan sonra koltuğun kumaşıyla görünmesine kadar geçen süre. |
| AR | "Odamda gör" denendiyse açıldı mı, açılmadı mı. |

Her cihazda ölçümden sonra **Kopyala** düğmesine basılır ve metin WhatsApp'tan geliştiriciye gönderilir.

## Adımlar (her cihazda)

1. Sayfayı `?olcum` ile açın; kumaş gelene kadar bekleyin. **İlk kumaş** süresine bakın.
2. Koltuğu 10 saniye parmakla döndürün. **Kare hızı**na ve **Piksel oranı**na bakın.
3. Gerçek seriden 5 farklı kumaşa dokunun. Her biri koltuğa geldi mi, renk askıdaki kartelaya yakın mı?
4. Telefonlarda: **Odamda gör** düğmesine basın. AR açılıyor mu, koltuk odada gerçek boyutunda mı? (Bir metreyi yere koyup karşılaştırın.)
5. Numune formunu açıp kapatın. Klavye formu kapatıyor mu?
6. Kioskta: kartela kodunu yazın, kumaş geliyor mu? 2 dakika dokunmayın; ekran başa dönüyor mu?
7. **Kopyala**'ya basın ve gönderin.

## Geçme ölçütleri

| Ölçü | İyi | Kabul | Kötü (pilotu bekletir) |
|---|---|---|---|
| İlk kumaş (mobil veri) | 3 sn altı | 3–6 sn | 6 sn üstü |
| Hareket hâlinde kare hızı | 45 ve üstü | 25–45 | 25 altı |
| Piksel oranı | düşmedi | 1 kez düştü | 2 kez ya da daha fazla |
| AR | açıldı, boyut doğru | — | açılamadı ya da boyut yanlış |

## Sonuç tablosu

| Cihaz | Tarayıcı | İlk kumaş | Kare hızı | Piksel oranı | AR | Not |
|---|---|---|---|---|---|---|
| Samsung … | Samsung Internet | | | | | |
| Samsung … | Chrome | | | | | |
| iPhone … | Safari | | | | | |
| Kiosk tableti … | | | | | — | |
