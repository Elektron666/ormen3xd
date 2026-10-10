import type { Fabric, FurnitureModel } from "@/lib/types";
import { decodeLayout } from "@/lib/room/layout";
import { decodeShare } from "@/lib/share";
import { pieceCodes } from "@/lib/three/zones";

export interface ShareSummary {
  pieces: { model: FurnitureModel; fabric: Fabric }[];
  /** Distinct fabrics in order of appearance. */
  fabrics: Fabric[];
}

/** What a share link contains, resolved against the catalogue (unknown pieces are dropped). */
export function summariseShare(id: string, models: FurnitureModel[], fabrics: Fabric[]): ShareSummary | null {
  const state = decodeShare(id);
  const layout = decodeLayout(state?.y);
  if (!layout) return null;
  const bySlug = new Map(models.map((m) => [m.slug, m]));
  const byCode = new Map(fabrics.map((f) => [f.code, f]));
  const pieces = layout.flatMap((p) => {
    const model = bySlug.get(p.modelSlug);
    const fabric = byCode.get(p.fabricCode);
    return model && fabric ? [{ model, fabric }] : [];
  });
  if (pieces.length === 0) return null;
  const seen = new Set<string>();
  // zone fabrics (arms, cushions…) are part of the combination too
  const all = layout.flatMap((p) => (bySlug.has(p.modelSlug) ? pieceCodes(p) : [])).flatMap((c) => byCode.get(c) ?? []);
  const distinct = all.filter((f) => (seen.has(f.code) ? false : (seen.add(f.code), true)));
  return { pieces, fabrics: distinct };
}
