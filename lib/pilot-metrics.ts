import type { SampleRequest } from "@/lib/samples";

// What the pilot is judged on besides metres (acil toplantı, şart 6): is every
// request handled within a day, is the lot written on the sample, how long
// until the sample leaves, and how many samples turn into orders. Only the
// request's current step and the time it was set are stored, so "time to
// send" is measured on samples that are at "sent" now; once a shop marks an
// order, the send time is replaced.

export const HANDLE_WITHIN_H = 24;

export interface SampleFunnel {
  total: number;
  /** Still "Yeni" after 24 hours: nobody has picked them up. */
  overdue: number;
  /** Samples that went out (sent, ordered, not returned) and how many carry a lot. */
  shipped: number;
  withLot: number;
  /** Median hours from request to "sent", over samples currently at that step. */
  sendHours: number | null;
  ordered: number;
  notReturned: number;
}

const hours = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 3_600_000;

export function sampleFunnel(requests: SampleRequest[], now: Date = new Date()): SampleFunnel {
  const out = requests.filter((r) => ["gonderildi", "siparis", "donmedi"].includes(r.status));
  const sendTimes = requests
    .filter((r) => r.status === "gonderildi" && r.statusAt)
    .map((r) => hours(r.createdAt, r.statusAt!))
    .filter((h) => h >= 0)
    .sort((a, b) => a - b);
  return {
    total: requests.length,
    overdue: overdueCount(requests, now),
    shipped: out.length,
    withLot: out.filter((r) => r.lot).length,
    sendHours: sendTimes.length ? Math.round(sendTimes[Math.floor(sendTimes.length / 2)] * 10) / 10 : null,
    ordered: requests.filter((r) => r.status === "siparis").length,
    notReturned: requests.filter((r) => r.status === "donmedi").length,
  };
}

export function overdueCount(requests: SampleRequest[], now: Date = new Date()): number {
  return requests.filter((r) => r.status === "yeni" && hours(r.createdAt, now.toISOString()) > HANDLE_WITHIN_H).length;
}
