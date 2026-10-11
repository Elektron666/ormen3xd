import { describe, expect, it } from "vitest";
import { SAMPLE_CODE, retentionDays, STEP_KEYS, canMarkOrdered, cleanLot, cleanSampleCode, describeChoices, newSampleCode, normalisePhone, sampleWhatsappText, prettyPhone, shareLink, validateSample, whatsappUrl } from "@/lib/samples";

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
    // written the Turkish way, with or without the leading 0
    expect(whatsappUrl("0540 349 68 88", "x")).toBe("https://wa.me/905403496888?text=x");
    expect(whatsappUrl("540 349 68 88", "x")).toBe("https://wa.me/905403496888?text=x");
  });
});

describe("shareLink", () => {
  it("keeps only our own share paths", () => {
    expect(shareLink("https://atelier.ormentekstil.com.tr/p/abc_D-9")).toBe("/p/abc_D-9");
    expect(shareLink("/p/xyz")).toBe("/p/xyz");
    expect(shareLink("javascript:alert(1)")).toBeUndefined();
    expect(shareLink("https://kotu.example/baska")).toBeUndefined();
    expect(shareLink("https://x/p/a/../../evil")).toBeUndefined();
    expect(shareLink(42)).toBeUndefined();
  });
});

describe("prettyPhone", () => {
  it("formats stored Turkish numbers", () => {
    expect(prettyPhone("+905321234567")).toBe("0532 123 45 67");
    expect(prettyPhone("+4915112345678")).toBe("+4915112345678");
  });
});

describe("fixed choices instead of a note", () => {
  const base = { name: "Ali Veli", phone: "0532 123 45 67", consent: true, fabricCodes: ["LUMA-02"] };

  it("keeps only known answers and drops any free text", () => {
    const r = validateSample({ ...base, choices: { purpose: "yeniden", scope: "takim", timing: "uydurma" as never }, note: "Adres: Çankaya ..." } as never);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.choices).toEqual({ purpose: "yeniden", scope: "takim" });
    expect(JSON.stringify(r.value)).not.toContain("Adres");
  });

  it("describes the answers for the panel and WhatsApp", () => {
    expect(describeChoices({ purpose: "yeni", timing: "yakin" })).toBe("Yeni koltuk · 1 ay içinde");
    expect(describeChoices({})).toBe("");
    const text = sampleWhatsappText({ name: "Ali", phone: "+905321234567", fabricCodes: ["LUMA-02"], choices: { scope: "takim" } });
    expect(text).toContain("Takım");
    expect(text).not.toContain("Not:");
  });
});

describe("sample flow", () => {
  it("draws readable sample codes and cleans what is scanned or typed", () => {
    for (let i = 0; i < 200; i++) expect(newSampleCode()).toMatch(SAMPLE_CODE);
    expect(newSampleCode()).not.toMatch(/[IO]/);
    expect(cleanSampleCode(" n-7k3p9q ")).toBe("N-7K3P9Q");
    expect(cleanSampleCode("N-7K3P9")).toBeNull();
    expect(cleanSampleCode("N-7K3PIO")).toBeNull();
  });

  it("keeps the lot short and printable", () => {
    expect(cleanLot("  L-2026/118 ")).toBe("L-2026/118");
    expect(cleanLot("")).toBeUndefined();
    expect(cleanLot("a\u0000b")).toBe("ab");
    expect(cleanLot("x".repeat(60))).toHaveLength(40);
  });

  it("lets the shop mark only open samples as ordered", () => {
    expect(STEP_KEYS.filter(canMarkOrdered)).toEqual(["yeni", "hazirlaniyor", "gonderildi"]);
  });

  it("gives every stored request a code and the first step (memory store)", async () => {
    const { MemoryRepository } = await import("@/lib/data/memory-repo");
    const repo = new MemoryRepository();
    const r = await repo.createSampleRequest({ name: "Ali Veli", phone: "+905321234567", consent: true, fabricCodes: ["LUMA-02"] });
    expect(r.status).toBe("yeni");
    expect(r.code).toMatch(SAMPLE_CODE);
    expect((await repo.getSampleByCode(r.code!))?.id).toBe(r.id);
    await repo.updateSampleRequest(r.id, { status: "gonderildi", lot: " 118 " });
    const after = await repo.getSampleRequest(r.id);
    expect(after).toMatchObject({ status: "gonderildi", lot: "118" });
    expect(after?.statusAt).toBeTruthy();
    await repo.updateSampleRequest(r.id, { lot: "" });
    expect((await repo.getSampleRequest(r.id))?.lot).toBeUndefined();
  });
});

describe("retention", () => {
  it("reads a sensible number of days, or none", () => {
    expect(retentionDays("730")).toBe(730);
    expect(retentionDays(undefined)).toBeNull();
    expect(retentionDays("7")).toBeNull();
    expect(retentionDays("iki yıl")).toBeNull();
  });

  it("deletes one request, or all older than a date (memory store)", async () => {
    const { MemoryRepository } = await import("@/lib/data/memory-repo");
    const repo = new MemoryRepository();
    const a = await repo.createSampleRequest({ name: "Ali Veli", phone: "+905321234567", consent: true, fabricCodes: ["LUMA-02"] });
    const b = await repo.createSampleRequest({ name: "Ayşe Kaya", phone: "+905321234568", consent: true, fabricCodes: ["LUMA-02"] });
    await repo.deleteSampleRequest(a.id);
    expect((await repo.listSampleRequests()).map((r) => r.id)).toEqual([b.id]);
    expect(await repo.purgeSampleRequests(new Date(Date.now() - 1000))).toBe(0);
    expect(await repo.purgeSampleRequests(new Date(Date.now() + 1000))).toBe(1);
    expect(await repo.listSampleRequests()).toEqual([]);
  });
});
