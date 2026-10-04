import type { Fabric } from "@/lib/types";
import { roomOutline, type RoomSpec } from "@/lib/room/spec";
import { footprint, type Placement } from "@/lib/room/layout";
import { planBounds, PLAN_WALL_T } from "@/lib/room/plan";

// Vector floor plan of the layout, for print: crisp at any size, drawn from
// the same data as the 3D view. Units in the SVG are centimetres.

export interface PlanSvgPiece {
  p: Placement;
  dims: { w: number; d: number };
  fabric: Fabric;
}

export function PlanSvg({ room, pieces, className }: { room: RoomSpec; pieces: PlanSvgPiece[]; className?: string }) {
  const b = planBounds(
    room,
    pieces.map((x) => footprint(x.p, x.dims)),
  );
  const vb = [b.minX * 100, b.minZ * 100, (b.maxX - b.minX) * 100, (b.maxZ - b.minZ) * 100];
  const { points, walls } = roomOutline(room);
  const t = PLAN_WALL_T * 100;

  return (
    <svg viewBox={vb.join(" ")} className={className} role="img" aria-label="Yerleşim planı" fontFamily="var(--font-inter), sans-serif">
      {room.shape !== "yok" && (
        <>
          <polygon points={points.map(([x, z]) => `${x},${z}`).join(" ")} fill="#F3EEE6" />
          {points.map(([x0, z0], i) => {
            if (!walls[i]) return null;
            const [x1, z1] = points[(i + 1) % points.length];
            // draw the wall just outside the inner face. roomOutline lists the
            // corners so that (−dz, dx) points out of the room (left wall: −x).
            const len = Math.hypot(x1 - x0, z1 - z0);
            const nx = -(z1 - z0) / len, nz = (x1 - x0) / len;
            return (
              <line
                key={i}
                x1={x0 + nx * (t / 2)}
                y1={z0 + nz * (t / 2)}
                x2={x1 + nx * (t / 2)}
                y2={z1 + nz * (t / 2)}
                stroke="#3a3936"
                strokeWidth={t}
                strokeLinecap="square"
              />
            );
          })}
          <text x={0} y={-t - 28} textAnchor="middle" fontSize={20} fill="#2a2a28">
            {room.widthCm} cm
          </text>
          <text
            x={-room.widthCm / 2 - t - 28}
            y={room.depthCm / 2}
            textAnchor="middle"
            fontSize={20}
            fill="#2a2a28"
            transform={`rotate(-90 ${-room.widthCm / 2 - t - 28} ${room.depthCm / 2})`}
          >
            {room.depthCm} cm
          </text>
        </>
      )}
      {pieces.map(({ p, dims, fabric }) => (
        <g key={p.id} transform={`translate(${p.x * 100} ${p.z * 100}) rotate(${-p.rot})`}>
          <rect x={-dims.w / 2} y={-dims.d / 2} width={dims.w} height={dims.d} rx={6} fill={fabric.texture.avgColor} stroke="#2a2a28" strokeWidth={1.5} />
          {/* the back of the piece, so its orientation reads */}
          <line x1={-dims.w / 2 + 4} y1={-dims.d / 2 + 5} x2={dims.w / 2 - 4} y2={-dims.d / 2 + 5} stroke="#2a2a28" strokeWidth={4} />
        </g>
      ))}
      {pieces.map(({ p, fabric }) => (
        <text key={`t-${p.id}`} x={p.x * 100} y={p.z * 100 + 7} textAnchor="middle" fontSize={18} fill="#2a2a28" stroke="#FBF9F5" strokeWidth={4} paintOrder="stroke">
          {fabric.code}
        </text>
      ))}
    </svg>
  );
}
