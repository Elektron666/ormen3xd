import type { Fabric, Firm, FurnitureModel } from "@/lib/types";
import type { SampleRequest, SampleRequestInput } from "@/lib/samples";
import type { Report, StoredEvent, UsageEvent } from "@/lib/events";

export type FabricInput = Omit<Fabric, "id"> & { id?: string; derivedMaps?: boolean };
export type ModelInput = Omit<FurnitureModel, "id"> & { id?: string };
export type FirmInput = Omit<Firm, "id"> & { id?: string };

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

  /** Active firm for its public page. */
  getFirmBySlug(slug: string): Promise<Firm | null>;
  /** Every firm, hidden ones too (panel). */
  listFirms(): Promise<Firm[]>;
  getFirmById(id: string): Promise<Firm | null>;
  /** Throws DuplicateSlugError when the link name is taken. */
  saveFirm(input: FirmInput): Promise<Firm>;
  /** ORMEN showcase models the firm chose to show (ids, in order). */
  getFirmShowcaseIds(firmId: string): Promise<string[]>;
  setFirmShowcaseIds(firmId: string, modelIds: string[]): Promise<void>;

  createSampleRequest(input: SampleRequestInput): Promise<SampleRequest>;
  listSampleRequests(): Promise<SampleRequest[]>;

  /** Short link → long share id; null when unknown. */
  getShare(code: string): Promise<string | null>;
  /** Stores a short link. False when the code is already taken by another combination. */
  saveShare(code: string, longId: string, firmSlug?: string | null): Promise<boolean>;

  recordEvent(e: UsageEvent): Promise<void>;
  /** Events since a date (newest first, capped), optionally of one firm ("" = ORMEN's own pages). */
  listEvents(since: Date, firmSlug?: string): Promise<StoredEvent[]>;
  /** The panel report for a period; scope as in listEvents. */
  eventReport(from: Date, to: Date, firmSlug?: string): Promise<Report>;

  /** Stores an uploaded file and returns the URL it is served from. */
  putFile(path: string, data: ArrayBuffer, contentType: string): Promise<string>;
}

export class DuplicateCodeError extends Error {
  constructor(public code: string) {
    super(`${code} kodu zaten var.`);
    this.name = "DuplicateCodeError";
  }
}

/** Checked by name: the repository may come from another bundle's copy of the class. */
export function isDuplicateCode(e: unknown): e is DuplicateCodeError {
  return e instanceof Error && e.name === "DuplicateCodeError";
}

export class DuplicateSlugError extends Error {
  constructor(public slug: string) {
    super(`“${slug}” bağlantı adı kullanılıyor.`);
    this.name = "DuplicateSlugError";
  }
}

export function isDuplicateSlug(e: unknown): e is DuplicateSlugError {
  return e instanceof Error && e.name === "DuplicateSlugError";
}

/**
 * What a firm's page shows: the firm's own models first, then the ORMEN
 * showcase models it picked. A firm that has neither shows the showcase.
 */
export async function modelsForFirm(repo: Repository, firmId: string): Promise<FurnitureModel[]> {
  const [own, ids, showcase] = await Promise.all([repo.listFirmModels(firmId), repo.getFirmShowcaseIds(firmId), repo.listShowcaseModels()]);
  const byId = new Map(showcase.map((m) => [m.id, m]));
  const picked = ids.map((id) => byId.get(id)).filter((m): m is FurnitureModel => !!m);
  const out = [...own, ...picked];
  return out.length ? out : showcase;
}
