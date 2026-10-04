import { expect, type Page } from "@playwright/test";

export async function login(page: Page) {
  await page.goto("/panel");
  await expect(page).toHaveURL(/\/panel\/giris/);
  if (await page.getByText("Panel girişi henüz ayarlanmadı").isVisible()) {
    throw new Error(
      "Sunucuda panel kullanıcısı yok. 3100 portunda elle açılmış bir sunucu varsa kapatın (Playwright kendi sunucusunu demo kullanıcıyla açar) ya da PANEL_DEMO_EMAIL/PANEL_DEMO_PASSWORD ile başlatın.",
    );
  }
  await page.getByLabel("E-posta").fill("demo@ormen.local");
  await page.getByLabel("Şifre").fill("ormen-demo");
  await page.getByRole("button", { name: "Giriş yap" }).click();
  await expect(page.getByRole("heading", { name: "Genel bakış" })).toBeVisible();
}

/** ORMEN fabric codes currently dressed on the 3D scene. */
export function sceneFabrics(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    type O = { isMesh?: boolean; material?: { name?: string } };
    const s = (window as unknown as { __ormenStage?: { get(): { scene: { traverse(cb: (o: O) => void): void } } } }).__ormenStage;
    const names = new Set<string>();
    s?.get().scene.traverse((o) => o.isMesh && o.material?.name?.startsWith("kumas:") && names.add(o.material.name.slice(6)));
    return [...names].sort();
  });
}
