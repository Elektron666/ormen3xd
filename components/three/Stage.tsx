"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { Fabric, FurnitureModel, TextureSize } from "@/lib/types";
import type { PreparedModel } from "@/lib/three/prepare-model";
import { FurnitureObject } from "./FurnitureObject";
import { GroundShadow } from "./GroundShadow";
import { preferredTextureSize } from "@/lib/three/fabric-material";
import { encodeRoom, type RoomSpec } from "@/lib/room/spec";
import { Room } from "./Room";

export interface StageProps {
  model: FurnitureModel;
  fabric: Fabric;
  room: RoomSpec;
  /** Environment light multiplier of the room preset (light stays neutral white). */
  ambient?: number;
  onFabricShown?: (code: string, first: boolean) => void;
  onError?: (err: unknown) => void;
}

const FOV = 30;
const INTRO = { from: -1.75, to: 0.5, seconds: 5.5 };
const POLAR = 1.2; // ~21° above the horizon

interface Framing {
  target: THREE.Vector3;
  distance: number;
  radius: number;
}

/**
 * Camera distance that fits the model's bounding box in view from the final
 * intro angle, with a margin for the overlaid header and footer.
 */
function frameFor(size: THREE.Vector3, aspect: number, inRoom: boolean): Framing {
  const target = new THREE.Vector3(0, size.y * 0.45, 0);
  const tanV = Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * 0.78;
  const tanH = Math.tan(THREE.MathUtils.degToRad(FOV) / 2) * aspect * (aspect < 1 ? 0.95 : 0.86);
  const dir = new THREE.Vector3().setFromSpherical(new THREE.Spherical(1, POLAR, INTRO.to));
  const forward = dir.clone().negate();
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, forward);
  let distance = 0;
  for (const x of [-0.5, 0.5]) {
    for (const y of [0, 1]) {
      for (const z of [-0.5, 0.5]) {
        const c = new THREE.Vector3(x * size.x, y * size.y, z * size.z).sub(target);
        const depth = c.dot(forward);
        distance = Math.max(distance, Math.abs(c.dot(right)) / tanH - depth, Math.abs(c.dot(up)) / tanV - depth);
      }
    }
  }
  // in a room, step back a little so the walls and floor give context
  return { target, distance: distance * (inRoom ? 1.5 : 1), radius: size.length() / 2 };
}

function configureControls(controls: OrbitControlsImpl, f: Framing, roomExtent: number) {
  controls.target.copy(f.target);
  controls.minDistance = Math.max(f.radius * 1.05, 0.5);
  controls.maxDistance = Math.max(f.distance * 1.6, roomExtent * 1.3);
}

function placeCamera(camera: THREE.Camera, f: Framing, theta: number, phi = POLAR) {
  const s = new THREE.Spherical(f.distance, phi, theta);
  camera.position.setFromSpherical(s).add(f.target);
  camera.lookAt(f.target);
}

/** Frames the model and plays the half-turn intro until the user touches the scene. */
function CameraRig({ prepared, started, roomExtent }: { prepared: PreparedModel | null; started: boolean; roomExtent: number }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const intro = useRef<{ t: number; active: boolean }>({ t: 0, active: false });
  const framing = useRef<Framing | null>(null);
  const hasRoom = roomExtent > 0;

  useEffect(() => {
    if (!prepared || !controls) return;
    const f = frameFor(prepared.size, size.width / Math.max(1, size.height), hasRoom);
    framing.current = f;
    configureControls(controls, f, roomExtent);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    placeCamera(camera, f, reduced ? INTRO.to : INTRO.from);
    controls.update();
    intro.current = { t: 0, active: !reduced };
    invalidate();
    // re-frame only when the model changes, not on every resize
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepared, controls, camera, invalidate, hasRoom]);

  // room size changes only widen or narrow the zoom range, without moving the camera
  useEffect(() => {
    if (framing.current && controls) configureControls(controls, framing.current, roomExtent);
  }, [roomExtent, controls]);

  useEffect(() => {
    if (!controls) return;
    const stop = () => {
      intro.current.active = false;
    };
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);

  useFrame((_, delta) => {
    const f = framing.current;
    if (!started || !intro.current.active || !f || !controls) return;
    intro.current.t += Math.min(delta, 0.1) / INTRO.seconds;
    const k = Math.min(1, intro.current.t);
    const eased = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
    const theta = INTRO.from + (INTRO.to - INTRO.from) * eased;
    const phi = POLAR + 0.12 * Math.sin(Math.PI * eased) * -1;
    placeCamera(camera, { ...f, distance: f.distance * (1.06 - 0.06 * eased) }, theta, phi);
    controls.update();
    if (k >= 1) intro.current.active = false;
    invalidate();
  });

  return null;
}

function StudioLights({ ambient }: { ambient: number }) {
  // Neutral white light only: scenes may change intensity and direction, never
  // colour temperature, so the fabric colour stays true.
  return (
    <>
      <Environment resolution={256} frames={1} environmentIntensity={ambient}>
        <Lightformer form="rect" intensity={1.4} color="#ffffff" scale={[10, 10, 1]} position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={2} color="#ffffff" scale={[5, 4, 1]} position={[-5, 2.5, 4]} target={[0, 0.5, 0]} />
        <Lightformer form="rect" intensity={0.75} color="#ffffff" scale={[6, 4, 1]} position={[6, 2, 2]} target={[0, 0.5, 0]} />
        <Lightformer form="rect" intensity={0.8} color="#ffffff" scale={[8, 3, 1]} position={[0, 3, -6]} target={[0, 0.5, 0]} />
        <Lightformer form="rect" intensity={0.25} color="#ffffff" scale={[20, 2, 1]} position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      </Environment>
      <directionalLight
        position={[-2.2, 4.2, 3]}
        intensity={1.5}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.025}
        shadow-radius={6}
        shadow-camera-left={-2.6}
        shadow-camera-right={2.6}
        shadow-camera-top={2.6}
        shadow-camera-bottom={-2.6}
        shadow-camera-near={1}
        shadow-camera-far={12}
      />
    </>
  );
}

