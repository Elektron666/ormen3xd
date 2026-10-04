import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadCatalogue } from "@/lib/data";
import { Configurator } from "@/components/configurator/Configurator";
import { initialStateFrom } from "@/lib/page-state";
import { parseKiosk } from "@/lib/kiosk";
import { KioskShell } from "@/components/kiosk/KioskShell";

// A furniture firm's own page: its logo and colour, its models, ORMEN fabrics.
// Sample requests from here go to the panel and, by WhatsApp, to the firm.

export async function generateMetadata({ params }: PageProps<"/f/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const cat = await loadCatalogue(slug);
  if (!cat?.firm) return { title: "Firma bulunamadı" };
  return {
    title: `${cat.firm.name} · Kumaşınızı seçin`,
    description: `${cat.firm.name} modellerini ORMEN kumaşlarıyla ekranda görün, döndürün, numune isteyin.`,
    openGraph: { title: `${cat.firm.name} · Kumaşınızı seçin`, description: "Kumaşlar: ORMEN TEKSTİL" },
  };
}

export default async function FirmPage({ params, searchParams }: PageProps<"/f/[slug]">) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const cat = await loadCatalogue(slug);
  if (!cat?.firm || cat.models.length === 0 || cat.fabrics.length === 0) notFound();
  const kiosk = parseKiosk(sp);
  return (
    <main>
      <h1 className="sr-only">{cat.firm.name}: kumaşınızı koltuğun üstünde görün</h1>
      {kiosk ? (
        <KioskShell idleSeconds={kiosk.idleSeconds} firm={cat.firm}>
          <Configurator models={cat.models} fabrics={cat.fabrics} firm={cat.firm} {...initialStateFrom(sp, cat.models, cat.fabrics)} kiosk={!!kiosk} />
        </KioskShell>
      ) : (
        <Configurator models={cat.models} fabrics={cat.fabrics} firm={cat.firm} {...initialStateFrom(sp, cat.models, cat.fabrics)} kiosk={!!kiosk} />
      )}
    </main>
  );
}
