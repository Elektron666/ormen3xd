import { getRepository } from "@/lib/data";
import { getPanelUser } from "@/lib/auth/panel";
import { toCsv } from "@/lib/csv";
import { SAMPLE_CHOICES, prettyPhone, type SampleChoiceKey, type SampleChoices } from "@/lib/samples";

// Sample requests as a CSV for Excel (";" separated, UTF-8 BOM).
export async function GET() {
  if (!(await getPanelUser())) return new Response("Giriş gerekli.", { status: 401 });
  const rows = await getRepository().listSampleRequests();
  const csv = toCsv([
    ["tarih", "ad", "telefon", "kumaslar", "firma", "modeller", "ne icin", "kac parca", "ne zaman", "baglanti"],
    ...rows.map((r) => [
      new Date(r.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }),
      r.name,
      prettyPhone(r.phone),
      r.fabricCodes.join(", "),
      r.firmSlug ?? "",
      (r.modelSlugs ?? []).join(", "),
      choice(r.choices, "purpose"),
      choice(r.choices, "scope"),
      choice(r.choices, "timing"),
      r.link ?? "",
    ]),
  ]);
  const day = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="numune-talepleri-${day}.csv"`,
      "cache-control": "no-store",
    },
  });
}

function choice(c: SampleChoices | undefined, key: SampleChoiceKey): string {
  const v = c?.[key];
  return v ? (SAMPLE_CHOICES[key].options as Record<string, string>)[v] : "";
}
