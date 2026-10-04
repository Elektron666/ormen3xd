import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  ROOM_PRESETS,
  clampRoom,
  decodeRoom,
  encodeRoom,
  furnitureFits,
  matchingPreset,
  roomOutline,
  type RoomSpec,
} from "@/lib/room/spec";
import { buildRoom, updateWallVisibility } from "@/lib/room/build";

const rect: RoomSpec = { shape: "dikdortgen", widthCm: 500, depthCm: 400, heightCm: 280, wallId: "kum", floorId: "ceviz" };
const mats = { floor: new THREE.MeshBasicMaterial(), wall: new THREE.MeshBasicMaterial(), skirting: new THREE.MeshBasicMaterial() };

describe("room link format", () => {
  it("round-trips a custom room", () => {
    expect(encodeRoom(rect)).toBe("dikdortgen.500x400x280.kum.ceviz");
    expect(decodeRoom(encodeRoom(rect))).toEqual(rect);
  });

  it("accepts preset ids and rejects garbage", () => {
    expect(decodeRoom("koyu-salon")).toEqual(ROOM_PRESETS.find((p) => p.id === "koyu-salon")!.spec);
    expect(decodeRoom("üçgen.1x2x3.a.b")).toBeNull();
    expect(decodeRoom("dikdortgen.abc.kum.ceviz")).toBeNull();
    expect(decodeRoom(null)).toBeNull();
  });

  it("clamps sizes and unknown colours to safe values", () => {
    const r = clampRoom({ ...rect, widthCm: 50, heightCm: 9999, wallId: "yok-boyle", floorId: "?" });
    expect(r.widthCm).toBe(200);
    expect(r.heightCm).toBe(450);
    expect(r.wallId).toBe("kirik-beyaz");
    expect(r.floorId).toBe("acik-mese");
  });

  it("recognises a preset only when nothing was changed", () => {
    const p = ROOM_PRESETS[1];
    expect(matchingPreset({ ...p.spec })?.id).toBe(p.id);
    expect(matchingPreset({ ...p.spec, widthCm: p.spec.widthCm + 10 })).toBeUndefined();
  });
});

describe("room geometry", () => {
  it("has the right walls per shape", () => {
    expect(roomOutline(rect).walls.filter(Boolean)).toHaveLength(4);
    expect(roomOutline({ ...rect, shape: "l" }).walls.filter(Boolean)).toHaveLength(6);
    expect(roomOutline({ ...rect, shape: "kose" }).walls.filter(Boolean)).toHaveLength(2);
    expect(roomOutline({ ...rect, shape: "yok" }).walls.filter(Boolean)).toHaveLength(0);
  });

  it("checks whether furniture fits against the back wall", () => {
    expect(furnitureFits(rect, { w: 238, d: 96 })).toBe(true);
    expect(furnitureFits({ ...rect, widthCm: 240 }, { w: 238, d: 96 })).toBe(false);
    expect(furnitureFits({ ...rect, shape: "yok", widthCm: 200 }, { w: 236, d: 95 })).toBe(true);
  });

  it("places the back wall behind the furniture and points wall normals outwards", () => {
    const room = buildRoom(rect, -0.5, mats);
    expect(room.walls).toHaveLength(4);
    const back = room.walls.find((w) => w.normal.z < -0.9)!;
    expect(back.anchor.z).toBeCloseTo(-0.5, 6);
    const centre = new THREE.Vector3(0, 0, -0.5 + 2);
    for (const w of room.walls) {
      const toCentre = centre.clone().sub(w.anchor);
      expect(toCentre.dot(w.normal)).toBeLessThan(0);
    }
    // floor spans the inner size
    expect(room.floor).not.toBeNull();
    const fb = new THREE.Box3().setFromObject(room.floor!);
    expect(fb.max.x - fb.min.x).toBeCloseTo(5, 4);
    expect(fb.max.z - fb.min.z).toBeCloseTo(4, 4);
    expect(fb.min.z).toBeCloseTo(-0.5, 4);
  });

  it("hides exactly the walls between the camera and the room", () => {
    const room = buildRoom(rect, -0.5, mats);
    // camera in front, to the right, above
    updateWallVisibility(room.walls, new THREE.Vector3(3.5, 2, 6));
    const hidden = room.walls.filter((w) => !w.group.visible).map((w) => `${Math.round(w.normal.x)},${Math.round(w.normal.z)}`);
    expect(hidden.sort()).toEqual(["0,1", "1,0"]);
  });
});
