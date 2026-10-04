import { describe, expect, it } from "vitest";
import { decodeShare, encodeShare } from "@/lib/share";

describe("share links", () => {
  it("round-trips layout, room and view in a URL-safe id", () => {
    const state = { y: "moduler-kanepe.LUMA-02.0.51.0_berjer.SIENA-03.40.240.45", oda: "l.600x500x280.adacayi.traverten", g: "plan" };
    const id = encodeShare(state);
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeShare(id)).toEqual(state);
  });

  it("handles Turkish characters safely", () => {
    const id = encodeShare({ y: "kanepe.ŞÖNİL-01.0.0.0" });
    expect(decodeShare(id)?.y).toBe("kanepe.ŞÖNİL-01.0.0.0");
  });

  it("rejects ids that are not ours", () => {
    expect(decodeShare("../../etc/passwd")).toBeNull();
    expect(decodeShare("abc")).toBeNull();
    expect(decodeShare(encodeShare({ oda: "koyu-salon" }))).toBeNull(); // no layout
  });
});
