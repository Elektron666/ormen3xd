import { expect, test } from "@playwright/test";
import { login, sceneFabrics } from "./helpers";

test("ziyaret ve kumaş denemeleri raporda görünür; panel kullanıcısı sayılmaz", async ({ browser, isMobile }) => {
  test.skip(isMobile, "masaüstü");
  test.setTimeout(120_000);
  // a visitor (automated traffic is ignored unless the test opts in)
  const visitor = await browser.newContext();
  await visitor.addInitScript(() => {
    (window as { __ormenTrack?: boolean }).__ormenTrack = true;
    // Playwright cannot read a beacon's body; without sendBeacon the page uses its fetch fallback, which it can
    Object.defineProperty(navigator, "sendBeacon", { value: undefined });
  });
  const v = await visitor.newPage();
  const sent: string[] = [];
  v.on("request", (r) => r.url().endsWith("/api/olay") && sent.push(r.postData() ?? ""));
  // arrives from a printed QR with a branch label
  await v.goto("/f/ornek-mobilya?q&e=ankara-1");
  await expect.poll(() => sceneFabrics(v), { timeout: 45_000 }).not.toEqual([]);
  await v.getByRole("radio", { name: /VERSO-04/ }).click();
  await expect.poll(() => sent.length).toBeGreaterThanOrEqual(2);
  expect(sent.every((b) => b.includes('"sessionId"'))).toBe(true);
  expect(sent.join()).not.toMatch(/ip|userAgent|Mozilla/);
  // every event of the visit carries where it came from, even after the address bar changes
  expect(sent.every((b) => b.includes('"source":"qr"') && b.includes('"tag":"ankara-1"'))).toBe(true);
  await visitor.close();

  // ORMEN staff
  const staff = await browser.newContext();
  const p = await staff.newPage();
  await login(p);
  const skipped = await p.request.post("/api/olay", { data: { type: "sayfa_acildi", sessionId: "panelkullanicisi" } });
  expect(skipped.status()).toBe(204);
  await p.goto("/panel/rapor?gun=7&firma=ornek-mobilya");
  const summary = p.getByTestId("rapor-ozet");
  await expect(summary).not.toContainText(/Ziyaret\s*0\b/);
  await expect(p.getByRole("listitem").filter({ hasText: "VERSO-04" })).toBeVisible();
  await expect(p.getByRole("cell", { name: "Örnek Mobilya" })).toBeVisible();
  await expect(p.getByTestId("rapor-kaynak")).toContainText("Basılı QR");
  await expect(p.getByTestId("rapor-etiket")).toContainText("ankara-1");
  await staff.close();
});

test("olay API'si bilinmeyen alanları ve türleri reddeder", async ({ request }) => {
  expect((await request.post("/api/olay", { data: { type: "hack", sessionId: "abcdefgh" } })).status()).toBe(422);
  expect((await request.post("/api/olay", { data: "x".repeat(2000) })).status()).toBe(413);
});

test("firma aylık özeti: 30 ziyaretten sonra en çok denenenler sıralanır", async ({ page, request, isMobile }) => {
  test.skip(isMobile, "panel");
  const before = await (async () => {
    await login(page);
    await page.goto("/panel/firmalar");
    await page.getByRole("link", { name: /Örnek Mobilya/ }).first().click();
    return (await page.getByRole("link", { name: "Aylık özet" }).getAttribute("href"))!;
  })();
  const month = new Date(Date.now() + 3 * 3_600_000).toISOString().slice(0, 7);
  // 30 anonymous visits on the firm page, each trying VERSO-02
  for (let i = 0; i < 30; i++) {
    const sessionId = `ozet${Date.now().toString(36)}${i}`;
    await request.post("/api/olay", { data: { type: "sayfa_acildi", sessionId, firmSlug: "ornek-mobilya", source: "qr" } });
    await request.post("/api/olay", { data: { type: "kumas_denendi", sessionId, firmSlug: "ornek-mobilya", fabricCode: "VERSO-02" } });
  }
  await page.goto(`${before}?ay=${month}`);
  const sheet = page.getByTestId("aylik-ozet");
  await expect(sheet).not.toContainText("ziyaretten sonra gösterilir");
  await expect(sheet.getByRole("row").filter({ hasText: "VERSO-02" })).toBeVisible();
  await expect(sheet).toContainText("Basılı QR");
});
