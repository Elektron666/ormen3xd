import { describe, expect, it } from "vitest";
import {
  WALL_GAP,
  constrain,
  decodeLayout,
  encodeLayout,
  findFreeSpot,
  footprint,
  footprintParts,
  modelDims,
  halfExtents,
  overlapping,
  type Placement,
} from "@/lib/room/layout";
import type { RoomSpec } from "@/lib/room/spec";

const room: RoomSpec = { shape: "dikdortgen", widthCm: 520, depthCm: 440, heightCm: 280, wallId: "kum", floorId: "ceviz" };
const sofa = { w: 238, d: 96 };
const chair = { w: 81, d: 84 };
const p = (x: number, z: number, rot = 0, id = "a"): Placement => ({ id, modelSlug: "moduler-kanepe", fabricCode: "LUMA-02", x, z, rot });

describe("footprint", () => {
  it("swaps width and depth at 90°", () => {
    expect(halfExtents(sofa, 0)).toEqual({ hx: 1.19, hz: 0.48 });
    const r = halfExtents(sofa, 90);
    expect(r.hx).toBeCloseTo(0.48, 6);
    expect(r.hz).toBeCloseTo(1.19, 6);
  });
  it("holds the turned piece at 45°", () => {
    const r = halfExtents(sofa, 45);
    const k = Math.SQRT1_2 * (2.38 + 0.96) / 2;
    expect(r.hx).toBeCloseTo(k, 6);
    expect(r.hz).toBeCloseTo(k, 6);
  });
});

describe("constrain", () => {
  it("keeps the piece inside the walls", () => {
    const c = constrain(p(10, -5), sofa, room);
    const f = footprint(c, sofa);
    expect(f.maxX).toBeCloseTo(2.6 - WALL_GAP, 3);
    expect(f.minZ).toBeCloseTo(WALL_GAP, 3);
  });
  it("snaps to a wall within 10 cm", () => {
    const near = constrain(p(0, 0.48 + WALL_GAP + 0.07), sofa, room);
    expect(near.z).toBeCloseTo(0.48 + WALL_GAP, 3);
    const far = constrain(p(0, 1.5), sofa, room);
    expect(far.z).toBeCloseTo(1.5, 3);
  });
  it("pushes a piece out of the L notch", () => {
    const l: RoomSpec = { ...room, shape: "l", widthCm: 600, depthCm: 500 };
    const c = constrain({ ...p(2.5, 4.4), modelSlug: "berjer" }, chair, l);
    const f = footprint(c, chair);
    const notchMinX = 3 - 6 * 0.42, notchMinZ = 5 - 5 * 0.42;
    expect(f.maxX <= notchMinX + 1e-6 || f.maxZ <= notchMinZ + 1e-6).toBe(true);
  });
  it("lets the studio floor be (almost) unlimited", () => {
    const studio: RoomSpec = { ...room, shape: "yok" };
    expect(constrain(p(3, 3), sofa, studio)).toMatchObject({ x: 3, z: 3 });
  });
});

describe("free spot and overlap", () => {
  it("puts the first piece against the back wall, centred", () => {
    const s = findFreeSpot(sofa, room, []);
    expect(s).toMatchObject({ rot: 0 });
    expect(s.x).toBeCloseTo(0, 6);
    expect(s.z).toBeCloseTo(0.48 + WALL_GAP, 3);
  });
  it("places a second piece without overlapping the first", () => {
    const first = { p: p(0, 0.51), dims: sofa };
    const s = findFreeSpot(chair, room, [first]);
    const items = [first, { p: { ...p(s.x, s.z, s.rot, "b"), modelSlug: "berjer" }, dims: chair }];
    expect(overlapping(items).size).toBe(0);
  });
  it("reports overlapping pieces", () => {
    const items = [
      { p: p(0, 1), dims: sofa },
      { p: p(0.5, 1.2, 0, "b"), dims: chair },
      { p: p(2, 3.5, 0, "c"), dims: chair },
    ];
    expect([...overlapping(items)].sort()).toEqual(["a", "b"]);
  });
});

