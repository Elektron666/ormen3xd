import "server-only";
import { MemoryRepository } from "./memory-repo";
import type { Repository } from "./repository";

let repo: Repository | undefined;

/**
 * Returns the active repository. Without Supabase environment variables the
 * app runs on the in-memory seed catalogue so it works out of the box.
 */
export function getRepository(): Repository {
  if (!repo) {
    // The Supabase implementation is added in the panel slice; until then the
    // memory repository is always used.
    repo = new MemoryRepository();
  }
  return repo;
}
