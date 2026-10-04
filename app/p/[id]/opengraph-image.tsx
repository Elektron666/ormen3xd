import { ImageResponse } from "next/og";
import { loadCatalogue } from "@/lib/data";
import { decodeShare } from "@/lib/share";
import { summariseShare } from "@/lib/share-summary";
import { FABRIC_TYPE_LABELS } from "@/lib/i18n/tr";

// WhatsApp / social preview for a shared combination: the fabric colours,
// their ORMEN codes in large type and the furniture they were chosen for.
// (The 3D snapshot itself is attached to the share as an image file.)

export const alt = "ORMEN kumaş kombinasyonu";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = decodeShare(id)?.f;
  const cat = (f ? await loadCatalogue(f) : null) ?? (await loadCatalogue(null))!;
  const summary = summariseShare(id, cat.models, cat.fabrics);
  const shown = summary?.fabrics.slice(0, 3) ?? [];
  const names = summary ? [...new Set(summary.pieces.map((p) => p.model.name))].join(" · ") : "";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F5F1EA", color: "#2A2A28", padding: 64 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 40, letterSpacing: 12, color: "#5C3D2A" }}>ORMEN</span>
            <span style={{ fontSize: 16, letterSpacing: 8, color: "#7D7B75", marginTop: 4 }}>ATELIER</span>
          </div>
          <span style={{ fontSize: 24, color: "#55544F" }}>{names}</span>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 48, marginTop: 24 }}>
          {shown.map((f) => (
            <div key={f.code} style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", flex: 1 }}>
              <div
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: 200,
                  background: `radial-gradient(circle at 35% 30%, ${f.texture.avgColor}, ${f.texture.avgColor} 55%, rgba(0,0,0,0.25) 140%)`,
                  boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
                }}
              />
              <span style={{ fontSize: shown.length > 2 ? 52 : 64, marginTop: 28, letterSpacing: 1 }}>{f.code}</span>
              <span style={{ fontSize: 26, color: "#55544F", marginTop: 6 }}>
                {f.series} · {f.colorName} · {FABRIC_TYPE_LABELS[f.type]}
              </span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 22, color: "#7D7B75", borderTop: "1px solid #E3DDD2", paddingTop: 20 }}>
          <span>{cat.firm ? `${cat.firm.name} · ` : ""}Kumaşlar: ORMEN TEKSTİL</span>
          <span>Açın · döndürün · numune isteyin</span>
        </div>
      </div>
    ),
    size,
  );
}
