import { requirePanelUser } from "@/lib/auth/panel";
import { getRepository } from "@/lib/data";
import { FirmEditor } from "@/components/panel/FirmEditor";
import { PageHeader } from "@/components/panel/ui";
import { seriesOf } from "@/lib/fabric/allowed";

export const metadata = { title: "Yeni firma" };

export default async function NewFirmPage() {
  // checked here, not only in the layout: a layout check does not stop the page from rendering
  await requirePanelUser();
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
