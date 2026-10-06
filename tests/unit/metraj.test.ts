import { describe, expect, it } from "vitest";
import { estimate, formatMetres, meterageByFabric, validateMeterage } from "@/lib/metraj";
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
