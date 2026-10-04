import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { ModelEditor } from "@/components/panel/ModelEditor";
import { PageHeader } from "@/components/panel/ui";

export const metadata = { title: "Yeni model" };

export default async function NewModelPage({ searchParams }: PageProps<"/panel/modeller/yeni">) {
  const sp = await searchParams;
  const repo = getRepository();
  const firm = typeof sp.firma === "string" ? await repo.getFirmById(sp.firma) : null;
  if (sp.firma && !firm) notFound();
  const fabrics = await repo.listFabrics();
  return (
    <>
      <PageHeader title="Yeni model" eyebrow={firm ? `${firm.name} · firmaya özel` : "Modeller · ORMEN vitrini"} />
      <ModelEditor fabrics={fabrics} firmId={firm?.id ?? null} />
    </>
  );
}
