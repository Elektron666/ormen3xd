import { describe, expect, it } from "vitest";
import { cleanTag, detectSource, markedPath } from "@/lib/source";
import { buildReport, parseEvent } from "@/lib/events";

const at = (search: string, pathname = "/f/ornek-mobilya", referrer = "") => ({ search, pathname, referrer, host: "atelier.ormentekstil.com.tr" });

describe("detectSource", () => {
  it("reads where a visit came from, in order of certainty", () => {
    expect(detectSource(at("?kiosk&q"))).toEqual({ source: "kiosk", tag: null });
    expect(detectSource(at("?kiosk=120&e=ankara-1"))).toEqual({ source: "kiosk", tag: "ankara-1" });
    expect(detectSource(at("?q&e=fuar-2027"))).toEqual({ source: "qr", tag: "fuar-2027" });
    expect(detectSource(at("", "/p/abc"))).toEqual({ source: "paylasim", tag: null });
    expect(detectSource(at("", "/f/ornek-mobilya", "https://ornekmobilya.com.tr/koltuklar"))).toEqual({ source: "site", tag: null });
    // moving between our own pages is not "another site"
    expect(detectSource(at("", "/f/ornek-mobilya", "https://atelier.ormentekstil.com.tr/"))).toEqual({ source: "dogrudan", tag: null });
    expect(detectSource(at("?k=LUMA-02", "/", "not a url"))).toEqual({ source: "dogrudan", tag: null });
  });
});

describe("cleanTag", () => {
  it("turns a typed label into a safe slug, or nothing", () => {
    expect(cleanTag("Ankara Şube 1")).toBe("ankara-sube-1");
    expect(cleanTag("  Fuar 2027! ")).toBe("fuar-2027");
    expect(cleanTag("İnegöl")).toBe("inegol");
    expect(cleanTag("---")).toBeNull();
    expect(cleanTag("")).toBeNull();
    expect(cleanTag(null)).toBeNull();
    expect(cleanTag("a".repeat(40))).toHaveLength(32);
  });
});

describe("markedPath", () => {
  it("adds the markers the source detection reads", () => {
    expect(markedPath("/f/x")).toBe("/f/x");
    expect(markedPath("/f/x", { qr: true })).toBe("/f/x?q");
    expect(markedPath("/f/x/berjer", { qr: true, tag: "ankara-1" })).toBe("/f/x/berjer?q&e=ankara-1");
    expect(markedPath("/f/x", { kiosk: true, tag: "fuar" })).toBe("/f/x?kiosk&e=fuar");
    // round trip
    const p = markedPath("/f/x", { qr: true, tag: "ankara-1" });
    expect(detectSource(at(p.slice(p.indexOf("?"))))).toEqual({ source: "qr", tag: "ankara-1" });
  });
});

describe("events with a source", () => {
  it("keeps only known sources and clean labels", () => {
    const base = { type: "sayfa_acildi", sessionId: "ziyaret0001" };
    expect(parseEvent({ ...base, source: "qr", tag: "ankara-1" })).toMatchObject({ source: "qr", tag: "ankara-1" });
    expect(parseEvent({ ...base, source: "instagram", tag: "Ali Veli" })).toMatchObject({ source: null, tag: null });
    expect(parseEvent({ type: "ar_acilamadi", sessionId: "ziyaret0001" })?.type).toBe("ar_acilamadi");
  });

  it("reports visits and sample requests by source and label", () => {
    const t = "2026-10-05T10:00:00.000Z";
    const r = buildReport(
      [
        { type: "sayfa_acildi", sessionId: "a0000001", source: "qr", tag: "ankara-1", createdAt: t },
        { type: "numune_istendi", sessionId: "a0000001", source: "qr", tag: "ankara-1", createdAt: t },
        { type: "sayfa_acildi", sessionId: "b0000001", source: "qr", tag: null, createdAt: t },
        { type: "sayfa_acildi", sessionId: "c0000001", source: "kiosk", tag: "ankara-1", createdAt: t },
        { type: "sayfa_acildi", sessionId: "d0000001", createdAt: t },
      ],
      { from: new Date("2026-10-05T00:00:00Z"), to: new Date("2026-10-05T20:00:00Z") },
    );
    expect(r.sources).toEqual([
      { source: "qr", sessions: 2, samples: 1 },
      { source: "bilinmiyor", sessions: 1, samples: 0 },
      { source: "kiosk", sessions: 1, samples: 0 },
    ]);
    expect(r.tags).toEqual([{ tag: "ankara-1", sessions: 2, samples: 1 }]);
  });
});
