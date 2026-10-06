import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

// Runs the Supabase migrations on an in-process Postgres (PGlite) with small
// stand-ins for Supabase's auth and storage schemas, then checks the
// constraints and row level security that protect the data.

const STUBS = `
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id serial primary key, bucket_id text, name text);
  alter table storage.objects enable row level security;
  create role anon; create role authenticated;
`;

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(STUBS);
  const dir = path.join(process.cwd(), "supabase/migrations");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) await db.exec(readFileSync(path.join(dir, f), "utf8"));
  await db.exec(`
    grant usage on schema public to anon, authenticated;
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  `);
}, 60_000);

async function as<T>(uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set test.uid = '${uid ?? ""}'; set role ${uid ? "authenticated" : "anon"};`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role;");
  }
}

describe("database schema", () => {
  it("creates every table with row level security on", async () => {
    const r = await db.query<{ relname: string; relrowsecurity: boolean }>(
      "select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' order by relname",
    );
    expect(r.rows.map((x) => x.relname)).toEqual([
      "cut_reports", "events", "fabric_textures", "fabrics", "firm_models", "firms", "model_fabrics", "models", "profiles", "sample_requests", "scenes", "shares",
    ]);
    expect(r.rows.every((x) => x.relrowsecurity)).toBe(true);
  });

  it("rejects bad data with constraints", async () => {
    await expect(db.query("insert into fabrics (code, series, color_name, color_family, type) values ('bad code', 'X', 'Y', 'gri', 'dokuma')")).rejects.toThrow();
    await expect(db.query("insert into fabrics (code, series, color_name, color_family, type) values ('ŞÖNİL-01', 'X', 'Y', 'mor', 'uydurma')")).rejects.toThrow();
    await expect(db.query("insert into sample_requests (fabric_codes, name, phone) values ('{A-1}', 'Ali', '05321234567')")).rejects.toThrow();
    await db.query("insert into sample_requests (fabric_codes, name, phone) values ('{LUMA-02}', 'Ali Veli', '+905321234567')");
  });

  it("lets the public read only active catalogue rows, and nothing private", async () => {
    await db.exec(`
      insert into fabrics (code, series, color_name, color_family, type, is_active) values
        ('SIENA-01', 'SIENA', 'Krem', 'beyaz-krem', 'dokuma', true),
        ('SIENA-99', 'SIENA', 'Gizli', 'gri', 'dokuma', false);
      insert into events (type, session_id) values ('kumas_denendi', 'abcdefgh12');
    `);
    const fabrics = await as(null, () => db.query<{ code: string }>("select code from fabrics order by code"));
    expect(fabrics.rows.map((r) => r.code)).toEqual(["SIENA-01"]);
    const leads = await as(null, () => db.query("select * from sample_requests"));
    expect(leads.rows).toHaveLength(0);
    const events = await as(null, () => db.query("select * from events"));
    expect(events.rows).toHaveLength(0);
    await expect(as(null, () => db.query("insert into fabrics (code, series, color_name, color_family, type) values ('X-1', 'X', 'Y', 'gri', 'dokuma')"))).rejects.toThrow();
  });

  it("gives panel users (profiles) full access", async () => {
    const uid = "11111111-1111-1111-1111-111111111111";
    await db.exec(`insert into auth.users values ('${uid}'); insert into profiles (id) values ('${uid}');`);
    const fabrics = await as(uid, () => db.query<{ code: string }>("select code from fabrics order by code"));
    expect(fabrics.rows.map((r) => r.code)).toEqual(["SIENA-01", "SIENA-99"]);
    const leads = await as(uid, () => db.query("select * from sample_requests"));
    expect(leads.rows.length).toBeGreaterThan(0);
    await as(uid, () => db.query("insert into fabrics (code, series, color_name, color_family, type) values ('NEW-01', 'NEW', 'Y', 'gri', 'dokuma')"));
  });

  it("does not let a signed-in stranger (no profile) see leads", async () => {
    const uid = "22222222-2222-2222-2222-222222222222";
    await db.exec(`insert into auth.users values ('${uid}');`);
    const leads = await as(uid, () => db.query("select * from sample_requests"));
    expect(leads.rows).toHaveLength(0);
  });

  it("requires a GLB or a procedural model and keeps slugs unique per owner", async () => {
    await expect(db.query("insert into models (slug, name, width_cm, depth_cm, height_cm) values ('x', 'X', 1, 1, 1)")).rejects.toThrow();
    await db.query("insert into models (slug, name, procedural_key, width_cm, depth_cm, height_cm) values ('kanepe', 'K', 'modular-sofa', 238, 96, 85)");
    await expect(db.query("insert into models (slug, name, procedural_key, width_cm, depth_cm, height_cm) values ('kanepe', 'K2', 'armchair', 1, 1, 1)")).rejects.toThrow();
  });
});

describe("seed.sql", () => {
  it("loads the demo catalogue on a fresh database and is safe to run twice", async () => {
    const fresh = new PGlite();
    await fresh.exec(STUBS);
    const dir = path.join(process.cwd(), "supabase/migrations");
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) await fresh.exec(readFileSync(path.join(dir, f), "utf8"));
    const seed = readFileSync(path.join(process.cwd(), "supabase/seed.sql"), "utf8");
    await fresh.exec(seed);
    await fresh.exec(seed);
    const count = async (t: string) => (await fresh.query<{ n: number }>(`select count(*)::int as n from ${t}`)).rows[0].n;
    expect(await count("fabrics")).toBe(23);
    expect(await count("fabric_textures")).toBe(23);
    expect(await count("models")).toBe(3);
    expect(await count("firms")).toBe(1);
    const m = await fresh.query<{ fabric_material_names: string[]; default_fabric_code: string }>("select fabric_material_names, default_fabric_code from models where slug = 'berjer'");
    expect(m.rows[0]).toEqual({ fabric_material_names: ["kumas"], default_fabric_code: "SIENA-04" });

    // README step: make a dashboard user a panel user
    await fresh.exec("insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000aa')");
    await fresh.exec("alter table auth.users add column email text; update auth.users set email = 'fatih@ornek.com'");
    const grant = "insert into public.profiles (id) select id from auth.users where email = 'fatih@ornek.com' on conflict (id) do nothing;";
    await fresh.exec(grant);
    await fresh.exec(grant);
    expect(await count("profiles")).toBe(1);
    await fresh.close();
  }, 60_000);
});

describe("parametric models migration", () => {
  it("stores a parametric model and rejects one without its description", async () => {
    await db.query(
      `insert into models (slug, name, procedural_key, params, fabric_material_names, width_cm, depth_cm, height_cm)
       values ('kose-1', 'Köşe', 'parametric', '{"tip":"kose"}', '{kumas}', 290, 220, 82)`,
    );
    await expect(
      db.query(`insert into models (slug, name, procedural_key, fabric_material_names, width_cm, depth_cm, height_cm) values ('kose-2', 'Köşe', 'parametric', '{kumas}', 290, 220, 82)`),
    ).rejects.toThrow();
    await expect(
      db.query(`insert into models (slug, name, procedural_key, params, fabric_material_names, width_cm, depth_cm, height_cm) values ('kose-3', 'X', 'armchair', '{}', '{kumas}', 80, 80, 90)`),
    ).rejects.toThrow();
  });
});

describe("fabric series limits migration", () => {
  it("adds empty-by-default series lists to firms and models", async () => {
    await db.query("insert into firms (name, slug, fabric_series) values ('Seri Firma', 'seri-firma', '{SIENA,LUMA}')");
    const r = await db.query<{ fabric_series: string[] }>("select fabric_series from firms where slug = 'seri-firma'");
    expect(r.rows[0].fabric_series).toEqual(["SIENA", "LUMA"]);
    const m = await db.query<{ fabric_series: string[] }>("select fabric_series from models limit 1");
    expect(m.rows[0].fabric_series).toEqual([]);
  });
});

describe("report function", () => {
  it("gives the same report as the app-side calculation", async () => {
    const { buildReport, reportFromJson, EVENT_TYPES } = await import("@/lib/events");
    const fresh = new PGlite();
    await fresh.exec(STUBS);
    const dir = path.join(process.cwd(), "supabase/migrations");
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) await fresh.exec(readFileSync(path.join(dir, f), "utf8"));

    // deterministic pseudo-random events over 5 days, two firms and ORMEN's page
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
    const start = Date.UTC(2026, 9, 1, 0, 0);
    const rows: { type: string; sessionId: string; device: string | null; firmSlug: string | null; fabricCode: string | null; source: string | null; tag: string | null; createdAt: string }[] = [];
    for (let s = 0; s < 60; s++) {
      const sessionId = `ziyaret${String(s).padStart(4, "0")}`;
      const firmSlug = pick([null, null, "ornek-mobilya", "yildiz"]);
      const device = pick(["telefon", "masaustu", "tablet"]);
      // null: events stored before sources were recorded
      const source = pick([null, "kiosk", "qr", "paylasim", "site", "dogrudan"]);
      const tag = pick([null, null, "ankara-1", "fuar-2027"]);
      let t = start + Math.floor(rnd() * 5 * 86_400_000);
      for (let k = 0; k < 1 + Math.floor(rnd() * 6); k++) {
        t += Math.floor(rnd() * 600_000);
        const type = k === 0 ? "sayfa_acildi" : pick(EVENT_TYPES);
        rows.push({ type, sessionId, device: k === 0 ? device : null, firmSlug, fabricCode: type === "kumas_denendi" ? pick(["LUMA-02", "SIENA-03", "PIETRA-01", "VERSO-04"]) : null, source, tag, createdAt: new Date(t).toISOString() });
      }
    }
    for (const r of rows)
      await fresh.query("insert into events (type, session_id, device, firm_slug, fabric_code, source, tag, created_at) values ($1,$2,$3,$4,$5,$6,$7,$8)", [r.type, r.sessionId, r.device, r.firmSlug, r.fabricCode, r.source, r.tag, r.createdAt]);

    const from = new Date(Date.UTC(2026, 8, 30, 21)); // 1 Oct 00:00 Istanbul
    const to = new Date(Date.UTC(2026, 9, 6, 20, 59));
    const norm = (r: ReturnType<typeof buildReport>) => ({ ...r, firms: [...r.firms].sort((a, b) => b.sessions - a.sessions || String(a.slug).localeCompare(String(b.slug))) });
    for (const scope of [null, "", "ornek-mobilya"] as const) {
      const inScope = rows.filter((r) => scope === null || (scope === "" ? r.firmSlug === null : r.firmSlug === scope));
      const js = buildReport(inScope.map((r) => ({ ...r, device: r.device ?? undefined })) as never, { from, to });
      const sql = (await fresh.query<{ r: unknown }>("select atelier_report($1, $2, $3) as r", [from.toISOString(), to.toISOString(), scope])).rows[0].r;
      expect(norm(reportFromJson(sql)), `scope ${scope}`).toEqual(norm(js));
      expect(js.sources.length).toBeGreaterThan(3);
    }
    await fresh.close();
  }, 60_000);
});

describe("sample flow", () => {
  it("has no free-text note, only fixed choices, steps, a sample code and a lot", async () => {
    const cols = await db.query<{ column_name: string }>("select column_name from information_schema.columns where table_name = 'sample_requests'");
    const names = cols.rows.map((c) => c.column_name);
    expect(names).not.toContain("note");
    expect(names).toEqual(expect.arrayContaining(["purpose", "scope", "timing", "code", "lot", "status_at"]));
    await db.query("insert into sample_requests (fabric_codes, name, phone, purpose, scope, timing, code, status) values ('{LUMA-02}', 'Ali Veli', '+905321234567', 'yeniden', 'takim', 'yakin', 'N-7K3P9Q', 'hazirlaniyor')");
    await expect(db.query("insert into sample_requests (fabric_codes, name, phone, purpose) values ('{LUMA-02}', 'Ali Veli', '+905321234567', 'adresim: ...')")).rejects.toThrow();
    await expect(db.query("insert into sample_requests (fabric_codes, name, phone, status) values ('{LUMA-02}', 'Ali Veli', '+905321234567', 'iletildi')")).rejects.toThrow();
    await expect(db.query("insert into sample_requests (fabric_codes, name, phone, code) values ('{LUMA-02}', 'Ali Veli', '+905321234567', 'N-7K3P9Q')")).rejects.toThrow();
  });
});

describe("fabric cutting data", () => {
  it("keeps a repeat only on patterned fabrics", async () => {
    await db.query("insert into fabrics (code, series, color_name, color_family, type, pattern, pattern_repeat_w_cm, pattern_repeat_h_cm, cut_direction) values ('DESEN-01', 'DESEN', 'Lacivert', 'mavi', 'dokuma', 'desenli', 32, 28, 'tek')");
    await db.query("insert into fabrics (code, series, color_name, color_family, type, pattern, cut_direction) values ('DUZ-01', 'DUZ', 'Bej', 'bej-kum', 'dokuma', 'duz', 'cift')");
    await expect(db.query("insert into fabrics (code, series, color_name, color_family, type, pattern, pattern_repeat_w_cm) values ('DUZ-02', 'DUZ', 'Bej', 'bej-kum', 'dokuma', 'duz', 30)")).rejects.toThrow();
    await expect(db.query("insert into fabrics (code, series, color_name, color_family, type, cut_direction) values ('DUZ-03', 'DUZ', 'Bej', 'bej-kum', 'dokuma', 'yan')")).rejects.toThrow();
  });
});

describe("visit sources", () => {
  it("accepts only known sources, clean labels and event types", async () => {
    await db.query("insert into events (type, session_id, source, tag) values ('ar_acilamadi', 'ziyaret0001', 'qr', 'ankara-1')");
    await expect(db.query("insert into events (type, session_id, source) values ('sayfa_acildi', 'ziyaret0001', 'instagram')")).rejects.toThrow();
    await expect(db.query("insert into events (type, session_id, tag) values ('sayfa_acildi', 'ziyaret0001', 'Ali Veli')")).rejects.toThrow();
    await expect(db.query("insert into events (type, session_id) values ('uydurma', 'ziyaret0001')")).rejects.toThrow();
  });
});

describe("hardening migrations", () => {
  it("limits the bucket and keeps the report function from anonymous callers", async () => {
    const b = await db.query<{ file_size_limit: string; allowed_mime_types: string[] }>("select file_size_limit, allowed_mime_types from storage.buckets where id = 'atelier'");
    expect(Number(b.rows[0].file_size_limit)).toBe(62914560);
    expect(b.rows[0].allowed_mime_types).not.toContain("image/svg+xml");
    await expect(as(null, () => db.query("select atelier_report(now() - interval '1 day', now(), null)"))).rejects.toThrow(/permission denied/);
  });
});

describe("model metres", () => {
  it("stores the firm's metres only together with the width they are for", async () => {
    await expect(db.query("update models set meterage_m = 8 where slug = 'zzz-yok' or true")).rejects.toThrow();
    await db.query("update models set meterage_m = 8, meterage_ref_width_cm = 140");
    await expect(db.query("update models set meterage_m = 100")).rejects.toThrow();
  });
});
