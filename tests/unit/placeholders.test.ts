import { describe, expect, it } from "vitest";
import { buildSeedFabrics } from "@/lib/seed/fabrics";
import { placeholderHidePlan } from "@/lib/fabric/placeholders";
import type { Firm } from "@/lib/types";

const seed = buildSeedFabrics();
const firm = (name: string, fabricSeries: string[] = [], isActive = true): Firm => ({ id: name, name, slug: name, accentColor: "#000000", fabricSeries, isActive });
// LUMA becomes real: photographed and uploaded
const withRealLuma = seed.map((f) => (f.series === "LUMA" ? { ...f, isPlaceholder: false } : f));

describe("yer tutucuları toplu gizleme", () => {
  it("örnek katalog yalnızken hiçbir şey gizlenmez: site kumaşsız kalırdı", () => {
    expect(seed.every((f) => f.isPlaceholder)).toBe(true);
    const plan = placeholderHidePlan(seed, []);
    expect(plan.ok).toBe(false);
  });

  it("gerçek kumaş varken yalnızca yayındaki yer tutucular gizlenir", () => {
    const plan = placeholderHidePlan(withRealLuma, [firm("Atlas")]);
    expect(plan.ok && plan.ids.length).toBe(seed.filter((f) => f.series !== "LUMA").length);
  });

  it("serisi yalnızca yer tutucu olan bir firma varsa reddeder ve firmayı söyler", () => {
    const plan = placeholderHidePlan(withRealLuma, [firm("Atlas", ["LUMA"]), firm("Kayseri Mobilya", ["SIENA"]), firm("Kapalı", ["PIETRA"], false)]);
    expect(plan.ok).toBe(false);
    if (!plan.ok) {
      expect(plan.error).toContain("Kayseri Mobilya");
      expect(plan.error).not.toContain("Atlas");
      expect(plan.error).not.toContain("Kapalı");
    }
  });

  it("gizlenecek yer tutucu yoksa söyler", () => {
    const real = seed.map((f) => ({ ...f, isPlaceholder: false }));
    expect(placeholderHidePlan(real, []).ok).toBe(false);
  });
});
