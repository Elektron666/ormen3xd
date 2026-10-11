// "Geri bildirim gönder" (Fatih Bey, 11 Oct). A visitor tells ORMEN what
// worked or did not. Nothing personal is asked or kept: no name, phone, IP
// or user agent; only the kind, the text, the page and a coarse device class.

import { DEVICES, type Device } from "@/lib/events";

export const FEEDBACK_KINDS = ["begendim", "oneri", "hata", "diger"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const FEEDBACK_LABELS: Record<FeedbackKind, string> = { begendim: "Beğendim", oneri: "Önerim var", hata: "Bir şey çalışmadı", diger: "Diğer" };

export const FEEDBACK_LIMITS = { min: 3, max: 1000 } as const;

export interface FeedbackInput {
  kind: FeedbackKind;
  message: string;
  /** Path of the page it was sent from, without the query (no layout or share ids). */
  page: string | null;
  firmSlug: string | null;
  device?: Device;
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
  return {
    ok: true,
    value: {
      kind: r.kind as FeedbackKind,
      message,
      page,
      firmSlug: typeof r.firmSlug === "string" && SLUG.test(r.firmSlug) ? r.firmSlug : null,
      device: DEVICES.includes(r.device as Device) ? (r.device as Device) : undefined,
    },
  };
}

/** A phone number or e-mail in the text: shown to the visitor as a reminder, never blocked. */
export function looksPersonal(text: string): boolean {
  return /[\w.+-]+@[\w-]+\.[\w.]+/.test(text) || /(?:\+?90|0)?\s*5\d{2}[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}/.test(text);
}
