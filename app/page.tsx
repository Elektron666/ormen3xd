import { notFound } from "next/navigation";
import { loadCatalogue } from "@/lib/data";
import { Configurator } from "@/components/configurator/Configurator";
import { initialStateFrom } from "@/lib/page-state";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const { models, fabrics } = (await loadCatalogue(null))!;
  if (models.length === 0 || fabrics.length === 0) notFound();

  return (
    <main>
      <h1 className="sr-only">ORMEN Atelier: kumaşı koltuğun üstünde görün</h1>
      <Configurator models={models} fabrics={fabrics} {...initialStateFrom(sp, models, fabrics)} />
    </main>
  );
}
