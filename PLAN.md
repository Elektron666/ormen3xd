# ORMEN ATELIER: Plan (Faz 1)

> Durum: **Plan onaylandı, dilim 1 tamamlandı.** Sorulara verilen cevaplar ve yapılan varsayımlar `KARARLAR.md` dosyasında.

---

## 1. Özet

ORMEN Atelier, ORMEN TEKSTİL'in B2B müşterisi olan mobilya firmalarına hediye edilen, firmanın kendi markasıyla açılan bir 3D kumaş konfigüratörüdür. İçindeki her kumaş ORMEN kumaşıdır, her kumaş kodu ORMEN kodudur, her deneme ORMEN'in veritabanına yazılır.

Üç amaç her kararda kontrol edilecek:

| Amaç | Üründe karşılığı |
|---|---|
| **Kapı açmak** | `/` vitrin ekranı ilk 3 saniyede etkileyici: koltuk yumuşakça dönerek açılır, kumaş tek dokunuşta değişir. Tablette satış sunumu için tasarlanır. |
| **Kilitlemek** | Kumaş kodu her yerde büyük ve kopyalanabilir: künye, paylaşım görseli, WhatsApp mesajı, numune talebi, QR kartı. |
| **Veri toplamak** | Her etkileşim (`kumas_denendi`, `ar_acildi`, `paylasildi`…) firma + model + kumaş ile birlikte anonim olarak `events` tablosuna yazılır. |

---

## 2. Teknoloji ve sürümler

Kurulumdan önce npm'de kontrol edilen güncel kararlı sürümler (kurulumdan sonra gerçek sürümler ve belgeler tekrar kontrol edilecek):

| Alan | Paket | Sürüm | Not |
|---|---|---|---|
| Çatı | `next` | 16.x | App Router, Server Actions, Route Handlers |
| UI | `react` | 19.x | |
| Dil | TypeScript | 5.x | `strict: true` |
| Stil | `tailwindcss` | 4.x | CSS-öncelikli tema (`@theme` jetonları) |
| 3D | `three` | 0.186 | `MeshPhysicalMaterial`, `NeutralToneMapping` |
| 3D | `@react-three/fiber` | 9.x | React 19 uyumlu sürüm |
| 3D | `@react-three/drei` | 10.x | `OrbitControls`, `useGLTF`, `ContactShadows`, `Environment` |
| AR | `@google/model-viewer` | 4.x | Yalnızca AR çıkışı için, tembel yüklenir |
| Veri | `@supabase/supabase-js` + `@supabase/ssr` | 2.x / 0.12 | Auth, Postgres, Storage |
| GLB işleme | `@gltf-transform/core` (+ `extensions`) | 4.x | Sunucuda AR için kumaşlı GLB üretimi, panelde malzeme/ölçü okuma |
| Görsel | `sharp` | güncel | Doku boyutlandırma (1K/2K WebP), normal/pürüz haritası türetme |
| QR | `qrcode` | 1.5 | SVG + PNG, sunucu tarafında |
| PDF | `pdf-lib` | 1.17 | A6 QR kartı |
| Doğrulama | `zod` | güncel | Form ve API girdileri |
| Test | `vitest`, `@playwright/test` | 5.x / 1.6x | Birim + uçtan uca |

UI bileşen kütüphanesi: **shadcn/ui yalnızca ihtiyaç duyulan birkaç ilkel bileşen için** (Dialog, Sheet, Slider). Görünüm tamamen kendi jetonlarımızla; şablon görüntüsü olmayacak. Her paketin gerekçesi `KARARLAR.md`'ye yazılacak.

---

## 3. Klasör yapısı

