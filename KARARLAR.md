# KARARLAR

Bu dosyada projede verilen kararlar, yapılan varsayımlar ve bilinen sınırlar tutulur. En yeni kayıt en üstte.

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
