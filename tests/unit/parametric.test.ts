import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { DEFAULTS, TIPLER, describeParams, normaliseParams, paramDimensions, validateParams, type ParametricParams } from "@/lib/parametric/spec";
import { buildParametric } from "@/lib/three/procedural/parametric";
import { prepareModel } from "@/lib/three/prepare-model";
import { FABRIC_MATERIAL } from "@/lib/three/constants";

const cases: ParametricParams[] = [
  ...TIPLER.map((t) => DEFAULTS[t]),
  { ...DEFAULTS.kose, koseYonu: "sol" },
  { ...DEFAULTS.uclu, kol: "yok", ayak: "gizli", sirt: "yuksek" },
  { ...DEFAULTS.kose, kol: "yok", genislikCm: 340, koseBoyCm: 280, derinlikCm: 105 },
];

describe("parametric spec", () => {
  it("defaults are valid", () => {
    for (const t of TIPLER) expect(validateParams(DEFAULTS[t]), t).toEqual({});
  });
  it("rejects sizes outside the type's range and a corner without a return", () => {
    expect(Object.keys(validateParams({ ...DEFAULTS.ikili, genislikCm: 400 }))).toEqual(["genislikCm"]);
    expect(validateParams({ ...DEFAULTS.kose, koseBoyCm: 120 }).koseBoyCm).toBeTruthy();
    expect(validateParams({ ...DEFAULTS.kose, koseBoyCm: 150, derinlikCm: 110 }).koseBoyCm).toMatch(/50 cm/);
  });
  it("normalises stored data and falls back to defaults", () => {
    expect(normaliseParams({ tip: "kose", kol: "uydurma", genislikCm: 300.4 })).toEqual({ ...DEFAULTS.kose, genislikCm: 300 });
    expect(normaliseParams({ tip: "masa" })).toBeNull();
    expect(normaliseParams({ tip: "puf", kol: "kalin" })!.kol).toBe("yok");
  });
  it("describes a model in Turkish", () => {
    expect(describeParams(DEFAULTS.kose)).toBe("Köşe takımı · 290 × 220 cm · kalın kol · köşe sağda");
  });
});

describe("parametric builder", () => {
  it.each(cases.map((c) => [describeParams(c) + ` · ${c.ayak} · ${c.sirt}`, c] as const))("%s: real size and real-scale fabric", (_name, p) => {
    const prepared = prepareModel(buildParametric(p), [FABRIC_MATERIAL]);
    const dims = paramDimensions(p);
    // outer size matches what the layout and plan use (cushion bulge and tilt allow a few cm)
    expect(Math.abs(prepared.size.x * 100 - dims.w)).toBeLessThanOrEqual(3);
    expect(Math.abs(prepared.size.z * 100 - dims.d)).toBeLessThanOrEqual(4);
    expect(Math.abs(prepared.size.y * 100 - dims.h)).toBeLessThanOrEqual(4);
    // every upholstered part: 1 UV unit = 1 m of surface
    expect(prepared.slots.length).toBeGreaterThan(0);
    // (the pillow bulge stretches the surface by ~1.6 %, as on the built-in sofa)
    for (const s of prepared.slots) expect(Math.abs(s.cmPerUv - 100)).toBeLessThan(3);
  });

  it("puts the corner on the chosen side", () => {
    const side = (yon: "sol" | "sag") => {
      const prepared = prepareModel(buildParametric({ ...DEFAULTS.kose, koseYonu: yon }), [FABRIC_MATERIAL]);
      // the deepest point (front of the return) is on the corner side
      const box = new THREE.Box3();
      let x = 0, zMax = -Infinity;
      prepared.root.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && o.name === "oturum") {
          box.setFromObject(o);
          if (box.max.z > zMax) { zMax = box.max.z; x = (box.min.x + box.max.x) / 2; }
        }
      });
      return Math.sign(x);
    };
    expect(side("sag")).toBe(1);
    expect(side("sol")).toBe(-1);
  });
});