```
ormen3xd/
├─ app/
│  ├─ layout.tsx                  # yazı tipleri, tema jetonları, lang="tr"
│  ├─ page.tsx                    # "/" ORMEN vitrin konfigüratörü
│  ├─ f/[firm]/page.tsx           # firma sayfası (logo, renk, model listesi)
│  ├─ f/[firm]/[model]/page.tsx   # firma + model konfigüratörü (QR hedefi)
│  ├─ p/[shareId]/page.tsx        # paylaşılan kombinasyon
│  ├─ p/[shareId]/opengraph-image.tsx   # WhatsApp önizleme görseli
│  ├─ panel/
│  │  ├─ giris/page.tsx           # e-posta + şifre girişi
│  │  ├─ kumaslar/…               # liste, tekil düzenleme, toplu CSV
│  │  ├─ modeller/…               # GLB yükleme, malzeme işaretleme
│  │  ├─ firmalar/…               # oluştur, QR/PDF indir
│  │  ├─ talepler/page.tsx        # numune talepleri + CSV
│  │  └─ rapor/page.tsx           # kullanım raporu
│  └─ api/
│     ├─ events/route.ts          # olay kaydı (anonim, toplu gönderim)
│     ├─ share/route.ts           # paylaşım kaydı + görsel yükleme
│     ├─ samples/route.ts         # numune talebi
│     ├─ ar/[model]/[fabric]/route.ts   # kumaşlı GLB (Android Scene Viewer için)
│     └─ qr/[firm]/[model]/route.ts     # QR SVG/PNG/PDF
├─ components/
│  ├─ configurator/               # Configurator, FabricPanel, FabricCard, CompareSlider,
│  │                              # RoomPicker, SampleSheet, ShareButton, ArButton, Dimensions
│  ├─ three/                      # Stage, SofaModel, ProceduralSofa, ProceduralArmchair,
│  │                              # FabricMaterial, RoomScene, CameraRig, ScaleCheckOverlay
│  ├─ panel/                      # panel formları, GLB inceleyici, doku yükleyici
│  └─ ui/                         # Button, Sheet, Dialog… (jetonlu, sade)
├─ lib/
│  ├─ data/
│  │  ├─ repository.ts            # Repository arayüzü (tek giriş noktası)
│  │  ├─ memory-repo.ts           # seed JSON + bellek içi uygulama (.env yoksa)
│  │  └─ supabase-repo.ts         # gerçek Supabase uygulaması (.env doluysa)
│  ├─ fabric/
│  │  ├─ presets.ts               # kumaş tipine göre malzeme ayar setleri
│  │  ├─ scale.ts                 # gerçek ölçek / UV yoğunluğu hesabı
│  │  ├─ color.ts                 # sRGB/lineer dönüşüm, ortalama renk, ΔE
│  │  └─ derive-maps.ts           # renkten yükseklik → normal + pürüz türetme
│  ├─ three/texture-cache.ts      # doku önbelleği, kalite seçimi (1K/2K)
│  ├─ analytics/track.ts          # istemci tarafı olay kuyruğu
│  ├─ ar/                         # cihaz yeteneği tespiti, GLB derleme
│  ├─ ai/reupholster.ts           # Faz 3 arayüzü + mock (gerçek servis YOK)
│  ├─ i18n/tr.ts                  # tüm arayüz metinleri + Türkçe büyük harf yardımcısı
│  └─ supabase/                   # sunucu/istemci istemcileri
├─ scripts/
│  ├─ generate-textures.ts        # prosedürel dokular (bukle, dokuma, nubuk, balıksırtı)
│  ├─ generate-environments.ts    # kodla üretilmiş HDRI'lar (lisans sorunsuz)
│  └─ seed-supabase.ts            # seed JSON'u gerçek Supabase'e yükler
├─ seed/                          # seed.json (kumaşlar, firma, modeller, sahneler)
├─ public/seed/                   # üretilmiş doku ve ortam dosyaları
├─ supabase/migrations/           # SQL migration'lar (tablolar, RLS, storage bucket'ları)
├─ tests/unit/ , tests/e2e/
├─ PLAN.md  KARARLAR.md  YOL-HARITASI.md  README.md
├─ LISANSLAR.md  KUMAS-CEKIM-REHBERI.md
```

---

## 4. Ana bileşenler

### 4.1 Konfigüratör (tek bileşen, üç sayfada kullanılır)
`<Configurator firm? model scene initialFabric? />` — `/`, `/f/[firm]/[model]` ve `/p/[id]` aynı bileşeni farklı başlangıç verisiyle açar.

