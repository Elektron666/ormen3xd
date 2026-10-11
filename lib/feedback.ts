// "Bize fikir verin" (Fatih Bey, 11 Oct). A visitor tells ORMEN what worked
// or did not. Anonymous by default: only the kind, the text, the page and a
// coarse device class. Someone who wants an answer (usually a furniture firm)
// may leave a firm name, their name and phone, with explicit consent; that is
// the only personal data here, and it is never required. No IP, no user agent.

import { DEVICES, type Device } from "@/lib/events";
import { normalisePhone } from "@/lib/samples";

export const FEEDBACK_KINDS = ["begendim", "oneri", "hata", "diger"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const FEEDBACK_LABELS: Record<FeedbackKind, string> = { begendim: "Beğendim", oneri: "Önerim var", hata: "Bir şey çalışmadı", diger: "Diğer" };

export const FEEDBACK_LIMITS = { min: 3, max: 500 } as const;

/** Left only by someone who wants ORMEN to get back to them. */
export interface FeedbackContact {
  /** The furniture firm they write for, if any. */
  company: string | null;
  name: string;
  /** "+905321234567" */
  phone: string;
}

export interface FeedbackInput {
  kind: FeedbackKind;
  message: string;
  /** Path of the page it was sent from, without the query (no layout or share ids). */
  page: string | null;
  firmSlug: string | null;
  device?: Device;
  contact?: FeedbackContact;
}

export interface Feedback extends FeedbackInput {
  id: string;
  createdAt: string;
}

const SLUG = /^[a-z0-9-]{1,60}$/;

/** Accepts only the known shape; the text is trimmed and stripped of control characters. */
export function parseFeedback(raw: unknown): { ok: true; value: FeedbackInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Geçersiz istek." };
  const r = raw as Record<string, unknown>;
  // the hidden field a person never fills in: a bot did
  if (typeof r.website === "string" && r.website.trim() !== "") return { ok: false, error: "Geçersiz istek." };
  if (!FEEDBACK_KINDS.includes(r.kind as FeedbackKind)) return { ok: false, error: "Bir konu seçin." };
  const message = typeof r.message === "string" ? r.message.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim() : "";
  if (message.length < FEEDBACK_LIMITS.min) return { ok: false, error: "Birkaç kelime yazın." };
  if (message.length > FEEDBACK_LIMITS.max) return { ok: false, error: `En fazla ${FEEDBACK_LIMITS.max} karakter.` };
  const page = typeof r.page === "string" && /^\/[A-Za-z0-9/_-]{0,120}$/.test(r.page) ? r.page : null;
  const contact = parseContact(r.contact);
  if (typeof contact === "string") return { ok: false, error: contact };
  return {
    ok: true,
    value: {
      kind: r.kind as FeedbackKind,
      message,
      page,
      firmSlug: typeof r.firmSlug === "string" && SLUG.test(r.firmSlug) ? r.firmSlug : null,
      device: DEVICES.includes(r.device as Device) ? (r.device as Device) : undefined,
      ...(contact ? { contact } : {}),
    },
  };
}

const oneLine = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max + 1) : "");

/** No contact (all empty) → undefined; a complete one with consent → the contact; anything in between → the error to show. */
export function parseContact(raw: unknown): FeedbackContact | undefined | string {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const company = oneLine(r.company, 80);
  const name = oneLine(r.name, 80);
  const phoneRaw = oneLine(r.phone, 30);
  if (!company && !name && !phoneRaw) return undefined;
  if (name.length < 2) return "Size dönebilmemiz için adınızı yazın.";
  if (name.length > 80 || company.length > 80) return "Ad ya da firma adı çok uzun.";
  const phone = normalisePhone(phoneRaw);
  if (!phone) return "Geçerli bir telefon numarası yazın (ör. 0532 123 45 67).";
  if (r.consent !== true) return "Size dönebilmemiz için onay kutusunu işaretleyin.";
  return { company: company || null, name, phone };
}

/** A phone number or e-mail in the text: shown to the visitor as a reminder, never blocked. */
export function looksPersonal(text: string): boolean {
  return /[\w.+-]+@[\w-]+\.[\w.]+/.test(text) || /(?:\+?90|0)?\s*5\d{2}[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/.test(text);
}
