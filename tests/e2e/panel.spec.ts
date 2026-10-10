import { expect, test } from "@playwright/test";
import { login, sceneFabrics } from "./helpers";
import path from "node:path";

const GLB = path.join(__dirname, "../fixtures/ornek-puf.glb");
const PHOTO = path.join(__dirname, "../../public/seed/fabrics/siena/siena-04-albedo-2k.webp");

test.describe("panel", () => {
  test.skip(({ isMobile }) => isMobile, "panel masaüstü için");

  test("giriş olmadan panel ve yükleme kapalı", async ({ page, request }) => {
    await page.goto("/panel/kumaslar");
    await expect(page).toHaveURL(/\/panel\/giris/);
    expect((await request.post("/api/panel/dosya?hazirla", { data: { path: "kumaslar/x/y.webp" } })).status()).toBe(401);
    expect((await request.get("/api/panel/talepler")).status()).toBe(401);

    // the redirect response itself must not carry panel data (a layout-only check would leak it)
    const name = `Sizinti Testi ${Date.now().toString(36)}`;
    await request.post("/api/samples", { data: { name, phone: "0532 987 65 43", consent: true, fabricCodes: ["LUMA-02"] } });
    for (const cookie of [undefined, "ormen_panel=sahte.imza"]) {
      for (const path of ["/panel/talepler", "/panel/rapor", "/panel"]) {
        const r = await request.get(path, { maxRedirects: 0, headers: cookie ? { cookie } : {} });
        expect(r.status(), path).toBe(307);
        const body = await r.text();
        expect(body, path).not.toContain(name);
        expect(body, path).not.toContain("5329876543");
      }
    }
  });

  test("yer tutucuları toplu kaldırma iki adımla sorulur", async ({ page }) => {
    await login(page);
    await page.goto("/panel/kumaslar");
    // only the confirmation is exercised: actually hiding would empty the shared demo catalogue for other tests
    await page.getByRole("button", { name: "Yer tutucuları yayından kaldır" }).click();
    await expect(page.getByText(/kumaş sitede görünmez olacak/)).toBeVisible();
    await page.getByRole("button", { name: "Vazgeç" }).click();
    await expect(page.getByRole("button", { name: "Yer tutucuları yayından kaldır" })).toBeVisible();
  });

  test("fotoğraftan yeni kumaş eklenir ve konfigüratörde görünür", async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const code = `DENEME-${Date.now().toString(36).slice(-4).toUpperCase()}`;
    await login(page);
    await page.goto("/panel/kumaslar/yeni");
    await page.getByLabel("Kumaş fotoğrafı").setInputFiles(PHOTO);
    await page.getByLabel("Fotoğraftaki alanın eni (cm)").fill("12");
    await page.getByLabel("Kumaş kodu").fill(code.toLowerCase());
    await page.getByLabel("Seri").fill("DENEME");
    await page.getByLabel("Renk adı").fill("Kum");
    await page.getByLabel("Kumaş tipi").selectOption("dokuma");
    await expect(page.getByText(/Ortalama renk #|kenarları birbirini tutmuyor/)).toBeVisible({ timeout: 60_000 });
    // the height follows the photo's proportions (square photo → 12 cm)
    await expect(page.getByLabel("Boyu (cm)")).toHaveValue("12");
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByRole("status")).toContainText(`${code} kaydedildi`, { timeout: 60_000 });
    await expect(page.getByRole("link", { name: new RegExp(code) })).toBeVisible();

    await page.goto(`/?y=moduler-kanepe.${code}.0.51.0`);
    await expect
      .poll(
        () => sceneFabrics(page),
        { timeout: 45_000 },
      )
      .toEqual([code]);
    expect(errors).toEqual([]);
  });

  test("numune talebi panelde listelenir ve CSV olarak iner", async ({ page, request }) => {
    const name = `Deneme ${Date.now().toString(36)}`;
    const res = await request.post("/api/samples", {
      data: { name, phone: "0532 123 45 67", consent: true, fabricCodes: ["LUMA-02"], link: "https://evil.example/x" },
    });
    expect(res.ok()).toBe(true);
    await login(page);
    await page.goto("/panel/talepler");
    const item = page.getByRole("listitem").filter({ hasText: name });
    await expect(item).toContainText("LUMA-02");
    await expect(item.getByRole("link", { name: "Seçimi aç" })).toHaveCount(0);
    const csv = await page.request.get("/api/panel/talepler");
    expect(csv.headers()["content-disposition"]).toContain("numune-talepleri");
    expect(await csv.text()).toContain(name);
  });

  test("numune: adım, lot, etiket; mağaza QR'dan siparişe döndü der", async ({ page, browser, request }) => {
    const name = `Etiket ${Date.now().toString(36)}`;
    const res = await request.post("/api/samples", { data: { name, phone: "0532 765 43 21", consent: true, fabricCodes: ["LUMA-02", "SIENA-03"] } });
    expect(res.ok()).toBe(true);
    await login(page);
    await page.goto("/panel/talepler");
    const item = page.getByRole("listitem").filter({ hasText: name });
    const code = (await item.getByText(/^N-[0-9A-Z]{6}$/).textContent())!;
    await expect(item.getByTestId("talep-adim")).toHaveText("Yeni");

    // ORMEN prepares it and writes the lot
    await item.getByLabel("Adım").selectOption("hazirlaniyor");
    await item.getByLabel(/^Lot/).fill("P-118");
    await item.getByRole("button", { name: "Kaydet" }).click();
    await expect(item.getByRole("button", { name: "Kaydet" })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("listitem").filter({ hasText: name }).getByTestId("talep-adim")).toHaveText("Hazırlanıyor");

    // one label per fabric, with code and lot, nothing about the customer
    const label = await page.context().newPage();
    await label.goto(`/panel/etiket/${(await item.getByRole("link", { name: "Numune etiketi" }).getAttribute("href"))!.split("/").pop()}`);
    await expect(label.getByTestId("numune-etiketi")).toHaveCount(2);
    await expect(label.getByTestId("numune-etiketi").first()).toContainText("P-118");
    await expect(label.getByTestId("numune-etiketi").first()).toContainText(code);
    await expect(label.locator("body")).not.toContainText(name);

    // the shop scans the QR (not signed in): no personal data, one button
    const shop = await browser.newContext();
    const s = await shop.newPage();
    await s.goto(`/n/${code.toLowerCase()}`);
    await expect(s.getByRole("heading", { name: code })).toBeVisible();
    await expect(s.locator("body")).not.toContainText(name);
    await expect(s.locator("body")).not.toContainText("765");
    await s.getByRole("button", { name: "Bu numuneyle sipariş verildi" }).click();
    await expect(s.getByRole("status")).toContainText("siparişe dönmüş");
    await expect(s.getByTestId("numune-adim")).toHaveText("Siparişe döndü");
    await shop.close();

    await page.reload();
    await expect(page.getByRole("listitem").filter({ hasText: name }).getByTestId("talep-adim")).toHaveText("Siparişe döndü");

    // the pilot measures: lot written and orders, over the samples that went out
    await page.goto("/panel/rapor?gun=7");
    const flow = page.getByTestId("rapor-akis");
    await expect(flow).toContainText("Numune akışı");
    await expect(flow.getByText("Lot yazılan").locator("..")).toContainText(/[1-9]\d*\/[1-9]/);
    await expect(flow.getByText("Siparişe döndü").locator("..")).toContainText(/[1-9]\d*\/[1-9]/);
    await page.goto("/panel/talepler");

    // a KVKK deletion request: gone for good after a confirmation
    const done = page.getByRole("listitem").filter({ hasText: name });
    await done.getByRole("button", { name: "Sil", exact: true }).click();
    await done.getByRole("button", { name: "Evet, sil" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: name })).toHaveCount(0);
    expect((await request.get("/n/N-0000000")).status()).toBe(404);
  });

  test("toplu aktarım CSV satırlarını denetler", async ({ page }) => {
    await login(page);
    await page.goto("/panel/kumaslar/toplu");
    const csv = "kod;seri;renk;renk_ailesi;tip;tekrar_en_cm;fotograf\nLUMA-02;LUMA;Krem;krem;bukle;10;\nYENI-01;YENI;Gri;gri;dokuma;10;yeni.jpg\nBOZUK;;;;;;\n";
    await page.getByLabel("CSV dosyası").setInputFiles({ name: "liste.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText("zaten katalogda");
    await expect(rows.nth(1)).toContainText("“yeni.jpg” bulunamadı");
    await expect(page.getByRole("button", { name: "0 kumaşı aktar" })).toBeDisabled();
  });

  test("GLB model yüklenir, malzemesi seçilir ve konfigüratörde açılır", async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const slug = `puf-${Date.now().toString(36).slice(-4)}`;
    await login(page);
    await page.goto("/panel/modeller/yeni?tur=dosya");
    await page.getByLabel("Model dosyası").setInputFiles(GLB);
    await expect(page.getByText("54 cm").first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole("checkbox", { name: /kumas/ })).toBeChecked();
    await expect(page.getByRole("checkbox", { name: /ayak/ })).not.toBeChecked();
    await page.getByLabel("Model adı").fill("Deneme Puf");
    await page.getByLabel("Bağlantı adı").fill(slug);
    await page.getByLabel("Açılışta gösterilecek kumaş").selectOption("SIENA-03");
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByRole("status")).toContainText("Deneme Puf kaydedildi", { timeout: 30_000 });

    await page.goto(`/?y=${slug}.SIENA-03.0.51.0`);
    await expect
      .poll(
        () => sceneFabrics(page),
        { timeout: 45_000 },
      )
      .toEqual(["SIENA-03"]);
    expect(errors).toEqual([]);
  });

  test("seçerek model oluşturulur ve konfigüratörde açılır", async ({ page }) => {
    test.setTimeout(120_000);
    const slug = `uclu-${Date.now().toString(36).slice(-4)}`;
    await login(page);
    await page.goto("/panel/modeller/yeni");
    await page.getByRole("link", { name: /Seçerek oluştur/ }).click();
    await page.getByRole("radio", { name: "Üçlü kanepe" }).click();
    await page.getByRole("radio", { name: "Kolsuz" }).click();
    // out of range is caught before saving
    await page.getByRole("spinbutton").first().fill("400");
    await expect(page.getByText("Genişlik 180–270 cm arasında olmalı.")).toBeVisible();
    await page.getByRole("spinbutton").first().fill("240");
    await expect(page.getByText("Dış ölçü:")).toContainText("240 × 95 × 82 cm");
    // the firm's own height and a fixed back with a bench seat, as in its photos
    await page.getByRole("spinbutton").nth(2).fill("88");
    await expect(page.getByText("Dış ölçü:")).toContainText("240 × 95 × 88 cm");
    await expect(page.getByRole("radio", { name: "Orta" })).toHaveAttribute("aria-checked", "false");
    await page.getByRole("radio", { name: "Sabit (tek parça)" }).click();
    await page.getByRole("radio", { name: "Tek parça minder" }).click();
    await page.getByLabel("Bağlantı adı").fill(slug);
    await page.getByRole("button", { name: "Kaydet" }).click();
    await expect(page.getByRole("status")).toContainText("kaydedildi", { timeout: 30_000 });
    await expect(page.getByRole("listitem").filter({ hasText: "Üçlü kanepe · 240 × 95 cm · kolsuz · sabit sırt · tek parça oturum · 88 cm yükseklik" }).first()).toBeVisible();

    await page.goto(`/?y=${slug}.SIENA-05.0.51.0`);
    await expect.poll(() => sceneFabrics(page), { timeout: 45_000 }).toEqual(["SIENA-05"]);
  });

  test("seçerek: hazır stil tek tıkla seçer, firmanın fotoğrafı yüklenmeden yanına konur", async ({ page }) => {
    await login(page);
    await page.goto("/panel/modeller/yeni?tur=secerek");
    await page.getByRole("radio", { name: "Üçlü kanepe" }).click();
    await page.getByRole("radio", { name: "Chester", exact: true }).click();
    for (const name of ["Chester", "Kıvrık (Chester)", "Kapitone (düğmeli)", "Ahşap konik"]) await expect(page.getByRole("radio", { name, exact: true })).toHaveAttribute("aria-checked", "true");
    // changing one choice: no longer exactly the style
    await page.getByRole("radio", { name: "İnce metal" }).click();
    await expect(page.getByRole("radio", { name: "Chester", exact: true })).toHaveAttribute("aria-checked", "false");

    const uploads: string[] = [];
    page.on("request", (r) => {
      if (r.method() !== "GET") uploads.push(r.url());
    });
    await page.getByText("Firmanın fotoğrafını koy").locator("input").setInputFiles(PHOTO);
    await expect(page.getByRole("img", { name: "Firmanın fotoğrafı" })).toBeVisible();
    await page.getByRole("radio", { name: "Üstüne bindir" }).click();
    await expect(page.getByRole("img", { name: "Firmanın fotoğrafı" })).toHaveCount(0);
    await expect(page.getByLabel("Saydamlık")).toBeVisible();
    // fixed angles to line the preview up with the photo
    await expect(page.getByRole("group", { name: "Bakış açısı" }).getByRole("button")).toHaveText(["Soldan çapraz", "Önden", "Sağdan çapraz", "Yandan"]);
    await page.getByRole("button", { name: "Önden" }).click();
    await page.getByRole("button", { name: "Kaldır" }).click();
    await expect(page.getByText("Firmanın fotoğrafını koy")).toBeVisible();
    expect(uploads).toEqual([]);
  });

  test("kurulum durumu eksikleri söyler", async ({ page }) => {
    await login(page);
    await page.goto("/panel/durum");
    const list = page.getByTestId("kurulum-listesi");
    await expect(list.getByRole("heading", { name: "Supabase bağlantısı" })).toBeVisible();
    await expect(list.getByRole("heading", { name: "KVKK aydınlatma metni" })).toBeVisible();
    // without Supabase the connection is flagged, with a fix
    await expect(list.locator("li").filter({ hasText: "Supabase bağlantısı" })).toContainText("Supabase projesini açıp");
    // the fabric line reflects the catalogue (placeholders only, or the real ones other tests uploaded)
    await expect(list.locator("li").filter({ hasText: "Kumaşlar" })).toContainText(/yer tutucu|gerçek kumaş/);
  });
});
