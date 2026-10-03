"use client";

import { useEffect, useMemo } from "react";
import { useThree } from "@react-three/fiber";
import type * as THREE from "three";
import { GroundShadowBaker } from "@/lib/three/ground-shadow";

export interface GroundShadowProps {
  target: THREE.Object3D;
  /** Model bounding box size in metres. */
  size: THREE.Vector3;
  opacity?: number;
  color?: string;
  /** Height over which the shadow fades out, metres. */
  far?: number;
  blur?: number;
}

export function GroundShadow({ target, size, opacity = 0.6, color = "#2a2520", far = 0.5, blur = 3 }: GroundShadowProps) {
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const extent = Math.max(size.x, size.z) * 1.6;
  const baker = useMemo(() => new GroundShadowBaker(color, opacity), [color, opacity]);

  useEffect(() => {
    baker.bake(gl, target, extent, far, blur);
    invalidate();
  }, [baker, gl, target, extent, far, blur, invalidate]);

  useEffect(() => () => baker.dispose(), [baker]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0015, 0]} material={baker.material} renderOrder={-1}>
      <planeGeometry args={[extent, extent]} />
    </mesh>
  );
}
