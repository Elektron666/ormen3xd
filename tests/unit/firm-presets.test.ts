import { describe, expect, it } from "vitest";
import { cleanPresets, parsePresetLink, presetHref } from "@/lib/firm-presets";
import { encodeShare } from "@/lib/share";

const id = encodeShare({ y: "berjer.SIENA-03.0.50.0", oda: "acik-salon" });

describe("firm presets", () => {
  it("reads the share link however it is pasted", () => {
    expect(parsePresetLink(`https://atelier.ormentekstil.com.tr/p/${id}`)).toEqual({ id });
    expect(parsePresetLink(`/p/${id}?utm=x`)).toEqual({ id });
    expect(parsePresetLink(id)).toEqual({ id });
    expect(parsePresetLink("https://atelier.ormentekstil.com.tr/s/Ab3dEf9h")).toEqual({ short: "Ab3dEf9h" });
    expect(parsePresetLink("https://example.com/baska")).toBeNull();
  });

  it("keeps valid, named, unique scenes, at most six", () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ name: `Sahne ${i}`, id: encodeShare({ y: `berjer.SIENA-03.${i}.50.0` }) }));
    expect(cleanPresets(many)).toHaveLength(6);
    expect(cleanPresets([{ name: " Salon  ", id }, { name: "Salon 2", id }, { name: "x", id }, { name: "Bozuk", id: "!!" }])).toEqual([{ name: "Salon", id }]);
    expect(cleanPresets("nope")).toEqual([]);
  });

  it("opens a scene on the same page, keeping kiosk and QR markers", () => {
    const href = presetHref("/f/ornek-mobilya", id, new URLSearchParams("kiosk&e=ankara-1&y=eski"));
    expect(href).toBe("/f/ornek-mobilya?kiosk&e=ankara-1&y=berjer.SIENA-03.0.50.0&oda=acik-salon");
  });
});
