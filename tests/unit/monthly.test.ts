import { describe, expect, it } from "vitest";
import { monthRange, recentMonths } from "@/lib/monthly";

describe("monthly summary", () => {
  it("gives Istanbul month bounds", () => {
    const r = monthRange("2026-10")!;
    expect(r.from.toISOString()).toBe("2026-09-30T21:00:00.000Z");
    expect(r.to.toISOString()).toBe("2026-10-31T20:59:59.999Z");
    expect(r.label).toBe("Ekim 2026");
    expect(monthRange("2026-13")).toBeNull();
    expect(monthRange("ekim")).toBeNull();
  });
  it("lists recent months, crossing the year", () => {
    expect(recentMonths(3, new Date("2027-01-10T12:00:00Z"))).toEqual(["2027-01", "2026-12", "2026-11"]);
    // 31 Dec 22:30 UTC is already January in Istanbul
    expect(recentMonths(1, new Date("2026-12-31T22:30:00Z"))).toEqual(["2027-01"]);
  });
});