describe("layout link", () => {
  it("round-trips pieces in centimetres and degrees", () => {
    const items = [p(0, 0.51), { ...p(1.5, 1.4, -90, "b"), modelSlug: "berjer", fabricCode: "SIENA-04" }];
    const text = encodeLayout(items);
    expect(text).toBe("moduler-kanepe.LUMA-02.0.51.0_berjer.SIENA-04.150.140.-90");
    const back = decodeLayout(text)!;
    const withoutId = (list: Placement[]) => list.map((x) => [x.modelSlug, x.fabricCode, x.x, x.z, x.rot]);
    expect(withoutId(back)).toEqual(withoutId(items));
  });
  it("rejects broken links", () => {
    expect(decodeLayout("kanepe.LUMA-02.x.1.0")).toBeNull();
    expect(decodeLayout("")).toBeNull();
    expect(decodeLayout("a.B")).toBeNull();
  });
});

describe("corner and U sets", () => {
  // 290 × 220 köşe takımı, corner on the right: back run 0–195 cm, return 195–290 cm reaching 220 cm forward
  const kose = modelDims({
    dimensionsCm: { w: 290, d: 220, h: 82 },
    source: { kind: "parametric", params: { tip: "kose", kol: "kalin", sirt: "orta", ayak: "gizli", genislikCm: 290, derinlikCm: 95, solUc: "kol", sagUc: "kose", solBoyCm: 160, sagBoyCm: 220 } },
  });
  const table = { w: 100, d: 60 };
  const set = p(0, 1.13, 0, "set");

  it("keeps the real shape for parametric corner sets only", () => {
    expect(kose.parts).toHaveLength(2);
    expect(modelDims({ dimensionsCm: { w: 238, d: 96, h: 80 }, source: { kind: "glb", url: "x.glb" } })).toEqual({ w: 238, d: 96 });
    // the box (walls, framing) is unchanged
    expect(footprint(set, kose)).toEqual(footprint(set, { w: 290, d: 220 }));
  });

  it("a table inside the L does not count as overlapping", () => {
    // in front of the back run, left of the return
    const inside = p(-0.2, 1.7, 0, "masa");
    expect(overlapping([{ p: set, dims: kose }, { p: inside, dims: table }]).size).toBe(0);
    // with the bounding box it would have
    expect(overlapping([{ p: set, dims: { w: 290, d: 220 } }, { p: inside, dims: table }]).size).toBe(2);
    // on the return itself it still does
    expect(overlapping([{ p: set, dims: kose }, { p: p(1.0, 1.7, 0, "masa"), dims: table }]).size).toBe(2);
  });

  it("turns the parts with the piece", () => {
    // turned to face +x (back on the left wall)
    const turned = footprintParts({ x: 0, z: 0, rot: 90 }, kose);
    const box = footprint({ x: 0, z: 0, rot: 90 }, kose);
    for (const f of turned) {
      expect(f.minX).toBeGreaterThanOrEqual(box.minX - 1e-9);
      expect(f.maxX).toBeLessThanOrEqual(box.maxX + 1e-9);
      expect(f.minZ).toBeGreaterThanOrEqual(box.minZ - 1e-9);
      expect(f.maxZ).toBeLessThanOrEqual(box.maxZ + 1e-9);
    }
    // the back run sits against x = box.minX
    expect(Math.min(...turned.map((f) => f.minX))).toBeCloseTo(box.minX);
    // the right-hand return turns to the -z side (rotation.y = +90°: +x goes to -z)
    const ret = turned.find((f) => f.maxX - f.minX > 2)!;
    expect(ret.minZ).toBeCloseTo(box.minZ);
  });

  it("finds a free spot for a table inside the L", () => {
    const small: RoomSpec = { ...room, widthCm: 300, depthCm: 260 };
    const placed = [{ p: constrain(p(0, 0, 0, "set"), kose, small), dims: kose }];
    const spot = findFreeSpot({ w: 60, d: 50 }, small, placed);
    const table2 = { ...p(spot.x, spot.z, spot.rot, "masa") };
    expect(overlapping([...placed, { p: table2, dims: { w: 60, d: 50 } }]).size).toBe(0);
    // it went into the L, which the box would have ruled out
    expect(footprint(table2, { w: 60, d: 50 }).minZ).toBeLessThan(2.2);
  });
});
