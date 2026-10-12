"use client";

import { useEffect, useRef, useState } from "react";
import { applyGains, explainNoCard, findCard, paperWhite, rectifyWindow, type CardFound, type PaperWhite } from "@/lib/fabric/calibration";
import { readPixels } from "@/lib/fabric/process-browser";
import { repeatPeriod } from "@/lib/fabric/measure";
import type { Pixels } from "@/lib/fabric/process";

// Ar-Ge A1 + A2 (ARGE.md): the calibration card tried on a real photo. Under the
// window lies something of known size (graph paper, a ruled stripe); the page
// measures it through the card and says how far off the scale is, so the real
// error can be written into ARGE.md instead of the synthetic one.

interface Result {
  found: CardFound;
  paper: PaperWhite;
  photo: Pixels;
  flat: Pixels;
  pxPerCm: number;
  /** Opposite sides of the marker square, longest over shortest: how far from straight above. */
  tilt: number;
  scale: { x: number | null; y: number | null };
}

function toCanvas(c: HTMLCanvasElement | null, p: Pixels, maxW: number, marks?: [number, number][]) {
  if (!c) return;
  const k = Math.min(1, maxW / p.width);
  c.width = Math.round(p.width * k);
  c.height = Math.round(p.height * k);
  const src = new OffscreenCanvas(p.width, p.height);
  src.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(p.data), p.width, p.height), 0, 0);
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, c.width, c.height);
  ctx.strokeStyle = "#d1392b";
  ctx.lineWidth = 2;
  marks?.forEach(([x, y], i) => {
    ctx.beginPath();
    ctx.arc(x * k, y * k, 12, 0, Math.PI * 2);
    ctx.stroke();
    if (i === 0) ctx.fillText("1", x * k + 14, y * k - 10);
  });
}

const pct = (v: number) => `${v >= 0 ? "+" : "−"}%${Math.abs(v * 100).toFixed(2).replace(".", ",")}`;
const cm = (v: number) => v.toFixed(3).replace(".", ",");

