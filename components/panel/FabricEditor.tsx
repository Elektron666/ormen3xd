"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColorFamily, Fabric, FabricType, FurnitureModel } from "@/lib/types";
import { COLOR_FAMILIES, FABRIC_TYPES } from "@/lib/types";
import { COLOR_FAMILY_LABELS, COLOR_FAMILY_SWATCH, FABRIC_TYPE_LABELS } from "@/lib/i18n/tr";
import { SEAM_LIMIT, suggestColorFamily } from "@/lib/fabric/process";
import { processFabricPhoto, revoke, type ProcessedFabric } from "@/lib/fabric/process-browser";
import { normaliseCode, parseNumber, validateFabricFields, type FabricFieldErrors, type FabricFields } from "@/lib/panel/fabric-form";
import { uploadFabricMaps } from "@/lib/panel/upload";
import { saveFabricAction } from "@/app/panel/actions";
import { buttonClass, Field, inputClass } from "./ui";
import { FabricPreview } from "./FabricPreview";

interface Draft {
  code: string;
  series: string;
  colorName: string;
  colorFamily: ColorFamily | "";
  type: FabricType | "";
  composition: string;
  widthCm: string;
  weightGsm: string;
  martindale: string;
  fireRating: string;
  description: string;
  repeatW: string;
  repeatH: string;
  isActive: boolean;
}

function draftFrom(f?: Fabric | null): Draft {
  return {
    code: f?.code ?? "",
    series: f?.series ?? "",
    colorName: f?.colorName ?? "",
    colorFamily: f?.colorFamily ?? "",
    type: f?.type ?? "",
    composition: f?.composition ?? "",
    widthCm: f?.widthCm?.toString() ?? "",
    weightGsm: f?.weightGsm?.toString() ?? "",
    martindale: f?.martindale?.toString() ?? "",
    fireRating: f?.fireRating ?? "",
    description: f?.description ?? "",
    repeatW: f?.texture.repeatCm.w.toString() ?? "10",
    repeatH: f?.texture.repeatCm.h.toString() ?? "",
    isActive: f?.isActive ?? true,
  };
}

function fieldsFrom(d: Draft): FabricFields {
  return {
    code: normaliseCode(d.code),
    series: d.series.trim(),
    colorName: d.colorName.trim(),
    colorFamily: d.colorFamily,
    type: d.type,
    composition: d.composition.trim() || undefined,
    widthCm: parseNumber(d.widthCm),
    weightGsm: parseNumber(d.weightGsm),
    martindale: parseNumber(d.martindale),
    fireRating: d.fireRating.trim() || undefined,
    description: d.description.trim() || undefined,
    repeatW: parseNumber(d.repeatW) ?? 0,
    repeatH: parseNumber(d.repeatH) ?? 0,
    isActive: d.isActive,
  };
}


