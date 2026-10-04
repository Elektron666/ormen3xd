import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { planBounds, planMeasures } from "@/lib/room/plan";
import { buildRoom, WALL_THICKNESS } from "@/lib/room/build";
import type { RoomSpec } from "@/lib/room/spec";

const rect: RoomSpec = { shape: "dikdortgen", widthCm: 520, depthCm: 440, heightCm: 280, wallId: "kum", floorId: "ceviz" };
const sofa = { x: 2.38, z: 0.96 };
const backZ = -(0.96 / 2 + 0.04);
const label = (id: string, list = planMeasures(rect, backZ, sofa)) => list.find((m) => m.id === id)?.label;

describe("plan measurements", () => {
  it("shows room size, furniture size and clearances in centimetres", () => {
    expect(label("oda-genislik")).toBe("520 cm");
    expect(label("oda-derinlik")).toBe("440 cm");
    expect(label("koltuk-genislik")).toBe("238 cm");
    expect(label("koltuk-derinlik")).toBe("96 cm");
    expect(label("bosluk-sol")).toBe("141 cm");
    expect(label("bosluk-sag")).toBe("141 cm");
    // 440 cm room − 4 cm gap behind − 96 cm sofa = 340 cm in front
    expect(label("bosluk-on")).toBe("340 cm");
  });

  it("drops clearances to walls that do not exist", () => {
    const corner = planMeasures({ ...rect, shape: "kose" }, backZ, sofa).map((m) => m.id);
    expect(corner).toContain("bosluk-sol");
    expect(corner).not.toContain("bosluk-sag");
    expect(corner).not.toContain("bosluk-on");
    const studio = planMeasures({ ...rect, shape: "yok" }, backZ, sofa).map((m) => m.id);
    expect(studio).toEqual(["koltuk-genislik", "koltuk-derinlik"]);
  });

  it("frames the whole room plus room for the dimension lines", () => {
    const b = planBounds(rect, backZ, sofa);
    expect(b.maxX - b.minX).toBeGreaterThan(5.2 + 2 * WALL_THICKNESS);
    expect(b.minZ).toBeLessThan(backZ - WALL_THICKNESS);
    expect(b.maxZ).toBeGreaterThan(backZ + 4.4);
  });
});

describe("wall corners", () => {
  const mats = { floor: new THREE.MeshBasicMaterial(), wall: new THREE.MeshBasicMaterial(), skirting: new THREE.MeshBasicMaterial() };

  it("never lets a wall reach into the room at the inner corner of an L", () => {
    const spec: RoomSpec = { ...rect, shape: "l", widthCm: 600, depthCm: 500 };
    const room = buildRoom(spec, 0, mats);
    room.group.updateMatrixWorld(true);
    // the notch corner: x = 3 − 6·0.42 = 0.48, z = 5 − 5·0.42 = 2.9 (inner faces)
    const nx = 3 - 6 * 0.42, nz = 5 - 5 * 0.42;
    const probe = new THREE.Vector3(nx - 0.06, 1, nz - 0.06); // 6 cm inside the room
    for (const w of room.walls) {
      const body = w.group.children[0] as THREE.Mesh;
      const box = new THREE.Box3().setFromObject(body);
      expect(box.containsPoint(probe), w.group.name).toBe(false);
    }
  });

  it("closes convex corners (walls overlap at the outside corner)", () => {
    const room = buildRoom(rect, 0, mats);
    room.group.updateMatrixWorld(true);
    const outer = new THREE.Vector3(-2.6 - WALL_THICKNESS / 2, 1, -WALL_THICKNESS / 2);
    const hits = room.walls.filter((w) => new THREE.Box3().setFromObject(w.group.children[0]).containsPoint(outer));
    expect(hits.length).toBeGreaterThanOrEqual(1);
  });
});
