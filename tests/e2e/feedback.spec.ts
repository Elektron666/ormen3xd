import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// "Geri bildirim gönder" (11 Oct): a visitor sends a few words, ORMEN reads them in the panel.
test("ziyaretçi geri bildirim gönderir, panelde görünür", async ({ page, browser }) => {
  const visitor = await browser.newPage();
  await visitor.goto("/");
  await visitor.getByRole("button", { name: "Geri bildirim" }).click();
  const dialog = visitor.getByRole("dialog", { name: "Geri bildirim" });
  await dialog.getByLabel("Mesajınız").fill("beni 0532 123 45 67 den arayın");
  await expect(dialog.getByText(/kişisel bilgi saklamıyoruz/)).toBeVisible();
  const text = `Yuvarlak puf çok güzel ${Date.now()}`;
  await dialog.getByLabel("Mesajınız").fill(text);
  await dialog.getByRole("button", { name: "Gönder" }).click();
  await expect(dialog.getByText("Bir konu seçin.")).toBeVisible();
  await dialog.getByRole("button", { name: "Beğendim" }).click();
  await dialog.getByRole("button", { name: "Gönder" }).click();
  await expect(dialog.getByRole("status")).toContainText("Teşekkürler");
  await visitor.close();

  await login(page);
  // the visit count sits on the panel's home page
  await expect(page.getByText("Ziyaret (bugün)")).toBeVisible();
  await expect(page.getByRole("link", { name: /^Geri bildirim \d+ son 7 gün$/ })).toBeVisible();
  await page.getByRole("navigation", { name: "Panel" }).getByRole("link", { name: "Geri bildirim", exact: true }).click();
  await expect(page.getByText(text)).toBeVisible();
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
