import { codeUpper } from "@/lib/i18n/tr";
import type { Fabric, FurnitureModel } from "@/lib/types";
import { decodeRoom, type RoomSpec } from "@/lib/room/spec";
import { decodeLayout, type Placement } from "@/lib/room/layout";

export interface InitialState {
  initialModelSlug: string;
  initialFabricCode?: string;
  initialRoom: RoomSpec | null;
  initialLayout: Placement[] | null;
  initialPlan: boolean;
}

/** Turns link parameters (?y=, ?oda=, ?g=, legacy ?m= / ?k=) into the configurator's start state. */
export function initialStateFrom(
  params: Record<string, string | string[] | undefined>,
  models: FurnitureModel[],
  fabrics: Fabric[],
): InitialState {
  const str = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : undefined);
  const slugs = new Set(models.map((m) => m.slug));
  const codes = new Set(fabrics.map((f) => f.code));
  const layout =
    decodeLayout(str("y"))
      ?.filter((p) => slugs.has(p.modelSlug) && codes.has(p.fabricCode))
      // a zone in a fabric no longer in the catalogue wears the piece's main fabric
      .map((p) => {
        const zones = p.zones && Object.fromEntries(Object.entries(p.zones).filter(([, c]) => codes.has(c!)));
        const { zones: _drop, ...rest } = p;
        void _drop;
        return zones && Object.keys(zones).length ? { ...rest, zones } : rest;
      }) ?? null;
  const m = str("m");
  return {
    initialModelSlug: models.find((x) => x.slug === m)?.slug ?? models[0].slug,
    initialFabricCode: str("k") ? codeUpper(str("k")!) : undefined,
    initialRoom: decodeRoom(str("oda")),
    initialLayout: layout?.length ? layout : null,
    initialPlan: str("g") === "plan",
  };
}
