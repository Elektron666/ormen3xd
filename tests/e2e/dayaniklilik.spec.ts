import { expect, test } from "./fixtures";
import { sceneFabrics } from "./helpers";

// Gece toplantısı (12 Oct): the graphics context can be lost (phone in the background,
// GPU reset). The scene must come back on its own, whether or not the browser restores it.
type Lose = { loseContext(): void; restoreContext(): void };
const loseContext = (page: import("@playwright/test").Page, restore: boolean) =>
  page.evaluate((restore) => {
    const st = (window as unknown as { __ormenStage: { get(): { gl: { getContext(): WebGL2RenderingContext } } } }).__ormenStage.get();
    const ext = st.gl.getContext().getExtension("WEBGL_lose_context") as unknown as Lose;
    ext.loseContext();
    if (restore) setTimeout(() => ext.restoreContext(), 300);
  }, restore);

for (const restore of [true, false])
  test(`3B bağlamı kaybolunca sahne geri gelir (${restore ? "tarayıcı geri verince" : "geri vermeyince, yeni tuvalle"})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/?y=moduler-kanepe.MISSO-02.0.0.0");
    await expect.poll(() => sceneFabrics(page), { timeout: 60_000 }).toEqual(["MISSO-02"]);
    await loseContext(page, restore);
    await expect(page.getByText("3B görüntü yeniden hazırlanıyor…")).toBeVisible();
    // a live context again, on a canvas that is on the page, dressed in the same fabric
    const alive = () =>
      page.evaluate(() => {
        const gl = (window as unknown as { __ormenStage: { get(): { gl: { getContext(): WebGL2RenderingContext; domElement: HTMLCanvasElement } } } }).__ormenStage.get().gl;
        return gl.domElement.isConnected && !gl.getContext().isContextLost();
      });
    await expect.poll(alive, { timeout: 30_000 }).toBe(true);
    await expect.poll(() => sceneFabrics(page), { timeout: 60_000 }).toEqual(["MISSO-02"]);
    await expect(page.getByText("3B görüntü yeniden hazırlanıyor…")).toBeHidden();
  });

// Gece toplantısı (12 Oct): errors in the visitor's browser reach the server log, scrubbed
test("istemci hatası kaydedilir; bozuk istek reddedilir", async ({ request }) => {
  const ok = await request.post("/api/hata", { data: { kind: "hata", message: "TypeError: x 0532 123 45 67", device: "telefon", path: "/f/a?y=1", stack: [] } });
  expect(ok.status()).toBe(204);
  expect((await request.post("/api/hata", { data: { kind: "baska", message: "x", device: "telefon" } })).status()).toBe(422);
  expect((await request.post("/api/hata", { data: "x".repeat(3000) })).status()).toBe(413);
});

test("sayfadaki yakalanmamış hata sunucuya bildirilir", async ({ page }) => {
  // the test browser does not show a beacon's body; without sendBeacon the same report goes by fetch
  await page.addInitScript(() => Object.defineProperty(navigator, "sendBeacon", { value: undefined }));
  await page.goto("/kvkk");
  const sent = page.waitForRequest((r) => r.url().endsWith("/api/hata") && r.method() === "POST");
  await page.evaluate(() => setTimeout(() => {
    throw new Error("deneme hatası ali@x.com");
  }));
  const body = JSON.parse((await sent).postData() ?? "{}");
  expect(body).toMatchObject({ kind: "hata", path: "/kvkk" });
  expect(body.message).toContain("deneme hatası");
});
