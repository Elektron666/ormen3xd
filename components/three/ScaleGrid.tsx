"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { PreparedModel } from "@/lib/three/prepare-model";

// "Ölçek kontrol": a 10 cm grid laid over every upholstered part, using the
// same UV-density measurement as the fabric. If a bouclé loop measured 2 cm
// on the real fabric, five of them should fit in one square here.

const CELL_CM = 10;

function gridTexture(): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "rgba(180, 72, 60, 0.95)";
  ctx.fillRect(0, 0, size, 3); // top edge
  ctx.fillRect(0, 0, 3, size); // left edge
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function addGrid(prepared: PreparedModel): () => void {
  const base = gridTexture();
  const added: { parent: THREE.Object3D; mesh: THREE.Mesh; mat: THREE.Material; tex: THREE.Texture }[] = [];
  for (const slot of prepared.slots) {
    const tex = base.clone();
    const k = (Number.isFinite(slot.cmPerUv) ? slot.cmPerUv : 100) / CELL_CM;
    tex.repeat.set(k, k);
    tex.needsUpdate = true;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
    const mesh = new THREE.Mesh(slot.mesh.geometry, mat);
    mesh.name = "olcek-izgara";
    mesh.renderOrder = 2;
    mesh.layers.mask = slot.mesh.layers.mask;
    slot.mesh.add(mesh);
    added.push({ parent: slot.mesh, mesh, mat, tex });
  }
  return () => {
    for (const a of added) {
      a.parent.remove(a.mesh);
      a.mat.dispose();
      a.tex.dispose();
    }
    base.dispose();
  };
}

export function ScaleGrid({ prepared }: { prepared: PreparedModel }) {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    const remove = addGrid(prepared);
    invalidate();
    return () => {
      remove();
      invalidate();
    };
  }, [prepared, invalidate]);
  return null;
}
