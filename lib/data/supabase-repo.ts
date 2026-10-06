import "server-only";
import { codeUpper } from "@/lib/i18n/tr";
import type { ColorFamily, Fabric, FabricType, Firm, FurnitureModel, ModelSource } from "@/lib/types";
import { normaliseParams } from "@/lib/parametric/spec";
import type { SampleChoices, SampleRequestInput } from "@/lib/samples";
import { reportFromJson, type Device, type EventType, type Source, type StoredEvent, type UsageEvent } from "@/lib/events";
import { STORAGE_BUCKET, SUPABASE_URL, publicFileUrl } from "@/lib/supabase/config";
import { serviceClient } from "@/lib/supabase/server";
import { DuplicateCodeError, DuplicateSlugError, type FabricInput, type FirmInput, type ModelInput, type Repository } from "./repository";

// Supabase implementation. Runs on the server with the service role; callers
// check the panel session before any write (see lib/auth/panel.ts). Public
// pages only read active rows, matching the row level security policies.

interface FabricRow {
  id: string;
  code: string;
  series: string;
  color_name: string;
  color_family: ColorFamily;
  type: FabricType;
  composition: string | null;
  width_cm: number | null;
  weight_gsm: number | null;
  martindale: number | null;
  fire_rating: string | null;
  description: string | null;
  is_active: boolean;
  is_placeholder: boolean;
  sort_order: number;
  fabric_textures: TextureRow | TextureRow[] | null;
}

interface TextureRow {
  albedo_1k: string;
  albedo_2k: string;
  normal_1k: string | null;
  normal_2k: string | null;
  roughness_1k: string | null;
  roughness_2k: string | null;
  thumb: string;
  repeat_w_cm: number;
  repeat_h_cm: number;
  sheen: number | null;
  sheen_roughness: number | null;
  avg_color: string;
  derived_maps: boolean;
}

interface ModelRow {
  id: string;
  firm_id: string | null;
  slug: string;
  name: string;
  glb_path: string | null;
  procedural_key: "modular-sofa" | "armchair" | "parametric" | null;
  params: unknown;
  fabric_material_names: string[];
  width_cm: number;
  depth_cm: number;
  height_cm: number;
  default_fabric_code: string | null;
  fabric_series: string[] | null;
  cover_path: string | null;
  is_active: boolean;
  sort_order: number;
}

