# Ar-Ge: ORMEN Atelier

## Ekibe katılan (temsilî)

**Dr. Ece Tunalı, Ar-Ge sorumlusu.** Bilgisayarlı görü ve malzeme görselleştirme; daha önce bir tekstil firmasında kumaş tarama hattı kurmuş. Diğer toplantı katılımcıları gibi temsilîdir. Bu belgedeki plan onun gözünden yazıldı; gerçek bir Ar-Ge'ci işe alınınca onunla gözden geçirilmeli.

Gerçek birini bulmak için iş ilanı ve nereden aranacağı: bu belgenin sonunda.

## Neden Ar-Ge? (Ece Hanım'ın ilk notu)

> "Buraya kadar yapılanlar mühendislik: bilinen teknikler doğru birleştirilmiş. Rakipten ayrıştıracak şey ise üç soruya verilecek cevap. Telefon fotoğrafından kumaşı ne kadar doğru dijitalleştirebiliyoruz? Ekrandaki renk numuneye ne kadar yakın? Metrajı ustadan daha iyi tahmin edebiliyor muyuz? Bunlar ölçülmeden 'çok gerçekçi' demek bir his."

Projede bu üç sorunun izleri zaten var:
- **Kumaş dijitalleştirme:** MISSO fotoğraflarında ölçek üç kez değişti (3, 6, 4,4, sonra 4,6 cm diş). Perspektif yüzünden desen kaydı; doğru sonuç, fotoğrafın ortasından 4 diş kesilerek elle bulundu (`scripts/prepare-photo-fabric.ts`). Her yeni seri için bu elle yapılamaz.
- **Renk:** Sitede "Ekran renkleri bağlayıcı değildir" yazıyor, ama farkın ne kadar olduğunu bilmiyoruz.
- **Metraj:** Firmanın ustasının sayısı tekrarlanıyor; usta föyündeki QR'dan gerçekte kesilen metre geri geliyor (`cut_reports`). Bu veri birikiyor ama henüz analiz edilmiyor.
- **Görüntü:** Biye telefonda kesik görünüyor.

## Ar-Ge yol haritası

| # | Konu | Soru | Ölçüt | Süre |
|---|---|---|---|---|
| A1 | **Kalibrasyon kartı ile kumaş tarama** (ilk sürüm hazır, gerçek çekimle doğrulanacak) | Basılı bir ORMEN kartı (köşe işaretleri + cm cetveli) kumaşın üstüne konup telefonla çekilince ölçek ve perspektif otomatik düzeltilebilir mi? | Bilinen raporlu 10 kumaşta ölçek hatası < %2, dikiş kayması gözle görülmez | 6–8 hafta |
| A2 | **Renk doğruluğu** | Ekrandaki kumaş rengi numuneden ne kadar farklı? | ΔE2000; ColorChecker kartıyla çekim. Hedef: orta sınıf telefonda ortalama ΔE < 5 | 4 hafta (A1 ile birlikte) |
| A3 | **Metraj tahmini** | Parametrik modelin parçalarından (kasa, kol, oturak, sırt) pastal yerleşimiyle metraj hesaplanabilir mi? | `cut_reports` gerçek metreleriyle karşılaştırma; ustanın sayısından daha küçük ortalama hata | Pilotta en az 30 kesim biriktikten sonra 8 hafta |
| A5 | **İnce detay telefonda** | Biye ve dikiş gibi ince geometri telefonda kırılmadan nasıl gösterilir? | Samsung ve iPhone'da ekran görüntüsü karşılaştırması | 1 hafta (cihaz testinde) |

**Sıra:** A5 → A1 + A2 → A3.

~~A4 hav ve parlaklık~~: Fatih Bey çıkardı (11 Ekim): "abartmasın, yok öyle bir şey." Sahada karşılığı olmayan bir iş; listeden kalktı.
- A5 küçük ve cihaz testine bağlı.
- A1 ve A2 birlikte yapılmalı: aynı çekim düzeni kullanılır, ve gerçek kumaş fotoğrafları gelmeden ikisi de başlayamaz.
- A3 veri bekliyor.

**Kurallar** (brief ile aynı):
- Paralı servis ve "gerçek AI" yok.
- Bütün yöntemler tarayıcıda ya da kendi sunucumuzda çalışır.
- Sonuçlar uydurulmaz: her iddia bir ölçümle `ARGE.md`'ye yazılır.

## İlk adım: ölçek kontrolü (yapıldı, 11 Ekim)

