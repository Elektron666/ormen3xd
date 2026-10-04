import { getRepository } from "@/lib/data";
import { FabricEditor } from "@/components/panel/FabricEditor";
import { PageHeader } from "@/components/panel/ui";

export const metadata = { title: "Yeni kumaş" };

export default async function NewFabricPage() {
  const models = await getRepository().listShowcaseModels();
  return (
    <>
      <PageHeader title="Yeni kumaş" eyebrow="Kumaşlar" />
      <FabricEditor models={models} />
    </>
  );
}
