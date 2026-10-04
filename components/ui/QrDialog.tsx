"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog } from "./Dialog";

/** A dialog with one large QR code and a line of explanation (kiosk "Telefona al"). */
export function QrDialog({ open, onClose, title, text, url }: { open: boolean; onClose: () => void; title: string; text: string; url: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#2a2a28", light: "#ffffff" } }).then((s) => alive && setSvg(s));
    return () => {
      alive = false;
    };
  }, [url]);
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-[15px] leading-snug text-antrasit-70">{text}</p>
        {svg ? (
          <div className="h-60 w-60 rounded-xl border border-cizgi bg-white p-2 [&>svg]:h-full [&>svg]:w-full" role="img" aria-label="Telefonda açmak için QR kod" dangerouslySetInnerHTML={{ __html: svg }} />
        ) : (
          <div className="h-60 w-60 animate-pulse rounded-xl bg-cizgi/50" />
        )}
      </div>
    </Dialog>
  );
}
