import { describe, expect, it } from "vitest";
import { cronAllowed } from "@/lib/keepalive";

describe("canlı tutma", () => {
  it("gizli anahtar varsa yalnızca Vercel'in çağrısını kabul eder", () => {
    expect(cronAllowed("Bearer abc", "abc")).toBe(true);
    expect(cronAllowed("Bearer xyz", "abc")).toBe(false);
    expect(cronAllowed(null, "abc")).toBe(false);
  });

  it("anahtar yoksa açık kalır (yalnızca bir satır okur)", () => {
    expect(cronAllowed(null, undefined)).toBe(true);
    expect(cronAllowed(null, "")).toBe(true);
  });
});
