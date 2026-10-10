import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { DEFAULTS, TIPLER, describeParams, normaliseParams, paramDimensions, paramFloorRects, shapeName, validateParams, type ParametricParams } from "@/lib/parametric/spec";
import { buildParametric } from "@/lib/three/procedural/parametric";
import { prepareModel } from "@/lib/three/prepare-model";
import { FABRIC_MATERIAL } from "@/lib/three/constants";
import { createCushionGeometry, tuftPoints } from "@/lib/three/procedural/cushion";

const cases: ParametricParams[] = [
  ...TIPLER.map((t) => DEFAULTS[t]),
  { ...DEFAULTS.kose, solUc: "kose", sagUc: "kol" },
  { ...DEFAULTS.uclu, kol: "yok", ayak: "gizli", sirt: "yuksek" },
  { ...DEFAULTS.kose, kol: "yok", genislikCm: 340, sagBoyCm: 280, derinlikCm: 105 },
  // U, chaise sofa, corner + chaise
  { ...DEFAULTS.kose, solUc: "kose", sagUc: "kose", genislikCm: 360, solBoyCm: 200, sagBoyCm: 240 },
  { ...DEFAULTS.kose, solUc: "kol", sagUc: "sezlong", genislikCm: 260, sagBoyCm: 165, ayak: "metal" },
  { ...DEFAULTS.kose, solUc: "sezlong", sagUc: "kose", genislikCm: 320, solBoyCm: 160, sagBoyCm: 230, kol: "ince" },
  // the firm's own height, fixed back, bench seat (closer to real models from photos)
  { ...DEFAULTS.uclu, yukseklikCm: 88, sirtTipi: "sabit", oturumTipi: "tek" },
  { ...DEFAULTS.ikili, yukseklikCm: 70, sirtTipi: "sabit" },
  { ...DEFAULTS.berjer, yukseklikCm: 104, sirtTipi: "sabit", kol: "yuvarlak" },
  { ...DEFAULTS.kose, solUc: "kose", sagUc: "sezlong", genislikCm: 330, solBoyCm: 230, sagBoyCm: 170, sirtTipi: "sabit", oturumTipi: "tek", yukseklikCm: 78 },
  { ...DEFAULTS.puf, yukseklikCm: 38 },
  // Chester-style tufted back, wingback armchair
  { ...DEFAULTS.uclu, sirtTipi: "kapitone", kol: "yuvarlak", yukseklikCm: 78 },
  { ...DEFAULTS.berjer, kulak: true, sirtTipi: "kapitone", yukseklikCm: 105 },
  { ...DEFAULTS.berjer, kulak: true, kol: "yok" },
  // Chester: rolled arms with a tufted back, on a sofa, an armchair and a chaise set
  { ...DEFAULTS.uclu, kol: "kivrik", sirtTipi: "kapitone", yukseklikCm: 76, ayak: "konik" },
  { ...DEFAULTS.berjer, kol: "kivrik", kulak: true, sirtTipi: "kapitone" },
  { ...DEFAULTS.kose, kol: "kivrik", solUc: "kol", sagUc: "sezlong", genislikCm: 270, sagBoyCm: 165 },
  { ...DEFAULTS.kose, sirtTipi: "kapitone", solUc: "kose", sagUc: "sezlong", genislikCm: 330, solBoyCm: 230, sagBoyCm: 170 },
];

