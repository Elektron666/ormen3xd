import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { panelAccess } from "@/lib/auth/panel";
import { BrandMark } from "@/components/configurator/BrandMark";
import { logoutAction } from "../../actions";
import { CodeForm } from "./CodeForm";

export const metadata: Metadata = { title: "Doğrulama kodu", robots: { index: false } };

export default async function CodePage() {
  const a = await panelAccess();
  if (a.state === "tamam") redirect("/panel");
  if (a.state === "yok") redirect("/panel/giris");
  return (
    <main className="flex min-h-dvh items-center justify-center bg-kirik-beyaz px-4">
      <div className="w-full max-w-sm rounded-2xl border border-cizgi bg-kagit p-7 shadow-[0_24px_60px_-30px_rgba(42,42,40,0.35)]">
        <div className="mb-6 flex items-end justify-between">
          <BrandMark />
          <span className="eyebrow">Panel</span>
        </div>
        <p className="mb-4 text-[14px] leading-relaxed text-antrasit-70">
          <strong className="font-medium text-antrasit">{a.email}</strong> için iki adımlı doğrulama açık. Telefonunuzdaki doğrulama uygulamasında (Google Authenticator vb.) “ORMEN
          Atelier” satırındaki 6 haneli kodu yazın.
        </p>
        <CodeForm />
        <form action={logoutAction} className="mt-4">
          <button type="submit" className="text-[13px] text-antrasit-50 underline underline-offset-2 hover:text-antrasit">
            Başka hesapla gir
          </button>
        </form>
      </div>
    </main>
  );
}
