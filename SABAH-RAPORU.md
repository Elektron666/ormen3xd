# Sabah raporu (12 Ekim 2026)

Gece toplantısında (`TOPLANTI-2026-10-12-gece.md`) seçilen 10 işin 10'u da bitti ve gönderildi. Her biri testle ya da ölçümle kanıtlandı. Veritabanına dokunulmadı.

## Kısaca ne değişti

| # | İş | Sonuç |
|---|---|---|
| 1 | Erişilebilirlik | WCAG 2.1 AA denetimi yeni ekranlara ve telefona genişledi. Bulunan 2 sorun düzeltildi: altın vurgunun üstündeki yazı okunaklı (3,1:1 → 4,6:1), kiosk düğmesi solmadan nefes alıyor |
| 2 | 3B sahne çökerse | Telefon arka plana atılıp dönünce ya da ekran kartı sıfırlanınca sahne kendiliğinden geri kuruluyor; arada "3B görüntü yeniden hazırlanıyor…" |
| 3 | Föyde gerçek boyut | Müşteri föyünde kumaşın 5 × 5 cm gerçek boyut karesi ve 5 cm kontrol çizgisi. Föy hâlâ tek sayfa |
| 4 | Hız | Telefonda sayfa açılırken inen JavaScript **303 kB → 179 kB** (%41 az). Diyaloglar kullanılınca yükleniyor |
| 5 | Güvenlik başlıkları | İçerik güvenlik politikası: dışarıdan betik çalışmaz, veri yalnızca site ve Supabase'e gider. Her testte ihlal denetleniyor; ihlal yok |
| 6 | Pilot günü iki adımlı doğrulama | Vercel'de `PANEL_2FA_ZORUNLU=1` girilince doğrulaması olmayan yalnızca Güvenlik sayfasına girer |
| 7 | Bulanık fotoğraf uyarısı | Panelde belirgin bulanık fotoğrafa uyarı. 30 katalog görselinde yanlış uyarı yok; hafif bulanıklığı yakalamaz (dürüst sınır `ARGE.md`'de) |
| 8 | Kart bulunamazsa nedeni | "Dört işaretten yalnızca 2'si görüldü: kartın dört köşesi de kadrajda olsun" gibi somut öneri |
| 9 | Tarayıcı hataları | Ziyaretçinin telefonunda sayfa hata verirse Vercel kayıtlarına düşer. E-posta ve telefon benzeri bilgiler silinir. KVKK metnine bir cümle eklendi |
| 10 | Bu rapor | |

## Gece bulunan ve düzeltilen
- **Kiosk ekranı:** Başlama düğmesinin yazısı hem renk hem yanıp sönme yüzünden zor okunuyordu.
- **Paylaş penceresi:** Hazır olmayan "Görseli indir" bağlantısı ekran okuyucuya pasif bildirilmiyordu.
- **Sayfa açılışı:** three.js (3B kütüphanesi), iki küçük yardımcı yüzünden açılışta iniyordu. Artık sahneyle geliyor.

## Senden beklenenler
- **Pilot günü:** Vercel → Settings → Environment Variables → `PANEL_2FA_ZORUNLU` = `1` → Redeploy. Önce kendi hesabında iki adımlı doğrulamayı aç; yoksa sen de yalnızca Güvenlik sayfasını görürsün.
- **Telefonda bir bakış** (5 dakika):
  - Bir kumaşta "Gerçek boyutta gör"e bas, ekranı bir kez banka kartıyla ayarla.
  - "Paylaş → Föyü yazdır" ile föyü %100 ölçekte bas. Kontrol çizgisi cetvelle 5 cm çıkmalı.
- **Önceden bekleyenler:**
  - Geçici şifreyi değiştir.
  - WhatsApp numarasını Vercel'e gir.
  - Kartla milimetrik kâğıt denemesi (Panel → Kart denemesi).
  - Telefonda biyeye bak.

## Ölçümler ve araçlar
- **Birim testleri:** 283, hepsi geçiyor (geceden önce 272).
- **Uçtan uca testler:** 80 (geceden önce 69). Son tam turda 79'u geçti.
  - Kalan 1 testin kendisi hatalıydı: diyaloglar artık ilk açılışta yüklendiği için açılmasını beklemiyordu.
  - Düzeltildi; düzeltilmiş test soğuk sunucuda da geçiyor.
- Her uçtan uca test artık içerik güvenlik politikası ihlalini de denetliyor.
- **JavaScript ölçümü:** `scripts/olc-js.ts`.
- **Keskinlik kalibrasyonu:** `scripts/olc-keskinlik.ts`.
- Sonuçlar `KARARLAR.md` ve `ARGE.md`'de.

## Yapılmayanlar ve neden
- **"Sahne açılamadı" olayının raporda görünmesi:** Veritabanında olay türü değişmeli; bu oturumda Supabase bağlantısı yoktu. Şimdilik aynı bilgi sunucu kaydında.
- **Çevrimdışı kiosk:** Büyük iş, gece yarım kalırsa risk; sıraya alındı.
