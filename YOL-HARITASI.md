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
| Numune | Ad + telefon + KVKK onayı ve üç seçmeli soru (serbest metin yok); panele düşer, WhatsApp'a da iletilebilir |
| AR | "Odamda gör": telefonda gerçek boyutta; bilgisayarda QR ile telefona geçiş |
| Firma sayfaları | `/f/firma` logolu ve renkli sayfa, firmaya özel modeller, QR (SVG/PNG), A6 tezgâh kartı |
| Panel | Kumaş (fotoğraftan), toplu ekleme (CSV), model (GLB), firma, talepler, rapor |
| Rapor | Ziyaret, kumaş denemesi, AR, paylaşım, numune; en çok denenen kumaşlar; firma bazında |
| Hazırlık | Faz 3 "kendi koltuğunda gör" için kod arayüzü (ekranda gösterilmiyor; gerçek AI çağrısı yok) |

## Yayından önce (ORMEN tarafı)

- [ ] Supabase projesi, tablolar, örnek veri, panel kullanıcısı (README, "Supabase kurulumu").
- [ ] Vercel'de alan adı `atelier.ormentekstil.com.tr` ve `NEXT_PUBLIC_SITE_URL`. **QR'lar bundan sonra basılmalı.**
- [ ] `NEXT_PUBLIC_ORMEN_WHATSAPP` numarası.
- [ ] Gerçek ORMEN logosu (şu an yazıyla yazılmış yer tutucu).
- [ ] **KVKK aydınlatma metni hukukçuya onaylatılmalı** (`/kvkk` taslak).
- [ ] İlk gerçek kumaşların çekimi ve yüklenmesi (`KUMAS-CEKIM-REHBERI.md`), yer tutucu kumaşların gizlenmesi.
- [ ] Gerçek telefonla 5 dakikalık AR denemesi (README, "Telefonda AR denemesi").
- [ ] İlk 3-5 pilot firma.
- [ ] Kararlar (`TOPLANTI-2026-10-05.md`): numune formundaki "Not" alanı, numuneyi kim gönderir, satış kodu kişi mi şube mi, avukat paketi (yurt dışı aktarım ve firma protokolü dahil).
- [ ] Her pilot firmanın araçtan önceki 4 haftalık numune/sipariş sayısı (karşılaştırma için).

## Faz 2: önerilen sıra

1. ✅ **Parametrik koltuk ve köşe takımı.** 2'li, 3'lü, 4'lü, köşe, berjer, puf; kol, sırt, ayak tipi ve ölçü seçerek GLB'siz model (panelde "Seçerek oluştur"). Ölçü aralıkları pilot firmalarla düzeltilecek.
2. ✅ **Modüler takımlar:** her uç kol, köşe ya da şezlong; L, U, şezlonglu kanepe, şezlonglu köşe.
3. ✅ **Firma ve model başına kumaş serisi:** firma sayfası ve her model belirli serilerle sınırlanabiliyor.
4. ✅ **Showroom kiosk modu:** `?kiosk`; karşılama ekranı, "Telefona al" QR'ı, dokunulmazsa uyarı ve sıfırlama.
5. ✅ **Kısa paylaşım linki:** `/s/8karakter`; gelmezse uzun link geçerli kalıyor.
6. **AR için sunucuda GLB:** Rafa kalktı (2. toplantı). "AR açılamadı" sayacı yüksek çıkarsa yeniden açılır.
7. ✅ **Rapor veritabanında:** `atelier_report` fonksiyonu; olay sınırı yok.
8. Kadife ve şönil için hav yönü görünümü: rafa kalktı (2. toplantı); ölçü doğruluğu görüntüden önce geliyor.

## Pilot öncesi (6 Ekim acil toplantısı, `TOPLANTI-2026-10-06-acil.md`)

Yeni özellik yok; pilota kadar içerik, altyapı ve hukuk. Hedef: en erken 20 Ekim, şartlar tamamlanınca.

- [ ] Pilot firmanın 6–8 kumaşı gerçek fotoğraf, kod, en, desen ve yönle; gerçek ORMEN logosu; yer tutucular gizli.
- [ ] Vercel Pro, alan adı (CNAME), Supabase yedeği ve "uyumama". Alan adından önce hiçbir QR basılmaz.
- [ ] Avukat: saklama süresi, yurt dışı aktarım (Frankfurt), firma protokolü (müşteri telefonu sözü dahil).
- [ ] Pilot firmanın 2 modeli parametrik olarak, metrajıyla.
- [ ] 3 gerçek cihazda test (Samsung, iPhone, kiosk tableti).
- [ ] Talep sahibi (Selin), firmayla 30 dakikalık kurulum, panelde test kayıtlarının temizliği, ölçüm tablosu.
- [x] Müşteri telefonu: ORMEN'de kalıyor (Fatih Bey'in kararı). Protokol sözü ve onay cümlesi avukatta.
- [x] Kiosk sadeleştirildi (yalnızca kumaş denenir); ana sayfanın altına küçük "Yönetim" bağlantısı.

## Yön değişikliği: Kesim masası (5 Ekim, 2. toplantı)