- **Stage** (r3f `Canvas`): `NeutralToneMapping`, sRGB çıkış, nötr beyaz ışık, `OrbitControls` (sönümlü, kutup açısı sınırlı → yerin altına inmez; min mesafe koltuğun sınır kutusundan hesaplanır → içine girmez).
- **CameraRig**: açılışta yarım tur yavaş dönüş, ilk dokunuşta iptal; "Yakından bak" için yumuşak kamera geçişi.
- **SofaModel**: GLB ya da prosedürel model; `fabricMaterialNames` listesindeki malzemelere `FabricMaterial` uygular.
- **FabricMaterial**: `MeshPhysicalMaterial` + kumaş tipi ön ayarı + gerçek ölçek tekrarı. Yeni doku tamamen yüklenmeden eski kumaş ekranda kalır; yüklenince ~250 ms çapraz geçiş (iki malzeme katmanı, opaklık geçişi). Gri/boş koltuk hiç görünmez.
- **FabricPanel**: telefonda alttan çekilen sayfa (3 durak: kapalı/yarım/tam), tablet+masaüstünde sağda sabit. Seriye göre gruplu, tip ve renk ailesi filtresi, kod/ad arama, künye, Karşılaştır, Beğendiklerim (`sessionStorage`). Klavyeyle gezilebilir (ok tuşları, `role="radiogroup"`).
- **CompareSlider**: iki kumaş, sahneyi bölen sürgü. Uygulama: aynı sahne iki kez, `scissor` ile sol/sağ çizim (tek canvas, ek maliyet düşük).
- **RoomPicker**: 3 hazır sahne + duvar rengi + zemin tipi seçenekleri.
- **Alt bar**: Numune iste · Paylaş · Kendi salonunda gör (AR) · Ölçüler. Altında sabit renk uyarısı.

### 4.2 Yönetim paneli
Supabase Auth (e-posta/şifre, kayıt ekranı yok). Telefonda kullanılabilir tek sütun düzen.
- **Kumaş tek ekran akışı:** fotoğraf sürükle → tekrar ölçüsü (cm) → tip → sağda canlı koltuk önizlemesi → kaydet. Sunucuda: 1K + 2K WebP, küçük önizleme, normal/pürüz yoksa türetme, dikişsizlik testi (kenar farkı) ve gerekirse kenar yumuşatma seçeneği. "Ölçek kontrol" düğmesi koltuğa 10 cm'lik referans kare ızgarası bindirir.
- **Toplu ekleme:** CSV şablonu indir/yükle, satır bazında hata raporu.
- **Model:** GLB sürükle → tarayıcıda okunur, malzeme adları listelenir, sınır kutusundan ölçüler (cm) çıkarılır, elle düzeltilebilir; 15 MB üstünde uyarı + sıkıştırma önerisi.
- **Firma:** ad → slug otomatik, logo, renk, model seç → kaydet → link + QR (SVG, PNG 1200px) + A6 PDF kart hazır.
- **Talepler:** liste + CSV. **Rapor:** firma/kumaş bazında denemeler, ilk 10 kumaş, AR ve paylaşım sayıları, tarih filtresi.

### 4.3 Veri katmanı
Tek `Repository` arayüzü; `NEXT_PUBLIC_SUPABASE_URL` yoksa `memory-repo` (seed JSON + bellek), varsa `supabase-repo`. Uygulama kodu hangisinin çalıştığını bilmez. Bellek deposunda panel girişi için geliştirme kullanıcısı (`demo@ormen.local`) olur; bu yalnızca yerelde çalışır, üretimde kapalıdır.

