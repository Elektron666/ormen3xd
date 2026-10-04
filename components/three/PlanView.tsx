"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MapControls as MapControlsImpl } from "three-stdlib";
import { useThree } from "@react-three/fiber";
import { Html, Line, MapControls } from "@react-three/drei";
import * as THREE from "three";
import { showPrimary } from "@/lib/three/layers";
import { planBounds, planMeasures, type PlanBounds, type PlanMeasure } from "@/lib/room/plan";
import type { RoomSpec } from "@/lib/room/spec";
import type { Footprint } from "@/lib/room/layout";

// Top-down, orthographic plan of the room and the furniture. The ortho camera
// temporarily becomes the default camera; the orbit camera is left untouched,
// so leaving the plan returns to exactly the same 3D view.

const SAFE = { top: 96, bottom: 120, side: 56 }; // px kept clear for overlays

interface Fit {
  zoom: number;
  center: THREE.Vector3;
}

/** Zoom and centre that show the whole plan between the header and the toolbar. */
function computeFit(b: PlanBounds, size: { width: number; height: number }): Fit {
  const zoom = Math.max(
    20,
    Math.min((size.width - 2 * SAFE.side) / (b.maxX - b.minX), (size.height - SAFE.top - SAFE.bottom) / (b.maxZ - b.minZ)),
  );
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2 + (SAFE.bottom - SAFE.top) / 2 / zoom;
  return { zoom, center: new THREE.Vector3(cx, 0, cz) };
}

function applyFit(cam: THREE.OrthographicCamera, controls: MapControlsImpl | null, fit: Fit, size: { width: number; height: number }) {
  cam.left = -size.width / 2;
  cam.right = size.width / 2;
  cam.top = size.height / 2;
  cam.bottom = -size.height / 2;
  cam.zoom = fit.zoom;
  cam.position.set(fit.center.x, 30, fit.center.z);
  cam.lookAt(fit.center);
  cam.updateProjectionMatrix();
  if (controls) {
    controls.target.copy(fit.center);
    controls.update();
  }
}

const INK = "#2a2a28";
const INK_SOFT = "#7d7b75";

function Measure({ m, y }: { m: PlanMeasure; y: number }) {
  const [x0, z0] = m.from;
  const [x1, z1] = m.to;
  const horizontal = Math.abs(z1 - z0) < 1e-6;
  const t = 0.06;
  const tick = (x: number, z: number): [number, number, number][] =>
    horizontal ? [[x, y, z - t], [x, y, z + t]] : [[x - t, y, z], [x + t, y, z]];
  const color = m.kind === "bosluk" ? INK_SOFT : INK;
  return (
    <>
      <Line points={[[x0, y, z0], [x1, y, z1]]} color={color} lineWidth={1} dashed={m.kind === "bosluk"} dashSize={0.06} gapSize={0.04} />
      <Line points={tick(x0, z0)} color={color} lineWidth={1} />
      <Line points={tick(x1, z1)} color={color} lineWidth={1} />
      <Html position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <span
          className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] tabular-nums shadow-[0_1px_3px_rgba(0,0,0,0.1)] ${
            m.kind === "bosluk" ? "bg-kagit/90 text-antrasit-70" : "bg-kagit text-antrasit font-medium"
          }`}
        >
          {m.label}
        </span>
      </Html>
    </>
  );
}

function ScaleBar({ at, zoom }: { at: [number, number, number]; zoom: number }) {
  // 1 m in screen pixels is exactly the ortho zoom
  return (
    <Html position={at} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <div className="flex -translate-y-1/2 flex-col items-start gap-1">
        <div className="flex h-2 border-x border-b border-antrasit" style={{ width: zoom }}>
          <div className="w-1/2 border-r border-antrasit" />
        </div>
        <span className="text-[11px] text-antrasit-70">1 m</span>
      </div>
    </Html>
  );
}

export interface PlanViewProps {
  room: RoomSpec;
  /** Footprints of all pieces (for framing the studio). */
  pieces: Footprint[];
  /** The selected piece, whose size and clearances are measured. */
  selected: Footprint | null;
  /** Tallest piece, metres (dimension lines are drawn above it). */
  tallest: number;
  /** False while a piece is being dragged. */
  controlsEnabled: boolean;
}

export function PlanView({ room, pieces, selected, tallest, controlsEnabled }: PlanViewProps) {
  const get = useThree((s) => s.get);
  const set = useThree((s) => s.set);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useRef<MapControlsImpl>(null);

  const camera = useMemo(() => {
    const c = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 80);
    c.up.set(0, 0, -1); // back wall at the top of the screen
    showPrimary(c);
    return c;
  }, []);

  // frame once per room / piece count, not on every drag step
  const frameKey = `${room.shape}:${room.widthCm}:${room.depthCm}:${pieces.length}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bounds = useMemo(() => planBounds(room, pieces), [frameKey]);
  const others = useMemo(() => pieces.filter((p) => p !== selected), [pieces, selected]);
  const measures = useMemo(() => planMeasures(room, selected, others), [room, selected, others]);
  const fit = useMemo(() => computeFit(bounds, size), [bounds, size]);
  // zoom after the user scrolls; tied to the fit it started from
  const [userZoom, setUserZoom] = useState<{ fit: Fit; zoom: number } | null>(null);
  const zoom = userZoom?.fit === fit ? userZoom.zoom : fit.zoom;

  // become the default camera while mounted
  useEffect(() => {
    const previous = get().camera;
    set({ camera });
    return () => set({ camera: previous });
  }, [camera, get, set]);

  useEffect(() => {
    applyFit(camera, controls.current, fit, size);
    invalidate();
  }, [camera, fit, size, invalidate]);

  const lineY = Math.max(room.heightCm / 100, tallest) + 0.05;
  const showGrid = room.shape === "yok";

  return (
    <>
      <MapControls
        ref={controls}
        camera={camera}
        enabled={controlsEnabled}
        enableRotate={false}
        screenSpacePanning
        enableDamping={false}
        minZoom={20}
        maxZoom={600}
        onChange={() => setUserZoom({ fit, zoom: camera.zoom })}
      />
      {showGrid && <gridHelper args={[10, 20, "#cfc7b9", "#e3ddd2"]} position={[0, 0.001, 0]} />}
      {measures.map((m) => (
        <Measure key={m.id} m={m} y={lineY} />
      ))}
      <ScaleBar at={[bounds.minX + 0.05, lineY, bounds.maxZ - 0.05]} zoom={zoom} />
    </>
  );
}
