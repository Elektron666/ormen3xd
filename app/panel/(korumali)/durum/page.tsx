import { headers } from "next/headers";
import { requirePanelUser } from "@/lib/auth/panel";
import { gatherSetupFacts } from "@/lib/setup-facts";
import { evaluateSetup, overall, type CheckStatus } from "@/lib/setup-check";
import { PageHeader } from "@/components/panel/ui";

export const metadata = { title: "Kurulum durumu" };

// Each check is re-run on every visit: fix something, reload, see it turn green.

const STYLE: Record<CheckStatus, { label: string; dot: string; box: string }> = {
  ok: { label: "Tamam", dot: "bg-[#3f7a4f]", box: "border-cizgi bg-kagit" },
  warn: { label: "Eksik", dot: "bg-[#b7791f]", box: "border-[#e8d3b0] bg-[#fbf4e8]" },
  error: { label: "Yapılmalı", dot: "bg-[#b4483c]", box: "border-[#e7c3bd] bg-[#fbeeec]" },
  todo: { label: "Sizde", dot: "bg-antrasit-50", box: "border-dashed border-cizgi-koyu bg-kagit" },
};

const HEADLINE: Record<CheckStatus, string> = {
  ok: "Kurulum tamam. Yalnızca elle yapılacak işler kaldı.",
  todo: "Teknik kurulum tamam; aşağıdaki işler sizde.",
  warn: "Site çalışıyor ama birkaç ayar eksik.",
  error: "Kurulumda yapılması gereken adımlar var.",
};

export default async function SetupPage() {
  await requirePanelUser();
  const host = (await headers()).get("host");
  const checks = evaluateSetup(await gatherSetupFacts(host));
  const state = overall(checks);
  return (
    <>
      <PageHeader title="Kurulum durumu" eyebrow="Sistem" />
      <p className={`mb-6 rounded-xl border px-4 py-3 text-[15px] ${STYLE[state].box}`} role="status">
        {HEADLINE[state]}
      </p>
      <ul className="flex flex-col gap-3" data-testid="kurulum-listesi">
        {checks.map((c) => (
          <li key={c.id} className={`rounded-2xl border p-4 ${STYLE[c.status].box}`} data-durum={c.status}>
            <div className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STYLE[c.status].dot}`} aria-hidden />
              <h2 className="flex-1 font-medium">{c.title}</h2>
              <span className="text-[12px] tracking-wide text-antrasit-70">{STYLE[c.status].label}</span>
            </div>
            <p className="mt-1.5 pl-[22px] text-[14px] text-antrasit-70">{c.detail}</p>
            {c.fix && c.status !== "ok" && <p className="mt-1.5 pl-[22px] text-[14px] text-antrasit">→ {c.fix}</p>}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[13px] text-antrasit-50">Sayfa her açılışta yeniden kontrol eder: bir adımı tamamlayınca yenileyin.</p>
    </>
  );
}
