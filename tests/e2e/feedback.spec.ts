import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// "Bize fikir verin" (11 Oct): anonymous by default; a firm that wants an answer leaves its name and phone.
test("ziyaretçi fikrini isimsiz gönderir, panelde görünür", async ({ page, browser }) => {
  const visitor = await browser.newPage();
  await visitor.goto("/");
  await visitor.getByRole("button", { name: "Bize fikir verin" }).click();
  const dialog = visitor.getByRole("dialog", { name: "Bize fikir verin" });
  await dialog.getByLabel("Fikriniz").fill("beni 0532 123 45 67 den arayın");
  await expect(dialog.getByText(/iletişim bilgilerini yukarıdaki alanlara/)).toBeVisible();
  const text = `Yuvarlak puf çok güzel ${Date.now()}`;
  await dialog.getByLabel("Fikriniz").fill(text);
  await dialog.getByRole("button", { name: "Gönder" }).click();
  await expect(dialog.getByText("Bir konu seçin.")).toBeVisible();
  await dialog.getByRole("button", { name: "Beğendim" }).click();
  await dialog.getByRole("button", { name: "Gönder" }).click();
  await expect(dialog.getByRole("status")).toContainText("Teşekkürler");
  await visitor.close();

  await login(page);
  // the visit count sits on the panel's home page
  await expect(page.getByText("Ziyaret (bugün)")).toBeVisible();
  await expect(page.getByRole("link", { name: /^Fikirler \d+ son 7 gün/ })).toBeVisible();
  await page.getByRole("navigation", { name: "Panel" }).getByRole("link", { name: "Fikirler", exact: true }).click();
  await expect(page.getByText(text)).toBeVisible();
});

test("dönüş isteyen firma adını, adını ve telefonunu onayla bırakır; panelde aranabilir", async ({ page, browser }) => {
  const visitor = await browser.newPage();
  await visitor.goto("/");
  await visitor.getByRole("button", { name: "Bize fikir verin" }).click();
  const dialog = visitor.getByRole("dialog", { name: "Bize fikir verin" });
  await dialog.getByRole("button", { name: "Önerim var" }).click();
  const text = `Kütük kol eklensin ${Date.now()}`;
  await dialog.getByLabel("Fikriniz").fill(text);
  await dialog.getByRole("textbox", { name: "Firma adı" }).fill("Yıldız Mobilya");
  await dialog.getByRole("textbox", { name: "Ad soyad" }).fill("Kemal Yıldız");
  await dialog.getByRole("textbox", { name: "Telefon" }).fill("0533 222 11 00");
  await dialog.getByRole("button", { name: "Gönder" }).click();
  await expect(dialog.getByRole("alert")).toContainText("onay kutusunu");
  await dialog.getByRole("checkbox", { name: /kabul ediyorum/ }).check();
  await dialog.getByRole("button", { name: "Gönder" }).click();
  await expect(dialog.getByRole("status")).toContainText("Size telefonla döneceğiz");
  await visitor.close();

  await login(page);
  await page.goto("/panel/geri-bildirim");
  const item = page.getByRole("listitem").filter({ hasText: text });
  await expect(item).toContainText("Kemal Yıldız");
  await expect(item).toContainText("Yıldız Mobilya");
  await expect(item.getByRole("link", { name: "0533 222 11 00" })).toHaveAttribute("href", "tel:+905332221100");
});

test("panelde Güvenlik sayfası: örnek veri modunda iki adımlı doğrulama yok der", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Güvenlik" }).click();
  await expect(page.getByRole("heading", { name: "İki adımlı doğrulama" })).toBeVisible();
  await expect(page.getByText("Supabase bağlıyken çalışır")).toBeVisible();
  // the code step cannot be opened without a password session
  await page.context().clearCookies();
  await page.goto("/panel/giris/dogrulama");
  await expect(page).toHaveURL(/\/panel\/giris$/);
});

test("panelde kumaşın düz ölçek ve dikiş kontrolü gerçek boyutta açılır", async ({ page, isMobile }) => {
  test.skip(isMobile, "panel masaüstü");
  await login(page);
  await page.goto("/panel/kumaslar");
  await page.getByRole("link", { name: /MISSO-05/ }).first().click();
  await page.getByRole("checkbox", { name: "Ölçek kontrol (10 cm)" }).check();
  const flat = page.getByTestId("duz-olcek");
  await expect(flat).toBeVisible();
  // 18.4 cm at the CSS reference size is ≈ 695 px: the window is capped and shows the tile corner
  const box = (await flat.boundingBox())!;
  expect(Math.round(box.width)).toBeGreaterThan(500);
  await expect(page.getByText("Rapor: 18.4 × 91.5 cm.")).toBeVisible();
  await flat.screenshot({ path: "test-results/duz-olcek.png" });
});

// Ar-Ge A1 (ARGE.md): a photo with the calibration card, taken at an angle; the panel finds the
// card, flattens the window and fills in the real size by itself.
test("kalibrasyon kartlı fotoğraf: ölçek ve açı karttan gelir", async ({ page, isMobile }) => {
  test.skip(isMobile, "panel masaüstü");
  test.setTimeout(120_000);
  const { photo } = await import("../fixtures/card-photo");
  const sharp = (await import("sharp")).default;
  const { px } = photo([[420, 140], [980, 110], [1080, 1020], [300, 990]]);
  const png = await sharp(Buffer.from(px.data), { raw: { width: px.width, height: px.height, channels: 4 } }).png().toBuffer();
  await login(page);
  await page.goto("/panel/kalibrasyon-karti");
  await expect(page.getByRole("img", { name: "ORMEN kalibrasyon kartı" })).toBeVisible();
  await page.goto("/panel/kumaslar/yeni");
  await page.getByRole("checkbox", { name: /kalibrasyon kartı var/ }).check();
  await page.getByLabel("Kumaş tipi").selectOption("dokuma");
  await page.getByLabel("Kumaş fotoğrafı").setInputFiles({ name: "kartli.png", mimeType: "image/png", buffer: png });
  await expect(page.getByText(/Kart bulundu/)).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/kâğıdına göre dengelendi/)).toBeVisible();
  await expect(page.getByLabel("Fotoğraftaki alanın eni (cm)")).toHaveValue("14.2");
  await expect(page.getByLabel("Boyu (cm)")).toHaveValue("14.2");
});
