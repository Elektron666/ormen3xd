import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";
import { analyseScene, looksLikeFabric, sizeProblems, uvWarnings } from "@/lib/three/analyze-glb";

describe("GLB analysis", () => {
  it("guesses upholstered materials by name", () => {
    expect(looksLikeFabric("kumas")).toBe(true);
    expect(looksLikeFabric("Kumaş_Oturum")).toBe(true);
    expect(looksLikeFabric("Fabric_Seat")).toBe(true);
    expect(looksLikeFabric("ayak")).toBe(false);
    expect(looksLikeFabric("Wood_Leg")).toBe(false);
  });

  it("catches files saved in the wrong unit", () => {
    expect(sizeProblems({ w: 238, d: 96, h: 85 })).toEqual([]);
    expect(sizeProblems({ w: 238000, d: 96000, h: 85000 })[0]).toMatch(/milimetre/);
    expect(sizeProblems({ w: 2.4, d: 1, h: 0.9 })[0]).toMatch(/birim/);
  });

  it("reads the sample pouf: materials, size", async () => {
    const buf = readFileSync(path.join(__dirname, "../fixtures/ornek-puf.glb"));
    const gltf = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "");
    const r = analyseScene(gltf.scene, buf.byteLength);
    expect(r.materials.map((m) => [m.name, m.suggested])).toEqual([
      ["kumas", true],
      ["ayak", false],
    ]);
    expect(r.sizeCm).toEqual({ w: 54, d: 54, h: 42 });
    expect(r.problems).toEqual([]);
  });
});

describe("UV consistency", () => {
  it("accepts the sample pouf and flags a stretched UV", async () => {
    const buf = readFileSync(path.join(__dirname, "../fixtures/ornek-puf.glb"));
    const gltf = await new GLTFLoader().parseAsync(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), "");
    expect(uvWarnings(gltf.scene, ["kumas"])).toEqual([]);

    // a box whose top face UV is squeezed to a tenth: the density varies a lot
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const uv = geo.getAttribute("uv");
    for (let i = 8; i < 12; i++) uv.setXY(i, uv.getX(i) * 0.1, uv.getY(i) * 0.1);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ name: "kumas" }));
    expect(uvWarnings(mesh, ["kumas"])[0]).toMatch(/“kumas” malzemesinde UV ölçüsü/);
  });
});
