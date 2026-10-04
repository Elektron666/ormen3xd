import { hexToRgb, srgbToLinear } from "@/lib/fabric/maps";
import { normalisePhone } from "@/lib/samples";

// Firm settings helpers shared by the panel form and the public pages.

/** WCAG relative luminance of an sRGB hex colour (0 = black, 1 = white). */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Text colour to put on top of the firm colour: white or near-black, whichever reads better. */
export function inkFor(accent: string): string {
  return contrast(accent, "#FFFFFF") >= contrast(accent, "#2A2A28") ? "#FFFFFF" : "#2A2A28";
}

export interface FirmFields {
  name: string;
  slug: string;
  accentColor: string;
  whatsapp: string;
}

export type FirmErrors = Partial<Record<keyof FirmFields | "logo", string>>;

export function validateFirm(f: FirmFields): { ok: true; value: { name: string; slug: string; accentColor: string; whatsapp?: string } } | { ok: false; errors: FirmErrors } {
  const errors: FirmErrors = {};
  const name = f.name.trim().replace(/\s+/g, " ");
  if (name.length < 2) errors.name = "Firma adını yazın.";
  else if (name.length > 80) errors.name = "Ad çok uzun.";
  if (!/^[a-z0-9-]{2,60}$/.test(f.slug) || f.slug.startsWith("-") || f.slug.endsWith("-")) errors.slug = "Yalnızca küçük harf, rakam ve tire (2–60 karakter).";
  if (!/^#[0-9A-Fa-f]{6}$/.test(f.accentColor)) errors.accentColor = "Renk #RRGGBB biçiminde olmalı.";
  let whatsapp: string | undefined;
  if (f.whatsapp.trim()) {
    whatsapp = normalisePhone(f.whatsapp) ?? undefined;
    if (!whatsapp) errors.whatsapp = "Geçerli bir numara yazın (ör. 0532 123 45 67).";
  }
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { name, slug: f.slug, accentColor: f.accentColor.toUpperCase(), whatsapp } };
}
