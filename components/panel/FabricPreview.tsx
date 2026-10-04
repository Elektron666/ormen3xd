"use client";

import { Suspense, useCallback, useState } from "react";
import { Canvas } from "@react-three/fiber";
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

/** Live 3D preview for the panel: a model dressed in the fabric being edited. */
export function FabricPreview({ model, fabric, scaleCheck = false }: { model: FurnitureModel; fabric: Fabric | null; scaleCheck?: boolean }) {
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
        </Canvas>
      ) : (
        <div className="flex h-full items-center justify-center p-8 text-center text-[14px] text-antrasit-50">
          Fotoğraf yüklenince kumaş burada koltuğun üstünde görünecek.
        </div>
      )}
    </div>
  );
}
