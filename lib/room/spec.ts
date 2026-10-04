// Room description: shape, size, wall colour and floor. Pure data so it can be
// stored, shared in a link and tested without three.js.

export const ROOM_SHAPES = ["yok", "dikdortgen", "l", "kose"] as const;
export type RoomShape = (typeof ROOM_SHAPES)[number];

export interface WallColor {
  id: string;
  name: string;
  hex: string;
}

export interface FloorFinish {
  id: string;
  name: string;
  /** Texture tile size in metres (square). */
  tileM: number;
  albedo: string;
  roughness: string;
  normal: string;
  thumb: string;
  /** Mean colour, used as a placeholder while textures load. */
  avgColor: string;
}

export interface RoomSpec {
  shape: RoomShape;
  /** Inner dimensions in centimetres. */
  widthCm: number;
  depthCm: number;
  heightCm: number;
  wallId: string;
  floorId: string;
}

export const ROOM_LIMITS = {
  widthCm: { min: 200, max: 1200 },
  depthCm: { min: 200, max: 1200 },
  heightCm: { min: 220, max: 450 },
} as const;

export const WALL_COLORS: WallColor[] = [
  { id: "kirik-beyaz", name: "Kırık beyaz", hex: "#ECE8E1" },
  { id: "kum", name: "Kum", hex: "#DCD1C0" },
  { id: "kil", name: "Kil", hex: "#C4A58C" },
  { id: "adacayi", name: "Adaçayı", hex: "#AEB5A0" },
  { id: "sis-mavisi", name: "Sis mavisi", hex: "#AEB7BD" },
  { id: "tutun", name: "Tütün", hex: "#5E4A3B" },
  { id: "antrasit", name: "Antrasit", hex: "#4A4946" },
];

const floor = (id: string, name: string, tileM: number, avgColor: string): FloorFinish => ({
  id,
  name,
  tileM,
  avgColor,
  albedo: `/seed/floors/${id}-albedo.webp`,
  roughness: `/seed/floors/${id}-roughness.webp`,
  normal: `/seed/floors/${id}-normal.webp`,
  thumb: `/seed/floors/${id}-thumb.webp`,
});

export const FLOORS: FloorFinish[] = [
  floor("acik-mese", "Açık meşe parke", 1.8, "#C2A27E"),
  floor("ceviz", "Ceviz parke", 1.8, "#6A4B36"),
  floor("mikro-beton", "Mikro beton", 2, "#B8B3AB"),
  floor("traverten", "Traverten", 1.8, "#D8CCB8"),
];

export interface RoomPreset {
  id: string;
  name: string;
  description: string;
  spec: RoomSpec;
  /** Environment light multiplier. Light stays neutral white in every preset. */
  ambient: number;
}

export const ROOM_PRESETS: RoomPreset[] = [
  {
    id: "studyo",
    name: "Nötr stüdyo",
    description: "Yalnızca zemin ve yumuşak gölge",
    spec: { shape: "yok", widthCm: 500, depthCm: 420, heightCm: 280, wallId: "kirik-beyaz", floorId: "mikro-beton" },
    ambient: 1,
  },
  {
    id: "acik-salon",
    name: "Açık modern salon",
    description: "Kırık beyaz duvar, açık meşe parke",
    spec: { shape: "dikdortgen", widthCm: 520, depthCm: 440, heightCm: 280, wallId: "kirik-beyaz", floorId: "acik-mese" },
    ambient: 1,
  },
  {
    id: "koyu-salon",
    name: "Koyu ve sıcak salon",
    description: "Tütün rengi duvar, ceviz parke",
    spec: { shape: "dikdortgen", widthCm: 480, depthCm: 420, heightCm: 270, wallId: "tutun", floorId: "ceviz" },
    ambient: 0.9,
  },
];

export const DEFAULT_PRESET = ROOM_PRESETS[0];

export function wallColor(id: string): WallColor {
  return WALL_COLORS.find((w) => w.id === id) ?? WALL_COLORS[0];
}

