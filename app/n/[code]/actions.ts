"use server";

import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { canMarkOrdered, cleanSampleCode } from "@/lib/samples";

/**
 * The shop marks a sample as ordered by scanning its label. Only the code is
 * needed; it is random (34^6) and only reaches the shop on the label. ORMEN
 * can move the request back in the panel if it was pressed by mistake.
 */
export async function markOrderedAction(form: FormData): Promise<void> {
  const code = cleanSampleCode(String(form.get("code") ?? ""));
  if (!code) redirect("/");
  const repo = getRepository();
  const req = await repo.getSampleByCode(code);
  if (req && canMarkOrdered(req.status)) await repo.updateSampleRequest(req.id, { status: "siparis" });
  redirect(`/n/${code}?bildirildi`);
}
