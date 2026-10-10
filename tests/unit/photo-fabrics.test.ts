import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { buildPhotoFabrics } from "@/lib/seed/photo-fabrics";

describe("fotoğraftan hazırlanan kumaşlar (MISSO)", () => {
  const fabrics = buildPhotoFabrics();

  it("her görsel sitede var", () => {
    expect(fabrics.map((f) => f.code)).toEqual(["MISSO-01", "MISSO-02", "MISSO-03", "MISSO-04", "MISSO-05", "MISSO-06"]);
    for (const f of fabrics) {
      const m = f.texture.maps;
      for (const url of [m.albedo["1k"], m.albedo["2k"], m.normal!["1k"], m.normal!["2k"], m.roughness!["1k"], m.roughness!["2k"], f.texture.thumbUrl])
        expect(existsSync(path.join(process.cwd(), "public", url)), url).toBe(true);
    }
  });

  it("gerçek fotoğraf; bilinmeyen teknik değerler boş", () => {
    for (const f of fabrics) {
      expect(f.isPlaceholder).toBe(false);
      expect(f.pattern).toBe("desenli");
      expect(f.widthCm).toBeUndefined();
      expect(f.cutDirection).toBeUndefined();
      expect(f.patternRepeatCm).toBeUndefined();
      // a tile holds a few zigzag teeth: somewhere between a hand and an arm's width
      expect(f.texture.repeatCm.w).toBeGreaterThan(10);
      expect(f.texture.repeatCm.w).toBeLessThan(130);
    }
  });
});

describe("Chester vitrin modelleri", () => {
  it("geçerli tarif, kıvrık kol ve kapitone; kumaşları katalogda var", async () => {
    const { SHOWCASE_MODELS } = await import("@/lib/seed/showcase-models");
    const { validateParams, normaliseParams } = await import("@/lib/parametric/spec");
    const { buildSeedFabrics } = await import("@/lib/seed/fabrics");
    const codes = new Set([...buildPhotoFabrics(), ...buildSeedFabrics()].map((f) => f.code));
    expect(new Set(SHOWCASE_MODELS.map((m) => m.slug)).size).toBe(SHOWCASE_MODELS.length);
    for (const m of SHOWCASE_MODELS) {
      if (m.source.kind !== "parametric") throw new Error(m.slug);
      expect(validateParams(m.source.params), m.slug).toEqual({});
      expect(normaliseParams(m.source.params)).toEqual(m.source.params);
      expect(codes.has(m.defaultFabricCode!)).toBe(true);
    }
    for (const m of SHOWCASE_MODELS.slice(0, 2)) expect(m.source).toMatchObject({ params: { kol: "kivrik", sirtTipi: "kapitone" } });
    expect(SHOWCASE_MODELS[1].source).toMatchObject({ params: { kulak: true } });
  });
});
