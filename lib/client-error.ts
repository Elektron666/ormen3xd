// Errors in visitors' browsers (gece toplantısı, 12 Oct): during the pilot ORMEN
// should know when the site breaks on a phone, without collecting anything about the
// person. Only what went wrong and where in the code; written to the server log
// (Vercel keeps it for a short time), nowhere else.

import { DEVICES, type Device } from "./events";

export const ERROR_KINDS = ["hata", "soz", "3b-baglam"] as const;
export type ErrorKind = (typeof ERROR_KINDS)[number];

export interface ClientError {
  kind: ErrorKind;
  message: string;
  /** Up to 3 frames, file:line:column only. */
  stack: string[];
  /** Path of the page, without the query (it can hold a shared layout, never a person, but kept short). */
  path: string;
  device: Device;
}

const MAX_MESSAGE = 300;

/** Removes what could be personal: e-mail addresses, long digit runs (phones), query strings. */
export function scrub(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[e-posta]")
    .replace(/\+?\d[\d\s-]{7,}\d/g, "[numara]")
    .replace(/(https?:\/\/[^\s?#]+)[?#][^\s)]*/g, "$1")
    .slice(0, MAX_MESSAGE);
}

/** A stack trace down to file:line:column of its first frames. */
export function shortStack(stack: unknown): string[] {
  if (typeof stack !== "string") return [];
  return stack
    .split("\n")
    // the site's own origin and any query are dropped: only the file inside the bundle counts
    .map((l) => l.replace(/https?:\/\/[^/\s]+/g, "").replace(/\?[^:\s)]*/g, "").match(/(\/[^\s():]+:\d+:\d+)/)?.[1])
    .filter((f): f is string => !!f)
    .slice(0, 3);
}

export function parseClientError(raw: unknown): ClientError | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!ERROR_KINDS.includes(r.kind as ErrorKind)) return null;
  if (typeof r.message !== "string" || !r.message.trim()) return null;
  if (!DEVICES.includes(r.device as Device)) return null;
  const path = typeof r.path === "string" && r.path.startsWith("/") ? r.path.split(/[?#]/)[0].slice(0, 120) : "/";
  return {
    kind: r.kind as ErrorKind,
    message: scrub(r.message),
    stack: Array.isArray(r.stack) ? r.stack.filter((s): s is string => typeof s === "string").map((s) => scrub(s).slice(0, 160)).slice(0, 3) : [],
    path,
    device: r.device as Device,
  };
}
