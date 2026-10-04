import { describe, expect, it } from "vitest";
import { buildSeedFabrics } from "@/lib/seed/fabrics";
import { cleanSeries, fabricsForModel, filterBySeries, seriesOf, startFabric } from "@/lib/fabric/allowed";

const fabrics = buildSeedFabrics();

describe("fabric limits", () => {
  it("lists series in catalogue order", () => {
    expect(seriesOf(fabrics)).toEqual(["LUMA", "SIENA", "PIETRA", "VERSO"]);
  });
  it("empty limit = all; a limit keeps only those series", () => {
    expect(filterBySeries(fabrics, [])).toHaveLength(fabrics.length);
    expect(new Set(filterBySeries(fabrics, ["SIENA"]).map((f) => f.series))).toEqual(new Set(["SIENA"]));
  });
  it("a model limit that matches nothing on the page falls back to the page list", () => {
    const page = filterBySeries(fabrics, ["LUMA"]);
    expect(fabricsForModel(page, { fabricSeries: ["SIENA"] })).toBe(page);
    expect(fabricsForModel(fabrics, { fabricSeries: ["PIETRA"] }).every((f) => f.series === "PIETRA")).toBe(true);
  });
  it("a new piece keeps the current fabric when allowed, else the model's default, else the first", () => {
    const siena = filterBySeries(fabrics, ["SIENA"]);
    expect(startFabric(siena, "SIENA-02", {}).code).toBe("SIENA-02");
    expect(startFabric(siena, "LUMA-02", { defaultFabricCode: "SIENA-04" }).code).toBe("SIENA-04");
    expect(startFabric(siena, "LUMA-02", { defaultFabricCode: "LUMA-01" }).code).toBe("SIENA-01");
  });
  it("cleans panel input to known series", () => {
    expect(cleanSeries(["SIENA", "UYDURMA", "SIENA", 3], seriesOf(fabrics))).toEqual(["SIENA"]);
    expect(cleanSeries("SIENA", seriesOf(fabrics))).toEqual([]);
  });
});
