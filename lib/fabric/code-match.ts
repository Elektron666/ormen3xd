// "Elimdeki kartela" (5 Oct meeting, D3): the salesperson types the code on
// the swatch card in their hand and the fabric goes onto the sofa. Codes are
// matched ignoring case, Turkish letters, spaces and dashes, so "siena04",
// "SİENA 04" and "SIENA-04" are the same fabric.

import type { Fabric } from "@/lib/types";
import { foldTr } from "@/lib/i18n/tr";

const key = (s: string) => foldTr(s).replace(/[^a-z0-9]/g, "");

export function matchCode(fabrics: Fabric[], query: string, limit = 6): { exact: Fabric | null; list: Fabric[] } {
  const q = key(query);
  if (!q) return { exact: null, list: [] };
  const exact = fabrics.find((f) => key(f.code) === q) ?? null;
  // codes that start with what was typed first, then codes that contain it
  // (a card often shows only "04" big and the series small)
  const starts = fabrics.filter((f) => key(f.code).startsWith(q));
  const contains = fabrics.filter((f) => !starts.includes(f) && key(f.code).includes(q));
  return { exact, list: [...starts, ...contains].slice(0, limit) };
}
