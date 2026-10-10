import { describe, expect, it } from "vitest";
import { ZONED_REASON, estimate, formatMetres, meterageByFabric, validateMeterage } from "@/lib/metraj";
import type { Fabric } from "@/lib/types";

const plain = { widthCm: 140, pattern: "duz", cutDirection: "cift" } as const;
const model = { name: "Üçlü", meterage: { metres: 8, refWidthCm: 140 } };
const fabric = (code: string, over: Partial<Fabric> = {}) => ({ code, ...plain, ...over }) as Fabric;

describe("estimate", () => {
  it("repeats the firm's own figure only for the same plain, two-way fabric", () => {
    expect(estimate(model, plain)).toEqual({ kind: "metre", metres: 8 });
  });

  it("gives no number, only the reason, in every other case", () => {
    const why = (f: Partial<Fabric>, m: { meterage?: { metres: number; refWidthCm: number } } = model) => {
      const e = estimate(m, { ...plain, ...f });
      return e.kind === "usta" ? e.reason : "SAYI";
    };
    expect(why({}, {})).toMatch(/metrajı girilmemiş/);
    expect(why({ widthCm: undefined })).toMatch(/eni bilinmiyor/);
    expect(why({ widthCm: 280 })).toMatch(/280 cm.*140 cm/);
    expect(why({ pattern: undefined })).toMatch(/desen bilgisi/);
    expect(why({ pattern: "desenli" })).toMatch(/Desenli/);
    expect(why({ cutDirection: undefined })).toMatch(/kesim yönü/);
    expect(why({ cutDirection: "tek" })).toMatch(/Tek yönlü/);
  });
});

describe("meterageByFabric", () => {
  it("adds up a fabric only when every piece in it has a figure", () => {
    const berjer = { name: "Berjer", meterage: { metres: 3.5, refWidthCm: 140 } };
    const r = meterageByFabric([
      { model, fabric: fabric("LUMA-02") },
      { model: berjer, fabric: fabric("LUMA-02") },
      { model, fabric: fabric("VERSO-01", { cutDirection: "tek" }) },
      { model: { name: "Puf" }, fabric: fabric("VERSO-01", { cutDirection: "tek" }) },
    ]);
    expect(r[0]).toMatchObject({ pieces: 2, total: 11.5, reasons: [] });
    expect(r[1].total).toBeNull();
    expect(r[1].reasons).toHaveLength(2);
    expect(formatMetres(11.5)).toBe("11,5 m");
  });
});

describe("validateMeterage", () => {
  it("accepts nothing or a complete, believable figure", () => {
    expect(validateMeterage(null)).toBeNull();
    expect(validateMeterage({ metres: 8, refWidthCm: 140 })).toBeNull();
    expect(validateMeterage({ metres: 0.1, refWidthCm: 140 })).toMatch(/0,5|0.5/);
    expect(validateMeterage({ metres: 8, refWidthCm: 40 })).toMatch(/en/);
  });
});

describe("bölge başına metraj", () => {
  const zoned = { name: "Üçlü", meterage: { metres: 9, refWidthCm: 140, zones: { govde: 4.5, kol: 1.5, oturak: 1.2, sirt: 1.6 } } };

  it("sums the firm's figures for the zones one fabric covers", () => {
    expect(estimate(zoned, plain, ["govde", "kol", "biye"])).toEqual({ kind: "metre", metres: 6 });
    expect(estimate(zoned, plain, ["oturak", "sirt"])).toEqual({ kind: "metre", metres: 2.8 });
    // still only for the same plain, two-way fabric
    expect(estimate(zoned, { ...plain, pattern: "desenli" }, ["oturak"]).kind).toBe("usta");
  });

  it("leaves it to the upholsterer without a split, or for the piping alone", () => {
    expect(estimate(model, plain, ["oturak"])).toMatchObject({ kind: "usta", reason: ZONED_REASON });
    expect(estimate(zoned, plain, ["biye"])).toMatchObject({ kind: "usta", reason: expect.stringMatching(/Biye/) });
  });

  it("gives a total per fabric for a two-tone piece", () => {
    const r = meterageByFabric([
      { model: zoned, fabric: fabric("LUMA-02"), zones: ["govde", "kol", "biye"] },
      { model: zoned, fabric: fabric("SIENA-05"), zones: ["oturak", "sirt"] },
    ]);
    expect(r.map((g) => g.total)).toEqual([6, 2.8]);
  });

  it("rejects figures that do not add up", () => {
    expect(validateMeterage(zoned.meterage)).toBeNull();
    expect(validateMeterage({ metres: 5, refWidthCm: 140, zones: { govde: 4.5, kol: 1.5 } })).toMatch(/toplamı/);
    expect(validateMeterage({ metres: 9, refWidthCm: 140, zones: { govde: 0 } })).toMatch(/Bölge metrajı/);
    expect(validateMeterage({ metres: 9, refWidthCm: 140, zones: { biye: 1 } as never })).toMatch(/Bilinmeyen/);
  });
});
