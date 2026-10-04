import * as THREE from "three";
import { roomOutline, type RoomSpec } from "./spec";

export const WALL_THICKNESS = 0.12;
const SKIRTING_H = 0.08;
const SKIRTING_D = 0.012;

export interface WallPart {
  group: THREE.Group;
  /** Outward unit normal in world space (x, z). */
  normal: THREE.Vector3;
  /** Point on the inner face, world space. */
  anchor: THREE.Vector3;
}

export interface BuiltRoom {
  group: THREE.Group;
  floor: THREE.Mesh | null;
  walls: WallPart[];
  /** Floor bounds in metres (for camera limits). */
  size: THREE.Vector3;
}

function pointInPolygon(x: number, z: number, pts: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i];
    const [xj, zj] = pts[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Builds the room around the origin: the back wall's inner face sits at
 * z = backZ (behind the furniture), x is centred. Units are metres.
 */
export function buildRoom(
  spec: RoomSpec,
  backZ: number,
  materials: { floor: THREE.Material; wall: THREE.Material; skirting: THREE.Material },
): BuiltRoom {
  const group = new THREE.Group();
  group.name = "oda";
  const { points: cm, walls: hasWall } = roomOutline(spec);
  const pts = cm.map(([x, z]) => [x / 100, z / 100 + backZ] as [number, number]);
  const h = spec.heightCm / 100;

  let floor: THREE.Mesh | null = null;
  if (spec.shape !== "yok") {
    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    floor = new THREE.Mesh(geo, materials.floor);
    floor.name = "zemin";
    floor.receiveShadow = true;
    group.add(floor);
  }

  const walls: WallPart[] = [];
  pts.forEach(([x0, z0], i) => {
    if (!hasWall[i]) return;
    const [x1, z1] = pts[(i + 1) % pts.length];
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const mid = new THREE.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const normal = new THREE.Vector3(dz / len, 0, -dx / len);
    if (pointInPolygon(mid.x + normal.x * 0.05, mid.z + normal.z * 0.05, pts)) normal.negate();

    const wall = new THREE.Group();
    wall.name = `duvar-${i}`;
    wall.position.copy(mid);
    wall.rotation.y = Math.atan2(-normal.x, -normal.z); // local +z faces into the room

    const body = new THREE.Mesh(new THREE.BoxGeometry(len + 2 * WALL_THICKNESS, h, WALL_THICKNESS), materials.wall);
    body.position.set(0, h / 2, -WALL_THICKNESS / 2);
    body.receiveShadow = true;
    wall.add(body);

    const skirt = new THREE.Mesh(new THREE.BoxGeometry(len, SKIRTING_H, SKIRTING_D), materials.skirting);
    skirt.position.set(0, SKIRTING_H / 2, SKIRTING_D / 2);
    skirt.receiveShadow = true;
    wall.add(skirt);

    group.add(wall);
    walls.push({ group: wall, normal, anchor: mid.clone() });
  });

  const box = new THREE.Box3().setFromObject(group);
  return { group, floor, walls, size: box.isEmpty() ? new THREE.Vector3() : box.getSize(new THREE.Vector3()) };
}

/**
 * Dollhouse cut-away: a wall is hidden when the camera stands on its outer
 * side, so the room is always seen from inside without clipping.
 */
export function updateWallVisibility(walls: WallPart[], camera: THREE.Vector3): boolean {
  let changed = false;
  for (const w of walls) {
    const outside = (camera.x - w.anchor.x) * w.normal.x + (camera.z - w.anchor.z) * w.normal.z > 0;
    if (w.group.visible === outside) {
      w.group.visible = !outside;
      changed = true;
    }
  }
  return changed;
}

export function disposeRoom(room: BuiltRoom): void {
  room.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.geometry.dispose();
  });
}