### 4.4 Veri modeli (SQL migration olarak)
Bölüm 6'daki tablolar birebir: `fabrics`, `fabric_textures`, `firms`, `models`, `model_fabrics`, `scenes`, `sample_requests`, `events`. Ek olarak:
- `shares` (paylaşım: kısa kimlik, firma, model, kumaş, sahne, görsel yolu) — `/p/[id]` için gerekli.
- `firm_models` (firma ↔ model bağı) — Faz 2'de firma başına çok model için şimdiden.
- `profiles` (panel kullanıcısı, rol: `admin`/`staff`) — ileride yetki ayrımı için.
- `fabrics.is_placeholder` — yer tutucu kumaşları panelde etiketlemek için.

RLS: herkese açık okuma yalnızca `is_active = true` kumaş/firma/model/sahne için; `events`, `sample_requests`, `shares` için anonim **yalnızca ekleme**; okuma ve tüm yazma işlemleri yalnızca panel kullanıcısına. Olaylarda IP/kullanıcı ajanı tutulmaz; yalnızca rastgele oturum kimliği ve kaba cihaz tipi (`telefon/tablet/masaustu`).

---

## 5. Veri akışı

```
Sayfa isteği (/f/ornek-mobilya/kanepe-luna)
  └─ Server Component → Repository: firma + model + izinli kumaşlar + sahneler
       └─ yalnızca ilk kumaşın 1K dokusu <link rel=preload>
  └─ Configurator (client)
       ├─ model GLB / prosedürel geometri yüklenir
       ├─ ilk kumaş uygulanır  → olay: sayfa_acildi
       ├─ kalan önizlemeler tembel (görünür oldukça) yüklenir
       └─ kullanıcı kumaş seçer
            ├─ doku önbellekte değilse arka planda yüklenir, eski kumaş kalır
            ├─ hazır olunca çapraz geçiş        → olay: kumas_denendi
            └─ URL ?k=SIENA-04 güncellenir (geri tuşu ve yeniden yükleme korunur)

Olaylar: istemcide kuyruk → 2 sn'de bir / sayfa kapanırken sendBeacon → /api/events → events

Paylaş: canvas.toBlob → logo/model/kod şeridi eklenir → /api/share (görsel Storage'a, kayıt shares'e)
        → Web Share API (dosya + link) | yedek: WhatsApp linki + görsel indir → olay: paylasildi

AR:     Android → /api/ar/[model]/[fabric].glb (sunucuda kumaşlı GLB derlenir, önbelleğe alınır) → Scene Viewer
        iOS     → model-viewer aynı GLB'den USDZ'yi tarayıcıda üretir → Quick Look   → olay: ar_acildi
        Masaüstü→ QR: "Telefonunla okut, salonunda gör."

Numune: form (ad, telefon, not, KVKK onayı) → /api/samples → sample_requests → olay: numune_istendi
        → "WhatsApp'tan gönder" (firmanın, yoksa ORMEN'in numarasına hazır mesaj)
```

---

## 6. Riskli gördüğüm üç teknik konu ve yaklaşımım

### Risk 1: Kumaşın gerçek ölçekte görünmesi (her GLB'de)
**Sorun:** Doku tekrarı modelin UV açılımına bağlı. Rastgele bir GLB'de 1 UV birimi 30 cm de olabilir 3 m de; parça parça farklı da olabilir. Yanlış ölçek, ürünün bana zarar vermesi demek.

**Yaklaşım:**
1. Her kumaş uygulanacak mesh için **UV yoğunluğu** hesaplanır: tüm üçgenlerin dünya alanı toplamı / UV alanı toplamı → `cm_per_uv = √(dünya alanı / UV alanı)`. Doku tekrarı = `cm_per_uv / tekrar_ölçüsü_cm` (genişlik ve yükseklik ayrı). Mesh başına hesaplandığı için minder ile kol farklı açılmışsa bile her parça doğru ölçeğe gelir.
2. UV'si bozuk ya da tutarsız olan modelde (üçgenler arası yoğunluk sapması yüksekse) panelde uyarı verilir ve **triplanar** (UV'den bağımsız, dünya koordinatına göre) yedek malzeme önerilir.
3. Prosedürel koltuk ve berjerde UV'ler baştan **1 UV birimi = 1 m** olacak şekilde üretilir (kontrol kolay).
4. Panelde "Ölçek kontrol": koltuğa 10 cm × 10 cm referans ızgara bindirilir; ilmekler kareyle karşılaştırılır. Vitest ile `scale.ts` için bilinen geometride (1 m küp, 2 cm tekrar → 50 tekrar) birim testi.

