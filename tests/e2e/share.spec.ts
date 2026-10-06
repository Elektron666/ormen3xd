import { expect, test } from "@playwright/test";

const LAYOUT = "moduler-kanepe.LUMA-02.0.51.0_berjer.SIENA-03.170.60.-90";

test.describe("paylaşım ve numune", () => {
  test.skip(({ isMobile }) => isMobile, "masaüstü öncelikli");

  test("paylaşım görseli hazırlanır, bağlantı aynı kombinasyonu açar", async ({ page, browser }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`/?oda=acik-salon&y=${LAYOUT}`);
    await page.getByRole("button", { name: "Paylaş", exact: true }).click();
    await expect(page.getByAltText("Paylaşılacak görsel")).toBeVisible({ timeout: 45_000 });
    // the long link is replaced by a short one
    const link = page.locator("dialog p[translate=no]");
    await expect(link).toHaveText(/\/s\/[0-9A-Za-z]{8}$/);
    const url = (await link.textContent())!;

    const other = await browser.newPage();
    await other.goto(url);
    await expect(other).toHaveURL(/\/p\/[A-Za-z0-9_-]+$/);
    await expect
      .poll(() =>
        other.evaluate(() => {
          type O = { isMesh?: boolean; material?: { name?: string } };
          const s = (window as unknown as { __ormenStage?: { get(): { scene: { traverse(cb: (o: O) => void): void } } } }).__ormenStage;
          const names = new Set<string>();
          s?.get().scene.traverse((o) => o.isMesh && o.material?.name?.startsWith("kumas:") && names.add(o.material.name.slice(6)));
          return [...names].sort();
        }),
      )
      .toEqual(["LUMA-02", "SIENA-03"]);
    await other.close();
    expect(errors).toEqual([]);
  });

  test("kısa link: aynı kombinasyon aynı kodu alır, bozuk istek kaydedilmez", async ({ request }) => {
    const id = Buffer.from(`y=${LAYOUT}`).toString("base64url");
    const a = await (await request.post("/api/paylas", { data: { id } })).json();
    const b = await (await request.post("/api/paylas", { data: { id } })).json();
    expect(a.path).toMatch(/^\/s\/[0-9A-Za-z]{8}$/);
    expect(b.path).toBe(a.path);
    expect((await request.post("/api/paylas", { data: { id: "bozuk!" } })).status()).toBe(422);
    expect((await request.get("/s/YOKBOYLE1", { maxRedirects: 0 })).status()).toBe(404);
    const r = await request.get(a.path, { maxRedirects: 0 });
    expect(r.status()).toBe(308);
    expect(r.headers().location).toContain(`/p/${id}`);
  });

  test("WhatsApp önizlemesi için görsel üretilir", async ({ request, page }) => {
    await page.goto(`/?oda=acik-salon&y=${LAYOUT}`);
    await page.getByRole("button", { name: "Paylaş", exact: true }).click();
    const url = (await page.locator("dialog p[translate=no]").textContent())!;
    const html = await (await request.get(url)).text();
    expect(html).toContain('property="og:title" content="ORMEN kumaş kombinasyonu · LUMA-02 · SIENA-03"');
    const og = html.match(/property="og:image" content="([^"]+)"/)![1];
    const res = await request.get(new URL(new URL(og).pathname + new URL(og).search, url).toString());
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");
  });

  test("numune talebi doğrulanır ve kaydedilir", async ({ page }) => {
    await page.goto(`/?oda=acik-salon&y=${LAYOUT}`);
    await page.getByRole("button", { name: "Numune iste" }).click();
    await page.getByRole("button", { name: "Talebi gönder" }).click();
    await expect(page.getByText("Adınızı yazın.")).toBeVisible();
    await expect(page.getByText("Devam etmek için aydınlatma metnini onaylayın.")).toBeVisible();

    await page.getByRole("textbox", { name: /^Ad soyad/ }).fill("Ayşe Yılmaz");
    await page.getByRole("textbox", { name: /^Telefon/ }).fill("0532 123 45 67");
    // fixed choices, no free-text field anywhere in the form
    await expect(page.getByRole("dialog").getByRole("textbox")).toHaveCount(2);
    // the chips are labels around visually hidden radios, tapped like people do
    await page.getByText("Yeniden döşeme", { exact: true }).click();
    await page.getByText("Takım", { exact: true }).click();
    await expect(page.getByRole("radio", { name: "Takım" })).toBeChecked();
    await page.getByRole("checkbox", { name: /kabul ediyorum/ }).check();
    const [resp] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith("/api/samples")),
      page.getByRole("button", { name: "Talebi gönder" }).click(),
    ]);
    expect(resp.status()).toBe(201);
    expect(resp.request().postDataJSON().choices).toEqual({ purpose: "yeniden", scope: "takim" });
    await expect(page.getByText("Talebiniz alındı.")).toBeVisible();
  });

  test("numune API'si geçersiz isteği reddeder", async ({ request }) => {
    const bad = await request.post("/api/samples", { data: { name: "A", phone: "1", consent: false, fabricCodes: [] } });
    expect(bad.status()).toBe(422);
    const unknown = await request.post("/api/samples", { data: { name: "Ali Veli", phone: "05321234567", consent: true, fabricCodes: ["YOK-99"] } });
    expect(unknown.status()).toBe(422);
  });
});
