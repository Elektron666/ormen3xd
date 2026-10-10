// Zones of an upholstered piece that can take their own fabric (Fatih Bey,
// 10 Oct: "kollar ve alt kasa farklı, sadece minderler…"). Pure data: the
// part names come from the code-built models (lib/three/procedural); a
// model from a 3D file has no zones and always takes one fabric.

export const ZONES = ["govde", "kol", "minder", "biye"] as const;
export type Zone = (typeof ZONES)[number];
export type ZoneCodes = Partial<Record<Zone, string>>;

export const ZONE_LABELS: Record<Zone, string> = { govde: "Gövde", kol: "Kollar", minder: "Minderler", biye: "Biye" };
/** One letter per zone in the link (y=slug.CODE.x.z.rot.mCODE~kCODE). */
const LETTER: Record<Zone, string> = { govde: "g", kol: "k", minder: "m", biye: "b" };
const BY_LETTER = Object.fromEntries(Object.entries(LETTER).map(([z, l]) => [l, z])) as Record<string, Zone>;

/** Zone of a part by its name; null for parts of a model from a file. */
export function zoneOf(partName: string): Zone | null {
  if (partName === "biye") return "biye";
  if (/^(oturum|sirt-minder|sirt-dolgu|puf)(-|$)/.test(partName)) return "minder";
  if (/^(kol|kulak)(-|$)/.test(partName)) return "kol";
  if (/^(govde|sirt-govde|sirt)(-|$)/.test(partName)) return "govde";
  return null;
}

/** Keeps only zones whose fabric differs from the piece's main fabric. */
export function cleanZones(main: string, zones: ZoneCodes | undefined): ZoneCodes | undefined {
  if (!zones) return undefined;
  const out: ZoneCodes = {};
  for (const z of ZONES) if (zones[z] && zones[z] !== main) out[z] = zones[z];
  return Object.keys(out).length ? out : undefined;
}

export function encodeZones(zones: ZoneCodes | undefined): string {
  return zones ? ZONES.filter((z) => zones[z]).map((z) => LETTER[z] + zones[z]).join("~") : "";
}

/** "mMISSO-03~kLUMA-02" → zones; unknown letters or empty codes make it invalid (null). */
export function decodeZones(s: string, upper: (c: string) => string): ZoneCodes | null {
  const out: ZoneCodes = {};
  for (const part of s.split("~")) {
    const z = BY_LETTER[part[0]];
    const code = part.slice(1);
    if (!z || !/^[A-Za-zÇĞİÖŞÜçğıöşü0-9-]{2,24}$/.test(code)) return null;
    out[z] = upper(code);
  }
  return out;
}

/** Every fabric on a piece: the main one first, then the zones'. */
export function pieceCodes(p: { fabricCode: string; zones?: ZoneCodes }): string[] {
  return [...new Set([p.fabricCode, ...ZONES.flatMap((z) => (p.zones?.[z] ? [p.zones[z]!] : []))])];
}

/** The fabric code a zone actually wears. */
export function zoneCode(p: { fabricCode: string; zones?: ZoneCodes }, zone: Zone | null): string {
  return (zone && p.zones?.[zone]) || p.fabricCode;
}

export interface FabricPart<F> {
  fabric: F;
  /** The zones it covers ("Gövde, Kollar"); null when the piece wears one fabric. */
  label: string | null;
  /** True when the piece wears more than one fabric. */
  zoned: boolean;
}

/** The fabrics a piece wears, each with the zones it covers; one row for a single-fabric piece. Unknown codes count as the main fabric. */
export function fabricParts<F extends { code: string }>(main: F, zones: ZoneCodes | undefined, byCode: Map<string, F>): FabricPart<F>[] {
  const groups = new Map<string, { fabric: F; zones: Zone[] }>();
  for (const z of ZONES) {
    const f = (zones?.[z] && byCode.get(zones[z]!)) || main;
    const g = groups.get(f.code) ?? groups.set(f.code, { fabric: f, zones: [] }).get(f.code)!;
    g.zones.push(z);
  }
  // the main fabric first
  const list = [...groups.values()].sort((a, b) => (a.fabric.code === main.code ? -1 : b.fabric.code === main.code ? 1 : 0));
  if (list.length === 1) return [{ fabric: main, label: null, zoned: false }];
  return list.map((g) => ({ fabric: g.fabric, label: g.zones.map((z) => ZONE_LABELS[z]).join(", "), zoned: true }));
}

/** The zone whose fabric a part wears: piping follows the part it is sewn on unless it has its own fabric. */
export function wornZone(partName: string, parentName: string | undefined, zones: Partial<Record<Zone, unknown>>): Zone | null {
  const own = zoneOf(partName);
  return own === "biye" && !zones.biye ? zoneOf(parentName ?? "") : own;
}

/** The fabrics of a piece's zones, by code (codes not in the catalogue are left out: those zones wear the main fabric). */
export function zoneFabricsOf<F>(p: { zones?: ZoneCodes }, byCode: Map<string, F>): Partial<Record<Zone, F>> | undefined {
  if (!p.zones) return undefined;
  const out: Partial<Record<Zone, F>> = {};
  for (const z of ZONES) {
    const f = p.zones[z] && byCode.get(p.zones[z]!);
    if (f) out[z] = f;
  }
  return out;
}
