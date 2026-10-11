// npx tsx scripts/olc-dikis.ts
// Ar-Ge (ARGE.md): brightness step across each MISSO tile's seams.
// Mean luminance of the top and bottom 3% rows (vertical seam) and of the
// left and right 3% columns (horizontal seam), in 0–255 steps.
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire(import.meta.url);
const sharp = require("sharp");

async function main() {
  for (let i = 1; i <= 6; i++) {
    const file = path.join("public/seed/fabrics/misso", `misso-0${i}-albedo-1k.webp`);
    const { data, info } = await sharp(file).greyscale().raw().toBuffer({ resolveWithObject: true });
    const { width: w, height: h } = info;
    const band = (x0: number, x1: number, y0: number, y1: number) => {
      let s = 0, n = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { s += data[y * w + x]; n++; }
      return s / n;
    };
    const bh = Math.max(2, Math.round(h * 0.03)), bw = Math.max(2, Math.round(w * 0.03));
    const top = band(0, w, 0, bh), bottom = band(0, w, h - bh, h);
    const left = band(0, bw, 0, h), right = band(w - bw, w, 0, h);
    // the trend through all rows' means (stripes of the pattern average out): change from top to bottom
    const rows = Array.from({ length: h }, (_, y) => band(0, w, y, y + 1));
    const my = (h - 1) / 2, mr = rows.reduce((a, b) => a + b, 0) / h;
    let num = 0, den = 0;
    rows.forEach((r, y) => { num += (y - my) * (r - mr); den += (y - my) ** 2; });
    const drift = (num / den) * (h - 1);
    console.log(`MISSO-0${i}  yukarıdan aşağı eğilim: ${drift.toFixed(1)}`);
    console.log(`MISSO-0${i}  ${w}x${h}  üst/alt: ${top.toFixed(1)} / ${bottom.toFixed(1)} (fark ${(top - bottom).toFixed(1)})   sol/sağ: ${left.toFixed(1)} / ${right.toFixed(1)} (fark ${(left - right).toFixed(1)})`);
  }
}
main();
