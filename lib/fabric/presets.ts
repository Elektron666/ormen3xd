import type { FabricType } from "@/lib/types";

export interface MaterialPreset {
  /** Multiplier applied on top of the roughness map (or the value when there is no map). */
  roughness: number;
  /** Strength of the normal map. */
  normalScale: number;
  /** Physical sheen (retro-reflective fibre highlight), 0..1. */
  sheen: number;
  sheenRoughness: number;
  /** How far the sheen colour is pushed from the fabric colour towards white, 0..1. */
  sheenLift: number;
}

// Tuned by eye against the neutral studio scene. Velvet and chenille are an
// approximation: real pile direction (nap) is not simulated, see KARARLAR.md.
export const MATERIAL_PRESETS: Record<FabricType, MaterialPreset> = {
  bukle: { roughness: 1, normalScale: 1.5, sheen: 0.25, sheenRoughness: 0.85, sheenLift: 0.2 },
  dokuma: { roughness: 0.95, normalScale: 1.0, sheen: 0.15, sheenRoughness: 0.7, sheenLift: 0.15 },
  nubuk: { roughness: 0.85, normalScale: 0.45, sheen: 0.55, sheenRoughness: 0.5, sheenLift: 0.3 },
  kadife: { roughness: 0.9, normalScale: 0.3, sheen: 1, sheenRoughness: 0.35, sheenLift: 0.45 },
  sonil: { roughness: 0.95, normalScale: 0.8, sheen: 0.8, sheenRoughness: 0.45, sheenLift: 0.35 },
  "keten-gorunumlu": { roughness: 1, normalScale: 1.0, sheen: 0.1, sheenRoughness: 0.8, sheenLift: 0.1 },
  jakar: { roughness: 0.9, normalScale: 1.0, sheen: 0.3, sheenRoughness: 0.6, sheenLift: 0.2 },
};
