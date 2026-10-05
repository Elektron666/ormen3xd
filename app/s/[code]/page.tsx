import { notFound, permanentRedirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { SHORT_CODE } from "@/lib/short-link";

// Short share link → the full share page (which carries the WhatsApp preview).
export default async function ShortLinkPage({ params }: PageProps<"/s/[code]">) {
  const { code } = await params;
  if (!SHORT_CODE.test(code)) notFound();
  const longId = await getRepository().getShare(code);
  if (!longId) notFound();
  permanentRedirect(`/p/${longId}`);
}
