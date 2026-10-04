"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { whatsappUrl } from "@/lib/samples";

export interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  /** Composed share picture; null while it is being prepared. */
  image: Blob | null;
  url: string;
  /** Text that goes with the link (codes and furniture). */
  text: string;
  fileName: string;
  onPrint: () => void;
  onShared?: (channel: string) => void;
}

export function ShareDialog({ open, onClose, image, url, text, fileName, onPrint, onShared }: ShareDialogProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!image) return;
    const u = URL.createObjectURL(image);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL must be created and revoked with the blob
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [image]);

  const file = image ? new File([image], fileName, { type: image.type }) : null;
  const canNativeShare = typeof navigator !== "undefined" && !!file && !!navigator.canShare?.({ files: [file] });

  const btn =
    "flex h-11 items-center justify-center gap-2 rounded-full border border-cizgi px-4 text-[14px] text-antrasit transition-colors hover:border-cizgi-koyu hover:bg-white focus-visible:outline-2 focus-visible:outline-antrasit";

  return (
    <Dialog open={open} onClose={onClose} title="Paylaş" wide>
      <div className="flex flex-col gap-4">
        <div className="overflow-hidden rounded-xl border border-cizgi bg-kirik-beyaz">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Paylaşılacak görsel" className="w-full" />
          ) : (
            <div className="flex aspect-[16/11] items-center justify-center text-[13px] text-antrasit-50">Görsel hazırlanıyor…</div>
          )}
        </div>
        <p className="text-[13px] leading-snug text-antrasit-70">
          Görselde kumaş kodları ve ORMEN imzası var. Bağlantıyı açan kişi aynı odayı, aynı mobilyaları ve aynı kumaşları görür.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {canNativeShare && (
            <button
              type="button"
              className={`${btn} col-span-2 border-antrasit bg-antrasit text-kagit hover:bg-ceviz`}
              onClick={async () => {
                try {
                  await navigator.share({ files: [file!], title: "ORMEN kumaş kombinasyonu", text: `${text}\n${url}` });
                  onShared?.("cihaz");
                } catch {
                  /* cancelled */
                }
              }}
            >
              Paylaş…
            </button>
          )}
          <a className={btn} href={whatsappUrl(null, `${text}\n${url}`)} target="_blank" rel="noopener noreferrer" onClick={() => onShared?.("whatsapp")}>
            WhatsApp
          </a>
          <button
            type="button"
            className={btn}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1600);
                onShared?.("baglanti");
              } catch {
                /* clipboard blocked */
              }
            }}
          >
            {copied ? "Kopyalandı" : "Bağlantıyı kopyala"}
          </button>
          <a className={`${btn} ${preview ? "" : "pointer-events-none opacity-50"}`} href={preview ?? undefined} download={fileName} onClick={() => onShared?.("indir")}>
            Görseli indir
          </a>
          <button type="button" className={btn} onClick={onPrint} disabled={!preview}>
            Föyü yazdır / PDF
          </button>
        </div>
        <p className="break-all text-[11px] text-antrasit-50" translate="no">
          {url}
        </p>
      </div>
    </Dialog>
  );
}
