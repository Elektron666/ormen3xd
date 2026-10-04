import { expect, test } from "@playwright/test";
import path from "node:path";
import { login, sceneFabrics } from "./helpers";

const GLB = path.join(__dirname, "../fixtures/ornek-puf.glb");

test.describe("firma sayfaları", () => {
  test.skip(({ isMobile }) => isMobile, "masaüstü öncelikli");

  test("firma sayfası logosu ve rengiyle açılır, paylaşım firmayı taşır", async ({ page, browser }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/f/ornek-mobilya/berjer");
    await expect(page.getByRole("img", { name: "Örnek Mobilya" })).toBeVisible();
    await expect.poll(() => sceneFabrics(page), { timeout: 45_000 }).toEqual(["SIENA-04"]);
    // the firm colour reaches the main button, with readable text on it
    const btn = page.getByRole("button", { name: "Numune iste" });
    await expect(btn).toHaveCSS("background-color", "rgb(31, 78, 74)");
    await expect(btn).toHaveCSS("color", "rgb(255, 255, 255)");

    await page.getByRole("button", { name: "Paylaş", exact: true }).click();
    const url = (await page.locator("dialog p[translate=no]").textContent())!;
    const other = await browser.newPage();
    await other.goto(url);
    await expect(other.getByRole("img", { name: "Örnek Mobilya" })).toBeVisible();
    await other.close();
    expect(errors).toEqual([]);
  });

  test("bilinmeyen firma 404", async ({ request }) => {
    expect((await request.get("/f/olmayan-firma")).status()).toBe(404);
    expect((await request.get("/f/ornek-mobilya/olmayan-model")).status()).toBe(404);
  });

  test("panelde firma açılır, özel model eklenir; QR ve kart hazır", async ({ page, request }) => {
    test.setTimeout(120_000);
    const slug = `deneme-${Date.now().toString(36).slice(-5)}`;
    const firmName = `Deneme Mobilya ${slug.slice(-5)}`;
    await login(page);
    await page.goto("/panel/firmalar/yeni");
    await page.getByLabel("Firma adı").fill(firmName);
    await page.getByLabel("Bağlantı adı").fill(slug);
    await page.getByLabel("WhatsApp numarası").fill("0532 765 43 21");
    await page.getByLabel("Renk kodu").fill("#7A2E2E");
    await page.getByRole("checkbox", { name: "Berjer" }).check();
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByRole("status")).toContainText(`${firmName} kaydedildi`);
    await expect(page.getByTestId("firma-baglantisi")).toHaveText(new RegExp(`/f/${slug}$`));

    // QR files (signed-in only)
    const svg = await page.request.get(`/api/panel/qr?yol=/f/${slug}&bicim=svg`);
    expect(svg.headers()["content-type"]).toContain("image/svg+xml");
    const png = await page.request.get(`/api/panel/qr?yol=/f/${slug}&bicim=png`);
    expect((await png.body()).subarray(1, 4).toString()).toBe("PNG");
    expect((await page.request.get(`/api/panel/qr?yol=/disari&bicim=svg`)).status()).toBe(400);
    expect((await request.get(`/api/panel/qr?yol=/f/${slug}&bicim=svg`)).status()).toBe(401);

    // firm-only model
    await page.getByRole("link", { name: "Bu firmaya özel model ekle" }).click();
    await page.getByLabel("Model dosyası").setInputFiles(GLB);
    await expect(page.getByRole("checkbox", { name: /kumas/ })).toBeChecked({ timeout: 30_000 });
    await page.getByLabel("Model adı").fill("Firma Pufu");
    await page.getByLabel("Bağlantı adı").fill("puf");
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByRole("status")).toContainText("kaydedildi", { timeout: 30_000 });
    await expect(page.getByRole("listitem").filter({ hasText: "Firma Pufu" })).toContainText("firmaya özel");

    // the firm page shows its own model and the picked showcase model, the ORMEN page does not show the firm model
    await page.goto(`/f/${slug}`);
    await page.getByRole("button", { name: "Mobilya ekle" }).click();
    await expect(page.getByRole("menuitem", { name: /Firma Pufu/ })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Berjer/ })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Modüler Kanepe/ })).toHaveCount(0);
    expect((await request.get("/f/" + slug + "/puf")).status()).toBe(200);
    await page.goto("/");
    await page.getByRole("button", { name: "Mobilya ekle" }).click();
    await expect(page.getByRole("menuitem", { name: /Berjer/ })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Firma Pufu/ })).toHaveCount(0);

    // A6 card
    await page.goto("/panel/firmalar");
    await page.getByRole("link", { name: firmName }).click();
    const card = await page.getByRole("link", { name: "A6 kart (PDF)" }).getAttribute("href");
    await page.goto(card!);
    await expect(page.getByText("Koltuğunuzu kumaşıyla birlikte görün")).toBeVisible();
    await expect(page.getByRole("img", { name: new RegExp(`/f/${slug} için QR kod`) })).toBeVisible();
  });

  test("firma sayfasından gelen numune talebi firmaya yazılır", async ({ page, request }) => {
    const name = `Firma Talebi ${Date.now().toString(36)}`;
    const res = await request.post("/api/samples", {
      data: { name, phone: "0532 123 45 67", consent: true, fabricCodes: ["SIENA-04"], firmSlug: "ornek-mobilya" },
    });
    expect(res.status()).toBe(201);
    await login(page);
    await page.goto("/panel/talepler");
    await expect(page.getByRole("listitem").filter({ hasText: name })).toContainText("Firma: Örnek Mobilya");
  });
});
