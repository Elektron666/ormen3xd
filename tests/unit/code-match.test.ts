import { describe, expect, it } from "vitest";
import { matchCode } from "@/lib/fabric/code-match";
import type { Fabric } from "@/lib/types";

const fabrics = ["SIENA-03", "SIENA-04", "LUMA-04", "ŞÖNİL-01"].map((code) => ({ code }) as Fabric);

describe("matchCode", () => {
  it("finds the card's code however it is typed", () => {
    expect(matchCode(fabrics, "siena04").exact?.code).toBe("SIENA-04");
    expect(matchCode(fabrics, "SİENA 04").exact?.code).toBe("SIENA-04");
    expect(matchCode(fabrics, "sonil-01").exact?.code).toBe("ŞÖNİL-01");
  });
  it("suggests while typing: prefix matches first, then the rest", () => {
    expect(matchCode(fabrics, "sie").list.map((f) => f.code)).toEqual(["SIENA-03", "SIENA-04"]);
    expect(matchCode(fabrics, "04").list.map((f) => f.code)).toEqual(["SIENA-04", "LUMA-04"]);
    expect(matchCode(fabrics, "04").exact).toBeNull();
    expect(matchCode(fabrics, " - ")).toEqual({ exact: null, list: [] });
  });
});
