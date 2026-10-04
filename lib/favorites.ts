"use client";

import { useCallback, useSyncExternalStore } from "react";

// "Beğendiklerim": a short list of fabric codes kept for the browser session
// (sessionStorage). No account, nothing sent to the server.

const KEY = "ormen:begendiklerim";
const MAX = 24;
const EMPTY: string[] = [];
let cache: string[] | null = null;
const listeners = new Set<() => void>();

function read(): string[] {
  if (cache) return cache;
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: string[]) {
  cache = next;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: keep the list in memory for this page */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFavorites() {
  const codes = useSyncExternalStore(subscribe, read, () => EMPTY);
  const toggle = useCallback((code: string) => {
    const current = read();
    write(current.includes(code) ? current.filter((c) => c !== code) : [code, ...current].slice(0, MAX));
  }, []);
  return { codes, toggle, has: (code: string) => codes.includes(code) };
}
