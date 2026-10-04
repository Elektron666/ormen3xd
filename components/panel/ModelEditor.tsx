"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Fabric, FurnitureModel } from "@/lib/types";
import { analyseGlb, GLB_WARN_MB, uvWarnings, type GlbReport } from "@/lib/three/analyze-glb";
import { slugify, stamp, uploadFile } from "@/lib/panel/upload";
import { saveModelAction } from "@/app/panel/actions";
import { buttonClass, Field, inputClass } from "./ui";
import { FabricPreview } from "./FabricPreview";

// Adding a furniture model: drop a .glb, tick the materials that take the
// fabric, check it in the live preview with an ORMEN fabric, save.

interface Source {
  /** Object URL (new file) or the stored URL (editing). */
  url: string;
  file: File | null;
  report: GlbReport;
}

export function ModelEditor({ model, fabrics }: { model?: FurnitureModel | null; fabrics: Fabric[] }) {
  const router = useRouter();
  const [name, setName] = useState(model?.name ?? "");
  const [slug, setSlug] = useState(model?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!model);
  const [source, setSource] = useState<Source | null>(null);
  const [picked, setPicked] = useState<string[]>(model?.fabricMaterialNames ?? []);
  const [defaultFabric, setDefaultFabric] = useState(model?.defaultFabricCode ?? fabrics[0]?.code ?? "");
  const [isActive, setIsActive] = useState(model?.isActive ?? true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // editing: read the stored file to list its materials
  const storedUrl = model?.source.kind === "glb" ? model.source.url : null;
  useEffect(() => {
    if (!storedUrl) return;
    let alive = true;
    (async () => {
      try {
        const blob = await (await fetch(storedUrl)).blob();
        const report = await analyseGlb(blob);
        if (alive) setSource({ url: storedUrl, file: null, report });
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Model dosyası okunamadı.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [storedUrl]);

  // release object URLs of replaced files
  useEffect(() => {
    const u = source?.file ? source.url : null;
    return () => {
      if (u) URL.revokeObjectURL(u);
    };
  }, [source]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!/\.glb$/i.test(file.name)) {
      setError("Yalnızca .glb dosyası yüklenebilir. Modelleme programınızdan “glTF ikili (.glb)” olarak dışa aktarın.");
      return;
    }
    setBusy("Model okunuyor…");
    try {
      const report = await analyseGlb(file);
      setSource({ url: URL.createObjectURL(file), file, report });
      setPicked(report.materials.filter((m) => m.suggested && m.hasUv).map((m) => m.name));
      if (!name) {
        const base = file.name.replace(/\.glb$/i, "").replace(/[_-]+/g, " ").trim();
        setName(base.charAt(0).toLocaleUpperCase("tr-TR") + base.slice(1));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Dosya okunamadı.");
    } finally {
      setBusy(null);
    }
  };

  const effectiveSlug = slugTouched ? slug : slugify(name);
  const report = source?.report;
  const fabric = fabrics.find((f) => f.code === defaultFabric) ?? fabrics[0] ?? null;

  // the preview model is re-keyed whenever the ticked materials change
  const previewModel = useMemo<FurnitureModel | null>(() => {
    if (!source || !report) return null;
    return {
      id: `onizleme:${source.url}:${picked.join("|")}`,
      slug: "onizleme",
      name,
      firmId: null,
      source: { kind: "glb", url: source.url },
      fabricMaterialNames: picked,
      dimensionsCm: report.sizeCm,
      isActive: true,
      sortOrder: 0,
    };
  }, [source, report, picked, name]);

  const uvNotes = useMemo(() => (report ? uvWarnings(report.scene, picked) : []), [report, picked]);

  const toggle = (n: string) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));

  const save = async () => {
    setError(null);
    if (!source || !report) return setError("Önce .glb dosyasını yükleyin.");
    if (report.problems.length) return setError(report.problems[0]);
    if (!name.trim()) return setError("Model adını yazın.");
    if (!/^[a-z0-9-]{2,60}$/.test(effectiveSlug)) return setError("Bağlantı adı yalnızca küçük harf, rakam ve tire içerebilir.");
    if (!picked.length) return setError("Kumaş alacak en az bir malzeme işaretleyin.");
    try {
      let glbUrl = source.url;
      if (source.file) {
        setBusy("Model yükleniyor…");
        glbUrl = await uploadFile(`modeller/${effectiveSlug}-${stamp()}.glb`, new File([source.file], source.file.name, { type: "model/gltf-binary" }));
      }
      setBusy("Kaydediliyor…");
      const res = await saveModelAction({
        id: model?.id,
        name,
        slug: effectiveSlug,
        glbUrl,
        fabricMaterialNames: picked,
        dimensionsCm: report.sizeCm,
        defaultFabricCode: defaultFabric || undefined,
        isActive,
      });
      if (!res.ok) return setError(res.error);
      router.push(`/panel/modeller?kaydedildi=${encodeURIComponent(name.trim())}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kaydedilemedi.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col gap-6">
        <section>
          <h2 className="eyebrow mb-2">1 · Model dosyası</h2>
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
              void pick(e.dataTransfer.files[0]);
            }}
            className={`rounded-2xl border-2 border-dashed p-5 text-[14px] transition-colors focus-visible:outline-2 focus-visible:outline-antrasit ${
              dragOver ? "border-antrasit bg-white" : "border-cizgi-koyu bg-kagit hover:border-antrasit-50"
            } cursor-pointer`}
          >
            <p className="text-antrasit">{source?.file ? source.file.name : model ? "Yeni dosya yüklemek için sürükleyin ya da tıklayın" : ".glb dosyasını sürükleyin ya da tıklayın"}</p>
            <p className="mt-1 text-[12px] leading-snug text-antrasit-50">
              Metre biriminde, ayakları yerde, önü +Z yönüne bakan model. Kumaş alacak parçaların malzemesine ad verin ve UV açın. {GLB_WARN_MB} MB altı önerilir.
            </p>
            {busy && <p className="mt-2 text-[12px] text-ceviz">{busy}</p>}
            <input ref={fileInput} type="file" accept=".glb,model/gltf-binary" className="hidden" aria-label="Model dosyası" onChange={(e) => void pick(e.target.files?.[0])} />
          </div>
          {report && (
            <dl className="mt-3 grid grid-cols-3 gap-2 text-[13px]">
              {(
                [
                  ["Genişlik", report.sizeCm.w],
                  ["Derinlik", report.sizeCm.d],
                  ["Yükseklik", report.sizeCm.h],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="rounded-xl bg-cizgi/40 px-3 py-2">
                  <dt className="text-antrasit-50">{k}</dt>
                  <dd className="font-medium">{v} cm</dd>
                </div>
              ))}
            </dl>
          )}
          {report && [...report.problems, ...report.warnings].length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5 text-[13px]">
              {report.problems.map((p) => (
                <li key={p} className="rounded-xl bg-[#F6E3DF] px-3 py-2 text-[#9a3b31]">
                  {p}
                </li>
              ))}
              {report.warnings.map((w) => (
                <li key={w} className="rounded-xl bg-[#F4E9DD] px-3 py-2 text-ceviz">
                  {w}
                </li>
              ))}
            </ul>
          )}
        </section>

        {report && report.materials.length > 0 && (
          <section>
            <h2 className="eyebrow mb-2">2 · Kumaş alacak malzemeler</h2>
            <ul className="flex flex-col divide-y divide-cizgi rounded-2xl border border-cizgi bg-kagit">
              {report.materials.map((m) => (
                <li key={m.name}>
                  <label className={`flex items-center gap-3 px-4 py-2.5 text-[14px] ${m.hasUv ? "cursor-pointer" : "opacity-60"}`}>
                    <input
                      type="checkbox"
                      checked={picked.includes(m.name)}
                      disabled={!m.hasUv}
                      onChange={() => toggle(m.name)}
                      className="h-4 w-4 accent-[#2a2a28]"
                    />
                    <span className="flex-1 font-medium">{m.name}</span>
                    <span className="text-[12px] text-antrasit-50">{m.hasUv ? `${m.meshes} parça` : "UV yok, kumaş giydirilemez"}</span>
                  </label>
                </li>
              ))}
            </ul>
            <p className="mt-1.5 text-[12px] text-antrasit-50">Adında “kumas”, “fabric”, “minder” gibi sözcükler geçenler önceden işaretlendi; önizlemeden kontrol edin.</p>
            {uvNotes.map((n) => (
              <p key={n} className="mt-2 rounded-xl bg-[#F4E9DD] px-3 py-2 text-[13px] text-ceviz">
                {n}
              </p>
            ))}
          </section>
        )}

        <section>
          <h2 className="eyebrow mb-2">3 · Bilgiler</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Model adı" className="col-span-2">
              <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="ör. Köşe Takımı Lena" />
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
            <label className="col-span-2 flex items-center gap-2 text-[14px]">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-[#2a2a28]" />
              Konfigüratörde göster
            </label>
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3 border-t border-cizgi pt-4">
          <button type="button" onClick={save} disabled={!!busy || !report} className={buttonClass.primary}>
            {busy && busy !== "Model okunuyor…" ? busy : "Kaydet"}
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
          {previewModel ? (
            <FabricPreview model={previewModel} fabric={fabric} />
          ) : (
            <div className="studio-backdrop flex h-full items-center justify-center rounded-2xl border border-cizgi p-8 text-center text-[14px] text-antrasit-50">
              Dosya yüklenince model, seçtiğiniz ORMEN kumaşıyla burada görünür.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
