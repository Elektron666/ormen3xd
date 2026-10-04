"use client";

import dynamic from "next/dynamic";
import type { Fabric, Firm, FurnitureModel } from "@/lib/types";
import { BrandMark } from "@/components/configurator/BrandMark";
import { inkFor } from "@/lib/firm";
import { FABRIC_TYPE_LABELS, t } from "@/lib/i18n/tr";

const ArViewer = dynamic(() => import("@/components/ar/ArViewer").then((m) => m.ArViewer), {
  ssr: false,
  loading: () => <div className="studio-backdrop h-full animate-pulse rounded-2xl" />,
});

export function ArLanding({ model, fabric, firm, backHref }: { model: FurnitureModel; fabric: Fabric; firm: Firm | null; backHref: string }) {
  const style = firm
    ? ({ "--accent": firm.accentColor, "--color-accent": firm.accentColor, "--accent-ink": inkFor(firm.accentColor), "--color-accent-ink": inkFor(firm.accentColor) } as React.CSSProperties)
    : undefined;
  return (
    <div style={style} className="flex min-h-dvh flex-col gap-4 bg-kirik-beyaz p-4 pt-[max(1rem,env(safe-area-inset-top))] md:mx-auto md:max-w-3xl md:p-8">
      <header className="flex items-center justify-between">
        <BrandMark firm={firm} />
        <a href={backHref} className="text-[13px] text-antrasit-70 underline underline-offset-2">
          Kumaşı değiştir
        </a>
      </header>
      <div>
        <p className="eyebrow">Odanızda görün</p>
        <h1 className="font-display text-[26px] leading-tight">{model.name}</h1>
        <p className="text-[15px] text-antrasit-70">
          <span className="font-medium tracking-wide text-antrasit">{fabric.code}</span> · {fabric.series} {fabric.colorName} · {FABRIC_TYPE_LABELS[fabric.type]}
        </p>
      </div>
      <ArViewer model={model} fabric={fabric} firmSlug={firm?.slug ?? null} className="h-[58dvh] min-h-[320px]" />
      <ol className="flex flex-col gap-1 text-[13px] leading-snug text-antrasit-70">
        <li>1. “Odamda gör”e dokunun.</li>
        <li>2. Telefonu yere doğru tutup yavaşça gezdirin; zemin bulununca koltuk gerçek boyutunda yerleşir.</li>
        <li>3. Parmağınızla kaydırıp döndürün. Renkler ışığa göre değişebilir; karar öncesi numune isteyin.</li>
      </ol>
      <p className="mt-auto border-t border-cizgi pt-3 text-center text-[12px] tracking-[0.18em] text-antrasit-50">{t.signature.toLocaleUpperCase("tr-TR")}</p>
    </div>
  );
}
