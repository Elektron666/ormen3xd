import { expect, test, type Page } from "@playwright/test";

type StageWindow = Window & {
  __ormenStage?: { get(): { scene: { traverse(cb: (o: { isMesh?: boolean; material?: { name?: string } }) => void): void } } };
};

/** Names of the fabric materials currently on the model. */
async function fabricOnModel(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const stage = (window as StageWindow).__ormenStage;
    if (!stage) return [];
    const names = new Set<string>();
    stage.get().scene.traverse((o) => {
      const n = o.material?.name;
      if (o.isMesh && n?.startsWith("kumas:")) names.add(n.slice(6));
    });
    return [...names];
  });
}

test("vitrin: koltuk görünür, kumaş değişir, bağlantı kombinasyonu taşır", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto("/");
  await expect(page.getByText("LUMA-02").first()).toBeVisible();
  // the model is dressed in its default fabric before it is shown
  await expect.poll(() => fabricOnModel(page)).toEqual(["LUMA-02"]);

  // the panel is a sheet on phones; expand it so the swatches are reachable
  const sheetHandle = page.getByRole("button", { name: "Kumaşları göster" });
  if (await sheetHandle.isVisible()) await sheetHandle.press("Enter");

  await page.getByRole("radio", { name: /PIETRA-03/ }).click();
  await expect(page).toHaveURL(/k=PIETRA-03/);
  await expect.poll(() => fabricOnModel(page)).toEqual(["PIETRA-03"]);
  await expect(page.getByRole("radio", { name: /PIETRA-03/ })).toHaveAttribute("aria-checked", "true");

  // reopening the link restores the same fabric
  await page.goto("/?k=SIENA-05");
  await expect.poll(() => fabricOnModel(page)).toEqual(["SIENA-05"]);

  expect(errors).toEqual([]);
});

test("arama Türkçe karakterlere duyarsız çalışır", async ({ page }) => {
  await page.goto("/");
  const sheetHandle = page.getByRole("button", { name: "Kumaşları göster" });
  if (await sheetHandle.isVisible()) await sheetHandle.press("Enter");
  await page.getByRole("searchbox").fill("lacıvert");
  await expect(page.getByRole("radio")).toHaveCount(1);
  await expect(page.getByRole("radio")).toHaveAccessibleName(/SIENA-06/);
});

test("oda bağlantısı aynı odayı açar, araçlar çalışır", async ({ page, isMobile }) => {
  test.skip(isMobile, "oda paneli masaüstü öncelikli");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?oda=koyu-salon&k=SIENA-01");
  await expect.poll(() => fabricOnModel(page)).toEqual(["SIENA-01"]);
  await page.getByRole("tab", { name: "Oda" }).click();
  await expect(page.getByRole("button", { name: /Koyu ve sıcak salon/ })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("radio", { name: /Köşe/ }).click();
  await expect(page).toHaveURL(/oda=kose\.480x420x270\.tutun\.ceviz/);

  await page.getByRole("button", { name: "Ölçüler" }).click();
  await expect(page.getByText("Genişlik 238 cm")).toBeVisible();

  await page.getByRole("button", { name: "Karşılaştır" }).click();
  await expect(page.getByRole("slider", { name: "Karşılaştırma çizgisi" })).toBeVisible();
  await page.getByRole("tab", { name: "Kumaş" }).click();
  await page.getByRole("radio", { name: /PIETRA-02/ }).click();
  await expect(page.getByRole("slider", { name: "Karşılaştırma çizgisi" })).toHaveAttribute("aria-valuetext", /sağda PIETRA-02/);
  // the left (primary) fabric is unchanged
  await expect.poll(() => fabricOnModel(page)).toContain("SIENA-01");

  expect(errors).toEqual([]);
});

test("plan görünümü ölçüleri gösterir ve bağlantıda saklanır", async ({ page, isMobile }) => {
  test.skip(isMobile, "plan masaüstü öncelikli");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?oda=acik-salon&k=LUMA-03");
  await expect.poll(() => fabricOnModel(page)).toEqual(["LUMA-03"]);
  await page.getByRole("button", { name: "Plan" }).click();
  await expect(page).toHaveURL(/g=plan/);
  for (const text of ["520 cm", "440 cm", "238 cm", "340 cm"]) await expect(page.getByText(text, { exact: true })).toBeVisible();
  await expect(page.getByText("141 cm", { exact: true })).toHaveCount(2);
  await expect(page.getByText("1 m", { exact: true })).toBeVisible();
  // fabric changes are visible in the plan too
  await page.getByRole("radio", { name: /SIENA-06/ }).click();
  await expect.poll(() => fabricOnModel(page)).toEqual(["SIENA-06"]);
  await page.getByRole("button", { name: "3B" }).click();
  await expect(page).toHaveURL(/g=3b/);
  await expect(page.getByText("340 cm", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
