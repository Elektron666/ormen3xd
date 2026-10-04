// Sample requests: validation shared by the form and the API route.
// The only personal data the product keeps is the name and phone here.

export interface SampleRequestInput {
  name: string;
  phone: string;
  note?: string;
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

export type SampleErrors = Partial<Record<"name" | "phone" | "consent" | "fabricCodes" | "note", string>>;

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

export function validateSample(input: Partial<SampleRequestInput>): { ok: true; value: SampleRequestInput } | { ok: false; errors: SampleErrors } {
  const errors: SampleErrors = {};
  const name = (input.name ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2) errors.name = "Adınızı yazın.";
  else if (name.length > 80) errors.name = "Ad çok uzun.";
  const phone = normalisePhone(input.phone ?? "");
  if (!phone) errors.phone = "Geçerli bir telefon numarası yazın (ör. 0532 123 45 67).";
  const note = (input.note ?? "").trim();
  if (note.length > 500) errors.note = "Not en fazla 500 karakter olabilir.";
  if (input.consent !== true) errors.consent = "Devam etmek için aydınlatma metnini onaylayın.";
  const codes = [...new Set((input.fabricCodes ?? []).map((c) => String(c).trim().toLocaleUpperCase("tr-TR")).filter(Boolean))];
  if (codes.length === 0) errors.fabricCodes = "En az bir kumaş seçin.";
  if (codes.length > 10 || codes.some((c) => !/^[A-ZÇĞİÖŞÜ0-9-]{2,24}$/.test(c))) errors.fabricCodes = "Kumaş kodu geçersiz.";
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      phone: phone!,
      note: note || undefined,
      consent: true,
      fabricCodes: codes,
      firmSlug: input.firmSlug ?? null,
      modelSlugs: (input.modelSlugs ?? []).slice(0, 12),
      link: typeof input.link === "string" && input.link.length < 2000 ? input.link : undefined,
    },
  };
}

/** Ready-made WhatsApp text for the firm (or ORMEN). */
export function sampleWhatsappText(v: Pick<SampleRequestInput, "name" | "phone" | "fabricCodes" | "note" | "link">): string {
  const lines = [
    "Merhaba, ORMEN Atelier üzerinden numune talebim:",
    `Kumaş: ${v.fabricCodes.join(", ")}`,
    `Ad: ${v.name}`,
    `Telefon: ${v.phone}`,
  ];
  if (v.note) lines.push(`Not: ${v.note}`);
  if (v.link) lines.push(`Kombinasyon: ${v.link}`);
  return lines.join("\n");
}

export function whatsappUrl(number: string | null | undefined, text: string): string {
  const n = (number ?? "").replace(/\D/g, "");
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
