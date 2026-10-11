import { describe, expect, it } from "vitest";
import { looksPersonal, parseFeedback } from "@/lib/feedback";
import { allow, blocked, callerKey, recordFailure } from "@/lib/rate-limit";
import { MemoryRepository } from "@/lib/data/memory-repo";

describe("geri bildirim", () => {
  it("yalnızca bilinen alanları kabul eder, metni temizler", () => {
    const r = parseFeedback({ kind: "oneri", message: "  Kumaşları\u0007 büyütme olsun  ", page: "/f/demo", firmSlug: "demo", device: "telefon", ip: "1.2.3.4" });
    expect(r).toEqual({ ok: true, value: { kind: "oneri", message: "Kumaşları büyütme olsun", page: "/f/demo", firmSlug: "demo", device: "telefon" } });
  });

  it("boş, çok uzun, bilinmeyen konu ve bot alanı reddedilir", () => {
    expect(parseFeedback({ kind: "oneri", message: "a" }).ok).toBe(false);
    expect(parseFeedback({ kind: "oneri", message: "x".repeat(501) }).ok).toBe(false);
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
    // a local server without a forwarded address: nothing to tell callers apart, no limit
    for (let i = 0; i < 20; i++) expect(allow("test", null, 5, 60_000, t)).toBe(true);
    expect(callerKey(new Headers(), true)).toBeNull();
    expect(callerKey(new Headers({ "x-forwarded-for": "1.2.3.4" }), false)).toBeNull();
    expect(callerKey(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }), true)).toBe(callerKey(new Headers({ "x-forwarded-for": "1.2.3.4" }), true));
  });

  it("şifre denemesinde yalnızca hatalı denemeler sayılır", () => {
    const t = 5_000_000;
    for (let i = 0; i < 9; i++) recordFailure("giris-test", "k", t + i);
    expect(blocked("giris-test", "k", 10, 60_000, t + 20)).toBe(false);
    recordFailure("giris-test", "k", t + 21);
    expect(blocked("giris-test", "k", 10, 60_000, t + 22)).toBe(true);
    expect(blocked("giris-test", "k", 10, 60_000, t + 61_000)).toBe(false);
    expect(blocked("giris-test", null, 10, 60_000, t + 22)).toBe(false);
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

describe("katalog sırası", () => {
  it("gerçek kumaşlar önce, kendi sıralarıyla", async () => {
    const { realFirst } = await import("@/lib/fabric/allowed");
    const list = [
      { code: "LUMA-01", isPlaceholder: true },
      { code: "MISSO-01", isPlaceholder: false },
      { code: "LUMA-02", isPlaceholder: true },
      { code: "MISSO-02", isPlaceholder: false },
    ];
    expect(realFirst(list).map((f) => f.code)).toEqual(["MISSO-01", "MISSO-02", "LUMA-01", "LUMA-02"]);
  });
});

describe("bize fikir verin: iletişim", () => {
  it("boşsa isimsiz; doluysa ad, telefon ve onay şart", async () => {
    const { parseContact } = await import("@/lib/feedback");
    expect(parseContact(undefined)).toBeUndefined();
    expect(parseContact({ company: " ", name: "", phone: "" })).toBeUndefined();
    expect(parseContact({ name: "Kemal", phone: "" , consent: true})).toMatch(/telefon/);
    expect(parseContact({ name: "Kemal Yıldız", phone: "0533 222 11 00" })).toMatch(/onay/);
    expect(parseContact({ company: "Yıldız Mobilya", name: " Kemal  Yıldız ", phone: "0533 222 11 00", consent: true })).toEqual({ company: "Yıldız Mobilya", name: "Kemal Yıldız", phone: "+905332221100" });
    expect(parseContact({ name: "Kemal", phone: "05332221100", consent: true })).toEqual({ company: null, name: "Kemal", phone: "+905332221100" });
  });

  it("geri bildirime eklenir; saklama süresi sonunda iletişim silinir, mesaj kalır", async () => {
    const r = parseFeedback({ kind: "oneri", message: "Kütük kol olsun", contact: { name: "Kemal", phone: "05332221100", consent: true } });
    expect(r.ok && r.value.contact).toEqual({ company: null, name: "Kemal", phone: "+905332221100" });
    expect(parseFeedback({ kind: "oneri", message: "Kütük kol olsun", contact: { name: "Kemal", phone: "05332221100" } }).ok).toBe(false);
    const repo = new MemoryRepository();
    await repo.recordFeedback(r.ok ? r.value : (null as never));
    expect(await repo.purgeFeedbackContacts(new Date(Date.now() + 1000))).toBe(1);
    const [f] = await repo.listFeedback();
    expect(f.contact).toBeUndefined();
    expect(f.message).toBe("Kütük kol olsun");
  });
});
