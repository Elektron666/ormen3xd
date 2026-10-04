import { describe, expect, it } from "vitest";
import { normalisePhone, sampleWhatsappText, validateSample, whatsappUrl } from "@/lib/samples";

describe("phone numbers", () => {
  it.each([
    ["0532 123 45 67", "+905321234567"],
    ["+90 (532) 123-45-67", "+905321234567"],
    ["5321234567", "+905321234567"],
    ["905321234567", "+905321234567"],
    ["0090 532 123 45 67", "+905321234567"],
    ["0312 444 55 66", "+903124445566"],
  ])("%s → %s", (raw, e164) => expect(normalisePhone(raw)).toBe(e164));

  it.each(["123", "0532 123", "1532 123 45 67", "abc"])("rejects %s", (raw) => expect(normalisePhone(raw)).toBeNull());
});

describe("sample request validation", () => {
  const good = { name: " Ayşe  Yılmaz ", phone: "0532 123 45 67", consent: true, fabricCodes: ["luma-02", "LUMA-02", "SIENA-03"] };

  it("cleans and accepts a valid request", () => {
    const r = validateSample(good);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.name).toBe("Ayşe Yılmaz");
      expect(r.value.phone).toBe("+905321234567");
      expect(r.value.fabricCodes).toEqual(["LUMA-02", "SIENA-03"]);
    }
  });

  it("requires consent, a name, a phone and a fabric", () => {
    const r = validateSample({ name: "", phone: "1", consent: false, fabricCodes: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["consent", "fabricCodes", "name", "phone"]);
  });

  it("rejects odd fabric codes", () => {
    const r = validateSample({ ...good, fabricCodes: ["<script>"] });
    expect(r.ok).toBe(false);
  });
});

describe("WhatsApp message", () => {
  it("lists codes, name, phone and link, and encodes it into a wa.me link", () => {
    const text = sampleWhatsappText({ name: "Ayşe", phone: "+905321234567", fabricCodes: ["LUMA-02"], link: "https://x/p/abc" });
    expect(text).toContain("Kumaş: LUMA-02");
    expect(text).toContain("https://x/p/abc");
    expect(whatsappUrl("+90 532 000 00 00", "Merhaba ş")).toBe("https://wa.me/905320000000?text=Merhaba%20%C5%9F");
  });
});
