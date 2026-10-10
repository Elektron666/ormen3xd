# KARARLAR

Bu dosyada projede verilen kararlar, yapılan varsayımlar ve bilinen sınırlar tutulur. En yeni kayıt en üstte.

---

## Kurulum durumu sayfası (5 Ekim 2026)

- Panelde **Kurulum** sekmesi (`/panel/durum`): Supabase bağlantısı, beş tablo dosyasından hangilerinin çalıştırıldığı (her biri yarattığı tablo/sütun/fonksiyon/klasör sınırıyla tespit ediliyor), kumaş ve model durumu, alan adı (panelin açıldığı adresle karşılaştırılarak), WhatsApp numarası, üretimde demo giriş. Elle yapılacak üç iş (KVKK, telefonda AR, güvenlik duvarı) ayrı "Sizde" olarak listeleniyor.
- Her açılışta yeniden kontrol ediyor; genel bakış sayfasında kırmızı/sarı varsa uyarı şeridi çıkıyor.
- Kuralların hepsi birim testli (`lib/setup-check.ts`). Supabase'e karşı tespit kısmı gerçek bir Supabase projesiyle denenemedi; kurulumda ilk kez çalışacak.

---

## Güvenlik incelemesi ve düzeltmeler (5 Ekim 2026)

Yayından önce dışarıya açık bütün kapılar ayrı bir incelemeyle tarandı (panel girişi, panel işlemleri, dosya yükleme, herkese açık formlar, veritabanı izinleri, yönlendirmeler). Bulgular ve yapılanlar:

- **Ciddi (düzeltildi): panel sayfalarının verisi giriş yapmadan okunabiliyordu.** Giriş kontrolü yalnızca panelin ortak çerçevesindeydi (layout). Next.js'te bu, alttaki sayfanın çalışmasını durdurmuyor: tarayıcı giriş sayfasına yönlenirken yönlendirme cevabının içinde talepler sayfasının verisi (ad, telefon) de geliyordu. Elle denendi ve doğrulandı. Düzeltme iki katlı: (1) her panel sayfası veriye dokunmadan önce oturumu kendisi kontrol ediyor; (2) `proxy.ts` oturum çerezi olmayan isteği panel sayfaları hiç çalışmadan giriş sayfasına yolluyor. Uçtan uca testte çerezsiz ve sahte çerezli istekte ad ve telefonun cevapta olmadığı kontrol ediliyor; kontrol kaldırılınca testin yakaladığı da denendi. Panel işlemleri (kaydetme vb.) ve panel API'leri zaten her seferinde kontrol ediyordu; onlarda sorun yoktu.
- **Orta (düzeltildi): Excel formül enjeksiyonu.** Numune formundan gelen ad ya da not `=`, `+`, `-`, `@` ile başlıyorsa, talepler CSV'si Excel'de açıldığında formül olarak çalışabilirdi. Bu değerler artık metin olarak yazılıyor; telefonlar CSV'de `0532 …` biçiminde.
- **Orta (düzeltildi): demo oturum çerezi tahmin edilebilir anahtarla imzalanabiliyordu.** Supabase'siz ve `PANEL_SESSION_SECRET` girilmemiş bir yayında çerez sabit bir anahtarla doğrulanıyordu. Artık üretimde en az 32 karakterlik `PANEL_SESSION_SECRET` yoksa demo girişi kapalı ve hiçbir demo çerezi kabul edilmiyor. Supabase'li kurulumu etkilemiyor.
- **Düşük (sıkılaştırıldı):** Yükleme yolunda `..` gibi parçalar reddediliyor. Dosya klasörüne veritabanı tarafında 60 MB ve dosya türü sınırı kondu (beşinci migration). Rapor fonksiyonu anonim kullanıcılara açıkça kapatıldı.
- **Açık kalan (öneri): herkese açık formlara istek seli.** Numune formu, kullanım kaydı ve kısa link uç noktaları doğrulama ve boyut sınırıyla korunuyor ama saniyede yüzlerce istek atan bir betiği durdurmuyor. IP saklamama kuralı nedeniyle bunu uygulamada değil, Vercel'in güvenlik duvarında (IP'yi saklamadan sayan hız sınırı) çözmeyi öneriyorum; README'de adımı var.
- Temiz bulunanlar: service role anahtarı tarayıcıya hiç gitmiyor; satır güvenliği anonim kullanıcıya talep, olay ve profil okutmuyor; yönlendirmelerde dış adrese gitme yok; sunucu kullanıcı adresine istek atmıyor; sayfaya HTML olarak basılan tek içerik kendi ürettiğimiz QR kodları.

---

## Faz 2, iş 7: Rapor veritabanında hesaplanıyor (5 Ekim 2026)

- **Neden şimdi:** Yol haritasında "olay sayısı yüz binleri geçince" diye bekletilmişti. Gerçek veri gerektirmediği ve kurulumdan önce eklemek sonradan eklemekten kolay olduğu için öne aldım.
- **Ne:** `atelier_report` adlı tek bir SQL fonksiyonu (dördüncü migration). Rapor sayfası Supabase'de bunu çağırıyor; bütün olayları uygulamaya taşımıyor ve önceki 50.000 olay sınırı kalktı. Supabase'siz demo modunda hesap eskisi gibi uygulamada.
- **Doğrulama:** PGlite'ta 60 ziyaretlik rastgele veriyle SQL fonksiyonu ve uygulamadaki hesap üç kapsamda (hepsi, ORMEN sayfası, tek firma) karşılaştırılıyor; sonuçlar birebir aynı. Günler iki tarafta da İstanbul saatine göre.
- Fonksiyonu yalnızca sunucu (service role) çalıştırabiliyor.

---

## Faz 2, iş 5: Kısa paylaşım linki (5 Ekim 2026)

- **Ne:** Paylaşımda artık `…/s/Ab3dE9xK` gibi 8 karakterlik link veriliyor; açılınca kalıcı yönlendirmeyle (`308`) her zamanki `/p/…` sayfasına gidiyor. WhatsApp önizlemesi aynı (yönlendirmeyi izliyor; uçtan uca testte doğrulandı).
- **Kod içerikten türetiliyor** (uzun kimliğin SHA-256 özeti, base62). Aynı kombinasyon her seferinde aynı kodu alıyor, tekrar paylaşmak tabloya satır eklemiyor. Başka bir kombinasyonla çakışırsa (pratikte olmaz) 10 karakterlik kod veriliyor.
- **Uzun link hiç kaybolmuyor:** Paylaşım penceresi önce uzun linkle açılıyor, kısa link 2,5 sn içinde gelirse yerine geçiyor. Gelmezse uzun link kalıyor; her iki link de çalışıyor. Kioskta QR da kısalıyor (daha seyrek, daha kolay okunan bir QR).
- Yalnızca geçerli bir kombinasyon kaydediliyor (`shares` tablosu zaten vardı; migration gerekmedi). Kişisel veri yok.
- **Supabase'siz Vercel'de kısa link verilmiyor:** Bellekteki kayıt tek sunucu kopyasında kalır, link başka kopyada açılmayabilirdi. O durumda uzun link kullanılıyor.
- Numune talebiyle panele düşen "Seçimi aç" bağlantısı uzun `/p/…` olarak kalıyor (kendi kendine yeterli, veritabanına bağlı değil).

---

## Faz 2, iş 4: Showroom kiosk modu (4 Ekim 2026)

- **Açılış:** Herhangi bir konfigüratör adresinin sonuna `?kiosk` (ör. `/f/firma?kiosk`). Bekleme süresi varsayılan 90 sn; `?kiosk=120` gibi 30–600 sn verilebilir. Panelde firma sayfasında kiosk bağlantısı yazıyor. Ayrı bir kiosk uygulaması ya da hesap yok; bir tarayıcıyı tam ekran açmak yetiyor.
- **Karşılama ekranı:** Firma logosu, "Kumaşı koltuğun üstünde görün", firma renginde "Başlamak için dokunun". İlk dokunuşta tam ekrana geçiyor (tarayıcı izin verirse).
- **Sıfırlama:** Son dokunuştan sonra süre dolmadan 10 sn önce "Hâlâ burada mısınız?" sayacı; dokunulmazsa sayfa başlangıç adresine dönüyor. Sekme belleği (beğendiklerim, ziyaret numarası) siliniyor; açık pencereler ve yarım kalmış numune formu da gidiyor. Böylece bir sonraki kişi öncekinin seçimlerini ya da yazdığı telefonu görmüyor ve raporda yeni ziyaret sayılıyor. Sıfırlama sayfayı yeniden yükleyerek yapılıyor: en güvenilir temizlik bu.
- **"Telefona al":** Kioskta "Paylaş" yerine kombinasyonun QR'ı çıkıyor; ziyaretçi telefonuyla okutup evine götürüyor. WhatsApp, indirme ve yazdırma kioskta yok (ortak cihazda anlamsız).
- Uzun basınca açılan menü ve metin seçimi kapalı; çift dokunmayla yakınlaşma engelli.
- **Test:** Uçtan uca testte Playwright'ın saatiyle 30 sn'lik bekleme hızlandırılıp karşılama, QR, uyarı, "Devam et" ve sıfırlama (kumaş ve beğendiklerim başa dönüyor) doğrulanıyor.
- **Bilinen sınır:** Tarayıcının kendi tam ekran/kiosk ayarı (adres çubuğunu tamamen gizleme, ekran kararmasını kapatma) cihazdan yapılmalı; README'de kısa not var.

---

## Faz 2, iş 3: Firma ve model başına kumaş serisi (4 Ekim 2026)

- **Firma:** Panelde firma ayarlarında "Firma sayfasında gösterilecek ORMEN serileri". Seçilirse firma sayfasında (ve o sayfadan paylaşılan linkte) yalnızca o seriler var. Boşsa yayındaki bütün kumaşlar.
- **Model:** Her modelde (dosyadan ya da seçerek) "Bu modelde sunulan kumaş serileri" (ör. bir koltuk yalnızca bukle serileriyle). Konfigüratörde seçili parçanın modeline göre kumaş listesi değişiyor ve üstte "… bu serilerle sunuluyor" yazıyor. Yeni eklenen parça, seçili kumaş o modelde yoksa modelin varsayılan kumaşıyla, o da yoksa izinli ilk kumaşla geliyor. "Bu kumaşı tümüne uygula" yalnızca o kumaşı sunan parçalara uygulanıyor.
- **Seri düzeyinde, kumaş düzeyinde değil:** Plan `model_fabrics` (kumaş kumaş seçim) tablosu öngörüyordu. Firmaların "şu koleksiyonlar" diye düşündüğünü varsayıp seri seçtirdim: on kumaşı tek tek işaretlemekten hızlı, yeni renk eklenince kendiliğinden dahil oluyor. `model_fabrics` tablosu kullanılmıyor; kumaş kumaş seçim gerekirse oradan devam edilir.
- **Kırılmaz kural:** Kısıt hiçbir kumaşa uymuyorsa (seri gizlendi ya da kaldırıldı) liste boş kalmıyor, sayfanın bütün kumaşları gösteriliyor.
- Eski paylaşım linkleri kısıt yüzünden bozulmuyor: linkteki kumaş firma sayfasında yoksa o parça linkten düşüyor, sayfa açılıyor.
- **Veritabanı:** Üçüncü migration (`20261006000000_fabric_series_limits.sql`): `firms.fabric_series`, `models.fabric_series` (boş liste = hepsi). Panelden gelen seri adları kayıtta katalogla karşılaştırılıp temizleniyor.

---

## Faz 2, iş 2: Modüler takımlar (U, şezlonglu, şezlonglu köşe) (4 Ekim 2026)

