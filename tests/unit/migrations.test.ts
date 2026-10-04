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
  create table storage.buckets (id text primary key, name text, public boolean);
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
      "events", "fabric_textures", "fabrics", "firm_models", "firms", "model_fabrics", "models", "profiles", "sample_requests", "scenes", "shares",
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
