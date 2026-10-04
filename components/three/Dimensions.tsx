"use client";

import { Html, Line } from "@react-three/drei";
import type * as THREE from "three";

const COLOR = "#2a2a28";
const TICK = 0.05;
const GAP = 0.14;

function Label({ position, text }: { position: [number, number, number]; text: string }) {
  return (
    <Html position={position} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
      <span className="whitespace-nowrap rounded-full bg-kagit/95 px-2.5 py-1 text-[12px] font-medium tabular-nums text-antrasit shadow-[0_1px_4px_rgba(0,0,0,0.12)]">
        {text}
      </span>
    </Html>
  );
}

function Measure({ from, to, tickAxis, label }: { from: [number, number, number]; to: [number, number, number]; tickAxis: 0 | 1 | 2; label: string }) {
  const tick = (p: [number, number, number]): [number, number, number][] => {
    const a = [...p] as [number, number, number];
    const b = [...p] as [number, number, number];
    a[tickAxis] -= TICK / 2;
    b[tickAxis] += TICK / 2;
    return [a, b];
  };
  const mid: [number, number, number] = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2];
  return (
    <>
      <Line points={[from, to]} color={COLOR} lineWidth={1.2} transparent opacity={0.85} />
      <Line points={tick(from)} color={COLOR} lineWidth={1.2} />
      <Line points={tick(to)} color={COLOR} lineWidth={1.2} />
      <Label position={mid} text={label} />
    </>
  );
}

const cm = (m: number) => `${Math.round(m * 100)} cm`;

/** Width, depth and height of the furniture, measured from its real bounding box. */
export function Dimensions({ size }: { size: THREE.Vector3 }) {
  const w = size.x / 2, d = size.z / 2, h = size.y;
  const y = 0.004;
  return (
    <group name="olculer">
      <Measure from={[-w, y, d + GAP]} to={[w, y, d + GAP]} tickAxis={2} label={`Genişlik ${cm(size.x)}`} />
      <Measure from={[w + GAP, y, -d]} to={[w + GAP, y, d]} tickAxis={0} label={`Derinlik ${cm(size.z)}`} />
      <Measure from={[w + GAP, 0, -d]} to={[w + GAP, h, -d]} tickAxis={0} label={`Yükseklik ${cm(size.y)}`} />
    </group>
  );
}
