"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Fabric, FurnitureModel } from "@/lib/types";
import {
  AYAK_LABELS,
  AYAKLAR,
  DEFAULTS,
  HEIGHT_LIMITS,
  KOL_LABELS,
  KOLLAR,
  LIMITS,
  OTURUM_TIPI_LABELS,
  OTURUM_TIPLERI,
  SIRT_LABELS,
  SIRT_TIPI_LABELS,
  SIRT_TIPLERI,
  SIRTLAR,
  STIL_LABELS,
  STILLER,
  applyStil,
  stilOf,
  TIP_LABELS,
  TIPLER,
  UC_LABELS,
  UCLAR,
  heightCm,
  paramDimensions,
  shapeName,
  validateParams,
  type ParametricParams,
  type ParamErrors,
  type Tip,
} from "@/lib/parametric/spec";
import { slugify } from "@/lib/panel/upload";
import { saveParametricModelAction } from "@/app/panel/actions";
import { FABRIC_MATERIAL } from "@/lib/three/constants";
import { buttonClass, Field, inputClass } from "./ui";
import { FabricPreview } from "./FabricPreview";
import { SeriesPicker } from "./SeriesPicker";
import { MeterageFields, meterageDraft, meterageValue } from "./MeterageFields";
import { seriesOf } from "@/lib/fabric/allowed";

// "Seçerek oluştur": a workshop without a 3D file describes its model with a
// few choices; the preview shows it in an ORMEN fabric as the values change.

