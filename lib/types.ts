import type { ParametricParams } from "@/lib/parametric/spec";
// Domain types shared by the data layer, server components and the configurator.

export const FABRIC_TYPES = [
  "bukle",
  "dokuma",
  "nubuk",
  "kadife",
  "sonil",
  "keten-gorunumlu",
  "jakar",
] as const;
export type FabricType = (typeof FABRIC_TYPES)[number];

export const COLOR_FAMILIES = [
  "beyaz-krem",
  "bej-kum",
  "kahve",
  "gri",
  "antrasit-siyah",
  "yesil",
  "mavi",
  "kirmizi-bordo",
  "sari-hardal",
  "turuncu-kiremit",
  "pembe",
  "mor",
] as const;
export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export type TextureSize = "1k" | "2k";

export interface TextureMapSet {
  /** Colour (albedo) map, sRGB. */
  albedo: Record<TextureSize, string>;
  /** Tangent-space normal map, linear. Absent when it was neither uploaded nor derived. */
  normal?: Record<TextureSize, string>;
  /** Roughness map (greyscale), linear. */
  roughness?: Record<TextureSize, string>;
}

export interface FabricTexture {
  maps: TextureMapSet;
  /** Real-world size of one texture tile in centimetres. */
  repeatCm: { w: number; h: number };
  /** Sheen overrides; when absent the fabric type preset is used. */
  sheen?: number;
  sheenRoughness?: number;
  /** Small swatch preview image. */
  thumbUrl: string;
  /** Mean albedo colour (sRGB hex), used for placeholders and colour checks. */
  avgColor: string;
}

export interface Fabric {
  id: string;
  /** Unique fabric code, e.g. SIENA-04. */
  code: string;
  series: string;
  colorName: string;
  colorFamily: ColorFamily;
  type: FabricType;
  composition?: string;
  widthCm?: number;
  /** Plain or patterned; missing = not known (then no metres are worked out). */
  pattern?: "duz" | "desenli";
  /** Pattern repeat of a patterned fabric, cm. */
  patternRepeatCm?: { w: number; h: number };
  /** "tek": pile or pattern runs one way, pieces cannot be turned; "cift": they can. */
  cutDirection?: "cift" | "tek";
  weightGsm?: number;
  martindale?: number;
  fireRating?: string;
  description?: string;
  isActive: boolean;
  isPlaceholder: boolean;
  sortOrder: number;
  texture: FabricTexture;
}

export interface Firm {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  accentColor: string;
  whatsapp?: string;
  /** Fabric series shown on the firm's page; empty or missing = all. */
  fabricSeries?: string[];
  isActive: boolean;
}

export type ModelSource =
  | { kind: "procedural"; generator: "modular-sofa" | "armchair" }
  /** Described in the panel with a few choices, built from code (lib/parametric). */
  | { kind: "parametric"; params: ParametricParams }
  | { kind: "glb"; url: string };

export interface FurnitureModel {
  id: string;
  slug: string;
  name: string;
  /** null = ORMEN's generic showcase model. */
  firmId: string | null;
  source: ModelSource;
  /** Material names inside the model that receive the fabric. */
  fabricMaterialNames: string[];
  dimensionsCm: { w: number; d: number; h: number };
  defaultFabricCode?: string;
  /** Fabric series offered on this model; empty or missing = all. */
  fabricSeries?: string[];
  /** The firm's own fabric metres for one piece, for the cutter's sheet (lib/metraj.ts). */
  meterage?: { metres: number; refWidthCm: number };
  coverUrl?: string;
  isActive: boolean;
  sortOrder: number;
}
