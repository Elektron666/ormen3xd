import type { TextureSize } from "@/lib/types";

// Kept apart from fabric-material.ts so the page can ask without loading three.js.

/** 2K textures on a desktop with a mouse, 1K elsewhere. */
export function preferredTextureSize(): TextureSize {
  if (typeof window === "undefined") return "1k";
  const desktop = window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
  return desktop ? "2k" : "1k";
}
