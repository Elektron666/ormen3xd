import { describe, expect, it } from "vitest";
import { CARD_MM, pxPerCmFromCard } from "@/lib/screen-scale";

describe("ekranı banka kartıyla ayarlama", () => {
  it("kart ID-1 boyunda (85,60 × 53,98 mm)", () => {
    expect(CARD_MM).toEqual({ w: 85.6, h: 53.98 });
  });
  it("kartla aynı boydaki çerçeveden santimetre başına piksel", () => {
    expect(pxPerCmFromCard(342.4)).toBeCloseTo(40, 6);
  });
});
