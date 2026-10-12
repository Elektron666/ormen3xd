"use client";

import { useEffect } from "react";
import { shortStack, type ErrorKind } from "@/lib/client-error";
import { device } from "@/lib/track";

// Sends the browser's uncaught errors to /api/hata (lib/client-error.ts): at most 5 per
// page, each message once. Never throws; an error report must not cause another error.

const sent = new Set<string>();

export function reportClientError(kind: ErrorKind, message: string, stack?: unknown) {
  try {
    const key = `${kind}:${message}`;
    if (sent.has(key) || sent.size >= 5) return;
    sent.add(key);
    const body = JSON.stringify({ kind, message: message.slice(0, 500), stack: shortStack(stack), path: location.pathname, device: device() });
    if (!navigator.sendBeacon?.("/api/hata", new Blob([body], { type: "application/json" }))) {
      void fetch("/api/hata", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => undefined);
    }
  } catch {
    /* reporting must never break the page */
  }
}

export function ErrorReporter() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      // a script from another origin reports only "Script error.": nothing to learn from it
      if (!e.message || e.message === "Script error.") return;
      reportClientError("hata", e.message, e.error?.stack);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason as { message?: string; stack?: string } | undefined;
      reportClientError("soz", typeof r?.message === "string" ? r.message : String(e.reason), r?.stack);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
