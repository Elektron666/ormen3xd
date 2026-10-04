import "server-only";
import { supabaseEnabled } from "@/lib/supabase/config";
import { MemoryRepository } from "./memory-repo";
import { SupabaseRepository } from "./supabase-repo";
import type { Repository } from "./repository";

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
