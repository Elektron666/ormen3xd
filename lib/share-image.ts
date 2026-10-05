"use client";

import type { Fabric, Firm } from "@/lib/types";

// The picture that travels on WhatsApp: the scene as the customer set it up,
// with a strip carrying the firm, the furniture and the ORMEN fabric codes.

export interface SharePiece {
  modelName: string;
  fabric: Fabric;
}

const W = 1600;
const STRIP = 230;
const PAD = 56;

function cssFont(variable: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Distinct fabrics in order, each with the furniture it is on. */
export function groupByFabric(pieces: SharePiece[]): { fabric: Fabric; models: string[] }[] {
  const out: { fabric: Fabric; models: string[] }[] = [];
  for (const p of pieces) {
    const g = out.find((x) => x.fabric.code === p.fabric.code);
    if (g) {
      if (!g.models.includes(p.modelName)) g.models.push(p.modelName);
    } else out.push({ fabric: p.fabric, models: [p.modelName] });
  }
  return out;
}

export async function composeShareImage(snapshotUrl: string, pieces: SharePiece[], firm?: Firm | null): Promise<Blob> {
  const display = cssFont("--font-fraunces", "Georgia, serif");
  const body = cssFont("--font-inter", "system-ui, sans-serif");
  if (typeof document !== "undefined" && "fonts" in document) await document.fonts.ready;

  const shot = await loadImage(snapshotUrl);
  const sceneH = shot ? Math.min(1000, Math.round((shot.height / shot.width) * W)) : 800;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = sceneH + STRIP;
  const ctx = canvas.getContext("2d")!;

  // scene: paper backdrop, then the render (transparent canvas) scaled to width, centred vertically
  const grad = ctx.createRadialGradient(W / 2, sceneH * 0.3, 0, W / 2, sceneH * 0.3, W * 0.8);
  grad.addColorStop(0, "#FCFAF6");
  grad.addColorStop(0.55, "#F1ECE4");
  grad.addColorStop(1, "#E6DFD4");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, sceneH);
  if (shot) {
    const h = (shot.height / shot.width) * W;
    ctx.drawImage(shot, 0, (sceneH - h) / 2, W, h);
  }

  // strip
  ctx.fillStyle = "#FBF9F5";
  ctx.fillRect(0, sceneH, W, STRIP);
  ctx.fillStyle = "#E3DDD2";
  ctx.fillRect(0, sceneH, W, 1);

  const top = sceneH + PAD;
  let x = PAD;
  // brand: firm logo, or the ORMEN wordmark
  const logo = firm?.logoUrl ? await loadImage(firm.logoUrl) : null;
  if (logo) {
    const h = 70;
    const w = Math.min(260, (logo.width / logo.height) * h);
    ctx.drawImage(logo, x, top + 8, w, h);
    x += w + 56;
  } else {
    ctx.fillStyle = "#5C3D2A";
    ctx.font = `500 44px ${display}`;
    ctx.letterSpacing = "12px";
    ctx.fillText(firm ? firm.name : "ORMEN", x, top + 44);
    ctx.letterSpacing = "6px";
    ctx.fillStyle = "#6B6963";
    ctx.font = `400 15px ${body}`;
    ctx.fillText(firm ? "" : "ATELİER", x + 2, top + 72);
    ctx.letterSpacing = "0px";
    x += 300;
  }

  // fabrics: swatch, big code, series · colour, furniture
  const groups = groupByFabric(pieces).slice(0, 3);
  const colW = (W - x - PAD) / Math.max(1, groups.length);
  for (const [i, g] of groups.entries()) {
    const cx = x + i * colW;
    const thumb = await loadImage(g.fabric.texture.thumbUrl);
    const r = 40;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx + r, top + r + 4, r, 0, Math.PI * 2);
    ctx.clip();
    if (thumb) ctx.drawImage(thumb, cx, top + 4, r * 2, r * 2);
    else {
      ctx.fillStyle = g.fabric.texture.avgColor;
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "#2A2A28";
    ctx.font = `400 46px ${display}`;
    ctx.fillText(g.fabric.code, cx + r * 2 + 22, top + 44);
    ctx.fillStyle = "#55544F";
    ctx.font = `400 19px ${body}`;
    ctx.fillText(`${g.fabric.series} · ${g.fabric.colorName}`, cx + r * 2 + 24, top + 74);
    ctx.fillStyle = "#6B6963";
    ctx.font = `400 16px ${body}`;
    ctx.fillText(g.models.join(", "), cx + r * 2 + 24, top + 98);
  }

  ctx.fillStyle = "#6B6963";
  ctx.font = `400 15px ${body}`;
  ctx.fillText("Kumaşlar: ORMEN TEKSTİL", PAD, sceneH + STRIP - 28);
  ctx.textAlign = "right";
  ctx.fillText("Ekran renkleri bağlayıcı değildir; renk onayı numuneyle verilir.", W - PAD, sceneH + STRIP - 28);
  ctx.textAlign = "left";

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Görsel oluşturulamadı"))), "image/jpeg", 0.9),
  );
}
