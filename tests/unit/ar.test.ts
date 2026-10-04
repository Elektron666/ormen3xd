import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { bakeRepeat, buildArScene } from "@/lib/ar/build";
import { createArmchair } from "@/lib/three/procedural/furniture";
import { SEED_MODELS } from "@/lib/seed/models";
import { buildSeedFabrics } from "@/lib/seed/fabrics";
import { textureRepeat } from "@/lib/fabric/scale";

const tex = () => ({ albedo: new THREE.Texture(), normal: new THREE.Texture(), roughness: new THREE.Texture() });

describe("AR export", () => {
  it("bakes the repeat into a vertex range only", () => {
    const geo = new THREE.PlaneGeometry(1, 1).toNonIndexed();
    const before = Array.from(geo.getAttribute("uv").array);
    bakeRepeat(geo, 0, 3, { x: 4, y: 2 });
    const after = geo.getAttribute("uv");
    expect(after.getX(1)).toBeCloseTo(before[2] * 4);
    expect(after.getY(1)).toBeCloseTo(before[3] * 2);
    expect(after.getX(4)).toBeCloseTo(before[8]); // untouched
  });

  it("dresses the armchair with baked UVs and an unrepeated texture, leaving the source alone", () => {
    const model = SEED_MODELS.find((m) => m.slug === "berjer")!;
    const fabric = buildSeedFabrics().find((f) => f.code === "SIENA-04")!;
    const source = createArmchair();
    const firstSourceMesh = source.getObjectByProperty("isMesh", true) as THREE.Mesh;
    const sourceUv = Array.from(firstSourceMesh.geometry.getAttribute("uv").array.slice(0, 2));

    const ar = buildArScene(source, model, fabric, tex());
    expect(ar.slots.length).toBeGreaterThan(0);
    for (const slot of ar.slots) {
      const mat = slot.mesh.material as THREE.MeshPhysicalMaterial;
      expect(mat.name).toBe("kumas:SIENA-04");
      expect(mat.map!.repeat.toArray()).toEqual([1, 1]);
      expect(mat.map!.userData.mimeType).toBe("image/jpeg");
    }
    // the first fabric mesh's UVs grew by the real-size repeat
    const slot = ar.slots[0];
    const rep = textureRepeat(slot.cmPerUv, fabric.texture.repeatCm);
    expect(rep.x).toBeGreaterThan(1);
    const uv = slot.mesh.geometry.getAttribute("uv");
    let maxU = 0;
    for (let i = 0; i < uv.count; i++) maxU = Math.max(maxU, Math.abs(uv.getX(i)));
    expect(maxU).toBeGreaterThan(rep.x * 0.2);
    // standing on the floor, real size (≈ 81 cm wide)
    expect(ar.size.x).toBeCloseTo(0.81, 1);
    // source untouched
    expect(Array.from(firstSourceMesh.geometry.getAttribute("uv").array.slice(0, 2))).toEqual(sourceUv);
  });
});

describe("AR device", () => {
  it("routes phones to the viewer and desktops to the QR", async () => {
    const { arDevice, arPath } = await import("@/lib/ar/device");
    expect(arDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)")).toBe("ios");
    expect(arDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari", 5)).toBe("ios");
    expect(arDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari", 0)).toBe("desktop");
    expect(arDevice("Mozilla/5.0 (Linux; Android 14; Pixel 7) Chrome")).toBe("android");
    expect(arDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe("desktop");
    expect(arPath("abc", 0)).toBe("/ar/abc");
    expect(arPath("abc", 2)).toBe("/ar/abc?parca=2");
  });
});
