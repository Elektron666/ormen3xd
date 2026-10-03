import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildSeedFabrics } from "@/lib/seed/fabrics";
import { heightToNormal } from "@/lib/fabric/maps";

describe("seed catalogue", () => {
  const fabrics = buildSeedFabrics();

  it("has unique codes and is labelled as placeholder", () => {
    expect(new Set(fabrics.map((f) => f.code)).size).toBe(fabrics.length);
    expect(fabrics.every((f) => f.isPlaceholder)).toBe(true);
  });

  it("never invents technical values", () => {
    for (const f of fabrics) {
      expect(f.composition).toBeUndefined();
      expect(f.martindale).toBeUndefined();
      expect(f.widthCm).toBeUndefined();
    }
  });

  it("has every texture file generated", () => {
    for (const f of fabrics) {
      const m = f.texture.maps;
      const files = [m.albedo["1k"], m.albedo["2k"], m.normal!["1k"], m.roughness!["2k"], f.texture.thumbUrl];
      for (const file of files) expect(existsSync(path.join("public", file)), file).toBe(true);
    }
  });
});

describe("normal map derivation", () => {
  it("encodes a flat surface as straight up", () => {
    const n = heightToNormal(new Float32Array(16).fill(0.3), 4, 10);
    expect([n[0], n[1], n[2]]).toEqual([128, 128, 255]);
  });

  it("tilts towards lower ground and wraps at the edges", () => {
    // height rises to the right → normal leans left (x < 0.5)
    const size = 8;
    const h = new Float32Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) h[y * size + x] = Math.sin((x / size) * Math.PI * 2);
    const n = heightToNormal(h, size, 1);
    expect(n[(0 * size + 0) * 3]).toBeLessThan(128); // rising at x=0
    expect(n[(0 * size + 4) * 3]).toBeGreaterThan(128); // falling at x=4
  });
});
