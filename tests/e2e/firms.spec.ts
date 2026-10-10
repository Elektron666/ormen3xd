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
    await page.getByRole("checkbox", { name: /^Berjer ORMEN vitrini$/ }).check();
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
    await page.getByRole("link", { name: /3D dosya \(\.glb\) yükle/ }).click();
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
    await expect(page.getByRole("menuitem", { name: /^Berjer 81×84/ })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Modüler Kanepe/ })).toHaveCount(0);
    expect((await request.get("/f/" + slug + "/puf")).status()).toBe(200);
    await page.goto("/");
    await page.getByRole("button", { name: "Mobilya ekle" }).click();
    await expect(page.getByRole("menuitem", { name: /^Berjer 81×84/ })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: /Firma Pufu/ })).toHaveCount(0);

    // A6 card
    await page.goto("/panel/firmalar");
    await page.getByRole("link", { name: firmName }).click();
    const card = await page.getByRole("link", { name: "A6 kart (PDF)" }).getAttribute("href");
    await page.goto(card!);
    await expect(page.getByText("Koltuğunuzu kumaşıyla birlikte görün")).toBeVisible();
    await expect(page.getByRole("img", { name: new RegExp(`/f/${slug} için QR kod`) })).toBeVisible();
  });

  test("askı etiketi: kumaş başına QR, okutunca o kumaş firmanın koltuğunda", async ({ page, browser }) => {
    await login(page);
    await page.goto("/panel/firmalar");
    await page.getByRole("link", { name: /Örnek Mobilya/ }).first().click();
    await page.goto((await page.getByRole("link", { name: "Askı etiketleri (A4)" }).getAttribute("href"))!);
    const first = page.getByTestId("aski-etiketi").filter({ hasText: "SIENA-03" });
    await expect(first).toBeVisible();
    const url = new URL((await first.getByRole("img", { name: "SIENA-03 QR" }).getAttribute("data-href"))!);
    expect(url.pathname).toBe("/f/ornek-mobilya");
    expect(url.searchParams.get("k")).toBe("SIENA-03");
    expect(url.searchParams.has("q")).toBe(true);
    const visitor = await browser.newPage();
    await visitor.goto(url.pathname + url.search);
    await expect.poll(() => sceneFabrics(visitor), { timeout: 45_000 }).toEqual(["SIENA-03"]);
    await visitor.close();
  });

  test("hazır sahne: panelde bağlantıyla eklenir, firma sayfasında kart olur, tek dokunuşla açılır", async ({ page, browser }) => {
    const scene = Buffer.from("y=berjer.SIENA-03.0.50.0&oda=acik-salon").toString("base64url");
    await login(page);
    await page.goto("/panel/firmalar");
    await page.getByRole("link", { name: /Örnek Mobilya/ }).first().click();
    await page.getByRole("button", { name: "+ Sahne ekle" }).click();
    const n = await page.getByRole("textbox", { name: /sahnenin adı/ }).count();
    await page.getByRole("textbox", { name: `${n}. sahnenin adı` }).fill("Zeytin berjer");
    await page.getByRole("textbox", { name: `${n}. sahnenin bağlantısı` }).fill("https://example.com/baska");
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByText(`${n}. sahnenin bağlantısı okunamadı`)).toBeVisible();
    await page.getByRole("textbox", { name: `${n}. sahnenin bağlantısı` }).fill(`http://localhost/p/${scene}`);
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page).toHaveURL(/kaydedildi/);

    const visitor = await browser.newPage();
    await visitor.goto("/f/ornek-mobilya?kiosk");
    await visitor.getByRole("button", { name: "Başlamak için dokunun" }).click();
    const card = visitor.getByRole("region", { name: "Hazır sahneler" }).getByRole("button", { name: "Zeytin berjer" });
    await expect(card).toBeVisible();
    await card.click();
    // the scene opens on the same page, kiosk kept
    await expect(visitor).toHaveURL(/\/f\/ornek-mobilya\?kiosk&y=berjer\.SIENA-03/);
    await visitor.close();
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

  test("firma sayfası seçilen kumaş serileriyle, model kendi serileriyle sınırlanır", async ({ page }) => {
    test.setTimeout(120_000);
    const slug = `seri-${Date.now().toString(36).slice(-5)}`;
    const modelSlug = `pietra-${Date.now().toString(36).slice(-4)}`;
    await login(page);
    // a showcase model offered only in PIETRA
    await page.goto("/panel/modeller/yeni?tur=secerek");
    await page.getByRole("radio", { name: "Berjer" }).click();
    await page.getByLabel("Model adı").fill(`Pietra Berjer ${modelSlug.slice(-4)}`);
    await page.getByLabel("Bağlantı adı").fill(modelSlug);
    await page.locator("label").filter({ hasText: /^PIETRA$/ }).click();
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByRole("status")).toContainText("kaydedildi", { timeout: 30_000 });

    // a firm page showing SIENA and PIETRA only
    await page.goto("/panel/firmalar/yeni");
    await page.getByLabel("Firma adı").fill(`Seri Firma ${slug.slice(-5)}`);
    await page.getByLabel("Bağlantı adı").fill(slug);
    await page.getByRole("checkbox", { name: /^Berjer ORMEN vitrini$/ }).check();
    for (const s of ["SIENA", "PIETRA"]) await page.locator("label").filter({ hasText: new RegExp(`^${s}$`) }).click();
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByRole("status")).toContainText("kaydedildi");

    await page.goto(`/f/${slug}`);
    await expect.poll(() => sceneFabrics(page), { timeout: 45_000 }).not.toEqual([]);
    const codes = await page.locator("[role=radio][data-code]").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? e.textContent ?? ""));
    expect(codes.some((c) => /SIENA/.test(c))).toBe(true);
    expect(codes.some((c) => /LUMA|VERSO/.test(c))).toBe(false);

    // the PIETRA-only model on the ORMEN page: only PIETRA offered
    await page.goto(`/?y=${modelSlug}.PIETRA-01.0.51.0`);
    await expect.poll(() => sceneFabrics(page), { timeout: 45_000 }).toEqual(["PIETRA-01"]);
    await expect(page.getByText(/bu serilerle sunuluyor: PIETRA\./)).toBeVisible();
    const modelCodes = await page.locator("[role=radio][data-code]").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? e.textContent ?? ""));
    expect(modelCodes.length).toBeGreaterThan(0);
    expect(modelCodes.every((c) => /PIETRA/.test(c))).toBe(true);
  });
});
