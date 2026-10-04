import { notFound } from "next/navigation";
import { loadCatalogue } from "@/lib/data";
import { Configurator } from "@/components/configurator/Configurator";
import { initialStateFrom } from "@/lib/page-state";
import { parseKiosk } from "@/lib/kiosk";
import { KioskShell } from "@/components/kiosk/KioskShell";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const { models, fabrics } = (await loadCatalogue(null))!;
  if (models.length === 0 || fabrics.length === 0) notFound();

  const kiosk = parseKiosk(sp);
  return (
    <main>
      <h1 className="sr-only">ORMEN Atelier: kumaşı koltuğun üstünde görün</h1>
      {kiosk ? (
        <KioskShell idleSeconds={kiosk.idleSeconds} firm={null}>
          <Configurator models={models} fabrics={fabrics} {...initialStateFrom(sp, models, fabrics)} kiosk={!!kiosk} />
        </KioskShell>
      ) : (
        <Configurator models={models} fabrics={fabrics} {...initialStateFrom(sp, models, fabrics)} kiosk={!!kiosk} />
      )}
    </main>
  );
}
