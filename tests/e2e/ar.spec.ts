import { expect, test, type Page } from "@playwright/test";

// Real AR needs a real phone; here we check what can be checked in a browser:
// the right path per device, and a valid GLB with the fabric baked in.

const LAYOUT = "moduler-kanepe.LUMA-02.0.51.0_berjer.SIENA-03.170.60.-90";

/** Reads the GLB that <model-viewer> was given: size, materials, image formats. */
function inspectGlb(page: Page) {
  return page.evaluate(async () => {
    const mv = document.querySelector("model-viewer") as HTMLElement & { src: string; loaded: boolean };
    const buf = await (await fetch(mv.src)).arrayBuffer();
    const dv = new DataView(buf);
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, dv.getUint32(12, true))));
    return {
      magic: new TextDecoder().decode(new Uint8Array(buf, 0, 4)),
      mb: buf.byteLength / 1024 / 1024,
      loaded: mv.loaded,
      materials: json.materials.map((m: { name: string }) => m.name),
      images: json.images.map((i: { mimeType: string }) => i.mimeType),
      transforms: JSON.stringify(json).includes("KHR_texture_transform"),
    };
  });
}

test("masaüstünde QR çıkar, AR modeli önizlenir", async ({ page, isMobile }) => {
  test.skip(isMobile, "masaüstü akışı");
  test.setTimeout(120_000);
  await page.goto(`/?y=${LAYOUT}`);
  await page.getByRole("button", { name: "Odamda gör" }).click({ timeout: 60_000 });
  await expect(page.getByRole("img", { name: "Telefonda açmak için QR kod" })).toBeVisible();
  await page.getByRole("button", { name: "AR modelini burada önizle" }).click();
  await expect(page.getByTestId("ar-viewer")).toBeVisible({ timeout: 60_000 });
  await expect.poll(async () => (await inspectGlb(page)).loaded, { timeout: 60_000 }).toBe(true);
  const glb = await inspectGlb(page);
  expect(glb.magic).toBe("glTF");
  expect(glb.materials).toContain("kumas:LUMA-02");
  expect(glb.images.every((m: string) => m === "image/jpeg")).toBe(true);
  // repeat lives in the UVs, not in a texture transform the AR apps may drop
  expect(glb.transforms).toBe(false);
  expect(glb.mb).toBeLessThan(4);
});

test("bölgelere ayrı kumaş verilen parça AR'da da öyle", async ({ page, isMobile }) => {
  test.skip(isMobile, "masaüstü akışı");
  test.setTimeout(120_000);
  await page.goto("/?y=moduler-kanepe.LUMA-02.0.51.0.kPIETRA-05~mSIENA-05");
  await page.getByRole("button", { name: "Odamda gör" }).click({ timeout: 60_000 });
  await expect(page.getByRole("img", { name: "Telefonda açmak için QR kod" })).toBeVisible();
  await page.getByRole("button", { name: "AR modelini burada önizle" }).click();
  await expect(page.getByTestId("ar-viewer")).toBeVisible({ timeout: 60_000 });
  await expect.poll(async () => (await inspectGlb(page)).loaded, { timeout: 60_000 }).toBe(true);
  const glb = await inspectGlb(page);
  expect([...glb.materials].sort()).toEqual(expect.arrayContaining(["kumas:LUMA-02", "kumas:PIETRA-05", "kumas:SIENA-05"]));
  expect(glb.mb).toBeLessThan(4);
});

test("telefonda AR sayfası seçilen parçayı kumaşıyla açar", async ({ page, isMobile }) => {
  test.skip(!isMobile, "telefon akışı");
  test.setTimeout(120_000);
  const id = Buffer.from(`y=${LAYOUT}&oda=acik-salon`).toString("base64url");
  await page.goto(`/ar/${id}?parca=1`);
  await expect(page.getByRole("heading", { name: "Berjer" })).toBeVisible();
  await expect(page.getByText("SIENA-03")).toBeVisible();
  await expect.poll(async () => (await page.locator("model-viewer").count()) && (await inspectGlb(page)).loaded, { timeout: 60_000 }).toBe(true);
  expect((await inspectGlb(page)).materials).toContain("kumas:SIENA-03");
  await expect(page.getByRole("link", { name: "Kumaşı değiştir" })).toHaveAttribute("href", `/p/${id}`);
});

test("bozuk AR bağlantısı 404", async ({ request }) => {
  expect((await request.get("/ar/bozuk!")).status()).toBe(404);
});