### Risk 2: AR'da seçili kumaşın taşınması (özellikle iOS)
**Sorun:** AR görüntüleyicileri sayfadaki three.js sahnesini görmez; kendi dosyasını ister. Android Scene Viewer herkese açık bir GLB URL'si ister (tarayıcıdaki `blob:` adresini kabul etmez). iOS Quick Look USDZ ister ve doku tekrarı (`KHR_texture_transform`) gibi ayrıntıların USDZ'ye doğru geçmesi garanti değil.

**Yaklaşım:**
- Sunucuda `@gltf-transform` ile **kumaşı gömülü GLB** derlenir: `/api/ar/[model]/[fabric].glb`. Dokuya gerçek ölçekteki tekrar `KHR_texture_transform` ile yazılır; sonuç Storage'da/CDN'de önbelleğe alınır (aynı model+kumaş ikinci kez derlenmez). Prosedürel koltuklar da bir kez GLB'ye dışa aktarılıp aynı yoldan geçer.
- `<model-viewer ar ar-modes="webxr scene-viewer quick-look" ar-scale="fixed">` ile gerçek ölçüde yerleşim. iOS'ta `ios-src` verilmez; model-viewer GLB'den USDZ'yi tarayıcıda üretir. Tekrar ayarının USDZ'ye taşınmadığını tespit edersem yedek plan: sunucuda dokuyu tekrar sayısınca **önceden döşenmiş (baked tiling)** doku üretmek — böylece USDZ'de doku dönüşümüne gerek kalmaz.
- Destek tespiti (`canActivateAR`), desteklemeyen telefonda düğme yerine kısa açıklama; masaüstünde QR.
- **Açıkça:** Bu ortamda gerçek iPhone ve Android cihazla test yapamıyorum. Masaüstü tarayıcıda GLB/USDZ üretimini ve dosya geçerliliğini test edeceğim; gerçek cihaz testleri "test edilmedi" diye `KARARLAR.md`'de listelenecek ve sizin yapacağınız 5 dakikalık bir test listesi bırakacağım.

### Risk 3: Renk doğruluğu + orta sınıf Android'de akıcılık
**Sorun:** Kumaş rengi soluk ya da kaymış görünürse yanlış satış olur. Aynı anda ağır doku/gölge/ışık telefonu yorar.

**Yaklaşım (renk):**
- Renk haritası `SRGBColorSpace`, normal/pürüz `NoColorSpace` (lineer).
- Ton eşleme: three.js'nin **`NeutralToneMapping`**'i (Khronos PBR Neutral) — ürün renklerini korumak için tasarlanmış; ACES'in doygunluk düşürmesi ve renk kaydırması yok. Pozlama 1.0 sabit.
- Işık: tüm sahnelerde 6500K nötr beyaz anahtar ışık; oda sahnelerinin HDRI'ları **renk doygunluğu düşürülmüş** olarak kodla üretilir. Sahne değişince yoğunluk/yön değişir, renk sıcaklığı değişmez.
- Test: kumaşın albedo ortalaması ile render edilen ortalama renk arasında **ΔE (CIEDE2000)** hesaplanır. Vitest'te renk matematiği; Playwright'ta gerçek render'dan piksel örneklenip nötr stüdyoda eşik (ör. ΔE < 5) kontrol edilir. Panelde de her kumaş için bu değer gösterilir.

**Yaklaşım (performans):**
- Dokular yüklemede 1K (telefon) ve 2K (masaüstü) WebP olarak boyutlandırılır; cihaza göre seçilir. İlk anlamlı görüntü için yalnızca model + ilk kumaşın 1K dokusu öncelikli; önizlemeler küçük (128px) ve tembel.
- `dpr` en fazla 2, `frameloop="demand"` (sahne yalnızca hareket varken çizilir → pil ve ısı dostu). Zemin gölgesi model başına bir kez hesaplanır; anahtar ışığın gölge haritası yalnızca model ya da kumaş değişince yeniden çizilir.
- model-viewer ve panel kodu ana pakete girmez (dinamik import).
- Hedef: orta sınıf Android'de 4G hızında ilk görüntü < 3 sn. Playwright'ta yavaş ağ + CPU kısıtı ile ölçülür.

