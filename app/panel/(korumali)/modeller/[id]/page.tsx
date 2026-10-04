import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { ModelEditor } from "@/components/panel/ModelEditor";
import { PageHeader } from "@/components/panel/ui";

export default async function EditModelPage({ params }: PageProps<"/panel/modeller/[id]">) {
  const { id } = await params;
  const repo = getRepository();
  const [models, fabrics] = await Promise.all([repo.listAllModels(), repo.listFabrics()]);
  const model = models.find((m) => m.id === decodeURIComponent(id));
  if (!model || model.source.kind !== "glb") notFound();
  return (
    <>
      <PageHeader title={model.name} eyebrow="Modeli düzenle" />
      <ModelEditor key={model.id} model={model} fabrics={fabrics} />
    </>
  );
}
