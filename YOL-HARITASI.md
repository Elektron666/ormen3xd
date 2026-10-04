# Yol Haritası

ORMEN Atelier'in bugünkü durumu, yayına çıkmadan önce yapılacaklar ve sonraki fazlar. Ayrıntılı gerekçeler `KARARLAR.md`, rekabet stratejisi `REKABET-PLANI.md` dosyasında.

## Faz 1: tamamlandı

| Bölüm | Ne var |
|---|---|
| Konfigüratör | Gerçek ölçekte kumaş, yumuşak geçiş, arama ve süzgeçler, künye, beğendiklerim, karşılaştırma, yakından bakma, ölçüler |
| Oda | Hazır odalar, oda şekli (dikdörtgen, L, köşe) ve ölçüsü, duvar rengi, zemin |
| Plan | Tepeden 2D plan, ölçüler ve duvara mesafeler |
| Yerleşim | Mobilya ekleme, sürükleme, döndürme, çoğaltma, kaldırma |
| Paylaşım | Kalıcı link, WhatsApp önizlemesi, paylaşım görseli, A4 teklif föyü |
| Numune | Ad + telefon + KVKK onayı; panele düşer, WhatsApp'a da iletilebilir |
| AR | "Odamda gör": telefonda gerçek boyutta; bilgisayarda QR ile telefona geçiş |
| Firma sayfaları | `/f/firma` logolu ve renkli sayfa, firmaya özel modeller, QR (SVG/PNG), A6 tezgâh kartı |
| Panel | Kumaş (fotoğraftan), toplu ekleme (CSV), model (GLB), firma, talepler, rapor |
| Rapor | Ziyaret, kumaş denemesi, AR, paylaşım, numune; en çok denenen kumaşlar; firma bazında |
| Hazırlık | Faz 3 "kendi koltuğunda gör" için arayüz ve "yakında" yeri (gerçek AI çağrısı yok) |

## Yayından önce (ORMEN tarafı)

- [ ] Supabase projesi, tablolar, örnek veri, panel kullanıcısı (README, "Supabase kurulumu").
- [ ] Vercel'de alan adı `atelier.ormentekstil.com.tr` ve `NEXT_PUBLIC_SITE_URL`. **QR'lar bundan sonra basılmalı.**
- [ ] `NEXT_PUBLIC_ORMEN_WHATSAPP` numarası.
- [ ] Gerçek ORMEN logosu (şu an yazıyla yazılmış yer tutucu).
- [ ] **KVKK aydınlatma metni hukukçuya onaylatılmalı** (`/kvkk` taslak).
- [ ] İlk gerçek kumaşların çekimi ve yüklenmesi (`KUMAS-CEKIM-REHBERI.md`), yer tutucu kumaşların gizlenmesi.
- [ ] Gerçek telefonla 5 dakikalık AR denemesi (README, "Telefonda AR denemesi").
- [ ] İlk 3-5 pilot firma.

## Faz 2: önerilen sıra

1. ✅ **Parametrik koltuk ve köşe takımı.** 2'li, 3'lü, 4'lü, köşe, berjer, puf; kol, sırt, ayak tipi ve ölçü seçerek GLB'siz model (panelde "Seçerek oluştur"). Ölçü aralıkları pilot firmalarla düzeltilecek.
2. ✅ **Modüler takımlar:** her uç kol, köşe ya da şezlong; L, U, şezlonglu kanepe, şezlonglu köşe.
3. ✅ **Firma ve model başına kumaş serisi:** firma sayfası ve her model belirli serilerle sınırlanabiliyor.
4. ✅ **Showroom kiosk modu:** `?kiosk`; karşılama ekranı, "Telefona al" QR'ı, dokunulmazsa uyarı ve sıfırlama.
5. **Kısa paylaşım linki** (`shares` tablosu hazır); bugünkü link uzun ama her zaman çalışıyor.
6. **AR için sunucuda GLB:** Gerçek cihaz testinde Samsung Internet gibi WebXR'sız tarayıcılarda sorun çıkarsa.
7. **Rapor için SQL görünümü:** Olay sayısı yüz binleri geçince hesap veritabanına taşınır.
8. Kadife ve şönil için hav yönü görünümü (gerçek çekimlerle ayar).

## Faz 3

- **Kendi koltuğunda gör (AI):** Müşteri evdeki koltuğun fotoğrafını çeker, ORMEN kumaşıyla kaplanmış halini görür. Arayüz (`lib/ai/reupholster.ts`) hazır; servis seçimi, maliyet ve KVKK değerlendirmesi o zaman yapılacak.
- **ORMEN veri paneli:** Hangi kumaş hangi firmada, hangi bölgede deneniyor; stok ve koleksiyon kararlarına girdi.

## Bilerek yapılmayanlar

Üyelik, sepet, ödeme ve fiyat; ORMEN dışı kumaş; serbest duvar çizimi, kapı ve pencere; CAD çıktısı. Gerekçeler `KARARLAR.md` ve `REKABET-PLANI.md`'de.
