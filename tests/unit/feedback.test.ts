import { describe, expect, it } from "vitest";
import { looksPersonal, parseFeedback } from "@/lib/feedback";
import { allow } from "@/lib/rate-limit";
import { MemoryRepository } from "@/lib/data/memory-repo";

describe("geri bildirim", () => {
  it("yalnızca bilinen alanları kabul eder, metni temizler", () => {
    const r = parseFeedback({ kind: "oneri", message: "  Kumaşları\u0007 büyütme olsun  ", page: "/f/demo", firmSlug: "demo", device: "telefon", ip: "1.2.3.4" });
    expect(r).toEqual({ ok: true, value: { kind: "oneri", message: "Kumaşları büyütme olsun", page: "/f/demo", firmSlug: "demo", device: "telefon" } });
  });

  it("boş, çok uzun, bilinmeyen konu ve bot alanı reddedilir", () => {
    expect(parseFeedback({ kind: "oneri", message: "a" }).ok).toBe(false);
    expect(parseFeedback({ kind: "oneri", message: "x".repeat(1001) }).ok).toBe(false);
    expect(parseFeedback({ kind: "sikayet", message: "merhaba" }).ok).toBe(false);
    expect(parseFeedback({ kind: "oneri", message: "merhaba", website: "spam.com" }).ok).toBe(false);
    // adres çubuğundaki sorgu (paylaşım kodu) saklanmaz
    const r = parseFeedback({ kind: "diger", message: "merhaba", page: "/?y=abc" });
    expect(r.ok && r.value.page).toBeNull();
  });

  it("telefon ya da e-posta görünce uyarır", () => {
    expect(looksPersonal("beni 0532 123 45 67 den arayın")).toBe(true);
    expect(looksPersonal("ayse@ornek.com")).toBe(true);
    expect(looksPersonal("Chester çok güzel olmuş")).toBe(false);
  });

  it("aynı kaynaktan kısa sürede en fazla 5 gönderim", () => {
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) expect(allow("test", "k", 5, 60_000, t + i)).toBe(true);
    expect(allow("test", "k", 5, 60_000, t + 10)).toBe(false);
    expect(allow("test", "k", 5, 60_000, t + 61_000)).toBe(true);
  });

  it("panelde en yeni önce listelenir, silinir", async () => {
    const repo = new MemoryRepository();
    await repo.recordFeedback({ kind: "hata", message: "AR açılmadı", page: "/", firmSlug: null });
    await repo.recordFeedback({ kind: "begendim", message: "Harika", page: "/", firmSlug: null });
    const list = await repo.listFeedback();
    expect(list.map((f) => f.message)).toEqual(["Harika", "AR açılmadı"]);
    await repo.deleteFeedback(list[0].id);
    expect((await repo.listFeedback()).map((f) => f.message)).toEqual(["AR açılmadı"]);
  });
});
