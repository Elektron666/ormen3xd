import { codeUpper } from "@/lib/i18n/tr";
import type { Fabric, Firm, FurnitureModel } from "@/lib/types";
import { buildSeedFabrics } from "@/lib/seed/fabrics";
import { SEED_FIRMS, SEED_MODELS } from "@/lib/seed/models";
import { DuplicateCodeError, DuplicateSlugError, type FabricInput, type FirmInput, type ModelInput, type Repository } from "./repository";
import type { SampleRequest, SampleRequestInput } from "@/lib/samples";
import { buildReport, type StoredEvent, type UsageEvent } from "@/lib/events";

/**
 * In-memory repository backed by the seed catalogue; used when Supabase is
 * not configured. Everything added through the panel lives only as long as
 * the server process (and, on Vercel, only on the instance that took it).
 */
export class MemoryRepository implements Repository {
  readonly kind = "memory" as const;
  readonly persistent = false;
  private fabrics: Fabric[] = buildSeedFabrics();
  private models: FurnitureModel[] = structuredClone(SEED_MODELS);
  private firms: Firm[] = structuredClone(SEED_FIRMS);
  private firmShowcase = new Map<string, string[]>();
  private samples: SampleRequest[] = [];
  private events: StoredEvent[] = [];
  private shares = new Map<string, string>();
  readonly files = new Map<string, { data: ArrayBuffer; type: string }>();

  async listFabrics(opts?: { includeInactive?: boolean }) {
    return this.fabrics.filter((f) => opts?.includeInactive || f.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getFabricByCode(code: string) {
    const c = codeUpper(code);
    return this.fabrics.find((f) => f.code === c) ?? null;
  }

  async getFabricById(id: string) {
    return this.fabrics.find((f) => f.id === id) ?? null;
  }

  async saveFabric(input: FabricInput) {
    const clash = this.fabrics.find((f) => f.code === input.code && f.id !== input.id);
    if (clash) throw new DuplicateCodeError(input.code);
    const { derivedMaps: _d, ...rest } = input;
    void _d;
    const existing = input.id ? this.fabrics.findIndex((f) => f.id === input.id) : -1;
    const fabric: Fabric = {
      ...rest,
      id: input.id ?? crypto.randomUUID(),
      sortOrder: input.sortOrder ?? (existing >= 0 ? this.fabrics[existing].sortOrder : this.fabrics.length),
    };
    if (existing >= 0) this.fabrics[existing] = fabric;
    else this.fabrics.push(fabric);
    return fabric;
  }

  async setFabricActive(id: string, active: boolean) {
    const f = this.fabrics.find((x) => x.id === id);
    if (f) f.isActive = active;
  }

  async listShowcaseModels() {
    return this.models.filter((m) => m.firmId === null && m.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async listAllModels() {
    return [...this.models].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async listFirmModels(firmId: string) {
    return this.models.filter((m) => m.firmId === firmId && m.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getModel(slug: string, firmId: string | null) {
    return this.models.find((m) => m.slug === slug && (m.firmId === firmId || m.firmId === null)) ?? null;
  }

  async saveModel(input: ModelInput) {
    const existing = input.id ? this.models.findIndex((m) => m.id === input.id) : -1;
    const model: FurnitureModel = { ...input, id: input.id ?? crypto.randomUUID() };
    if (existing >= 0) this.models[existing] = model;
    else this.models.push(model);
    return model;
  }

  async getFirmBySlug(slug: string) {
    return this.firms.find((f) => f.slug === slug && f.isActive) ?? null;
  }

  async listFirms() {
    return [...this.firms].sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }

  async getFirmById(id: string) {
    return this.firms.find((f) => f.id === id) ?? null;
  }

  async saveFirm(input: FirmInput) {
    if (this.firms.some((f) => f.slug === input.slug && f.id !== input.id)) throw new DuplicateSlugError(input.slug);
    const firm: Firm = { ...input, id: input.id ?? crypto.randomUUID() };
    const i = this.firms.findIndex((f) => f.id === firm.id);
    if (i >= 0) this.firms[i] = firm;
    else this.firms.push(firm);
    return firm;
  }

  async getFirmShowcaseIds(firmId: string) {
    return [...(this.firmShowcase.get(firmId) ?? [])];
  }

  async setFirmShowcaseIds(firmId: string, modelIds: string[]) {
    this.firmShowcase.set(firmId, [...new Set(modelIds)]);
  }

  async createSampleRequest(input: SampleRequestInput) {
    const { consent: _consent, ...rest } = input;
    void _consent;
    const req: SampleRequest = { ...rest, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.samples.unshift(req);
    return req;
  }

  async listSampleRequests() {
    return [...this.samples];
  }

  async getShare(code: string) {
    return this.shares.get(code) ?? null;
  }

  async saveShare(code: string, longId: string) {
    const existing = this.shares.get(code);
    if (existing !== undefined) return existing === longId;
    this.shares.set(code, longId);
    return true;
  }

  async recordEvent(e: UsageEvent) {
    this.events.unshift({ ...e, createdAt: new Date().toISOString() });
    if (this.events.length > 50_000) this.events.length = 50_000;
  }

  async listEvents(since: Date, firmSlug?: string) {
    const t = since.toISOString();
    return this.events.filter((e) => e.createdAt >= t && (firmSlug === undefined || (e.firmSlug ?? "") === firmSlug));
  }

  async eventReport(from: Date, to: Date, firmSlug?: string) {
    const t = to.toISOString();
    return buildReport((await this.listEvents(from, firmSlug)).filter((e) => e.createdAt <= t), { from, to });
  }

  async putFile(path: string, data: ArrayBuffer, contentType: string) {
    this.files.set(path, { data, type: contentType });
    return `/api/dosya/${path}`;
  }
}
