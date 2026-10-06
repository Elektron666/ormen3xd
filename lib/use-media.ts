"use client";

import { useSyncExternalStore } from "react";

/** Whether a media query matches; false on the server and before hydration. */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (on) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", on);
      return () => m.removeEventListener("change", on);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
