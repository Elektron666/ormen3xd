import "server-only";
import { supabaseEnabled } from "@/lib/supabase/config";
import { MemoryRepository } from "./memory-repo";
import { SupabaseRepository } from "./supabase-repo";
import { modelsForFirm, type Repository } from "./repository";
import type { Fabric, Firm, FurnitureModel } from "@/lib/types";

// Kept on globalThis: Next.js may bundle pages and route handlers separately,
// and the in-memory store must be one and the same for all of them.
const holder = globalThis as unknown as { __ormenRepo?: Repository };

/**
 * Returns the active repository: Supabase when its environment variables are
 * set, otherwise the in-memory seed catalogue so the app works out of the box.
 */
export function getRepository(): Repository {
  holder.__ormenRepo ??= supabaseEnabled() ? new SupabaseRepository() : new MemoryRepository();
  return holder.__ormenRepo;
}

/**
 * Everything a configurator page needs: the firm (when the page belongs to
 * one), its models, and the published fabrics. An unknown or hidden firm
 * slug returns null so the page can 404.
 */
export async function loadCatalogue(firmSlug?: string | null): Promise<{ firm: Firm | null; models: FurnitureModel[]; fabrics: Fabric[] } | null> {
  const repo = getRepository();
  const firm = firmSlug ? await repo.getFirmBySlug(firmSlug) : null;
  if (firmSlug && !firm) return null;
  const [models, fabrics] = await Promise.all([firm ? modelsForFirm(repo, firm.id) : repo.listShowcaseModels(), repo.listFabrics()]);
  return { firm, models, fabrics };
}
