# ORMEN Atelier

ORMEN TEKSTİL'in B2B müşterilerine (mobilya firmaları) sunduğu 3B kumaş konfigüratörü. Koltuk ekranda döner, kumaş tek dokunuşla değişir. İçindeki bütün kumaşlar ORMEN kumaşıdır.

> Durum: Faz 1'de konfigüratör, oda, plan, yerleşim, paylaşım, numune talebi, teklif föyü, yönetim paneli (kumaş, model, firma, talepler), firma sayfaları, QR, AR (“Odamda gör”) ve kullanım raporu tamam. Yayın öncesi yapılacaklar ve sonraki fazlar: [`YOL-HARITASI.md`](YOL-HARITASI.md). Kumaş fotoğrafı çekimi: [`KUMAS-CEKIM-REHBERI.md`](KUMAS-CEKIM-REHBERI.md). Plan: [`PLAN.md`](PLAN.md). Kararlar ve sınırlar: [`KARARLAR.md`](KARARLAR.md).

## Kurulum sırası (yaklaşık 30 dakika)

Hepsi tarayıcıdan yapılır, program kurmak gerekmez.

1. **Vercel’e yükleyin** (daha önce yaptıysanız atlayın): [vercel.com](https://vercel.com) → GitHub hesabınızla girin → **Add New → Project** → `ormen3xd` deposunun yanında **Import** → ayarlara dokunmadan **Deploy**. Birkaç dakika sonra `…vercel.app` ile biten bir adres verir. **Settings → Git → Production Branch** kısmında `claude/ecstatic-curie-vymdi7` dalının seçili olduğundan emin olun.
2. **Supabase’i kurun:** aşağıdaki “Supabase kurulumu” 1–7. adımlar. Anahtarları 1. adımdaki Vercel projesine girersiniz.
3. **WhatsApp numarası:** Vercel → **Settings → Environment Variables** → `NEXT_PUBLIC_ORMEN_WHATSAPP` = ORMEN’in numarası (ör. `+90 532 123 45 67`) → **Redeploy**.
4. **Alan adı:** aşağıdaki “Alan adı ve QR kodları”. DNS’in yayılması birkaç saat sürebilir; o sırada diğer adımlara devam edebilirsiniz.
5. **Form koruması (önerilir):** Vercel → proje → **Firewall** → **Add Rule**: yol `/api/samples`, `/api/olay`, `/api/paylas`, `/n/` ya da `/gercek-metre/` ile başlıyorsa **Rate Limit** (ör. IP başına dakikada 30 istek). Vercel bunu IP'yi bizim veritabanımıza yazmadan yapar.
6. **Kontrol:** Panelde **Kurulum** sekmesini açın. Her adım yeşil, sarı ya da kırmızı görünür ve eksik olanın nasıl tamamlanacağı yazar; bir adımı bitirince sayfayı yenileyin.
7. **Deneme:** `/panel`’e girin, bir kumaş fotoğrafı yükleyin, ana sayfada görün; bir numune talebi gönderip “Talepler”de görün; telefonla “Odamda gör”ü deneyin.

## Site ve panel adresleri

| Adres | Ne var |
|---|---|
| `/` | Konfigüratör (herkese açık) |
| `/p/...` | Paylaşılan kombinasyon |
| `/f/firma-adi` | Bir mobilya firmasının kendi logolu sayfası |
| `/f/firma-adi/model` | Firmanın tek bir modeli (showroom QR’ı için) |
| `/panel` | ORMEN yönetim paneli (giriş gerekir) |

## Panel ne işe yarar

- **Kumaşlar:** Fotoğraf yükleyin, cetvelle ölçtüğünüz alanın enini yazın, kodu ve rengi girin. Sistem dokuyu dikişsiz mi diye kontrol eder, kabartı ve parlaklık haritalarını kendisi üretir, sağda koltuğun üstünde canlı gösterir. “Ölçek kontrol” kutusu koltuğa 10 cm’lik kareler çizer; ilmekler gerçek boyutunda mı diye bakarsınız.
- **Toplu ekleme:** Şablonu indirin, Excel’de doldurun, fotoğraflarla birlikte yükleyin. Fotoğraf adları tablodaki adla eşleşir.
- **Modeller, seçerek:** 3D modeli olmayan atölyeler için. Kanepe (ikili, üçlü, dörtlü), köşe / modüler takım (L, U, şezlonglu), berjer ya da puf seçin; kol, sırt (ayrı minderli, sabit ya da kapitone), kol tipi (Chester için kıvrık kol dahil), berjerde kulak, oturum (ayrı ya da tek parça minder), ayak ve ölçüleri girin. Yüksekliği firmanın verdiği santimle yazın. Model bir dakikada hazır, kumaş üstünde gerçek ölçüsünde. Firmanın koltuk fotoğrafını "Firmanın fotoğrafını koy" ile önizlemenin yanına ya da üstüne koyun (fotoğraf hiçbir yere yüklenmez), en yakın hazır stille başlayıp seçimleri düzeltin; birebir kopya değil, kumaşı doğru ölçüde gösteren bir benzeridir.
- **Modeller, dosyadan:** Mobilya modelini `.glb` dosyası olarak yükleyin, kumaş alacak parçaları işaretleyin, istediğiniz ORMEN kumaşıyla önizleyin. Deneme için kendi ürettiğimiz örnek bir puf var: `tests/fixtures/ornek-puf.glb`.
- **Firmalar:** Firma adını, logosunu (PNG), rengini ve WhatsApp numarasını girin; sayfada hangi modellerin ve hangi ORMEN serilerinin görüneceğini seçin ya da firmaya özel model yükleyin. Bir modeli de belirli serilerle sınırlayabilirsiniz (model ayarlarında). Kaydedince bağlantı, QR kodu (SVG ve PNG) ve tezgâh üstü A6 kart hazır olur.
- **Rapor:** Kaç ziyaret, hangi kumaşlar en çok deneniyor, hangi firma sayfası ne kadar kullanılıyor. Kişisel veri tutulmaz.
- **Talepler:** Numune talepleri (hangi firmanın sayfasından geldiğiyle birlikte), telefon ve WhatsApp bağlantısıyla listelenir; Excel’e indirilebilir.

Kumaş ya da model silinmez, **gizlenir** (listedeki anahtar). Gizlenen konfigüratörden kalkar; anahtarı tekrar açınca bilgileriyle geri gelir.

## Hazır sahneler

Firma sayfası açılınca kumaş panelinin başında en fazla 6 hazır sahne kartı çıkar. Satış elemanı tek dokunuşla iyi görünen bir sahneyle başlar. Sahne eklemek için:
1. Sahneyi firma sayfasında kurun: mobilyalar, kumaşlar, oda.
2. **Paylaş**'tan bağlantıyı kopyalayın.
3. Panel → Firmalar → firma → **Hazır sahneler** → **+ Sahne ekle** deyip bir ad verin ve bağlantıyı yapıştırın.
4. Kaydedin.

Kısa (`/s/…`) ve uzun (`/p/…`) bağlantıların ikisi de olur.

## Firmaya aylık özet

Panel → Firmalar → firma → **Aylık özet** sayfası tek sayfalık bir A4 verir. Raporda firmanın adının yanındaki “aylık özet” bağlantısı da aynı sayfayı açar. Sayfada şunlar var:
- o ayki ziyaret, kumaş denemesi, AR, numune talebi ve siparişe dönen numune sayıları,
- en çok denenen kumaşlar,
- ziyaretlerin nereden geldiği.

Varsayılan ay geçen aydır. Satış temsilcisi ay başındaki ziyarette bu sayfayı basıp elden verir. 30 ziyaretin altındaki aylarda sıralama gösterilmez, çünkü az veriyle yanıltıcı olur. Sayfada kişisel veri yoktur.

## Kartela askısı etiketleri

Panel → Firmalar → firma → **Askı etiketleri (A4)**. Firmanın sunduğu her kumaşa küçük bir etiket basılır: kod, renk ve QR. Kâğıt A4'tür, sayfada 3 × 8 etiket vardır (L7159 tipi yapışkan etiket kâğıdı).

Etiket showroomdaki kartela askısına yapıştırılır. Müşteri QR'ı okutunca firmanın sayfası o kumaş koltuğa giydirilmiş olarak açılır. Bu ziyaretler raporda “QR” kaynağında ve “aski” etiketiyle sayılır. Etiket kutusuna şube adı yazıldıysa o ad kullanılır.

## Ziyaretler nereden geliyor (kaynak ve etiket)

Raporun “Nereden geldiler” bölümü ziyaretleri ve numune taleplerini geldikleri yere göre ayırır:
- showroom ekranı,
- basılı QR,
- paylaşılan kombinasyon,
- başka bir site,
- doğrudan bağlantı.

Panelde basılan QR'lar ve A6 kartı bunu kendiliğinden işaretler (adresin sonundaki `?q`).

Şubeye ya da kampanyaya göre ayırmak için Panel → Firmalar → firma → bağlantı bölümünde **“Şube / kampanya etiketi”** yazın (ör. “Ankara şube”, “Fuar 2027”). Bağlantı, QR, kiosk adresi ve A6 kart o etiketle çıkar. **QR bastırmadan önce etiketi yazın**; basılmış koda sonradan etiket eklenemez. Etikete kişi adı yazmayın. Kişisel veri tutulmaz: yalnızca bu sabit değerler ve rastgele bir ziyaret numarası saklanır.

## Numune talepleri: adımlar ve etiket

Numuneyi ORMEN keser ve **firmanın mağazasına** gönderir; müşteriye doğrudan gönderilmez, müşterinin adresi alınmaz.

1. Panel → Talepler. Her talebin bir numune kodu vardır (ör. `N-HQTY86`).
2. Kesime başlayınca **Adım**'ı “Hazırlanıyor” yapın. Topun parti numarası (**Lot**) biliniyorsa yazıp kaydedin.
3. **Numune etiketi** düğmesine basın. Etiket 100 × 70 mm boyutunda, siyah beyaz ve kumaş başına birer tane basılır.
   - Lot girilmediyse etikette lotun elle yazılacağı bir kutu çıkar.
   - Etikette müşterinin adı ve telefonu yoktur.
4. Numune mağazaya gidince Adım'ı “Mağazaya gönderildi” yapın.
Firma sayfasından gelen talepte, firmanın WhatsApp numarası girilmişse, **Mağazaya ilet (WhatsApp)** düğmesi talebi (ad, telefon, kumaş, numune kodu) firmaya iletir. Numune mağazaya ulaşınca müşteriyi mağaza arar.

5. Sipariş kesinleşince mağaza etiketteki QR'ı okutur ve “Bu numuneyle sipariş verildi”ye basar. Talep kendiliğinden “Siparişe döndü” olur.
   - Açılan sayfada müşteri bilgisi yoktur.
   - Mağaza aynı sayfadan ORMEN'e metraj ve lot için WhatsApp yazabilir.
   - Yanlışlıkla basılırsa adımı panelden geri alın.

### Talepleri silme

- **Bir kişi verisinin silinmesini isterse:** Panel → Talepler → o talep → **Sil** → **Evet, sil**. Talep adı ve telefonuyla birlikte kalıcı olarak silinir.
- **Saklama süresi:** Avukatla belirlendikten sonra Vercel → Settings → Environment Variables bölümüne `SAMPLE_RETENTION_DAYS` = gün sayısını girin (ör. 730) ve yeniden yayınlayın. O süreden eski talepler kendiliğinden silinir.
  - Aynı süreyi /kvkk metnindeki “[Avukat onayıyla belirlenecek süre]” yerine yazın.
  - Ayar girilmezse talepler elle silinene kadar saklanır; /panel/durum bunu hatırlatır.

## Usta föyü ve metraj

"Föyü yazdır" iki sayfa çıkarır. Birinci sayfa müşteri içindir. İkinci sayfa **usta föyü**dür ve atölyeye gider. Siyah beyazdır; renk kâğıttan değil, zımbalanan numuneden onaylanır.

- **Metraj:** Panel → Modeller → model → "Metraj" bölümüne firmanın ustasının o model için kullandığı metrajı ve hangi kumaş eni için geçerli olduğunu yazın.
  - Föy bu sayıyı yalnızca aynı enli, **düz** ve **çift yönlü** ORMEN kumaşında tekrarlar.
  - Diğer kumaşlarda sayı yerine nedeni yazar ("usta hesaplar").
  - Bunun için kumaşın eni, desen bilgisi ve kesim yönü kumaş sayfasında girilmiş olmalı.
  - **Bölge başına metraj** (isteğe bağlı): aynı bölümde Kasa, Kollar, Oturak ve Sırt için ayrı metre. Müşteri bölgelere farklı kumaş seçtiğinde föy her kumaş için bu sayıları toplar. Modelde olmayan bölgeyi boş bırakın; biyeyi usta hesaplar.
- **Her kumaş için:**
  - numunenin zımbalanacağı kutu,
  - müşterinin "bu rengi onaylıyorum" imzası,
  - elle yazılacak lot,
  - "kesilen gerçek metre" satırı.
- **Föydeki QR:** Usta kesimden sonra QR'ı okutup gerçekte kaç metre gittiğini yazar. Ad ya da telefon istenmez.
  - Panel → Rapor → "Kesim geri bildirimi" bölümü föydeki sayıyla gerçeğini yan yana gösterir.
  - Hesaplamaya geçip geçmeyeceğimize bu kayıtlara bakarak karar vereceğiz.

## Showroom ekranı (kiosk)

Mağazadaki dokunmatik ekran ya da tablet için firma bağlantısının sonuna `?kiosk` ekleyin (panelde firma sayfasında hazır yazıyor), ör. `https://atelier.ormentekstil.com.tr/f/firma-adi?kiosk`. Ekran bir karşılama sayfasıyla açılır; 90 saniye dokunulmazsa bir sonraki müşteri için baştan başlar ve önceki kişinin seçimleri silinir. Ziyaretçi “Telefona al” ile seçtiği kombinasyonu QR'la telefonuna alır.

Kumaş panelinin en üstünde **“Elinizdeki kartelanın kodu”** kutusu var. Satış elemanı askıdaki kartelanın kodunu yazar (ör. “siena 04”; büyük-küçük harf, boşluk ve tire fark etmez) ve kumaş hemen koltuğa giyer. Kodun bir kısmı yazıldığında uyan kumaşlar büyük düğmeler olarak çıkar. Kiosk ekranında yazılar ve düğmeler ayakta, bir kol mesafesinden okunacak büyüklüktedir.

Cihazda: tarayıcıyı tam ekran açın (Chrome'da F11 ya da cihazın “kiosk/ekran sabitleme” ayarı) ve ekranın kendiliğinden kararmasını kapatın.

## Bölgeye göre kumaş

Konfigüratörde kumaş panelinin başındaki "Kumaşın gideceği yer" ile gövde, kollar, minderler ve biye ayrı kumaş alabilir. Seçim paylaşım bağlantısına, numune talebine, kesim föyüne ve "Odamda gör"e geçer. Bölgelere bölünmüş parçada metrajı, firma bölge başına metraj girdiyse föy toplar; girmediyse usta hesaplar.

## Gerçek cihaz testi

Pilottan önce site 3 gerçek cihazda denenir. Adresin sonuna `?olcum` yazılınca sayfanın altında bir ölçüm kutusu çıkar; kutu kare hızını, ilk kumaşın kaç saniyede geldiğini ve AR'ın açılıp açılmadığını gösterir. Adımlar ve geçme ölçütleri `CIHAZ-TESTI.md` dosyasında.

## Telefonda AR denemesi (5 dakika)

Bu denemeler gerçek telefon gerektirdiği için geliştirme ortamında yapılamadı. Kurulumdan sonra bir iPhone ve bir Android telefonla:

1. Bilgisayarda siteyi açın, bir kanepe ve kumaş seçin → **Odamda gör** → çıkan QR’ı telefonla okutun.
2. Açılan sayfada koltuğun seçtiğiniz kumaşla göründüğünü kontrol edin → **Odamda gör**.
3. Telefonu yere tutun: koltuk zemine oturmalı ve **gerçek boyutunda** olmalı (bir metreyle kabaca ölçün; kanepe 238 cm).
4. Kumaş deseninin büyüklüğü masaüstündekiyle aynı mı (bukle ilmekleri iri değil, küçük değil)?
5. Telefonda doğrudan siteyi açıp aynı düğmeyle deneyin.

Gördüğünüz sorunu telefon modeli ve tarayıcısıyla birlikte not edin (ör. “Samsung A54, Samsung Internet, AR açılmadı”).

## Alan adı ve QR kodları

QR kodları sitenin adresini içerir. **Gerçek alan adı bağlanmadan QR bastırmayın**, yoksa geçici Vercel adresine gider.

1. Vercel’de proje → **Settings → Domains** → `atelier.ormentekstil.com.tr` ekleyin. Vercel’in gösterdiği DNS kaydını (genellikle bir `CNAME`) alan adınızı yönettiğiniz yerde (ör. hosting firmanızın paneli) ekleyin.
2. **Settings → Environment Variables** → `NEXT_PUBLIC_SITE_URL` = `https://atelier.ormentekstil.com.tr` → yeniden yayınlayın (**Redeploy**).
3. Paneldeki sarı “geçici adres” uyarısı kalkınca QR’ları indirin.

## Supabase kurulumu (bir kerelik, yaklaşık 15 dakika)

Panelde eklediğiniz kumaşların ve gelen taleplerin kalıcı olması için Supabase gerekir. Supabase olmadan site örnek veriyle çalışır ama panelde eklenenler sunucu yeniden başlayınca kaybolur.

1. **Proje açın.** [supabase.com](https://supabase.com) → hesabınızla girin → **New project**. Ad: `ormen-atelier`. Bölge: **Central EU (Frankfurt)** (Türkiye’ye en yakın). Veritabanı şifresini güvenli bir yere not edin. Proje birkaç dakikada hazır olur.
2. **Tabloları kurun.** Soldaki menüden **SQL Editor** → **New query**. Bu depodaki `supabase/migrations/` klasöründeki dosyaları **ad sırasıyla, tek tek** yapıştırıp **Run**’a basın: önce `20261004000000_init.sql`, sonra `20261005000000_parametric_models.sql`, sonra `20261006000000_fabric_series_limits.sql`, `20261007000000_report_function.sql`, `20261008000000_storage_limits.sql`, `20261009000000_visit_sources.sql`, `20261010000000_cutting_table.sql`, en son `20261011000000_zone_meterage.sql`. Her birinde “Success” görmelisiniz. Bu adım tabloları, güvenlik kurallarını ve dosya klasörünü (`atelier`) oluşturur.
3. **Örnek kataloğu yükleyin.** Yine **SQL Editor** → **New query** → `supabase/seed.sql` dosyasının tamamını yapıştırın → **Run**. 23 yer tutucu kumaş, 3 örnek model (kanepe, berjer, köşe takımı) ve bir örnek firma (`/f/ornek-mobilya`) gelir. Gerçek kumaşlarınızı ekledikçe bunları panelden gizleyebilirsiniz.
4. **Anahtarları alın.** **Project Settings** → **API** (yeni arayüzde **API Keys**) sayfasından üç değeri kopyalayın:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / `publishable` anahtarı → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` / `secret` anahtarı → `SUPABASE_SERVICE_ROLE_KEY` (**gizlidir**: yalnızca Vercel’e yazın, e-postayla ya da WhatsApp’tan göndermeyin)
5. **Vercel’e girin.** Vercel’de proje → **Settings** → **Environment Variables** → yukarıdaki üç değeri aynı adlarla ekleyin → **Deployments** sekmesinde son yayının yanındaki üç nokta → **Redeploy**.
6. **Panel kullanıcısı açın.** Supabase’de **Authentication** → **Users** → **Add user** → **Create new user**. E-posta ve şifrenizi yazın, **Auto Confirm User** kutusunu işaretleyin. Sonra **SQL Editor**’de şu satırı kendi e-postanızla çalıştırın:

   ```sql
   insert into public.profiles (id) select id from auth.users where email = 'sizin@ormentekstil.com.tr' on conflict (id) do nothing;
   ```

   Bu satır, o kullanıcıya panel yetkisi verir. Profil satırı olmayan biri şifresi doğru olsa bile panele giremez.
7. **Kayıt olmayı kapatın.** **Authentication** → **Sign In / Providers** (ya da **Providers → Email**) → **Allow new users to sign up** kapalı olsun. Kullanıcıları yalnızca siz eklersiniz.
8. **Deneyin.** `https://alanadınız/panel` → giriş yapın → üstteki sarı “Örnek veri modu” uyarısı **görünmüyorsa** Supabase bağlı demektir.

Ekipten birine panel erişimi vermek için 6. adımı onun e-postasıyla tekrarlayın.

## Yerelde çalıştırma (geliştirici)

Gerekenler: Node.js 22 veya üstü.

```bash
npm install
npm run dev        # http://localhost:3000
```

Supabase anahtarı gerekmez. Anahtarlar yokken uygulama `lib/seed/` içindeki örnek veriyle çalışır; panele `demo@ormen.local` / `ormen-demo` ile girilir (yalnızca geliştirme ortamında).

İsteğe bağlı ayarlar `.env.example` dosyasında. Örneğin numune talebinden sonra çıkan WhatsApp düğmesi için `NEXT_PUBLIC_ORMEN_WHATSAPP`. Bu dosyayı `.env.local` adıyla kopyalayıp doldurun; Vercel'de aynı adlarla **Settings → Environment Variables** bölümüne girin.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` ve `npm start` | Üretim derlemesi ve sunucusu |
| `npm run typecheck` | TypeScript denetimi |
| `npm run lint` | Kod denetimi |
| `npm test` | Birim testleri (Vitest; veritabanı şeması PGlite ile denenir) |
| `npm run test:e2e` | Uçtan uca testler (Playwright; derleyip 3100 portunda çalıştırır) |
| `npm run textures -- --force` | Örnek kumaş dokularını yeniden üretir |
| `npm run seed:sql` | `supabase/seed.sql` dosyasını örnek veriden yeniden yazar |

Önceden kurulu bir Chromium kullanmak için: `PW_CHROMIUM_PATH=/yol/chromium npm run test:e2e`.
