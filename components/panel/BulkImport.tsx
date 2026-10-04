"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FabricType } from "@/lib/types";
import { csvObjects, toCsv } from "@/lib/csv";
import { CSV_COLUMNS, CSV_EXAMPLE, fieldsFromCsv, validateFabricFields, type FabricFields } from "@/lib/panel/fabric-form";
import { processFabricPhoto, revoke } from "@/lib/fabric/process-browser";
import { SEAM_LIMIT } from "@/lib/fabric/process";
import { uploadFabricMaps } from "@/lib/panel/upload";
import { saveFabricAction } from "@/app/panel/actions";
import { buttonClass } from "./ui";

// Bulk import: one CSV with the details + the photos, matched by file name.
// Everything runs in the browser one row at a time (same processing as the
// single-fabric form), so a 50-row sheet never hits a server time limit.

interface Row {
  line: number;
  fields: FabricFields;
  photoName: string;
  problems: string[];
}

type RowState = { state: "bekliyor" | "isleniyor" | "tamam" | "hata"; message?: string };

const baseName = (n: string) => n.split(/[\\/]/).pop()!.trim().toLocaleLowerCase("tr-TR");

function downloadTemplate() {
  const blob = new Blob([toCsv([[...CSV_COLUMNS], [...CSV_EXAMPLE]])], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ormen-kumas-sablonu.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function BulkImport({ existingCodes }: { existingCodes: string[] }) {
  const router = useRouter();
  const [csvName, setCsvName] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Map<string, File>>(new Map());
  const [progress, setProgress] = useState<Record<number, RowState>>({});
  const [running, setRunning] = useState(false);

  const readCsv = async (file: File | undefined) => {
    if (!file) return;
    setCsvName(file.name);
    setProgress({});
    try {
      const objects = csvObjects(await file.text());
      const missing = ["kod", "seri", "renk", "tip", "tekrar_en_cm"].filter((c) => objects.length && !(c in objects[0]));
      if (!objects.length) throw new Error("Dosyada satır bulunamadı.");
      if (missing.length) throw new Error(`Şu sütunlar eksik: ${missing.join(", ")}. Şablonu indirip onun üstüne yazın.`);
      const known = new Set(existingCodes);
      const seen = new Set<string>();
      setRows(
        objects.map((o, i) => {
          const { fields, photo } = fieldsFromCsv(o);
          // the height may be left empty: it then follows the photo's proportions
          const errs = validateFabricFields({ ...fields, repeatH: fields.repeatH || 1 });
          const problems = Object.values(errs);
          if (known.has(fields.code)) problems.push(`${fields.code} zaten katalogda; düzenlemek için kumaş sayfasını açın.`);
          if (seen.has(fields.code)) problems.push("Bu kod dosyada iki kez geçiyor.");
          seen.add(fields.code);
          return { line: i + 2, fields, photoName: photo || `${fields.code}.jpg`, problems };
        }),
      );
      setCsvError(null);
    } catch (e) {
      setRows([]);
      setCsvError(e instanceof Error ? e.message : "Dosya okunamadı.");
    }
  };

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    setPhotos((old) => {
      const next = new Map(old);
      for (const f of Array.from(files)) if (f.type.startsWith("image/")) next.set(baseName(f.name), f);
      return next;
    });
  };

  const photoFor = useMemo(() => {
    return (r: Row): File | undefined => {
      const want = baseName(r.photoName);
      const hit = photos.get(want);
      if (hit) return hit;
      // "SIENA-07.jpg" in the sheet but "siena-07.jpeg" on disk is fine
      const stem = want.replace(/\.[a-z0-9]+$/, "");
      for (const [name, f] of photos) if (name.replace(/\.[a-z0-9]+$/, "") === stem) return f;
      return undefined;
    };
  }, [photos]);

  const ready = rows.filter((r) => r.problems.length === 0 && photoFor(r));
  const doneCount = Object.values(progress).filter((p) => p.state === "tamam").length;

  const run = async () => {
    setRunning(true);
    let ok = 0;
    for (const r of ready) {
      if (progress[r.line]?.state === "tamam") continue;
      setProgress((p) => ({ ...p, [r.line]: { state: "isleniyor", message: "Fotoğraf işleniyor…" } }));
      let processed = null;
      try {
        processed = await processFabricPhoto(photoFor(r)!, { type: r.fields.type as FabricType, repeatWidthCm: r.fields.repeatW, fixSeam: false });
        const fields = { ...r.fields, repeatH: r.fields.repeatH || Math.round(r.fields.repeatW * processed.aspect * 10) / 10 };
        const texture = await uploadFabricMaps(fields.code, processed, (i, n) =>
          setProgress((p) => ({ ...p, [r.line]: { state: "isleniyor", message: `Yükleniyor ${Math.min(i + 1, n)}/${n}` } })),
        );
        const res = await saveFabricAction({ fields, texture });
        if (!res.ok) throw new Error(res.error || Object.values(res.errors ?? {}).join(" ") || "Kaydedilemedi.");
        ok++;
        setProgress((p) => ({ ...p, [r.line]: { state: "tamam", message: processed!.seam > SEAM_LIMIT ? "Kaydedildi · ek yeri belirgin, sayfasından düzeltin" : "Kaydedildi" } }));
      } catch (e) {
        setProgress((p) => ({ ...p, [r.line]: { state: "hata", message: e instanceof Error ? e.message : "Kaydedilemedi." } }));
      } finally {
        revoke(processed);
      }
    }
    setRunning(false);
    router.refresh();
    if (ok === ready.length && ok > 0) router.push(`/panel/kumaslar?aktarildi=${ok}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <ol className="grid gap-4 md:grid-cols-3">
        <li className="rounded-2xl border border-cizgi bg-kagit p-5">
          <p className="eyebrow mb-2">1 · Şablon</p>
          <p className="mb-4 text-[14px] text-antrasit-70">
            Excel’de açılan bir tablo. Her satır bir kumaş. Bilmediğiniz değerleri <strong>boş bırakın</strong>; uydurmayın.
          </p>
          <button type="button" onClick={downloadTemplate} className={buttonClass.secondary}>
            Şablonu indir
          </button>
        </li>
        <li className="rounded-2xl border border-cizgi bg-kagit p-5">
          <p className="eyebrow mb-2">2 · Doldurulmuş tablo</p>
          <p className="mb-4 text-[14px] text-antrasit-70">“CSV (noktalı virgülle ayrılmış)” olarak kaydedip seçin.</p>
          <label className={`${buttonClass.secondary} cursor-pointer`}>
            {csvName ?? "CSV seç"}
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => readCsv(e.target.files?.[0])} aria-label="CSV dosyası" />
          </label>
        </li>
        <li className="rounded-2xl border border-cizgi bg-kagit p-5">
          <p className="eyebrow mb-2">3 · Fotoğraflar</p>
          <p className="mb-4 text-[14px] text-antrasit-70">
            Dosya adı tablodaki “fotograf” sütunuyla (boşsa kumaş koduyla) aynı olmalı. Hepsini birden seçebilirsiniz.
          </p>
          <label className={`${buttonClass.secondary} cursor-pointer`}>
            {photos.size ? `${photos.size} fotoğraf` : "Fotoğrafları seç"}
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => addPhotos(e.target.files)} aria-label="Kumaş fotoğrafları" />
          </label>
        </li>
      </ol>

      {csvError && (
        <p role="alert" className="rounded-xl bg-[#F6E3DF] px-4 py-3 text-[14px] text-[#9a3b31]">
          {csvError}
        </p>
      )}

      {rows.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-2xl border border-cizgi bg-kagit">
            <table className="w-full text-left text-[14px]">
              <thead className="text-[12px] text-antrasit-50">
                <tr className="border-b border-cizgi">
                  <th className="px-4 py-2 font-normal">Satır</th>
                  <th className="px-4 py-2 font-normal">Kod</th>
                  <th className="px-4 py-2 font-normal">Fotoğraf</th>
                  <th className="px-4 py-2 font-normal">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cizgi">
                {rows.map((r) => {
                  const photo = photoFor(r);
                  const p = progress[r.line];
                  const msg = p
                    ? p.message
                    : r.problems.length
                      ? r.problems.join(" ")
                      : photo
                        ? "Hazır"
                        : `“${r.photoName}” bulunamadı`;
                  const bad = p?.state === "hata" || (!p && (r.problems.length > 0 || !photo));
                  return (
                    <tr key={r.line}>
                      <td className="px-4 py-2 text-antrasit-50">{r.line}</td>
                      <td className="px-4 py-2 font-medium tracking-wide">{r.fields.code || "—"}</td>
                      <td className="px-4 py-2 text-antrasit-70">{photo ? photo.name : "—"}</td>
                      <td className={`px-4 py-2 ${bad ? "text-[#9a3b31]" : p?.state === "tamam" ? "text-[#35523a]" : "text-antrasit-70"}`}>{msg}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={buttonClass.primary} disabled={running || ready.length === 0} onClick={run}>
              {running ? `Aktarılıyor (${doneCount}/${ready.length})…` : `${ready.length} kumaşı aktar`}
            </button>
            <p className="text-[13px] text-antrasit-50">
              {rows.length - ready.length > 0 ? `${rows.length - ready.length} satır atlanacak; yukarıdaki nedenlere bakın.` : "Tüm satırlar hazır."} Sayfayı
              aktarım bitene kadar kapatmayın.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
