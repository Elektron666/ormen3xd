import { expect, test } from "@playwright/test";
import { login, sceneFabrics } from "./helpers";

// Kesim masası (2nd meeting): the firm's own metres reach the cutter's sheet
// only where they apply, and the real metres come back from its QR.

test("usta föyü firmanın metrajını yalnızca uygun kumaşta gösterir; gerçek metre geri gelir", async ({ page, browser, isMobile }) => {
  test.skip(isMobile, "panel ve föy masaüstü");
  test.setTimeout(150_000);
  await login(page);

  // ORMEN enters the technical data of LUMA-02 from its sheet
  await page.goto("/panel/kumaslar");
  await page.getByRole("link", { name: /LUMA-02/ }).first().click();
  await page.getByLabel("En (cm)").fill("140");
  await page.getByRole("combobox", { name: /^Desen/ }).selectOption("duz");
  await page.getByRole("combobox", { name: /^Kesim yönü/ }).selectOption("cift");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page).toHaveURL(/kaydedildi=LUMA-02/);

  // and the firm's metres for the corner set (not for the armchair)
  await page.goto("/panel/modeller");
  await page.getByRole("link", { name: "Köşe Takımı", exact: true }).click();
  await page.getByLabel("Bir adet için kumaş (m)").fill("14");
  await page.getByLabel("Hangi kumaş eninde (cm)").fill("140");
  await page.getByRole("button", { name: "Kaydet" }).click();
  await expect(page).toHaveURL(/kaydedildi=/);

  // a shop prints the offer sheet for a corner set and an armchair, both in LUMA-02
  const shop = await browser.newContext();
  await shop.addInitScript(() => (window.print = () => undefined));
  const s = await shop.newPage();
  await s.goto("/?y=kose-takimi.LUMA-02.0.113.0_berjer.LUMA-02.-20.160.0");
  await expect.poll(() => sceneFabrics(s), { timeout: 45_000 }).toEqual(["LUMA-02"]);
  await s.getByRole("button", { name: "Paylaş" }).click();
  await s.getByRole("button", { name: /Föyü yazdır/ }).click();
  await s.emulateMedia({ media: "print" });
  const sheet = s.getByTestId("usta-foyu");
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("METRAJ TAHMİNİDİR, USTA TEYİT EDER");
  await expect(sheet.getByRole("row").filter({ hasText: "Köşe Takımı" })).toContainText("14 m");
  await expect(sheet.getByRole("row").filter({ hasText: "Berjer" })).toContainText("metrajı girilmemiş");
  // no partial total: one piece has no figure
  await expect(sheet).toContainText("usta hesaplar");
  await expect(sheet).toContainText("NUMUNE");

  // the upholsterer scans the QR after cutting and writes the real metres
  const feedback = (await s.getByTestId("gercek-metre-qr").getAttribute("data-href"))!;
  await shop.close();
  const usta = await browser.newPage();
  await usta.goto(feedback);
  await expect(usta.getByRole("heading", { name: /gerçekte kaç metre/ })).toBeVisible();
  await usta.getByPlaceholder("ör. 12,5").fill("abc");
  await usta.getByRole("button", { name: "Kaydet" }).click();
  await expect(usta.getByText(/Metreyi 0,2 ile 200/)).toBeVisible();
  await usta.getByPlaceholder("ör. 12,5").fill("17,5");
  await usta.getByRole("button", { name: "Kaydet" }).click();
  await expect(usta.getByRole("status")).toContainText("kaydedildi");
  await usta.close();

  await page.goto("/panel/rapor?gun=7");
  const cuts = page.getByTestId("rapor-kesim");
  await expect(cuts).toContainText("LUMA-02");
  await expect(cuts).toContainText("17,5 m");
});
