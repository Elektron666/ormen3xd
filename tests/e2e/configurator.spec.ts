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
