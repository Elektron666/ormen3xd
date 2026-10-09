# Avukat için bilgi paketi (pilot şartı 3)

Bu sayfa ORMEN TEKSTİL'in hukuk danışmanına verilmek için hazırlandı. Hukuki görüş değildir; sitenin bugün **gerçekte ne yaptığını** anlatır. Avukattan beklenen üç metin en altta.

## 1. Hangi kişisel veri, nerede toplanıyor

Sitede kişisel veri yalnızca **numune talep formunda** alınır:
- ad,
- telefon,
- seçilen kumaş kodları,
- isteğe bağlı üç seçim: ne için (yeni mobilya / yeniden kaplama vb.), kaç parça, ne zaman.

Formda serbest metin alanı **yoktur** (5 Ekim toplantısında kaldırıldı). Adres alınmaz; numune müşteriye değil, firmanın mağazasına gönderilir. Form, aydınlatma metnine bağlantı veren bir onay kutusu olmadan gönderilemez.

**Tutulmayanlar:**
- IP adresi,
- tarayıcı bilgisi,
- çerez.

Kullanım sayımı (ziyaret, kumaş denemesi) kimliksizdir. Sayım için sekme kapanınca silinen rastgele bir numara kullanılır ve bu numara talebe bağlanmaz.

## 2. Kim görüyor

| Kim | Ne görüyor |
|---|---|
| ORMEN TEKSTİL (panel kullanıcıları) | Bütün talepler: ad, telefon, kumaşlar, seçimler. **Fatih Bey'in kararı (6 Ekim): telefon ORMEN'de kalır.** |
| Talebin geldiği mobilya firması | ORMEN talebi firmaya WhatsApp'la iletir ("Mağazaya ilet" düğmesi). Firmanın panele erişimi yok. |
| Numuneyi okutan mağaza (`/n/<kod>` sayfası) | Yalnızca numune kodu, kumaş, lot ve adım. Ad ve telefon **görünmez**. |
| Usta (kesim föyü ve "gerçek metre" sayfası) | Kişisel veri yok. |

## 3. Nerede saklanıyor (yurt dışı aktarım)

| Sağlayıcı | Ne için | Konum |
|---|---|---|
| Supabase | Veritabanı ve dosyalar | Frankfurt, Almanya (proje bölgesi "Central EU") |
| Vercel Inc. (ABD şirketi) | İnternet sitesinin sunucusu | Frankfurt (`fra1`). Depodaki `vercel.json` dosyası bunu sabitliyor; panelin Kurulum sayfası sunucunun gerçekten nerede çalıştığını gösteriyor. |

Her iki sağlayıcının da standart veri işleme sözleşmesi (DPA) var. Hangisinin KVKK'nın 9. maddesine göre yeterli olduğu ve hangi bildirimin gerektiği avukattan beklenen sorulardandır.

## 4. Saklama ve silme

- **Süre:** Bugün talepler elle silinene kadar saklanıyor. Avukatın belirleyeceği süre sunucuya bir sayı olarak girilir (`SAMPLE_RETENTION_DAYS`). Bundan sonra o süreden eski talepler kendiliğinden silinir.
- **Elle silme:** Panelde her talebin yanında "Sil" var; iki adımla soruyor ve silinen kayıt geri gelmiyor. Bir kişi verisinin silinmesini isterse bu kullanılır.
- **Yedekler:** Bugün Supabase'in ücretsiz planı kullanılıyor ve otomatik yedek yok. Ücretli plana (Pro) geçilince günlük yedek 7 gün tutulur; silinen bir talep yedeklerde en fazla bu kadar kalır.

## 5. Avukattan beklenenler

1. **Aydınlatma metninin son hâli** (`/kvkk` sayfası). Taslak sitede; köşeli parantezli iki yer boş:
   - saklama süresi,
   - yurt dışına aktarımın dayanağı.
2. **Pilot firmayla tek sayfalık veri protokolü.** Açık soru (acil toplantı, 6 Ekim): firma "müşterimin telefonu ORMEN'de kalıyor, ORMEN onu arar mı?" diye çekiniyor. Toplantının önerisi protokole şu sözün yazılmasıydı: "ORMEN, firma sayfasından gelen müşteriyi kendi satışı ya da kampanyası için aramaz; talebi firmaya iletir." Son kararı Fatih Bey verecek.
3. **Formdaki onay cümlesinin son hâli.** Bugünkü cümle (onay kutusu): "Adım ve telefonumun yalnızca numune talebim için {firma} ve ORMEN TEKSTİL ile paylaşılmasını kabul ediyorum." ORMEN ana sayfasında yalnızca "ORMEN TEKSTİL" yazar. Önerilen cümle: "Talebim {firma}'ya iletilsin; numuneyi ORMEN TEKSTİL hazırlasın."
4. **Gerekiyorsa** VERBİS kaydı ve sağlayıcılarla yapılacak sözleşmeler için yönlendirme.
