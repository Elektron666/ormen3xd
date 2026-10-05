import { describe, expect, it } from "vitest";
import { MIN_DPR, QUALITY, SAMPLE, deviceTier, nextDpr } from "@/lib/three/quality";

describe("deviceTier", () => {
  it("starts phones lower than desktops", () => {
    expect(deviceTier({ desktop: true, cores: 8, memoryGb: 8 })).toBe("yuksek");
    expect(deviceTier({ desktop: true })).toBe("yuksek");
    expect(deviceTier({ desktop: true, cores: 4, memoryGb: 2 })).toBe("orta");
    expect(deviceTier({ desktop: false, cores: 8, memoryGb: 8 })).toBe("orta");
    // iPhones report no memory and few cores: kept at "orta" unless cores are few
    expect(deviceTier({ desktop: false })).toBe("orta");
    expect(deviceTier({ desktop: false, cores: 4 })).toBe("dusuk");
    expect(deviceTier({ desktop: false, cores: 8, memoryGb: 3 })).toBe("dusuk");
    expect(QUALITY.dusuk.maxDpr).toBeLessThan(QUALITY.yuksek.maxDpr);
  });
});

describe("nextDpr", () => {
  const frames = (ms: number, n = SAMPLE) => Array.from({ length: n }, () => ms / 1000);

  it("steps down only on a full sample of slow frames", () => {
    expect(nextDpr(2, frames(50))).toBe(1.75);
    expect(nextDpr(1.5, frames(16))).toBe(1.5);
    expect(nextDpr(2, frames(50, SAMPLE - 1))).toBe(2);
    expect(nextDpr(MIN_DPR, frames(80))).toBe(MIN_DPR);
    expect(nextDpr(1.1, frames(80))).toBe(MIN_DPR);
  });

  it("ignores idle gaps between on-demand frames and single hitches", () => {
    // smooth animation with idle pauses in between
    expect(nextDpr(2, [...frames(16), 1.5, 3, 0.9])).toBe(2);
    // a few texture-upload hitches in an otherwise smooth run
    expect(nextDpr(2, [...frames(16), 0.15, 0.12, 0.18])).toBe(2);
  });
});
