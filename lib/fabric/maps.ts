// Pure image-map helpers shared by the seed texture generator and the panel's
// "derive normal + roughness from a single photo" step (lib/fabric/process.ts).
// Buffers are tileable and row-major.

/**
 * Tangent-space normal map from a tileable height field (wraps at the edges).
 * `size` is the width; pass `rows` for non-square images.
 */
export function heightToNormal(height: Float32Array, size: number, strength: number, rows = size): Uint8Array {
  const out = new Uint8Array(size * rows * 3);
  const at = (x: number, y: number) =>
    height[((y + rows) % rows) * size + ((x + size) % size)];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < size; x++) {
      // Sobel gradient
      const dx =
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) -
        (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy =
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) -
        (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      let nx = -dx * strength;
      // Image rows go down while texture v goes up (OpenGL convention, flipY).
      let ny = dy * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len; ny /= len; nz /= len;
      const i = (y * size + x) * 3;
      out[i] = Math.round((nx * 0.5 + 0.5) * 255);
      out[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out[i + 2] = Math.round((nz * 0.5 + 0.5) * 255);
    }
  }
  return out;
}

/** Box blur with wrap-around (`size` = width, `rows` = height for non-square images). */
export function blurWrap(src: Float32Array, size: number, radius: number, rows = size): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const span = radius * 2 + 1;
  const m = (v: number, n: number) => ((v % n) + n) % n;
  for (let y = 0; y < rows; y++) {
    let acc = 0;
    for (let k = -radius; k <= radius; k++) acc += src[y * size + m(k, size)];
    for (let x = 0; x < size; x++) {
      tmp[y * size + x] = acc / span;
      acc += src[y * size + m(x + radius + 1, size)] - src[y * size + m(x - radius, size)];
    }
  }
  for (let x = 0; x < size; x++) {
    let acc = 0;
    for (let k = -radius; k <= radius; k++) acc += tmp[m(k, rows) * size + x];
    for (let y = 0; y < rows; y++) {
      out[y * size + x] = acc / span;
      acc += tmp[m(y + radius + 1, rows) * size + x] - tmp[m(y - radius, rows) * size + x];
    }
  }
  return out;
}

export function normalize01(src: Float32Array): Float32Array {
  let min = Infinity, max = -Infinity;
  for (const v of src) { if (v < min) min = v; if (v > max) max = v; }
  const range = max - min || 1;
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = (src[i] - min) / range;
  return out;
}

/** sRGB 0..1 → linear 0..1 */
export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** linear 0..1 → sRGB 0..1 */
export function linearToSrgb(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}
