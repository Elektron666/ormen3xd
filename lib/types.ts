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
  isActive: boolean;
}

export type ModelSource =
  | { kind: "procedural"; generator: "modular-sofa" | "armchair" }
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
  coverUrl?: string;
  isActive: boolean;
  sortOrder: number;
}
