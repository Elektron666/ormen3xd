# ORMEN Atelier

ORMEN TEKSTİL'in B2B müşterilerine (mobilya firmaları) sunduğu 3B kumaş konfigüratörü. Koltuk ekranda döner, kumaş tek dokunuşla değişir. İçindeki bütün kumaşlar ORMEN kumaşıdır.

> Durum: Faz 1'de konfigüratör, oda, plan, yerleşim, paylaşım, numune talebi, teklif föyü, yönetim paneli (kumaş, model, firma, talepler), firma sayfaları ve QR tamam. Sırada AR ve raporlar var. Plan: [`PLAN.md`](PLAN.md). Kararlar ve sınırlar: [`KARARLAR.md`](KARARLAR.md).

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
- **Modeller:** Mobilya modelini `.glb` dosyası olarak yükleyin, kumaş alacak parçaları işaretleyin, istediğiniz ORMEN kumaşıyla önizleyin. Deneme için kendi ürettiğimiz örnek bir puf var: `tests/fixtures/ornek-puf.glb`.
- **Firmalar:** Firma adını, logosunu (PNG), rengini ve WhatsApp numarasını girin; sayfada hangi modellerin görüneceğini seçin ya da firmaya özel model yükleyin. Kaydedince bağlantı, QR kodu (SVG ve PNG) ve tezgâh üstü A6 kart hazır olur.
- **Talepler:** Numune talepleri (hangi firmanın sayfasından geldiğiyle birlikte), telefon ve WhatsApp bağlantısıyla listelenir; Excel’e indirilebilir.

Kumaş ya da model silinmez, **gizlenir** (listedeki anahtar). Gizlenen konfigüratörden kalkar; anahtarı tekrar açınca bilgileriyle geri gelir.

## Alan adı ve QR kodları

QR kodları sitenin adresini içerir. **Gerçek alan adı bağlanmadan QR bastırmayın**, yoksa geçici Vercel adresine gider.

1. Vercel’de proje → **Settings → Domains** → `atelier.ormentekstil.com.tr` ekleyin. Vercel’in gösterdiği DNS kaydını (genellikle bir `CNAME`) alan adınızı yönettiğiniz yerde (ör. hosting firmanızın paneli) ekleyin.
2. **Settings → Environment Variables** → `NEXT_PUBLIC_SITE_URL` = `https://atelier.ormentekstil.com.tr` → yeniden yayınlayın (**Redeploy**).
3. Paneldeki sarı “geçici adres” uyarısı kalkınca QR’ları indirin.

## Supabase kurulumu (bir kerelik, yaklaşık 15 dakika)

Panelde eklediğiniz kumaşların ve gelen taleplerin kalıcı olması için Supabase gerekir. Supabase olmadan site örnek veriyle çalışır ama panelde eklenenler sunucu yeniden başlayınca kaybolur.

1. **Proje açın.** [supabase.com](https://supabase.com) → hesabınızla girin → **New project**. Ad: `ormen-atelier`. Bölge: **Central EU (Frankfurt)** (Türkiye’ye en yakın). Veritabanı şifresini güvenli bir yere not edin. Proje birkaç dakikada hazır olur.
2. **Tabloları kurun.** Soldaki menüden **SQL Editor** → **New query**. Bu depodaki `supabase/migrations/20261004000000_init.sql` dosyasının tamamını kopyalayıp yapıştırın → **Run**. “Success” görmelisiniz. Bu adım tabloları, güvenlik kurallarını ve dosya klasörünü (`atelier`) oluşturur.
3. **Örnek kataloğu yükleyin.** Yine **SQL Editor** → **New query** → `supabase/seed.sql` dosyasının tamamını yapıştırın → **Run**. 23 yer tutucu kumaş, 2 örnek model ve bir örnek firma (`/f/ornek-mobilya`) gelir. Gerçek kumaşlarınızı ekledikçe bunları panelden gizleyebilirsiniz.
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
