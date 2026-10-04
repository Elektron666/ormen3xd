"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree, type RootState } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Fabric, FurnitureModel, TextureSize } from "@/lib/types";
import type { PreparedModel } from "@/lib/three/prepare-model";
import { preferredTextureSize } from "@/lib/three/fabric-material";
import { encodeRoom, type RoomSpec } from "@/lib/room/spec";
import { encodeLayout, footprint, type Placement } from "@/lib/room/layout";
import { Room } from "./Room";
import { CameraRig, FOV } from "./CameraRig";
import { PlanView } from "./PlanView";
import { PlacedFurniture, type PieceActions } from "./PlacedFurniture";
import { enableAllLayers, renderSplit, showPrimary } from "@/lib/three/layers";

/** Imperative handle for the page: grab a clean picture of the current view. */
export interface StageApi {
  /** PNG data URL of the current view, without selection marks. */
  snapshot: () => string;
}

/** Hides selection outlines, renders one frame and reads the canvas in the same task. */
function takeSnapshot(state: RootState, split: number | null): string {
  const hidden: THREE.Object3D[] = [];
  state.scene.traverse((o) => {
    if (o.name === "secim" && o.visible) {
      o.visible = false;
      hidden.push(o);
    }
  });
  if (split !== null) renderSplit(state.gl, state.scene, state.camera, state.size, split);
  else state.gl.render(state.scene, state.camera);
  const url = state.gl.domElement.toDataURL("image/png");
  hidden.forEach((o) => (o.visible = true));
  state.invalidate();
  return url;
}

function SnapshotBridge({ onApi, split }: { onApi: (api: StageApi) => void; split: number | null }) {
  const get = useThree((s) => s.get);
  useEffect(() => {
    onApi({ snapshot: () => takeSnapshot(get(), split) });
  }, [get, onApi, split]);
  return null;
}

export interface StageProps {
  models: Map<string, FurnitureModel>;
  fabrics: Map<string, Fabric>;
  items: Placement[];
  selectedId: string;
  overlapIds: Set<string>;
  room: RoomSpec;
  /** Environment light multiplier of the room preset (light stays neutral white). */
  ambient?: number;
  /** Second fabric for the selected piece in compare mode; null when not comparing. */
  compareFabric?: Fabric | null;
  /** Split position 0..1 from the left in compare mode. */
  split?: number;
  closeUp?: boolean;
  showDimensions?: boolean;
  /** Top-down 2D plan instead of the 3D view. */
  plan?: boolean;
  actions: PieceActions & {
    onSelect: (id: string) => void;
    onMove: (id: string, x: number, z: number) => void;
    onDragEnd?: () => void;
  };
  onFabricShown?: (id: string, code: string, first: boolean) => void;
  onError?: (err: unknown) => void;
  onApi?: (api: StageApi) => void;
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
  models,
  fabrics,
  items,
  selectedId,
  overlapIds,
  room,
  ambient = 1,
  compareFabric = null,
  split = 0.5,
  closeUp = false,
  showDimensions = false,
  plan = false,
  actions,
  onFabricShown,
  onError,
  onApi,
}: StageProps) {
  const [textureSize] = useState<TextureSize>(preferredTextureSize);
  const [prepared, setPrepared] = useState<Record<string, PreparedModel>>({});
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [roomExtent, setRoomExtent] = useState(0);
  const onRoomBuilt = useCallback((s: THREE.Vector3) => setRoomExtent(Math.hypot(s.x, s.z)), []);
  const inRoom = room.shape !== "yok";
  // the orbit camera; the plan view swaps in its own camera without touching this one
  const [orbitCamera, setOrbitCamera] = useState<THREE.Camera | null>(null);

  const handlePrepared = useCallback((id: string, p: PreparedModel) => setPrepared((m) => ({ ...m, [id]: p })), []);
  const handleShown = useCallback(
    (id: string, code: string, first: boolean) => {
      if (first) setVisible(true);
      onFabricShown?.(id, code, first);
    },
    [onFabricShown],
  );
  const handleDrag = useCallback(
    (on: boolean) => {
      setDragging(on);
      if (!on) actions.onDragEnd?.();
    },
    [actions],
  );

  const sizeOf = (p: Placement) => {
    const pr = prepared[p.id];
    if (pr) return { w: pr.size.x * 100, d: pr.size.z * 100 };
    const m = models.get(p.modelSlug);
    return { w: m?.dimensionsCm.w ?? 100, d: m?.dimensionsCm.d ?? 100 };
  };
  const footprints = items.map((p) => footprint(p, sizeOf(p)));
  const selectedIndex = Math.max(0, items.findIndex((p) => p.id === selectedId));
  const tallest = Math.max(0.5, ...items.map((p) => prepared[p.id]?.size.y ?? 0));
  const fabricKey = items.map((p) => p.fabricCode).join(",");

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
        // furniture lives on its own layer; pointer picking must see it
        state.raycaster.layers.enableAll();
        setOrbitCamera(state.camera);
        // Exposed for automated tests (colour check, screenshots); harmless in production.
        (window as unknown as { __ormenStage?: unknown }).__ormenStage = state;
      }}
      aria-label="3B sahne. Döndürmek için boş alanı, mobilyayı taşımak için mobilyayı sürükleyin."
      role="img"
    >
      <StudioLights ambient={ambient} />
      {items.map((p) => {
        const model = models.get(p.modelSlug);
        const fabric = fabrics.get(p.fabricCode);
        if (!model || !fabric) return null;
        const selected = p.id === selectedId;
        return (
          <PlacedFurniture
            key={p.id}
            p={p}
            model={model}
            fabric={fabric}
            compareFabric={selected ? compareFabric : compareFabric ? fabric : null}
            textureSize={textureSize}
            selected={selected}
            overlapping={overlapIds.has(p.id)}
            showDimensions={showDimensions && !plan}
            showToolbar={!dragging && !compareFabric}
            plan={plan}
            canDelete={items.length > 1}
            actions={actions}
            onSelect={actions.onSelect}
            onMove={actions.onMove}
            onDrag={handleDrag}
            onPrepared={handlePrepared}
            onFabricShown={handleShown}
            onError={onError}
          />
        );
      })}
      {compareFabric && <SplitRender split={split} />}
      {onApi && <SnapshotBridge onApi={onApi} split={compareFabric ? split : null} />}
      {visible && plan && (
        <PlanView room={room} pieces={footprints} selected={footprints[selectedIndex] ?? null} tallest={tallest} controlsEnabled={!dragging} />
      )}
      {visible && inRoom && <Room spec={room} backZ={0} onBuilt={onRoomBuilt} />}
      <ShadowMapRefresh version={`${encodeLayout(items)}:${fabricKey}:${compareFabric?.code}:${encodeRoom(room)}:${Object.keys(prepared).length}`} />
      <OrbitControls
        makeDefault
        camera={orbitCamera ?? undefined}
        enabled={!plan && !dragging}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        rotateSpeed={0.65}
        zoomSpeed={0.8}
        minPolarAngle={0.35}
        maxPolarAngle={Math.PI / 2 - 0.06}
      />
      <CameraRig
        prepared={items[0] ? prepared[items[0].id] ?? null : null}
        closeTarget={prepared[selectedId] ?? null}
        started={visible}
        roomExtent={inRoom ? roomExtent : 0}
        closeUp={closeUp && !plan}
      />
    </Canvas>
  );
}