(Ek risk notu: kadife ve şönilin "yöne göre değişen tüy" görünümü gerçek zamanlı web render'ında sınırlı kalacak; `sheen` + `sheenRoughness` + hafif anizotropik normal ile en iyisi yapılır, sınırı `KARARLAR.md`'ye yazılır.)

---

## 7. Tasarım dili (öneri jetonlar)

| Jeton | Renk | Kullanım |
|---|---|---|
| `kirik-beyaz` | `#F5F1EA` | sayfa zemini |
| `kagit` | `#FBF9F5` | panel/kart yüzeyi |
| `antrasit` | `#2A2A28` | metin, ana düğme |
| `antrasit-60` | `#6B6A66` | ikincil metin |
| `cizgi` | `#E3DDD2` | ince çizgiler |
| `ceviz` | `#5C3D2A` | marka vurgusu, başlıklar |
| `altin` | `#B08D57` | seçili durum, küçük vurgular |

- Yazı tipleri (`next/font` ile sitede barındırılır, Türkçe karakter tam): başlık **Fraunces** (karakterli serif), gövde **Inter** (okunaklı). Büyük harf dönüşümü her yerde `toLocaleUpperCase('tr-TR')` ve CSS'te `lang="tr"` ile (`i → İ`).
- Firma sayfalarında `altin` vurgusu yerine firmanın rengi CSS değişkeni olarak atanır; kontrast yetersizse otomatik koyulaştırılır.
- Mor degrade, cam efekti, emoji ikon yok. İkonlar ince çizgili tek set (gerekirse `lucide-react`, gerekçesi yazılır).

---

## 8. Yer tutucu içerik

