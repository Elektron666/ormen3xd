import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { decodeCutJob } from "@/lib/cut-report";
import { formatMetres } from "@/lib/metraj";
import { ActualForm } from "./ActualForm";

// Opened from the QR on the cutter's sheet ("usta föyü"). The upholsterer
// writes how much fabric the job really took. No sign-in, no personal data.

export const metadata: Metadata = { title: "Kesilen gerçek metre", robots: { index: false, follow: false } };

export default async function ActualMetresPage({ params, searchParams }: PageProps<"/gercek-metre/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const job = decodeCutJob(id);
  if (!job) notFound();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 bg-kirik-beyaz px-5 py-10 text-antrasit">
      <header>
        <p className="eyebrow">ORMEN TEKSTİL · Usta föyü</p>
        <h1 className="mt-2 font-display text-[28px] leading-tight">Kesimde gerçekte kaç metre gitti?</h1>
        <p className="mt-2 text-[14px] text-antrasit-70">
          Ustam, föydeki sayı tahmindi. Gerçeğini yazarsanız sonraki föyler daha doğru olur. Ad, telefon istenmez.
        </p>
      </header>
      {"tesekkurler" in sp ? (
        <p role="status" className="rounded-2xl bg-[#E8EFE6] p-4 text-[15px] text-[#35523a]">
          Eline sağlık, kaydedildi.
        </p>
      ) : (
        <ActualForm
          id={id}
          rows={job.rows.map((r) => ({ code: r.code, models: r.models.join(", "), estimate: r.estimate === null ? "usta teyit eder" : formatMetres(r.estimate) }))}
        />
      )}
    </main>
  );
}
