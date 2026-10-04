"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import QRCode from "qrcode";
import type { Fabric, FurnitureModel } from "@/lib/types";
import { currentArDevice } from "@/lib/ar/device";
import { Dialog } from "@/components/ui/Dialog";

// "Odamda gör": on a phone, the selected piece opens in the AR viewer right
// here. On a computer, a QR code opens the same piece and fabric on the phone.

const ArViewer = dynamic(() => import("@/components/ar/ArViewer").then((m) => m.ArViewer), { ssr: false });

export function ArDialog({ open, onClose, model, fabric, phoneUrl }: { open: boolean; onClose: () => void; model: FurnitureModel; fabric: Fabric; phoneUrl: () => string }) {
  const [device] = useState(currentArDevice);
  const [qr, setQr] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (!open || device !== "desktop") return;
    let alive = true;
    QRCode.toString(phoneUrl(), { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#2a2a28", light: "#ffffff" } }).then((svg) => alive && setQr(svg));
    return () => {
      alive = false;
    };
  }, [open, device, phoneUrl]);

  if (device !== "desktop") {
    return (
      <Dialog open={open} onClose={onClose} title={`${model.name} · ${fabric.code}`} wide>
        {open && <ArViewer model={model} fabric={fabric} className="h-[62dvh]" />}
        <p className="mt-3 text-[13px] leading-snug text-antrasit-70">
          “Odamda gör”e dokunun, telefonu yere doğru tutup yavaşça gezdirin. Koltuk gerçek boyutunda yerleşir; parmağınızla kaydırıp döndürebilirsiniz.
        </p>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title="Odanızda görün" wide={preview}>
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-[14px] leading-snug text-antrasit-70">
          Telefonunuzun kamerasıyla okutun. <strong className="font-medium text-antrasit">{model.name}</strong>, <strong className="font-medium text-antrasit">{fabric.code}</strong> kumaşıyla odanızda gerçek boyutunda görünür.
        </p>
        {qr ? (
          <div className="h-52 w-52 rounded-xl border border-cizgi bg-white p-2 [&>svg]:h-full [&>svg]:w-full" role="img" aria-label="Telefonda açmak için QR kod" dangerouslySetInnerHTML={{ __html: qr }} />
        ) : (
          <div className="h-52 w-52 animate-pulse rounded-xl bg-cizgi/50" />
        )}
        <p className="text-[12px] text-antrasit-50">iPhone (Safari) ve ARCore destekli Android telefonlarda çalışır.</p>
        {preview ? (
          <ArViewer model={model} fabric={fabric} className="h-[46dvh] w-full" />
        ) : (
          <button type="button" onClick={() => setPreview(true)} className="text-[13px] text-antrasit-70 underline underline-offset-2 hover:text-antrasit">
            AR modelini burada önizle
          </button>
        )}
      </div>
    </Dialog>
  );
}
