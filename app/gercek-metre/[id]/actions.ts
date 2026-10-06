"use server";

import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { decodeCutJob, parseActual } from "@/lib/cut-report";

/** Stores the real metres per fabric of a job; empty rows are skipped. */
export async function saveActualAction(_prev: { error?: string } | null, form: FormData): Promise<{ error?: string }> {
  const id = String(form.get("id") ?? "");
  const job = decodeCutJob(id);
  if (!job) return { error: "Föydeki kod okunamadı." };
  const values = job.rows.map((_, i) => String(form.get(`m${i}`) ?? "").trim());
  const parsed = values.map(parseActual);
  if (values.some((v, i) => v !== "" && parsed[i] === null)) return { error: "Metreyi 0,2 ile 200 arasında bir sayı olarak yazın (ör. 12,5)." };
  if (parsed.every((v) => v === null)) return { error: "En az bir kumaş için kesilen metreyi yazın." };
  const repo = getRepository();
  for (const [i, row] of job.rows.entries()) {
    const actual = parsed[i];
    if (actual === null) continue;
    await repo.recordCutReport({ fabricCode: row.code, firmSlug: job.firm, modelSlugs: row.models, estimatedM: row.estimate, actualM: actual });
  }
  redirect(`/gercek-metre/${id}?tesekkurler`);
}
