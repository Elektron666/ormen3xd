import { describe, expect, it } from "vitest";
import { csvObjects, parseCsv, toCsv } from "@/lib/csv";
import {
  CSV_COLUMNS,
  CSV_EXAMPLE,
  fieldsFromCsv,
  normaliseCode,
  parseColorFamily,
  parseFabricType,
  parseNumber,
  validateFabricFields,
} from "@/lib/panel/fabric-form";

describe("CSV", () => {
  it("reads Turkish Excel CSV (semicolon, BOM, quotes, CRLF)", () => {
    const text = '﻿kod;renk;not\r\nSIENA-01;"Kum; açık";"""tırnak"""\r\n';
    expect(parseCsv(text)).toEqual([["kod", "renk", "not"], ["SIENA-01", "Kum; açık", '"tırnak"']]);
  });
  it("reads comma CSV too and maps headers", () => {
    expect(csvObjects("Kod,Renk\nA-1,Gri\n")).toEqual([{ kod: "A-1", renk: "Gri" }]);
  });
  it("writes CSV that round-trips", () => {
    const rows = [["ad", "not"], ["Ayşe", 'dedi ki "evet"; tamam']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
    expect(toCsv([["a"]]).startsWith("﻿")).toBe(true);
  });
});

describe("fabric form", () => {
  it("normalises codes and numbers the way people type them", () => {
    expect(normaliseCode(" siena 04 ")).toBe("SIENA-04");
    expect(normaliseCode("şönil-1")).toBe("ŞÖNIL-1");
    expect(parseNumber("12,5 cm")).toBe(12.5);
    expect(parseNumber("")).toBeUndefined();
  });
  it("understands type and colour family in Turkish", () => {
    expect(parseFabricType("Şönil")).toBe("sonil");
    expect(parseFabricType("KETEN GÖRÜNÜMLÜ")).toBe("keten-gorunumlu");
    expect(parseFabricType("deri")).toBe("");
    expect(parseColorFamily("Bej ve kum")).toBe("bej-kum");
    expect(parseColorFamily("bordo")).toBe("kirmizi-bordo");
    expect(parseColorFamily("")).toBe("");
  });
  it("validates required fields and ranges", () => {
    const e = validateFabricFields({ code: "x", series: "", colorName: "", colorFamily: "", type: "", repeatW: 0, repeatH: 400, isActive: true, martindale: 1.5 });
    expect(Object.keys(e).sort()).toEqual(["code", "colorFamily", "colorName", "martindale", "repeatH", "repeatW", "series", "type"]);
  });
  it("turns the template example row into valid fields", () => {
    const row = Object.fromEntries(CSV_COLUMNS.map((c, i) => [c, CSV_EXAMPLE[i]]));
    const { fields, photo } = fieldsFromCsv(row);
    expect(photo).toBe("SIENA-07.jpg");
    expect(fields).toMatchObject({ code: "SIENA-07", colorFamily: "gri", type: "dokuma", widthCm: 140, martindale: 50000, repeatW: 10 });
    // height comes from the photo's aspect when left empty
    expect(validateFabricFields({ ...fields, repeatH: 10 })).toEqual({});
  });
});

describe("CSV export safety", () => {
  it("keeps formula-like text as text", async () => {
    const { toCsv, parseCsv } = await import("@/lib/csv");
    const csv = toCsv([["ad", "not"], ['=HYPERLINK("https://kotu","Ali")', "+90 hesap"], ["@SUM(A1)", "-2+3"], ["Ayşe", "normal"]]);
    const rows = parseCsv(csv.replace(/^﻿/, ""));
    expect(rows[1]).toEqual(['\'=HYPERLINK("https://kotu","Ali")', "'+90 hesap"]);
    expect(rows[2]).toEqual(["'@SUM(A1)", "'-2+3"]);
    expect(rows[3]).toEqual(["Ayşe", "normal"]);
    // numbers are not touched
    expect(toCsv([[-5]])).toContain("-5");
  });
});
