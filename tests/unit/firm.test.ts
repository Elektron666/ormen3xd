import { describe, expect, it } from "vitest";
import { contrast, inkFor, validateFirm } from "@/lib/firm";
import { decodeShare, encodeShare } from "@/lib/share";

describe("firm colours", () => {
  it("contrast matches WCAG reference values", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
    expect(contrast("#777777", "#FFFFFF")).toBeCloseTo(4.48, 1);
  });
  it("picks a readable text colour on the firm colour", () => {
    expect(inkFor("#1F4E4A")).toBe("#FFFFFF");
    expect(inkFor("#F2D16B")).toBe("#2A2A28");
  });
});

describe("firm form", () => {
  it("normalises and validates", () => {
    const r = validateFirm({ name: "  Örnek   Mobilya ", slug: "ornek-mobilya", accentColor: "#1f4e4a", whatsapp: "0532 123 45 67" });
    expect(r).toEqual({ ok: true, value: { name: "Örnek Mobilya", slug: "ornek-mobilya", accentColor: "#1F4E4A", whatsapp: "+905321234567" } });
    const bad = validateFirm({ name: "A", slug: "Örnek Mobilya", accentColor: "red", whatsapp: "12" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(Object.keys(bad.errors).sort()).toEqual(["accentColor", "name", "slug", "whatsapp"]);
  });
});

describe("share links from firm pages", () => {
  it("carry the firm slug", () => {
    const id = encodeShare({ y: "berjer.LUMA-02.0.40.0", f: "ornek-mobilya" });
    expect(decodeShare(id)).toEqual({ y: "berjer.LUMA-02.0.40.0", f: "ornek-mobilya" });
  });
});