Ece Hanım: "A1'e başlamadan önce elimizdekinin doğruluğunu görebilmeliyiz. Panelde kumaş eklerken ölçeği ve tekrar dikişini gözle doğrulayacak bir araç olsun."

Panel → Kumaşlar → kumaş sayfası → **Ölçek ve dikiş kontrolü**:
- Doku 3 × 3 tekrarlanır. Dikiş kayması ve tekrar izi bir bakışta görünür.
- Üstüne gerçek ölçekli bir **10 cm cetvel** çizilir. Kumaşın kendisinin yanına konup karşılaştırılır.
- Doku gerçek boyutta gösterilir; pencere, dört tekrarın birleştiği köşeye ortalanır (ince kırmızı çizgiler). Rapor ne kadar büyük olursa olsun dikiş ortada görünür.
- Altında ekranda 10 cm olması gereken bir cetvel var. Ekranın ölçeği tarayıcıdan kesin bilinmez; bu yüzden araç, 10 cm'yi bir kez gerçek cetvelle ayarlatır ve ayarı o tarayıcıda saklar.

**İlk bulgu (11 Ekim), ölçümle düzeltilmiş:**
- **Görülen:** MISSO-05'te yatay tekrar çizgisinin üstü ve altı farklı görünüyor: üstte açık bir şerit, altta koyu.
- **İlk tahmin yanlış çıktı.** Fotoğrafın eşit aydınlanmadığını düşündüm. `scripts/olc-dikis.ts` ile ölçünce, her dokunun yukarıdan aşağı genel parlaklık eğilimi küçük çıktı: 255 üzerinden en fazla 13 (MISSO-04), MISSO-05'te 5,6. Desen şeritleri bu ölçümde ortalamaya karışıp kayboluyor.
- **Daha olası sebep:** Tekrarın boyu (91,5 cm) desenin gerçek dikey tekrarına tam oturmuyor. Bir tekrar bittiğinde başlayan şerit, bir öncekinin devamı değil.
- **Doğrulama:** Gerçek kumaşta dikey desen tekrarı cetvelle ölçülmeli (Hakan, numune üzerinden). Ölçü 91,5 cm'den farklıysa doku o boyla yeniden hazırlanır.
- **Yan dikiş** (sol/sağ) altı kumaşta da temiz: fark 255 üzerinden 1'in altında.

## İkinci adım: dikiş için minimum hata kesimi (yapıldı, 11 Ekim)

**Ölçüm:** `ORMEN_OLC_YUKSEKLIK=1 npx tsx scripts/prepare-photo-fabric.ts …` her yükseklikte renk bantlarının kendini ne kadar tuttuğunu yazar.
- MISSO fotoğraflarının hiçbirinde gerçek bir dikey tekrar yok. Her yükseklikte fark 255 üzerinden 30–70 arasında, derin bir dip yok. Kumaşın bant dizisi fotoğraftan uzun.
- Yani tekrar boyunu değiştirmek dikişi yok edemez. Hakan'ın ölçümü yine de gerekli: gerçek tekrar boyunu söyleyecek.

**Eski yöntem:** Dikişte iki ucu yüzde 10'luk bir bantta karıştırıyordu. Sonuç yaklaşık 9 cm boyunda bulanık, zikzakları çift görünen bir şeritti.

**Yeni yöntem:** Görüntü dikmede (image quilting) kullanılan **minimum hata kesimi**. Her sütunda iki ucun en çok benzediği satırdan, sütundan sütuna en fazla bir satır kayarak kesiyor; 2 satırlık yumuşatma var.

**Ölçülen fark** (dikişteki ortalama renk farkı, 255 üzerinden):

| Kumaş | Eski karışım | Yeni kesim |
|---|---|---|
| MISSO-01 | 35,0 | 11,3 |
| MISSO-02 | 32,8 | 6,3 |
| MISSO-04 | 58,4 | 12,6 |
| MISSO-05 | 32,2 | 11,3 |
| MISSO-06 | 39,7 | 8,4 |

Altı MISSO dokusu yeniden üretildi. Tekrar ölçüleri değişmedi; veritabanında değişiklik gerekmedi.

**Kalan:** Gözle bakınca bulanık şerit yok, ama kesim çizgisinin hemen altında yaklaşık 2 cm'lik düzensiz bir iz var. Tam çözüm için kumaş **en az bir tam tekrar boyunda** fotoğraflanmalı. Fotoğrafta tekrar varsa ölçüm aracı onu derin bir dip olarak bulur ve dikiş kaybolur. Bunun için `KUMAS-CEKIM-REHBERI.md`'ye kural eklendi.

