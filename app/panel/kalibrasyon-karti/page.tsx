import { requirePanelUser } from "@/lib/auth/panel";
import { CARD, markerCentresMm } from "@/lib/fabric/calibration";
import { PrintButton } from "../kart/[id]/PrintButton";

// Ar-Ge A1 (ARGE.md): the calibration card, drawn in millimetres so it prints
// at true size. Cut the window out, lay the card flat on the fabric, photograph
// from above; the panel finds the four markers and takes the scale from them.

export const metadata = { title: "Kalibrasyon kartı" };

export default async function CalibrationCardPage() {
  await requirePanelUser();
  const { width: W, height: H, window: win, marker, checkBarMm } = CARD;
  const barY = win.y + win.size + marker.offset + marker.size / 2 + 22;
  return (
    <main className="min-h-dvh bg-cizgi/40 py-8 print:min-h-0 print:bg-white print:py-0">
      <style>{`@page { size: A4 portrait; margin: 0; } @media print { html, body { background: #fff !important; } }`}</style>
      <div className="mx-auto mb-6 flex max-w-[210mm] flex-col items-center gap-3 px-4 print:hidden">
        <PrintButton />
        <ol className="max-w-xl list-decimal space-y-1 pl-5 text-[13px] text-antrasit-70">
          <li>
            Yazdırırken ölçek <strong>%100 / Gerçek boyut</strong> olsun (“Sayfaya sığdır” kapalı), kâğıt A4, kenar boşluğu yok. Mümkünse kalın kâğıda basın.
          </li>
          <li>
            Basılan kartta alttaki çubuğu cetvelle ölçün: tam <strong>10,0 cm</strong> olmalı. Değilse kart kullanılamaz; yazıcı ölçeğini düzeltip yeniden basın.
          </li>
          <li>Ortadaki kesikli kareyi maket bıçağıyla kesip çıkarın.</li>
          <li>Kartı kumaşın üstüne düz koyun, telefonu tepeden tutup dört siyah işaret de görünecek şekilde çekin.</li>
          <li>Panelde yeni kumaş eklerken “Fotoğrafta kalibrasyon kartı var”ı işaretleyin; ölçek kendiliğinden gelir.</li>
        </ol>
      </div>
      <article className="mx-auto bg-white shadow-lg print:shadow-none" style={{ width: `${W}mm`, height: `${H}mm` }}>
        <svg width={`${W}mm`} height={`${H}mm`} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="ORMEN kalibrasyon kartı">
          <text x={W / 2} y={18} textAnchor="middle" fontSize="7" letterSpacing="2.4" fill="#2A2A28" fontFamily="Georgia, serif">
            ORMEN
          </text>
          <text x={W / 2} y={26} textAnchor="middle" fontSize="3.2" fill="#6b6762" fontFamily="sans-serif">
            Kumaş çekimi için kalibrasyon kartı · %100 ölçekte basın · ortadaki kareyi kesin
          </text>
          {/* the window to cut out */}
          <rect x={win.x} y={win.y} width={win.size} height={win.size} fill="none" stroke="#2A2A28" strokeWidth="0.3" strokeDasharray="2 1.5" />
          <text x={win.x + win.size / 2} y={win.y + win.size / 2} textAnchor="middle" fontSize="4" fill="#b8b2a8" fontFamily="sans-serif">
            kesip çıkarın · 15 × 15 cm
          </text>
          {markerCentresMm().map(([cx, cy], i) => (
            <g key={i}>
              <rect x={cx - marker.size / 2} y={cy - marker.size / 2} width={marker.size} height={marker.size} fill="#000" />
              <rect x={cx - marker.hole / 2} y={cy - marker.hole / 2} width={marker.hole} height={marker.hole} fill="#fff" />
            </g>
          ))}
          {/* printer check: must measure exactly 10 cm */}
          <g transform={`translate(${(W - checkBarMm) / 2} ${barY})`}>
            <rect x="0" y="0" width={checkBarMm} height="3" fill="#2A2A28" />
            {Array.from({ length: checkBarMm / 10 + 1 }, (_, i) => (
              <line key={i} x1={i * 10} x2={i * 10} y1="3" y2={i % 5 === 0 ? 8 : 6} stroke="#2A2A28" strokeWidth="0.3" />
            ))}
            <text x={checkBarMm / 2} y="14" textAnchor="middle" fontSize="3.2" fill="#2A2A28" fontFamily="sans-serif">
              Bu çubuk tam 10,0 cm olmalı
            </text>
          </g>
        </svg>
      </article>
    </main>
  );
}
