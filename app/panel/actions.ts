"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { isDuplicateCode, isDuplicateSlug } from "@/lib/data/repository";
import { validateFirm, type FirmErrors, type FirmFields } from "@/lib/firm";
import { normaliseParams, paramDimensions, validateParams, type ParamErrors, type ParametricParams } from "@/lib/parametric/spec";
import { FABRIC_MATERIAL } from "@/lib/three/constants";
import { cleanSeries, seriesOf } from "@/lib/fabric/allowed";
import { getPanelUser, signIn, signOut } from "@/lib/auth/panel";
import { validateFabricFields, type FabricFieldErrors, type FabricFields } from "@/lib/panel/fabric-form";
import { STORAGE_BUCKET, SUPABASE_URL } from "@/lib/supabase/config";
import type { FurnitureModel, TextureMapSet } from "@/lib/types";
import { STEP_KEYS, type SampleStep } from "@/lib/samples";
import { validateMeterage, type ModelMeterage } from "@/lib/metraj";

// ------------------------------------------------------------------ session

export async function loginAction(_prev: { error?: string } | null, form: FormData): Promise<{ error?: string }> {
  const res = await signIn(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
  if (!res.ok) return { error: res.error };
  redirect("/panel");
}

export async function logoutAction(): Promise<void> {
  await signOut();
  redirect("/panel/giris");
}

async function guard() {
  if (!(await getPanelUser())) throw new Error("Oturum süresi doldu. Yeniden giriş yapın.");
}

/** Only files we serve ourselves may be referenced (no arbitrary external URLs). */
function ownUrl(u: string | undefined): boolean {
  if (!u) return false;
  return u.startsWith("/api/dosya/") || u.startsWith("/seed/") || (!!SUPABASE_URL && u.startsWith(`${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/`));
}

/** Series names that exist in the catalogue (hidden fabrics included). */
async function knownSeries(): Promise<string[]> {
  return seriesOf(await getRepository().listFabrics({ includeInactive: true }));
}

function refresh() {
  revalidatePath("/", "layout");
}

// ------------------------------------------------------------------ fabrics

export interface SaveFabricPayload {
  id?: string;
  fields: FabricFields;
  /** Omitted when only the details were edited; the stored texture is kept. */
  texture?: {
    maps: TextureMapSet;
    thumbUrl: string;
    avgColor: string;
    derivedMaps: boolean;
  };
}

export type SaveResult = { ok: true; id: string } | { ok: false; errors?: FabricFieldErrors; error?: string };

export async function saveFabricAction(p: SaveFabricPayload): Promise<SaveResult> {
  await guard();
  const errors = validateFabricFields(p.fields);
  if (Object.keys(errors).length) return { ok: false, errors };
  const repo = getRepository();
  const existing = p.id ? await repo.getFabricById(p.id) : null;
  if (p.id && !existing) return { ok: false, error: "Kumaş bulunamadı." };
  if (p.texture) {
    const m = p.texture.maps;
    const urls = [m.albedo["1k"], m.albedo["2k"], m.normal?.["1k"], m.normal?.["2k"], m.roughness?.["1k"], m.roughness?.["2k"], p.texture.thumbUrl].filter(
      (u): u is string => u !== undefined,
    );
    if (urls.length < 3 || !urls.every(ownUrl)) return { ok: false, errors: { photo: "Kumaş fotoğrafı yüklenmedi." } };
    if (!/^#[0-9A-F]{6}$/i.test(p.texture.avgColor)) return { ok: false, error: "Renk okunamadı." };
  } else if (!existing) {
    return { ok: false, errors: { photo: "Kumaş fotoğrafını yükleyin." } };
  }
  const old = existing?.texture;
  const t = p.texture ?? { maps: old!.maps, thumbUrl: old!.thumbUrl, avgColor: old!.avgColor, derivedMaps: undefined };
  const f = p.fields;
  try {
    const saved = await repo.saveFabric({
      id: p.id,
      code: f.code,
      series: f.series.trim(),
      colorName: f.colorName.trim(),
      colorFamily: f.colorFamily as Exclude<typeof f.colorFamily, "">,
      type: f.type as Exclude<typeof f.type, "">,
      composition: f.composition?.trim() || undefined,
      widthCm: f.widthCm,
      pattern: f.pattern,
      patternRepeatCm: f.pattern === "desenli" && f.patternW && f.patternH ? { w: f.patternW, h: f.patternH } : undefined,
      cutDirection: f.cutDirection,
      weightGsm: f.weightGsm,
      martindale: f.martindale,
      fireRating: f.fireRating?.trim() || undefined,
      description: f.description?.trim() || undefined,
      isActive: f.isActive,
      // A real photo replaces the generated stand-in.
      isPlaceholder: p.texture ? false : (existing?.isPlaceholder ?? false),
      sortOrder: existing?.sortOrder ?? 1000,
      derivedMaps: t.derivedMaps,
      texture: {
        maps: t.maps,
        repeatCm: { w: f.repeatW, h: f.repeatH },
        thumbUrl: t.thumbUrl,
        avgColor: t.avgColor.toUpperCase(),
        sheen: existing?.texture.sheen,
        sheenRoughness: existing?.texture.sheenRoughness,
      },
    });
    refresh();
    return { ok: true, id: saved.id };
  } catch (e) {
    if (isDuplicateCode(e)) return { ok: false, errors: { code: e.message } };
    return { ok: false, error: e instanceof Error ? e.message : "Kaydedilemedi." };
  }
}

export async function setFabricActiveAction(id: string, active: boolean): Promise<void> {
  await guard();
  await getRepository().setFabricActive(id, active);
  refresh();
}

// ------------------------------------------------------------------ models

export interface SaveModelPayload {
  id?: string;
  name: string;
  slug: string;
  glbUrl: string;
  fabricMaterialNames: string[];
  dimensionsCm: { w: number; d: number; h: number };
  defaultFabricCode?: string;
  isActive: boolean;
  /** Owner firm for a new model (null/undefined = ORMEN showcase). Ignored when editing. */
  firmId?: string | null;
  /** Fabric series offered on the model; empty = all. */
  fabricSeries?: string[];
  /** The firm's own metres for one piece; null clears it. */
  meterage?: ModelMeterage | null;
}

export async function saveModelAction(p: SaveModelPayload): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await guard();
  if (!p.name.trim()) return { ok: false, error: "Model adını yazın." };
  if (!/^[a-z0-9-]{2,60}$/.test(p.slug)) return { ok: false, error: "Bağlantı adı geçersiz." };
  if (!ownUrl(p.glbUrl)) return { ok: false, error: "Model dosyası yüklenmedi." };
  if (p.fabricMaterialNames.length === 0) return { ok: false, error: "Kumaş alacak en az bir malzeme işaretleyin." };
  const d = p.dimensionsCm;
  if (![d.w, d.d, d.h].every((v) => v > 0 && v < 2000)) return { ok: false, error: "Ölçüler geçersiz." };
  const meterageError = validateMeterage(p.meterage);
  if (meterageError) return { ok: false, error: meterageError };

  const repo = getRepository();
  const all = await repo.listAllModels();
  const existing = p.id ? all.find((m) => m.id === p.id) : undefined;
  if (p.id && !existing) return { ok: false, error: "Model bulunamadı." };
  const owner = existing ? existing.firmId : (p.firmId ?? null);
  if (owner && !(await repo.getFirmById(owner))) return { ok: false, error: "Firma bulunamadı." };
  if (all.some((m) => m.slug === p.slug && m.firmId === owner && m.id !== p.id)) return { ok: false, error: "Bu bağlantı adı kullanılıyor." };
  const model: Omit<FurnitureModel, "id"> & { id?: string } = {
    id: p.id,
    slug: p.slug,
    name: p.name.trim(),
    firmId: owner,
    source: { kind: "glb", url: p.glbUrl },
    fabricMaterialNames: p.fabricMaterialNames,
    dimensionsCm: { w: Math.round(d.w), d: Math.round(d.d), h: Math.round(d.h) },
    defaultFabricCode: p.defaultFabricCode || undefined,
    fabricSeries: cleanSeries(p.fabricSeries, await knownSeries()),
    meterage: p.meterage ?? undefined,
    isActive: p.isActive,
    sortOrder: existing?.sortOrder ?? all.length,
  };
  const saved = await repo.saveModel(model);
  refresh();
  return { ok: true, id: saved.id };
}

export async function setModelActiveAction(id: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  await guard();
  const repo = getRepository();
  const all = await repo.listAllModels();
  const model = all.find((m) => m.id === id);
  if (!model) return { ok: false, error: "Model bulunamadı." };
  // the configurator always needs something to show
  if (!active && model.firmId === null && !all.some((m) => m.id !== id && m.firmId === null && m.isActive))
    return { ok: false, error: "Vitrinde en az bir model açık kalmalı." };
  await repo.saveModel({ ...model, isActive: active });
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------ firms

export interface SaveFirmPayload {
  id?: string;
  fields: FirmFields;
  logoUrl?: string;
  isActive: boolean;
  /** ORMEN showcase models shown on the firm page, in order. */
  showcaseIds: string[];
  /** Fabric series shown on the firm page; empty = all. */
  fabricSeries?: string[];
}

export async function saveFirmAction(p: SaveFirmPayload): Promise<{ ok: true; id: string } | { ok: false; errors?: FirmErrors; error?: string }> {
  await guard();
  const v = validateFirm(p.fields);
  if (!v.ok) return { ok: false, errors: v.errors };
  if (p.logoUrl && !ownUrl(p.logoUrl)) return { ok: false, errors: { logo: "Logo yüklenmedi." } };
  const repo = getRepository();
  if (p.id && !(await repo.getFirmById(p.id))) return { ok: false, error: "Firma bulunamadı." };
  const showcase = new Set((await repo.listAllModels()).filter((m) => m.firmId === null).map((m) => m.id));
  try {
    const firm = await repo.saveFirm({ id: p.id, ...v.value, logoUrl: p.logoUrl || undefined, fabricSeries: cleanSeries(p.fabricSeries, await knownSeries()), isActive: p.isActive });
    await repo.setFirmShowcaseIds(
      firm.id,
      p.showcaseIds.filter((id) => showcase.has(id)),
    );
    refresh();
    return { ok: true, id: firm.id };
  } catch (e) {
    if (isDuplicateSlug(e)) return { ok: false, errors: { slug: e.message } };
    return { ok: false, error: e instanceof Error ? e.message : "Kaydedilemedi." };
  }
}

export async function setFirmActiveAction(id: string, active: boolean): Promise<{ ok: boolean; error?: string }> {
  await guard();
  const repo = getRepository();
  const firm = await repo.getFirmById(id);
  if (!firm) return { ok: false, error: "Firma bulunamadı." };
  await repo.saveFirm({ ...firm, isActive: active });
  refresh();
  return { ok: true };
}

// ------------------------------------------------------------------ parametric models

export interface SaveParametricPayload {
  id?: string;
  name: string;
  slug: string;
  params: ParametricParams;
  defaultFabricCode?: string;
  isActive: boolean;
  firmId?: string | null;
  fabricSeries?: string[];
  meterage?: ModelMeterage | null;
}

export async function saveParametricModelAction(p: SaveParametricPayload): Promise<{ ok: true; id: string } | { ok: false; error: string; errors?: ParamErrors }> {
  await guard();
  if (!p.name.trim() || p.name.trim().length > 80) return { ok: false, error: "Model adını yazın." };
  if (!/^[a-z0-9-]{2,60}$/.test(p.slug)) return { ok: false, error: "Bağlantı adı geçersiz." };
  const params = normaliseParams(p.params);
  if (!params) return { ok: false, error: "Model tarifi geçersiz." };
  const errors = validateParams(params);
  if (Object.keys(errors).length) return { ok: false, error: "Ölçüler aralık dışında.", errors };
  const meterageError = validateMeterage(p.meterage);
  if (meterageError) return { ok: false, error: meterageError };

  const repo = getRepository();
  const all = await repo.listAllModels();
  const existing = p.id ? all.find((m) => m.id === p.id) : undefined;
  if (p.id && (!existing || existing.source.kind !== "parametric")) return { ok: false, error: "Model bulunamadı." };
  const owner = existing ? existing.firmId : (p.firmId ?? null);
  if (owner && !(await repo.getFirmById(owner))) return { ok: false, error: "Firma bulunamadı." };
  if (all.some((m) => m.slug === p.slug && m.firmId === owner && m.id !== p.id)) return { ok: false, error: "Bu bağlantı adı kullanılıyor." };
  if (p.defaultFabricCode && !(await repo.getFabricByCode(p.defaultFabricCode))) return { ok: false, error: "Kumaş bulunamadı." };

  const saved = await repo.saveModel({
    id: p.id,
    slug: p.slug,
    name: p.name.trim(),
    firmId: owner,
    source: { kind: "parametric", params },
    fabricMaterialNames: [FABRIC_MATERIAL],
    dimensionsCm: paramDimensions(params),
    defaultFabricCode: p.defaultFabricCode || undefined,
    fabricSeries: cleanSeries(p.fabricSeries, await knownSeries()),
    meterage: p.meterage ?? undefined,
    isActive: p.isActive,
    sortOrder: existing?.sortOrder ?? all.length,
  });
  refresh();
  return { ok: true, id: saved.id };
}

// ------------------------------------------------------------------ sample requests

export async function updateSampleAction(id: string, patch: { status?: string; lot?: string }): Promise<{ ok: boolean; error?: string }> {
  await guard();
  const repo = getRepository();
  const req = await repo.getSampleRequest(id);
  if (!req) return { ok: false, error: "Talep bulunamadı." };
  if (patch.status !== undefined && !STEP_KEYS.includes(patch.status as SampleStep)) return { ok: false, error: "Geçersiz adım." };
  await repo.updateSampleRequest(id, { status: patch.status as SampleStep | undefined, lot: patch.lot });
  revalidatePath("/panel/talepler");
  return { ok: true };
}

export async function deleteSampleAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await guard();
  const repo = getRepository();
  if (!(await repo.getSampleRequest(id))) return { ok: false, error: "Talep bulunamadı." };
  await repo.deleteSampleRequest(id);
  revalidatePath("/panel/talepler");
  revalidatePath("/panel");
  return { ok: true };
}
