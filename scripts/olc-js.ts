// BASE=http://localhost:3100 npx tsx scripts/olc-js.ts
// Gece toplantısı (12 Oct): how much JavaScript a phone downloads to open the home page,
// before and after the 3D scene. Sizes as sent over the wire (compressed), in kB.
import { chromium, devices } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3100";

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
  const runs: { load: number; total: number; files: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const page = await browser.newPage({ ...devices["Pixel 7"] });
    const scripts: Promise<{ size: number; atLoad: boolean }>[] = [];
    let loaded = false;
    page.on("load", () => (loaded = true));
    page.on("requestfinished", (req) => {
      if (req.resourceType() !== "script") return;
      const atLoad = !loaded;
      scripts.push(req.sizes().then((s) => ({ size: s.responseBodySize + s.responseHeadersSize, atLoad })));
    });
    await page.goto(BASE + "/", { waitUntil: "load" });
    await page.waitForTimeout(8000); // the scene and its code arrive after load
    const all = await Promise.all(scripts);
    runs.push({
      load: all.filter((s) => s.atLoad).reduce((a, s) => a + s.size, 0) / 1024,
      total: all.reduce((a, s) => a + s.size, 0) / 1024,
      files: all.length,
    });
    await page.close();
  }
  await browser.close();
  const r = runs.sort((a, b) => a.total - b.total)[1];
  console.log(`JS (telefon, ana sayfa): açılışta ${r.load.toFixed(0)} kB, 3B sahneyle toplam ${r.total.toFixed(0)} kB, ${r.files} dosya`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
