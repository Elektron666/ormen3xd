"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Fabric, FurnitureModel, ModelSource, TextureSize } from "@/lib/types";
import { buildCodeModel } from "@/lib/three/procedural";
import { prepareModel, type PreparedModel } from "@/lib/three/prepare-model";
import { FabricDresser } from "@/lib/three/fabric-dresser";
import { setObjectLayer } from "@/lib/three/layers";
import { LAYER_PRIMARY } from "@/lib/three/constants";
import { ZONES, type Zone } from "@/lib/three/zones";

export interface FurnitureObjectProps {
  model: FurnitureModel;
  fabric: Fabric;
  /** Single zones (arms, cushions…) in their own fabric. */
  zoneFabrics?: Partial<Record<Zone, Fabric>>;
  textureSize: TextureSize;
  onPrepared?: (prepared: PreparedModel) => void;
  /** Called once a fabric is actually visible on the model. */
  onFabricShown?: (code: string, first: boolean) => void;
  onError?: (err: unknown) => void;
  /** Render layer (see LAYER_PRIMARY / LAYER_COMPARE). */
  layer?: number;
}

function Dressed({ source, model, fabric, zoneFabrics, textureSize, onPrepared, onFabricShown, onError, layer = LAYER_PRIMARY }: FurnitureObjectProps & { source: THREE.Object3D }) {
  const invalidate = useThree((s) => s.invalidate);
  const prepared = useMemo(() => prepareModel(source, model.fabricMaterialNames), [source, model.fabricMaterialNames]);
  const dresser = useMemo(() => new FabricDresser(prepared.root, prepared.slots), [prepared]);
  const shown = useRef(false);
  const callbacks = useRef({ onPrepared, onFabricShown, onError });
  useEffect(() => {
    callbacks.current = { onPrepared, onFabricShown, onError };
  });

  // the layer can change (e.g. compare mode) without re-preparing the model
  useEffect(() => {
    setObjectLayer(prepared.root, layer);
    invalidate();
  }, [prepared, layer, invalidate]);

  useEffect(() => {
    dresser.setVisible(false);
    shown.current = false;
    callbacks.current.onPrepared?.(prepared);
    return () => dresser.dispose();
  }, [prepared, dresser]);

  // compared by codes, so a new object with the same fabrics does not re-dress
  const zoneKey = ZONES.map((z) => zoneFabrics?.[z]?.code ?? "").join(",");
  const zones = useRef(zoneFabrics);
  // runs before the dressing effect below (effects run in order)
  useEffect(() => {
    zones.current = zoneFabrics;
  });
  useEffect(() => {
    let alive = true;
    dresser
      .apply(fabric, textureSize, { zones: zones.current })
      .then((applied) => {
        if (!alive || !applied) return;
        const first = !shown.current;
        shown.current = true;
        dresser.setVisible(true);
        callbacks.current.onFabricShown?.(fabric.code, first);
        invalidate();
      })
      .catch((err) => callbacks.current.onError?.(err));
    return () => {
      alive = false;
    };
  }, [dresser, fabric, zoneKey, textureSize, invalidate]);

  useFrame((_, delta) => {
    if (dresser.tick(Math.min(delta, 0.05))) invalidate();
  });

  return <primitive object={prepared.root} />;
}

function CodeFurniture(props: FurnitureObjectProps & { src: Exclude<ModelSource, { kind: "glb" }> }) {
  // rebuilt only when the description changes (params are compared by value)
  const key = JSON.stringify(props.src);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const source = useMemo(() => buildCodeModel(props.src), [key]);
  return <Dressed {...props} source={source} />;
}

function GlbFurniture(props: FurnitureObjectProps & { url: string }) {
  // Draco decoder served from our own domain (public/draco), not a CDN
  const gltf = useGLTF(props.url, "/draco/");
  // clone so several viewers (e.g. compare mode) can dress the same file differently
  const source = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  return <Dressed {...props} source={source} />;
}

export function FurnitureObject(props: FurnitureObjectProps) {
  const src = props.model.source;
  if (src.kind !== "glb") return <CodeFurniture {...props} src={src} />;
  return <GlbFurniture {...props} url={src.url} />;
}