- **Plandan sapma:** Yol haritasında "sol kol, orta, köşe, şezlong modüllerini düğmelerle ekleme" vardı. Bunun yerine köşe takımını genelleştirdim: **sol uç** ve **sağ uç** ayrı ayrı Kol, Köşe ya da Şezlong olabiliyor; arka duvar boyu ve her ucun boyu giriliyor. Bununla düz kanepe hariç Türkiye'de yaygın bütün takımlar çıkıyor: L köşe (sağda/solda), U koltuk, şezlonglu kanepe, şezlonglu köşe takımı. Gerekçe: atölye modelini "kaç modül" diye değil "hangi şekil, kaç cm" diye tarif ediyor; altı düğme ve iki ölçü, modül modül dizmekten daha hızlı ve hatasız. Modül genişliklerini tek tek vermek gerekirse sonra eklenir.
- Panelde tip adı "Köşe / modüler takım"; seçime göre şeklin adı hemen yazıyor ("Şu an: U koltuk").
- Şezlong eni 90 cm, boyu 130–200 cm; köşe dönüşü 130–320 cm. Arkada en az bir oturum (60 cm) kalmazsa kayıt engelleniyor. Uç türü değişince boy o türe uygun bir değere çekiliyor (şezlong ~160, köşe 220).
- İlk sürümde kaydedilen tek köşeli tarif (`koseYonu`, `koseBoyCm`) okunurken yeni biçime çevriliyor; veritabanında değişiklik gerekmedi.
- Birim testi her şekil için dış ölçüyü ve kumaşın gerçek ölçüsünü kontrol ediyor.

---

## Faz 2, iş 1: Seçerek model oluşturma (parametrik koltuk ve köşe takımı) (4 Ekim 2026)

