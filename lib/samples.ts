// Sample requests: validation shared by the form and the API route.
// The only personal data the product keeps is the name and phone here.

import { codeUpper } from "@/lib/i18n/tr";

/**
 * Three fixed choices instead of a free-text note (5 Oct meeting): the firm
 * gets what it needs to call back, and nobody can type an address or ID number.
 */
export const SAMPLE_CHOICES = {
  purpose: { label: "Ne için", options: { yeni: "Yeni koltuk", yeniden: "Yeniden döşeme" } },
  scope: { label: "Kaç parça", options: { tek: "Tek parça", takim: "Takım" } },
  timing: { label: "Ne zaman", options: { yakin: "1 ay içinde", arastiriyor: "Araştırıyorum" } },
} as const;
export type SampleChoiceKey = keyof typeof SAMPLE_CHOICES;
export type SampleChoices = { [K in SampleChoiceKey]?: keyof (typeof SAMPLE_CHOICES)[K]["options"] };
export const CHOICE_KEYS = Object.keys(SAMPLE_CHOICES) as SampleChoiceKey[];

/** "Yeni koltuk · Takım · 1 ay içinde" (only the answered ones). */
export function describeChoices(c: SampleChoices): string {
  return CHOICE_KEYS.flatMap((k) => {
    const v = c[k];
    return v ? [(SAMPLE_CHOICES[k].options as Record<string, string>)[v]] : [];
  }).join(" · ");
}

function cleanChoices(raw: unknown): SampleChoices {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const k of CHOICE_KEYS) {
    const v = r[k];
    if (typeof v === "string" && v in SAMPLE_CHOICES[k].options) out[k] = v;
  }
  return out as SampleChoices;
}

export interface SampleRequestInput {
  name: string;
  phone: string;
  choices?: SampleChoices;
  consent: boolean;
  fabricCodes: string[];
  firmSlug?: string | null;
  modelSlugs?: string[];
  /** Share link of the combination, so the firm sees exactly what was chosen. */
  link?: string;
}

export interface SampleRequest extends Omit<SampleRequestInput, "consent"> {
  id: string;
  createdAt: string;
}

export type SampleErrors = Partial<Record<"name" | "phone" | "consent" | "fabricCodes", string>>;

/**
 * Turkish mobile numbers in any common spelling (0532 123 45 67,
 * +90 532 1234567, 5321234567) → "+905321234567". Landlines are accepted too.
 */
export function normalisePhone(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("0090")) d = d.slice(4);
  else if (d.startsWith("90") && d.length === 12) d = d.slice(2);
  else if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  if (!/^[2-5]\d{9}$/.test(d)) return null;
  return `+90${d}`;
}

const SLUG = /^[a-z0-9-]{1,60}$/;

/**
 * Only our own share pages are kept, as a site-relative path. The panel turns
 * it into a link, so anything else (another site, javascript:) is dropped.
 */
export function shareLink(raw: unknown): string | undefined {
  if (typeof raw !== "string" || raw.length > 2000) return undefined;
  try {
    const u = new URL(raw, "https://ornek.invalid");
    if (u.protocol !== "https:" && u.protocol !== "http:") return undefined;
    return /^\/p\/[A-Za-z0-9_-]{1,1800}$/.test(u.pathname) ? u.pathname : undefined;
  } catch {
    return undefined;
  }
}

/** "+905321234567" → "0532 123 45 67" (other shapes are returned as they are). */
export function prettyPhone(p: string): string {
  const m = /^\+90(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(p);
  return m ? `0${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p;
}

export function validateSample(input: Partial<SampleRequestInput>): { ok: true; value: SampleRequestInput } | { ok: false; errors: SampleErrors } {
  const errors: SampleErrors = {};
  const name = (input.name ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2) errors.name = "Adınızı yazın.";
  else if (name.length > 80) errors.name = "Ad çok uzun.";
  const phone = normalisePhone(input.phone ?? "");
  if (!phone) errors.phone = "Geçerli bir telefon numarası yazın (ör. 0532 123 45 67).";
  if (input.consent !== true) errors.consent = "Devam etmek için aydınlatma metnini onaylayın.";
  const codes = [...new Set((input.fabricCodes ?? []).map((c) => codeUpper(String(c).trim())).filter(Boolean))];
  if (codes.length === 0) errors.fabricCodes = "En az bir kumaş seçin.";
  if (codes.length > 10 || codes.some((c) => !/^[A-ZÇĞİÖŞÜ0-9-]{2,24}$/.test(c))) errors.fabricCodes = "Kumaş kodu geçersiz.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      phone: phone!,
      // anything else sent along (an old client's "note") is dropped here
      choices: cleanChoices(input.choices),
      consent: true,
      fabricCodes: codes,
      firmSlug: typeof input.firmSlug === "string" && SLUG.test(input.firmSlug) ? input.firmSlug : null,
      modelSlugs: (input.modelSlugs ?? []).filter((s) => typeof s === "string" && SLUG.test(s)).slice(0, 12),
      link: shareLink(input.link),
    },
  };
}

/** Ready-made WhatsApp text for the firm (or ORMEN). */
export function sampleWhatsappText(v: Pick<SampleRequestInput, "name" | "phone" | "fabricCodes" | "choices" | "link">): string {
  const lines = [
    "Merhaba, ORMEN Atelier üzerinden numune talebim:",
    `Kumaş: ${v.fabricCodes.join(", ")}`,
    `Ad: ${v.name}`,
    `Telefon: ${v.phone}`,
  ];
  const about = describeChoices(v.choices ?? {});
  if (about) lines.push(about);
  if (v.link) lines.push(`Kombinasyon: ${v.link}`);
  return lines.join("\n");
}

export function whatsappUrl(number: string | null | undefined, text: string): string {
  const n = (number ?? "").replace(/\D/g, "");
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