export function floorFinish(id: string): FloorFinish {
  return FLOORS.find((f) => f.id === id) ?? FLOORS[0];
}

export function clampRoom(spec: RoomSpec): RoomSpec {
  const c = (v: number, k: keyof typeof ROOM_LIMITS) =>
    Math.round(Math.min(ROOM_LIMITS[k].max, Math.max(ROOM_LIMITS[k].min, Number.isFinite(v) ? v : ROOM_LIMITS[k].min)));
  return {
    shape: ROOM_SHAPES.includes(spec.shape) ? spec.shape : "dikdortgen",
    widthCm: c(spec.widthCm, "widthCm"),
    depthCm: c(spec.depthCm, "depthCm"),
    heightCm: c(spec.heightCm, "heightCm"),
    wallId: wallColor(spec.wallId).id,
    floorId: floorFinish(spec.floorId).id,
  };
}

/** Share of width/depth taken by the notch of an L-shaped room. */
export const L_NOTCH = 0.42;

/**
 * Floor outline in centimetres in (x, z), with the back wall on z = 0 and the
 * room extending towards +z. Edge i runs from point i to point i + 1; `walls`
 * says which edges carry a wall. Orientation is resolved by the 3D builder.
 */
export function roomOutline(spec: RoomSpec): { points: [number, number][]; walls: boolean[] } {
  const w = spec.widthCm, d = spec.depthCm;
  const x0 = -w / 2, x1 = w / 2;
  switch (spec.shape) {
    case "l": {
      // notch cut from the front-right corner
      const nx = x1 - w * L_NOTCH, nz = d - d * L_NOTCH;
      const points: [number, number][] = [[x0, 0], [x0, d], [nx, d], [nx, nz], [x1, nz], [x1, 0]];
      return { points, walls: points.map(() => true) };
    }
    case "kose": {
      const points: [number, number][] = [[x0, 0], [x0, d], [x1, d], [x1, 0]];
      // left wall and back wall only
      return { points, walls: [true, false, false, true] };
    }
    case "yok":
    case "dikdortgen":
    default: {
      const points: [number, number][] = [[x0, 0], [x0, d], [x1, d], [x1, 0]];
      return { points, walls: points.map(() => spec.shape !== "yok") };
    }
  }
}

/** Whether a piece of furniture (cm) fits against the back wall with 10 cm clearance each side. */
export function furnitureFits(spec: RoomSpec, furniture: { w: number; d: number }): boolean {
  if (spec.shape === "yok") return true;
  // the L notch is cut from the front, so the back wall keeps the full width
  const usableD = spec.shape === "l" ? spec.depthCm * (1 - L_NOTCH) : spec.depthCm;
  return furniture.w + 20 <= spec.widthCm && furniture.d + 40 <= usableD;
}

// ------------------------------------------------------------ link format ---
// Compact, readable form for URLs: "dikdortgen.520x440x280.kirik-beyaz.acik-mese"

export function encodeRoom(spec: RoomSpec): string {
  return [spec.shape, `${spec.widthCm}x${spec.depthCm}x${spec.heightCm}`, spec.wallId, spec.floorId].join(".");
}

export function decodeRoom(value: string | null | undefined): RoomSpec | null {
  if (!value) return null;
  const preset = ROOM_PRESETS.find((p) => p.id === value);
  if (preset) return { ...preset.spec };
  const [shape, dims, wallId, floorId] = value.split(".");
  const m = /^(\d+)x(\d+)x(\d+)$/.exec(dims ?? "");
  if (!m || !ROOM_SHAPES.includes(shape as RoomShape)) return null;
  return clampRoom({
    shape: shape as RoomShape,
    widthCm: Number(m[1]),
    depthCm: Number(m[2]),
    heightCm: Number(m[3]),
    wallId: wallId ?? "",
    floorId: floorId ?? "",
  });
}

/** The preset a spec matches exactly, if any (used to highlight the preset card). */
export function matchingPreset(spec: RoomSpec): RoomPreset | undefined {
  return ROOM_PRESETS.find((p) => encodeRoom(p.spec) === encodeRoom(spec));
}
