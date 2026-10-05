import { getRepository } from "@/lib/data";
import { getPanelUser } from "@/lib/auth/panel";
import { toCsv } from "@/lib/csv";
import { prettyPhone } from "@/lib/samples";

// Sample requests as a CSV for Excel (";" separated, UTF-8 BOM).
export async function GET() {
  if (!(await getPanelUser())) return new Response("Giriş gerekli.", { status: 401 });
  const rows = await getRepository().listSampleRequests();
  const csv = toCsv([
    ["tarih", "ad", "telefon", "kumaslar", "firma", "modeller", "not", "baglanti"],
    ...rows.map((r) => [
      new Date(r.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }),
      r.name,
      prettyPhone(r.phone),
      r.fabricCodes.join(", "),
      r.firmSlug ?? "",
      (r.modelSlugs ?? []).join(", "),
      r.note ?? "",
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
