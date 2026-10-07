import type { Fabric, Firm } from "@/lib/types";
import { filterBySeries } from "@/lib/fabric/allowed";

// Taking the sample catalogue off the site in one go once real fabrics are in
// (acil toplantı, pilot şartı 1: "kalan yer tutucular gizlenir"). It refuses
// when it would leave the site, or any published firm page, without a fabric:
// an empty firm page answers "not found", and its printed QR codes with it.

export type HidePlan = { ok: true; ids: string[] } | { ok: false; error: string };

export function placeholderHidePlan(fabrics: Fabric[], firms: Firm[]): HidePlan {
  const ids = fabrics.filter((f) => f.isActive && f.isPlaceholder).map((f) => f.id);
  if (!ids.length) return { ok: false, error: "Yayında yer tutucu kumaş yok." };
  const left = fabrics.filter((f) => f.isActive && !f.isPlaceholder);
  if (!left.length) return { ok: false, error: "Önce en az bir gerçek kumaş yükleyin; yoksa sitede hiç kumaş kalmaz." };
  const empty = firms.filter((firm) => firm.isActive && filterBySeries(left, firm.fabricSeries).length === 0).map((f) => f.name);
  if (empty.length)
    return {
      ok: false,
      error: `${empty.join(", ")} sayfasında gerçek kumaş kalmıyor; sayfa açılmaz ve basılı QR'lar boşa düşer. Önce bu firmaların serilerine gerçek kumaş ekleyin ya da seri seçimini değiştirin.`,
    };
  return { ok: true, ids };
}
