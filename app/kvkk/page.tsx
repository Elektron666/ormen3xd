import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Aydınlatma metni" };

// TASLAK: Bu metin bir hukukçu tarafından gözden geçirilmeden yayına alınmamalıdır.
export default function KvkkPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 text-antrasit">
      <p className="eyebrow mb-3">Kişisel verilerin korunması</p>
      <h1 className="font-display text-3xl">Numune talebi aydınlatma metni</h1>
      <p className="mt-3 rounded-lg bg-[#F4E9DD] px-3 py-2 text-[13px] text-ceviz">
        Taslak metindir. Yayından önce ORMEN TEKSTİL’in hukuk danışmanı tarafından onaylanmalıdır.
      </p>
      <div className="mt-8 flex flex-col gap-5 text-[15px] leading-relaxed text-antrasit-70">
        <p>
          <strong className="text-antrasit">Veri sorumlusu:</strong> ORMEN TEKSTİL, Siteler, Ankara.
        </p>
        <p>
          <strong className="text-antrasit">Hangi veriler:</strong> Numune talep formunda yazdığınız ad ve telefon numarası, seçtiğiniz kumaş kodları ve isteğe bağlı üç seçim (ne için, kaç parça, ne zaman). Formda serbest metin alanı yoktur.
          Bu araç; adınızı ve telefonunuzu yalnızca numune talebiyle birlikte saklar. Kumaş denemeleri gibi kullanım kayıtları kimliğinizle ilişkilendirilmez,
          IP adresi ve tarayıcı bilgisi tutulmaz. Ziyaretleri saymak için tarayıcı sekmesinde, sekme kapanınca silinen rastgele bir numara kullanılır; çerez
          kullanılmaz.
        </p>
        <p>
          <strong className="text-antrasit">Amaç:</strong> Talep ettiğiniz kumaş numunesinin size ulaştırılması ve bu amaçla sizinle iletişime geçilmesi.
        </p>
        <p>
          <strong className="text-antrasit">Aktarım:</strong> Talebiniz, aracı kullandığınız mobilya firmasının sayfasından geldiyse o firmayla ve ORMEN TEKSTİL ile paylaşılır.
          Başka amaçla üçüncü kişilere aktarılmaz.
        </p>
        <p>
          <strong className="text-antrasit">Saklama süresi:</strong> Talep tamamlandıktan sonra makul süre içinde silinir.
        </p>
        <p>
          <strong className="text-antrasit">Haklarınız:</strong> 6698 sayılı Kanun’un 11. maddesi kapsamındaki haklarınız için ORMEN TEKSTİL’e başvurabilirsiniz.
        </p>
      </div>
      <Link href="/" className="mt-10 inline-block underline underline-offset-4">
        Konfigüratöre dön
      </Link>
    </main>
  );
}
