"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { PreparedModel } from "@/lib/three/prepare-model";

export const FOV = 30;
const INTRO = { from: -1.75, to: 0.5, seconds: 5.5 };
const POLAR = 1.2; // ~21° above the horizon
const MOVE_SECONDS = 0.9;
/** Distance from the fabric in close-up: close enough to read the weave. */
const CLOSE_DISTANCE = 0.42;

interface Framing {
  target: THREE.Vector3;
  distance: number;
  radius: number;
}

/**
 * Camera distance that fits the model's bounding box in view from the final
 * intro angle, with a margin for the overlaid header and footer.
 */
function frameFor(box: THREE.Box3, aspect: number, inRoom: boolean): Framing {
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const target = new THREE.Vector3(centre.x, box.min.y + size.y * 0.45, centre.z);
  const tanV = Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * 0.78;
  const tanH = Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * aspect * (aspect < 1 ? 0.95 : 0.86);
  const dir = new THREE.Vector3().setFromSpherical(new THREE.Spherical(1, POLAR, INTRO.to));
  const forward = dir.clone().negate();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, forward);
  let distance = 0;
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      for (const z of [box.min.z, box.max.z]) {
        const c = new THREE.Vector3(x, y, z).sub(target);
        const depth = c.dot(forward);
        distance = Math.max(distance, Math.abs(c.dot(right)) / tanH - depth, Math.abs(c.dot(up)) / tanV - depth);
      }
    }
  }
  // in a room, step back a little so the walls and floor give context
  return { target, distance: distance * (inRoom ? 1.5 : 1), radius: size.length() / 2 };
}

function setTarget(controls: OrbitControlsImpl, target: THREE.Vector3) {
  controls.target.copy(target);
}

function limitsOverview(controls: OrbitControlsImpl, f: Framing, roomExtent: number) {
  controls.minDistance = Math.max(f.radius * 1.05, 0.5);
  controls.maxDistance = Math.max(f.distance * 1.6, roomExtent * 1.3);
}

function limitsCloseUp(controls: OrbitControlsImpl) {
  controls.minDistance = 0.18;
  controls.maxDistance = 1.2;
}

function placeCamera(camera: THREE.Camera, f: Framing, theta: number, phi = POLAR) {
  const s = new THREE.Spherical(f.distance, phi, theta);
  camera.position.setFromSpherical(s).add(f.target);
  camera.lookAt(f.target);
}

/**
 * Finds a point on the upholstery to look at closely: a ray from above the
 * front edge towards the seat. Works for any model, procedural or GLB.
 */
function closeUpView(prepared: PreparedModel): { target: THREE.Vector3; position: THREE.Vector3 } {
  const s = prepared.size;
  // in the piece's own frame: from above its front edge towards the seat
  const from = prepared.root.localToWorld(new THREE.Vector3(0, s.y * 0.95, s.z * 1.6));
  const aim = prepared.root.localToWorld(new THREE.Vector3(0, s.y * 0.42, 0));
  const dir = aim.clone().sub(from).normalize();
  const ray = new THREE.Raycaster(from, dir);
  ray.layers.enableAll();
  const hit = ray.intersectObject(prepared.root, true).find((h) => h.object.name !== "kumas-gecis");
  const target = hit ? hit.point.clone() : aim;
  const position = target.clone().addScaledVector(dir, -CLOSE_DISTANCE);
  return { target, position };
}

interface Move {
  t: number;
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
}

function stepMove(move: Move, delta: number, camera: THREE.Camera, controls: OrbitControlsImpl): boolean {
  move.t = Math.min(1, move.t + delta / MOVE_SECONDS);
  const k = move.t;
  const e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
  camera.position.lerpVectors(move.fromPos, move.toPos, e);
  controls.target.lerpVectors(move.fromTarget, move.toTarget, e);
  controls.update();
  return k < 1;
}

