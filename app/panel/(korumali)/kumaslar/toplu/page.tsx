import { getRepository } from "@/lib/data";
import { BulkImport } from "@/components/panel/BulkImport";
import { PageHeader } from "@/components/panel/ui";

export const metadata = { title: "Toplu kumaş ekle" };

export default async function BulkPage() {
  const fabrics = await getRepository().listFabrics({ includeInactive: true });
  return (
    <>
      <PageHeader title="Toplu kumaş ekle" eyebrow="Kumaşlar" />
      <BulkImport existingCodes={fabrics.map((f) => f.code)} />
    </>
  );
}
