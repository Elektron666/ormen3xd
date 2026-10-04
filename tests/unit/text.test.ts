import { describe, expect, it } from "vitest";
import { foldTr, trUpper } from "@/lib/i18n/tr";
import { filterFabrics } from "@/components/configurator/FabricPicker";
import { buildSeedFabrics } from "@/lib/seed/fabrics";

describe("Turkish text helpers", () => {
  it("upper-cases with Turkish rules", () => {
    expect(trUpper("istanbul ılık")).toBe("İSTANBUL ILIK");
  });

  it("folds for search regardless of dotted/dotless i and diacritics", () => {
    expect(foldTr("SİENA")).toBe("siena");
    expect(foldTr("SIENA")).toBe("siena");
    expect(foldTr("Şönil Çağla Üzüm Göl")).toBe("sonil cagla uzum gol");
  });
});

describe("fabric filter", () => {
  const fabrics = buildSeedFabrics();

  it("finds by code, series or colour name in any case", () => {
    expect(filterFabrics(fabrics, "siena-04", null, null).map((f) => f.code)).toEqual(["SIENA-04"]);
    expect(filterFabrics(fabrics, "LACİVERT", null, null).map((f) => f.code)).toEqual(["SIENA-06"]);
    expect(filterFabrics(fabrics, "pietra", null, null)).toHaveLength(6);
  });

  it("combines type and colour family filters", () => {
    const r = filterFabrics(fabrics, "", "dokuma", "gri");
    expect(r.map((f) => f.code).sort()).toEqual(["SIENA-02", "VERSO-02"]);
  });
});

describe("product codes", () => {
  it("upper-cases with a plain I but keeps Turkish capitals", async () => {
    const { codeUpper } = await import("@/lib/i18n/tr");
    expect(codeUpper("siena-04")).toBe("SIENA-04");
    expect(codeUpper("şönil-01")).toBe("ŞÖNIL-01");
    expect(codeUpper("SİENA")).toBe("SİENA"); // typed capitals are kept
  });
});
