import { describe, expect, it } from "vitest";
import { calibration, decodeCutJob, encodeCutJob, parseActual } from "@/lib/cut-report";

describe("cut job in the sheet's QR", () => {
  it("round-trips fabrics, models and the printed figure", () => {
    const job = { firm: "ornek-mobilya", rows: [{ code: "LUMA-02", models: ["kose-takimi", "berjer"], estimate: null }, { code: "ŞÖNİL-01", models: ["berjer"], estimate: 3.5 }] };
    expect(decodeCutJob(encodeCutJob(job))).toEqual(job);
    expect(decodeCutJob(encodeCutJob({ firm: null, rows: [{ code: "LUMA-02", models: [], estimate: 8 }] }))?.firm).toBeNull();
  });
  it("rejects anything made up", () => {
    expect(decodeCutJob("!!")).toBeNull();
    expect(decodeCutJob(encodeCutJob({ firm: "Ali Veli", rows: [{ code: "LUMA-02", models: [], estimate: 1 }] }))).toBeNull();
    expect(decodeCutJob(encodeCutJob({ firm: null, rows: [{ code: "<x>", models: [], estimate: 1 }] }))).toBeNull();
    expect(decodeCutJob(encodeCutJob({ firm: null, rows: [{ code: "LUMA-02", models: [], estimate: 900 }] }))).toBeNull();
    expect(decodeCutJob(encodeCutJob({ firm: null, rows: [] }))).toBeNull();
  });
});

describe("real metres", () => {
  it("reads what an upholsterer types", () => {
    expect(parseActual("12,5")).toBe(12.5);
    expect(parseActual("13 m")).toBe(13);
    expect(parseActual("")).toBeNull();
    expect(parseActual("0")).toBeNull();
    expect(parseActual("500")).toBeNull();
  });
  it("tells how the sheet's figures held up", () => {
    const at = "2026-10-06T10:00:00Z";
    const c = calibration([
      { fabricCode: "A-1", firmSlug: null, modelSlugs: [], estimatedM: 10, actualM: 11, createdAt: at },
      { fabricCode: "A-1", firmSlug: null, modelSlugs: [], estimatedM: 10, actualM: 9, createdAt: at },
      { fabricCode: "A-1", firmSlug: null, modelSlugs: [], estimatedM: null, actualM: 7, createdAt: at },
    ]);
    expect(c).toEqual({ total: 3, withEstimate: 2, short: 1, meanDiffPct: 0 });
  });
});
