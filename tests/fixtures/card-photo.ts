import { CARD, apply, homography, markerCentresMm, type Point } from "../../lib/fabric/calibration";

// A synthetic photo of fabric with the ORMEN calibration card on it (Ar-Ge A1, ARGE.md),
// taken so that the card's corners land on `quad`. The fabric has stripes 1 cm apart.

function invert3(m: number[]): number[] {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [A, -(b * i - c * h), b * f - c * e, B, a * i - c * g, -(a * f - c * d), C, -(a * h - b * g), a * e - b * d].map((v) => v / det);
}

/** Colour of the scene at a point in card millimetres (the fabric extends past the card). */
function scene(x: number, y: number, dark: boolean): [number, number, number] {
  const onCard = x >= 0 && y >= 0 && x <= CARD.width && y <= CARD.height;
  const w = CARD.window;
  const inWindow = x >= w.x && x <= w.x + w.size && y >= w.y && y <= w.y + w.size;
  if (onCard && !inWindow) {
    for (const [mx, my] of markerCentresMm()) {
      const dx = Math.abs(x - mx), dy = Math.abs(y - my);
      if (dx <= CARD.marker.size / 2 && dy <= CARD.marker.size / 2) return dx <= CARD.marker.hole / 2 && dy <= CARD.marker.hole / 2 ? [245, 245, 240] : [20, 20, 22];
    }
    return [245, 245, 240];
  }
  // stripes every 10 mm across x, a little grain
  const s = 0.5 + 0.5 * Math.cos((2 * Math.PI * x) / 10);
  const grain = 12 * Math.sin(x * 3.7 + y * 5.1);
  const base = dark ? 40 + 40 * s : 120 + 70 * s;
  return [base + grain, base * 0.9 + grain, base * 0.75];
}

export function photo(quad: Point[], dark = false, width = 1400, height = 1100) {
  const cardCorners: Point[] = [[0, 0], [CARD.width, 0], [CARD.width, CARD.height], [0, CARD.height]];
  const H = homography(cardCorners, quad);
  const Hi = invert3(H);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const [mx, my] = apply(Hi, [x + 0.5, y + 0.5]);
      const [r, g, b] = scene(mx, my, dark);
      const o = (y * width + x) * 4;
      data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 255;
    }
  return { px: { data, width, height }, H };
}