Ayrıntı: `TOPLANTI-2026-10-05-2.md`. Araç showroomdaki deneme ekranından, **siparişin ORMEN koduyla, doğru metreyle ve doğru partiden verildiği yere** dönüşüyor. Fiyat, sepet ve üyelik yine yok; metrajı biz uydurmuyoruz.

1. ✅ Numune formunda "Not" alanı yerine seçmeli düğmeler (ne için, kaç parça, ne zaman).
2. ✅ "Yakında: kendi koltuğunda gör" vitrininin kaldırılması.
3. ✅ Talep adımları ve panelden basılan numune etiketi (kumaş kodu, numune kodu, lot ya da lot kutusu, QR). QR'ı okutan mağaza "siparişe döndü" diyebiliyor ve ORMEN'e WhatsApp'tan ön bildirim gönderebiliyor (8. maddenin ilk hâli).
4. ✅ Kumaşa desen (düz / desenli ve rapor ölçüsü) ve kesim yönü (tek / çift) alanları; panelde, toplu aktarımda ve künyede.
5. ✅ Model başına firmanın kendi metrajı (hangi kumaş eni için olduğuyla); panelde model ekranında. Sayı yalnızca aynı enli, düz ve çift yönlü kumaşta tekrarlanır.
6. ✅ Usta föyü (föyün ikinci sayfası): firmanın metrajı ya da "usta hesaplar" ve nedeni, lot, numune zımba kutusu ve imza, gerçek metre satırı.
7. ✅ "Gerçek metre" geri bildirimi: föydeki QR → `/gercek-metre/…`; panel raporunda föydeki sayıyla yan yana.
8. ✅ (ilk hâli) "ORMEN'e metraj ve lot için yaz": numune sayfasında (`/n/<kod>`), siparişe dönüşle birlikte.

**Kararlar:**
- Numuneyi ORMEN gönderir, firmanın mağazasına; son müşterinin adresi alınmaz.
- Oda kurucu donduruldu.
- Faz 2'nin 6. ve 8. maddeleri rafa kalktı.

**Fatih Bey'e sorular:**
- Yeniden döşeme / döşemeci kanalı açılsın mı?
- ~~Son müşterinin telefonu ORMEN'e hiç gelmesin mi?~~ **Karar (6 Ekim, Fatih Bey): gelsin.** Talepler ORMEN'in kendi veritabanında tutulur.

## Pilot hazırlığı (5 Ekim toplantısı)

Ayrıntı ve gerekçeler `TOPLANTI-2026-10-05.md` dosyasında. Fotoğraf ve avukat beklemeden yapılacak sıra:

1. ✅ "Renk bağlayıcı değildir, onay numuneyle verilir" ibaresi.
2. ✅ Ziyaretlere kaynak (kiosk, QR, paylaşım, site, doğrudan) ve şube/kampanya etiketi; "AR açılamadı" sayacı. Kurulumda 6. tablo dosyası.
3. ✅ Cihaza göre kademeli görüntü kalitesi (gerçek telefonda ölçülmedi).
4. ✅ Telefonda sade ilk ekran: kumaş şeridi ve "Numune iste" ilk ekranda; görünüm araçları "Daha fazla" altında; koltuk araç çubuğu dokununca.
5. ✅ Kiosk: "Elinizdeki kartelanın kodu" kutusu (kod nasıl yazılırsa yazılsın bulur, tam kodda kumaşı hemen giydirir) ve sahne dışındaki her şeyde büyük yazı.
6. ✅ Talepleri silme: panelde onaylı "Sil" (KVKK silme talebi için); `SAMPLE_RETENTION_DAYS` girilirse o süreden eski talepler kendiliğinden silinir (süre avukatla belirlenecek).
7. ✅ Talep durumu ve "siparişe döndü" (kesim masasıyla birlikte yapıldı).
8. ✅ Numune sonrası "bundan sonra ne olacak" adımları; panelden talebi mağazanın WhatsApp'ına iletme.
9. ✅ Kartela askısı QR'ı: firma başına A4 askı etiketi sayfası; okutunca o kumaş firmanın koltuğunda açılır.
11. ✅ Firma başına en fazla 6 hazır sahne: panelde paylaşım bağlantısıyla eklenir, firma sayfasında kart olarak tek dokunuşla açılır.
10. ✅ Firmaya aylık tek sayfalık özet (ziyaret, deneme, AR, numune, siparişe dönen; 30 ziyaretten sonra en çok denenen kumaşlar).

## Faz 3

- **Kendi koltuğunda gör (AI):** Müşteri evdeki koltuğun fotoğrafını çeker, ORMEN kumaşıyla kaplanmış halini görür. Arayüz (`lib/ai/reupholster.ts`) hazır; servis seçimi, maliyet ve KVKK değerlendirmesi o zaman yapılacak.
- **ORMEN veri paneli:** Hangi kumaş hangi firmada, hangi bölgede deneniyor; stok ve koleksiyon kararlarına girdi.

## Bilerek yapılmayanlar

Üyelik, sepet, ödeme ve fiyat; ORMEN dışı kumaş; serbest duvar çizimi, kapı ve pencere; CAD çıktısı. Gerekçeler `KARARLAR.md` ve `REKABET-PLANI.md`'de.