## Üçüncü adım: kalibrasyon kartı (A1, ilk sürüm yapıldı, 11 Ekim)

**Kart:** Panel → `/panel/kalibrasyon-karti`. A4, %100 ölçekte basılır.
- Ortada kesilip çıkarılacak 15 × 15 cm bir pencere var. Pencerenin dört köşesinin yanında birer işaret var: 18 mm siyah kare, ortasında 6 mm beyaz delik.
- Altta 10,0 cm kontrol çubuğu var. Cetvelle tutmazsa yazıcı sayfayı ölçeklemiştir ve kart kullanılamaz.

**Panelde:** Yeni kumaş → "Fotoğrafta ORMEN kalibrasyon kartı var" işaretlenir.
1. Dört işaret bulunur. Bunun için koyu, kareye yakın, ortası açık lekeler aranır; eşik Otsu yöntemiyle belirlenir. Uygun dörtlü seçilir.
2. Kartın milimetre koordinatlarından fotoğrafa bir homografi (perspektif dönüşümü) kurulur.
3. Pencerenin içi kenarlardan 4 mm içeriden, düz ve kare olarak yeniden örneklenir.
4. Kumaş 14,2 × 14,2 cm olur; ölçü alanları kendiliğinden dolar.
- Ek paket yok, her şey tarayıcıda çalışıyor.

**Ölçüm (sentetik fotoğraf):** Kumaşta 1 cm aralıklı çizgiler, kart üstünde, farklı açılarla çekilmiş gibi üretildi. Düzeltilmiş penceredeki çizgi aralığı ölçüldü.

| Durum | Ölçek hatası | İşaret konum hatası |
|---|---|---|
| Tepeden, hafif dönük | %0,04 | 0,78 px |
| Açılı (perspektif) | %0,07 | 0,50 px |
| Koyu kumaş, açılı | %0,05 | 0,64 px |

Hedef %2'nin altıydı. Kart yokken yanlışlıkla kart bulunmuyor. Testler: `tests/unit/calibration.test.ts` ve uçtan uca panel testi.

**Dürüst sınır:** Bunlar ideal görüntüler: bulanıklık, eşit olmayan ışık, lens bükülmesi, kartın kırışması yok. Gerçek telefon fotoğrafında hata daha büyük olur.
- **Sıradaki ölçüm:** Kartı basıp raporu bilinen 3 kumaşla (ör. cetvelle ölçülmüş bir ekose) çekmek. Sonuç bu tabloya yazılacak.
- Renk için kart genişletildi; bkz. dördüncü adım.

## Dördüncü adım: kartın kâğıdıyla renk dengesi (A2, ilk sürüm yapıldı, 11 Ekim)

**Sorun:** Aynı kumaş akşam ampulle sarı, gölgede mavi, floresanda yeşilimsi çekilir. Sistem bu rengi kumaşın rengi sanır. Bu, renk hatasının fotoğraf tarafı; ekran tarafı ayrı bir konu.

**Çözüm:** Kartın kendi beyaz kâğıdı referans olarak kullanılıyor.
- Basılı bir gri alan eklenmedi. Yazıcının mürekkebi griye kendi tonunu katar ve kart her yazıcıda başka bir renk çıkar. Düz beyaz kâğıt daha tutarlı.
- Pencerenin iki yanındaki ve altındaki boş kâğıt şeritlerinden örnek alınır. Gölgeler elenir: yalnızca daha aydınlık yarı sayılır.
- Kâğıdın her kanalı 235'e getirilir. Böylece ışığın rengi de pozlama farkı da gider; aynı kumaşın iki fotoğrafı birbirine benzer çıkar.
- Kâğıt fotoğrafta bembeyaz patlamışsa (255) rengi okunamaz. O zaman düzeltme yapılmaz ve panel "biraz daha karanlık çekin" der.
- Panelde ayrı bir düğme yok: kart işaretliyse renk de dengelenir. Ek paket yok.

**Ölçüm (sentetik fotoğraf):** Aynı sahne renkli ışık altında üretildi. Düzeltilmiş pencere, nötr ışıktaki hâliyle karşılaştırıldı. Fark ΔE (CIE76, Lab) olarak ölçüldü.

| Işık | Düzeltmeden ΔE | Kâğıda göre düzeltince ΔE |
|---|---|---|
| Sıcak ampul | 14,7 | 0,52 |
| Soğuk gölge | 8,7 | 0,42 |
| Yeşilimsi floresan | 11,2 | 0,34 |

