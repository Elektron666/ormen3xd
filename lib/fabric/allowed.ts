import type { Fabric, FurnitureModel } from "@/lib/types";

// Which ORMEN fabrics are offered where. A firm can limit its page to some
// series, and a model can be limited to some series (e.g. a sofa offered only
// in bouclé). An empty list means "all". The two limits combine.

/** Distinct series of a fabric list, in catalogue order. */
export function seriesOf(fabrics: Fabric[]): string[] {
  return [...new Set(fabrics.map((f) => f.series))];
}

export function filterBySeries(fabrics: Fabric[], series: string[] | undefined): Fabric[] {
  if (!series?.length) return fabrics;
  const set = new Set(series);
  return fabrics.filter((f) => set.has(f.series));
}

/** Fabrics offered on a model (within the page's own list). Never empty when the page has fabrics. */
export function fabricsForModel(pageFabrics: Fabric[], model: Pick<FurnitureModel, "fabricSeries">): Fabric[] {
  const list = filterBySeries(pageFabrics, model.fabricSeries);
  // a limit that matches nothing (series hidden or renamed) falls back to the page's list
  return list.length ? list : pageFabrics;
}

/** The fabric a newly added piece starts in: the current one if allowed, else the model's default, else the first allowed. */
export function startFabric(allowed: Fabric[], current: string, model: Pick<FurnitureModel, "defaultFabricCode">): Fabric {
  return allowed.find((f) => f.code === current) ?? allowed.find((f) => f.code === model.defaultFabricCode) ?? allowed[0];
}

/** Keeps only names that exist in the catalogue (panel input). */
export function cleanSeries(input: unknown, known: string[]): string[] {
  if (!Array.isArray(input)) return [];
  const set = new Set(known);
  return [...new Set(input.filter((s): s is string => typeof s === "string" && set.has(s)))];
}
