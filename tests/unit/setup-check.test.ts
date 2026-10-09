import { describe, expect, it } from "vitest";
import { MIGRATIONS, evaluateSetup, overall, type SetupFacts } from "@/lib/setup-check";

const allMigrations = Object.fromEntries(MIGRATIONS.map(([f]) => [f, true]));
const ready: SetupFacts = {
  supabase: { configured: true, reachable: true },
  migrations: allMigrations,
  bucketLimited: true,
  fabrics: { total: 30, real: 7, active: 25 },
  models: 3,
  panelMode: "supabase",
  siteUrl: "https://atelier.ormentekstil.com.tr",
  requestHost: "atelier.ormentekstil.com.tr",
  whatsapp: "+90 532 000 00 00",
  sessionSecretOk: false,
  retentionDays: null,
  production: true,
};
const byId = (f: SetupFacts) => Object.fromEntries(evaluateSetup(f).map((c) => [c.id, c]));

describe("setup checklist", () => {
  it("a finished installation is green apart from the manual items", () => {
    const checks = evaluateSetup(ready);
    expect(overall(checks)).toBe("ok");
    expect(checks.filter((c) => c.status !== "ok").map((c) => c.id)).toEqual(["retention", "kvkk", "ar", "firewall"]);
    expect(evaluateSetup({ ...ready, retentionDays: 730 }).find((c) => c.id === "retention")?.status).toBe("ok");
  });

  it("sunucu veritabanından uzak bölgedeyse uyarır; Vercel dışında sormaz", () => {
    expect(byId({ ...ready, region: "iad1" }).region.status).toBe("warn");
    expect(byId({ ...ready, region: "iad1" }).region.detail).toContain("iad1");
    expect(byId({ ...ready, region: "fra1" }).region.status).toBe("ok");
    expect(byId({ ...ready, region: null }).region).toBeUndefined();
    expect(overall(evaluateSetup({ ...ready, region: "iad1" }))).toBe("warn");
  });

  it("names the SQL files still to run", () => {
    const c = byId({ ...ready, migrations: { ...allMigrations, "20261006000000_fabric_series_limits.sql": false, "20261008000000_storage_limits.sql": false } });
    expect(c.migrations.status).toBe("error");
    expect(c.migrations.detail).toContain("20261006000000_fabric_series_limits.sql");
    expect(c.migrations.detail).toContain("20261008000000_storage_limits.sql");
    expect(c.migrations.detail).not.toContain("20261004000000_init.sql");
  });

  it("without Supabase in production: error; locally: a warning", () => {
    const off = { ...ready, supabase: { configured: false, reachable: false }, panelMode: "demo" as const };
    expect(byId(off).supabase.status).toBe("error");
    expect(byId({ ...off, production: false }).supabase.status).toBe("warn");
    expect(byId(off).migrations).toBeUndefined();
  });

  it("flags placeholder-only catalogue, missing domain and WhatsApp, wrong host", () => {
    const c = byId({ ...ready, fabrics: { total: 23, real: 0, active: 23 }, siteUrl: null, whatsapp: null });
    expect(c.fabrics.status).toBe("todo");
    expect(c["site-url"].status).toBe("warn");
    expect(c.whatsapp.status).toBe("warn");
    expect(byId({ ...ready, requestHost: "ormen3xd.vercel.app" })["site-url"].detail).toContain("ormen3xd.vercel.app");
    expect(byId({ ...ready, fabrics: { total: 0, real: 0, active: 0 } }).fabrics.status).toBe("error");
  });
});