ΔE 2'nin altı gözle zor ayırt edilir. Testler: `tests/unit/calibration.test.ts` ve uçtan uca panel testi.

**Dürüst sınırlar:**
- **Sentetik ışık basit:** Kanalları çarpan bir ışık kullanıldı. Gerçek telefon kendi renk işlemini yapar (ton eğrisi, doygunluk artırma), bu düzeltme bunu geri alamaz. Gerçek fotoğrafta fark daha büyük çıkar.
- **Kâğıt tam beyaz değildir:** Optik ağartıcılı kâğıt gün ışığında hafif mavi görünür. Bu yüzden düz, ağartıcısız, mat kâğıt öneriliyor.
- **Tek ışık varsayılıyor:** Kumaş ve kart aynı ışıkta olmalı. Pencereden gelen gün ışığı ile tavan lambası karışırsa düzeltme yarım kalır.
- **Ekran tarafı açık:** Bu adım yalnızca fotoğraftaki renk kaymasını alıyor. Telefon ekranının numuneye ne kadar yakın gösterdiği hâlâ ölçülmedi.
- **Sıradaki ölçüm:** Kartla ve ColorChecker'la aynı kumaşı 3 ayrı ışıkta çekmek, ΔE2000 ile karşılaştırmak (hedef < 5). Kâğıt yeterli değilse ColorChecker'ın gri yaması karta yapıştırılır.

## Gerçek bir Ar-Ge'ci bulmak

**Kim aranıyor:** Bilgisayarlı görü ya da grafik konusunda deneyimli; tarayıcıda (WebGL/three.js) ya da Python/OpenCV ile çalışmış biri. Tekstil bilgisi şart değil; Hüseyin Usta ve Hakan bunu sağlar.

**Nereden:**
- **Teknokentler (Ankara):** ODTÜ Teknokent, Hacettepe Teknokent, Bilkent Cyberpark. Firma, teknokentte bir Ar-Ge ofisi açarsa personel için vergi ve sigorta prim teşvikleri de konuşulabilir.
- **Üniversite-sanayi işbirliği:** Bilgisayar ya da elektrik-elektronik mühendisliği bölümlerinde görüntü işleme çalışan bir öğretim üyesiyle danışmanlık; yüksek lisans öğrencisine tez konusu (A1 ve A2 iyi birer tez konusu).
- **İlan siteleri:** LinkedIn, Kariyer.net, Youthall (yeni mezun).

**Destekler** (güncel şartları başvurmadan önce resmî sitelerinden kontrol edin; burada tutar ya da oran yazılmadı):
- TÜBİTAK TEYDEB: KOBİ'ler için 1507 (KOBİ Ar-Ge Başlangıç) ve 1501 (Sanayi Ar-Ge Projeleri).
- KOSGEB Ar-Ge, Ür-Ge ve İnovasyon destekleri.
- A1 + A2 + A3 birlikte "tekstil ürünlerinin dijital ikizi ve metraj tahmini" başlığıyla bir proje olarak yazılabilir.

### İlan metni (kopyalanıp kullanılabilir)

> **ORMEN TEKSTİL – Ar-Ge Mühendisi (Görüntü İşleme / 3B Görselleştirme), Ankara**
>
> ORMEN TEKSTİL, mobilya firmalarının müşterilerine döşemelik kumaşları gerçek ölçekte, 3B ve artırılmış gerçeklikle gösteren ORMEN Atelier'i geliştiriyor. Kumaşları telefon fotoğrafından doğru ölçek ve renkle dijitalleştirmek ve metrajı tahmin etmek için Ar-Ge mühendisi arıyoruz.
>
> **Yapacakların:**
> - Kalibrasyon kartıyla kumaş tarama: perspektif düzeltme, ölçek, dikişsiz doku.
> - Ekran ile numune arasındaki renk farkını ölçmek ve azaltmak.
> - Parametrik koltuk modellerinden metraj tahmini; gerçek kesim verisiyle doğrulama.
>
> **Aradığımız:**
> - Görüntü işleme (OpenCV ya da benzeri) ya da WebGL/three.js deneyimi.
> - Ölçerek çalışmayı seven biri: her iddiayı bir sayıyla destekleyen.
> - Tekstil bilgisi gerekmez; atölyemiz ve ustalarımız öğretir.
>
> **Artı:** TypeScript/React, renk bilimi (ΔE, ICC), yerleştirme (nesting) algoritmaları.
>
> Başvuru: [e-posta adresi]
