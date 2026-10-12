// npx tsx scripts/olc-keskinlik.ts
// Ar-Ge (gece toplantısı, 12 Oct): the sharpness ratio (lib/fabric/sharpness.ts) on the
// real MISSO photos as they are and blurred on purpose, to set the "blurred" threshold.
import { createRequire } from "node:module";
import path from "node:path";
import { sharpnessRatio } from "../lib/fabric/sharpness";
const require = createRequire(import.meta.url);
const sharp = require("sharp");

async function ratio(file: string, sigma: number) {
  let img = sharp(file).ensureAlpha();
  if (sigma > 0) img = img.blur(sigma);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  return sharpnessRatio({ data: new Uint8ClampedArray(data), width: info.width, height: info.height });
}

async function main() {
  const sigmas = [0, 1, 1.5, 2, 3];
  console.log(`kumaş            ${sigmas.map((s) => (s ? `bulanık σ=${s}` : "olduğu gibi").padStart(13)).join("")}`);
  for (const dir of ["misso", "luma", "pietra", "siena", "verso"])
    for (let i = 1; i <= 6; i++) {
      const file = path.join("public/seed/fabrics", dir, `${dir}-0${i}-albedo-2k.webp`);
      try {
        const r = await Promise.all(sigmas.map((s) => ratio(file, s)));
        console.log(`${dir}-0${i}`.padEnd(17) + r.map((v) => v.toFixed(3).padStart(13)).join(""));
      } catch {
        /* not every series has six */
      }
    }
}
main();
