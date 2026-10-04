import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { Configurator } from "@/components/configurator/Configurator";
import { decodeRoom } from "@/lib/room/spec";
import { decodeLayout } from "@/lib/room/layout";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const repo = getRepository();
  const [models, fabrics] = await Promise.all([repo.listShowcaseModels(), repo.listFabrics()]);
  if (models.length === 0 || fabrics.length === 0) notFound();

  const m = typeof sp.m === "string" ? sp.m : undefined;
  const k = typeof sp.k === "string" ? sp.k.toLocaleUpperCase("tr-TR") : undefined;
  const room = decodeRoom(typeof sp.oda === "string" ? sp.oda : null);
  const initialModel = models.find((x) => x.slug === m) ?? models[0];
  // a shared layout, keeping only pieces whose model and fabric exist
  const slugs = new Set(models.map((x) => x.slug));
  const codes = new Set(fabrics.map((f) => f.code));
  const layout = decodeLayout(typeof sp.y === "string" ? sp.y : null)?.filter((p) => slugs.has(p.modelSlug) && codes.has(p.fabricCode));

  return (
    <main>
      <h1 className="sr-only">ORMEN Atelier: kumaşı koltuğun üstünde görün</h1>
      <Configurator models={models} initialModelSlug={initialModel.slug} fabrics={fabrics} initialFabricCode={k} initialRoom={room} initialLayout={layout} initialPlan={sp.g === "plan"} />
    </main>
  );
}