describe("parametric spec", () => {
  it("defaults are valid", () => {
    for (const t of TIPLER) expect(validateParams(DEFAULTS[t]), t).toEqual({});
  });
  it("rejects sizes outside the type's range and a corner without a return", () => {
    expect(Object.keys(validateParams({ ...DEFAULTS.ikili, genislikCm: 400 }))).toEqual(["genislikCm"]);
    expect(validateParams({ ...DEFAULTS.kose, sagBoyCm: 120 }).sagBoyCm).toBeTruthy();
    expect(validateParams({ ...DEFAULTS.kose, sagBoyCm: 150, derinlikCm: 110 }).sagBoyCm).toMatch(/50 cm/);
    expect(validateParams({ ...DEFAULTS.kose, solUc: "kol", sagUc: "kol" }).uclar).toBeTruthy();
    expect(validateParams({ ...DEFAULTS.kose, sagUc: "sezlong", sagBoyCm: 210 }).sagBoyCm).toMatch(/130–200/);
    // U with two 95 cm corners needs at least 250 cm
    expect(validateParams({ ...DEFAULTS.kose, solUc: "kose", sagUc: "kose", genislikCm: 240, solBoyCm: 200 }).genislikCm).toMatch(/250/);
  });
  it("normalises stored data and falls back to defaults", () => {
    expect(normaliseParams({ tip: "kose", kol: "uydurma", genislikCm: 300.4 })).toEqual({ ...DEFAULTS.kose, genislikCm: 300 });
    // first stored format (one corner) still opens
    expect(normaliseParams({ tip: "kose", koseYonu: "sol", koseBoyCm: 240 })).toMatchObject({ solUc: "kose", sagUc: "kol", solBoyCm: 240 });
    expect(normaliseParams({ tip: "masa" })).toBeNull();
    expect(normaliseParams({ tip: "puf", kol: "kalin" })!.kol).toBe("yok");
  });
  it("firmanın gerçek yüksekliği, sabit sırt ve tek parça oturum", () => {
    expect(paramDimensions({ ...DEFAULTS.uclu, yukseklikCm: 88 }).h).toBe(88);
    expect(paramDimensions(DEFAULTS.uclu).h).toBe(82);
    expect(validateParams({ ...DEFAULTS.uclu, yukseklikCm: 50 }).yukseklikCm).toMatch(/65–110/);
    expect(validateParams({ ...DEFAULTS.puf, yukseklikCm: 70 }).yukseklikCm).toMatch(/30–55/);
    // stored only when set: older models keep exactly the same data
    expect(normaliseParams(DEFAULTS.uclu)).toEqual(DEFAULTS.uclu);
    expect(normaliseParams({ ...DEFAULTS.uclu, sirtTipi: "minderli", oturumTipi: "ayri" })).toEqual(DEFAULTS.uclu);
    expect(normaliseParams({ ...DEFAULTS.uclu, sirtTipi: "sabit", oturumTipi: "tek", yukseklikCm: 87.6 })).toEqual({ ...DEFAULTS.uclu, sirtTipi: "sabit", oturumTipi: "tek", yukseklikCm: 88 });
    expect(normaliseParams({ ...DEFAULTS.berjer, oturumTipi: "tek" })!.oturumTipi).toBeUndefined();
    expect(describeParams({ ...DEFAULTS.uclu, yukseklikCm: 88, sirtTipi: "sabit", oturumTipi: "tek" })).toBe("Üçlü kanepe · 225 × 95 cm · kalın kol · sabit sırt · tek parça oturum");
  });

  it("tek parça oturumda bir oturum minderi, sabit sırtta bir sırt dolgusu", () => {
    const names = (p: ParametricParams) => {
      const n: string[] = [];
      buildParametric(p).traverse((o) => o.name && n.push(o.name));
      return n;
    };
    const count = (p: ParametricParams, name: string) => names(p).filter((n) => n === name).length;
    expect(count(DEFAULTS.uclu, "oturum")).toBe(3);
    expect(count(DEFAULTS.uclu, "sirt-minder")).toBe(3);
    expect(count({ ...DEFAULTS.uclu, oturumTipi: "tek" }, "oturum")).toBe(1);
    // a bench seat keeps a back cushion per person
    expect(count({ ...DEFAULTS.uclu, oturumTipi: "tek" }, "sirt-minder")).toBe(3);
    expect(count({ ...DEFAULTS.uclu, sirtTipi: "sabit" }, "sirt-minder")).toBe(0);
    expect(count({ ...DEFAULTS.uclu, sirtTipi: "sabit" }, "sirt-dolgu")).toBe(1);
    expect(count({ ...DEFAULTS.uclu, sirtTipi: "kapitone" }, "sirt-dolgu")).toBe(1);
    expect(count({ ...DEFAULTS.berjer, kulak: true }, "kulak")).toBe(2);
    expect(count(DEFAULTS.berjer, "kulak")).toBe(0);
  });

  it("kapitone: düğmeler sırtı içe çeker, kenarlara taşmaz", () => {
    const pts = tuftPoints(1.6, 0.45, 0.15);
    expect(pts.length).toBeGreaterThan(10);
    for (const [x, y] of pts) {
      expect(Math.abs(x)).toBeLessThanOrEqual(0.8 - 0.075 + 1e-9);
      expect(Math.abs(y)).toBeLessThanOrEqual(0.225 - 0.075 + 1e-9);
    }
    expect(tuftPoints(0.1, 0.1, 0.15)).toEqual([]);
    // the front face really has dimples: some front vertices sit well behind the plain panel's surface
    const plain = createCushionGeometry({ w: 0.6, h: 0.4, d: 0.09, r: 0.04 });
    const tufted = createCushionGeometry({ w: 0.6, h: 0.4, d: 0.09, r: 0.04, tufts: { spacing: 0.15, depth: 0.018 } });
    const minFrontZ = (g: THREE.BufferGeometry) => {
      const pos = g.getAttribute("position");
      let min = Infinity;
      for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getX(i)) < 0.2 && Math.abs(pos.getY(i)) < 0.1 && pos.getZ(i) > 0) min = Math.min(min, pos.getZ(i));
      return min;
    };
    expect(minFrontZ(plain) - minFrontZ(tufted)).toBeGreaterThan(0.015);
  });

  it("kulak yalnızca berjerde saklanır", () => {
    expect(normaliseParams({ ...DEFAULTS.berjer, kulak: true })!.kulak).toBe(true);
    expect(normaliseParams({ ...DEFAULTS.uclu, kulak: true })!.kulak).toBeUndefined();
    expect(shapeName({ ...DEFAULTS.berjer, kulak: true })).toBe("Kulaklı berjer");
    expect(describeParams({ ...DEFAULTS.berjer, kulak: true, sirtTipi: "kapitone" })).toBe("Kulaklı berjer · 80 × 85 cm · ince kol · kapitone sırt");
  });

  it("describes a model in Turkish", () => {
    expect(describeParams(DEFAULTS.kose)).toBe("Köşe takımı · 290 × 220 cm · kalın kol · köşe sağda");
    expect(shapeName({ ...DEFAULTS.kose, solUc: "kose" })).toBe("U koltuk");
    expect(shapeName({ ...DEFAULTS.kose, sagUc: "sezlong" })).toBe("Şezlonglu kanepe");
    expect(shapeName({ ...DEFAULTS.kose, solUc: "sezlong" })).toBe("Şezlonglu köşe takımı");
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
      const prepared = prepareModel(buildParametric({ ...DEFAULTS.kose, solUc: yon === "sol" ? "kose" : "kol", sagUc: yon === "sag" ? "kose" : "kol" }), [FABRIC_MATERIAL]);
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

describe("paramFloorRects", () => {
  const corners = cases.filter((c) => c.tip === "kose");

  it("is null for pieces that fill their box", () => {
    expect(paramFloorRects(DEFAULTS.uclu)).toBeNull();
    expect(paramFloorRects(DEFAULTS.puf)).toBeNull();
  });

  it.each(corners.map((c) => [describeParams(c), c] as const))("covers every vertex of the built %s and stays inside its box", (_, c) => {
    const rects = paramFloorRects(c)!;
    const { w, d } = paramDimensions(c);
    for (const r of rects) {
      expect(r.x0).toBeGreaterThanOrEqual(-w / 2 - 1e-9);
      expect(r.x1).toBeLessThanOrEqual(w / 2 + 1e-9);
      expect(r.z0).toBeCloseTo(-d / 2);
      expect(r.z1).toBeLessThanOrEqual(d / 2 + 1e-9);
    }
    const prepared = prepareModel(buildParametric(c), [FABRIC_MATERIAL]);
    prepared.root.updateMatrixWorld(true);
    const v = new THREE.Vector3();
    let outside = 0;
    prepared.root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const pos = mesh.geometry.getAttribute("position");
      for (let i = 0; i < pos.count; i += 7) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        const x = v.x * 100, z = v.z * 100;
        // 3 cm for cushion bulges and rounding
        if (!rects.some((r) => x >= r.x0 - 3 && x <= r.x1 + 3 && z >= r.z0 - 3 && z <= r.z1 + 3)) outside++;
      }
    });
    expect(outside).toBe(0);
    // an L or U leaves floor free inside its box
    const area = rects.reduce((a, r) => a + (r.x1 - r.x0) * (r.z1 - r.z0), 0);
    expect(area).toBeLessThan(w * d - 1);
  });
});
