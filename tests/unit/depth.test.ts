import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { furnitureBox, nearPlane, NEAR } from "@/lib/three/depth";
import { LAYER_PRIMARY } from "@/lib/three/constants";

describe("yakın kesme düzlemi (Ar-Ge A5)", () => {
  it("mobilyaya olan uzaklığın yarısı, 2 cm ile 50 cm arasında", () => {
    expect(nearPlane(4)).toBe(NEAR.max);
    expect(nearPlane(0.6)).toBeCloseTo(0.3);
    expect(nearPlane(0)).toBe(NEAR.min);
  });

  it("yalnızca mobilya katmanındaki görünür parçaları sayar", () => {
    const scene = new THREE.Scene();
    const sofa = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1));
    sofa.position.set(0, 0.5, 0);
    sofa.layers.set(LAYER_PRIMARY);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 0.1)); // room: layer 0
    wall.position.set(0, 1.5, -3);
    const hidden = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    hidden.layers.set(LAYER_PRIMARY);
    hidden.visible = false;
    hidden.position.set(5, 0, 5);
    scene.add(sofa, wall, hidden);
    scene.updateMatrixWorld(true);
    const box = furnitureBox(scene, new THREE.Box3());
    expect(box.min.toArray()).toEqual([-1, 0, -0.5]);
    expect(box.max.toArray()).toEqual([1, 1, 0.5]);
    // a camera 4 m in front: near at the 50 cm cap, well short of the sofa's front at 3.5 m
    expect(nearPlane(box.distanceToPoint(new THREE.Vector3(0, 0.5, 4)))).toBe(0.5);
  });
});
