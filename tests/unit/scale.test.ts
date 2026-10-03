import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { measureUvDensity, textureRepeat } from "@/lib/fabric/scale";
import { createCushionGeometry } from "@/lib/three/procedural/cushion";
import { createArmchair, createModularSofa } from "@/lib/three/procedural/furniture";
import { prepareModel } from "@/lib/three/prepare-model";
import { FABRIC_MATERIAL } from "@/lib/three/constants";

function plane(sizeM: number, uvMax: number) {
  // two triangles, sizeM × sizeM metres, UVs 0..uvMax
  const s = sizeM;
  return measureUvDensity({
    positions: [0, 0, 0, s, 0, 0, s, s, 0, 0, 0, 0, s, s, 0, 0, s, 0],
    uvs: [0, 0, uvMax, 0, uvMax, uvMax, 0, 0, uvMax, uvMax, 0, uvMax],
  });
}

describe("UV density", () => {
  it("measures centimetres per UV unit", () => {
    expect(plane(1, 1).cmPerUv).toBeCloseTo(100, 6);
    expect(plane(2, 1).cmPerUv).toBeCloseTo(200, 6);
    expect(plane(1, 4).cmPerUv).toBeCloseTo(25, 6);
    expect(plane(1, 1).spread).toBeCloseTo(0, 6);
  });

  it("returns NaN when there are no usable UVs", () => {
    expect(Number.isNaN(plane(1, 0).cmPerUv)).toBe(true);
  });

  it("converts to a texture repeat that shows the tile at real size", () => {
    // 1 UV = 100 cm, 2 cm tile → 50 tiles per UV unit
    expect(textureRepeat(100, { w: 2, h: 2 })).toEqual({ x: 50, y: 50 });
    expect(textureRepeat(100, { w: 8, h: 4 })).toEqual({ x: 12.5, y: 25 });
  });
});

describe("procedural upholstery", () => {
  it("lays out cushion UVs at 1 UV unit = 1 m (within 2%)", () => {
    const g = createCushionGeometry({ w: 0.6, h: 0.17, d: 0.7, r: 0.06, bulge: { y: 0.02 } });
    const d = measureUvDensity({
      positions: g.getAttribute("position").array,
      uvs: g.getAttribute("uv").array,
      index: g.index!.array,
    });
    expect(d.cmPerUv).toBeGreaterThan(98);
    expect(d.cmPerUv).toBeLessThan(102);
    expect(d.spread).toBeLessThan(0.15);
  });

  it.each([
    ["modular sofa", createModularSofa],
    ["armchair", createArmchair],
  ])("%s: every fabric part is found and measured at true scale", (_, build) => {
    const prepared = prepareModel(build(), [FABRIC_MATERIAL]);
    expect(prepared.slots.length).toBeGreaterThan(4);
    for (const slot of prepared.slots) {
      expect(slot.cmPerUv).toBeGreaterThan(97);
      expect(slot.cmPerUv).toBeLessThan(103);
    }
    // sits on the floor, centred
    const box = new THREE.Box3().setFromObject(prepared.root);
    expect(box.min.y).toBeCloseTo(0, 4);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 4);
  });

  it("does not mutate the source object (safe to call twice)", () => {
    const src = createArmchair();
    const a = prepareModel(src, [FABRIC_MATERIAL]);
    const b = prepareModel(src, [FABRIC_MATERIAL]);
    expect(src.parent).toBeNull();
    expect(a.slots.length).toBe(b.slots.length);
    expect(a.root.children.length).toBe(1);
  });
});
