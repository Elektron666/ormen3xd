import { describe, expect, it } from "vitest";
import { parseClientError, scrub, shortStack } from "@/lib/client-error";

describe("istemci hataları (kişisel veri yok)", () => {
  it("e-posta, telefon ve adres sorgusu silinir", () => {
    expect(scrub("ali@firma.com için 0532 123 45 67 numarası https://atelier.ormentekstil.com.tr/p/x?ad=Ali")).toBe(
      "[e-posta] için [numara] numarası https://atelier.ormentekstil.com.tr/p/x",
    );
  });
  it("yığın yalnızca dosya:satır:sütun, en çok 3", () => {
    const stack = "Error: x\n    at a (https://site/_next/static/chunks/1.js?v=2:10:5)\n    at b (/app/x.js:3:1)\n    at c (/y.js:1:1)\n    at d (/z.js:9:9)";
    expect(shortStack(stack)).toEqual(["/_next/static/chunks/1.js:10:5", "/app/x.js:3:1", "/y.js:1:1"]);
  });
  it("geçersiz istek reddedilir, yol sorgusuz tutulur", () => {
    expect(parseClientError({ kind: "baska", message: "x", device: "telefon" })).toBeNull();
    expect(parseClientError({ kind: "hata", message: "  ", device: "telefon" })).toBeNull();
    expect(parseClientError({ kind: "hata", message: "x", device: "saat" })).toBeNull();
    const e = parseClientError({ kind: "hata", message: "TypeError: a is undefined", device: "telefon", path: "/f/firma?y=abc", stack: ["/a.js:1:2"] });
    expect(e).toEqual({ kind: "hata", message: "TypeError: a is undefined", stack: ["/a.js:1:2"], path: "/f/firma", device: "telefon" });
  });
});
