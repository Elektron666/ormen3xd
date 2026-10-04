import { describe, expect, it } from "vitest";
import {
  WALL_GAP,
  constrain,
  decodeLayout,
  encodeLayout,
  findFreeSpot,
  footprint,
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
