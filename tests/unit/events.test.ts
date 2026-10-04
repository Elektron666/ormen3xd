import { describe, expect, it } from "vitest";
import { buildReport, parseEvent, type StoredEvent } from "@/lib/events";

describe("usage events", () => {
  it("keeps only the known shape", () => {
    expect(parseEvent({ type: "kumas_denendi", sessionId: "abcd1234", fabricCode: "LUMA-02", device: "telefon", ip: "1.2.3.4" })).toEqual({
      type: "kumas_denendi",
      sessionId: "abcd1234",
      device: "telefon",
      firmSlug: null,
      modelSlug: null,
      fabricCode: "LUMA-02",
    });
    expect(parseEvent({ type: "hack", sessionId: "abcd1234" })).toBeNull();
    expect(parseEvent({ type: "paylasildi", sessionId: "x" })).toBeNull();
    expect(parseEvent({ type: "paylasildi", sessionId: "abcd1234", fabricCode: "<script>" })!.fabricCode).toBeNull();
  });

  it("aggregates visits, tries, firms and days", () => {
    const at = (h: number) => new Date(Date.UTC(2026, 9, 3, h)).toISOString();
    const ev: StoredEvent[] = [
      { type: "sayfa_acildi", sessionId: "s1aaaaaa", device: "telefon", createdAt: at(8) },
      { type: "kumas_denendi", sessionId: "s1aaaaaa", fabricCode: "LUMA-02", createdAt: at(8) },
      { type: "kumas_denendi", sessionId: "s1aaaaaa", fabricCode: "LUMA-02", createdAt: at(8) },
      { type: "kumas_denendi", sessionId: "s1aaaaaa", fabricCode: "SIENA-03", createdAt: at(8) },
      { type: "sayfa_acildi", sessionId: "s2bbbbbb", device: "masaustu", firmSlug: "ornek-mobilya", createdAt: at(23) },
      { type: "kumas_denendi", sessionId: "s2bbbbbb", fabricCode: "SIENA-03", firmSlug: "ornek-mobilya", createdAt: at(23) },
      { type: "ar_acildi", sessionId: "s2bbbbbb", firmSlug: "ornek-mobilya", createdAt: at(23) },
    ];
    const r = buildReport(ev, { from: new Date(Date.UTC(2026, 9, 2, 22)), to: new Date(Date.UTC(2026, 9, 4, 12)) });
    expect(r.sessions).toBe(2);
    expect(r.counts.kumas_denendi).toBe(4);
    expect(r.devices).toEqual({ telefon: 1, tablet: 0, masaustu: 1 });
    expect(r.topFabrics).toEqual([
      { code: "LUMA-02", tries: 2, sessions: 1 },
      { code: "SIENA-03", tries: 2, sessions: 2 },
    ]);
    expect(r.firms.find((f) => f.slug === "ornek-mobilya")).toEqual({ slug: "ornek-mobilya", sessions: 1, tries: 1, ar: 1, shares: 0, samples: 0 });
    // 23:00 UTC on the 3rd is already the 4th in Istanbul
    expect(r.days).toEqual([
      { day: "2026-10-03", sessions: 1 },
      { day: "2026-10-04", sessions: 1 },
    ]);
  });
});

describe("Faz 3 placeholder", () => {
  it("is a mock that never calls a service", async () => {
    const { reupholsterService } = await import("@/lib/ai/reupholster");
    expect(reupholsterService.available).toBe(false);
    const r = await reupholsterService.reupholster({ photo: new Blob(), fabric: { code: "LUMA-02", texture: {} as never } });
    expect(r).toMatchObject({ ok: false, reason: "not_available" });
  });
});
