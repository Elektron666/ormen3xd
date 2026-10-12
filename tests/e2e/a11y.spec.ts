import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { readFileSync } from "node:fs";
import { login } from "./helpers";

// WCAG 2 A/AA check (axe-core) on every page type. Colour contrast,
// labels, roles: anything axe can find automatically.

const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

async function violations(page: Page) {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as unknown as { axe: { run: (d: Document, o: object) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe.run(document, {
      runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
    });
    return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
  });
}

// Gece toplantısı (12 Oct): the newer dialogs and pages, the kiosk and the phone layout too
test.describe("erişilebilirlik: yeni ekranlar ve telefon", () => {
  test("diyaloglar, kiosk, bulunamayan sayfa", async ({ page, isMobile }) => {
    test.setTimeout(180_000);
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Numune iste" })).toBeVisible({ timeout: 60_000 });
    expect(await violations(page), "ana sayfa").toEqual([]);
    for (const [open, name] of [
      [() => page.getByRole("button", { name: "Gerçek boyutta gör" }).click(), "gerçek boyut"],
      [() => page.getByRole("button", { name: /Bize fikir verin/ }).first().click(), "fikir"],
      [() => page.getByRole("button", { name: /Paylaş/ }).first().click(), "paylaş"],
    ] as const) {
      await open();
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(await violations(page), name).toEqual([]);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeHidden();
    }
    if (!isMobile) {
      await page.getByRole("button", { name: /Model değiştir/ }).first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(await violations(page), "model değiştir").toEqual([]);
      await page.keyboard.press("Escape");
    }
    await page.goto("/?kiosk");
    await expect(page.getByRole("button", { name: "Başlamak için dokunun" })).toBeVisible();
    expect(await violations(page), "kiosk").toEqual([]);
    await page.goto("/f/yok-boyle-firma");
    expect(await violations(page), "bulunamadı").toEqual([]);
  });

  test("yeni panel sayfaları", async ({ page, isMobile }) => {
    test.skip(isMobile, "panel masaüstü");
    test.setTimeout(120_000);
    await login(page);
    for (const path of ["/panel/geri-bildirim", "/panel/guvenlik", "/panel/kart-deneme", "/panel/kalibrasyon-karti", "/panel/modeller", "/panel/firmalar"]) {
      await page.goto(path);
      expect(await violations(page), path).toEqual([]);
    }
  });
});

test.describe("erişilebilirlik", () => {
  test.skip(({ isMobile }) => isMobile, "masaüstünde bir kez yeter");

  test("herkese açık sayfalar", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/f/ornek-mobilya");
    await expect(page.getByRole("button", { name: "Numune iste" })).toBeVisible({ timeout: 60_000 });
    expect(await violations(page)).toEqual([]);
    // dialogs load their code when first opened: wait for them, so axe checks the dialog itself
    await page.getByRole("button", { name: "Numune iste" }).click();
    await expect(page.getByRole("dialog", { name: "Numune iste" })).toBeVisible();
    expect(await violations(page)).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
    await page.getByRole("button", { name: "Odamda gör" }).click();
    await expect(page.getByRole("img", { name: "Telefonda açmak için QR kod" })).toBeVisible();
    expect(await violations(page)).toEqual([]);
    await page.goto("/kvkk");
    expect(await violations(page)).toEqual([]);
  });

  test("panel sayfaları", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/panel/giris");
    expect(await violations(page)).toEqual([]);
    await login(page);
    for (const path of ["/panel", "/panel/kumaslar", "/panel/kumaslar/yeni", "/panel/kumaslar/toplu", "/panel/modeller/yeni", "/panel/modeller/yeni?tur=secerek", "/panel/modeller/yeni?tur=dosya", "/panel/firmalar/seed-firm-ornek", "/panel/rapor", "/panel/talepler", "/panel/durum"]) {
      await page.goto(path);
      expect(await violations(page), path).toEqual([]);
    }
  });
});
