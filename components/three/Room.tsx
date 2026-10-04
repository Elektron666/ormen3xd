"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { buildRoom, disposeRoom, updateWallVisibility } from "@/lib/room/build";
import { floorFinish, wallColor, type RoomSpec } from "@/lib/room/spec";

interface RoomProps {
  spec: RoomSpec;
  /** z of the back wall's inner face (just behind the furniture). */
  backZ: number;
  onBuilt?: (size: THREE.Vector3) => void;
}

function RoomMesh({ spec, backZ, floorMaterial, onBuilt }: RoomProps & { floorMaterial: THREE.Material }) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);

  const wall = useMemo(
    () => {
      // Walls are décor, not product: a little self-light keeps light colours
      // reading as light instead of grey. The fabric's lighting is untouched.
      const color = new THREE.Color(wallColor(spec.wallId).hex);
      return new THREE.MeshStandardMaterial({ name: "duvar", color, emissive: color.clone().multiplyScalar(0.32), roughness: 0.92 });
    },
    [spec.wallId],
  );
  const skirting = useMemo(() => new THREE.MeshStandardMaterial({ name: "supurgelik", color: "#F2EFEA", roughness: 0.6 }), []);

  const room = useMemo(
    () => buildRoom(spec, backZ, { floor: floorMaterial, wall, skirting }),
    [spec, backZ, floorMaterial, wall, skirting],
  );

  useEffect(() => {
    updateWallVisibility(room.walls, camera.position);
    onBuilt?.(room.size);
    invalidate();
    return () => disposeRoom(room);
  }, [room, camera, invalidate, onBuilt]);

  useEffect(() => () => wall.dispose(), [wall]);
  useEffect(() => () => skirting.dispose(), [skirting]);

  useFrame(() => {
    if (updateWallVisibility(room.walls, camera.position)) invalidate();
  });

  return <primitive object={room.group} />;
}

function TexturedRoom(props: RoomProps) {
  const finish = floorFinish(props.spec.floorId);
  const [albedo, rough, normal] = useLoader(THREE.TextureLoader, [finish.albedo, finish.roughness, finish.normal]);
  const gl = useThree((s) => s.gl);

  const material = useMemo(() => {
    const prep = (t: THREE.Texture, srgb: boolean) => {
      const c = t.clone();
      c.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      c.wrapS = c.wrapT = THREE.RepeatWrapping;
      c.repeat.setScalar(1 / finish.tileM);
      c.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
      c.needsUpdate = true;
      return c;
    };
    return new THREE.MeshStandardMaterial({
      name: "zemin",
      map: prep(albedo, true),
      roughnessMap: prep(rough, false),
      normalMap: prep(normal, false),
      normalScale: new THREE.Vector2(0.6, 0.6),
      roughness: 1,
    });
  }, [albedo, rough, normal, finish.tileM, gl]);

  useEffect(() => () => material.dispose(), [material]);
  return <RoomMesh {...props} floorMaterial={material} />;
}

function PlainRoom(props: RoomProps) {
  const color = floorFinish(props.spec.floorId).avgColor;
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color, roughness: 0.7 }), [color]);
  useEffect(() => () => material.dispose(), [material]);
  return <RoomMesh {...props} floorMaterial={material} />;
}

/** The room shell; while floor textures load, the floor shows its mean colour. */
export function Room(props: RoomProps) {
  if (props.spec.shape === "yok") return null;
  return (
    <Suspense fallback={<PlainRoom {...props} />}>
      <TexturedRoom {...props} />
    </Suspense>
  );
}
