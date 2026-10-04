import { getRepository } from "@/lib/data";
import { FirmEditor } from "@/components/panel/FirmEditor";
import { PageHeader } from "@/components/panel/ui";
import { seriesOf } from "@/lib/fabric/allowed";

export const metadata = { title: "Yeni firma" };

export default async function NewFirmPage() {
  const repo = getRepository();
  const [models, fabrics] = await Promise.all([repo.listAllModels(), repo.listFabrics()]);
  const showcase = models.filter((m) => m.firmId === null && m.isActive);
  return (
    <>
      <PageHeader title="Yeni firma" eyebrow="Firmalar" />
      <FirmEditor showcase={showcase} allSeries={seriesOf(fabrics)} />
    </>
  );
}
