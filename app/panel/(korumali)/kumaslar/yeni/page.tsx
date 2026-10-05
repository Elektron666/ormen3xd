import { requirePanelUser } from "@/lib/auth/panel";
import { getRepository } from "@/lib/data";
import { FabricEditor } from "@/components/panel/FabricEditor";
import { PageHeader } from "@/components/panel/ui";

export const metadata = { title: "Yeni kumaş" };

export default async function NewFabricPage() {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  await requirePanelUser();
  const models = await getRepository().listShowcaseModels();
  return (
    <>
      <PageHeader title="Yeni kumaş" eyebrow="Kumaşlar" />
      <FabricEditor models={models} />
    </>
  );
}
