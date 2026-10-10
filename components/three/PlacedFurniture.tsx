"use client";

import { Suspense, useCallback, useRef, useState } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, Line } from "@react-three/drei";
import * as THREE from "three";
import type { Fabric, FurnitureModel, TextureSize } from "@/lib/types";
import type { Zone } from "@/lib/three/zones";
import type { Placement } from "@/lib/room/layout";
import type { PreparedModel } from "@/lib/three/prepare-model";
import { LAYER_COMPARE, LAYER_PRIMARY } from "@/lib/three/constants";
import { FurnitureObject } from "./FurnitureObject";
import { GroundShadow } from "./GroundShadow";
import { Dimensions } from "./Dimensions";

const FLOOR = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ACCENT = "#B08D57";
const WARN = "#B4483C";

function setCursor(c: string) {
  document.body.style.cursor = c;
}

/** Turns the orbit controls off for the rest of this pointer gesture. */
function holdControls(controls: unknown, on: boolean) {
  const c = controls as { enabled?: boolean } | null;
  if (c) c.enabled = on;
}

function Outline({ size, warn }: { size: THREE.Vector3; warn: boolean }) {
  const hx = size.x / 2 + 0.04;
  const hz = size.z / 2 + 0.04;
  const y = 0.006;
  return (
    <Line
      name="secim"
      points={[[-hx, y, -hz], [hx, y, -hz], [hx, y, hz], [-hx, y, hz], [-hx, y, -hz]]}
      color={warn ? WARN : ACCENT}
      lineWidth={2}
      dashed={warn}
      dashSize={0.08}
      gapSize={0.05}
    />
  );
}

