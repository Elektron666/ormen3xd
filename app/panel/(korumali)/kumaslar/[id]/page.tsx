import { requirePanelUser } from "@/lib/auth/panel";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { FabricEditor } from "@/components/panel/FabricEditor";
import { Badge, PageHeader } from "@/components/panel/ui";

export default async function EditFabricPage({ params }: PageProps<"/panel/kumaslar/[id]">) {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  await requirePanelUser();
  const { id } = await params;
  const repo = getRepository();
  const [fabric, models] = await Promise.all([repo.getFabricById(decodeURIComponent(id)), repo.listShowcaseModels()]);
  if (!fabric) notFound();
  return (
    <>
      <PageHeader title={fabric.code} eyebrow="Kumaşı düzenle">
        {fabric.isPlaceholder && <Badge tone="warn">yer tutucu görsel</Badge>}
      </PageHeader>
      <FabricEditor key={fabric.id} fabric={fabric} models={models} />
    </>
  );
}
