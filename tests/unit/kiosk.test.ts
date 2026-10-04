import { describe, expect, it } from "vitest";
import { idleState, parseKiosk } from "@/lib/kiosk";

describe("kiosk", () => {
  it("reads the link parameter", () => {
    expect(parseKiosk({})).toBeNull();
    expect(parseKiosk({ kiosk: "" })).toEqual({ idleSeconds: 90 });
    expect(parseKiosk({ kiosk: "1" })).toEqual({ idleSeconds: 90 });
    expect(parseKiosk({ kiosk: "120" })).toEqual({ idleSeconds: 120 });
    expect(parseKiosk({ kiosk: "5000" })).toEqual({ idleSeconds: 600 });
    expect(parseKiosk({ kiosk: ["45", "x"] })).toEqual({ idleSeconds: 45 });
  });
  it("warns in the last 10 seconds, then resets", () => {
    expect(idleState(10_000, 90)).toEqual({ remaining: 80, warn: false, reset: false });
    expect(idleState(81_000, 90)).toEqual({ remaining: 9, warn: true, reset: false });
    expect(idleState(90_000, 90)).toEqual({ remaining: 0, warn: false, reset: true });
  });
});
