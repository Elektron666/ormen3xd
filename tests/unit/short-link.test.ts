import { describe, expect, it } from "vitest";
import { SHORT_CODE, shortCode } from "@/lib/short-link";
import { encodeShare } from "@/lib/share";

describe("short share links", () => {
  it("are stable, 8 characters, and differ per combination", () => {
    const a = encodeShare({ y: "berjer.LUMA-02.0.40.0" });
    const b = encodeShare({ y: "berjer.LUMA-03.0.40.0" });
    expect(shortCode(a)).toBe(shortCode(a));
    expect(shortCode(a)).toMatch(SHORT_CODE);
    expect(shortCode(a)).toHaveLength(8);
    expect(shortCode(a)).not.toBe(shortCode(b));
    expect(shortCode(a, 10)).toHaveLength(10);
  });
});
