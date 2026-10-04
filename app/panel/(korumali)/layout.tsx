import type { Metadata } from "next";
import Link from "next/link";
import { requirePanelUser } from "@/lib/auth/panel";
import { getRepository } from "@/lib/data";
import { logoutAction } from "../actions";
import { PanelNav } from "@/components/panel/PanelNav";

export const metadata: Metadata = { title: { default: "Panel", template: "%s · Panel" }, robots: { index: false } };

export default async function PanelLayout({ children }: LayoutProps<"/panel">) {
  const user = await requirePanelUser();
  const repo = getRepository();
  return (
    <div className="min-h-dvh bg-kirik-beyaz text-antrasit">
      <header className="sticky top-0 z-20 border-b border-cizgi bg-kagit/95 backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 md:px-6">
          <Link href="/panel" className="flex items-baseline gap-2">
            <span className="font-display text-[18px] tracking-[0.24em] text-ceviz">ORMEN</span>
            <span className="eyebrow">Panel</span>
          </Link>
          <PanelNav />
          <div className="ml-auto flex items-center gap-2 text-[12px] text-antrasit-50">
            <span className="hidden sm:inline">{user.email}</span>
            <Link href="/" target="_blank" className="rounded-full px-2.5 py-1.5 hover:bg-cizgi/60 hover:text-antrasit">
              Siteyi aç
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="rounded-full px-2.5 py-1.5 hover:bg-cizgi/60 hover:text-antrasit">
                Çıkış
              </button>
            </form>
          </div>
        </div>
      </header>
      {!repo.persistent && (
        <div className="border-b border-[#ead9c4] bg-[#F4E9DD] px-4 py-2 text-center text-[13px] text-ceviz">
          Örnek veri modu: Supabase bağlı olmadığı için eklenenler sunucu yeniden başlayınca kaybolur. Kalıcı kayıt için README’deki Supabase adımlarını izleyin.
        </div>
      )}
      <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">{children}</main>
    </div>
  );
}
