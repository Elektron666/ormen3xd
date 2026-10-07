import { describe, expect, it } from "vitest";
import { overdueCount, sampleFunnel } from "@/lib/pilot-metrics";
import type { SampleRequest } from "@/lib/samples";

const now = new Date("2026-10-20T12:00:00Z");
const req = (p: Partial<SampleRequest>): SampleRequest => ({ id: Math.random().toString(36), name: "A", phone: "5320000000", fabricCodes: ["LUMA-02"], createdAt: "2026-10-19T08:00:00Z", status: "yeni", ...p });

describe("pilot numune ölçümü", () => {
  it("24 saati geçip kimsenin el sürmediği talepleri sayar", () => {
    const list = [req({ createdAt: "2026-10-19T11:00:00Z" }), req({ createdAt: "2026-10-19T13:00:00Z" }), req({ createdAt: "2026-10-10T08:00:00Z", status: "hazirlaniyor" })];
    expect(overdueCount(list, now)).toBe(1);
  });

  it("lot oranı yalnızca gönderilmiş numunelerde, gönderme süresi medyanla", () => {
    const f = sampleFunnel(
      [
        req({ status: "gonderildi", lot: "L-114", createdAt: "2026-10-18T08:00:00Z", statusAt: "2026-10-18T14:00:00Z" }),
        req({ status: "gonderildi", createdAt: "2026-10-18T08:00:00Z", statusAt: "2026-10-19T08:00:00Z" }),
        req({ status: "gonderildi", lot: "L-2", createdAt: "2026-10-18T08:00:00Z", statusAt: "2026-10-20T08:00:00Z" }),
        req({ status: "siparis", lot: "L-9", statusAt: "2026-10-20T08:00:00Z" }),
        req({ status: "donmedi" }),
        req({ status: "hazirlaniyor", lot: "L-1" }),
      ],
      now,
    );
    expect(f).toMatchObject({ total: 6, shipped: 5, withLot: 3, sendHours: 24, ordered: 1, notReturned: 1, overdue: 0 });
  });

  it("veri yoksa uydurmaz", () => {
    expect(sampleFunnel([], now)).toMatchObject({ total: 0, shipped: 0, sendHours: null });
  });
});
