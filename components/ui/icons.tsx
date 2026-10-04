// Minimal line icons (1.5px stroke), drawn for this project.
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { width: 20, height: 20, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const IconCopy = (p: P) => (
  <svg {...base} {...p} aria-hidden="true"><rect x="7" y="7" width="9.5" height="9.5" rx="1.5" /><path d="M13 7V4.5A1.5 1.5 0 0 0 11.5 3h-7A1.5 1.5 0 0 0 3 4.5v7A1.5 1.5 0 0 0 4.5 13H7" /></svg>
);
export const IconCheck = (p: P) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M4 10.5l4 4 8-9" /></svg>
);
export const IconSearch = (p: P) => (
  <svg {...base} {...p} aria-hidden="true"><circle cx="9" cy="9" r="5.5" /><path d="M13 13l4 4" /></svg>
);
export const IconClose = (p: P) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M5 5l10 10M15 5L5 15" /></svg>
);
export const IconRotate = (p: P) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M3.5 10a6.5 6.5 0 0 1 11.3-4.4M16.5 10a6.5 6.5 0 0 1-11.3 4.4" /><path d="M15 2.5v3.3h-3.3M5 17.5v-3.3h3.3" /></svg>
);
export const IconHeart = ({ filled, ...p }: P & { filled?: boolean }) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M10 16.5s-6.5-3.9-6.5-8.4A3.6 3.6 0 0 1 10 5.9a3.6 3.6 0 0 1 6.5 2.2c0 4.5-6.5 8.4-6.5 8.4z" fill={filled ? "currentColor" : "none"} /></svg>
);
export const IconZoom = (p: P) => (
  <svg {...base} {...p} aria-hidden="true"><circle cx="9" cy="9" r="5.5" /><path d="M13 13l4 4M7 9h4M9 7v4" /></svg>
);
export const IconZoomOut = (p: P) => (
  <svg {...base} {...p} aria-hidden="true"><circle cx="9" cy="9" r="5.5" /><path d="M13 13l4 4M7 9h4" /></svg>
);
export const IconRuler = (p: P) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M2.5 13.5l11-11 4 4-11 11z" /><path d="M6 10l1.5 1.5M8.5 7.5L10 9M11 5l1.5 1.5" /></svg>
);
export const IconCompare = (p: P) => (
  <svg {...base} {...p} aria-hidden="true"><rect x="2.5" y="4" width="15" height="12" rx="1.5" /><path d="M10 2.5v15" /></svg>
);
export const IconArrowsH = (p: P) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M7 6l-4 4 4 4M13 6l4 4-4 4" /></svg>
);
export const IconPlan = (p: P) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M3 3h14v14H3z" /><path d="M3 10h6M12 3v5M12 12v5M9 10v7" /></svg>
);
export const IconCube = (p: P) => (
  <svg {...base} {...p} aria-hidden="true"><path d="M10 2.5l6.5 3.75v7.5L10 17.5l-6.5-3.75v-7.5z" /><path d="M3.5 6.25L10 10l6.5-3.75M10 10v7.5" /></svg>
);
