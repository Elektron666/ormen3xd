import { expect, test, type Page } from "@playwright/test";

type StageWindow = Window & {
  __ormenStage?: { get(): { scene: { traverse(cb: (o: { isMesh?: boolean; material?: { name?: string } }) => void): void } } };
};

/** Names of the fabric materials currently on the model. */
async function fabricOnModel(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const stage = (window as StageWindow).__ormenStage;
    if (!stage) return [];
    const names = new Set<string>();
    stage.get().scene.traverse((o) => {
      const n = o.material?.name;
      if (o.isMesh && n?.startsWith("kumas:")) names.add(n.slice(6));
    });
    return [...names];
  });
}

test("vitrin: koltuk görünür, kumaş değişir, bağlantı kombinasyonu taşır", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto("/");
  await expect(page.getByText("LUMA-02").first()).toBeVisible();
  // the model is dressed in its default fabric before it is shown
  await expect.poll(() => fabricOnModel(page)).toEqual(["LUMA-02"]);

  // the panel is a sheet on phones; expand it so the swatches are reachable
  const sheetHandle = page.getByRole("button", { name: "Kumaşları göster" });
  if (await sheetHandle.isVisible()) await sheetHandle.press("Enter");

  await page.getByRole("radio", { name: /PIETRA-03/ }).click();
  // the fabric travels in the layout part of the link (y=model.FABRIC.x.z.rot)
  await expect(page).toHaveURL(/y=moduler-kanepe\.PIETRA-03\./);
  await expect.poll(() => fabricOnModel(page)).toEqual(["PIETRA-03"]);
  await expect(page.getByRole("radio", { name: /PIETRA-03/ })).toHaveAttribute("aria-checked", "true");

  // reopening the link restores the same fabric
  await page.goto("/?k=SIENA-05");
  await expect.poll(() => fabricOnModel(page)).toEqual(["SIENA-05"]);

  expect(errors).toEqual([]);
});

test("ana sayfanın altında yönetim paneline giden küçük bağlantı var", async ({ page }) => {
  await page.goto("/");
  const link = page.getByRole("link", { name: "Yönetim" });
  await expect(link).toHaveAttribute("href", "/panel");
});

test("?olcum gerçek cihaz testi için ölçüm panelini açar; normal ziyarette görünmez", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => fabricOnModel(page)).toEqual(["LUMA-02"]);
  await expect(page.getByRole("region", { name: "Cihaz ölçümü" })).toHaveCount(0);

  await page.goto("/?olcum");
  const panel = page.getByRole("region", { name: "Cihaz ölçümü" });
  await expect(panel).toContainText(/İlk kumaş: \d+,\d sn/);
  await expect(panel).toContainText(/Kalite: (yuksek|orta|dusuk)/);
  await expect(panel.getByRole("button", { name: "Kopyala" })).toBeVisible();
});

test("kollara, minderlere ayrı kumaş; bağlantıda kalır, Tümü geri alır", async ({ page, isMobile }) => {
  test.skip(isMobile, "masaüstü");
  test.setTimeout(150_000);
  await page.goto("/?k=LUMA-02");
  await expect.poll(() => fabricOnModel(page)).toEqual(["LUMA-02"]);
  await page.getByRole("radio", { name: "Minderler" }).click();
  await page.getByRole("radio", { name: /SIENA-05/ }).first().click();
  await page.getByRole("radio", { name: "Kollar" }).click();
  await page.getByRole("radio", { name: /PIETRA-05/ }).first().click();
  await expect(page).toHaveURL(/y=moduler-kanepe\.LUMA-02\.[-\d]+\.[-\d]+\.\d+\.kPIETRA-05(~|%7E)mSIENA-05/);
  await expect.poll(async () => (await fabricOnModel(page)).sort()).toEqual(["LUMA-02", "PIETRA-05", "SIENA-05"]);
  // which parts: the arms really wear PIETRA-05, the seat cushions SIENA-05
  const worn = () =>
    page.evaluate(() => {
      const out: Record<string, string> = {};
      (window as unknown as { __ormenStage: { get(): { scene: { traverse(cb: (o: { isMesh?: boolean; name: string; material?: { name?: string } }) => void): void } } } }).__ormenStage
        .get()
        .scene.traverse((o) => {
          if (o.isMesh && o.material?.name?.startsWith("kumas:")) out[o.name] = o.material.name.slice(6);
        });
      return out;
    });
  await expect.poll(async () => (await worn())["kol-sol"]).toBe("PIETRA-05");
  expect((await worn())["oturum-1"]).toBe("SIENA-05");
  expect((await worn())["govde"]).toBe("LUMA-02");

  // the link opens the same piece with the same zones
  await page.reload();
  await expect.poll(async () => (await fabricOnModel(page)).sort(), { timeout: 30_000 }).toEqual(["LUMA-02", "PIETRA-05", "SIENA-05"]);

  // "Tümü" puts one fabric back on the whole piece
  await page.getByRole("radio", { name: "Tümü" }).click();
  await page.getByRole("radio", { name: /VERSO-02/ }).first().click();
  await expect.poll(() => fabricOnModel(page)).toEqual(["VERSO-02"]);
  await expect(page).not.toHaveURL(/kPIETRA/);
});

