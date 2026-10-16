// BASE=http://localhost:3100 npx tsx scripts/tanitim-video.ts
// ORMEN Atelier tanıtım videosu (16 Oct): the site's own 3D scene, filmed frame by frame
// in a browser, with captions in the site's fonts; ffmpeg joins the scenes. Only ORMEN's
// real fabrics (MISSO) appear: a placeholder in a promo would be passed off as a product.
// No music: nothing with a clear licence was at hand. Re-run when real fabrics or the
// real logo arrive.
//
// Output: tanitim/ormen-atelier-tanitim.mp4 (1080 × 1920, 30 fps, H.264), frames in OUT.
import { chromium, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import path from "node:path";
import QRCode from "qrcode";

const BASE = process.env.BASE ?? "http://localhost:3100";
const OUT = process.env.OUT ?? path.resolve("tanitim/kareler");
const FINAL = path.resolve("tanitim/ormen-atelier-tanitim.mp4");
const W = 1080;
const H = 1920;
const FPS = Number(process.env.FPS ?? 30);
const SITE = "atelier.ormentekstil.com.tr";
const XFADE = 0.45;

type Shot = {
  name: string;
  seconds: number;
  /** Page to film; cards are drawn over any page. */
  url?: string;
  card?: (t: number) => string;
  caption?: string;
  /** Camera: theta (around), phi (from above), distance factor, over the shot (start → end). */
  orbit?: { theta: [number, number]; phi?: [number, number]; dist?: [number, number] };
  /** Close-up on the seat: start → end distance in metres. */
  close?: [number, number];
  /** Fabric changes during the shot: [seconds, code]. */
  fabrics?: [number, string][];
  /** Show the code of the fabric on the sofa. */
  chip?: boolean;
};

const ease = (k: number) => k * k * (3 - 2 * k);
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const fade = (t: number, total: number, start = 0.25, len = 0.5) => Math.max(0, Math.min(1, (t - start) / len, (total - t) / 0.35));

const brand = (size: number) => `
  <div style="font-family: var(--font-fraunces), Georgia, serif; font-size:${size}px; letter-spacing:.24em; color:#5c3d2a; line-height:1">ORMEN</div>
  <div style="font-family: var(--font-inter), sans-serif; font-size:${size * 0.24}px; letter-spacing:.42em; color:#6b6963; margin-top:${size * 0.22}px">ATELİER</div>`;

function shots(qr: string): Shot[] {
  return [
    {
      name: "acilis",
      seconds: 3.4,
      url: "/kvkk",
      card: (t) => `
        <div style="position:absolute; inset:0; background: radial-gradient(120% 80% at 50% 35%, #fcfaf6 0%, #f1ece4 60%, #e6dfd4 100%);
          display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center">
          <div style="opacity:${fade(t, 3.4, 0.15, 0.7)}; transform: translateY(${(1 - ease(Math.min(1, t / 1.2))) * 24}px)">${brand(120)}</div>
          <div style="opacity:${fade(t, 3.4, 1.1, 0.7)}; margin-top:90px; font-family: var(--font-fraunces), serif; font-size:64px; line-height:1.2; color:#2a2a28">
            Kumaşı koltuğun<br>üstünde görün</div>
        </div>`,
    },
    {
      name: "kumas",
      seconds: 5,
      url: "/?y=moduler-kanepe.MISSO-02.0.0.0",
      orbit: { theta: [-0.75, -0.25], phi: [1.2, 1.15], dist: [1.05, 0.92] },
      caption: "Gerçek ORMEN kumaşı,<br>gerçek ölçekte",
    },
    {
      name: "degistir",
      seconds: 7,
      url: "/?y=moduler-kanepe.MISSO-02.0.0.0",
      orbit: { theta: [-0.2, 0.45], phi: [1.15, 1.2], dist: [0.95, 0.95] },
      fabrics: [
        [1.0, "MISSO-03"],
        [2.2, "MISSO-01"],
        [3.4, "MISSO-04"],
        [4.6, "MISSO-05"],
        [5.8, "MISSO-06"],
      ],
      chip: true,
      caption: "Tek dokunuşla<br>kumaş değiştirin",
    },
    { name: "chester", seconds: 2.6, url: "/?y=chester-kanepe.MISSO-04.0.0.0", orbit: { theta: [0.55, 0.3], phi: [1.18, 1.18], dist: [1, 0.95] }, caption: "Firmanızın modelleri,<br>ORMEN kumaşlarıyla" },
    { name: "berjer", seconds: 2.4, url: "/?y=chester-berjer.MISSO-06.0.0.0", orbit: { theta: [-0.5, -0.25], phi: [1.2, 1.2], dist: [1.15, 1.1] }, caption: "Firmanızın modelleri,<br>ORMEN kumaşlarıyla" },
    { name: "puf", seconds: 2.4, url: "/?y=yuvarlak-puf.MISSO-05.0.0.0", orbit: { theta: [0.2, 0.5], phi: [1.05, 1.05], dist: [1.5, 1.45] }, caption: "Firmanızın modelleri,<br>ORMEN kumaşlarıyla" },
    { name: "yakin", seconds: 4.6, url: "/?y=moduler-kanepe.MISSO-02.0.0.0", close: [1.9, 1.35], caption: "Dokusu, deseni, yönü" },
    {
      name: "oda",
      seconds: 4.6,
      url: "/?oda=acik-salon&y=moduler-kanepe.MISSO-03.0.0.0",
      orbit: { theta: [0.35, 0.05], phi: [0.98, 1.04], dist: [1.6, 1.45] },
      caption: "Müşteriniz kendi<br>odasında görür",
    },
    {
      name: "kapanis",
      seconds: 5.4,
      url: "/kvkk",
      card: (t) => `
        <div style="position:absolute; inset:0; background: radial-gradient(120% 80% at 50% 35%, #fcfaf6 0%, #f1ece4 60%, #e6dfd4 100%);
          display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; font-family: var(--font-inter), sans-serif">
          <div style="opacity:${fade(t, 99, 0.1, 0.6)}">${brand(96)}</div>
          <div style="opacity:${fade(t, 99, 0.6, 0.6)}; margin-top:110px; font-family: var(--font-fraunces), serif; font-size:66px; line-height:1.15; color:#2a2a28">
            Mobilya firmalarına<br>ücretsiz</div>
          <div style="opacity:${fade(t, 99, 1.1, 0.6)}; margin-top:40px; font-size:34px; line-height:1.45; color:#55544f; max-width:820px">
            Müşteriniz kumaşı koltuğun üstünde görür,<br>numunesini mağazanızdan ister.</div>
          <div style="opacity:${fade(t, 99, 1.7, 0.6)}; margin-top:90px; width:260px; height:260px">${qr}</div>
          <div style="opacity:${fade(t, 99, 1.7, 0.6)}; margin-top:34px; font-size:38px; letter-spacing:.02em; color:#2a2a28">${SITE}</div>
          <div style="opacity:${fade(t, 99, 2.2, 0.6)}; position:absolute; bottom:110px; font-size:24px; letter-spacing:.3em; color:#6b6963">KUMAŞLAR: ORMEN TEKSTİL</div>
        </div>`,
    },
  ];
}

const HIDE_UI = `
  body * { visibility: hidden !important; }
  section.studio-backdrop, section.studio-backdrop canvas, #film, #film * { visibility: visible !important; }
  section.studio-backdrop { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 5; }
  #film { position: fixed; inset: 0; z-index: 20; pointer-events: none; }`;

async function showFabric(page: Page, code: string) {
  await page.getByRole("radio", { name: new RegExp(code), includeHidden: true }).first().dispatchEvent("click");
  await page.waitForFunction(
    (code) => {
      type O = { isMesh?: boolean; material?: { name?: string } };
      const n = new Set<string>();
      (window as unknown as { __ormenStage: { get(): { scene: { traverse(cb: (o: O) => void): void } } } }).__ormenStage
        .get()
        .scene.traverse((o) => o.isMesh && o.material?.name?.startsWith("kumas:") && n.add(o.material.name));
      return n.size === 1 && n.has(`kumas:${code}`);
    },
    code,
    { timeout: 60_000 },
  );
}

/** One frame: camera, overlay, a render, a screenshot. */
async function frame(page: Page, shot: Shot, t: number, file: string, chipCode: string | null) {
  const k = ease(Math.min(1, t / shot.seconds));
  const caption = shot.caption
    ? `<div style="position:absolute; inset:0 0 auto 0; height:620px; background: linear-gradient(#f5f1ea 0%, #f5f1ea 64%, rgba(245,241,234,0) 100%); opacity:${fade(t, shot.seconds)}"></div>
       <div style="position:absolute; top:190px; left:0; right:0; text-align:center; opacity:${fade(t, shot.seconds)}">
         <div style="font-family: var(--font-inter), sans-serif; font-size:24px; letter-spacing:.42em; color:#6b6963">ORMEN ATELİER</div>
         <div style="margin-top:26px; font-family: var(--font-fraunces), serif; font-size:72px; line-height:1.15; color:#2a2a28">${shot.caption}</div>
       </div>`
    : "";
  const chip = chipCode
    ? `<div style="position:absolute; bottom:230px; left:0; right:0; display:flex; justify-content:center">
         <div style="background:rgba(251,249,245,.92); border:1px solid #e4ddd2; border-radius:999px; padding:22px 44px;
           font-family: var(--font-fraunces), serif; font-size:52px; color:#2a2a28; letter-spacing:.02em">${chipCode}</div></div>`
    : "";
  const html = shot.card ? shot.card(t) : caption + chip;
  await page.evaluate(
    ({ html, cam }) => {
      const film = document.getElementById("film")!;
      film.innerHTML = html;
      const st = (window as unknown as { __ormenStage?: { get(): Record<string, unknown> } }).__ormenStage?.get() as
        | {
            scene: { traverse(cb: (o: { isMesh?: boolean; name: string; visible: boolean; layers: { mask: number }; matrixWorld: unknown; geometry?: { boundingBox: unknown; computeBoundingBox(): void } }) => void): void };
            camera: { position: { set(x: number, y: number, z: number): void }; lookAt(x: number, y: number, z: number): void; fov: number; aspect: number };
            controls?: { enabled: boolean };
            invalidate(): void;
          }
        | undefined;
      if (!st || !cam) return new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      if (st.controls) st.controls.enabled = false;
      // the furniture's bounds (furniture layers only), and no selection outline
      type Box = { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number }; union(b: Box): Box; clone(): Box; applyMatrix4(m: unknown): Box };
      let box: Box | null = null;
      st.scene.traverse((o) => {
        if (o.name === "secim") o.visible = false;
        if (!o.isMesh || !(o.layers.mask & 6) || !o.visible || !o.geometry) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        const b = (o.geometry.boundingBox as Box).clone().applyMatrix4(o.matrixWorld);
        box = box ? box.union(b) : b;
      });
      const b = box as Box | null;
      if (!b) return;
      const w = b.max.x - b.min.x;
      const d = b.max.z - b.min.z;
      const h = b.max.y - b.min.y;
      // looking a little above the middle puts the piece below the caption
      const c = { x: (b.min.x + b.max.x) / 2, y: b.min.y + h * 0.62, z: (b.min.z + b.max.z) / 2 };
      if (cam.close) {
        // in front of the middle seat, a little above, sliding sideways while it comes closer
        const tx = c.x + cam.side * 0.25;
        const ty = b.min.y + h * 0.5;
        const tz = b.max.z - d * 0.35;
        st.camera.position.set(tx + cam.side * 0.35, ty + cam.dist * 0.55, tz + cam.dist);
        st.camera.lookAt(tx, ty - 0.05, tz);
      } else {
        // fit the width in the vertical frame
        const hfov = Math.atan(Math.tan((st.camera.fov * Math.PI) / 360) * st.camera.aspect);
        // the width fills 86 % of the frame, the height at most 40 % (tall pieces stay clear of the caption)
        const vfov = (st.camera.fov * Math.PI) / 360;
        const dist = (Math.max(Math.max(w, d) / 2 / Math.tan(hfov) / 0.86, h / 2 / Math.tan(vfov) / 0.4) + d / 2) * cam.dist;
        const x = c.x + dist * Math.sin(cam.phi) * Math.sin(cam.theta);
        const y = c.y + dist * Math.cos(cam.phi);
        const z = c.z + dist * Math.sin(cam.phi) * Math.cos(cam.theta);
        st.camera.position.set(x, y, z);
        st.camera.lookAt(c.x, c.y, c.z);
      }
      st.invalidate();
      return new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    },
    {
      html,
      cam: shot.orbit
        ? { close: false, theta: lerp(shot.orbit.theta[0], shot.orbit.theta[1], k), phi: lerp(...(shot.orbit.phi ?? [1.2, 1.2]), k), dist: lerp(...(shot.orbit.dist ?? [1, 1]), k), side: 0 }
        : shot.close
          ? { close: true, theta: 0, phi: 0, dist: lerp(shot.close[0], shot.close[1], k), side: lerp(-1, 1, k) }
          : null,
    },
  );
  await page.screenshot({ path: file, type: "png" });
}

