// "Gerçek metre": after cutting, the upholsterer scans the QR on the cutter's
// sheet and writes how many metres the job really took, per fabric. That is
// the calibration data the 2nd meeting asked for before any calculation is
// trusted (Rıza Usta: "say 'master, this is an estimate, correct it'").
// No personal data: fabric, models, the sheet's figure and the real one.

import { fromBase64Url, toBase64Url } from "@/lib/share";

export interface CutJobRow {
  /** Fabric code. */
  code: string;
  /** Model slugs cut from it. */
  models: string[];
  /** The figure printed on the sheet, or null when it said "usta teyit eder". */
  estimate: number | null;
}

export interface CutJob {
  firm: string | null;
  rows: CutJobRow[];
}

export interface CutReport {
  fabricCode: string;
  firmSlug: string | null;
  modelSlugs: string[];
  estimatedM: number | null;
  actualM: number;
  createdAt: string;
}

const CODE = /^[A-ZÇĞİÖŞÜ0-9-]{2,24}$/;
const SLUG = /^[a-z0-9-]{1,60}$/;
export const ACTUAL_LIMITS = [0.2, 200] as const;

/** The job on a sheet → the id in its QR ("f=firma&k=LUMA-02~uclu.berjer~11.5", base64url). */
export function encodeCutJob(job: CutJob): string {
  const q = new URLSearchParams();
  if (job.firm) q.set("f", job.firm);
  for (const r of job.rows) q.append("k", [r.code, r.models.join("."), r.estimate ?? ""].join("~"));
  return toBase64Url(q.toString());
}

export function decodeCutJob(id: string): CutJob | null {
  if (!/^[A-Za-z0-9_-]{4,1500}$/.test(id)) return null;
  try {
    const q = new URLSearchParams(fromBase64Url(id));
    const firm = q.get("f");
    const rows: CutJobRow[] = [];
    for (const k of q.getAll("k").slice(0, 12)) {
      const [code, models = "", est = ""] = k.split("~");
      if (!CODE.test(code)) return null;
      const slugs = models ? models.split(".") : [];
      if (slugs.length > 12 || slugs.some((s) => !SLUG.test(s))) return null;
      const e = est === "" ? null : Number(est);
      if (e !== null && !(Number.isFinite(e) && e > 0 && e <= 200)) return null;
      rows.push({ code, models: slugs, estimate: e });
    }
    if (!rows.length || (firm !== null && !SLUG.test(firm))) return null;
    return { firm, rows };
  } catch {
    return null;
  }
}

/** "12,5" / "12.5 m" → 12.5 within limits, else null. */
export function parseActual(raw: string | null | undefined): number | null {
  const t = (raw ?? "").replace(/[^\d.,]/g, "").replace(",", ".");
  if (!t) return null;
  const n = Math.round(Number(t) * 10) / 10;
  return Number.isFinite(n) && n >= ACTUAL_LIMITS[0] && n <= ACTUAL_LIMITS[1] ? n : null;
}

/**
 * How the sheet's figures held up: of the reports that had one, how many ran
 * short (more fabric was needed than printed) and the mean difference.
 */
export function calibration(reports: CutReport[]): { total: number; withEstimate: number; short: number; meanDiffPct: number | null } {
  const withEst = reports.filter((r) => r.estimatedM !== null);
  const diffs = withEst.map((r) => ((r.actualM - r.estimatedM!) / r.estimatedM!) * 100);
  return {
    total: reports.length,
    withEstimate: withEst.length,
    short: withEst.filter((r) => r.actualM > r.estimatedM!).length,
    meanDiffPct: diffs.length ? Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) / 10 : null,
  };
}
