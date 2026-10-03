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