- **Prosedürel modüler koltuk** (3'lü, yuvarlatılmış kutu geometrileri, ayrı oturma ve sırt minderleri, bombeli kollar, ince ceviz ayaklar) ve **berjer**. Kodla üretilir, UV'ler 1 birim = 1 m.
- **Prosedürel dokular** (script ile üretilip `public/seed/` altına yazılır): bukle, `SIENA` düz dokuma, `PIETRA` nubuk, balıksırtı; her biri 5–6 renk → ~22 kumaş. Hepsi panelde "YER TUTUCU" etiketli. Kompozisyon/Martindale gibi değerler **boş bırakılır**, uydurulmaz.
- **Örnek Mobilya** firması: kodla çizilmiş basit logo, vurgu rengi.
- **3 sahne** (açık modern salon, koyu sıcak salon, nötr stüdyo): ortam ışığı kodla üretilir; dışarıdan doku/model indirilmez. `LISANSLAR.md`'ye yazılır.
- Gerçek GLB desteğini göstermek için: prosedürel koltuğun dışa aktarılmış GLB'si panelden "yüklenip" aynı akışın çalıştığı uçtan uca testte gösterilir.

---

## 9. Dilim sırası (her dilim: çalıştır → ekran görüntüsü → eleştir → düzelt → commit)

1. ✅ **İskelet + dönen koltuk + kumaş değiştirme** (sahte veri, prosedürel koltuk ve dokular, telefon/masaüstü yerleşim). → size ekran görüntüleriyle gösterilecek.
2. ✅ **Oda** hazır sahneler + oda şekli/ölçü (4 Ekim kapsam değişikliği, bkz. KARARLAR.md), ölçü göstergesi, yakından bak, karşılaştır, beğendiklerim, renk doğruluğu testi.
2c. ✅ **2D plan görünümü** (4 Ekim, Fatih Bey'in isteği; strateji: `REKABET-PLANI.md`).
2d. ✅ **Yerleşim:** mobilya ekle, sürükle, döndür, çoğalt, kaldır (4 Ekim, Fatih Bey'in isteği).
3. ✅ **Paylaşım + numune + teklif föyü** (`/p/[id]`, OG görseli, paylaşım görseli, A4 föy, form + KVKK, WhatsApp yönlendirme).
4. ✅ **Panel** (giriş, kumaş tek ekran akışı + türetilmiş haritalar + ölçek kontrol, toplu CSV, GLB model yükleme, talepler). Sapmalar: işleme sunucuda değil tarayıcıda; model ölçüleri elle düzeltilmiyor, birim yanlışsa kayıt engelleniyor (bkz. KARARLAR.md, Dilim 4).
5. **Firma sayfaları + QR** (`/f/...`, firma oluşturma akışı, SVG/PNG/A6 PDF).
6. **AR** (sunucuda GLB derleme, model-viewer, cihaz tespiti, masaüstü QR).
7. **Olay kaydı + rapor**, Faz 3 `reupholster.ts` mock + "yakında" yeri.
8. **Supabase migration'ları, README, rehberler**, uçtan uca testler, son kalite turu.

---

## 10. Şimdiden yaptığım varsayımlar (onaylanırsa `KARARLAR.md`'ye taşınacak)

1. Arayüz yalnızca Türkçe; metinler tek dosyada (`lib/i18n/tr.ts`), ileride başka dil eklenebilir.
2. Paylaşım kimliği tahmin edilemeyen 8 karakterlik kısa kimlik; paylaşımlar süresiz saklanır.
3. Numune talebi formu firmanın sayfasındaysa kayıt firmaya bağlanır ve WhatsApp yönlendirmesi firmaya gider; `/` sayfasında ORMEN'e gider.
4. "Beğendiklerim" sekme kapanınca silinir (`sessionStorage`), istem "oturum boyunca" dediği için.
5. Panelde tüm kullanıcılar şimdilik tam yetkili; `profiles.role` alanı ileride ayrım için hazır.
6. Olaylarda "anonim oturum kimliği" tarayıcı sekmesi başına rastgele üretilir, çerez kullanılmaz (çerez bandı gerektirmez).
7. GLB boyut uyarı eşiği 15 MB; hedef < 5 MB.

---

## 11. Sorularım (5)

1. **Alan adı:** Showroom'lara basılacak QR'lar kalıcı olacağı için adres baştan doğru olmalı. Ne kullanalım? (ör. `atelier.ormentekstil.com`; şimdilik Vercel'in verdiği adresle başlayıp sonra taşımak QR'ları yeniden basmayı gerektirir.)
2. **Supabase:** Mevcut iç yazılımlarınızın Supabase projesini mi kullanalım (tablolar ayrı bir şemada, ör. `atelier`), yoksa ayrı yeni bir proje mi açalım? İleride birleşme açısından ilki kolay, güvenlik açısından ikincisi temiz. Önerim: **ayrı proje**, birleşme gerektiğinde veriyi taşımak kolay.
3. **ORMEN logosu ve iletişim:** Logonun vektör (SVG/PDF) dosyası var mı? Yoksa şimdilik "ORMEN TEKSTİL" yazılı sade bir kelime-logo ile başlarım. Ayrıca numune taleplerinin gideceği ORMEN WhatsApp numarası nedir?
4. **Numune akışı:** Numuneyi son müşteriye kim ulaştırıyor: ORMEN doğrudan mı, yoksa talep mobilyacıya mı gidip numuneyi mobilyacı mı veriyor? Bu, form metnini ve talebin kime bildirileceğini değiştiriyor.
5. **Mevcut kumaş listesi:** Kumaş kodlarınız, serileriniz ve kompozisyonlarınız bir Excel'de ya da iç sisteminizde mi duruyor? Toplu CSV şablonunu ona göre aynı sütun düzeninde hazırlayayım; bir örnek satır ya da sütun başlıkları paylaşabilirseniz yeter.

Bu sorulara cevap beklerken bile dilim 1'e engel yok; onay verirseniz cevapları beklemeden dilim 1'e başlarım.