- **Varsayım:** REKABET-PLANI'nda "Faz 2'nin ilk işi parametrik koltuk ve köşe takımı olsun mu? Önerim: evet" diye sormuştum; Fatih Bey "Devam" dedi. Bunu bu öneriye onay sayıp başladım. Pilot firma seçimi hâlâ Fatih Bey'de.
- **Ne yapılıyor:** Panelde "Yeni model" artık iki yol sunuyor: "Seçerek oluştur" ve "3D dosya yükle". Seçerek: tip (ikili, üçlü, dörtlü kanepe, köşe takımı, berjer, puf), kol (ince, kalın, yuvarlak, kolsuz), sırt (alçak, orta, yüksek), ayak (ahşap konik, ince metal, gizli kaide), ölçüler; köşe takımında köşenin yönü ve yan duvar boyu. Sağda seçili ORMEN kumaşıyla canlı önizleme.
- **Nasıl çiziliyor:** Mevcut örnek kanepenin minder parçasıyla (UV'leri metre cinsinden). Köşe takımı üç modül: arka duvar boyunca düz bölüm, iki duvarı da sırtlı köşe karesi, yan duvar boyunca 90° döndürülmüş düz bölüm. Kumaş her parçada gerçek ölçüsünde; birim testi her tip için ölçüleri ve kumaş yoğunluğunu kontrol ediyor (minder kabarıklığı yüzeyi yaklaşık %1,6 uzatıyor, örnek kanepede de böyle).
- **Ölçü aralıkları** tipe göre sınırlı (ör. üçlü 180–270 cm, köşe takımı arka duvar 200–380 cm, yan duvar 150–320 cm). Oturma yüksekliği her tipte 44 cm, sırt yüksekliği 72/82/95 cm. Bu değerler gerçek ürün verisi değil, yaygın ölçülere göre benim seçimim; pilot firmalarla düzeltilmeli.
- **Panelde açık not:** "Bu model sizin seçimlerinizle kodla çizilir; gerçek ürünün birebir kopyası değil, kumaşı doğru ölçüde gösteren bir benzeridir." Müşteriye birebir ürün gibi sunulmasın diye.
- **Veritabanı:** İkinci migration (`20261005000000_parametric_models.sql`): `models.params` (jsonb) ve `procedural_key = 'parametric'`. Tarifi olmayan parametrik modeli kurallar reddediyor (PGlite'ta test edildi). Kayıtta tarif sunucuda yeniden doğrulanıyor.
- **Vitrine örnek köşe takımı** eklendi (`/?y=kose-takimi…`, seed.sql'de de var).
- **AR** parametrik modellerde de çalışıyor (aynı kod yolu).
- **Gerçek L/U şekli:** Köşe takımı yerleşimde birkaç dikdörtgen olarak hesaplanıyor: arka duvar boyunca uzanan bölüm, köşe ya da şezlong uçları (`paramFloorRects`, `lib/parametric/spec.ts`). L'nin içine konan sehpa ya da berjer "çakışma" uyarısı vermiyor, "Mobilya ekle" boş yer ararken L'nin içini de kullanabiliyor, plandaki boşluk ölçüleri parçaların kendisine kadar alınıyor ve teklif föyündeki plan L/U çizgisini çiziyor.
  - Duvara yaslama ve oda sınırı hâlâ dış kutuyla yapılıyor. Duvarlar düz olduğu için sonuç aynı.
  - L biçimli odanın kesik köşesinden kaçınma da dış kutuyla yapılıyor; bu temkinli tarafta kalıyor, çakışmaya yol açmıyor.
  - Bir birim testi, parçaların modelin gerçek 3D geometrisini (3 cm payla) kapsadığını denetliyor; çizim kodu ile yerleşim hesabı birbirinden kayarsa test kırılıyor.
  - Dosyayla yüklenen (GLB) modeller kutu olarak kalıyor; şekillerini bilmiyoruz.

---

## Son kalite turu (4 Ekim 2026)

- **Erişilebilirlik:** Bütün sayfa türleri axe-core ile WCAG 2 A/AA'ya göre tarandı. Tek ciddi sorun soluk gri yazı rengiydi (#7D7B75, kontrast 4,0:1). Renk #6B6963'e koyulaştırıldı; açık zeminlerin hepsinde 4,5:1'in üstünde. 3B sahne "görsel" olarak işaretliydi; içindeki mobilya araç çubuğunu ekran okuyuculardan gizliyordu, "grup" yapıldı. Tarama artık uçtan uca testin parçası (`tests/e2e/a11y.spec.ts`; yeni geliştirme paketi `axe-core`, gerekçe bu).
- **Küçük telefon:** 375 px genişlikte "Numune iste" düğmesi ekrandan taşıyordu. Küçük ekranda "Odamda gör" ve "Paylaş" yalnızca simgeyle gösteriliyor (ekran okuyucu için yazıları duruyor).
- **Güvenlik başlıkları:** Her sayfada `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (AR için yalnızca `xr-spatial-tracking` açık). Panel başka bir sitenin çerçevesinde açılamıyor. Herkese açık sayfalar (ana sayfa, firma sayfaları, paylaşım) çerçevede açılabiliyor: firmalar konfigüratörü kendi sitelerine gömebilsin diye, bilerek.
- **Numune formuna spam koruması:** Görünmeyen bir tuzak alanı. Botlar doldurursa başarılı cevabı alıyor ama hiçbir şey kaydedilmiyor. IP'ye dayalı sınırlama yapılmadı (IP tutmama kuralı).
- **Hız (üretim derlemesi, bu ortamda):** Konfigüratör sayfası yaklaşık 1,7 MB JavaScript (sıkıştırılmış yaklaşık 450 KB), çoğu three.js ve 3B kütüphaneleri. AR, QR ve model dışa aktarma kodu ilk yüklemeye girmiyor, gerektiğinde iniyor. Sahne bu ortamda (yazılımla çizim, ekran kartı yok) 4,5 sn'de hazır oluyor; gerçek bir bilgisayarda daha kısa olması beklenir ama ölçülmedi. REKABET-PLANI'ndaki "< 3 sn" hedefi gerçek cihazda ölçülmeli.

---

## Dilim 7: Kullanım kaydı, rapor, Faz 3 yeri (4 Ekim 2026)

- **Olaylar:** sayfa açıldı, kumaş denendi, oda değişti, AR açıldı (telefonda AR oturumu gerçekten başlayınca, düğmeye basınca değil), paylaşıldı, numune istendi. Tarayıcı `sendBeacon` ile gönderiyor; sayfa yavaşlamıyor, gönderilemezse sessizce vazgeçiliyor.
- **Kişisel veri yok:** IP, tarayıcı bilgisi, konum tutulmuyor; sunucu bunları istekten okumuyor bile. "Ziyaret" sayımı için sekme kapanınca silinen rastgele bir numara (`sessionStorage`) kullanılıyor; kimseyi tanımlamıyor. Cihaz yalnızca telefon/tablet/masaüstü. API bilinmeyen alanı ve türü kaydetmiyor.
- **Sayılmayanlar:** Panelde oturumu açık olan ORMEN çalışanları ve otomatik testler. Aynı şeyin 2 saniye içinde tekrarı tek sayılıyor.
- **Rapor (`/panel/rapor`):** Dönem (7/30/90 gün) ve sayfa (hepsi, ORMEN ana sayfası, tek firma) süzgeci. Özet kutuları, en çok denenen 10 kumaş, günlük ziyaret, firma tablosu. "Ziyaret başına deneme" ve "100 ziyarette numune" REKABET-PLANI'ndaki hedeflerle (5 ve 3) birlikte gösteriliyor. Günler İstanbul saatine göre.
- Rapor hesabı ilk sürümde uygulamada yapılıyordu (en fazla 50.000 olay); Faz 2'de veritabanına taşındı.
- **Faz 3 yeri:** `lib/ai/reupholster.ts` yalnızca arayüz ve "yakında" diyen sahte (mock) bir uygulama. Hiçbir servise istek atmıyor. Kumaş panelinin altında "Kendi koltuğunuzda görün · Yakında" kutusu var; tıklanmıyor.
- **Belgeler:** `YOL-HARITASI.md` (yayın öncesi yapılacaklar ve sonraki fazlar) ve `KUMAS-CEKIM-REHBERI.md` (ORMEN ekibi için kumaş çekimi) eklendi.

---

## Dilim 6: AR, "Odamda gör" (4 Ekim 2026)

- **Akış:** Üst çubukta "Odamda gör". Telefonda seçili parça, seçili kumaşıyla bir pencerede açılıyor; "Odamda gör"e dokununca telefonun AR'ı açılıyor (iPhone: Quick Look, Android: Chrome'un WebXR'ı, olmazsa Scene Viewer). Bilgisayarda QR çıkıyor; QR telefonda `/ar/…` sayfasını, aynı parça ve kumaşla açıyor. Firma sayfasından gelindiyse logo ve renk de taşınıyor.
- **Plandan sapma: AR dosyası sunucuda değil tarayıcıda üretiliyor.** Planda sunucuda `@gltf-transform` ile kumaşlı GLB derlemek vardı. Bunun yerine telefonda, ekrandaki modelin aynısı three.js ile GLB'ye çevriliyor. Gerekçe: sunucu tarafı ek paket, dosya önbelleği ve WebP→JPEG dönüştürme gerektiriyordu; tarayıcıda üretilen dosya ekranda görülenle birebir aynı ve sunucuya yük yok. Bedeli aşağıdaki Scene Viewer sınırı.
- **Kumaşın gerçek ölçüsü dosyanın içine "pişiriliyor":** Doku tekrarı, AR uygulamalarının farklı yorumlayabileceği doku dönüşümüyle değil, doğrudan UV koordinatlarına yazılıyor. iPhone'un USDZ'ye çevirmesi dahil her yolda aynı kalıyor. Birim testi ve uçtan uca testte dosyada doku dönüşümü olmadığı kontrol ediliyor.
- **Dosya boyutu:** Berjer yaklaşık 1,2 MB, kanepe 2,2 MB (1024 px JPEG dokular, indeksli geometri). İlk denemede 6,8 MB çıkmıştı; geometri gereksiz yere açılıyordu, düzeltildi. Aynı model+kumaş ziyaret boyunca bir kez üretiliyor.
- **Yeni paket: `@google/model-viewer` 4.3.1** (Apache-2.0). Quick Look, WebXR ve Scene Viewer'ı tek bileşende topluyor, iPhone için USDZ'yi kendisi üretiyor. Yalnızca "Odamda gör" açılınca yükleniyor. Paket three 0.183 istiyor, projede 0.186 var; `package.json`'daki `overrides` ile projenin three'sini kullanması sağlandı (tek three kopyası). Uçtan uca testte model-viewer bu sürümle modeli sorunsuz yüklüyor.
- **Bilinen sınır (Scene Viewer):** Google'ın Scene Viewer uygulaması dosyanın internette bir adresi olmasını istiyor; tarayıcıda üretilen dosyayı açamıyor. Android'de Chrome + ARCore varsa WebXR kullanılıyor ve sorun yok. WebXR olmayan tarayıcılarda (ör. Samsung Internet) AR açılmayabilir; o durumda ekranda açıklama çıkıyor ve model 3B olarak inceleniyor. Gerçek cihaz testinde sık görülürse sunucuda GLB üretimi eklenir.
- **Test edilemeyenler:** Bu ortamda gerçek iPhone ya da Android yok. Doğrulanan: doğru cihazda doğru yol, geçerli GLB, kumaş malzemesi, JPEG dokular, dosya boyutu, model-viewer'ın dosyayı yüklemesi. Doğrulanmayan: AR'ın gerçekten açılması, yere oturma, ölçünün gerçek boyuta uyması, iPhone'daki USDZ dönüşümü. README'de 5 dakikalık deneme listesi var.

---

## Dilim 5: Firma sayfaları, QR ve A6 kart (4 Ekim 2026)

- **Adresler:** `/f/<firma>` firmanın bütün modelleri, `/f/<firma>/<model>` tek model (ör. showroomdaki koltuğun üstüne konan QR için). Bilinmeyen ya da yayında olmayan firma 404.
- **Firma sayfasında ne görünüyor:** Önce firmaya özel yüklenen modeller, sonra firmanın panelde seçtiği ORMEN vitrin modelleri. İkisi de yoksa bütün vitrin. Firmaya özel modeller ORMEN ana sayfasında görünmüyor. Kumaşlar her zaman ORMEN kataloğunun tamamı (model başına kumaş kısıtı Faz 2'ye bırakıldı; `model_fabrics` tablosu hazır).
- **Marka:** Firma logosu sol üstte, firma rengi "Numune iste" düğmesinde ve vurgularda. Düğmedeki yazı rengi (beyaz ya da koyu) firma rengine göre kontrast hesabıyla seçiliyor. Panel, açık zeminde zor görünecek renklerde uyarıyor. "Kumaşlar: ORMEN TEKSTİL" imzası her firma sayfasında duruyor.
- **Paylaşım firmayı taşıyor:** Firma sayfasında üretilen `/p/…` linki firmanın adını içeriyor (`f`), açılınca aynı logo ve modellerle geliyor. Firma sonradan kapatılırsa link ORMEN görünümüyle açılmaya devam ediyor.
- **Numune talebi:** Firma sayfasından gelen talep panelde firma adıyla görünüyor; "WhatsApp'tan da gönder" firmanın numarasına gidiyor. Var olmayan firma adıyla gönderilen talep firmaya yazılmıyor.
- **QR:** Panelde SVG (matbaa için, vektör) ve 1200 px PNG. Sunucuda `qrcode` paketiyle üretiliyor; yalnızca `/f/...` adreslerine izin var. Adres `NEXT_PUBLIC_SITE_URL`'den alınıyor; bu değişken boşken panel "geçici adres, bastırmayın" uyarısı gösteriyor. **Gerçek alan adı bağlanmadan QR bastırılmamalı.**
- **A6 kart:** Logo, kısa çağrı, büyük QR, adres ve ORMEN imzası. Teklif föyü gibi tarayıcıdan "PDF olarak kaydet" ile tek sayfa A6 PDF çıkıyor (Chromium'da doğrulandı: 105 × 148 mm, 1 sayfa).
- **Logo:** PNG, JPEG ya da WebP, en fazla 2 MB. SVG kabul edilmiyor (betik taşıyabilir). Örnek firmanın logosu bizim çizdiğimiz bir yer tutucu.
- **Bağlantı adı değişirse** eski QR ve linkler çalışmaz; panel düzenlerken bunu uyarıyor. Yönlendirme (eski adı yeni adrese taşımak) yapılmadı.
- **Hata düzeltmesi:** Teklif föyünün yazdırma kuralı sayfadaki her şeyi gizliyordu; A6 kart boş çıkıyordu. Kural yalnızca föy yazdırılırken geçerli olacak şekilde daraltıldı.
- **Hata düzeltmesi:** Firma rengi düğmeye ulaşmıyordu (Tailwind renk değişkenleri sayfa kökünde çözülüyor). Değişkenler firma kapsayıcısında da tanımlanıyor; uçtan uca testte düğme rengi ölçülüyor.
- Supabase'de firmanın vitrin model listesi "sil ve yeniden yaz" ile kaydediliyor (iki adım, tek işlem değil). Aynı anda iki kişinin aynı firmayı düzenlemesi beklenmediği için kabul edildi.

---

## Dilim 4: Yönetim paneli (4 Ekim 2026)

- **Veri katmanı:** Supabase anahtarları tanımlıysa her şey Supabase'de (Postgres + Storage), değilse bellekteki örnek veriyle çalışıyor. Sayfalar hangisinin çalıştığını bilmiyor (`lib/data/`). Bellek modunda panelin üstünde sarı uyarı var: eklenenler sunucu yeniden başlayınca kaybolur. **Vercel'de panelin gerçekten kullanılması için Supabase şart.**
- **Şema:** `supabase/migrations/…_init.sql`. Her tabloda satır güvenliği (RLS) açık. Herkes yalnızca yayındaki kumaş/model/firmayı okuyabiliyor; numune talebi ve olaylara yalnızca ekleme yapabiliyor; okuma ve düzenleme yalnızca panel kullanıcısında. Şema ve kurallar testte gerçek bir Postgres'te (PGlite) çalıştırılıp deneniyor.
- **Örnek veri SQL olarak:** `supabase/seed.sql`, Supabase'in SQL ekranına yapıştırılıyor. Önce Node ile çalışan bir betik yazdım, sonra vazgeçtim: yazılımcı olmayan biri için kopyala-yapıştır daha kolay ve SQL dosyası testte iki kez çalıştırılıp denenebiliyor. Dosya `npm run seed:sql` ile örnek veriden üretiliyor.
- **Panel girişi:** Supabase Auth (e-posta + şifre). Kayıt ekranı yok; kullanıcıyı ORMEN Supabase'den ekliyor ve `profiles` tablosuna satır ekleyerek yetki veriyor. Profil satırı olmayan kullanıcı panele giremiyor. Supabase yokken tek bir deneme kullanıcısı (`PANEL_DEMO_EMAIL/PASSWORD`, imzalı çerez) var; geliştirme ortamında varsayılanı `demo@ormen.local / ormen-demo`, üretimde varsayılan yok.
- **Sunucu yetkisi:** Panel işlemleri önce oturumu kontrol ediyor, sonra sunucuda service role anahtarıyla yazıyor. Bu anahtar tarayıcıya hiç gitmiyor.
- **Dosya yükleme:** Fotoğraf ve modeller tarayıcıdan doğrudan Supabase Storage'a gidiyor (sunucunun verdiği tek kullanımlık imzalı adresle). Vercel'in 4,5 MB istek sınırına takılmamak için böyle. İzinli klasörler `kumaslar/`, `modeller/`, `logolar/`; SVG kabul edilmiyor (içinde betik taşıyabilir).
- **Kumaş fotoğrafı tarayıcıda işleniyor:** Ek yeri kontrolü (kenarlar birbirini tutuyor mu), istenirse kenar yumuşatma, renk fotoğrafından kabartı (normal) ve pürüzlülük haritası üretimi, 1k/2k boyutlar, küçük görsel, ortalama renk ve renk ailesi önerisi. Sunucuya ağır iş düşmüyor, ek paket gerekmedi. Üretilen haritalar `derived_maps = true` olarak işaretleniyor; ileride ayrı çekilmiş haritalar gelirse ayırt edilebilir.
- **Gerçek fotoğraf yüklenince "yer tutucu" işareti kalkıyor.** Yalnızca bilgileri düzenlemek dokuya ve bu işarete dokunmuyor.
- **Kumaş silinmiyor, gizleniyor.** Silme, geçmiş taleplerdeki ve paylaşım linklerindeki kodları anlamsız bırakırdı. Vitrinde en az bir model açık kalmak zorunda.
- **Teknik değerler uydurulmuyor:** Formda kompozisyon, gramaj, Martindale gibi alanlar boş bırakılabiliyor ve konfigüratörde boşsa hiç gösterilmiyor. Toplu ekleme şablonu da "bilmediğinizi boş bırakın" diyor.
- **Toplu ekleme:** CSV (Excel'in `;` ayraçlı Türkçe biçimi ve `,` ikisi de okunuyor) ve fotoğraflar. Fotoğraf, `fotograf` sütunundaki adla (boşsa kumaş koduyla, uzantıdan bağımsız) eşleşiyor. Zaten var olan kodlar atlanıyor: toplu ekleme yanlışlıkla mevcut kumaşın üstüne yazmasın diye. İşlem tarayıcıda satır satır yürüyor, sunucu zaman sınırına takılmıyor.
- **Model yükleme:** `.glb` dosyası tarayıcıda okunuyor (Draco sıkıştırmalı dosyalar da). Malzeme listesi, ölçüler ve üçgen sayısı çıkarılıyor. Adında "kumas/fabric/minder…" geçen malzemeler önceden işaretleniyor. Birim yanlışsa (mm/cm ile dışa aktarılmış) kayıt engelleniyor. 15 MB üstü ve 400 bin üçgen üstü için uyarı, 60 MB üstü ret. İşaretlenen malzemelerde UV ölçüsü parçadan parçaya %35'ten fazla değişiyorsa uyarı veriliyor; kumaşın gerçek ölçüde görünmesi buna bağlı.
- **Draco çözücüsü kendi sunucumuzdan:** `public/draco/` (three.js ile gelen Google Draco, Apache-2.0). drei varsayılan olarak Google'ın CDN'ini kullanıyordu; dış bağımlılığı kaldırdım.
- **Örnek puf modeli** (`tests/fixtures/ornek-puf.glb`) `scripts/generate-sample-glb.ts` ile kodla üretildi. Model yükleme testinde ve deneme için kullanılıyor; dışarıdan indirilmiş model yok.
- **Numune talepleri:** Panelde liste, telefon ve WhatsApp'tan yaz bağlantısı, CSV indirme (Excel uyumlu, Türkiye saati). Talepteki "seçimi aç" bağlantısı yalnızca kendi `/p/…` sayfalarımıza izin veriyor; başka adres ya da `javascript:` gelirse kaydedilmiyor.
- **Hata düzeltmesi:** Next.js geliştirme sunucusunda her rota kendi kod kopyasını yüklediği için `instanceof` kontrolleri yanlış sonuç veriyordu (yüklenen dosyalar 404 dönüyordu). Tür kontrolü addan yapılıyor.
- **Yeni paketler:** `@supabase/supabase-js` ve `@supabase/ssr` (veritabanı, dosya, oturum çerezleri), geliştirme için `@electric-sql/pglite` (şemayı testte gerçek Postgres'te denemek için).

### Planlanıp bu dilimde yapılmayanlar

- Triplanar yedek malzeme (UV'si bozuk modeller için): şimdilik yalnızca uyarı var.
- Panelde kumaş başına ΔE renk doğruluğu değeri: renk testi uçtan uca testte duruyor, panelde gösterilmiyor.
- Supabase'e karşı canlı deneme yapılamadı (bu ortamda Supabase projesi yok). Şema ve örnek veri PGlite'ta, panel akışları bellek modunda uçtan uca test edildi. İlk kurulumda bir tur elle deneme gerekiyor.

---

## Dilim 3: Paylaşım, numune talebi, teklif föyü (4 Ekim 2026)

- **Paylaşım bağlantısı veritabanı gerektirmiyor.** `/p/<kimlik>` içindeki kimlik; yerleşimin, odanın ve görünümün base64url ile kısaltılmış hali (`lib/share.ts`). Bu yüzden:
  - Link sonsuza kadar çalışıyor.
  - Vercel demosunda, yani Supabase yokken de çalışıyor.
  - Sunucuda hiçbir şey saklanmıyor.
  - Bedeli: link uzun (yaklaşık 120 karakter). WhatsApp'ta sorun değil. İleride `shares` tablosuyla kısa kimlik eklenebilir.
- **WhatsApp önizlemesi (Open Graph görseli)** sunucuda üretiliyor (`app/p/[id]/opengraph-image.tsx`). İçinde kumaş renkleri, büyük ORMEN kodları, mobilya adları ve "Kumaşlar: ORMEN TEKSTİL" imzası var. 3D sahnenin anlık görüntüsü sunucuda üretilemediği için önizlemede yer almıyor; o görüntü, paylaşılan görsel dosyasının kendisinde.
- **Paylaşım görseli** tarayıcıda oluşturuluyor (`lib/share-image.ts`). Sahnenin seçim işaretleri olmadan alınmış anlık görüntüsü, altında firma logosu (yoksa ORMEN), her kumaşın dokusu, büyük kodu ve hangi mobilyada olduğu bulunuyor, ayrıca renk uyarısı ve ORMEN imzası. Biçim JPEG, 1600 px genişlik.
- **Paylaşım penceresi:**
  - Cihaz paylaşım menüsü (Web Share API destekleniyorsa).
  - WhatsApp.
  - Bağlantıyı kopyala.
  - Görseli indir.
  - Föyü yazdır.
  
  Masaüstü öncelikli olduğu için pencere her zaman açılıyor; sistem menüsü varsa içinde ayrı bir düğme olarak çıkıyor.
- **Önizleme adresi:** `metadataBase` sırasıyla `NEXT_PUBLIC_SITE_URL`, Vercel'in üretim adresi, Vercel'in dağıtım adresi ve yerel adres arasından seçiliyor. Önceden henüz yayında olmayan alan adı sabit yazılıydı; Vercel demosunda WhatsApp önizlemesi boş çıkardı.
- **Teklif föyü (A4):**
  - Sayfa ekranda gizli, yalnızca yazdırırken görünüyor; tarayıcının "PDF olarak kaydet" seçeneği PDF'i üretiyor. Bu yolu seçtik çünkü sunucu tarafı PDF kütüphaneleri Türkçe karakter için ayrıca yazı tipi dosyası gömmeyi gerektiriyor; tarayıcı ise sitenin yazı tiplerini doğrudan kullanıyor.
  - İçerik: firma ya da ORMEN logosu, tarih, sahne görüntüsü, mobilya ve kumaş tablosu (yalnızca bilinen künye alanları), vektör kat planı (`PlanSvg`) ve kombinasyonu açan QR kod.
  - Doğrulama: Chromium'da PDF olarak üretilip kontrol edildi.
- **Numune talebi:**
  - Form alanları: ad, telefon, isteğe bağlı not, KVKK onayı. Formda kombinasyondaki kumaşlar listeleniyor ve seçili olan önceden işaretli geliyor.
  - Telefon, Türkiye biçimlerinde kabul edilip `+90…` biçimine çevriliyor.
  - Doğrulama, tarayıcı ve sunucuda aynı kuralları kullanıyor (`lib/samples.ts`). Sunucu bilinmeyen kumaş kodunu reddediyor.
  - Kayıtta IP ya da cihaz bilgisi tutulmuyor.
  - Gönderimden sonra "WhatsApp'tan da gönder" düğmesi çıkıyor: firma sayfasında firmanın numarasına, ana sayfada `NEXT_PUBLIC_ORMEN_WHATSAPP` numarasına hazır mesaj gidiyor. Numara tanımlı değilse düğme gizli.
  - Supabase bağlıyken talepler `sample_requests` tablosunda kalıcı; bağlı değilken bellekte (Dilim 4).
- **KVKK:** `/kvkk` sayfasındaki aydınlatma metni **taslak**. Yayından önce hukuk danışmanına onaylatılmalı; sayfada da böyle yazıyor.
- **Yeni paket:** `qrcode` (föydeki QR; panelde firma QR'ları için de kullanılacak). `pdf-lib` eklenmedi, tarayıcının yazdırma özelliği yetti.

---

## Dilim 2d: Yerleşim (mobilya ekle, taşı, döndür, çoğalt, kaldır) (4 Ekim 2026)

Fatih Bey'in isteği: koltuğu hareket ettirmek, mobilya eklemek. Bu karar, istem dosyasındaki "mobilya sürükleme yok" maddesini değiştiriyor.

- **Yerleşim modeli** (`lib/room/layout.ts`, saf ve test edilebilir): Her parçanın modeli, kumaşı, oda içindeki konumu (m) ve dönüşü (derece) var. Oda koordinatlarında arka duvarın iç yüzü z = 0'da. Önceden oda koltuğa göre konumlanıyordu; artık mobilyalar odaya göre konumlanıyor.
- **Mobilya ekle:** Araç çubuğundaki menüden ekleniyor. Yeni parça otomatik olarak boş bir yere konuyor; önce arka duvar boyunca ortaya yakın, sonra yan duvarlar, sonra odanın içi deneniyor. Yeni parça o an seçili kumaşı alıyor.
- **Seçim:** Mobilyaya tıklanınca seçiliyor. Zeminde altın renkli ince bir çerçeve çıkıyor. Mobilyanın üstünde küçük bir araç çubuğu beliriyor: ↺ 45°, ↻ 45°, Çoğalt, Kaldır. Planda bu çubuk mobilyayı örtmemesi için mobilyanın ötesine konuyor.
- **Taşıma:** Mobilya fareyle zemin üzerinde sürükleniyor; 3D'de ve planda aynı şekilde.
  - Sürükleme sırasında kamera dönmüyor.
  - Mobilya duvarların dışına çıkamıyor ve L odanın girintisinden dışarı itiliyor.
  - Duvara 10 cm'den yaklaşınca 3 cm boşlukla duvara yapışıyor (mıknatıs).
- **Çakışma:** Üst üste binen mobilyalar kırmızı kesikli çerçeveyle gösteriliyor ve panelde uyarı çıkıyor. Engellenmiyor, kullanıcı ayırıyor.
- **Kumaş:** Seçici, seçili parçaya uygulanıyor. Birden fazla parça varken "Bu kumaşı tümüne uygula" bağlantısı var. Karşılaştırma modu yalnızca seçili parçayı ikiye bölüyor; diğer parçalar iki tarafta da aynı görünüyor.
- **Plan ölçüleri:** Seçili parçanın kapladığı alan ve dört yandaki boşluğu gösteriliyor. Boşluk en yakın engele, yani duvara ya da başka mobilyaya kadar ölçülüyor. 45° dönmüş parçada genişlik ve derinlik, parçanın zeminde kapladığı dikdörtgenin ölçüsü.
- **Bağlantı:** `?y=moduler-kanepe.LUMA-02.0.51.0_berjer.SIENA-03.40.240.45` biçiminde. Sırasıyla model, kumaş, x (cm), z (cm) ve dönüş (°); parçalar "_" ile ayrılıyor. Eski `?m=` ve `?k=` bağlantıları da açılıyor. Tarayıcılar adres güncellemesini sınırladığı için bağlantı her sürükleme adımında değil, 350 ms sonra yazılıyor. En fazla 12 parça.
- **Gölgeler:** Her parçanın kendi zemin gölgesi var ve parçayla birlikte taşınıyor. Anahtar ışığın gölge haritası yerleşim değiştikçe yeniden çiziliyor.
- **Bilerek yapılmayanlar:** Serbest açıyla döndürme tutamacı (45° adım yeterli görüldü), mobilyaların birbirine yapışması, geri al/ileri al, sehpa ve halı gibi kumaşsız aksesuarlar. Faz 2'de parametrik koltuk ve köşe takımı modülleriyle birlikte ele alınabilir.

---

## Dilim 2c: 2D plan görünümü ve rekabet planı (4 Ekim 2026)

Fatih Bey'in isteği: "3D ve 2D ayrımı olsun", ve ORMEN Atelier, EasternGraphics'in (pCon) Türkiye'deki rakibi olarak konumlansın. Strateji `REKABET-PLANI.md` dosyasında.

- **3B / Plan düğmesi** sahne araç çubuğunda. Plan, tepeden ve perspektifsiz bir görünüm. Bir mimari çizim gibi okunuyor:
  - Duvar kesitleri koyu antrasit (mimari "poşe").
  - Oda iç ölçüleri duvarların dışında, koltuğun genişliği ve derinliği koltuğun yanında yazılı.
  - Koltuktan sol ve sağ duvarlara mesafe ile koltuğun önündeki boşluk kesikli çizgilerle gösteriliyor.
  - 1 metrelik ölçek çubuğu var.
  - Plan modunda fareyle kaydırılabiliyor ve tekerlekle yakınlaştırılabiliyor; döndürme kapalı.
- **Teknik:** Plan, ayrı bir dik izdüşüm (orthographic) kamerayı geçici olarak varsayılan kamera yapıyor. 3D kamera ve onun yörünge kontrolü hiç değişmiyor; plandan çıkınca aynı 3D görünüme dönülüyor. Etiketler ve karşılaştırma sürgüsü plan modunda da çalışıyor.
- **Geçiş:** 160 ms'lik bir solma kamera değişimini gizliyor. Plan durumu adrese yazılıyor (`?g=plan`), paylaşılan link planla açılabiliyor.
- **Duvar köşeleri:** Duvarlar dış köşelerde uzatılarak birleşiyor, L odanın iç köşesinde uzatılmıyor. Önceki sürümde iç köşede duvar oda içine 12 cm taşıyordu; bunu bir test denetliyor.
- **Duvar üst kapakları** 3D'de de koyu görünüyor (maket kesiti). Bu bilerek yapıldı.
- Plan yalnızca bakmak ve ölçmek için. Mobilya sürükleme, kapı ve pencere yok (bkz. `REKABET-PLANI.md`, "Bilerek yapmadıklarımız").

---

## Dilim 2b: Ölçüler, yakından bak, karşılaştır, beğendiklerim, renk testi (4 Ekim 2026)

- **Ölçü göstergesi:** Ölçüler modelin gerçek sınır kutusundan okunuyor; veritabanındaki elle girilmiş değerden değil. Böylece yüklenen her GLB'de ekranda görünen ölçü modelin kendisiyle tutarlı. Örnek kanepe ve berjerin kayıtlı ölçüleri de ölçülen geometriye göre düzeltildi (238×96×85 ve 81×84×94 cm). Bir test, ikisinin 1 cm'den fazla ayrışmamasını denetliyor.
- **Yakından bak:** Kamera, koltuğun üstünden oturma yüzeyine bir ışın gönderip çarptığı noktaya 42 cm mesafeye yaklaşıyor. Hiçbir modele özel ayar gerektirmiyor. Bu modda yakınlaşma sınırı 18 cm ile 1,2 m arasında. "Uzaklaş" kullanıcının seçtiği açıyı koruyarak genel görünüme dönüyor.
- **Karşılaştır:** İkinci bir koltuk kopyası ayrı bir çizim katmanında duruyor. Ekran sürgünün solunda birinci, sağında ikinci kumaşla iki kez çiziliyor. Oda, ışık ve gölge iki tarafta ortak, böylece karşılaştırma adil. Sürgü fareyle sürüklenebiliyor ve klavyede ok tuşlarıyla kaydırılabiliyor. Paneldeki "Sol" ve "Sağ" kutularından hangisi seçiliyse dokunulan kumaş o tarafa atanıyor. Karşılaştırma açıkken çizim iki katı iş yapıyor; telefonda bu modun akıcılığı ölçülmedi.
- **Beğendiklerim:** Kalp düğmesiyle tutuluyor. Liste `sessionStorage`'da, yani sekme kapanınca siliniyor ("oturum boyunca"). En fazla 24 kumaş. Sunucuya hiçbir şey gönderilmiyor.
- **Renk doğruluğu testi** (`tests/e2e/colour.spec.ts`): Kumaş nötr stüdyoda yakın planda çizdiriliyor. Ekranın ortasındaki ortalama renk, dokunun ortalama rengiyle CIEDE2000 (ΔE00) ölçüsüyle karşılaştırılıyor. Son ölçümler:

  | Kumaş | Doku | Ekran | ΔE00 | Açıklık farkı | Ton ve doygunluk |
  |---|---|---|---|---|---|
  | LUMA-01 Kırık Beyaz | #E6DFD1 | #E9E2D4 | 0,67 | +1,06 | 0,01 |
  | SIENA-03 Zeytin | #6B6A45 | #6D6C3D | 2,72 | +0,64 | 2,66 |
  | SIENA-05 Kiremit | #A3583A | #AC562D | 3,39 | +0,73 | 3,32 |
  | PIETRA-05 Bordo | #6B2B2F | #77282D | 3,07 | +1,56 | 2,83 |
  | VERSO-05 Antrasit | #3A3937 | #2F2D2A | 3,91 | −5,43 | 0,87 |

  Okuma: ΔE00 2'nin altı neredeyse fark edilmez, 2-5 arası yan yana konunca fark edilir. Doygun renklerde (zeytin, kiremit, bordo) hafif bir doygunluk artışı var. Bu artış ton eşleme ve sheen katmanından geliyor. Koyu antrasit ise biraz daha koyu çıkıyor. Test, ton ve doygunluk kaymasının 4'ü, toplam farkın 6'yı geçmemesini şart koşuyor. Ölçüm yazılımsal grafik çiziciyle (SwiftShader) yapıldı; gerçek ekranlar ayrıca kendi renk sapmalarını ekler. Ekrandaki "numune isteyin" uyarısı bu yüzden önemli.

---

## Kapsam değişikliği: oda şekli ve ölçü (4 Ekim 2026)

Fatih Bey, Saloni'nin oda planlayıcısının ekran görüntülerini paylaştıktan sonra iki karar verdi:

1. **"Telefon önemli değil, internet sitemizde rahatça çalışsın yeter."** Tasarım önceliği masaüstü. Telefon düzeni çalışır halde kalıyor ama ince ayar masaüstü için yapılıyor. AR doğası gereği telefon özelliği olduğu için plandaki yerinde, daha düşük öncelikle duruyor.
2. **"Oda şekli ve ölçü girme olsun."** Bu karar, istem dosyasındaki "serbest oda çizim aracı yapma" maddesini kısmen değiştiriyor. Bu kararla:
   - Uygulananlar:
     - Dört oda şekli: duvarsız, dikdörtgen, L biçimli, köşe (iki duvar).
     - Genişlik, derinlik ve tavan ölçüsü (cm).
     - Yedi duvar rengi, dört zemin.
     - Üç hazır sahne başlangıç noktası olarak duruyor: nötr stüdyo, açık modern salon, koyu ve sıcak salon. İstemdeki hazır sahne şartı bunlarla karşılanıyor.
   - Bilerek yapılmayanlar:
     - Serbest duvar çizimi.
     - Kat planı yükleme.
     - Mobilya sürükleme, kopyalama ve silme.
     - T ve U biçimli odalar.
     
     Bunlar Faz 2'de ele alınabilir.

Ayrıntılar:
- Koltuk her zaman arka duvara (iç yüzeye 4 cm mesafeyle) ve yatayda ortaya yerleşiyor. L biçimli odada girinti ön sağ köşede ve girinti oranı sabit (%42).
- Koltuk odaya sığmıyorsa (iki yanda 10 cm, önde 40 cm boşluk yoksa) panelde uyarı çıkıyor, oda yine çiziliyor.
- **Maket görünümü:** Kameranın dış tarafında kaldığı duvar otomatik gizleniyor; oda her zaman içeriden görülüyor.
- **Duvar rengi** dekor olduğu için hafif öz ışıkla (emissive %32) çiziliyor. Böylece kırık beyaz duvar gri görünmüyor. Kumaşı aydınlatan ışık hiçbir sahnede değişmiyor; yalnızca ortam ışığının şiddeti hazır sahneye göre %90-100 arasında oynuyor. Koyu salonun "sıcaklığı" ışık renginden değil, duvar ve zemin renginden geliyor.
- Oda bilgisi adrese okunabilir biçimde yazılıyor: `?oda=dikdortgen.520x440x280.kirik-beyaz.acik-mese` ya da hazır sahne için `?oda=koyu-salon`. Paylaşım dilimi bunu kullanacak.
- Ölçü kutuları yazarken değil, Enter'a basınca ya da kutudan çıkınca uygulanıyor. Böylece "450" yazarken oda önce "4" ölçüsüyle kurulmuyor.
- Zemin dokuları (`scripts/generate-floors.ts`) kodla üretildi: 18 cm tahtalı meşe ve ceviz parke, mikro beton, 60×60 traverten.

---

## Fatih Bey'in cevapları (3 Ekim 2026)

| Soru | Cevap | Sonucu |
|---|---|---|
| Alan adı | `atelier.ormentekstil.com.tr` | `NEXT_PUBLIC_SITE_URL` varsayılanı bu adres. QR kodları bu adrese göre üretilecek. |
| Supabase | Ayrı proje | İç yazılımlardan bağımsız yeni bir Supabase projesi kurulacak. |
| ORMEN logosu ve WhatsApp | "Örnek yap şimdilik" | Yazıdan oluşan sade bir logo kullanılıyor: Fraunces yazı tipiyle "ORMEN" ve altında "ATELİER". ORMEN WhatsApp numarası yer tutucu olarak boş; panelden girilebilecek. |
| Numuneyi kim ulaştırıyor | Soru anlaşılmadı, sadeleştirilip tekrar soruldu | **Varsayım:** Talep her durumda panele düşer. Firma sayfasında WhatsApp mesajı firmaya, ana sayfada ORMEN'e gider. |
| Mevcut kumaş listesi | Görsel ve içerik yok | Toplu yükleme şablonu kendi sütun düzenimizle hazırlanacak. Örnek kumaşların teknik alanları boş bırakıldı. |

---

## Dilim 1: Dönen koltuk ve kumaş değiştirme

### Teknik kararlar

- **Next.js 16 (App Router) ve React 19.2.** `create-next-app` ile kuruldu. Next 16'da `params` ve `searchParams` asenkron; `PageProps`/`LayoutProps` tipleri `next typegen` ile üretiliyor.
- **Ton eşleme: `NeutralToneMapping`.** Khronos'un "PBR Neutral" eğrisi, ürün renklerini korumak için tasarlandı. ACES ise doygunluğu düşürüp tonu kaydırıyor. Pozlama 1,0'da sabit.
- **Renk uzayları:** Renk haritası `SRGBColorSpace`, normal ve pürüzlülük haritaları `NoColorSpace` (lineer). Yer alan: `lib/three/fabric-material.ts`.
- **Malzeme:** `MeshPhysicalMaterial`. Rengin tamamı dokudan gelir (`color = beyaz`), böylece önizleme, fotoğraf ve render aynı kaynaktan beslenir. Kumaş tipine göre ayar setleri `lib/fabric/presets.ts` dosyasında.
- **Işık yalnızca nötr beyaz.** Ortam ışığı kodla üretilen "Lightformer" panelleriyle kuruldu (HDRI dosyası yok). Anahtar ışık beyaz bir yön ışığı. Sahneler ileride yalnızca ışığın şiddetini ve yönünü değiştirecek, rengini değil.
- **Gerçek ölçek:** Her kumaş parçası için "UV yoğunluğu" (1 UV biriminin kaç cm yüzeye denk geldiği) geometriden ölçülüyor, tekrar = UV yoğunluğu / doku tekrar ölçüsü (cm). Bu sayede rastgele bir GLB'de de doğru ölçek elde ediliyor. Yer alan: `lib/fabric/scale.ts`, test: `tests/unit/scale.test.ts`.
- **Kodla üretilen koltuklar** (`lib/three/procedural/`): Yuvarlatılmış ve bombeli "minder" parçalarından oluşuyor. UV'ler köşe yaylarında yay uzunluğuyla açılıyor (1 UV = 1 m); kumaş kenarlardan dönerken ölçek bozulmuyor. Kodla üretilen koltuk ile yüklenen GLB aynı kumaş sistemini kullanıyor: malzeme adı `kumas` olan her parça kumaşı alıyor.
- **Kumaş geçişi:** Yeni doku tamamen yüklenene kadar eski kumaş ekranda kalıyor. Sonra aynı geometrinin üstünde saydam bir kopya 0,32 saniyede belirip asıl malzemenin yerine geçiyor. Hızlı art arda seçimlerde yalnızca son seçim uygulanıyor. İlk açılışta model, kumaşı giydirilmeden önce gizli; gri koltuk hiç görünmüyor. Yer alan: `lib/three/fabric-dresser.ts`.
- **Doku boyutu:** Büyük ekran ve fare kullanılan cihazda 2K, diğerlerinde (telefon, tablet) 1K.
- **Çizim yalnızca gerektiğinde** (`frameloop="demand"`): Sahne yalnızca hareket, geçiş ya da değişiklik olduğunda çiziliyor. Bu, telefonda pil ve ısı için önemli.
- **Gölgeler:**
  - Zemin gölgesi model başına bir kez hesaplanıyor (`lib/three/ground-shadow.ts`). drei'nin `ContactShadows` bileşeni three 0.186 ile boş çizdiği için kendi küçük uygulamamızı yazdık.
  - Anahtar ışığın gölge haritası yalnızca model ya da kumaş değişince yeniden çiziliyor (`autoUpdate: false`). Işık sahneye sabit olduğu için koltuğu döndürmek ek maliyet getirmiyor.
- **Açılış dönüşü:** İstemde "yarım tur" isteniyordu. Tam 180° dönüş koltuğun arkasında biteceği için dönüşü yan görünümden (−100°) ön-sağ 3/4 görünüme (+29°), yani yaklaşık 130°'lik bir yay olarak kurduk. Kullanıcı sahneye dokunduğu an dönüş kesiliyor. Sistemde "hareketi azalt" açıksa dönüş hiç oynatılmıyor.
- **Kamera sınırları:** Kamera yerin altına inmiyor (kutup açısı ufkun 3,4° üstünde sınırlı), modelin sınır küresine girmiyor ve kaydırma (pan) kapalı.
- **Arama Türkçe karakterlere duyarsız:** "lacıvert", "LACİVERT" ve "lacivert" aynı sonucu veriyor. Yer alan: `foldTr()` (`lib/i18n/tr.ts`).
- **Kumaş bağlantısı:** Seçilen kumaş adres çubuğuna `?k=SIENA-04` olarak yazılıyor; model ise `?m=berjer`. `replaceState` kullanılıyor, böylece geri tuşu kumaş kumaş geri gitmiyor.
- **Klavye:** Kumaş seçici bir `radiogroup`; ok tuşları, Home ve End ile geziliyor. Sekme tuşuyla tek bir durak var (roving tabindex).
- **Veri katmanı:** Tek bir `Repository` arayüzü var. Supabase anahtarları yokken bellek içi örnek veriyle çalışıyor. Supabase uygulaması panel diliminde eklenecek.

### Paketler ve gerekçeleri

| Paket | Neden |
|---|---|
| `three`, `@react-three/fiber`, `@react-three/drei` | İstemde belirtilen 3D yığını. drei'den yalnızca `OrbitControls`, `Environment`, `Lightformer` ve `useGLTF` kullanılıyor. |
| `server-only` | Veri katmanının yanlışlıkla tarayıcı koduna girmesini derleme anında engeller. |
| `sharp` (geliştirme) | Örnek kumaş dokularının WebP olarak üretilmesi. Panel diliminde yüklenen fotoğrafları boyutlandırmak için çalışma zamanı bağımlılığına taşınacak. |
| `tsx` (geliştirme) | TypeScript betiklerini (doku üretimi, seed) doğrudan çalıştırmak. |
| `vitest`, `@playwright/test` (geliştirme) | İstemde istenen birim ve uçtan uca testler. |
| `@types/node@22` | Vitest 5, Node 22+ tiplerini istiyor. Proje Node 22 ile çalışıyor. |

Kaldırılanlar: `zod` (henüz kullanılmadığı için; form dilimine kadar eklenmeyecek).

### Bilinen sınırlar ve test edilemeyenler

- **Kadife ve şönil:** Gerçek hav yönü (tüyün yatışına göre renk değişimi) simüle edilmiyor. `sheen` ve düşük normal şiddetiyle "yumuşak parlaklık" veriliyor; yakından bakınca gerçeği kadar inandırıcı olmayacak. Örnek veride kadife ve şönil yok; gerçek çekimlerle ayar yapılması gerekecek.
- **Örnek dokular gerçek kumaş değil.** Bukle, dokuma, nubuk ve balıksırtı kodla, milimetre ölçüsünde üretildi. Panelde "yer tutucu" olarak etiketlenecek.
- **Performans testi yalnızca yazılımsal grafikle yapıldı** (sunucuda GPU yok). Orta sınıf Android'de akıcılık gerçek cihazda ölçülmedi. Mimari kararlar (1K doku, talep üzerine çizim, gölgenin bir kez hesaplanması) bunu hedefliyor.
- Konsolda `THREE.Clock` kullanım dışı uyarısı görünüyor. Bu uyarı bizim kodumuzdan değil, `@react-three/fiber` 9.8'in içinden geliyor; hata değil.

## Pilot hazırlığı: ziyaret kaynağı ve etiket (5 Ekim toplantısı, 2. madde)

- **Ne:** Her olay, ziyaretin geldiği yeri sabit bir listeden taşıyor: `kiosk`, `qr`, `paylasim`, `site`, `dogrudan`. Varsa ORMEN'in bağlantıya koyduğu bir şube/kampanya etiketi de ekleniyor (`?e=ankara-1`). Rapor bu ikisine göre ziyaret ve numune sayısı veriyor. 30 ziyaretin altında oran gösterilmiyor.
- **Nasıl belirleniyor (`lib/source.ts`):** Ziyaretçinin girdiği adrese bakılıyor, ziyaretçinin kendisine değil.
  - `?kiosk` kiosk, `?q` basılı QR demek. Panel QR'ları ve A6 kartı bu işareti kendileri ekliyor.
  - `/p/…` paylaşım sayılıyor.
  - Önceki sayfa başka bir siteyse "site" yazılıyor; o sitenin hangisi olduğu saklanmıyor.
  - Bunların hiçbiri yoksa "doğrudan" sayılıyor.
  - Kaynak, ziyaretin ilk sayfasında okunuyor ve sekme kapanana kadar `sessionStorage`'da tutuluyor. Konfigüratör adres çubuğunu sonradan değiştirse de ziyaretin kaynağı kaybolmuyor.
- **Neden şube, kişi değil:** Satış elemanı numarası istendi (Selin). Ancak "eleman 3" firma için belli bir kişi demek; bu, çalışan performans takibi olur ve ayrı aydınlatma gerektirir (Hakan). Bu yüzden etiket serbest bir sabit değer olarak bırakıldı ve panelde "kişi adı yazmayın" uyarısı konuldu. Eleman bazında takip istenirse avukata sorulacak.
- **Etiket biçimi:** Küçük harf, rakam ve tire; en fazla 32 karakter. Panelde yazılan "Ankara Şube 1" kendiliğinden `ankara-sube-1` olur. Veritabanı da aynı kuralı denetliyor.
- **`ar_acilamadi` olayı:** Telefonda AR başlamadığında yazılıyor. Bu iki durumda oluyor: cihaz ya da tarayıcı AR'ı desteklemiyor, ya da oturum hata veriyor. Raporda AR kutusunda görünüyor. Faz 2 madde 6 (sunucuda GLB) bu sayıya göre yapılacak.
- **Veritabanı:** `20261009000000_visit_sources.sql` dosyası `events` tablosuna `source` ve `tag` sütunlarını ekliyor, olay türü listesini genişletiyor ve `atelier_report` fonksiyonuna iki yeni döküm ekliyor. Daha önceki olaylar raporda "Kayıt yok" olarak görünüyor. SQL raporun uygulamadaki hesapla aynı sonucu verdiği PGlite testinde kaynak ve etiketle birlikte denetleniyor.
- **Renk ibaresi (1. madde):** Ekranda, paylaşım görselinde, teklif föyünde ve AR sayfasında artık "renkler bağlayıcı değildir; renk onayı numuneyle verilir" yazıyor.

## Pilot hazırlığı: cihaza göre görüntü kalitesi (3. madde)

- **Başlangıç seviyesi (`lib/three/quality.ts`):** Tarayıcının bildirdiği bilgilere göre seçiliyor: ekran ve fare, işlemci çekirdeği, bellek.
  - Telefonlarda en yüksek piksel oranı 1,5.
  - Zayıf telefonlarda (≤ 4 çekirdek ya da ≤ 3 GB bellek) piksel oranı 1,25 ve gölge haritası 1024.
  - Masaüstünde değişiklik yok.
- **Yavaşlayınca düşürme:** Sahne yalnızca gerektiğinde çiziliyor. Bu yüzden ölçüm yalnızca art arda gelen karelerde yapılıyor (açılış dönüşü, sürükleme); 0,2 sn'den uzun aralar bekleme sayılıyor. 30 karenin ortancası ~30 kare/sn'nin altına düşerse piksel oranı 0,25 azaltılıyor, en az 1'e kadar. Oran hiç geri artırılmıyor, böylece görüntü "nefes almıyor".
- **Neden drei'nin `PerformanceMonitor`'ı değil:** O bileşen sürekli çizim varsayıyor. İsteğe bağlı çizimde iki kare arasındaki bekleme süresini yavaşlık sanıp kaliteyi gereksiz yere düşürürdü.
- **Ölçülmedi:** Gerçek orta sınıf Android'de denenmedi (sunucuda GPU yok). Eşikler gerçek cihaz testinde (toplantı M5) ayarlanacak.
- **Test notu:** Playwright, `sendBeacon` ile giden isteğin gövdesini okuyamıyor. Rapor testinde `sendBeacon` kapatılıyor; sayfa `fetch` yedeğini kullanıyor ve gönderilen olayın içeriği (kaynak, etiket, IP olmaması) böylece gerçekten denetleniyor.

## Kesim masası, 1–2. adım: numune formu ve "yakında" vitrini (2. toplantı)

- **"Not" alanı kalktı.** Toplantıda 9 oyun 9'u bu yöndeydi; Fatih Bey kararı toplantıya bırakmıştı.
  - **Neden:** Serbest metne adres ya da TC kimlik no yazılabilir. Brief'te ise tek kişisel veri ad ve telefon.
  - **Yerine üç seçmeli soru geldi.** Hepsi isteğe bağlı:
    - Ne için: yeni koltuk / yeniden döşeme
    - Kaç parça: tek parça / takım
    - Ne zaman: 1 ay içinde / araştırıyorum

    Bu sorular kişisel veri taşımıyor ve geri arayan satış elemanına notun verdiğinden daha düzenli bilgi veriyor (Selin, Zeynep, Ece).
  - **Sunucu tarafı:** `validateSample` bilinmeyen alanları atıyor. Eski bir tarayıcı sekmesi hâlâ `note` gönderse bile kaydedilmiyor.
  - **Veritabanı:** `20261010000000_cutting_table.sql` dosyası `note` sütununu siliyor, seçenekleri sabit listeyle denetliyor. Aynı dosya bir sonraki adım için şunları da hazırlıyor:
    - talep adımları (yeni → hazırlanıyor → mağazaya gönderildi → siparişe döndü / dönmedi),
    - numune kodu,
    - lot,
    - adım tarihi.
  - **KVKK metni** buna göre güncellendi: "Formda serbest metin alanı yoktur." Avukat onayı hâlâ bekliyor.
- **"Kendi koltuğunuzda görün: yakında" kartı ekrandan kalktı.**
  - **Neden:** Brief gerçek yapay zekâyı yasaklıyor. Bu kart tutamayacağımız bir söz vermiş oluyordu. Defne: "Her 'yakında', markadan küçük bir yalan."
  - `lib/ai/reupholster.ts` arayüzü Faz 3 için duruyor, ama ekranda gösterilmiyor.

## Kesim masası, 3. adım: talep adımları, numune etiketi, `/n/<kod>` (2. toplantı)

- **Adımlar:** yeni → hazırlanıyor → mağazaya gönderildi → siparişe döndü / dönmedi. Numuneyi ORMEN keser ve firmanın mağazasına gönderir; bu karar 9 oyun 9'uyla alındı. Müşterinin adresi hiç alınmıyor, böylece brief değişmiyor.
- **Numune kodu:** `N-` ve ardından 6 karakter. Karakterler, birbirine karışmasın diye I ve O'suz 34 harf ve rakamdan rastgele seçiliyor. Kod talep kaydedilirken veriliyor. Supabase'de benzersiz; nadir bir çakışmada yeniden çekiliyor.
- **Etiket (`/panel/etiket/<id>`):**
  - 100 × 70 mm, siyah beyaz, kumaş başına bir tane.
  - Üzerinde: kumaş kodu, seri ve renk, lot (girildiyse) ya da elle yazılacak kutu, numune kodu ve tarih, `/n/<kod>`'u açan QR.
  - Müşteri bilgisi yok. Kerem'in "kâğıtta yanlış renk basmayalım" uyarısı yüzünden renkli kumaş görseli de konmadı.
- **Lot elle giriliyor.** Hakan'ın önerisi: iki hafta sonra kaç talebe lot yazıldığı sayılacak. Depo yazmıyorsa lot kilidi fikri kod yazılmadan bırakılacak.
- **`/n/<kod>` sayfası herkese açık; bu bilerek seçildi.**
  - **Gösterdikleri:** yalnızca numune, lot, mağaza adı, tarih ve adım. Arama motorlarına kapalı.
  - **"Bu numuneyle sipariş verildi" düğmesi:** Talebi "siparişe döndü"ye taşıyor, ama yalnızca talep henüz kapanmamışsa. Siparişe dönüş böylece müşterinin telefonu olmadan, numune koduyla ölçülüyor.
  - **Neden giriş yok:** Kodu yalnızca etiketi elinde tutan biliyor; tahmin edilmesi pratikte imkânsız (34⁶ ≈ 1,5 milyar). Yanlış basılırsa ORMEN panelden geri alıyor. Firewall hız sınırına `/n/` de eklendi.
  - **Aynı sayfadaki "ORMEN'e metraj ve lot için yaz" bağlantısı:** ORMEN'in WhatsApp'ına hazır mesaj açıyor (numune, kumaş, lot, mağaza). Bu, 8. maddenin ("ORMEN'e ön bildirim") ilk hâli. "24 saatte teyit" sözü sayfaya yazılmadı; bu bir operasyon kararı ve Fatih Bey onaylamadı.
- **Teknik not:** Panelde talep kartını her kayıttan sonra `key` ile baştan kurmak, React'te bekleyen işlemin bitmemiş görünmesine yol açtı ve "Kaydet" düğmesi kilitli kaldı. Kart artık yalnızca talep kimliğiyle anahtarlanıyor.

## Kesim masası, 4. adım: kumaşta desen ve kesim yönü

- **Yeni alanlar:**
  - desen: düz / desenli,
  - desenliyse rapor ölçüsü (en × boy, cm),
  - kesim yönü: tek yön (hav ya da desen bir yöne yatıyor, parçalar ters çevrilemez) / çift yön.
- **Neden üç ayrı değer:** Hepsinin "bilinmiyor" hâli var. "Düz" ile "girilmemiş" aynı şey değil: düz kumaşta metraj verilebilir, girilmemişte verilmez (Rıza Usta: "teknik föyde desen tekrarı yoksa hesap yapılmayacak").
- **Örnek veri:** Örnek kumaşlarda bu alanlar bilerek boş. Gerçek değer teknik föyden girilecek.
- **Doğrulama:**
  - Panel, desenli işaretlenmiş bir kumaşta rapor ölçüsünü zorunlu tutuyor.
  - Veritabanı, desensiz bir kumaşa rapor ölçüsü girilmesini reddediyor.
  - Toplu aktarımda "düz/desensiz/desenli" ve "tek/çift (yön)" yazımlarının hepsi kabul ediliyor; anlaşılmayan yazım "bilinmiyor" sayılıyor.
- **Künye:** Değerler girildiyse künyede görünüyor ("Desenli, rapor 32 × 28 cm", "Tek yön").
- **Tek tablo dosyası:** Kesim masasının bütün veritabanı değişiklikleri tek dosyada toplandı: `20261010000000_cutting_table.sql`. Önceki adı `…_sample_flow.sql` idi. Bu dosya henüz hiçbir veritabanında çalıştırılmadığı için yeniden adlandırmak güvenli; Fatih Bey'in kurulumda çalıştıracağı dosya sayısı da artmamış oldu.

## Kesim masası, 5. adım: firmanın kendi metrajı (`lib/metraj.ts`)

- **Ne:** Panelde her modele isteğe bağlı iki değer giriliyor:
  - "bir adet için kumaş (m)",
  - "hangi kumaş eninde (cm)".

  Bu sayı firmanın ustasının sayısı, biz hesaplamıyoruz. Toplantıda Selin önerdi, Mert ve Rıza Usta destekledi.
- **Sayı yalnızca birebir aynı durumda tekrarlanıyor:** kumaşın eni aynı olmalı, kumaş düz ve çift yönlü olmalı.
- **Öteki her durumda sayı yok, yalnızca neden yazıyor:**
  - en farklı,
  - desenli,
  - tek yönlü,
  - bir bilgi eksik.

  Örnek: "Kumaşın eni 280 cm; metraj 140 cm en için girilmiş." Enden ölçekleme ya da fire katsayısı uydurmuyoruz.
- **Takımın toplamı:** Bir kumaş, ancak o kumaştaki her parçanın sayısı varsa toplanıyor. Kısmi toplam gösterilmiyor; "en az 8 m" gibi bir sayı cevap gibi okunur.
- **Sonrası:** Usta föyündeki "gerçek metre" geri bildirimiyle veri toplanacak. Ustanın kesim reçetesinden hesaplayan motor (Mert'in önerisi) ancak bu gerçek işlerin en az %80'inde tutarsa açılacak.
- **Veritabanı:** `models` tablosuna `meterage_m` ve `meterage_ref_width_cm` sütunları eklendi; ikisi birlikte dolu ya da birlikte boş olmak zorunda. Kesim masası tablo dosyasının içinde.

## Kesim masası, 6–7. adım: usta föyü ve gerçek metre

- **Usta föyü** teklif föyünün ikinci sayfası; aynı "Föyü yazdır" düğmesinden çıkıyor.
  - Önerenler: Rıza Usta ve Kerem. Kerem'in pahalı "silüet pencereli onay kartı" bu sayfadaki zımba kutusuna dönüştü: bıçak yok, matbaa yok.
  - Başlıkta büyük harfle "METRAJ TAHMİNİDİR, USTA TEYİT EDER" yazıyor.
  - Her parça için firmanın metrajı ya da yokluğunun nedeni gösteriliyor.
  - Her kumaş için bir kutu var: numune zımba kutusu, en / desen / yön bilgisi, toplam (yalnızca her parçanın sayısı varsa), lot satırı, "kesilen gerçek metre" satırı ve müşterinin onay imzası.
- **Siyah beyaz:** Renk kâğıtta değil, zımbalı numunede onaylanıyor (Kerem). İlk denemede CSS `filter: grayscale` kullanıldı; bu, Chromium'un PDF çıktısında sayfanın sağını kırptı. Sayfa zaten renksiz tasarlandığı için filtre kaldırıldı.
- **Gerçek metre (`/gercek-metre/<iş>`):**
  - Föydeki QR'ın taşıdığı iş bilgisi: kumaş kodu, modeller, föyde basılan sayı. Firma adı ve ayrıntılar QR'ın içinde duruyor, sunucuda föy kaydı tutulmuyor.
  - Usta, kumaş başına kesilen metreyi yazıyor. Ad ya da telefon istenmiyor.
  - Kayıtlar `cut_reports` tablosuna gidiyor. Bu tablo yalnızca sunucudan okunup yazılıyor (RLS açık, politika yok).
  - Panel raporundaki "Kesim geri bildirimi" bölümü şunları gösteriyor:
    - kayıt sayısı,
    - föyde sayı olanlar,
    - kumaşın yetmediği işler,
    - ortalama fark.

    Kumaşın yetmediği satırlar kırmızıyla işaretli.
  - Hesaplama motoru (Mert) ancak bu veriyle, işlerin en az %80'inde tutarsa açılacak.
- **Kötüye kullanım:** QR'ın içeriği tahmin edilebilir. Biri sahte "gerçek metre" yazabilir; zararı kalibrasyon verisinin kirlenmesiyle sınırlı. Bu yol da firewall hız sınırı kuralına eklendi. Veri azken panelde gözle ayıklanabilir.

## Müşteri telefonu ORMEN'de kalıyor (Fatih Bey, 6 Ekim)

- Hakan'ın "son müşterinin telefonu ORMEN'e hiç gelmesin" önerisi kabul edilmedi. Numune talepleri ad ve telefonla birlikte ORMEN'in kendi veritabanına (Supabase) yazılmaya devam ediyor; bugünkü düzen değişmedi.
- **Dikkat edilecek nokta:** Formdaki onay metni bu bilgileri "yalnızca numune talebi için" kullanma iznini kapsıyor. Aynı numaralara ileride kampanya ya da yenilik mesajı gönderilecekse iki şey gerekir:
  - formda ayrı ve isteğe bağlı bir onay kutusu,
  - ticari ileti kuralları gereği İYS kaydı.

  İstenirse onay kutusu eklenir; metin avukat paketine girmeli.

## Telefonda ilk ekran (1. toplantı, Deniz)

- **Sorun:** 360 px genişliğindeki bir telefonda ilk ekranda tek bir kumaş görünmüyordu; asıl iş olan kumaş değiştirmek aşağıda kalıyordu. Ayrıca:
  - araç şeridi ekrana sığmıyordu ("Plan" kesikti, "Yakından bak" iki satıra kırılıyordu),
  - açılışta koltuğun üstünde döndür/çoğalt araç çubuğu duruyordu.
- **Kumaş şeridi (`QuickStrip`):** Telefonda alt panelin başına, kumaş adının hemen altına yatay kaydırılan bir şerit geldi. Panel yukarı çekilince şerit gizleniyor, çünkü tam liste zaten açık.
  - Şerit panelin sürükleme alanının içinde durduğu için ilk sürümde her dokunuş paneli de açıyordu. Şerit artık dokunuşları ve kaydırmaları kendine alıyor.
  - Düğmeler radyo değil, basılı düğme (`aria-pressed`). Böylece tam listedeki radyo grubu ikilenmiyor.
- **Araç şeridi:** Telefonda yalnızca "Daha fazla" ve "Ekle" kalıyor. "Daha fazla" menüsünde Plan görünümü, Yakından bak, Ölçüler ve Karşılaştır var. Masaüstünde değişiklik yok.
- **Koltuk araç çubuğu:** Telefonda ancak koltuğa dokununca ya da birden fazla parça olunca çıkıyor.
- **Oda kurucu** donmuş durumda (2. toplantı). Telefonda Plan artık menünün içinde; "Oda" sekmesi yerinde duruyor.

## Kiosk paketi (1. toplantı, Deniz ve Selin)

- **"Elinizdeki kartelanın kodu" (`lib/fabric/code-match.ts`):** Kiosk modunda kumaş panelinin en üstünde duran büyük bir kod kutusu.
  - Eşleştirme büyük-küçük harfe, Türkçe harflere, boşluğa ve tireye bakmıyor: "siena04", "SİENA 04" ve "SIENA-04" aynı kumaş.
  - Tam kod yazılınca, ve o koddan uzun başka bir kod yoksa, kumaş hemen giyiyor. Bu kural "SIENA-1" yazılırken "SIENA-10"un yerine geçmesini önlüyor. Enter tuşu da uygular.
  - Kodun bir parçası yazılınca uyan kumaşlar büyük düğmeler olarak çıkıyor: önce o parçayla başlayanlar, sonra içinde geçenler. Bu sayede kartelada büyük yazan "04" de yeterli.
  - Kutuya CSS ile büyük harf uygulanmıyor. Türkçe kuralla "sie" yazısı "SİE" görünürdü, kodlar ise "SIENA" diye yazılıyor.
- **Büyük yazı:**
  - Kioskta sahne dışındaki her şey CSS `zoom` ile 1,25 kat büyütülüyor: üst düğmeler, renk ibaresi, kumaş paneli. Böylece 13 px'lik yazı 16 px oluyor.
  - Kumaş sütunu genişletildi: 1600 px'ten dar ekranda 460 px, daha genişte 540 px.
  - Sahne araç şeridi yalnızca 1600 px'ten geniş ekranda büyüyor; 1280 px'lik tablette büyütülmüş hâli sahneye sığmıyordu.
  - 3B tuvalin kendisi büyütülmüyor; dokunma ve sürükleme koordinatları kaymasın diye.

## Talepleri silme ve saklama süresi (1. toplantı, Hakan)

- **Elle silme:** Paneldeki her talepte iki adımlı bir "Sil" var: "Sil" → "Evet, sil". KVKK'da bir kişi verisinin silinmesini isteyebilir; Fatih Bey telefonların ORMEN'de kalmasını istese de bu yol açık olmalı.
- **Süreli silme:** `SAMPLE_RETENTION_DAYS` ayarı (30–3650 gün) girilirse, o süreden eski talepler panelde talep listesi her açıldığında siliniyor.
  - Ayar bilerek varsayılan olarak kapalı. Süreyi avukat belirleyecek; o zamana kadar talepler elle silinene kadar saklanıyor.
  - /panel/durum bunu "yapılacak" olarak gösteriyor.
  - /kvkk metninde süre için görünür bir yer tutucu var: "[Avukat onayıyla belirlenecek süre]". Metin zaten avukat onayı bekliyor; yayından önce doldurulacak.
- **Neden pg_cron değil:** Supabase'de ayrıca açılması ve izlenmesi gereken bir zamanlayıcı yerine silme, talepleri gören tek yerde, listenin açılışında yapılıyor. Panel kullanılmadığı sürece süresi geçmiş talepler bir süre daha durabilir; bu, pilot ölçeği için kabul edildi.

## Numune sonrası adımlar, mağazaya iletme, askı etiketleri

- **"Bundan sonra" adımları (Deniz):** Numune talebi gönderilince müşteriye üç adım gösteriliyor.
  - Firma sayfasından gelen talepte:
    1. ORMEN numuneyi keser.
    2. Numune firmanın mağazasına gönderilir; müşterinin adresi istenmez.
    3. Numune mağazaya ulaşınca firma ya da ORMEN arar.
  - ORMEN ana sayfasından gelen talepte ORMEN arar.
  - Hiçbir tarih ya da süre sözü yok (Deniz: "uydurma süre yazılmasın").
- **Mağazaya ilet:** Telefon numarası ORMEN'e geliyor; etikette ve mağaza sayfasında kişisel veri yok. Ama müşteriyi mağaza arayacak. Bu yüzden panelde, firmanın WhatsApp numarası girilmişse, talebi tek dokunuşla firmaya ileten bir düğme var: ad, telefon, kumaş, seçimler ve numune kodu. Onay metni zaten "firma ve ORMEN ile paylaşılmasını kabul ediyorum" diyor.
- **Askı etiketleri (`/panel/aski/<firma>`, Selin):**
  - A4 kâğıtta 3 × 8 etiket (63,5 × 33,9 mm, yaygın L7159 yapışkan etiket kâğıdı), firmanın sunduğu her kumaşa bir tane: kod, seri ve renk, QR.
  - QR'ın açtığı adres: `/f/<firma>?q&k=<kod>&e=aski`. Sayfa o kumaş koltuğa giydirilmiş olarak açılıyor ve ziyaret raporda "QR" kaynağıyla, "aski" etiketiyle sayılıyor. Etiket kutusuna şube yazıldıysa o kullanılıyor.
  - Kumaş kodu değişirse eski etiket hiçbir kumaşı açmaz; firma sayfası varsayılan kumaşla açılır. Selin'in "eski QR yanlış kumaşı açar" riski böylece yanlış kumaş yerine "kumaşsız" açılışa dönüşüyor.

## Firmaya aylık özet (1. toplantı, Selin ve Ece)

- **Ne:** `/panel/ozet/<firma>?ay=YYYY-AA` adresinde tek sayfalık bir A4. Üstte firmanın logosu ve rengi var. Sayfada şunlar yer alıyor:
  - ziyaret, kumaş denemesi, AR, numune talebi ve siparişe dönen numune sayıları,
  - en çok denenen 10 kumaş,
  - ziyaretlerin nereden geldiği.
- **Varsayılan ay geçen ay:** Satış temsilcisinin ziyareti genelde ay başında oluyor. Ay sınırları İstanbul saatine göre.
- **Eşik:** 30 ziyaretin altında sıralama gösterilmiyor; az veriyle "en çok denenen" yanıltıcı olur (Ece).
- **"Siparişe dönen":** Numune sayfasında mağazanın "Bu numuneyle sipariş verildi" işaretinden geliyor.
- **Neden ayrı sayfa, neden e-posta değil:** Mert'in itirazı geçerli. E-posta dış servis ve anahtar gerektirir. Bu sayfa ise elden verilen kâğıt; satışçı ziyarete somut bir gerekçeyle gidiyor (Selin).

## Kalite düşürme sürüklemeyi beklemeli

Bir tam test koşusunda, makine yük altındayken mobilya sürükleme testi bir kez kırmızı verdi: berjer hedefin gerisinde bırakılmıştı. Tek başına çalıştırıldığında 3/3 geçti. Muhtemel sebep kademeli kalite ayarı: kareler yavaşlayınca piksel oranı sürükleme sırasında düşürülüyor, tuval yeniden çiziliyor ve araya giren işaretçi hareketleri kayboluyordu. Yavaş bir telefonda gerçekten yaşanabilecek bir durum. Artık sürükleme sürerken düşürme bekletiliyor ve sürükleme bitince uygulanıyor.

## Hazır sahneler (1. toplantı, Deniz)

- **Ne:** Firma başına en fazla 6 hazır sahne. Kumaş panelinin başında kart olarak çıkıyor. Kartta sahnenin kumaşları, adı ve parça sayısı var; tıklanınca sahne aynı sayfada açılıyor.
  - Kiosk işareti, QR işareti ve etiket korunuyor: ziyaretin kaynağı değişmiyor, kiosk kiosk olarak kalıyor.
- **Nasıl eklenir:** Sahne için ayrı bir düzenleyici yazılmadı. Sahne konfigüratörde kuruluyor ve "Paylaş" bağlantısı panelde bir adla yapıştırılıyor. Sahne aslında paylaşım kimliğinin kendisi, bu yüzden veritabanında yalnızca ad ve kimlik tutuluyor (`firms.presets`). Kısa bağlantılar kayıt sırasında uzun kimliğe çevriliyor.
- **Kart görseli:** İlk denemede paylaşım önizleme görseli (`/p/<id>/opengraph-image`) kullanıldı. Ama sunucu 3B çizmediği için kartta yalnızca bir kumaş yuvarlağı ve yazı çıkıyordu. Kart artık sahnedeki kumaşları büyük, üst üste binen yuvarlaklar olarak gösteriyor; ayrıca görsel indirmesi de gerekmiyor.
- **ORMEN'in varsayılan sahneleri yok:** Deniz "firma girmezse ORMEN'in varsayılanları olsun" dedi. Ama hangi kumaşın hangi firmada iyi duracağına ORMEN satışçısı karar vermeli; rastgele seçilmiş varsayılanlar firmanın vitrinini temsil etmez. Sahnesi olmayan firmada bölüm hiç görünmüyor.

## Oda kurucunun kaderi için ölçüm (2. toplantı)

- Oda kurucu donduruldu ve karar veriyle verilecek. Deniz'in ölçütü: pilotta ziyaretlerin %10'undan azı odaya ya da plana dokunuyorsa sadeleştirme önerisiyle Fatih Bey'e rakamla gidilecek.
- **Yeni olay:** `plan_acildi` (2D plan açıldı). Mevcut `oda_degisti` olayıyla birlikte raporda yeni bir "Oda / plan" kutusu oluşturuyor: odayı değiştiren ya da planı açan ziyaret sayısı ve tüm ziyaretlere oranı.
- **Tablo dosyaları:** Olay listesi ve SQL rapor fonksiyonu, henüz çalıştırılmamış `20261009000000_visit_sources.sql` içinde güncellendi. SQL raporun uygulamadaki hesapla aynı sonucu verdiğini denetleyen test bu alanı da kapsıyor.

## Müşterinin telefonu ORMEN'de kalıyor (6 Ekim, Fatih Bey)

- Acil toplantıda Murat Bey "telefon yalnızca firmaya gitsin" dedi. Fatih Bey'in kararı: telefon ORMEN'in veritabanında kalıyor. Akış değişmedi.
- Firmanın kaygısına cevap kâğıtta verilecek: pilot protokolüne "ORMEN, firma sayfasından gelen müşteriyi kendi satışı için aramaz; talebi firmaya iletir" sözü ve formdaki onay cümlesinin yeni hâli. Metin avukatta.

## Kiosk yalnızca kumaş denetir; ana sayfada "Yönetim" bağlantısı (acil toplantı)

- **Kiosk:** Showroom ekranında "Mobilya ekle", 3B / Plan düğmesi, menüdeki "Plan görünümü" ve parça araç çubuğu ("Çoğalt", döndürme) gizli. Ekran gün boyu açık duruyor; bir ziyaretçinin eklediği parça ya da açtığı plan bir sonrakine kalmasın (Mert). Hazır sahneler kioskta duruyor; sahne değiştirmek için yol bu.
- **Yönetim bağlantısı:** Fatih Bey siteyi ilk açtığında "giriş yok" diye şaşırdı. ORMEN ana sayfasının altına küçük bir "Yönetim" bağlantısı kondu. Firma sayfalarında ve kioskta yok; firmanın müşterisi panel bağlantısı görmüyor.
- **Sürükleme testi:** Berjer sürüklenince hedefin birkaç santim gerisine düşebiliyor; parça 0,5 m yükseklikten tutuluyor ve kamera açılış hareketi sürerken perspektif kayması oluşuyor. Test artık tam nokta yerine hedefe 0,35 m yakınlık, aynı model, kumaş ve açı arıyor.

## Gerçek cihaz testi için ölçüm ekranı (`?olcum`)

- **Neden:** Acil toplantının 5. şartı, testin gerçek cihazda ölçülmesi. Mert: "Testler yeşil ama hiçbiri gerçek cihazda koşmadı." "Akıcı mı?" sorusunun cevabı tahmin olmasın diye site kendi ölçtüklerini gösteriyor:
  - cihaza verilen kalite,
  - piksel oranının düşüp düşmediği,
  - sahne dönerken kare hızı,
  - ilk kumaşın gelme süresi,
  - AR sonucu.
- **Yeni özellik değil:** Müşteri bu ekranı görmez. Yalnızca adrese `?olcum` yazılınca çıkar, hiçbir yere veri göndermez, yeni paket gerektirmez. Sonuç "Kopyala" ile WhatsApp'a yapıştırılır.
- **Ölçüt:** Geçme sınırları `CIHAZ-TESTI.md`'de (ilk kumaş mobil veride 6 saniyeyi, kare hızı 25'in altını geçerse pilot bekler).

## Yer tutucuları toplu yayından kaldırma (pilot şartı 1)

- **Ne:** Panelde Kumaşlar sayfasındaki yer tutucu uyarısının altında "Yer tutucuları yayından kaldır" düğmesi var. İki adımla soruyor ve yayındaki bütün örnek kumaşları gizliyor. Kumaşlar silinmiyor; panelde duruyorlar ve tek tek geri açılabiliyorlar.
- **Ne zaman reddeder:**
  - Sitede hiç gerçek kumaş yoksa. Örnek katalog tek başınayken düğme hiçbir şeyi gizlemez.
  - Yayındaki bir firmanın sayfasında gerçek kumaş kalmayacaksa. Kumaşsız firma sayfası "bulunamadı" der ve o firmanın basılı QR'ları boşa düşer. Mesaj bu firmaların adını sayar.

## Numune akışı ölçümü ve 24 saat uyarısı (pilot şartı 6)

- **Neden:** Acil toplantıda talepleri 24 saat içinde işleyen tek bir sahip (Selin) ve 10 siparişin ölçütlerinin tek tabloda toplanması şart koşuldu.
- **Uyarı:** "Yeni" adımında 24 saatten uzun bekleyen talep varsa paneldeki Genel bakış ve Talepler sayfalarının üstünde kırmızı bir uyarı çıkıyor. E-posta ya da SMS yok; dış servis ve anahtar gerektirirdi.
- **Rapor → Numune akışı:** Dört kutu var:
  - 24 saati geçen talep (hedef 0),
  - gönderilen numunelerde lotu yazılı olanlar,
  - talepten mağazaya çıkışa kadar geçen sürenin medyanı,
  - siparişe dönenler.

  Metraj sapması zaten "Kesim geri bildirimi"nde.
- **Bilinen sınır:** Talebin yalnızca son adımı ve zamanı saklanıyor. Bu yüzden gönderme süresi, şu an "gönderildi"de duran numunelerden ölçülüyor. Mağaza "siparişe döndü" deyince gönderme zamanının üzerine yazılıyor. Pilotta 10 sipariş için bu yeterli; her adımın zamanı gerekirse yeni bir veritabanı dosyası (migration) ister.

## Sunucu Frankfurt'ta (`vercel.json`)

- **Sorun:** Vercel'de bölge seçilmezse sunucu kodu ABD'de (Washington, `iad1`) çalışabiliyor. Veritabanı ise Frankfurt'ta. Bu durumda:
  - her sayfa açılışında veritabanı sorguları Atlantik'i gidip geliyor ve sayfalar yavaşlıyor;
  - müşterinin telefonu ABD'deki sunucudan geçiyor. Bu, aydınlatma metninde anlatılması gereken ikinci bir yurt dışı aktarım olurdu.
- **Çözüm:**
  - Depoya `vercel.json` eklendi ve bölge `fra1` (Frankfurt) olarak sabitlendi.
  - Next.js'in sayfa bazlı `preferredRegion` ayarı bu sürümde kullanımdan kalktığı için platform ayarı tercih edildi.
  - Panelin Kurulum sayfası, sunucunun gerçekte çalıştığı bölgeyi (`VERCEL_REGION`) okuyor. Frankfurt değilse uyarıyor.
- **KVKK metni:**
  - Taslağa "Yurt dışına aktarım" paragrafı eklendi: Supabase ve Vercel, Frankfurt. Dayanağı avukat yazacak.
  - "Amaç" cümlesi düzeltildi. Numune müşteriye değil, firmanın mağazasına gidiyor (2. toplantı); eski metin "size ulaştırılması" diyordu.
  - Avukata verilecek bilgi `AVUKAT-PAKETI.md` dosyasında.

## Seçerek oluştur: gerçek yükseklik, sabit sırt, tek parça oturum

- **Neden:** Fatih Bey müşteri firmaların koltuk fotoğraflarını gönderecek. Fotoğraftan 3B model çıkaran yapay zekâ servisleri ücretli ve dış servis; kumaşı da gerçek ölçüde oturtamıyorlar. Bu yüzden "Seçerek oluştur" fotoğraftaki koltuğa daha çok benzeyecek şekilde genişletildi. Pilot şartı 4: firma kendi koltuğunu görmeli.
- **Yükseklik:** Firmanın verdiği ölçü santimetre olarak giriliyor (koltuklarda 65–110 cm, pufta 30–55 cm). Önceden yalnızca alçak, orta ya da yüksek seçilebiliyordu; gerçek ölçü tutmayınca kumaş deseni de yanlış büyüklükte görünürdü. Sırt düğmeleri artık hazır değer kısayolu: birine basınca yazılan yükseklik silinir.
- **Sırt tipi:** Ayrı minderli (önceki hâli) ya da sabit (tek parça, döşemesi gövdeye sabit sırt).
- **Oturum:** Her kişiye ayrı minder ya da tek parça minder. Tek parça oturumda sırt minderleri yine kişi başına; çoğu modelde böyle.
- **Eski modeller:** Yeni seçimler yalnızca seçildiklerinde kaydediliyor. Eski modellerin verisi birebir aynı kalıyor ve veritabanında değişiklik gerekmiyor (`params` alanı zaten jsonb).
- **Kapitone ve kulaklı berjer (ek):**
  - **Kapitone:** Sırt tipine "Kapitone (düğmeli)" eklendi. Sabit sırt panelinde, yaklaşık bir el aralığıyla elmas dizilimli düğme çukurları var. Ayrı bir görsel kullanılmıyor; çukurlar geometrinin kendisinde, bu yüzden kumaş deseni çukura doğru ölçüyle iniyor.
  - **Kulaklı berjer:** Berjere "Kulaklı" seçeneği eklendi. Kanatlar kolun içinden yükseliyor.
- **Kıvrık kol (Chester):** Kol tiplerine eklendi. İnce bir gövdenin üstünde dışa taşan yuvarlak bir rulo var; dış ölçü düz kolla aynı kalıyor. Kapitone sırtla birlikte Chester takımı kurulabiliyor.
- **Hazır stiller:** Formun başında Chester, Modern, İskandinav ve Blok / minimal düğmeleri var. Her biri kol, sırt, oturum ve ayağı birlikte seçiyor; tip ve ölçüler olduğu gibi kalıyor. Fotoğraftan model kuran kişi en yakın stille başlayıp gerisini tek tek değiştiriyor. Bir seçim değişince stil düğmesi sönüyor; ekran yalnızca gerçekten o stilde olanı stil diye gösteriyor.
- **Firmanın fotoğrafı yanında:** Önizlemenin altında "Firmanın fotoğrafını koy" düğmesi var. Fotoğraf önizlemenin altında gösteriliyor ya da saydamlığı ayarlanarak üstüne bindiriliyor; koltuk fotoğraftaki açıya çevrilince oranlar karşılaştırılabiliyor. Fotoğraf tarayıcıdan çıkmıyor: yüklenmiyor, kaydedilmiyor. Böylece müşteri firmanın görseli için ayrı bir izin ve saklama sorusu doğmuyor.
- **Hâlâ çıkmayanlar:** Dikiş ve biye detayı, kolun önündeki sarmal yüzü (Chester kolunun ön kıvrımı düz görünüyor).
