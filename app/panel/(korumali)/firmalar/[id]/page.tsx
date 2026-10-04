import { notFound } from "next/navigation";
import { getRepository, loadCatalogue } from "@/lib/data";
import { FirmEditor } from "@/components/panel/FirmEditor";
import { FirmShare } from "@/components/panel/FirmShare";
import { Badge, PageHeader } from "@/components/panel/ui";
import { siteUrl, siteUrlIsFinal } from "@/lib/site";

export default async function EditFirmPage({ params, searchParams }: PageProps<"/panel/firmalar/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const repo = getRepository();
  const firm = await repo.getFirmById(decodeURIComponent(id));
  if (!firm) notFound();
  const [all, showcaseIds, cat] = await Promise.all([repo.listAllModels(), repo.getFirmShowcaseIds(firm.id), firm.isActive ? loadCatalogue(firm.slug) : null]);
  const showcase = all.filter((m) => m.firmId === null && m.isActive);
  const own = all.filter((m) => m.firmId === firm.id);
  return (
    <>
      <PageHeader title={firm.name} eyebrow="Firma">
        {!firm.isActive && <Badge tone="off">yayında değil</Badge>}
      </PageHeader>
      {sp.kaydedildi && (
        <p role="status" className="mb-4 rounded-xl bg-[#E8EFE6] px-4 py-3 text-[14px] text-[#35523a]">
          {firm.name} kaydedildi.
        </p>
      )}
      {cat ? (
        <FirmShare firmId={firm.id} slug={firm.slug} base={siteUrl()} models={cat.models} finalDomain={siteUrlIsFinal()} />
      ) : (
        <p className="mb-8 rounded-xl bg-cizgi/40 px-4 py-3 text-[14px] text-antrasit-70">Firma sayfası yayında değil; bağlantı ve QR, yayına alınınca burada görünür.</p>
      )}
      <FirmEditor key={firm.id} firm={firm} showcaseIds={showcaseIds} showcase={showcase} ownModels={own} />
    </>
  );
}
