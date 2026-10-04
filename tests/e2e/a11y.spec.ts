import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { login } from "./helpers";

// WCAG 2 A/AA check (axe-core) on every page type. Colour contrast,
// labels, roles: anything axe can find automatically.

const AXE = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

async function violations(page: Page) {
  await page.addScriptTag({ content: AXE });
  return page.evaluate(async () => {
    const r = await (window as unknown as { axe: { run: (d: Document, o: object) => Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }> } }).axe.run(document, {
      runOnly: ["wcag2a", "wcag2aa"],
    });
    return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`);
  });
}

test.describe("erişilebilirlik", () => {
  test.skip(({ isMobile }) => isMobile, "masaüstünde bir kez yeter");

  test("herkese açık sayfalar", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/f/ornek-mobilya");
    await expect(page.getByRole("button", { name: "Numune iste" })).toBeVisible({ timeout: 60_000 });
    expect(await violations(page)).toEqual([]);
    await page.getByRole("button", { name: "Numune iste" }).click();
    expect(await violations(page)).toEqual([]);
    await page.keyboard.press("Escape");
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
    for (const path of ["/panel", "/panel/kumaslar", "/panel/kumaslar/yeni", "/panel/kumaslar/toplu", "/panel/modeller/yeni", "/panel/modeller/yeni?tur=secerek", "/panel/modeller/yeni?tur=dosya", "/panel/firmalar/seed-firm-ornek", "/panel/rapor", "/panel/talepler"]) {
      await page.goto(path);
      expect(await violations(page), path).toEqual([]);
    }
  });
});
