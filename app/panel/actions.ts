"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getRepository } from "@/lib/data";
import { DuplicateCodeError } from "@/lib/data/repository";
import { getPanelUser, signIn, signOut } from "@/lib/auth/panel";
import { validateFabricFields, type FabricFieldErrors, type FabricFields } from "@/lib/panel/fabric-form";
import { STORAGE_BUCKET, SUPABASE_URL } from "@/lib/supabase/config";
import type { FurnitureModel, TextureMapSet } from "@/lib/types";

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
    if (e instanceof DuplicateCodeError) return { ok: false, errors: { code: e.message } };
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
}

export async function saveModelAction(p: SaveModelPayload): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  await guard();
  if (!p.name.trim()) return { ok: false, error: "Model adını yazın." };
  if (!/^[a-z0-9-]{2,60}$/.test(p.slug)) return { ok: false, error: "Bağlantı adı geçersiz." };
  if (!ownUrl(p.glbUrl)) return { ok: false, error: "Model dosyası yüklenmedi." };
  if (p.fabricMaterialNames.length === 0) return { ok: false, error: "Kumaş alacak en az bir malzeme işaretleyin." };
  const d = p.dimensionsCm;
  if (![d.w, d.d, d.h].every((v) => v > 0 && v < 2000)) return { ok: false, error: "Ölçüler geçersiz." };

  const repo = getRepository();
  const all = await repo.listAllModels();
  if (all.some((m) => m.slug === p.slug && m.firmId === null && m.id !== p.id)) return { ok: false, error: "Bu bağlantı adı kullanılıyor." };
  const existing = p.id ? all.find((m) => m.id === p.id) : undefined;
  const model: Omit<FurnitureModel, "id"> & { id?: string } = {
    id: p.id,
    slug: p.slug,
    name: p.name.trim(),
    firmId: existing?.firmId ?? null,
    source: { kind: "glb", url: p.glbUrl },
    fabricMaterialNames: p.fabricMaterialNames,
    dimensionsCm: { w: Math.round(d.w), d: Math.round(d.d), h: Math.round(d.h) },
    defaultFabricCode: p.defaultFabricCode || undefined,
    isActive: p.isActive,
    sortOrder: existing?.sortOrder ?? all.length,
  };
  const saved = await repo.saveModel(model);
  refresh();
  return { ok: true, id: saved.id };
}
