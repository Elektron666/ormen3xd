import "server-only";
import { getRepository } from "@/lib/data";
import { supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient } from "@/lib/supabase/server";
import { MIGRATIONS, type SetupFacts } from "@/lib/setup-check";

// Collects what /panel/durum shows. Each migration is detected by something it
// creates (a table, a column, a function, a bucket limit), so the page tells
// exactly which SQL file is still missing.

async function probe(run: () => PromiseLike<{ error: { message: string } | null }>): Promise<{ ok: boolean; error?: string }> {
  try {
    const { error } = await run();
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function gatherSetupFacts(requestHost: string | null): Promise<SetupFacts> {
  const configured = supabaseEnabled();
  const migrations = Object.fromEntries(MIGRATIONS.map(([file]) => [file, false])) as Record<string, boolean>;
  let reachable = false;
  let supabaseError: string | undefined;
  let bucketLimited: boolean | null = null;

  if (configured) {
    const db = serviceClient();
    const init = await probe(() => db.from("fabrics").select("id").limit(1));
    // a missing table still means Supabase answered; only network/auth errors mean "unreachable"
    reachable = init.ok || /relation|does not exist|schema cache/i.test(init.error ?? "");
    if (!reachable) supabaseError = init.error;
    if (reachable) {
      migrations["20261004000000_init.sql"] = init.ok;
      migrations["20261005000000_parametric_models.sql"] = (await probe(() => db.from("models").select("params").limit(1))).ok;
      migrations["20261006000000_fabric_series_limits.sql"] = (await probe(() => db.from("firms").select("fabric_series").limit(1))).ok;
      migrations["20261007000000_report_function.sql"] = (
        await probe(() => db.rpc("atelier_report", { p_from: new Date(Date.now() - 60_000).toISOString(), p_to: new Date().toISOString(), p_scope: null }))
      ).ok;
      try {
        const { data } = await db.storage.getBucket("atelier");
        bucketLimited = data ? data.file_size_limit != null && (data.allowed_mime_types?.length ?? 0) > 0 : null;
      } catch {
        bucketLimited = null;
      }
      migrations["20261008000000_storage_limits.sql"] = bucketLimited === true;
      migrations["20261009000000_visit_sources.sql"] = (await probe(() => db.from("events").select("source, tag").limit(1))).ok;
      migrations["20261010000000_sample_flow.sql"] = (await probe(() => db.from("sample_requests").select("purpose, code, lot").limit(1))).ok;
    }
  }

  // catalogue counts work in both modes (they fail quietly if tables are missing)
  let fabrics = { total: 0, real: 0, active: 0 };
  let models = 0;
  try {
    const repo = getRepository();
    const [all, showcase] = await Promise.all([repo.listFabrics({ includeInactive: true }), repo.listShowcaseModels()]);
    fabrics = { total: all.length, active: all.filter((f) => f.isActive).length, real: all.filter((f) => f.isActive && !f.isPlaceholder).length };
    models = showcase.length;
  } catch {
    /* reported through the migration check */
  }

  const secret = process.env.PANEL_SESSION_SECRET;
  return {
    supabase: { configured, reachable, error: supabaseError },
    migrations,
    bucketLimited,
    fabrics,
    models,
    panelMode: configured ? "supabase" : "demo",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || null,
    requestHost,
    whatsapp: process.env.NEXT_PUBLIC_ORMEN_WHATSAPP || null,
    sessionSecretOk: !!secret && secret.length >= 32,
    production: process.env.NODE_ENV === "production",
  };
}
