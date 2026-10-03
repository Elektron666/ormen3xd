import * as THREE from "three";

// Soft contact shadow baked once per model: the model is rendered from below
// with an orthographic camera, writing darkness that fades with height, then
// blurred and laid on the floor. Cheap at runtime (one textured quad).

const RES = 512;

export class GroundShadowBaker {
  readonly material: THREE.ShaderMaterial;
  private a: THREE.WebGLRenderTarget;
  private b: THREE.WebGLRenderTarget;
  private height: THREE.ShaderMaterial;
  private blur: THREE.ShaderMaterial;

  constructor(color: string, opacity: number) {
    const opts = { type: THREE.HalfFloatType, depthBuffer: true } as const;
    this.a = new THREE.WebGLRenderTarget(RES, RES, opts);
    this.b = new THREE.WebGLRenderTarget(RES, RES, opts);

    this.height = new THREE.ShaderMaterial({
      uniforms: { uFar: { value: 1 } },
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        varying float vH;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vH = wp.y;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uFar;
        varying float vH;
        void main() {
          float k = clamp(1.0 - vH / uFar, 0.0, 1.0);
          gl_FragColor = vec4(0.0, 0.0, 0.0, pow(k, 2.2));
        }`,
    });

    this.blur = new THREE.ShaderMaterial({
      uniforms: { tMap: { value: null }, uDir: { value: new THREE.Vector2() } },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tMap;
        uniform vec2 uDir;
        varying vec2 vUv;
        void main() {
          float w0 = 0.227027, w1 = 0.1945946, w2 = 0.1216216, w3 = 0.054054, w4 = 0.016216;
          float a = texture2D(tMap, vUv).a * w0;
          a += (texture2D(tMap, vUv + uDir).a + texture2D(tMap, vUv - uDir).a) * w1;
          a += (texture2D(tMap, vUv + uDir * 2.0).a + texture2D(tMap, vUv - uDir * 2.0).a) * w2;
          a += (texture2D(tMap, vUv + uDir * 3.0).a + texture2D(tMap, vUv - uDir * 3.0).a) * w3;
          a += (texture2D(tMap, vUv + uDir * 4.0).a + texture2D(tMap, vUv - uDir * 4.0).a) * w4;
          gl_FragColor = vec4(0.0, 0.0, 0.0, a);
        }`,
      depthTest: false,
      depthWrite: false,
    });

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tMap: { value: this.a.texture },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity },
      },
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      // the bake camera looks up, so its image is mirrored in x
      fragmentShader: /* glsl */ `
        uniform sampler2D tMap; uniform vec3 uColor; uniform float uOpacity;
        varying vec2 vUv;
        void main() { gl_FragColor = vec4(uColor, texture2D(tMap, vec2(1.0 - vUv.x, vUv.y)).a * uOpacity); }`,
    });
  }

  /** Renders the shadow of `target` covering a square of `extent` metres. */
  bake(gl: THREE.WebGLRenderer, target: THREE.Object3D, extent: number, far: number, blur: number): void {
    const half = extent / 2;
    const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0, far + 0.01);
    cam.position.set(0, -0.005, 0);
    cam.up.set(0, 0, -1);
    cam.lookAt(0, 1, 0);
    this.height.uniforms.uFar.value = far;

    const scene = new THREE.Scene();
    scene.overrideMaterial = this.height;
    const parent = target.parent;
    scene.add(target);

    const prevTarget = gl.getRenderTarget();
    const prevClear = gl.getClearColor(new THREE.Color());
    const prevAlpha = gl.getClearAlpha();
    gl.setClearColor(0x000000, 0);
    gl.setRenderTarget(this.a);
    gl.clear();
    gl.render(scene, cam);
    if (parent) parent.add(target);

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.blur);
    const quadScene = new THREE.Scene();
    quadScene.add(quad);
    const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const step = blur / RES;
    for (let i = 0; i < 3; i++) {
      this.blur.uniforms.tMap.value = this.a.texture;
      this.blur.uniforms.uDir.value.set(step * (i + 1), 0);
      gl.setRenderTarget(this.b);
      gl.clear();
      gl.render(quadScene, ortho);
      this.blur.uniforms.tMap.value = this.b.texture;
      this.blur.uniforms.uDir.value.set(0, step * (i + 1));
      gl.setRenderTarget(this.a);
      gl.clear();
      gl.render(quadScene, ortho);
    }
    quad.geometry.dispose();
    gl.setRenderTarget(prevTarget);
    gl.setClearColor(prevClear, prevAlpha);
  }

  dispose(): void {
    this.a.dispose();
    this.b.dispose();
    this.height.dispose();
    this.blur.dispose();
    this.material.dispose();
  }
}
