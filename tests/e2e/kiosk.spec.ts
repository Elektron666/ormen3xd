import { expect, test } from "@playwright/test";
import { sceneFabrics } from "./helpers";

test("kiosk: karşılama, telefona al, uyarı ve ziyaretçi değişince sıfırlanma", async ({ page, isMobile }) => {
  test.skip(isMobile, "showroom ekranı");
  test.setTimeout(150_000);
  await page.clock.install();
  await page.goto("/f/ornek-mobilya?kiosk=30");

  // welcome screen in the firm's colour
  const welcome = page.getByRole("button", { name: "Başlamak için dokunun" });
  await expect(welcome).toBeVisible();
  await welcome.click();
  await expect(welcome).toBeHidden();
  await expect.poll(() => sceneFabrics(page), { timeout: 60_000 }).not.toEqual([]);
  const first = (await sceneFabrics(page))[0];

  // a visitor tries a fabric, likes it, takes it home by QR
  await page.getByRole("radio", { name: /VERSO-04/ }).click();
  await expect.poll(() => sceneFabrics(page), { timeout: 45_000 }).toEqual(["VERSO-04"]);
  await page.getByRole("button", { name: /beğendiklerime ekle/ }).first().click();
  await page.getByRole("button", { name: "Telefona al" }).click();
  await expect(page.getByRole("img", { name: "Telefonda açmak için QR kod" })).toBeVisible();
  await page.keyboard.press("Escape");

  // idle: warning in the last 10 s, "Devam et" keeps the session
  await page.clock.fastForward(21_000);
  await expect(page.getByRole("alertdialog")).toContainText("Hâlâ burada mısınız?");
  await page.getByRole("button", { name: "Devam et" }).click();
  await expect(page.getByRole("alertdialog")).toBeHidden();

  // idle again until the reset: back to the welcome screen and the starting fabric
  await page.clock.fastForward(31_000);
  await expect(page.getByRole("button", { name: "Başlamak için dokunun" })).toBeVisible({ timeout: 30_000 });
  expect(page.url()).toMatch(/\/f\/ornek-mobilya\?kiosk=30$/);
  expect(await page.evaluate(() => sessionStorage.getItem("ormen:begendiklerim"))).toBeNull();
  await page.getByRole("button", { name: "Başlamak için dokunun" }).click();
  await expect.poll(() => sceneFabrics(page), { timeout: 60_000 }).toEqual([first]);
});

test("kiosk: elimdeki kartelanın kodu yazılınca kumaş koltuğa giyer", async ({ page, isMobile }) => {
  test.skip(isMobile, "showroom ekranı");
  await page.goto("/f/ornek-mobilya?kiosk");
  await page.getByRole("button", { name: "Başlamak için dokunun" }).click();
  await expect.poll(() => sceneFabrics(page), { timeout: 45_000 }).not.toEqual([]);
  // visitors only try fabrics: no adding or duplicating pieces, no plan
  await expect(page.getByRole("button", { name: "Mobilya ekle" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Plan", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Çoğalt" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Yönetim" })).toHaveCount(0);
  const box = page.getByLabel("Elinizdeki kartelanın kodu");
  // a partial code offers the matches, a full one applies at once, however it is typed
  await box.fill("sie");
  await expect(page.getByTestId("kiosk-kod").getByRole("button", { name: /SIENA-0/ })).not.toHaveCount(0);
  await box.fill("siena 04");
  await expect.poll(() => sceneFabrics(page)).toEqual(["SIENA-04"]);
  await box.fill("XYZ-99");
  await expect(page.getByTestId("kiosk-kod")).toContainText("bulunamadı");
});
