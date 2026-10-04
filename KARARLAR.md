# KARARLAR

Bu dosyada projede verilen kararlar, yapılan varsayımlar ve bilinen sınırlar tutulur. En yeni kayıt en üstte.

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