export function CardTest() {
  const [knownCm, setKnownCm] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const photoCanvas = useRef<HTMLCanvasElement>(null);
  const flatCanvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!file || !(knownCm > 0)) return;
    let live = true;
    (async () => {
      setBusy(true);
      setError("");
      setResult(null);
      try {
        const photo = await readPixels(file, 3000);
        const found = findCard(photo);
        if (!found) throw new Error(explainNoCard(photo).advice);
        const paper = paperWhite(photo, found);
        const { pixels: flat, sizeCm } = rectifyWindow(photo, found, { maxSide: 1400 });
        if (!paper.clipped) applyGains(flat, paper.gains);
        const pxPerCm = flat.width / sizeCm;
        const m = found.markers;
        const side = (i: number) => Math.hypot(m[(i + 1) % 4][0] - m[i][0], m[(i + 1) % 4][1] - m[i][1]);
        const tilt = Math.max(side(0) / side(2), side(2) / side(0), side(1) / side(3), side(3) / side(1));
        const measure = (axis: "x" | "y") => {
          const p = repeatPeriod(flat, axis, knownCm * pxPerCm);
          return p === null ? null : p / pxPerCm;
        };
        if (live) setResult({ found, paper, photo, flat, pxPerCm: found.pxPerMm * 10, tilt, scale: { x: measure("x"), y: measure("y") } });
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "Fotoğraf okunamadı.");
      } finally {
        if (live) setBusy(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [file, knownCm]);

  useEffect(() => {
    if (!result) return;
    toCanvas(photoCanvas.current, result.photo, 520, result.found.markers);
    toCanvas(flatCanvas.current, result.flat, 320);
  }, [result]);

  const summary = result
    ? [
        `ORMEN kart denemesi (${new Date().toLocaleDateString("tr-TR")})`,
        `Bilinen aralık: ${knownCm} cm`,
        `Yatay: ${result.scale.x === null ? "ölçülemedi" : `${cm(result.scale.x)} cm (${pct(result.scale.x / knownCm - 1)})`}`,
        `Dikey: ${result.scale.y === null ? "ölçülemedi" : `${cm(result.scale.y)} cm (${pct(result.scale.y / knownCm - 1)})`}`,
        `Çözünürlük (pencerede): ${Math.round(result.pxPerCm)} px/cm`,
        `Eğiklik (karşı kenar oranı): ${result.tilt.toFixed(2).replace(".", ",")}`,
        `Kâğıt: RGB ${result.paper.rgb.join(", ")}${result.paper.clipped ? " (patlamış, renk düzeltilmedi)" : ` → kazanç ${result.paper.gains.map((g) => g.toFixed(2)).join(" / ")}`}`,
      ].join("\n")
    : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <section className="rounded-2xl border border-cizgi bg-kagit p-6">
        <label className="block text-[13px] text-antrasit-70">
          Penceredeki şeyin bilinen aralığı (cm)
          <input
            type="number"
            min={0.2}
            max={7}
            step={0.1}
            value={knownCm}
            onChange={(e) => setKnownCm(Number(e.target.value))}
            className="mt-1 block w-28 rounded-lg border border-cizgi bg-white px-3 py-2 text-[15px] text-antrasit"
          />
        </label>
        <p className="mt-2 text-[12px] leading-snug text-antrasit-50">
          Milimetrik kâğıtta kalın çizgiler 1 cm arayla: 1 yazın. Çizgili ya da ekose kumaşta cetvelle ölçtüğünüz tekrar aralığını yazın (en çok 7 cm; pencerede en az iki tekrar görünmeli).
        </p>
        <label className="mt-4 block text-[13px] text-antrasit-70">
          Kartlı fotoğraf
          <span className="mt-1 flex items-center gap-3">
            <span className="cursor-pointer rounded-full border border-antrasit/30 bg-white px-4 py-2 text-[13px] text-antrasit hover:bg-cizgi/40">Fotoğraf seç</span>
            <span className="truncate text-[12px] text-antrasit-50">{file ? file.name : "seçilmedi"}</span>
          </span>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="sr-only" aria-label="Kartlı fotoğraf" />
        </label>
        {busy && <p className="mt-3 text-[13px] text-antrasit-50">Ölçülüyor…</p>}
        {error && <p className="mt-3 rounded-xl bg-[#F4E9DD] px-3 py-2 text-[13px] text-ceviz">{error}</p>}
      </section>

      {result && (
        <section className="rounded-2xl border border-cizgi bg-kagit p-6" data-testid="kart-deneme-sonuc">
          <h2 className="font-display text-[22px]">Sonuç</h2>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[14px]">
            {(["x", "y"] as const).map((axis) => {
              const v = result.scale[axis];
              const err = v === null ? null : v / knownCm - 1;
              return (
                <div key={axis} className="contents">
                  <dt className="text-antrasit-70">{axis === "x" ? "Yatay ölçek" : "Dikey ölçek"}</dt>
                  <dd>
                    {v === null || err === null ? (
                      <span className="text-antrasit-50">ölçülemedi (bu yönde tekrar yok ya da belirgin değil)</span>
                    ) : (
                      <>
                        {cm(v)} cm <span className={Math.abs(err) < 0.02 ? "text-[#2f5a2a]" : "text-[#9a3b31]"}>({pct(err)}{Math.abs(err) < 0.02 ? ", hedefin içinde" : ", hedef %2"})</span>
                      </>
                    )}
                  </dd>
                </div>
              );
            })}
            <dt className="text-antrasit-70">Çözünürlük</dt>
            <dd>
              {Math.round(result.pxPerCm)} px/cm{result.pxPerCm < 40 && <span className="text-[#9a3b31]"> · düşük, biraz daha yakından çekin</span>}
            </dd>
            <dt className="text-antrasit-70">Eğiklik</dt>
            <dd>
              {result.tilt.toFixed(2).replace(".", ",")}
              {result.tilt > 1.15 ? <span className="text-antrasit-50"> · açılı çekilmiş; düzeltildi, ama tepeden çekim daha keskin olur</span> : <span className="text-antrasit-50"> · tepeye yakın</span>}
            </dd>
            <dt className="text-antrasit-70">Kâğıdın rengi</dt>
            <dd>
              <span className="mr-2 inline-block h-3.5 w-3.5 rounded-sm border border-cizgi align-[-2px]" style={{ background: `rgb(${result.paper.rgb.join(",")})` }} />
              {result.paper.clipped ? "patlamış; renk düzeltilmedi, biraz daha karanlık çekin" : `RGB ${result.paper.rgb.join(", ")}; beyaza çekildi`}
            </dd>
          </dl>
          <div className="mt-5 flex flex-wrap items-start gap-4">
            <figure>
              <canvas ref={photoCanvas} className="max-w-full rounded-lg border border-cizgi" />
              <figcaption className="mt-1 text-[12px] text-antrasit-50">Bulunan işaretler</figcaption>
            </figure>
            <figure>
              <canvas ref={flatCanvas} className="max-w-full rounded-lg border border-cizgi" />
              <figcaption className="mt-1 text-[12px] text-antrasit-50">Düzeltilmiş pencere</figcaption>
            </figure>
          </div>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(summary);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                /* clipboard blocked: the text is shown below to copy by hand */
              }
            }}
            className="mt-5 rounded-full bg-antrasit px-4 py-2 text-[13px] text-kagit"
          >
            {copied ? "Kopyalandı" : "Sonucu kopyala"}
          </button>
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-cizgi/40 p-3 text-[12px] text-antrasit-70">{summary}</pre>
        </section>
      )}
    </div>
  );
}
