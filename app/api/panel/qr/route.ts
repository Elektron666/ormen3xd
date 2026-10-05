import QRCode from "qrcode";
import { getPanelUser } from "@/lib/auth/panel";
import { FIRM_PATH, siteUrl } from "@/lib/site";
import { cleanTag, markedPath } from "@/lib/source";

// QR codes for firm pages, as SVG (for print shops) or a 1200 px PNG.
//   GET /api/panel/qr?yol=/f/ornek-mobilya[/model]&bicim=svg|png[&etiket=ankara-1]
// The code carries ?q so visits from print are counted as "QR" in the report.

export async function GET(request: Request) {
  if (!(await getPanelUser())) return new Response("Giriş gerekli.", { status: 401 });
  const q = new URL(request.url).searchParams;
  const path = q.get("yol") ?? "";
  if (!FIRM_PATH.test(path)) return new Response("Geçersiz adres.", { status: 400 });
  const tag = cleanTag(q.get("etiket"));
  const url = `${siteUrl()}${markedPath(path, { qr: true, tag })}`;
  const name = `qr-${path.slice(3).replace(/\//g, "-")}${tag ? `-${tag}` : ""}`;
  const opts = { margin: 2, errorCorrectionLevel: "M" as const, color: { dark: "#2A2A28", light: "#FFFFFF" } };

  if (q.get("bicim") === "png") {
    const png = await QRCode.toBuffer(url, { ...opts, type: "png", width: 1200 });
    return new Response(new Uint8Array(png), {
      headers: { "content-type": "image/png", "content-disposition": `attachment; filename="${name}.png"`, "cache-control": "no-store" },
    });
  }
  const svg = await QRCode.toString(url, { ...opts, type: "svg" });
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "content-disposition": q.get("indir") === "0" ? "inline" : `attachment; filename="${name}.svg"`,
      "cache-control": "no-store",
    },
  });
}
