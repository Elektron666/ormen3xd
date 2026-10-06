# Acil toplantı: site yayında, pilota ne zaman? (6 Ekim 2026)

**Katılımcılar:**
- Dışarıdan: **Murat Bey** (Kayseri, mobilya üreticisi ve showroom sahibi, pilot firma adayı), **Elif Hanım** (bağımsız dijital ürün danışmanı; iki B2B ürünün pilotunu yönetmiş).
- İçeriden: Selin (satış), Mert (teknik).
- CEO moderatör.

Kişiler temsilîdir. Konuşmalar ekran görüntüleri üzerinden yapıldı, çünkü canlı siteye bu ortamdan erişilemiyor.

## Önce: yanlış alarmlar

Ekran görüntüleri geliştiricinin yerel test sunucusundan alınmıştı. Bu yüzden üç şey canlı sitede yok:
- **Sol alttaki "N" rozeti:** Next.js'in geliştirme göstergesi; canlı sürümde çıkmaz.
- **Paneldeki "Görsel Test" talebi ve usta föyündeki "En 140 cm · düz · çift yön":** Yerel testlerin girdiği veri. Canlı Supabase'de yalnızca örnek katalog var ve örnek kumaşların teknik alanları bilerek boş. Teknik değer uydurulmuyor.
- **Aylık özetteki "0 ziyaret, 2 numune":** Test taleplerinden. Gerçek kullanımda numune talebi bir ziyaretin içinden geliyor.

## Herkesin birleştiği nokta

**Yeni özellik yok.** Pilota kadar geliştiricinin zamanı içeriğe, altyapıya ve hata ayıklamaya gidiyor. Metraj motoru, oda, AR ve hav görünümü bekliyor. Mert: "Testler yeşil ama hiçbiri gerçek cihazda ya da gerçek kumaşla koşmadı. Eklenen her satır ölçmediğimiz bir riski büyütür."

## Pilot öncesi şartlar (birleşik sıra)

| # | Ne | Kim | Süre |
|---|---|---|---|
| 1 | **Gerçek kumaş.** Pilot firmanın askısındaki 6–8 kumaşın (en az 2 serinin) gerçek fotoğrafı, gerçek kodu, eni, desen ve kesim yönü girilir. Gerçek ORMEN logosu konur. Kalan yer tutucular gizlenir. 4 kişinin 4'ü bunu 1. sıraya koydu. | ORMEN ürün sorumlusu ve fotoğrafçı; yükleme ve kontrol geliştiricide | 5–7 iş günü |
| 2 | **Altyapı.** Vercel ücretli plana (Pro) geçer, çünkü ücretsiz plan ticari kullanıma izin vermiyor. Alan adı (CNAME) bağlanır. Supabase'te yedek ve "uyumama" sağlanır: ya Pro plan (günlük yedek dahil) ya da gecelik yedek ve canlı tutma. **Alan adı bağlanmadan tek bir QR, etiket ya da kart basılmaz.** | Ödeme kararı Fatih Bey'de, kurulum geliştiricide | 1 gün; aylık yaklaşık 45 $ |
| 3 | **Hukuk.** Avukat aydınlatma metnini tamamlar: saklama süresi ve **yurt dışına aktarım** (Supabase Frankfurt'ta). Supabase ile standart sözleşme, KVKK bildirimi ve pilot firmayla tek sayfalık veri protokolü hazırlanır. | Hakan ve avukat | 1–2 hafta (1 ve 2 ile aynı anda yürür) |
| 4 | **Firmanın kendi modeli.** Pilot firmanın en çok sattığı 2 model parametrik olarak girilir, metrajı firmanın ustasından alınır. Selin: "Firma kendi koltuğunu görmezse ilgilenmez." | Selin, firmada ustayla birlikte | Firma başına 1 gün |
| 5 | **Gerçek cihaz testi.** Orta sınıf Samsung (Samsung Internet ve Chrome), bir iPhone ve kiosk tableti; 2 gerçek seriyle. Ölçülecekler: kare hızı, kalite ayarının devreye girip girmediği, AR'ın açılması ve gerçek boyutu, ilk kumaşın kaç saniyede geldiği. | Geliştirici ve Mert | 2 gün |
| 6 | **Sahip ve ölçüm.** Talepleri 24 saat içinde işleyen tek bir sahip olur: Selin. Pilot firmayla 30 dakikalık kurulum yapılır, usta föyü ve zımba bir kez prova edilir. Panelden test kayıtları temizlenir ve canlı sitede tek bir deneme ziyaretiyle sayaçların saydığı doğrulanır. 10 siparişin ölçütleri (metraj sapması, lot yazım oranı, teyit süresi) tek tabloda toplanır. | Selin, depo tarafında Hakan | 2 gün |

## Açık çatışma: müşterinin telefonu kimde? (Fatih Bey'e)

**Murat Bey:** "Formda 'adım ve telefonum ORMEN TEKSTİL ile paylaşılır' yazıyor. Müşteri bunu benim mağazamda okuyunca 'kumaşçı beni mi arayacak?' der, ben de 'ORMEN müşterimi topluyor' diye düşünürüm." Murat Bey'in iki önerisi var:
- ya telefon yalnızca firmaya gitsin,
- ya da ORMEN imzalı bir söz versin: "son müşteriyi kendi satışı için aramam, talebi firmaya bırakırım."

Fatih Bey'in kararı (6 Ekim) telefonun ORMEN'de kalması. **Uzlaşma önerisi:**
- Telefon ORMEN'in veritabanında kalır.
- Pilot firmayla imzalanacak protokole şu söz yazılır: "ORMEN, firma sayfasından gelen müşteriyi kendi satışı ya da kampanyası için aramaz; talebi firmaya iletir, numuneyi firmanın mağazasına gönderir." Mevcut akış zaten böyle çalışıyor.
- Formdaki onay cümlesi buna göre yeniden yazılır, ör. "Talebim {firma}'ya iletilsin; numuneyi ORMEN TEKSTİL hazırlasın." Metni avukat onaylar.

## Şimdilik bırakılanlar

- Yeni özellik (herkes).
- Aylık özet ve rapor cilası (Selin): pilotun ilk ayında 30 ziyaret eşiği dolmaz.
- AR ve oda tarafı (Murat Bey: "Telefonda sehpa döndürmek satış getirmez").

## Küçük düzeltme önerileri (yeni özellik değil)

- **Kioskta müşterinin sahneyi bozmasını engelleme** (Mert): "Çoğalt", "Mobilya ekle" ve "Plan" kioskta gizlensin; showroom ekranı yalnızca kumaş denesin.
- **Ana sayfada küçük bir "Firma girişi" bağlantısı** (Elif): Fatih Bey'in "giriş yok" şaşkınlığına cevap.

## Pilot ne zaman?

Tarih değil şart (Selin, Elif):
- pilot firmanın göreceği her kumaş gerçek fotoğraf ve gerçek kodla girilmiş olacak,
- avukat onaylı metin yayında olacak,
- site kendi alan adında ve ücretli planda çalışacak,
- 3 telefonda belgelenmiş bir test yapılmış olacak.

Bunlarla **en erken 20 Ekim** (Elif), kabaca **2–3 hafta** (Mert, Selin, Murat Bey). Murat Bey: "Benim kumaşlarım gerçek fotoğrafla yüklenince ve müşterimin telefonunun kimde kalacağı imzalı kâğıda bağlanınca kendi showroomumda deneriz. O zamana kadar ekranı müşteriye açmam."