export function FabricEditor({ fabric, models }: { fabric?: Fabric | null; models: FurnitureModel[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(fabric));
  const [photo, setPhoto] = useState<File | null>(null);
  const [processed, setProcessed] = useState<ProcessedFabric | null>(null);
  const [processing, setProcessing] = useState(false);
  const [fixSeam, setFixSeam] = useState(false);
  const [heightTouched, setHeightTouched] = useState(Boolean(fabric));
  const [scaleCheck, setScaleCheck] = useState(false);
  const [previewModel, setPreviewModel] = useState(models[0]?.id ?? "");
  const [errors, setErrors] = useState<FabricFieldErrors>({});
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const repeatW = parseNumber(draft.repeatW) ?? 0;

  // (re)process the photo when it, the seam option, the type or the width change
  const job = useRef(0);
  useEffect(() => {
    if (!photo || !draft.type || !(repeatW > 0)) return;
    const id = ++job.current;
    const t = window.setTimeout(async () => {
      setProcessing(true);
      try {
        const p = await processFabricPhoto(photo, { type: draft.type as FabricType, repeatWidthCm: repeatW, fixSeam });
        if (id !== job.current) return revoke(p);
        setProcessed((old) => {
          revoke(old);
          return p;
        });
        setDraft((d) => ({
          ...d,
          colorFamily: d.colorFamily || suggestColorFamily(p.avgColor),
          repeatH: heightTouched ? d.repeatH : String(Math.round(repeatW * p.aspect * 10) / 10),
        }));
      } catch {
        setErrors((e) => ({ ...e, photo: "Fotoğraf okunamadı. JPG, PNG ya da WebP deneyin." }));
      } finally {
        if (id === job.current) setProcessing(false);
      }
    }, 300);
    return () => window.clearTimeout(t);
  }, [photo, fixSeam, draft.type, repeatW, heightTouched]);

  useEffect(() => () => revoke(processed), [processed]);

  const fields = fieldsFrom(draft);
  const previewFabric: Fabric | null = useMemo(() => {
    const base = fabric?.texture;
    if (!processed && !base) return null;
    const maps = processed
      ? {
          albedo: { "1k": processed.urls["albedo-1k"], "2k": processed.urls["albedo-2k"] },
          normal: { "1k": processed.urls["normal-1k"], "2k": processed.urls["normal-2k"] },
          roughness: { "1k": processed.urls["roughness-1k"], "2k": processed.urls["roughness-2k"] },
        }
      : base!.maps;
    return {
      id: `onizleme:${maps.albedo["2k"]}`,
      code: fields.code || "ÖNİZLEME",
      series: fields.series,
      colorName: fields.colorName,
      colorFamily: (fields.colorFamily || "gri") as ColorFamily,
      type: (fields.type || "dokuma") as FabricType,
      isActive: true,
      isPlaceholder: false,
      sortOrder: 0,
      texture: {
        maps,
        repeatCm: { w: fields.repeatW || 10, h: fields.repeatH || fields.repeatW || 10 },
        thumbUrl: processed?.urls.thumb ?? base!.thumbUrl,
        avgColor: processed?.avgColor ?? base!.avgColor,
      },
    };
  }, [processed, fabric, fields.code, fields.series, fields.colorName, fields.colorFamily, fields.type, fields.repeatW, fields.repeatH]);

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      setErrors((e) => ({ ...e, photo: "Bir fotoğraf dosyası seçin." }));
      return;
    }
    setErrors((e) => {
      const rest = { ...e };
      delete rest.photo;
      return rest;
    });
    setFixSeam(false);
    setPhoto(f);
  };

  const save = async () => {
    const errs = validateFabricFields(fields);
    if (!processed && !fabric) errs.photo = "Kumaş fotoğrafını yükleyin.";
    setErrors(errs);
    if (Object.keys(errs).length) {
      setStatus("Eksik ya da hatalı alanlar var.");
      return;
    }
    setSaving(true);
    try {
      const texture = processed
        ? await uploadFabricMaps(fields.code, processed, (i, n) => setStatus(`Dosyalar yükleniyor (${Math.min(i + 1, n)}/${n})…`))
        : undefined;
      setStatus("Kaydediliyor…");
      const res = await saveFabricAction({ id: fabric?.id, fields, texture });
      if (!res.ok) {
        setErrors(res.errors ?? {});
        setStatus(res.error ?? "Kaydedilemedi; işaretli alanlara bakın.");
        return;
      }
      router.push(`/panel/kumaslar?kaydedildi=${encodeURIComponent(fields.code)}`);
      router.refresh();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  const model = models.find((m) => m.id === previewModel) ?? models[0];
  const seamBad = processed && processed.seam > SEAM_LIMIT;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col gap-6">
        {/* photo */}
        <section>
          <h2 className="eyebrow mb-2">1 · Fotoğraf</h2>
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInput.current?.click()}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInput.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              pick(e.dataTransfer.files[0]);
            }}
            className={`flex cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed p-4 transition-colors focus-visible:outline-2 focus-visible:outline-antrasit ${
              dragOver ? "border-antrasit bg-white" : "border-cizgi-koyu bg-kagit hover:border-antrasit-50"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {previewFabric ? <img src={previewFabric.texture.thumbUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" /> : <div className="h-20 w-20 shrink-0 rounded-xl bg-cizgi/60" />}
            <div className="text-[14px] leading-snug">
              <p className="text-antrasit">{photo ? photo.name : fabric ? "Yeni fotoğraf yüklemek için sürükleyin ya da tıklayın" : "Kumaş fotoğrafını sürükleyin ya da tıklayın"}</p>
              <p className="mt-1 text-[12px] text-antrasit-50">Düz serilmiş, gölgesiz, tepeden çekilmiş kare bir alan. Normal ve pürüzlülük haritaları otomatik üretilir.</p>
              {processing && <p className="mt-1 text-[12px] text-ceviz">Hazırlanıyor…</p>}
            </div>
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          </div>
          {errors.photo && <p className="mt-1.5 text-[12px] text-[#9a3b31]">{errors.photo}</p>}
          {processed && (
            <div className={`mt-3 rounded-xl px-3 py-2.5 text-[13px] leading-snug ${seamBad || fixSeam ? "bg-[#F4E9DD] text-ceviz" : "bg-cizgi/40 text-antrasit-70"}`}>
              {seamBad && !fixSeam ? (
                <>Bu fotoğrafın kenarları birbirini tutmuyor; koltukta tekrar çizgisi görünebilir.</>
              ) : fixSeam ? (
                <>Kenarlar yumuşatıldı; tekrar çizgisi gizlendi.</>
              ) : (
                <>Doku dikişsiz tekrar ediyor. Ortalama renk {processed.avgColor}.</>
              )}
              {(seamBad || fixSeam) && (
                <label className="mt-2 flex items-center gap-2 text-antrasit">
                  <input type="checkbox" checked={fixSeam} onChange={(e) => setFixSeam(e.target.checked)} className="h-4 w-4 accent-[#2a2a28]" />
                  Kenarları yumuşat
                </label>
              )}
            </div>
          )}
        </section>

        {/* scale */}
        <section>
          <h2 className="eyebrow mb-2">2 · Gerçek ölçü</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fotoğraftaki alanın eni (cm)" error={errors.repeatW} hint="Cetvelle ölçtüğünüz genişlik">
              <input inputMode="decimal" value={draft.repeatW} onChange={(e) => set("repeatW", e.target.value)} className={inputClass} aria-invalid={!!errors.repeatW} />
            </Field>
            <Field label="Boyu (cm)" error={errors.repeatH} hint="Fotoğraf oranından önerilir">
              <input
                inputMode="decimal"
                value={draft.repeatH}
                onChange={(e) => {
                  setHeightTouched(true);
                  set("repeatH", e.target.value);
                }}
                className={inputClass}
                aria-invalid={!!errors.repeatH}
              />
            </Field>
          </div>
        </section>

        {/* identity */}
        <section>
          <h2 className="eyebrow mb-2">3 · Künye</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kumaş kodu" error={errors.code}>
              <input value={draft.code} onChange={(e) => set("code", e.target.value)} onBlur={() => set("code", normaliseCode(draft.code))} className={`${inputClass} font-display tracking-wide`} placeholder="SIENA-04" aria-invalid={!!errors.code} />
            </Field>
            <Field label="Seri" error={errors.series}>
              <input value={draft.series} onChange={(e) => set("series", e.target.value)} className={inputClass} placeholder="SIENA" aria-invalid={!!errors.series} />
            </Field>
            <Field label="Renk adı" error={errors.colorName}>
              <input value={draft.colorName} onChange={(e) => set("colorName", e.target.value)} className={inputClass} placeholder="Hardal" aria-invalid={!!errors.colorName} />
            </Field>
            <Field label="Kumaş tipi" error={errors.type}>
              <select value={draft.type} onChange={(e) => set("type", e.target.value as FabricType)} className={inputClass} aria-invalid={!!errors.type}>
                <option value="">Seçin</option>
                {FABRIC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {FABRIC_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-3">
            <span className="text-[13px] text-antrasit-70">Renk ailesi {processed && <span className="text-antrasit-50">(fotoğraftan önerildi)</span>}</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Renk ailesi">
              {COLOR_FAMILIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={draft.colorFamily === c}
                  title={COLOR_FAMILY_LABELS[c]}
                  aria-label={COLOR_FAMILY_LABELS[c]}
                  onClick={() => set("colorFamily", c)}
                  className="flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-antrasit"
                >
                  <span
                    className={`block h-6 w-6 rounded-full border border-black/10 ${draft.colorFamily === c ? "shadow-[0_0_0_2px_var(--color-kirik-beyaz),0_0_0_3.5px_var(--color-antrasit)]" : ""}`}
                    style={{ background: COLOR_FAMILY_SWATCH[c] }}
                  />
                </button>
              ))}
            </div>
            {errors.colorFamily && <p className="mt-1 text-[12px] text-[#9a3b31]">{errors.colorFamily}</p>}
          </div>
        </section>

        {/* technical */}
        <section>
          <h2 className="eyebrow mb-2">4 · Teknik bilgiler (bilinmeyeni boş bırakın)</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kompozisyon" className="col-span-2">
              <input value={draft.composition} onChange={(e) => set("composition", e.target.value)} className={inputClass} placeholder="%100 polyester" />
            </Field>
            <Field label="En (cm)" error={errors.widthCm}>
              <input inputMode="decimal" value={draft.widthCm} onChange={(e) => set("widthCm", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Gramaj (g/m²)" error={errors.weightGsm}>
              <input inputMode="decimal" value={draft.weightGsm} onChange={(e) => set("weightGsm", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Martindale (tur)" error={errors.martindale}>
              <input inputMode="numeric" value={draft.martindale} onChange={(e) => set("martindale", e.target.value)} className={inputClass} />
            </Field>
            <Field label="Yanmazlık">
              <input value={draft.fireRating} onChange={(e) => set("fireRating", e.target.value)} className={inputClass} placeholder="ör. BS 5852" />
            </Field>
            <Field label="Kısa açıklama" className="col-span-2">
              <textarea value={draft.description} onChange={(e) => set("description", e.target.value)} className={`${inputClass} h-20 py-2`} maxLength={300} />
            </Field>
          </div>
          <label className="mt-4 flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={draft.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 accent-[#2a2a28]" />
            Sitede görünsün
          </label>
        </section>

        <div className="flex flex-wrap items-center gap-3 border-t border-cizgi pt-5">
          <button type="button" onClick={save} disabled={saving || processing} className={buttonClass.primary}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
          <button type="button" onClick={() => router.push("/panel/kumaslar")} className={buttonClass.secondary}>
            Vazgeç
          </button>
          {status && (
            <p role="status" className="text-[13px] text-antrasit-70">
              {status}
            </p>
          )}
        </div>
      </div>

      {/* live preview */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="eyebrow">Canlı önizleme</h2>
          <div className="flex items-center gap-2">
            {models.length > 1 && (
              <select value={previewModel} onChange={(e) => setPreviewModel(e.target.value)} className="h-9 rounded-full border border-cizgi bg-white px-3 text-[13px]" aria-label="Önizleme modeli">
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
            <label className="flex h-9 items-center gap-2 rounded-full border border-cizgi bg-white px-3 text-[13px]">
              <input type="checkbox" checked={scaleCheck} onChange={(e) => setScaleCheck(e.target.checked)} className="h-4 w-4 accent-[#b4483c]" />
              Ölçek kontrol (10 cm)
            </label>
          </div>
        </div>
        <div className="h-[46vh] min-h-[340px] lg:h-[62vh]">{model && <FabricPreview model={model} fabric={previewFabric} scaleCheck={scaleCheck} />}</div>
        <p className="mt-2 text-[12px] leading-snug text-antrasit-50">
          Ölçek kontrolünde kırmızı kareler gerçekte 10 × 10 cm’dir. Bir ilmek ya da örgü deseni kumaşın kendisindeki boyutta görünmüyorsa “Gerçek ölçü” değerlerini düzeltin.
        </p>
      </aside>
    </div>
  );
}
