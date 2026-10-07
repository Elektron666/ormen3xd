import { beforeEach, describe, expect, it } from "vitest";
import { medianFps, record, recordFrame, reset, snapshot, summary } from "@/lib/olcum";

const device = { ua: "Android 14; SM-A546B", cores: 8, memoryGb: 4, screen: "412×915 @2.6" };

describe("cihaz ölçümü", () => {
  beforeEach(() => reset());

  it("kare hızını medyanla, boşlukları saymadan hesaplar", () => {
    expect(medianFps(Array(29).fill(1 / 60))).toBeNull();
    for (let i = 0; i < 40; i++) recordFrame(1 / 30);
    recordFrame(3); // an idle gap between on-demand renders
    recordFrame(0.15); // one hitch
    expect(snapshot().frames).toHaveLength(41);
    expect(medianFps(snapshot().frames)).toBe(30);
  });

  it("son kareleri tutar, belleği büyütmez", () => {
    for (let i = 0; i < 1000; i++) recordFrame(1 / 60);
    expect(snapshot().frames.length).toBeLessThanOrEqual(240);
  });

  it("test tablosuna yapıştırılacak satırları üretir", () => {
    record({ tier: "dusuk", textureSize: "1k", startDpr: 1.25, dpr: 1, lowered: 1, firstFabricMs: 2340, ar: "acilamadi" });
    const text = summary(snapshot(), device).join("\n");
    expect(text).toContain("Kalite: dusuk · doku 1k");
    expect(text).toContain("1.25 → 1 (1 kez düştü)");
    expect(text).toContain("İlk kumaş: 2,3 sn");
    expect(text).toContain("AR: AÇILAMADI");
    expect(text).toContain("ölçülmedi");
  });

  it("hiçbir şey ölçülmediyse bilinmediğini söyler, uydurmaz", () => {
    const text = summary(snapshot(), { ua: "x", screen: "1×1 @1" }).join("\n");
    expect(text).toContain("çekirdek ? · bellek ?");
    expect(text).toContain("İlk kumaş: gelmedi");
    expect(text).toContain("AR: denenmedi");
  });
});

describe("cihaz adı", () => {
  it("tarayıcı kimliğini test tablosu için kısaltır", async () => {
    const { shortAgent } = await import("@/lib/olcum");
    expect(shortAgent("Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36")).toBe(
      "Android 14; SM-A546B · SamsungBrowser 25.0",
    );
    expect(shortAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1")).toBe(
      "iPhone; CPU iPhone OS 17_5 like Mac OS X · Safari 17.5",
    );
    expect(shortAgent("Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36")).toBe("Android 10 · Chrome 140.0");
    expect(shortAgent("")).toBe("bilinmiyor");
  });
});
