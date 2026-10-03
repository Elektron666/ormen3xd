import type { Fabric, Firm, FurnitureModel } from "@/lib/types";
import { buildSeedFabrics } from "@/lib/seed/fabrics";
import { SEED_FIRMS, SEED_MODELS } from "@/lib/seed/models";
import type { Repository } from "./repository";

/** In-memory repository backed by the seed catalogue; used when Supabase is not configured. */
export class MemoryRepository implements Repository {
  readonly kind = "memory" as const;
  private fabrics: Fabric[] = buildSeedFabrics();
  private models: FurnitureModel[] = structuredClone(SEED_MODELS);
  private firms: Firm[] = structuredClone(SEED_FIRMS);

  async listFabrics(opts?: { includeInactive?: boolean }) {
    return this.fabrics
      .filter((f) => opts?.includeInactive || f.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getFabricByCode(code: string) {
    const c = code.toLocaleUpperCase("tr-TR");
    return this.fabrics.find((f) => f.code === c) ?? null;
  }

  async listShowcaseModels() {
    return this.models.filter((m) => m.firmId === null && m.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async listFirmModels(firmId: string) {
    return this.models.filter((m) => m.firmId === firmId && m.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getModel(slug: string, firmId: string | null) {
    return this.models.find((m) => m.slug === slug && (m.firmId === firmId || m.firmId === null)) ?? null;
  }

  async getFirmBySlug(slug: string) {
    return this.firms.find((f) => f.slug === slug && f.isActive) ?? null;
  }
}