function requestShadowUpdate(gl: THREE.WebGLRenderer) {
  gl.shadowMap.needsUpdate = true;
}

/**
 * The key light is fixed to the scene, so the shadow map only needs to be
 * redrawn when the model or its materials change, not while orbiting.
 */
function ShadowMapRefresh({ version }: { version: string }) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    requestShadowUpdate(gl);
    invalidate();
  }, [gl, invalidate, version]);
  return null;
}

export function Stage({ model, fabric, room, ambient = 1, onFabricShown, onError }: StageProps) {
  const [textureSize] = useState<TextureSize>(preferredTextureSize);
  const [prepared, setPrepared] = useState<PreparedModel | null>(null);
  const [visible, setVisible] = useState(false);

  const [shownCode, setShownCode] = useState<string | null>(null);
  const [roomExtent, setRoomExtent] = useState(0);
  const onRoomBuilt = useCallback((s: THREE.Vector3) => setRoomExtent(Math.hypot(s.x, s.z)), []);
  const inRoom = room.shape !== "yok";

  const handleShown = useCallback(
    (code: string, first: boolean) => {
      setShownCode(code);
      if (first) setVisible(true);
      onFabricShown?.(code, first);
    },
    [onFabricShown],
  );

  const handlePrepared = useCallback((p: PreparedModel) => {
    setVisible(false);
    setPrepared(p);
  }, []);

  return (
    <Canvas
      frameloop="demand"
      shadows={{ type: THREE.PCFShadowMap, enabled: true, autoUpdate: false }}
      dpr={[1, 2]}
      camera={{ fov: FOV, near: 0.05, far: 60, position: [0, 1.2, 5] }}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.NeutralToneMapping,
        toneMappingExposure: 1,
        outputColorSpace: THREE.SRGBColorSpace,
        preserveDrawingBuffer: false,
      }}
      style={{ touchAction: "none" }}
      onCreated={(state) => {
        // Exposed for automated tests (colour check, screenshots); harmless in production.
        (window as unknown as { __ormenStage?: unknown }).__ormenStage = state;
      }}
      aria-label={`${model.name}, 3B görünüm. Döndürmek için sürükleyin.`}
      role="img"
    >
      <StudioLights ambient={ambient} />
      <Suspense fallback={null}>
        <FurnitureObject
          key={model.id}
          model={model}
          fabric={fabric}
          textureSize={textureSize}
          onPrepared={handlePrepared}
          onFabricShown={handleShown}
          onError={onError}
        />
      </Suspense>
      {visible && prepared && (
        <GroundShadow
          key={`${model.id}-shadow`}
          target={prepared.root}
          size={prepared.size}
          far={Math.min(0.6, prepared.size.y * 0.7)}
          opacity={0.7}
          blur={2.5}
        />
      )}
      {visible && prepared && inRoom && (
        <Room spec={room} backZ={-(prepared.size.z / 2 + 0.04)} onBuilt={onRoomBuilt} />
      )}
      <ShadowMapRefresh version={`${model.id}:${shownCode}:${encodeRoom(room)}:${prepared?.size.z ?? 0}`} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.65}
        zoomSpeed={0.8}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2 - 0.06}
      />
      <CameraRig prepared={prepared} started={visible} roomExtent={inRoom ? roomExtent : 0} />
    </Canvas>
  );
}
