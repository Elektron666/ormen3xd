import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPanelUser, panelLoginAvailable } from "@/lib/auth/panel";
import { supabaseEnabled } from "@/lib/supabase/config";
import { BrandMark } from "@/components/configurator/BrandMark";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Panel girişi", robots: { index: false } };

export default async function LoginPage() {
  if (await getPanelUser()) redirect("/panel");
  const demoHint =
    !supabaseEnabled() && process.env.NODE_ENV !== "production" && !process.env.PANEL_DEMO_EMAIL
      ? "Yerel geliştirme: demo@ormen.local / ormen-demo"
      : null;
  return (
    <main className="flex min-h-dvh items-center justify-center bg-kirik-beyaz px-4">
      <div className="w-full max-w-sm rounded-2xl border border-cizgi bg-kagit p-7 shadow-[0_24px_60px_-30px_rgba(42,42,40,0.35)]">
        <div className="mb-6 flex items-end justify-between">
          <BrandMark />
          <span className="eyebrow">Panel</span>
        </div>
        {panelLoginAvailable() ? (
          <LoginForm demoHint={demoHint} />
        ) : (
          <p className="text-[14px] leading-relaxed text-antrasit-70">
            Panel girişi henüz ayarlanmadı. Supabase anahtarlarını ya da <code>PANEL_DEMO_EMAIL</code> ve <code>PANEL_DEMO_PASSWORD</code> değişkenlerini
            girin (README, “Panel” bölümü).
          </p>
        )}
      </div>
    </main>
  );
}
