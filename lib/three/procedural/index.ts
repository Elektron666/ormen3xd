import type * as THREE from "three";
import type { ModelSource } from "@/lib/types";
import { PROCEDURAL_BUILDERS } from "./furniture";
import { buildParametric } from "./parametric";

/** Builds a model that lives in code (built-in samples and parametric models). */
export function buildCodeModel(src: Exclude<ModelSource, { kind: "glb" }>): THREE.Group {
  return src.kind === "parametric" ? buildParametric(src.params) : PROCEDURAL_BUILDERS[src.generator]();
}
