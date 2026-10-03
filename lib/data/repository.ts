import type { Fabric, Firm, FurnitureModel } from "@/lib/types";

/**
 * Single entry point for all data access. Pages and API routes only talk to
 * this interface; whether it is backed by the in-memory seed or Supabase is
 * decided in lib/data/index.ts.
 */
export interface Repository {
  readonly kind: "memory" | "supabase";
  listFabrics(opts?: { includeInactive?: boolean }): Promise<Fabric[]>;
  getFabricByCode(code: string): Promise<Fabric | null>;
  /** ORMEN's own showcase models (firmId = null). */
  listShowcaseModels(): Promise<FurnitureModel[]>;
  listFirmModels(firmId: string): Promise<FurnitureModel[]>;
  getModel(slug: string, firmId: string | null): Promise<FurnitureModel | null>;
  getFirmBySlug(slug: string): Promise<Firm | null>;
}
