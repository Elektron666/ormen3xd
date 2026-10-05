// Anonymous usage events. No IP, no user agent, no personal data: a random
// per-tab id (to count visits), a coarse device class and what was tried.

export const EVENT_TYPES = ["sayfa_acildi", "kumas_denendi", "oda_degisti", "ar_acildi", "paylasildi", "numune_istendi"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const DEVICES = ["telefon", "tablet", "masaustu"] as const;
export type Device = (typeof DEVICES)[number];

export interface UsageEvent {
  type: EventType;
  sessionId: string;
  device?: Device;
  firmSlug?: string | null;
  modelSlug?: string | null;
  fabricCode?: string | null;
}

export interface StoredEvent extends UsageEvent {
  createdAt: string;
}

const SLUG = /^[a-z0-9-]{1,60}$/;
const CODE = /^[A-ZÇĞİÖŞÜ0-9-]{2,24}$/;

/** Accepts only the known shape; anything else is dropped, never stored. */
export function parseEvent(raw: unknown): UsageEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!EVENT_TYPES.includes(r.type as EventType)) return null;
  if (typeof r.sessionId !== "string" || !/^[A-Za-z0-9_-]{8,64}$/.test(r.sessionId)) return null;
  const opt = (v: unknown, re: RegExp) => (typeof v === "string" && re.test(v) ? v : null);
  return {
    type: r.type as EventType,
    sessionId: r.sessionId,
    device: DEVICES.includes(r.device as Device) ? (r.device as Device) : undefined,
    firmSlug: opt(r.firmSlug, SLUG),
    modelSlug: opt(r.modelSlug, SLUG),
    fabricCode: opt(r.fabricCode, CODE),
  };
}

export interface Report {
  sessions: number;
  counts: Record<EventType, number>;
  devices: Record<Device, number>;
  topFabrics: { code: string; tries: number; sessions: number }[];
  firms: { slug: string | null; sessions: number; tries: number; ar: number; shares: number; samples: number }[];
  days: { day: string; sessions: number }[];
}

/** Aggregates raw events for the panel report. Day buckets are Istanbul days. */
export function buildReport(events: StoredEvent[], opts: { from: Date; to: Date }): Report {
  const counts = Object.fromEntries(EVENT_TYPES.map((t) => [t, 0])) as Record<EventType, number>;
  const devices = Object.fromEntries(DEVICES.map((d) => [d, 0])) as Record<Device, number>;
  const sessions = new Set<string>();
  const deviceOf = new Map<string, Device>();
  const fabric = new Map<string, { tries: number; sessions: Set<string> }>();
  const firms = new Map<string | null, { sessions: Set<string>; tries: number; ar: number; shares: number; samples: number }>();
  const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul" });
  const daySessions = new Map<string, Set<string>>();

  for (const e of events) {
    counts[e.type]++;
    sessions.add(e.sessionId);
    if (e.device && !deviceOf.has(e.sessionId)) deviceOf.set(e.sessionId, e.device);
    const day = dayFmt.format(new Date(e.createdAt));
    if (!daySessions.has(day)) daySessions.set(day, new Set());
    daySessions.get(day)!.add(e.sessionId);
    const f = e.firmSlug ?? null;
    if (!firms.has(f)) firms.set(f, { sessions: new Set(), tries: 0, ar: 0, shares: 0, samples: 0 });
    const fr = firms.get(f)!;
    fr.sessions.add(e.sessionId);
    if (e.type === "kumas_denendi") fr.tries++;
    if (e.type === "ar_acildi") fr.ar++;
    if (e.type === "paylasildi") fr.shares++;
    if (e.type === "numune_istendi") fr.samples++;
    if (e.type === "kumas_denendi" && e.fabricCode) {
      if (!fabric.has(e.fabricCode)) fabric.set(e.fabricCode, { tries: 0, sessions: new Set() });
      const x = fabric.get(e.fabricCode)!;
      x.tries++;
      x.sessions.add(e.sessionId);
    }
  }
  for (const d of deviceOf.values()) devices[d]++;

  const days: { day: string; sessions: number }[] = [];
  for (let t = new Date(opts.from); t <= opts.to; t = new Date(t.getTime() + 86_400_000)) {
    const day = dayFmt.format(t);
    if (!days.length || days[days.length - 1].day !== day) days.push({ day, sessions: daySessions.get(day)?.size ?? 0 });
  }

  return {
    sessions: sessions.size,
    counts,
    devices,
    topFabrics: [...fabric]
      .map(([code, x]) => ({ code, tries: x.tries, sessions: x.sessions.size }))
      .sort((a, b) => b.tries - a.tries || a.code.localeCompare(b.code))
      .slice(0, 10),
    firms: [...firms]
      .map(([slug, x]) => ({ slug, sessions: x.sessions.size, tries: x.tries, ar: x.ar, shares: x.shares, samples: x.samples }))
      .sort((a, b) => b.sessions - a.sessions || String(a.slug).localeCompare(String(b.slug))),
    days,
  };
}

/** Report from the database function (atelier_report), with every key present. */
export function reportFromJson(raw: unknown): Report {
  const r = (raw ?? {}) as Partial<Record<keyof Report, unknown>>;
  const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
  const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
  const counts = Object.fromEntries(EVENT_TYPES.map((t) => [t, num(obj(r.counts)[t])])) as Record<EventType, number>;
  const devices = Object.fromEntries(DEVICES.map((d) => [d, num(obj(r.devices)[d])])) as Record<Device, number>;
  const list = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);
  return {
    sessions: num(r.sessions),
    counts,
    devices,
    topFabrics: list(r.topFabrics).map((f) => ({ code: String(f.code), tries: num(f.tries), sessions: num(f.sessions) })),
    firms: list(r.firms).map((f) => ({
      slug: typeof f.slug === "string" ? f.slug : null,
      sessions: num(f.sessions),
      tries: num(f.tries),
      ar: num(f.ar),
      shares: num(f.shares),
      samples: num(f.samples),
    })),
    days: list(r.days).map((d) => ({ day: String(d.day), sessions: num(d.sessions) })),
  };
}
