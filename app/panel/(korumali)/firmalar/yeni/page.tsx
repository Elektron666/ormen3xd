import { getRepository } from "@/lib/data";
import { FirmEditor } from "@/components/panel/FirmEditor";
import { PageHeader } from "@/components/panel/ui";

export const metadata = { title: "Yeni firma" };

export default async function NewFirmPage() {
  const showcase = (await getRepository().listAllModels()).filter((m) => m.firmId === null && m.isActive);
  return (
    <>
      <PageHeader title="Yeni firma" eyebrow="Firmalar" />
      <FirmEditor showcase={showcase} />
    </>
  );
}
