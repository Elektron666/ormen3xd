// BASE=http://localhost:3100 npx tsx scripts/olc-biye.ts
// Ar-Ge A5 (ARGE.md): how much of the piping (biye) stays visible on a phone.
// Every surface is painted black and the piping red; the red pixels are counted
// and the piping's breaks (separate red pieces) too.
// A phone may give a 16-bit depth buffer where a desktop gives 24 bits. Depth
// resolution goes as 1 / (near × 2^bits), so 16 bits at near = n behaves like
// 24 bits at near = n / 256: that is how the phone is imitated here.
import { chromium, devices } from "@playwright/test";

const BASE = process.env.BASE ?? "http://localhost:3100";
// numbers, or "auto" (the near plane the site now picks, lib/three/depth.ts) and "auto/256" (the same on a 16-bit phone)
const NEARS = (process.env.NEARS ?? "0.05,0.000195,auto,auto/256").split(",");

type Stage = { get(): { gl: { render(s: unknown, c: unknown): void; getContext(): WebGL2RenderingContext }; scene: SceneLike; camera: CameraLike; controls?: { target: { x: number; y: number; z: number } } } };
type MeshLike = { isMesh?: boolean; name: string; material: MaterialLike; parent?: MeshLike };
type MaterialLike = { clone(): MaterialLike; color?: { set(v: string): void }; emissive?: { set(v: string): void }; [k: string]: unknown };
type SceneLike = { traverse(cb: (o: MeshLike) => void): void; environment: unknown };
type CameraLike = { near: number; updateProjectionMatrix(): void; position: { x: number; y: number; z: number; set(x: number, y: number, z: number): void }; lookAt(x: number, y: number, z: number): void };

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ ...devices["Pixel 7"] });
  await page.goto(BASE + "/");
  await page.waitForFunction(() => {
    const s = (window as unknown as { __ormenStage?: Stage }).__ormenStage;
    let n = 0;
    s?.get().scene.traverse((o) => o.isMesh && o.name === "biye" && n++);
    return n > 0;
  }, undefined, { timeout: 60_000 });
  await page.waitForTimeout(4000); // the intro turn settles
  for (const view of ["ön", "yan", "alçak"] as const) {
    const out = await page.evaluate(
      ({ nears, view, save }) => {
        const st = (window as unknown as { __ormenStage: Stage }).__ormenStage.get();
        const { gl, scene, camera } = st;
        const ctx = gl.getContext();
        // fixed views around the sofa, at the distance the overview uses
        const p = camera.position;
        const r = Math.hypot(p.x, p.z);
        const a = view === "ön" ? 0 : view === "yan" ? 1.0 : 0.4;
        const y = view === "alçak" ? 0.55 : p.y;
        camera.position.set(r * Math.sin(a), y, r * Math.cos(a));
        camera.lookAt(0, 0.45, 0);
        const saved: [MeshLike, MaterialLike][] = [];
        scene.traverse((o) => {
          if (!o.isMesh) return;
          saved.push([o, o.material]);
          const m = o.material.clone();
          for (const k of ["map", "normalMap", "roughnessMap", "aoMap"]) if (k in m) m[k] = null;
          m.envMapIntensity = 0;
          const welt = o.name === "biye";
          m.color?.set(welt ? "#ff0000" : "#000000");
          m.emissive?.set(welt ? "#ff0000" : "#000000");
          o.material = m;
        });
        const env = scene.environment;
        scene.environment = null;
        const w = ctx.drawingBufferWidth;
        const h = ctx.drawingBufferHeight;
        // the furniture's bounds and the near plane the site would pick (lib/three/depth.ts)
        type Box = { union(b: Box): Box; distanceToPoint(p: unknown): number; applyMatrix4(m: unknown): Box; clone(): Box };
        let box: Box | null = null;
        scene.traverse((o) => {
          const m = o as unknown as { isMesh?: boolean; visible: boolean; layers: { mask: number }; matrixWorld: unknown; geometry: { boundingBox: Box | null; computeBoundingBox(): void } };
          if (!m.isMesh || !(m.layers.mask & 6) || !m.visible) return;
          if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
          const b = m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld);
          box = box ? box.union(b) : b;
        });
        const auto = Math.min(0.5, Math.max(0.02, 0.5 * (box as Box | null)!.distanceToPoint(camera.position)));
        const res = nears.map((token) => {
          const near = token === "auto" ? auto : token === "auto/256" ? auto / 256 : Number(token);
          camera.near = near;
          camera.updateProjectionMatrix();
          gl.render(scene, camera);
          const px = new Uint8Array(w * h * 4);
          ctx.readPixels(0, 0, w, h, ctx.RGBA, ctx.UNSIGNED_BYTE, px);
          const red = new Uint8Array(w * h);
          let count = 0;
          for (let i = 0; i < w * h; i++) if (px[i * 4] > 90 && px[i * 4] > 2.5 * px[i * 4 + 1]) { red[i] = 1; count++; }
          // separate pieces (8-connected), ignoring specks of 1–2 pixels
          const seen = new Uint8Array(w * h);
          let pieces = 0;
          for (let s = 0; s < w * h; s++) {
            if (!red[s] || seen[s]) continue;
            const stack = [s];
            seen[s] = 1;
            let size = 0;
            while (stack.length) {
              const i = stack.pop()!;
              size++;
              const x = i % w, yy = (i - x) / w;
              for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx, ny = yy + dy;
                if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
                const j = ny * w + nx;
                if (red[j] && !seen[j]) { seen[j] = 1; stack.push(j); }
              }
            }
            if (size > 2) pieces++;
          }
          return { token, near, count, pieces, mask: save ? Array.from(red) : [] };
        });
        for (const [o, m] of saved) o.material = m;
        scene.environment = env;
        camera.near = 0.05;
        camera.updateProjectionMatrix();
        return { w, h, res };
      },
      { nears: NEARS, view, save: !!process.env.SAVE },
    );
    const ref = out.res[0].count;
    console.log(`${view} (${out.w}×${out.h}):`);
    if (process.env.SAVE) {
      const sharp = (await import("sharp")).default;
      for (const r of out.res) {
        // red on white, flipped (WebGL reads bottom-up)
        const img = Buffer.alloc(out.w * out.h * 3, 255);
        for (let y = 0; y < out.h; y++) for (let x = 0; x < out.w; x++) if (r.mask[(out.h - 1 - y) * out.w + x]) img.set([200, 30, 30], (y * out.w + x) * 3);
        await sharp(img, { raw: { width: out.w, height: out.h, channels: 3 } }).png().toFile(`${process.env.SAVE}/biye-${view}-${r.token.replace("/", "-")}.png`);
      }
    }
    for (const r of out.res) console.log(`  ${r.token.padEnd(9)} near ${r.near.toPrecision(3).padEnd(9)} biye ${String(r.count).padStart(6)} px (%${((100 * r.count) / ref).toFixed(1)})  parça ${r.pieces}`);
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
