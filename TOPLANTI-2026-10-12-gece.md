# Gece toplantısı: sabaha kadar 10 iş (12 Ekim 2026, gece yarısı)

**Katılımcılar:**
- **İçeriden:** Mert (teknik), Selin (satış), Hakan (depo).
- **Eleştirmen:** Kerem Aydın (dijital ürün).
- **Hukuk:** Av. Deniz Yalın (yazılı görüşle).
- **Ar-Ge:** Dr. Ece Karaman (görüntü işleme danışmanı, ARGE.md'deki temsilî Ar-Ge'ci).
- CEO moderatör.

Kişiler temsilîdir.

## Kurallar (önceki toplantının dersi)
1. **Önce envanter.** 11 Ekim akşamı "yapalım" denen iki iş zaten vardı. Bu kez her öneri, kodda var mı diye bakıldıktan sonra listeye girdi. Mert taradı: 40 sayfa ve uç nokta, kiosk, rapor, numune akışı, AR, föy.
2. **Gece Fatih Bey'e bir şey sorulmayacak.** İş, onun kararını ya da verisini beklememeli: gerçek kumaş, logo, numune süresi metni, ödeme yok.
3. **Veritabanı değişikliği yok.** Supabase bağlantısı bu oturumda yok. Tablo değişikliği isteyen iş sabaha kalır.
4. **Her iş ölçülür ya da testle kanıtlanır, gönderilir.** Sabah tek bir raporda toplanır.

## Seçilen 10 iş

| # | İş | Neden (kim) | Bitti sayılır |
|---|---|---|---|
| 1 | **Erişilebilirlik denetimi**: axe ile ana sayfa, diyaloglar, panel | Kerem: "Yaşlı müşteri, büyük yazı, ekran okuyucu; mağazada herkes kullanacak" | Ciddi ve kritik ihlal sıfır; uçtan uca testte bekçi |
| 2 | **3B sahne çökerse toparlanma** (WebGL bağlamı kaybı) | Mert: telefon arka plana atılıp dönünce sahne boş kalabiliyor | Bağlam düşürülünce sahne geri geliyor ya da açık bir mesaj çıkıyor; testle |
| 3 | **Föyde 1:1 kumaş karesi** | Selin: "Föyü müşteriye veriyoruz; desenin büyüklüğü kâğıtta da görünsün" | Basılı föyde 5 × 5 cm gerçek boyut kare ve yanında cetvel |
| 4 | **Hız: diyaloglar ihtiyaç anında yüklensin** | Kerem: ilk açılış telefonda ağır | Telefonda ilk yükte inen JavaScript ölçülür ve azalır |
| 5 | **Güvenlik başlıkları** (içerik güvenlik politikası) | Av. Yalın: "uygun güvenlik önlemi" | Sıkı CSP; bütün uçtan uca testler geçer |
| 6 | **Pilot günü iki adımlı doğrulama zorunlu**: tek ayarla | 11 Ekim kararı | `PANEL_2FA_ZORUNLU=1` ile doğrulaması olmayan yalnızca Güvenlik sayfasına girer; testli |
| 7 | **Bulanık ya da küçük fotoğraf uyarısı** (panel) | Hakan: depoda hızlı çekimde bulanık kare kaçar | Bulanıklık ölçüsü; sentetik bulanık fotoğrafta uyarı, keskinde yok |
| 8 | **Kart bulunamazsa nedeni** | Dr. Karaman: "'Bulunamadı' yetmez; kaç işaret görüldü, ne yapmalı?" | 4'ten az işarette "kartın tamamı kadrajda olsun" gibi somut öneri; testli |
| 9 | **İstemci hatalarını görmek** | Mert: pilotta telefonda çöken sayfayı bilmiyoruz | Tarayıcı hataları kişisel veri olmadan sunucu kaydına düşer, sınırlı |
| 10 | **Sabah raporu** | Fatih Bey | `SABAH-RAPORU.md`: ne yapıldı, ölçümler, ondan beklenenler |

## Elenenler
- **Yeni olay türü ("sahne açılamadı"):** Veritabanı kısıtı değişmeli. Sabaha kaldı; 9. iş şimdilik aynı bilgiyi sunucu kaydından veriyor.
- **İngilizce site:** Brief Türkçe.
- **Çevrimdışı kiosk:** Değerli, ama doku önbelleği büyük bir iş; gece yarım kalırsa riskli.
- **Numune teşekkür ekranında süre:** Fatih Bey'in onayını bekliyor.

## Sıra
Önce güvenlik ve dayanıklılık (6, 5, 2, 9), sonra kullanıcıya görünenler (1, 3, 4), sonra Ar-Ge (8, 7), en son rapor (10).
Her iş ayrı gönderilir. Bir iş tıkanırsa sebebi rapora yazılır ve sıradakine geçilir.
