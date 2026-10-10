import { describe, expect, it } from "vitest";
import { cleanZones, decodeZones, encodeZones, pieceCodes, zoneCode, zoneOf } from "@/lib/three/zones";
import { decodeLayout, encodeLayout } from "@/lib/room/layout";
import { codeUpper } from "@/lib/i18n/tr";
import { buildCodeModel } from "@/lib/three/procedural";
import { DEFAULTS, applyStil } from "@/lib/parametric/spec";

describe("bölgeye göre kumaş", () => {
  it("parça adları bölgelere ayrılır", () => {
    expect(["oturum", "oturum-2", "sirt-minder-1", "sirt-dolgu", "puf"].map(zoneOf)).toEqual(Array(5).fill("minder"));
    expect(["kol", "kol-sol", "kol-kivrim", "kulak"].map(zoneOf)).toEqual(Array(4).fill("kol"));
    expect(["govde", "sirt-govde", "sirt"].map(zoneOf)).toEqual(Array(3).fill("govde"));
    expect(zoneOf("biye")).toBe("biye");
    expect(zoneOf("Mesh_042")).toBeNull();
  });

  it("kodla çizilen her modelin döşemeli parçası bir bölgeye düşer", () => {
    const sources = [
      { kind: "procedural", generator: "modular-sofa" },
      { kind: "procedural", generator: "armchair" },
      { kind: "parametric", params: DEFAULTS.kose },
      { kind: "parametric", params: applyStil(DEFAULTS.berjer, "chester") },
      { kind: "parametric", params: DEFAULTS.puf },
    ] as const;
    for (const src of sources) {
      const names = new Set<string>();
      buildCodeModel(src).traverse((o) => {
        const m = o as { isMesh?: boolean; material?: { name?: string }; name: string };
        if (m.isMesh && m.material?.name === "kumas") names.add(m.name);
      });
      for (const n of names) expect(zoneOf(n), `${JSON.stringify(src)} → ${n}`).not.toBeNull();
    }
  });

  it("bağlantıda saklanır; ana kumaşla aynı olan bölge yazılmaz; eski bağlantılar açılır", () => {
    const items = decodeLayout("moduler-kanepe.MISSO-06.0.-252.0.kLUMA-06~mMISSO-03")!;
    expect(items[0].zones).toEqual({ kol: "LUMA-06", minder: "MISSO-03" });
    expect(encodeLayout(items)).toBe("moduler-kanepe.MISSO-06.0.-252.0.kLUMA-06~mMISSO-03");
    expect(encodeLayout([{ ...items[0], zones: { kol: "MISSO-06" } }])).toBe("moduler-kanepe.MISSO-06.0.-252.0");
    expect(decodeLayout("moduler-kanepe.LUMA-02.0.51.0")![0].zones).toBeUndefined();
    expect(decodeLayout("moduler-kanepe.LUMA-02.0.51.0.xLUMA-01")).toBeNull();
    expect(decodeZones("bluma-03", codeUpper)).toEqual({ biye: "LUMA-03" });
    expect(encodeZones(cleanZones("A-1", { govde: "A-1", biye: "B-2" }))).toBe("bB-2");
  });

  it("kombinasyonun bütün kumaşları sayılır", () => {
    const p = { fabricCode: "MISSO-06", zones: { kol: "LUMA-06", minder: "MISSO-03", biye: "LUMA-06" } };
    expect(pieceCodes(p)).toEqual(["MISSO-06", "LUMA-06", "MISSO-03"]);
    expect(zoneCode(p, "govde")).toBe("MISSO-06");
    expect(zoneCode(p, null)).toBe("MISSO-06");
  });
});
