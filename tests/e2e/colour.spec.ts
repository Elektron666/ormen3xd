import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { colourDrift, hexToLab } from "@/lib/fabric/color";
import { linearToSrgb, rgbToHex, srgbToLinear } from "@/lib/fabric/maps";
import { buildSeedFabrics } from "@/lib/seed/fabrics";

// Renders fabrics in the neutral studio, zooms in to the weave and compares
// the mean on-screen colour with the mean colour of the fabric photo
// (albedo). Lightness may move a little with lighting; hue and chroma must not.

const SAMPLES = ["LUMA-01", "SIENA-03", "SIENA-05", "PIETRA-05", "VERSO-05"];
const fabrics = new Map(buildSeedFabrics().map((f) => [f.code, f]));

test.describe("renk doğruluğu", () => {
  test.skip(({ isMobile }) => isMobile, "masaüstünde ölçülür");

  for (const code of SAMPLES) {
    test(`${code}: ekrandaki renk dokunun ortalamasına yakın`, async ({ page }, info) => {
      await page.goto(`/?oda=studyo&k=${code}`);
      await expect(page.getByRole("button", { name: "Yakından bak" })).toBeVisible();
      await page.getByRole("button", { name: "Yakından bak" }).click();
      await expect(page.getByRole("button", { name: "Uzaklaş" })).toBeVisible();
      await page.waitForTimeout(2500); // camera move (0.9 s) on a software renderer

      const box = (await page.locator("canvas").boundingBox())!;
      const png = await page.screenshot({
        clip: { x: box.x + box.width / 2 - 120, y: box.y + box.height / 2 - 80, width: 240, height: 160 },
      });
      const { data, info: img } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      const n = img.width * img.height;
      const sum = [0, 0, 0];
      for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) sum[c] += srgbToLinear(data[i * 3 + c] / 255);
      const rendered = rgbToHex(sum.map((v) => linearToSrgb(v / n)) as [number, number, number]);

      const reference = fabrics.get(code)!.texture.avgColor;
      const d = colourDrift(hexToLab(reference), hexToLab(rendered));
      info.annotations.push({
        type: "renk",
        description: `${code}: doku ${reference} → ekran ${rendered} · ΔE00 ${d.deltaE.toFixed(2)} · açıklık ${d.deltaL.toFixed(2)} · ton/doygunluk ${d.chromaHue.toFixed(2)}`,
      });
      console.log(info.annotations.at(-1)!.description);

      expect(d.chromaHue, "ton/doygunluk kayması").toBeLessThan(4);
      expect(d.deltaE, "toplam renk farkı").toBeLessThan(6);
    });
  }
});
