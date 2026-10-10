"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { Fabric, FurnitureModel } from "@/lib/types";
import type { PreparedModel } from "@/lib/three/prepare-model";
import { FurnitureObject } from "@/components/three/FurnitureObject";
import { GroundShadow } from "@/components/three/GroundShadow";
import { CameraRig, FOV } from "@/components/three/CameraRig";
import { StudioLights } from "@/components/three/Stage";
import { ScaleGrid } from "@/components/three/ScaleGrid";
import { showPrimary } from "@/lib/three/layers";

/**
 * Fixed angles to match a firm's photo (spherical: theta around the piece from
 * the front, phi from straight up). Most product photos are taken from a
 * little above seat height, so all views look slightly down.
 */
export const VIEWS = {
  sol: { label: "Soldan çapraz", theta: -0.62, phi: 1.32 },
  on: { label: "Önden", theta: 0, phi: 1.36 },
  sag: { label: "Sağdan çapraz", theta: 0.62, phi: 1.32 },
  yan: { label: "Yandan", theta: Math.PI / 2, phi: 1.4 },
} as const;
export type View = keyof typeof VIEWS;

/** Turns the orbit camera to a fixed angle around the current target, keeping the distance. */
function ViewTurner({ view }: { view: { key: View; n: number } | null }) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const invalidate = useThree((s) => s.invalidate);
  const anim = useRef<{ t: number; from: THREE.Vector3; to: THREE.Vector3 } | null>(null);
  useEffect(() => {
    if (!view || !controls) return;
    // a "start" stops the intro turn, exactly as a user's drag does
    controls.dispatchEvent({ type: "start" } as never);
    const v = VIEWS[view.key];
    const d = camera.position.distanceTo(controls.target);
    const to = new THREE.Vector3().setFromSpherical(new THREE.Spherical(d, v.phi, v.theta)).add(controls.target);
    anim.current = { t: 0, from: camera.position.clone(), to };
    invalidate();
  }, [view, controls, camera, invalidate]);
  useFrame((_, delta) => {
    const a = anim.current;
    if (!a || !controls) return;
    a.t = Math.min(1, a.t + delta / 0.6);
    const e = a.t < 0.5 ? 2 * a.t * a.t : 1 - (-2 * a.t + 2) ** 2 / 2;
    // around the target, not through it: interpolate on the sphere
    const r = a.from.distanceTo(controls.target);
    const dir = a.from.clone().sub(controls.target).normalize().lerp(a.to.clone().sub(controls.target).normalize(), e).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, r);
    controls.update();
    if (a.t >= 1) anim.current = null;
    invalidate();
  });
  return null;
}

/** Live 3D preview for the panel: a model dressed in the fabric being edited. */
export function FabricPreview({ model, fabric, scaleCheck = false, views = false }: { model: FurnitureModel; fabric: Fabric | null; scaleCheck?: boolean; views?: boolean }) {
  const [view, setView] = useState<{ key: View; n: number } | null>(null);
  const [prepared, setPrepared] = useState<PreparedModel | null>(null);
  const [shown, setShown] = useState(false);
  const onPrepared = useCallback((p: PreparedModel) => {
    setShown(false);
    setPrepared(p);
  }, []);
  const onShown = useCallback((_code: string, first: boolean) => {
    if (first) setShown(true);
  }, []);

  return (
    <div className="studio-backdrop relative h-full min-h-[320px] w-full overflow-hidden rounded-2xl border border-cizgi">
      {fabric ? (
        <Canvas
          frameloop="demand"
          dpr={[1, 2]}
          camera={{ fov: FOV, near: 0.05, far: 60, position: [0, 1.2, 5] }}
          gl={{ antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
          onCreated={(s) => showPrimary(s.camera)}
        >
          <StudioLights ambient={1} />
          <Suspense fallback={null}>
            <FurnitureObject key={model.id} model={model} fabric={fabric} textureSize="2k" onPrepared={onPrepared} onFabricShown={onShown} />
          </Suspense>
          {prepared && shown && <GroundShadow target={prepared.root} size={prepared.size} far={0.5} opacity={0.6} blur={2.5} />}
          {prepared && shown && scaleCheck && <ScaleGrid prepared={prepared} />}
          <OrbitControls makeDefault enablePan={false} enableDamping minPolarAngle={0.3} maxPolarAngle={Math.PI / 2 - 0.05} />
          <CameraRig prepared={prepared} closeTarget={null} started={shown} roomExtent={0} closeUp={false} />
          {views && <ViewTurner view={view} />}
        </Canvas>
      ) : null}
      {fabric && views && (
        <div role="group" aria-label="Bakış açısı" className="absolute left-2 top-2 z-10 flex flex-wrap gap-1">
          {(Object.keys(VIEWS) as View[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setView((v) => ({ key: k, n: (v?.n ?? 0) + 1 }))}
              className="h-8 rounded-full border border-cizgi bg-white/90 px-3 text-[12px] text-antrasit backdrop-blur hover:border-cizgi-koyu focus-visible:outline-2 focus-visible:outline-antrasit"
            >
              {VIEWS[k].label}
            </button>
          ))}
        </div>
      )}
      {!fabric && (
        <div className="flex h-full items-center justify-center p-8 text-center text-[14px] text-antrasit-50">
          Fotoğraf yüklenince kumaş burada koltuğun üstünde görünecek.
        </div>
      )}
    </div>
  );
}
