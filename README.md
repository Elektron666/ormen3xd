# ORMEN Atelier

ORMEN TEKSTİL'in B2B müşterilerine (mobilya firmaları) sunduğu 3B kumaş konfigüratörü. Koltuk ekranda döner, kumaş tek dokunuşla değişir. İçindeki bütün kumaşlar ORMEN kumaşıdır.

> Durum: Faz 1'de konfigüratör, oda, plan, yerleşim, paylaşım, numune talebi ve teklif föyü tamam. Sırada panel, firma sayfaları, AR ve raporlar var. Plan: [`PLAN.md`](PLAN.md). Kararlar ve sınırlar: [`KARARLAR.md`](KARARLAR.md).

Bu dosya, kurulum, ortam değişkenleri, Supabase ve Vercel adımlarıyla birlikte, yazılımcı olmayan birinin izleyebileceği biçimde son dilimde tamamlanacak.

## Yerelde çalıştırma (geliştirici)

Gerekenler: Node.js 22 veya üstü.

```bash
npm install
npm run dev        # http://localhost:3000
```

Supabase anahtarı gerekmez. Anahtarlar yokken uygulama `lib/seed/` içindeki örnek veriyle çalışır.

İsteğe bağlı ayarlar `.env.example` dosyasında. Örneğin numune talebinden sonra çıkan WhatsApp düğmesi için `NEXT_PUBLIC_ORMEN_WHATSAPP`. Bu dosyayı `.env.local` adıyla kopyalayıp doldurun; Vercel'de aynı adlarla **Settings → Environment Variables** bölümüne girin.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` ve `npm start` | Üretim derlemesi ve sunucusu |
| `npm run typecheck` | TypeScript denetimi |
| `npm run lint` | Kod denetimi |
| `npm test` | Birim testleri (Vitest) |
| `npm run test:e2e` | Uçtan uca testler (Playwright; derleyip 3100 portunda çalıştırır) |
| `npm run textures -- --force` | Örnek kumaş dokularını yeniden üretir |

Önceden kurulu bir Chromium kullanmak için: `PW_CHROMIUM_PATH=/yol/chromium npm run test:e2e`.
