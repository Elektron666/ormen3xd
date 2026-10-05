"use client";

import { useState } from "react";
import type { FurnitureModel } from "@/lib/types";
import { cleanTag, markedPath } from "@/lib/source";
import { buttonClass } from "./ui";

// Link, QR (SVG / PNG) and A6 card for a firm page or one of its models.

export function FirmShare({ firmId, slug, base, models, finalDomain }: { firmId: string; slug: string; base: string; models: FurnitureModel[]; finalDomain: boolean }) {
  const [model, setModel] = useState("");
  const [copied, setCopied] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const tag = cleanTag(tagInput);
  const path = `/f/${slug}${model ? `/${model}` : ""}`;
  const url = `${base}${markedPath(path, { tag })}`;
  const kioskPath = markedPath(path, { kiosk: true, tag });
  const withTag = tag ? `&etiket=${tag}` : "";
  const qr = (fmt: "svg" | "png", download = true) => `/api/panel/qr?yol=${encodeURIComponent(path)}&bicim=${fmt}${withTag}${download ? "" : "&indir=0"}`;
  const card = `/panel/kart/${firmId}${model || tag ? "?" : ""}${[model && `model=${model}`, tag && `etiket=${tag}`].filter(Boolean).join("&")}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="mb-8 rounded-2xl border border-cizgi bg-kagit p-5">
      <div className="flex flex-wrap items-start gap-6">
        {/* eslint-disable-next-line @next/next/no-img-element -- generated QR */}
        <img key={`${path}-${tag}`} src={qr("svg", false)} alt={`${url} için QR kod`} width={148} height={148} className="h-[148px] w-[148px] rounded-lg border border-cizgi bg-white" />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">Firma bağlantısı</p>
            <select value={model} onChange={(e) => setModel(e.target.value)} className="h-8 rounded-full border border-cizgi bg-white px-3 text-[13px]" aria-label="Bağlantının açacağı model">
              <option value="">Bütün modeller</option>
              {models.map((m) => (
                <option key={m.id} value={m.slug}>
                  Yalnızca {m.name}
                </option>
              ))}
            </select>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Şube / kampanya etiketi (isteğe bağlı)"
              aria-label="Şube ya da kampanya etiketi"
              aria-describedby="etiket-aciklama"
              maxLength={40}
              className="h-8 w-64 rounded-full border border-cizgi bg-white px-3 text-[13px]"
            />
          </div>
          <p id="etiket-aciklama" className="-mt-1 text-[12px] text-antrasit-70">
            {tag ? (
              <>
                Etiket: <code>{tag}</code>. Bu bağlantı ve QR’dan gelen ziyaretler raporda bu etiketle ayrı sayılır.
              </>
            ) : (
              "Örn. “Ankara şube”, “Fuar 2027”. Raporda ziyaretleri şubeye ya da kampanyaya göre ayırır. Kişi adı yazmayın."
            )}
          </p>
          <p className="break-all font-medium" translate="no" data-testid="firma-baglantisi">
            {url}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} className={buttonClass.secondary}>
              {copied ? "Kopyalandı" : "Bağlantıyı kopyala"}
            </button>
            <a href={markedPath(path, { tag })} target="_blank" rel="noopener" className={buttonClass.secondary}>
              Sayfayı aç
            </a>
            <a href={qr("svg")} className={buttonClass.secondary}>
              QR (SVG, matbaa)
            </a>
            <a href={qr("png")} className={buttonClass.secondary}>
              QR (PNG)
            </a>
            <a href={card} target="_blank" rel="noopener" className={buttonClass.primary}>
              A6 kart (PDF)
            </a>
          </div>
          <p className="text-[13px] text-antrasit-70">
            Showroom ekranı için:{" "}
            <a href={kioskPath} target="_blank" rel="noopener" className="font-medium text-antrasit underline underline-offset-2" data-testid="kiosk-baglantisi">
              {base}
              {kioskPath}
            </a>{" "}
            · dokunmatik ekranda tam ekran açılır, 90 sn dokunulmazsa baştan başlar (süreyi değiştirmek için ör. <code>?kiosk=120</code>).
          </p>
          {!finalDomain && (
            <p className="rounded-xl bg-[#F4E9DD] px-3 py-2 text-[13px] text-ceviz">
              QR şu an geçici adresi gösteriyor. Alan adı (atelier.ormentekstil.com.tr) bağlanıp <code>NEXT_PUBLIC_SITE_URL</code> girilmeden QR bastırmayın.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
