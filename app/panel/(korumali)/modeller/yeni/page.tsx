import { getRepository } from "@/lib/data";
import { ModelEditor } from "@/components/panel/ModelEditor";
import { PageHeader } from "@/components/panel/ui";

export const metadata = { title: "Yeni model" };

export default async function NewModelPage() {
  const fabrics = await getRepository().listFabrics();
  return (
    <>
      <PageHeader title="Yeni model" eyebrow="Modeller" />
      <ModelEditor fabrics={fabrics} />
    </>
  );
}
