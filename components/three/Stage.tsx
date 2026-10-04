"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Fabric, FurnitureModel, TextureSize } from "@/lib/types";
import type { PreparedModel } from "@/lib/three/prepare-model";
import { FurnitureObject } from "./FurnitureObject";
import { GroundShadow } from "./GroundShadow";
import { preferredTextureSize } from "@/lib/three/fabric-material";
import { encodeRoom, type RoomSpec } from "@/lib/room/spec";
import { Room } from "./Room";
import { CameraRig, FOV } from "./CameraRig";
import { Dimensions } from "./Dimensions";
import { enableAllLayers, renderSplit, showPrimary } from "@/lib/three/layers";
import { LAYER_COMPARE } from "@/lib/three/constants";

export interface StageProps {
  model: FurnitureModel;
  fabric: Fabric;
  room: RoomSpec;
  /** Environment light multiplier of the room preset (light stays neutral white). */
  ambient?: number;
  /** Second fabric for compare mode; null when not comparing. */
  compareFabric?: Fabric | null;
  /** Split position 0..1 from the left in compare mode. */
  split?: number;
  closeUp?: boolean;
  showDimensions?: boolean;
  onFabricShown?: (code: string, first: boolean) => void;
  onError?: (err: unknown) => void;
}

function StudioLights({ ambient }: { ambient: number }) {
  // Neutral white light only: scenes may change intensity and direction, never
  // colour temperature, so the fabric colour stays true.
  const key = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    // the furniture is on its own layer; the shadow camera must see it
    if (key.current) enableAllLayers(key.current.shadow.camera);
  }, []);
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
        ref={key}
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

/** Takes over rendering while comparing: two passes split by a vertical line. */
function SplitRender({ split }: { split: number }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [split, invalidate]);
  useFrame(({ gl, scene, camera, size }) => renderSplit(gl, scene, camera, size, split), 1);
  return null;
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

export function Stage({
  model,
  fabric,
  room,
  ambient = 1,
  compareFabric = null,
  split = 0.5,
  closeUp = false,
  showDimensions = false,
  onFabricShown,
  onError,
}: StageProps) {
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
        showPrimary(state.camera);
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
      {compareFabric && (
        <Suspense fallback={null}>
          <FurnitureObject
            key={`${model.id}-karsilastir`}
            model={model}
            fabric={compareFabric}
            textureSize={textureSize}
            layer={LAYER_COMPARE}
            onError={onError}
          />
        </Suspense>
      )}
      {compareFabric && <SplitRender split={split} />}
      {visible && prepared && showDimensions && <Dimensions size={prepared.size} />}
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
      <ShadowMapRefresh version={`${model.id}:${shownCode}:${compareFabric?.code}:${encodeRoom(room)}:${prepared?.size.z ?? 0}`} />
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
      <CameraRig prepared={prepared} started={visible} roomExtent={inRoom ? roomExtent : 0} closeUp={closeUp} />
    </Canvas>
  );
}
