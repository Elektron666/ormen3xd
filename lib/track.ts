"use client";

import type { Device, EventType } from "@/lib/events";
import { detectSource, type VisitSource } from "@/lib/source";

// Fire-and-forget usage events. The visit id is random, lives only in this
// tab (sessionStorage) and identifies no one; it only lets the report count
// visits instead of clicks.

function sessionId(): string {
  try {
    let id = sessionStorage.getItem("ormen_ziyaret");
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "");
      sessionStorage.setItem("ormen_ziyaret", id);
    }
    return id;
  } catch {
    return (memoryId ??= crypto.randomUUID().replace(/-/g, ""));
  }
}
let memoryId: string | undefined;

function device(): Device {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return "tablet";
  if (/Mobi|iPhone|Android/i.test(ua)) return "telefon";
  return "masaustu";
}

// Where this visit came from, read from the address it arrived at (the
// configurator later rewrites the address bar, so it is read once, early) and
// kept for the rest of the visit in this tab.
const arrival: VisitSource | null =
  typeof window === "undefined"
    ? null
    : detectSource({ search: location.search, pathname: location.pathname, referrer: document.referrer, host: location.host });

function visitSource(): VisitSource | null {
  try {
    const saved = sessionStorage.getItem("ormen_kaynak");
    if (saved) return JSON.parse(saved) as VisitSource;
    if (arrival) sessionStorage.setItem("ormen_kaynak", JSON.stringify(arrival));
  } catch {
    // private mode: this page's own arrival is still known
  }
  return arrival;
}

const recent = new Map<string, number>();

export function track(type: EventType, data: { firmSlug?: string | null; modelSlug?: string | null; fabricCode?: string | null } = {}): void {
  // no automated traffic in the report (tests opt in with window.__ormenTrack)
  if (typeof window === "undefined" || (navigator.webdriver && !(window as { __ormenTrack?: boolean }).__ormenTrack)) return;
  // the same thing twice within 2 s counts once (double taps, re-renders)
  const key = `${type}:${data.modelSlug ?? ""}:${data.fabricCode ?? ""}`;
  const now = Date.now();
  if (now - (recent.get(key) ?? 0) < 2000) return;
  recent.set(key, now);
  const from = visitSource();
  const body = JSON.stringify({ type, sessionId: sessionId(), device: device(), source: from?.source, tag: from?.tag, ...data });
  try {
    if (!navigator.sendBeacon?.("/api/olay", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/olay", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => undefined);
    }
  } catch {
    // never let analytics break the page
  }
}
