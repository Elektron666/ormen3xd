# Supabase dosyaları

Canlı proje: `ormen-atelier` (Frankfurt, eu-central-1). Claude bu dosyaları Supabase bağlantısı üzerinden kendisi çalıştırıyor. Gizli anahtar (service_role) hiçbir yerde mesajla paylaşılmaz; yalnızca Vercel'de durur.

## `migrations/`: tablo dosyaları

Ad sırasıyla, her biri bir kez çalışır. Supabase'in "Migrations" listesinde de aynı adlarla görünür.

| Dosya | Ne yapar |
|---|---|
| `20261004000000_kurulum.sql` | Tablolar, güvenlik kuralları, dosya klasörü |
| `20261005000000_secerek_modeller.sql` | "Seçerek oluştur" modelleri |
| `20261006000000_kumas_serisi.sql` | Firma ve model başına kumaş serisi |
| `20261007000000_rapor_fonksiyonu.sql` | Aylık rapor fonksiyonu |
| `20261008000000_dosya_sinirlari.sql` | Yüklenen dosyalara boyut ve tür sınırı |
| `20261009000000_ziyaret_kaynaklari.sql` | Ziyaret kaynağı (QR, bağlantı) ve etiketler |
| `20261010000000_kesim_masasi.sql` | Numune adımları, lot, kumaş deseni ve yönü, metraj, kesim geri bildirimi |
| `20261011000000_bolge_metraji.sql` | Bölge başına metraj (kasa, kollar, oturak, sırt) |

Yeni bir değişiklik yeni bir dosyayla gelir; eski dosya değiştirilmez. Kurulum sayfası (`/panel/durum`) hangisinin eksik olduğunu söyler.

## `veri/`: katalog dosyaları

Tablo dosyalarından sonra, numara sırasıyla. Hepsi tekrar çalıştırılabilir; var olan satırı bozmaz.

| Dosya | Ne yapar |
|---|---|
| `1-ornek-katalog.sql` | Yer tutucu kumaşlar ve 3 örnek model (kanepe, berjer, köşe takımı) |
| `2-kumaslar-misso.sql` | Fotoğraftan hazırlanan MISSO kumaşları. Tekrar çalışınca yalnızca doku ve ölçek güncellenir; panelde verilen adlar kalır |
| `3-modeller-vitrin.sql` | 8 hazır model (Chester, Modern, İskandinav, köşe, U, blok, puf). Var olan model atlanır |

Bu üç dosya elle düzenlenmez; `npm run seed:sql` ve `scripts/build-*-sql.ts` betikleri yazar.
