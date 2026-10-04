// Generates a small sample model (a round pouf) as a .glb file, to try the
// panel's model upload without any third-party asset. Code-generated, no
// licences involved. UVs are in metres so the fabric shows at real size.
//
//   npx tsx scripts/generate-sample-glb.ts

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

// GLTFExporter reads Blobs through FileReader, which Node does not have.
class NodeFileReader {
  result: ArrayBuffer | string | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(b: Blob) {
    void b.arrayBuffer().then((buf) => {
      this.result = buf;
      this.onloadend?.();
    });
  }
  readAsDataURL(b: Blob) {
    void b.arrayBuffer().then((buf) => {
      this.result = `data:${b.type};base64,${Buffer.from(buf).toString("base64")}`;
      this.onloadend?.();
    });
  }
}
(globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReader;

const R = 0.27; // radius (m)
const H = 0.42; // seat height (m)
const LEG = 0.05;

/** Rescales a geometry's UVs so 1 UV unit = 1 metre on the surface. */
function uvToMetres(geo: THREE.BufferGeometry, su: number, sv: number) {
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
}

const fabric = new THREE.MeshStandardMaterial({ name: "kumas", color: "#cfc6b8", roughness: 0.9 });
const wood = new THREE.MeshStandardMaterial({ name: "ayak", color: "#4a3324", roughness: 0.55 });
const root = new THREE.Group();
root.name = "ornek-puf";

const bodyH = H - LEG - 0.03;
const body = new THREE.CylinderGeometry(R, R, bodyH, 64, 1, true);
uvToMetres(body, 2 * Math.PI * R, bodyH);
const side = new THREE.Mesh(body, fabric);
side.name = "govde";
side.position.y = LEG + bodyH / 2;
root.add(side);

// soft rounded top: a flattened half-torus rim + a disc
const rimR = 0.03;
const rim = new THREE.TorusGeometry(R - rimR, rimR, 16, 64, Math.PI * 2);
uvToMetres(rim, 2 * Math.PI * R, 2 * Math.PI * rimR);
const rimMesh = new THREE.Mesh(rim, fabric);
rimMesh.name = "kenar";
rimMesh.rotation.x = -Math.PI / 2;
rimMesh.position.y = LEG + bodyH;
root.add(rimMesh);

const top = new THREE.CircleGeometry(R - rimR, 64);
uvToMetres(top, 2 * (R - rimR), 2 * (R - rimR));
const topMesh = new THREE.Mesh(top, fabric);
topMesh.name = "ust";
topMesh.rotation.x = -Math.PI / 2;
topMesh.position.y = LEG + bodyH + rimR;
root.add(topMesh);

const bottom = new THREE.CircleGeometry(R, 64);
const bottomMesh = new THREE.Mesh(bottom, fabric);
bottomMesh.name = "alt";
bottomMesh.rotation.x = Math.PI / 2;
bottomMesh.position.y = LEG;
root.add(bottomMesh);

for (let i = 0; i < 4; i++) {
  const a = Math.PI / 4 + (i * Math.PI) / 2;
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.011, LEG, 16), wood);
  leg.name = `ayak-${i + 1}`;
  leg.position.set(Math.cos(a) * (R - 0.06), LEG / 2, Math.sin(a) * (R - 0.06));
  root.add(leg);
}

const out = path.join(process.cwd(), "tests", "fixtures", "ornek-puf.glb");
mkdirSync(path.dirname(out), { recursive: true });
new GLTFExporter().parse(
  root,
  (glb) => {
    writeFileSync(out, Buffer.from(glb as ArrayBuffer));
    console.log(`${out} (${Math.round((glb as ArrayBuffer).byteLength / 1024)} KB)`);
  },
  (err) => {
    console.error(err);
    process.exit(1);
  },
  { binary: true },
);