export interface PieceActions {
  onRotate: (id: string, deg: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

function PieceToolbar({
  p,
  name,
  canDelete,
  actions,
  size,
  plan,
}: {
  p: Placement;
  name: string;
  canDelete: boolean;
  actions: PieceActions;
  size: THREE.Vector3;
  plan: boolean;
}) {
  // 3D: float above the piece. Plan: sit beyond the piece's far side (screen
  // top = world −z), turned back into the piece's own frame.
  const position = plan
    ? new THREE.Vector3(0, size.y + 0.1, -(Math.hypot(size.x, size.z) / 2 + 0.35)).applyAxisAngle(new THREE.Vector3(0, 1, 0), (-p.rot * Math.PI) / 180)
    : new THREE.Vector3(0, size.y + 0.18, 0);
  const btn =
    "flex h-9 min-w-9 items-center justify-center rounded-full px-2.5 text-[12px] text-antrasit transition-colors hover:bg-cizgi/70 focus-visible:outline-2 focus-visible:outline-antrasit";
  return (
    <Html position={position} center zIndexRange={[30, 0]}>
      {/* stop pointer events reaching the canvas, so a click here never starts a drag */}
      <div
        role="toolbar"
        aria-label={`${name} araçları`}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex items-center gap-0.5 whitespace-nowrap rounded-full border border-cizgi bg-kagit/95 p-1 shadow-[0_6px_20px_-10px_rgba(42,42,40,0.45)]"
      >
        <span className="px-2.5 text-[12px] text-antrasit-70">{name}</span>
        <button type="button" className={btn} onClick={() => actions.onRotate(p.id, -45)} aria-label="Sola 45° döndür" title="Sola döndür">
          ↺ 45°
        </button>
        <button type="button" className={btn} onClick={() => actions.onRotate(p.id, 45)} aria-label="Sağa 45° döndür" title="Sağa döndür">
          ↻ 45°
        </button>
        <button type="button" className={btn} onClick={() => actions.onDuplicate(p.id)}>
          Çoğalt
        </button>
        {canDelete && (
          <button type="button" className={`${btn} text-[#9a3b31]`} onClick={() => actions.onDelete(p.id)}>
            Kaldır
          </button>
        )}
      </div>
    </Html>
  );
}

export interface PlacedFurnitureProps {
  p: Placement;
  model: FurnitureModel;
  fabric: Fabric;
  zoneFabrics?: Partial<Record<Zone, Fabric>>;
  compareFabric: Fabric | null;
  textureSize: TextureSize;
  selected: boolean;
  overlapping: boolean;
  showDimensions: boolean;
  showToolbar: boolean;
  plan: boolean;
  canDelete: boolean;
  actions: PieceActions;
  onSelect: (id: string) => void;
  onMove: (id: string, x: number, z: number) => void;
  onDrag: (dragging: boolean) => void;
  onPrepared: (id: string, prepared: PreparedModel) => void;
  onFabricShown: (id: string, code: string, first: boolean) => void;
  onError?: (err: unknown) => void;
}

/** One piece in the layout: positioned, dressed, shadowed and draggable on the floor. */
export function PlacedFurniture(props: PlacedFurnitureProps) {
  const { p, model, fabric, compareFabric, textureSize, selected } = props;
  const controls = useThree((s) => s.controls);
  const [prepared, setPrepared] = useState<PreparedModel | null>(null);
  const [shown, setShown] = useState(false);
  const drag = useRef<{ dx: number; dz: number; pointer: number } | null>(null);
  const hit = useRef(new THREE.Vector3());

  const handlePrepared = useCallback(
    (pr: PreparedModel) => {
      setShown(false);
      setPrepared(pr);
      props.onPrepared(p.id, pr);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.id, props.onPrepared],
  );
  const handleShown = useCallback(
    (code: string, first: boolean) => {
      if (first) setShown(true);
      props.onFabricShown(p.id, code, first);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [p.id, props.onFabricShown],
  );

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    props.onSelect(p.id);
    if (!e.ray.intersectPlane(FLOOR, hit.current)) return;
    drag.current = { dx: p.x - hit.current.x, dz: p.z - hit.current.z, pointer: e.pointerId };
    (e.target as Element).setPointerCapture?.(e.pointerId);
    holdControls(controls, false);
    setCursor("grabbing");
    props.onDrag(true);
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.pointer) return;
    e.stopPropagation();
    if (!e.ray.intersectPlane(FLOOR, hit.current)) return;
    props.onMove(p.id, hit.current.x + d.dx, hit.current.z + d.dz);
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    if (!drag.current) return;
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    drag.current = null;
    holdControls(controls, true);
    setCursor("grab");
    props.onDrag(false);
  };

  return (
    <group
      position={[p.x, 0, p.z]}
      rotation={[0, (p.rot * Math.PI) / 180, 0]}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerOver={() => !drag.current && setCursor("grab")}
      onPointerOut={() => !drag.current && setCursor("")}
    >
      <Suspense fallback={null}>
        <FurnitureObject
          model={model}
          fabric={fabric}
          zoneFabrics={props.zoneFabrics}
          legFinish={p.ayak}
          turned={p.yon === "donuk"}
          textureSize={textureSize}
          // in compare mode only the selected piece is split; the rest is shared by both halves
          layer={compareFabric && !selected ? 0 : LAYER_PRIMARY}
          onPrepared={handlePrepared}
          onFabricShown={handleShown}
          onError={props.onError}
        />
      </Suspense>
      {selected && compareFabric && (
        <Suspense fallback={null}>
          <FurnitureObject model={model} fabric={compareFabric} legFinish={p.ayak} turned={p.yon === "donuk"} textureSize={textureSize} layer={LAYER_COMPARE} onError={props.onError} />
        </Suspense>
      )}
      {prepared && shown && (
        <GroundShadow target={prepared.root} size={prepared.size} far={Math.min(0.6, prepared.size.y * 0.7)} opacity={0.7} blur={2.5} />
      )}
      {prepared && shown && (selected || props.overlapping) && <Outline size={prepared.size} warn={props.overlapping} />}
      {prepared && shown && selected && props.showDimensions && <Dimensions size={prepared.size} />}
      {prepared && shown && selected && props.showToolbar && (
        <PieceToolbar p={p} name={model.name} canDelete={props.canDelete} actions={props.actions} size={prepared.size} plan={props.plan} />
      )}
    </group>
  );
}
