"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Fabric, FurnitureModel, TextureSize } from "@/lib/types";
import { PROCEDURAL_BUILDERS } from "@/lib/three/procedural/furniture";
import { prepareModel, type PreparedModel } from "@/lib/three/prepare-model";
import { FabricDresser } from "@/lib/three/fabric-dresser";

export interface FurnitureObjectProps {
  model: FurnitureModel;
  fabric: Fabric;
  textureSize: TextureSize;
  onPrepared?: (prepared: PreparedModel) => void;
  /** Called once a fabric is actually visible on the model. */
  onFabricShown?: (code: string, first: boolean) => void;
  onError?: (err: unknown) => void;
}

function Dressed({ source, model, fabric, textureSize, onPrepared, onFabricShown, onError }: FurnitureObjectProps & { source: THREE.Object3D }) {
  const invalidate = useThree((s) => s.invalidate);
  const prepared = useMemo(() => prepareModel(source, model.fabricMaterialNames), [source, model.fabricMaterialNames]);
  const dresser = useMemo(() => new FabricDresser(prepared.root, prepared.slots), [prepared]);
  const shown = useRef(false);
  const callbacks = useRef({ onPrepared, onFabricShown, onError });
  useEffect(() => {
    callbacks.current = { onPrepared, onFabricShown, onError };
  });

  useEffect(() => {
    dresser.setVisible(false);
    shown.current = false;
    callbacks.current.onPrepared?.(prepared);
    return () => dresser.dispose();
  }, [prepared, dresser]);

  useEffect(() => {
    let alive = true;
    dresser
      .apply(fabric, textureSize)
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
  }, [dresser, fabric, textureSize, invalidate]);

  useFrame((_, delta) => {
    if (dresser.tick(Math.min(delta, 0.05))) invalidate();
  });

  return <primitive object={prepared.root} />;
}

function ProceduralFurniture(props: FurnitureObjectProps & { generator: keyof typeof PROCEDURAL_BUILDERS }) {
  const source = useMemo(() => PROCEDURAL_BUILDERS[props.generator](), [props.generator]);
  return <Dressed {...props} source={source} />;
}

function GlbFurniture(props: FurnitureObjectProps & { url: string }) {
  const gltf = useGLTF(props.url);
  // clone so several viewers (e.g. compare mode) can dress the same file differently
  const source = useMemo(() => gltf.scene.clone(true), [gltf.scene]);
  return <Dressed {...props} source={source} />;
}

export function FurnitureObject(props: FurnitureObjectProps) {
  const src = props.model.source;
  if (src.kind === "procedural") return <ProceduralFurniture {...props} generator={src.generator} />;
  return <GlbFurniture {...props} url={src.url} />;
}