function Segmented<T extends string>({ label, value, options, labels, onChange }: { label: string; value: T; options: readonly T[]; labels: Record<T, string>; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-[13px] text-antrasit-70">{label}</legend>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            onClick={() => onChange(o)}
            className={`h-9 rounded-full border px-3.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-antrasit ${
              value === o ? "border-antrasit bg-antrasit text-kagit" : "border-cizgi bg-white text-antrasit hover:border-cizgi-koyu"
            }`}
          >
            {labels[o]}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function SizeField({ label, value, range, error, onChange }: { label: string; value: number; range: [number, number]; error?: string; onChange: (v: number) => void }) {
  return (
    <Field label={label} error={error} hint={`${range[0]}–${range[1]} cm`}>
      <span className="flex items-center gap-3">
        <input type="range" min={range[0]} max={range[1]} step={1} value={Math.min(range[1], Math.max(range[0], value || range[0]))} onChange={(e) => onChange(Number(e.target.value))} className="flex-1 accent-[#2a2a28]" aria-label={`${label} kaydırıcı`} />
        <input type="number" inputMode="numeric" value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(Number(e.target.value))} className={`${inputClass} w-24`} aria-invalid={!!error} />
      </span>
    </Field>
  );
}

/** A copy without an optional choice, so the stored data stays as before it was set. */
function without(p: ParametricParams, k: "yukseklikCm" | "sirtTipi" | "oturumTipi" | "kulak"): ParametricParams {
  const next = { ...p };
  delete next[k];
  return next;
}

const autoName = (p: ParametricParams) => `${shapeName(p)} ${p.tip === "kose" ? `${p.genislikCm}×${paramDimensions(p).d}` : p.genislikCm}`;

export function ParametricEditor({ model, fabrics, firmId = null }: { model?: FurnitureModel | null; fabrics: Fabric[]; firmId?: string | null }) {
  const router = useRouter();
  const initial = model?.source.kind === "parametric" ? model.source.params : DEFAULTS.kose;
  const [params, setParams] = useState<ParametricParams>(initial);
  const [name, setName] = useState(model?.name ?? "");
  const [nameTouched, setNameTouched] = useState(!!model);
  const [slug, setSlug] = useState(model?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!model);
  const [defaultFabric, setDefaultFabric] = useState(model?.defaultFabricCode ?? fabrics[0]?.code ?? "");
  const [isActive, setIsActive] = useState(model?.isActive ?? true);
  const [series, setSeries] = useState<string[]>(model?.fabricSeries ?? []);
  const [meterage, setMeterage] = useState(() => meterageDraft(model?.meterage));
  const [error, setError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<ParamErrors>({});
  const [saving, setSaving] = useState(false);

  const effectiveName = nameTouched ? name : autoName(params);
  const effectiveSlug = slugTouched ? slug : slugify(effectiveName);
  const errors = { ...validateParams(params), ...serverErrors };
  const valid = Object.keys(validateParams(params)).length === 0;
  const dims = paramDimensions(params);
  const lim = LIMITS[params.tip];

  const set = <K extends keyof ParametricParams>(k: K, v: ParametricParams[K]) => {
    setServerErrors({});
    setParams((p) => {
      const next = { ...p, [k]: v };
      // a new end type gets a length that suits it (a chaise is shorter than a corner return)
      for (const [ucKey, boyKey] of [
        ["solUc", "solBoyCm"],
        ["sagUc", "sagBoyCm"],
      ] as const) {
        if (k !== ucKey) continue;
        const boy = next[boyKey] ?? 0;
        if (v === "sezlong" && (boy < 130 || boy > 200)) next[boyKey] = Math.min(200, Math.max(160, next.derinlikCm + 60));
        if (v === "kose" && boy < next.derinlikCm + 50) next[boyKey] = 220;
      }
      return next;
    });
  };
  const setTip = (tip: Tip) => {
    setServerErrors({});
    // switching type starts from that type's sensible defaults, keeping the style choices
    setParams((p) => {
      const next: ParametricParams = { ...DEFAULTS[tip], kol: tip === "puf" ? "yok" : p.tip === "puf" ? DEFAULTS[tip].kol : p.kol, sirt: p.sirt, ayak: p.ayak };
      if (tip !== "puf" && p.sirtTipi) next.sirtTipi = p.sirtTipi;
      if (tip === "berjer" && p.kulak) next.kulak = true;
      if (tip !== "puf" && tip !== "berjer" && p.oturumTipi) next.oturumTipi = p.oturumTipi;
      return next;
    });
  };
  // a back preset is a shortcut for a height: choosing one drops the typed-in height
  const setSirt = (sirt: ParametricParams["sirt"]) => {
    setServerErrors({});
    setParams((p) => ({ ...without(p, "yukseklikCm"), sirt }));
  };
  const optional = <K extends "sirtTipi" | "oturumTipi">(k: K, v: NonNullable<ParametricParams[K]>, none: string) => {
    setServerErrors({});
    setParams((p) => (v === none ? without(p, k) : { ...p, [k]: v }));
  };

  // the preview rebuilds only from valid, settled values
  const deferred = useDeferredValue(params);
  const [lastValid, setLastValid] = useState(initial);
  if (valid && deferred === params && JSON.stringify(lastValid) !== JSON.stringify(params)) setLastValid(params);
  const previewModel = useMemo<FurnitureModel>(
    () => ({
      id: `onizleme:${JSON.stringify(lastValid)}`,
      slug: "onizleme",
      name: effectiveName,
      firmId: null,
      source: { kind: "parametric", params: lastValid },
      fabricMaterialNames: [FABRIC_MATERIAL],
      dimensionsCm: paramDimensions(lastValid),
      isActive: true,
      sortOrder: 0,
    }),
    [lastValid, effectiveName],
  );
  const fabric = fabrics.find((f) => f.code === defaultFabric) ?? fabrics[0] ?? null;

  const save = async () => {
    setError(null);
    if (!valid) return setError("Ölçüleri kontrol edin.");
    if (!/^[a-z0-9-]{2,60}$/.test(effectiveSlug)) return setError("Bağlantı adı yalnızca küçük harf, rakam ve tire içerebilir.");
    setSaving(true);
    try {
      const res = await saveParametricModelAction({ id: model?.id, name: effectiveName, slug: effectiveSlug, params, defaultFabricCode: defaultFabric || undefined, isActive, firmId, fabricSeries: series, meterage: meterageValue(meterage) });
      if (!res.ok) {
        setError(res.error);
        setServerErrors(res.errors ?? {});
        return;
      }
      const owner = model ? model.firmId : firmId;
      router.push(owner ? `/panel/firmalar/${owner}?kaydedildi=1` : `/panel/modeller?kaydedildi=${encodeURIComponent(effectiveName)}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-4">
          <h2 className="eyebrow">1 · Model</h2>
          <Segmented label="Tip" value={params.tip} options={TIPLER} labels={TIP_LABELS} onChange={setTip} />
          {params.tip !== "puf" && (
            <div>
              <Segmented
                label="Hazır stil (fotoğrafa en yakın olanla başlayın)"
                value={stilOf(params) ?? ("" as (typeof STILLER)[number])}
                options={STILLER}
                labels={STIL_LABELS}
                onChange={(v) => {
                  setServerErrors({});
                  setParams((p) => applyStil(p, v));
                }}
              />
              <p className="mt-1 text-[12px] text-antrasit-50">Kol, sırt, oturum ve ayağı birlikte seçer; ölçüler değişmez. Aşağıdan tek tek değiştirebilirsiniz.</p>
            </div>
          )}
          {params.tip !== "puf" && <Segmented label="Kol" value={params.kol} options={KOLLAR} labels={KOL_LABELS} onChange={(v) => set("kol", v)} />}
          {params.tip !== "puf" && <Segmented label="Sırt" value={params.yukseklikCm === undefined ? params.sirt : ("" as typeof params.sirt)} options={SIRTLAR} labels={SIRT_LABELS} onChange={setSirt} />}
          {params.tip !== "puf" && (
            <Segmented label="Sırt tipi" value={params.sirtTipi ?? "minderli"} options={SIRT_TIPLERI} labels={SIRT_TIPI_LABELS} onChange={(v) => optional("sirtTipi", v, "minderli")} />
          )}
          {params.tip === "berjer" && (
            <Segmented
              label="Kulak"
              value={params.kulak ? "var" : "yok"}
              options={["yok", "var"] as const}
              labels={{ yok: "Kulaksız", var: "Kulaklı" }}
              onChange={(v) => {
                setServerErrors({});
                setParams((p) => (v === "var" ? { ...p, kulak: true } : without(p, "kulak")));
              }}
            />
          )}
          {params.tip !== "puf" && params.tip !== "berjer" && (
            <Segmented label="Oturum" value={params.oturumTipi ?? "ayri"} options={OTURUM_TIPLERI} labels={OTURUM_TIPI_LABELS} onChange={(v) => optional("oturumTipi", v, "ayri")} />
          )}
          <Segmented label="Ayak" value={params.ayak} options={AYAKLAR} labels={AYAK_LABELS} onChange={(v) => set("ayak", v)} />
          {params.tip === "kose" && (
            <>
              <p className="-mb-2 text-[13px] text-antrasit-70">
                Uçlar (önden bakınca). Şu an: <strong className="font-medium text-antrasit">{shapeName(params)}</strong>
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Segmented label="Sol uç" value={params.solUc ?? "kol"} options={UCLAR} labels={UC_LABELS} onChange={(v) => set("solUc", v)} />
                <Segmented label="Sağ uç" value={params.sagUc ?? "kol"} options={UCLAR} labels={UC_LABELS} onChange={(v) => set("sagUc", v)} />
              </div>
              {errors.uclar && <p className="text-[12px] text-[#9a3b31]">{errors.uclar}</p>}
            </>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="eyebrow">2 · Ölçüler</h2>
          <SizeField label={params.tip === "kose" ? "Arka duvar boyu, uçlar dahil (cm)" : "Genişlik (cm)"} value={params.genislikCm} range={lim.w} error={errors.genislikCm} onChange={(v) => set("genislikCm", v)} />
          <SizeField label="Derinlik (cm)" value={params.derinlikCm} range={lim.d} error={errors.derinlikCm} onChange={(v) => set("derinlikCm", v)} />
          <SizeField
            label={params.tip === "puf" ? "Yükseklik (cm)" : "Yükseklik, sırtın üstü (cm)"}
            value={heightCm(params)}
            range={HEIGHT_LIMITS[params.tip === "puf" ? "puf" : "koltuk"]}
            error={errors.yukseklikCm}
            onChange={(v) => set("yukseklikCm", v)}
          />
          {params.tip === "kose" &&
            (
              [
                ["sol", params.solUc, "solBoyCm"],
                ["sağ", params.sagUc, "sagBoyCm"],
              ] as const
            ).map(([side, uc, key]) =>
              uc && uc !== "kol" ? (
                <SizeField
                  key={key}
                  label={`${uc === "kose" ? "Köşe" : "Şezlong"} boyu, ${side} (cm)`}
                  value={params[key] ?? 0}
                  range={uc === "sezlong" ? [130, 200] : lim.boy!}
                  error={errors[key]}
                  onChange={(v) => set(key, v)}
                />
              ) : null,
            )}
          <p className="text-[13px] text-antrasit-70">
            Dış ölçü: <strong className="font-medium text-antrasit">{dims.w} × {dims.d} × {dims.h} cm</strong> (oturma yüksekliği 44 cm)
            {params.yukseklikCm === undefined && params.tip !== "puf" && <> · yükseklik sırt seçiminden geliyor; firmanın ölçüsünü yazabilirsiniz</>}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <h2 className="eyebrow col-span-2">3 · Bilgiler</h2>
          <Field label="Model adı" className="col-span-2">
            <input
              value={effectiveName}
              onChange={(e) => {
                setNameTouched(true);
                setName(e.target.value);
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Bağlantı adı" hint="Adreste görünür; küçük harf ve tire">
            <input
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
              }}
              className={inputClass}
            />
          </Field>
          <Field label="Açılışta gösterilecek kumaş">
            <select value={defaultFabric} onChange={(e) => setDefaultFabric(e.target.value)} className={inputClass}>
              {fabrics.map((f) => (
                <option key={f.id} value={f.code}>
                  {f.code} · {f.colorName}
                </option>
              ))}
            </select>
          </Field>
          <div className="col-span-2">
            <SeriesPicker all={seriesOf(fabrics)} value={series} onChange={setSeries} label="Bu modelde sunulan kumaş serileri" emptyHint="Hiçbiri seçilmezse bütün seriler sunulur." />
            <MeterageFields value={meterage} onChange={setMeterage} />
          </div>
          <label className="col-span-2 flex items-center gap-2 text-[14px]">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-[#2a2a28]" />
            Konfigüratörde göster
          </label>
        </section>

        <div className="flex flex-wrap items-center gap-3 border-t border-cizgi pt-4">
          <button type="button" onClick={save} disabled={saving} className={buttonClass.primary}>
            {saving ? "Kaydediliyor…" : "Kaydet"}
          </button>
          {error && (
            <p role="alert" className="text-[13px] text-[#9a3b31]">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="eyebrow mb-2">Canlı önizleme</p>
        <div className="h-[46vh] min-h-[340px] lg:h-[62vh]">
          <FabricPreview model={previewModel} fabric={fabric} />
        </div>
        <p className="mt-2 text-[12px] leading-snug text-antrasit-50">
          Bu model sizin seçimlerinizle kodla çizilir; gerçek ürünün birebir kopyası değil, kumaşı doğru ölçüde gösteren bir benzeridir.
        </p>
      </div>
    </div>
  );
}