const FABRIC_SELECT = "*, fabric_textures(*)";
const und = <T,>(v: T | null): T | undefined => (v === null ? undefined : v);
const STORAGE_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/`;

/** URL → what we keep in the database (storage path, or site-relative path). */
function toStored(url: string | undefined): string | null {
  if (!url) return null;
  return url.startsWith(STORAGE_PREFIX) ? url.slice(STORAGE_PREFIX.length) : url;
}

function fabricFromRow(r: FabricRow): Fabric {
  const t = Array.isArray(r.fabric_textures) ? r.fabric_textures[0] : r.fabric_textures;
  if (!t) throw new Error(`${r.code} kumaşının dokusu yok.`);
  const pair = (a: string | null, b: string | null) => (a && b ? { "1k": publicFileUrl(a)!, "2k": publicFileUrl(b)! } : undefined);
  return {
    id: r.id,
    code: r.code,
    series: r.series,
    colorName: r.color_name,
    colorFamily: r.color_family,
    type: r.type,
    composition: und(r.composition),
    widthCm: und(r.width_cm),
    weightGsm: und(r.weight_gsm),
    martindale: und(r.martindale),
    fireRating: und(r.fire_rating),
    description: und(r.description),
    isActive: r.is_active,
    isPlaceholder: r.is_placeholder,
    sortOrder: r.sort_order,
    texture: {
      maps: {
        albedo: { "1k": publicFileUrl(t.albedo_1k)!, "2k": publicFileUrl(t.albedo_2k)! },
        normal: pair(t.normal_1k, t.normal_2k),
        roughness: pair(t.roughness_1k, t.roughness_2k),
      },
      repeatCm: { w: Number(t.repeat_w_cm), h: Number(t.repeat_h_cm) },
      sheen: und(t.sheen),
      sheenRoughness: und(t.sheen_roughness),
      thumbUrl: publicFileUrl(t.thumb)!,
      avgColor: t.avg_color,
    },
  };
}

function sourceFromRow(r: ModelRow): ModelSource {
  if (r.glb_path) return { kind: "glb", url: publicFileUrl(r.glb_path)! };
  if (r.procedural_key === "parametric") {
    const params = normaliseParams(r.params);
    if (params) return { kind: "parametric", params };
  }
  return { kind: "procedural", generator: r.procedural_key === "armchair" ? "armchair" : "modular-sofa" };
}

function modelFromRow(r: ModelRow): FurnitureModel {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    firmId: r.firm_id,
    source: sourceFromRow(r),
    fabricMaterialNames: r.fabric_material_names,
    dimensionsCm: { w: Number(r.width_cm), d: Number(r.depth_cm), h: Number(r.height_cm) },
    defaultFabricCode: und(r.default_fabric_code),
    fabricSeries: r.fabric_series ?? [],
    coverUrl: publicFileUrl(r.cover_path),
    isActive: r.is_active,
    sortOrder: r.sort_order,
  };
}

interface FirmRow {
  id: string;
  name: string;
  slug: string;
  logo_path: string | null;
  accent_color: string;
  whatsapp: string | null;
  fabric_series: string[] | null;
  is_active: boolean;
}

function firmFromRow(r: FirmRow): Firm {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    logoUrl: publicFileUrl(r.logo_path),
    accentColor: r.accent_color,
    whatsapp: und(r.whatsapp),
    fabricSeries: r.fabric_series ?? [],
    isActive: r.is_active,
  };
}

function check<T>(res: { data: T; error: { message: string; code?: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export class SupabaseRepository implements Repository {
  readonly kind = "supabase" as const;
  readonly persistent = true;
  private get db() {
    return serviceClient();
  }

  async listFabrics(opts?: { includeInactive?: boolean }) {
    let q = this.db.from("fabrics").select(FABRIC_SELECT).order("sort_order").order("code");
    if (!opts?.includeInactive) q = q.eq("is_active", true);
    return (check(await q) as FabricRow[]).filter((r) => r.fabric_textures).map(fabricFromRow);
  }

  async getFabricByCode(code: string) {
    const r = check(await this.db.from("fabrics").select(FABRIC_SELECT).eq("code", codeUpper(code)).maybeSingle()) as FabricRow | null;
    return r ? fabricFromRow(r) : null;
  }

  async getFabricById(id: string) {
    const r = check(await this.db.from("fabrics").select(FABRIC_SELECT).eq("id", id).maybeSingle()) as FabricRow | null;
    return r ? fabricFromRow(r) : null;
  }

  async saveFabric(input: FabricInput) {
    const row = {
      code: input.code,
      series: input.series,
      color_name: input.colorName,
      color_family: input.colorFamily,
      type: input.type,
      composition: input.composition ?? null,
      width_cm: input.widthCm ?? null,
      weight_gsm: input.weightGsm ?? null,
      martindale: input.martindale ?? null,
      fire_rating: input.fireRating ?? null,
      description: input.description ?? null,
      is_active: input.isActive,
      is_placeholder: input.isPlaceholder,
      sort_order: input.sortOrder,
    };
    const res = input.id
      ? await this.db.from("fabrics").update(row).eq("id", input.id).select("id").single()
      : await this.db.from("fabrics").insert(row).select("id").single();
    if (res.error?.code === "23505") throw new DuplicateCodeError(input.code);
    const { id } = check(res) as { id: string };
    const t = input.texture;
    check(
      await this.db.from("fabric_textures").upsert({
        fabric_id: id,
        albedo_1k: toStored(t.maps.albedo["1k"]),
        albedo_2k: toStored(t.maps.albedo["2k"]),
        normal_1k: toStored(t.maps.normal?.["1k"]),
        normal_2k: toStored(t.maps.normal?.["2k"]),
        roughness_1k: toStored(t.maps.roughness?.["1k"]),
        roughness_2k: toStored(t.maps.roughness?.["2k"]),
        thumb: toStored(t.thumbUrl),
        repeat_w_cm: t.repeatCm.w,
        repeat_h_cm: t.repeatCm.h,
        sheen: t.sheen ?? null,
        sheen_roughness: t.sheenRoughness ?? null,
        avg_color: t.avgColor,
        // Unknown when only the details were edited: keep what is stored.
        ...(input.derivedMaps !== undefined && { derived_maps: input.derivedMaps }),
      }),
    );
    return (await this.getFabricById(id))!;
  }

  async setFabricActive(id: string, active: boolean) {
    check(await this.db.from("fabrics").update({ is_active: active }).eq("id", id));
  }

  async listShowcaseModels() {
    return (check(await this.db.from("models").select("*").is("firm_id", null).eq("is_active", true).order("sort_order")) as ModelRow[]).map(modelFromRow);
  }

  async listAllModels() {
    return (check(await this.db.from("models").select("*").order("sort_order")) as ModelRow[]).map(modelFromRow);
  }

  async listFirmModels(firmId: string) {
    return (check(await this.db.from("models").select("*").eq("firm_id", firmId).eq("is_active", true).order("sort_order")) as ModelRow[]).map(modelFromRow);
  }

  async getModel(slug: string, firmId: string | null) {
    const q = this.db.from("models").select("*").eq("slug", slug);
    const rows = check(await (firmId ? q.or(`firm_id.eq.${firmId},firm_id.is.null`) : q.is("firm_id", null))) as ModelRow[];
    const r = rows.find((x) => x.firm_id === firmId) ?? rows[0];
    return r ? modelFromRow(r) : null;
  }

  async saveModel(input: ModelInput) {
    const row = {
      firm_id: input.firmId,
      slug: input.slug,
      name: input.name,
      glb_path: input.source.kind === "glb" ? toStored(input.source.url) : null,
      procedural_key: input.source.kind === "procedural" ? input.source.generator : input.source.kind === "parametric" ? "parametric" : null,
      params: input.source.kind === "parametric" ? input.source.params : null,
      fabric_material_names: input.fabricMaterialNames,
      width_cm: input.dimensionsCm.w,
      depth_cm: input.dimensionsCm.d,
      height_cm: input.dimensionsCm.h,
      default_fabric_code: input.defaultFabricCode ?? null,
      fabric_series: input.fabricSeries ?? [],
      cover_path: toStored(input.coverUrl),
      is_active: input.isActive,
      sort_order: input.sortOrder,
    };
    const res = input.id
      ? await this.db.from("models").update(row).eq("id", input.id).select("*").single()
      : await this.db.from("models").insert(row).select("*").single();
    return modelFromRow(check(res) as ModelRow);
  }

  async getFirmBySlug(slug: string) {
    const r = check(await this.db.from("firms").select("*").eq("slug", slug).eq("is_active", true).maybeSingle()) as FirmRow | null;
    return r ? firmFromRow(r) : null;
  }

  async listFirms() {
    return (check(await this.db.from("firms").select("*").order("name")) as FirmRow[]).map(firmFromRow);
  }

  async getFirmById(id: string) {
    const r = check(await this.db.from("firms").select("*").eq("id", id).maybeSingle()) as FirmRow | null;
    return r ? firmFromRow(r) : null;
  }

  async saveFirm(input: FirmInput) {
    const row = {
      name: input.name,
      slug: input.slug,
      logo_path: toStored(input.logoUrl),
      accent_color: input.accentColor,
      whatsapp: input.whatsapp ?? null,
      fabric_series: input.fabricSeries ?? [],
      is_active: input.isActive,
    };
    const res = input.id
      ? await this.db.from("firms").update(row).eq("id", input.id).select("*").single()
      : await this.db.from("firms").insert(row).select("*").single();
    if (res.error?.code === "23505") throw new DuplicateSlugError(input.slug);
    return firmFromRow(check(res) as FirmRow);
  }

  async getFirmShowcaseIds(firmId: string) {
    const rows = check(await this.db.from("firm_models").select("model_id").eq("firm_id", firmId).order("sort_order")) as { model_id: string }[];
    return rows.map((r) => r.model_id);
  }

  async setFirmShowcaseIds(firmId: string, modelIds: string[]) {
    check(await this.db.from("firm_models").delete().eq("firm_id", firmId));
    const ids = [...new Set(modelIds)];
    if (ids.length) check(await this.db.from("firm_models").insert(ids.map((model_id, i) => ({ firm_id: firmId, model_id, sort_order: i }))));
  }

  async getShare(code: string) {
    const r = check(await this.db.from("shares").select("payload").eq("id", code).maybeSingle()) as { payload: string } | null;
    return r?.payload ?? null;
  }

  async saveShare(code: string, longId: string, firmSlug?: string | null) {
    const existing = await this.getShare(code);
    if (existing !== null) return existing === longId;
    const firm = firmSlug ? await this.getFirmBySlug(firmSlug) : null;
    const res = await this.db.from("shares").insert({ id: code, payload: longId, firm_id: firm?.id ?? null });
    // inserted at the same moment by someone else: fine if it is the same combination
    if (res.error?.code === "23505") return (await this.getShare(code)) === longId;
    check(res);
    return true;
  }

  async recordEvent(e: UsageEvent) {
    check(
      await this.db.from("events").insert({
        type: e.type,
        session_id: e.sessionId,
        device: e.device ?? null,
        firm_slug: e.firmSlug ?? null,
        model_slug: e.modelSlug ?? null,
        fabric_code: e.fabricCode ?? null,
        source: e.source ?? null,
        tag: e.tag ?? null,
      }),
    );
  }

  async listEvents(since: Date, firmSlug?: string) {
    // aggregated in the app; fine for Faz 1 volumes (a SQL view can take over later)
    let q = this.db
      .from("events")
      .select("type, session_id, device, firm_slug, model_slug, fabric_code, source, tag, created_at")
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(50_000);
    if (firmSlug !== undefined) q = firmSlug ? q.eq("firm_slug", firmSlug) : q.is("firm_slug", null);
    const rows = check(await q) as {
      type: EventType;
      session_id: string;
      device: Device | null;
      firm_slug: string | null;
      model_slug: string | null;
      fabric_code: string | null;
      source: Source | null;
      tag: string | null;
      created_at: string;
    }[];
    return rows.map(
      (r): StoredEvent => ({
        type: r.type,
        sessionId: r.session_id,
        device: r.device ?? undefined,
        firmSlug: r.firm_slug,
        modelSlug: r.model_slug,
        fabricCode: r.fabric_code,
        source: r.source,
        tag: r.tag,
        createdAt: r.created_at,
      }),
    );
  }

  async eventReport(from: Date, to: Date, firmSlug?: string) {
    // computed in the database (migration 20261007000000_report_function.sql)
    const data = check(await this.db.rpc("atelier_report", { p_from: from.toISOString(), p_to: to.toISOString(), p_scope: firmSlug ?? null }));
    return reportFromJson(data);
  }

  async createSampleRequest(input: SampleRequestInput) {
    const firm = input.firmSlug ? await this.getFirmBySlug(input.firmSlug) : null;
    const r = check(
      await this.db
        .from("sample_requests")
        .insert({
          firm_id: firm?.id ?? null,
          firm_slug: input.firmSlug ?? null,
          fabric_codes: input.fabricCodes,
          model_slugs: input.modelSlugs ?? [],
          name: input.name,
          phone: input.phone,
          purpose: input.choices?.purpose ?? null,
          scope: input.choices?.scope ?? null,
          timing: input.choices?.timing ?? null,
          link: input.link ?? null,
        })
        .select("id, created_at")
        .single(),
    ) as { id: string; created_at: string };
    const { consent: _c, ...rest } = input;
    void _c;
    return { ...rest, id: r.id, createdAt: r.created_at };
  }

  async listSampleRequests() {
    const rows = check(await this.db.from("sample_requests").select("*").order("created_at", { ascending: false }).limit(1000)) as {
      id: string;
      firm_slug: string | null;
      fabric_codes: string[];
      model_slugs: string[];
      name: string;
      phone: string;
      purpose: SampleChoices["purpose"] | null;
      scope: SampleChoices["scope"] | null;
      timing: SampleChoices["timing"] | null;
      link: string | null;
      created_at: string;
    }[];
    return rows.map((r) => ({
      id: r.id,
      firmSlug: r.firm_slug,
      fabricCodes: r.fabric_codes,
      modelSlugs: r.model_slugs,
      name: r.name,
      phone: r.phone,
      choices: { purpose: und(r.purpose), scope: und(r.scope), timing: und(r.timing) },
      link: und(r.link),
      createdAt: r.created_at,
    }));
  }

  async putFile(path: string, data: ArrayBuffer, contentType: string) {
    check(await this.db.storage.from(STORAGE_BUCKET).upload(path, data, { contentType, upsert: true, cacheControl: "31536000" }));
    return publicFileUrl(path)!;
  }
}
