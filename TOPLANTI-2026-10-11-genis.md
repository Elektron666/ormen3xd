# Geniş toplantı: eleştirmenlerle baştan sona (11 Ekim 2026, öğleden sonra)

**Katılımcılar:**
- **Eleştirmenler** (davetli, ORMEN'le iş ilişkisi yok, eleştirmek için çağrıldılar):
  - **Kerem Aydın**, dijital ürün eleştirmeni ve e-ticaret dönüşüm danışmanı. "Yeni gelen biri ilk 10 saniyede ne anlıyor?" sorusuyla bakar.
  - **Zeynep Ersoy**, iç mekân ve mobilya yazarı, bir dekorasyon dergisinin editörü. Görsel ve marka gözüyle bakar.
- **Saha:**
  - Murat Bey, Kayseri'de mobilya üreticisi ve showroom sahibi; pilot firma adayı.
  - Hüseyin Usta, İnegöl'de döşeme atölyesi sahibi.
- **Tasarım:** Leyla Önal (iç mimar), Barış Tan (mobilya tasarımcısı).
- **Hukuk:** Av. Deniz Yalın.
- **İçeriden:** Selin (satış), Mert (teknik), Hakan (depo ve numune).
- CEO moderatör.

Kişiler temsilîdir. Herkes siteyi kendi telefonunda ve dizüstünde açtı. Mert bütün ekranları dolaştı: ana sayfa (masaüstü ve telefon), numune formu, firma sayfası, panel ve rapor. Eleştirmenler önceki toplantı notlarını okumadan geldi.

## İlk 10 saniye (eleştirmenler, kimse yönlendirmeden)

- **Kerem Aydın:**
  - "Açtım; bej, sıradan bir kanepe gördüm. Dün Chester'ı, yuvarlak pufu konuşmuşsunuz; ilk ekranda hiçbiri yok.
  - Modeller 'Mobilya ekle' menüsünün içinde saklı. Üstelik o menü modeli değiştirmiyor, yanına ikinci bir koltuk koyuyor. Chester'ı görmek isteyen biri önce yenisini ekliyor, sonra eskisini siliyor. Bunu kimse yapmaz.
  - Ziyaretçinin ilk istediği 'başka model göster'; o yol yok."
- **Zeynep Ersoy:**
  - "Kumaş tarafı çok güzel. Işık, gölge, dokunun ölçeği yerinde; dergide yayımlarım.
  - Ama ilk kumaş LUMA-02, panelde '23 yer tutucu' yazıyor. Yani ziyaretçinin ilk gördüğü kumaş ORMEN'in gerçek kumaşı değil. Gerçek olan tek seri MISSO ve listenin en sonunda. Bir kumaş firmasının vitrininde bu ters.
  - Telefonda alttaki renk uyarısı düğmelerin altına kaymış, 'onayı' kelimesi butonun arkasında kalıyor. 'Geri bildirim' de iki satıra bölünmüş. Küçük şeyler, ama ilk izlenim bunlarla bozulur."
- **Kerem Aydın:** "Bir de QR'ı yanlış basan ya da adresi yanlış yazan biri İngilizce 'This page could not be found' görüyor. Mağazada QR okutan müşteriye bu çıkarsa ORMEN'in adı değil, hata kalır akılda."
  - Mert bunu ekranda gösterdi: `/f/demo` gibi var olmayan bir firma adresi Next.js'in varsayılan İngilizce sayfasına düşüyor.

## Tartışma

### 1. Model değiştirme ve ilk ekran
- **Murat Bey:**
  - "Mağazada müşteri 'bunun Chester'ı nasıl olur' diye sorar. Satışçı ikinci bir koltuk ekleyip öncekini silmeye uğraşamaz.
  - Seçili koltuğun üstündeki etikette adı yazıyor; oraya dokunup değiştirebilmeli."
- **Barış Tan:** Model değişince kumaş, bölgeler, ayak ve desen yönü korunmalı. Müşteri kumaşı seçmiş, modeli deniyor.
- **Mert:** Yerleşimde koltuğun yeri ve dönüşü de korunur. Yeni model büyükse, duvara taşıyorsa en yakın boş yere kayar; bu mantık "Mobilya ekle"de zaten var.
- **Leyla Önal:** "İlk açılışta Modüler Kanepe kalabilir; nötr ve her eve uyuyor. Ama 'model değiştir' göze batmalı."
- **Karar:**
  - Seçili mobilyanın etiketinde **"Model değiştir"**. Aynı listeyi açar; seçilen model yerine konur, kumaş ve bölge seçimleri korunur. Hemen.
  - İlk model Modüler Kanepe kalıyor.

### 2. Yer tutucu kumaşlar önde
- **Selin:** "Gerçek kumaş fotoğrafları gelene kadar yer tutucular yayında kalmak zorunda; yoksa katalogda 6 kumaş kalır."
- **Zeynep Ersoy:** "Kalsın, ama gerçek olan önde olsun. Ziyaretçi 'ORMEN'in kumaşı bu' dediğinde gerçek bir kumaşa baksın."
- **Av. Yalın:** "Yer tutucu kumaş gerçek ürün gibi gösterilip numunesi istenirse sorun çıkar: olmayan bir ürünün numunesini istemiş olur. Numune formu yer tutucuyu kabul ediyor mu?"
  - **Mert:** Ediyor; ayrım yok.
- **Karar:**
  - Kumaş listesinde gerçek kumaşlar önce, yer tutucular sonra. Hemen.
  - Yer tutucu kumaşın künyesinde "Örnek kumaş, satışta değil" ibaresi; numune formu yer tutucu için numune istemez, "Bu bir örnek kumaştır" der. Hemen.
  - Yer tutucuların tamamen gizlenmesi, gerçek kumaşlar gelince (panelde düğmesi hazır). Karar Fatih Bey'de.

### 3. Telefonda alt bölüm ve numune formu
- **Kerem Aydın:**
  - Telefonda renk uyarısı ve "Geri bildirim" düğmelerle çakışıyor.
  - Dizüstünde (768 piksel yükseklik) numune formunun "Gönder" düğmesi ekranın altında kalıyor; kaydırmadan görünmüyor. "Formu doldurup düğmeyi bulamayan, talebi bırakır."
- **Karar:** Telefonda uyarı ve "Geri bildirim" düğmelerin altında, ayrı bir satırda. Numune formunun gönder düğmesi pencerenin altında sabit. İkisi de hemen.

### 4. Biye telefonda kesik kesik
- **Hüseyin Usta:** "Telefonda sırt minderlerinin üstündeki biye dikiş gibi kesik kesik görünüyor. Bilgisayarda düz."
- **Mert:** Biye çok ince (yaklaşık 9 mm çaplı) bir tüp. Telefonun küçük ekranında pikselin altına düşüyor ve kırık görünüyor. Kalınlaştırırsak bilgisayarda kaba durur.
  - **Öneri:** Uzaklığa göre ince biyeyi biraz kalınlaştırmak ya da ekranda yumuşatma (antialiasing) kalitesini telefonda artırmak. İkisi de cihazda ölçülmeli.
- **Karar:** Cihaz testine (Samsung, iPhone) bağlanıyor; ölçmeden değiştirilmeyecek. Sırada.

### 5. Ziyaretçi neyi bilmeli: numune ne zaman gelir?
- **Hakan:** "Numune talebi gelince 24 saatte hazırlıyoruz, kargo 1–2 gün. Formda bunu kimse söylemiyor; müşteri ertesi gün mağazayı arıyor."
- **Selin:** Söz verilen süre tutmazsa daha kötü olur. Panelde 24 saati geçen talep zaten kırmızı.
- **Av. Yalın:** "Süre bir taahhüt olur. 'Genellikle' diye yazın, kesin gün vermeyin."
- **Karar:** Teşekkür ekranına "Numune genellikle 2–3 iş günü içinde mağazaya ulaşır; firma sizi arar." Fatih Bey onaylarsa; süre ORMEN'in operasyon kararı. Bekliyor.

### 6. Eleştirmenlerin büyük soruları
- **Kerem Aydın: "Bu site kime? Son müşteriye mi, mağazaya mı, firmaya mı?"**
  - Ana sayfa son müşteriye konuşuyor. Satışı yapan ise mağaza ve firma.
  - Firma sayfası (`/f/firma`) bunun cevabı ama ana sayfadan görünmüyor. "Siz firma mısınız? Kendi sayfanızı isteyin" diye tek bir satır yok.
  - **Selin:** Firma sayfası satışçının elinde ziyarette gösteriliyor, siteden başvuru beklenmiyor.
  - **Karar:** Ana sayfa son müşteriye kalıyor. Pilotta firma başvurusu satışçı üzerinden. Siteden başvuru pilottan sonra yeniden konuşulacak.
- **Zeynep Ersoy: "ORMEN markası nerede?"**
  - Logo yazıyla yazılmış bir yer tutucu.
  - Paylaşım görselinde ORMEN TEKSTİL imzası güzel olmuş, ama sitenin kendisinde ORMEN'in kim olduğu, kaç yıllık olduğu, nerede olduğu hiç yazmıyor. "Bir 'Hakkımızda' satırı bile güven verir."
  - **Karar:** Gerçek logo ve kısa bir ORMEN tanıtım satırı (adres, kuruluş yılı) Fatih Bey'den gelecek. Uydurulmayacak. Gelince künye altına ve KVKK sayfasına konur.

## Reddedilenler
- **Ana sayfada model galerisi (Kerem Aydın önerdi):** İlk ekranı kalabalıklaştırır. "Model değiştir" aynı işi sahnenin içinde görüyor.
- **Canlı sohbet / WhatsApp balonu (Murat Bey sordu):** Numune talebinden sonra WhatsApp düğmesi zaten var. Her sayfada balon, firma sayfasında ORMEN'i firmanın önüne koyar.
- **Fiyat ve "bu kumaşla kaça olur" (Murat Bey sordu, yine):** Brief gereği yok.

## Kararlar ve sıra

| # | Ne | Ne zaman | Kim |
|---|---|---|---|
| 1 | Türkçe "sayfa bulunamadı" sayfası (QR'ı yanlış okutan ana sayfaya yönlenir) | Hemen | Claude |
| 2 | Seçili mobilyada "Model değiştir" (kumaş, bölge, ayak, desen yönü korunur) | Hemen | Claude |
| 3 | Kumaş listesinde gerçek kumaşlar önce | Hemen | Claude |
| 4 | Yer tutucu kumaşa "Örnek kumaş" ibaresi; numune formu yer tutucuya numune istemez | Hemen | Claude |
| 5 | Telefonda renk uyarısı ve Geri bildirim ayrı satırda, çakışmasın | Hemen | Claude |
| 6 | Numune formunda gönder düğmesi pencerenin altında sabit | Hemen | Claude |
| 7 | Biye telefonda kesik: cihaz testinde ölçülüp düzeltilecek | Cihaz testi | Mert, Claude. Neden bulundu ve düzeltildi (derinlik hassasiyeti, ARGE.md A5); cihazda doğrulama bekliyor |
| 8 | Teşekkür ekranında numune süresi ("genellikle 2–3 iş günü") | Fatih Bey onaylarsa | Fatih Bey |
| 9 | Gerçek logo ve kısa ORMEN tanıtım satırı | Fatih Bey'den gelince | Fatih Bey |
| 10 | Yer tutucuların tamamen gizlenmesi | Gerçek kumaşlar gelince | Fatih Bey |

## Kapanış
- **Zeynep Ersoy:** "Teknik olarak bu ölçekte bir şeyi Türkiye'de bir kumaş firmasında ilk kez görüyorum. Eksiği teknik değil, içerik: gerçek kumaş, gerçek logo, gerçek model."
- **Kerem Aydın:** "Model değiştirme gelince ilk 10 saniye çözülür. Gerisini pilotta ölçün; benim tahminim yerine gerçek ziyaretçinin davranışına bakın. Geri bildirim formu da tam bunun için."