export interface CameraRigProps {
  /** The piece the overview is framed on (the first piece of the layout). */
  prepared: PreparedModel | null;
  /** The piece "Yakından bak" goes to (the selected piece). */
  closeTarget: PreparedModel | null;
  /** True once the model is visible; the intro starts then. */
  started: boolean;
  /** Room floor diagonal in metres, 0 when there is no room. */
  roomExtent: number;
  closeUp: boolean;
}

/** Frames the model, plays the intro, and moves to / from the close-up view. */
export function CameraRig({ prepared, closeTarget, started, roomExtent, closeUp }: CameraRigProps) {
  const storeCamera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  // Always drive the orbit (perspective) camera, even while the plan view has
  // temporarily made an orthographic camera the default.
  const camera = (controls?.object as THREE.Camera | undefined) ?? storeCamera;
  const intro = useRef<{ t: number; active: boolean }>({ t: 0, active: false });
  const framing = useRef<Framing | null>(null);
  const move = useRef<Move | null>(null);
  const hasRoom = roomExtent > 0;

  useEffect(() => {
    if (!prepared || !controls) return;
    prepared.root.updateWorldMatrix(true, true);
    const f = frameFor(new THREE.Box3().setFromObject(prepared.root), size.width / Math.max(1, size.height), hasRoom);
    framing.current = f;
    setTarget(controls, f.target);
    limitsOverview(controls, f, roomExtent);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    placeCamera(camera, f, reduced ? INTRO.to : INTRO.from);
    controls.update();
    intro.current = { t: 0, active: !reduced };
    move.current = null;
    invalidate();
    // re-frame only when the model or room mode changes, not on every resize
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepared, controls, camera, invalidate, hasRoom]);

  // room size changes only widen or narrow the zoom range
  useEffect(() => {
    if (framing.current && controls && !closeUp) limitsOverview(controls, framing.current, roomExtent);
  }, [roomExtent, controls, closeUp]);

  // close-up on / off: animate between the overview and the fabric
  useEffect(() => {
    const f = framing.current;
    if (!prepared || !controls || !f) return;
    intro.current.active = false;
    if (closeUp) {
      const piece = closeTarget ?? prepared;
      piece.root.updateWorldMatrix(true, true);
      const view = closeUpView(piece);
      limitsCloseUp(controls);
      move.current = { t: 0, fromPos: camera.position.clone(), toPos: view.position, fromTarget: controls.target.clone(), toTarget: view.target };
    } else if (move.current || controls.target.distanceTo(f.target) > 1e-3) {
      // back out along the current viewing direction, keeping the angle the user chose
      const dir = camera.position.clone().sub(controls.target).normalize();
      dir.y = Math.max(dir.y, Math.cos(POLAR));
      dir.normalize();
      const toPos = f.target.clone().addScaledVector(dir, f.distance);
      limitsOverview(controls, f, roomExtent);
      move.current = { t: 0, fromPos: camera.position.clone(), toPos, fromTarget: controls.target.clone(), toTarget: f.target.clone() };
    }
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closeUp]);

  useEffect(() => {
    if (!controls) return;
    const stop = () => {
      intro.current.active = false;
    };
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);

  useFrame((_, delta) => {
    if (!controls) return;
    const dt = Math.min(delta, 0.1);
    if (move.current) {
      if (!stepMove(move.current, dt, camera, controls)) move.current = null;
      invalidate();
      return;
    }
    const f = framing.current;
    if (!started || !intro.current.active || !f) return;
    intro.current.t += dt / INTRO.seconds;
    const k = Math.min(1, intro.current.t);
    const eased = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
    const theta = INTRO.from + (INTRO.to - INTRO.from) * eased;
    const phi = POLAR - 0.12 * Math.sin(Math.PI * eased);
    placeCamera(camera, { ...f, distance: f.distance * (1.06 - 0.06 * eased) }, theta, phi);
    controls.update();
    if (k >= 1) intro.current.active = false;
    invalidate();
  });

  return null;
}