async function main() {
  const qr = await QRCode.toString(`https://${SITE}`, { type: "svg", margin: 0, color: { dark: "#2a2a28", light: "#00000000" } });
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
  const clips: string[] = [];
  for (const shot of shots(qr)) {
    const dir = path.join(OUT, shot.name);
    mkdirSync(dir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, reducedMotion: "reduce" });
    await page.goto(BASE + shot.url);
    if (!shot.card) {
      const start = new URL(BASE + shot.url).searchParams.get("y")!.split(".")[1];
      await page.waitForFunction(() => !!(window as unknown as { __ormenStage?: unknown }).__ormenStage, null, { timeout: 60_000 });
      // every fabric of the shot loaded once, so the changes on film are instant
      for (const [, code] of shot.fabrics ?? []) await showFabric(page, code);
      if (shot.fabrics?.length) await showFabric(page, start);
      await page.waitForFunction(
        (start) => {
          type O = { isMesh?: boolean; material?: { name?: string } };
          const n = new Set<string>();
          (window as unknown as { __ormenStage: { get(): { scene: { traverse(cb: (o: O) => void): void } } } }).__ormenStage
            .get()
            .scene.traverse((o) => o.isMesh && o.material?.name?.startsWith("kumas:") && n.add(o.material.name));
          return n.size === 1 && n.has(`kumas:${start}`);
        },
        start,
        { timeout: 60_000 },
      );
      await page.waitForTimeout(3500); // the opening turn of the site settles before the film camera takes over
    }
    await page.addStyleTag({ content: HIDE_UI });
    await page.evaluate(() => {
      const f = document.createElement("div");
      f.id = "film";
      document.body.appendChild(f);
    });
    await page.evaluate(() => document.fonts.ready);
    const n = Math.round(shot.seconds * FPS);
    let chipCode = shot.chip ? new URL(BASE + shot.url).searchParams.get("y")!.split(".")[1] : null;
    const pending = [...(shot.fabrics ?? [])];
    for (let i = 0; i < n; i++) {
      const t = i / FPS;
      while (pending.length && pending[0][0] <= t) {
        const [, code] = pending.shift()!;
        await page.getByRole("radio", { name: new RegExp(code), includeHidden: true }).first().dispatchEvent("click");
        if (shot.chip) chipCode = code;
      }
      await frame(page, shot, t, path.join(dir, `${String(i).padStart(4, "0")}.png`), chipCode);
    }
    await page.close();
    const clip = path.join(OUT, `${shot.name}.mp4`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", path.join(dir, "%04d.png"), "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", clip]);
    clips.push(clip);
    console.log(`${shot.name}: ${n} kare`);
  }
  await browser.close();

  // scenes joined with short cross-fades
  const durations = shots(qr).map((s) => s.seconds);
  const args = ["-y", "-loglevel", "error"];
  clips.forEach((c) => args.push("-i", c));
  let filter = "";
  let last = "[0:v]";
  let offset = 0;
  for (let i = 1; i < clips.length; i++) {
    offset += durations[i - 1] - XFADE;
    const out = i === clips.length - 1 ? "[v]" : `[x${i}]`;
    filter += `${last}[${i}:v]xfade=transition=fade:duration=${XFADE}:offset=${offset.toFixed(3)}${out};`;
    last = out;
  }
  mkdirSync(path.dirname(FINAL), { recursive: true });
  if (existsSync(FINAL)) rmSync(FINAL);
  args.push("-filter_complex", filter.replace(/;$/, ""), "-map", "[v]", "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", FINAL);
  execFileSync("ffmpeg", args);
  console.log(`hazır: ${FINAL}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
