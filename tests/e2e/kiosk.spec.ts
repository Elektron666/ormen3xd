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
