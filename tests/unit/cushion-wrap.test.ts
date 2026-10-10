import { describe, expect, it } from "vitest";
import { createCushionGeometry } from "@/lib/three/procedural/cushion";

describe("kumaş minderin etrafına tek parça sarılır", () => {
  const seat = { w: 0.6, h: 0.15, d: 0.55, r: 0.05 };

  it("ön-üst, ön-alt ve ön-yan ek yerlerinde desen kesintisiz devam eder", () => {
    const g = createCushionGeometry(seat);
    const pos = g.getAttribute("position");
    const uv = g.getAttribute("uv");
    // every seam point on the front half (z > 0) that is not at a three-face corner keeps one UV
    const groups = new Map<string, number[]>();
    for (let i = 0; i < pos.count; i++) {
      const k = `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(i);
    }
    let checked = 0;
    for (const list of groups.values()) {
      if (list.length !== 2) continue; // corners (three faces) are where top meets the end panels
      const z = pos.getZ(list[0]);
      if (z < 0.05) continue; // the loop closes at the back, underneath
      const jump = Math.hypot(uv.getX(list[1]) - uv.getX(list[0]), uv.getY(list[1]) - uv.getY(list[0]));
      // which axes the point lies beyond the inner box on: a seam between two faces has two
      const out = [pos.getX(list[0]) / (seat.w / 2 - seat.r), pos.getY(list[0]) / (seat.h / 2 - seat.r), z / (seat.d / 2 - seat.r)].map((t) => Math.abs(t) > 1.0001);
      // front-top, front-bottom (y, z) and front-side (x, z) seams: no jump; top-side (x, y) is where the end panel starts
      if (out[2] && out[0] !== out[1]) {
        expect(jump).toBeLessThan(1e-6);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("kolda kumaş dış yüzden üste, üstten iç yüze kesintisiz geçer", () => {
    const arm = { w: 0.2, h: 0.55, d: 0.9, r: 0.06, wrap: 2 as const };
    const g = createCushionGeometry(arm);
    const pos = g.getAttribute("position");
    const uv = g.getAttribute("uv");
    const groups = new Map<string, number[]>();
    for (let i = 0; i < pos.count; i++) {
      const k = `${Math.round(pos.getX(i) * 1e5)},${Math.round(pos.getY(i) * 1e5)},${Math.round(pos.getZ(i) * 1e5)}`;
      (groups.get(k) ?? groups.set(k, []).get(k)!).push(i);
    }
    let checked = 0;
    for (const list of groups.values()) {
      if (list.length !== 2) continue;
      // the top's long edges, away from the front and back panels
      if (pos.getY(list[0]) < arm.h / 2 - 0.05 || Math.abs(pos.getZ(list[0])) > arm.d / 2 - 0.08) continue;
      expect(Math.hypot(uv.getX(list[1]) - uv.getX(list[0]), uv.getY(list[1]) - uv.getY(list[0]))).toBeLessThan(1e-6);
      checked++;
    }
    expect(checked).toBeGreaterThan(10);
  });

});