test("arama Türkçe karakterlere duyarsız çalışır", async ({ page }) => {
  await page.goto("/");
  const sheetHandle = page.getByRole("button", { name: "Kumaşları göster" });
  if (await sheetHandle.isVisible()) await sheetHandle.press("Enter");
  await page.getByRole("searchbox").fill("lacıvert");
  await expect(page.getByRole("radio")).toHaveCount(1);
  await expect(page.getByRole("radio")).toHaveAccessibleName(/SIENA-06/);
});

test("oda bağlantısı aynı odayı açar, araçlar çalışır", async ({ page, isMobile }) => {
  test.skip(isMobile, "oda paneli masaüstü öncelikli");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?oda=koyu-salon&k=SIENA-01");
  await expect.poll(() => fabricOnModel(page)).toEqual(["SIENA-01"]);
  await page.getByRole("tab", { name: "Oda" }).click();
  await expect(page.getByRole("button", { name: /Koyu ve sıcak salon/ })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("radio", { name: /Köşe/ }).click();
  await expect(page).toHaveURL(/oda=kose\.480x420x270\.tutun\.ceviz/);

  await page.getByRole("button", { name: "Ölçüler" }).click();
  await expect(page.getByText("Genişlik 238 cm")).toBeVisible();

  await page.getByRole("button", { name: "Karşılaştır" }).click();
  await expect(page.getByRole("slider", { name: "Karşılaştırma çizgisi" })).toBeVisible();
  await page.getByRole("tab", { name: "Kumaş" }).click();
  await page.getByRole("radio", { name: /PIETRA-02/ }).click();
  await expect(page.getByRole("slider", { name: "Karşılaştırma çizgisi" })).toHaveAttribute("aria-valuetext", /sağda PIETRA-02/);
  // the left (primary) fabric is unchanged
  await expect.poll(() => fabricOnModel(page)).toContain("SIENA-01");

  expect(errors).toEqual([]);
});

test("plan görünümü ölçüleri gösterir ve bağlantıda saklanır", async ({ page, isMobile }) => {
  test.skip(isMobile, "plan masaüstü öncelikli");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?oda=acik-salon&k=LUMA-03");
  await expect.poll(() => fabricOnModel(page)).toEqual(["LUMA-03"]);
  await page.getByRole("button", { name: "Plan" }).click();
  await expect(page).toHaveURL(/g=plan/);
  // sofa snapped to the back wall with a 3 cm gap: 440 − 3 − 96 = 341 cm in front
  for (const text of ["520 cm", "440 cm", "238 cm", "341 cm"]) await expect(page.getByText(text, { exact: true })).toBeVisible();
  await expect(page.getByText("141 cm", { exact: true })).toHaveCount(2);
  await expect(page.getByText("1 m", { exact: true })).toBeVisible();
  // fabric changes are visible in the plan too
  await page.getByRole("radio", { name: /SIENA-06/ }).click();
  await expect.poll(() => fabricOnModel(page)).toEqual(["SIENA-06"]);
  await page.getByRole("button", { name: "3B" }).click();
  await expect(page).toHaveURL(/g=3b/);
  await expect(page.getByText("341 cm", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("mobilya eklenir, sürüklenir, döndürülür; yerleşim bağlantıya yazılır", async ({ page, isMobile }) => {
  test.skip(isMobile, "yerleşim masaüstü öncelikli");
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?oda=acik-salon&k=LUMA-02&g=plan");
  await expect.poll(() => fabricOnModel(page)).toEqual(["LUMA-02"]);

  await page.getByRole("button", { name: "Mobilya ekle" }).click();
  await page.getByRole("menuitem", { name: /^Berjer 81×84/ }).click();
  await page.getByRole("radio", { name: /SIENA-03/ }).click();
  await expect.poll(async () => (await fabricOnModel(page)).sort()).toEqual(["LUMA-02", "SIENA-03"]);
  await expect(page).toHaveURL(/y=moduler-kanepe\.LUMA-02\.[^_]+_berjer\.SIENA-03\./);

  // drag the armchair (selected, newest piece) to the middle of the room
  const before = new URL(page.url()).searchParams.get("y")!.split("_")[1].split(".");
  const project = (x: number, z: number) =>
    page.evaluate(([x, z]) => {
      type S = { get(): { camera: { position: { clone(): { set(a: number, b: number, c: number): { project(c: unknown): { x: number; y: number } } } } }; gl: { domElement: HTMLCanvasElement } } };
      const s = (window as unknown as { __ormenStage: S }).__ormenStage.get();
      const v = s.camera.position.clone().set(x, 0.5, z).project(s.camera);
      const r = s.gl.domElement.getBoundingClientRect();
      return [r.left + ((v.x + 1) / 2) * r.width, r.top + ((1 - v.y) / 2) * r.height];
    }, [x, z]);
  const [ax, ay] = await project(Number(before[2]) / 100, Number(before[3]) / 100);
  const [bx, by] = await project(0.4, 2.4);
  await page.mouse.move(ax, ay);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(ax + ((bx - ax) * i) / 10, ay + ((by - ay) * i) / 10);
  await page.mouse.up();
  // The piece is grabbed half a metre above the floor; how far that grab point
  // sits from the floor point depends on where the camera is (the intro turn
  // may still be running), so the drop lands near the target, not exactly on it.
  await expect
    .poll(() => {
      const [slug, code, x, z, rot] = new URL(page.url()).searchParams.get("y")!.split("_")[1].split(".");
      return slug === "berjer" && code === "SIENA-03" && rot === "0" && Math.hypot(Number(x) / 100 - 0.4, Number(z) / 100 - 2.4) < 0.35;
    })
    .toBe(true);

  await page.getByRole("button", { name: "Sağa 45° döndür" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("y")?.split("_")[1]).toMatch(/\.45$/);

  // reopening the link restores the whole layout
  await page.reload();
  await expect.poll(async () => (await fabricOnModel(page)).sort()).toEqual(["LUMA-02", "SIENA-03"]);
  expect(errors).toEqual([]);
});

test("köşe takımının L içine konan berjer çakışma sayılmaz", async ({ page, isMobile }) => {
  test.skip(isMobile, "yerleşim masaüstü öncelikli");
  const warning = page.getByText("Bazı mobilyalar üst üste duruyor");
  // berjer in the free corner inside the L (corner on the right)
  await page.goto("/?y=kose-takimi.LUMA-03.0.113.0_berjer.SIENA-04.-20.160.0&g=plan");
  await expect.poll(async () => (await fabricOnModel(page)).sort()).toEqual(["LUMA-03", "SIENA-04"]);
  await expect(warning).toHaveCount(0);
  // the same berjer on the corner's return does overlap
  await page.goto("/?y=kose-takimi.LUMA-03.0.113.0_berjer.SIENA-04.100.160.0&g=plan");
  await expect.poll(async () => (await fabricOnModel(page)).sort()).toEqual(["LUMA-03", "SIENA-04"]);
  await expect(warning).toBeVisible();
});

test("telefonda ilk ekran: kumaş şeridi görünür, araçlar 'Daha fazla' altında", async ({ page, isMobile }) => {
  test.skip(!isMobile, "yalnızca telefon");
  await page.goto("/f/ornek-mobilya");
  await expect.poll(() => fabricOnModel(page), { timeout: 45_000 }).not.toEqual([]);
  const strip = page.getByTestId("hizli-kumaslar");
  await expect(strip).toBeInViewport();
  await expect(page.getByRole("button", { name: "Numune iste" })).toBeInViewport();
  // no piece toolbar until the piece is tapped; the view tools sit behind one button
  await expect(page.getByRole("button", { name: "Çoğalt" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Yakından bak" })).toBeHidden();

  await strip.getByRole("button", { name: /SIENA-03/ }).click();
  await expect.poll(() => fabricOnModel(page)).toEqual(["SIENA-03"]);
  // tapping a swatch does not pull the sheet up
  await expect(page.getByRole("complementary", { name: "Kumaşlar" })).toHaveAttribute("data-expanded", "false");

  await page.getByRole("button", { name: "Daha fazla" }).click();
  await expect(page.getByRole("menuitemcheckbox", { name: "Yakından bak" })).toBeVisible();
  await page.getByRole("menuitemcheckbox", { name: "Ölçüler" }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
});
