import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/configurator/BrandMark";

export const metadata: Metadata = { title: "Sayfa bulunamadı", robots: { index: false } };

// A mistyped address or a QR from an old print lands here (geniş toplantı,
// 11 Oct): in Turkish, with a way on, never the framework's English page.
export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-kirik-beyaz px-4 text-antrasit">
      <div className="w-full max-w-md rounded-2xl border border-cizgi bg-kagit p-8 text-center shadow-[0_24px_60px_-30px_rgba(42,42,40,0.35)]">
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>
        <h1 className="font-display text-[26px]">Bu sayfa bulunamadı</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-antrasit-70">
          Adres yanlış yazılmış ya da bağlantı artık geçerli olmayabilir. Bir mağazadaki QR kodu okuttuysanız, mağaza görevlisinden yeni bağlantıyı isteyebilirsiniz.
        </p>
        <Link href="/" className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-antrasit px-6 text-[14px] text-kagit hover:bg-ceviz">
          ORMEN kumaşlarını deneyin
        </Link>
      </div>
    </main>
  );
}
