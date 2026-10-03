import * as THREE from "three";
import type { Fabric, TextureSize } from "@/lib/types";
import { MATERIAL_PRESETS } from "@/lib/fabric/presets";
import { hexToRgb } from "@/lib/fabric/maps";

export interface FabricTextures {
  albedo: THREE.Texture;
  normal?: THREE.Texture;
  roughness?: THREE.Texture;
}

const loader = new THREE.TextureLoader();
const cache = new Map<string, Promise<FabricTextures>>();

/** Picks 2K textures on large, fine-pointer screens and 1K everywhere else. */
export function preferredTextureSize(): TextureSize {
  if (typeof window === "undefined") return "1k";
  const desktop = window.matchMedia("(min-width: 1024px) and (pointer: fine)").matches;
  return desktop ? "2k" : "1k";
}

function load(url: string, colorSpace: THREE.ColorSpace, anisotropy: number): Promise<THREE.Texture> {
  return loader.loadAsync(url).then((tex) => {
    tex.colorSpace = colorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = anisotropy;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Loads (once) the texture set of a fabric. Colour maps are sRGB; normal and
 * roughness maps are data and stay linear.
 */
export function loadFabricTextures(fabric: Fabric, size: TextureSize, anisotropy = 8): Promise<FabricTextures> {
  const key = `${fabric.id}:${size}`;
  let entry = cache.get(key);
  if (!entry) {
    const m = fabric.texture.maps;
    entry = Promise.all([
      load(m.albedo[size], THREE.SRGBColorSpace, anisotropy),
      m.normal ? load(m.normal[size], THREE.NoColorSpace, anisotropy) : undefined,
      m.roughness ? load(m.roughness[size], THREE.NoColorSpace, anisotropy) : undefined,
    ]).then(([albedo, normal, roughness]) => ({ albedo, normal, roughness }));
    entry.catch(() => cache.delete(key));
    cache.set(key, entry);
  }
  return entry;
}

/** Fire-and-forget warm-up, e.g. on hover or focus of a swatch. */
export function prefetchFabric(fabric: Fabric, size: TextureSize): void {
  loadFabricTextures(fabric, size).catch(() => undefined);
}

function withRepeat(tex: THREE.Texture | undefined, repeat: THREE.Vector2): THREE.Texture | undefined {
  if (!tex) return undefined;
  // Clones share the image source, so GPU memory is not duplicated.
  const t = tex.clone();
  t.repeat.copy(repeat);
  t.needsUpdate = true;
  return t;
}

/**
 * Physically based fabric material for one repeat value. Base colour comes
 * entirely from the albedo map (colour = white) so the swatch, the photo and
 * the render agree.
 */
export function createFabricMaterial(fabric: Fabric, tex: FabricTextures, repeat: THREE.Vector2): THREE.MeshPhysicalMaterial {
  const preset = MATERIAL_PRESETS[fabric.type];
  const [r, g, b] = hexToRgb(fabric.texture.avgColor);
  const lift = preset.sheenLift;
  const sheenColor = new THREE.Color().setRGB(r + (1 - r) * lift, g + (1 - g) * lift, b + (1 - b) * lift, THREE.SRGBColorSpace);

  return new THREE.MeshPhysicalMaterial({
    name: `kumas:${fabric.code}`,
    color: 0xffffff,
    map: withRepeat(tex.albedo, repeat),
    normalMap: withRepeat(tex.normal, repeat),
    normalScale: new THREE.Vector2(preset.normalScale, preset.normalScale),
    roughnessMap: withRepeat(tex.roughness, repeat),
    roughness: tex.roughness ? preset.roughness : preset.roughness * 0.9,
    metalness: 0,
    sheen: fabric.texture.sheen ?? preset.sheen,
    sheenRoughness: fabric.texture.sheenRoughness ?? preset.sheenRoughness,
    sheenColor,
    specularIntensity: 0.35,
  });
}

/** Disposes a fabric material and its per-repeat texture clones (not the shared sources). */
export function disposeFabricMaterial(mat: THREE.MeshPhysicalMaterial): void {
  mat.map?.dispose();
  mat.normalMap?.dispose();
  mat.roughnessMap?.dispose();
  mat.dispose();
}
