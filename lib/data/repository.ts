import type { Fabric, Firm, FurnitureModel } from "@/lib/types";
import type { SampleRequest, SampleRequestInput } from "@/lib/samples";

export type FabricInput = Omit<Fabric, "id"> & { id?: string; derivedMaps?: boolean };
export type ModelInput = Omit<FurnitureModel, "id"> & { id?: string };

/**
 * Single entry point for all data access. Pages and API routes only talk to
 * this interface; whether it is backed by the in-memory seed or Supabase is
 * decided in lib/data/index.ts.
 */
export interface Repository {
  readonly kind: "memory" | "supabase";
  /** False for the in-memory demo store: changes disappear when the server restarts. */
  readonly persistent: boolean;

  listFabrics(opts?: { includeInactive?: boolean }): Promise<Fabric[]>;
  getFabricByCode(code: string): Promise<Fabric | null>;
  getFabricById(id: string): Promise<Fabric | null>;
  saveFabric(input: FabricInput): Promise<Fabric>;
  setFabricActive(id: string, active: boolean): Promise<void>;

  /** ORMEN's own showcase models (firmId = null). */
  listShowcaseModels(): Promise<FurnitureModel[]>;
  listAllModels(): Promise<FurnitureModel[]>;
  listFirmModels(firmId: string): Promise<FurnitureModel[]>;
  getModel(slug: string, firmId: string | null): Promise<FurnitureModel | null>;
  saveModel(input: ModelInput): Promise<FurnitureModel>;

  getFirmBySlug(slug: string): Promise<Firm | null>;

  createSampleRequest(input: SampleRequestInput): Promise<SampleRequest>;
  listSampleRequests(): Promise<SampleRequest[]>;

  /** Stores an uploaded file and returns the URL it is served from. */
  putFile(path: string, data: ArrayBuffer, contentType: string): Promise<string>;
}

export class DuplicateCodeError extends Error {
  constructor(public code: string) {
    super(`${code} kodu zaten var.`);
  }
}
