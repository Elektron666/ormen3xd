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
  materials: { floor: THREE.Material; wall: THREE.Material; skirting: THREE.Material; cap?: THREE.Material },
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

  // Walls are extended at convex corners so they close neatly, but not at
  // reflex (inner) corners such as the notch of an L room, where an
  // extension would poke into the room.
  let area = 0;
  pts.forEach(([xa, za], i) => {
    const [xb, zb] = pts[(i + 1) % pts.length];
    area += xa * zb - xb * za;
  });
  const convex = pts.map((p, i) => {
    const prev = pts[(i - 1 + pts.length) % pts.length];
    const next = pts[(i + 1) % pts.length];
    const cross = (p[0] - prev[0]) * (next[1] - p[1]) - (p[1] - prev[1]) * (next[0] - p[0]);
    return Math.sign(cross) === Math.sign(area);
  });

  const walls: WallPart[] = [];
  pts.forEach(([x0, z0], i) => {
    if (!hasWall[i]) return;
    const [x1, z1] = pts[(i + 1) % pts.length];
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const mid = new THREE.Vector3((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const normal = new THREE.Vector3(dz / len, 0, -dx / len);
    if (pointInPolygon(mid.x + normal.x * 0.05, mid.z + normal.z * 0.05, pts)) normal.negate();

    const extStart = convex[i] ? WALL_THICKNESS : 0;
    const extEnd = convex[(i + 1) % pts.length] ? WALL_THICKNESS : 0;
    const bodyLen = len + extStart + extEnd;

    const wall = new THREE.Group();
    wall.name = `duvar-${i}`;
    wall.position.copy(mid);
    wall.rotation.y = Math.atan2(-normal.x, -normal.z); // local +z faces into the room
    // Centre of the extended box, in the wall's local x: it moves along the
    // edge (point i → i+1) by half the difference of the two extensions.
    const localX = new THREE.Vector3(1, 0, 0).applyEuler(wall.rotation);
    const along = (localX.x * dx + localX.z * dz) / len; // ±1
    const offsetX = ((extEnd - extStart) / 2) * along;

    const body = new THREE.Mesh(new THREE.BoxGeometry(bodyLen, h, WALL_THICKNESS), materials.wall);
    body.position.set(offsetX, h / 2, -WALL_THICKNESS / 2);
    body.receiveShadow = true;
    wall.add(body);

    if (materials.cap) {
      // dark wall top, like the cut walls of an architectural plan
      const cap = new THREE.Mesh(new THREE.BoxGeometry(bodyLen, 0.004, WALL_THICKNESS), materials.cap);
      cap.position.set(offsetX, h + 0.002, -WALL_THICKNESS / 2);
      wall.add(cap);
    }

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
