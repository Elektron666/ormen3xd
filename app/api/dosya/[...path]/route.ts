import { getRepository } from "@/lib/data";
import type { MemoryRepository } from "@/lib/data/memory-repo";

// Serves files uploaded in demo mode (no Supabase). With Supabase, files are
// served directly from Supabase Storage and this route is not used.

export async function GET(_req: Request, ctx: RouteContext<"/api/dosya/[...path]">) {
  const { path } = await ctx.params;
  const repo = getRepository();
  // by kind, not instanceof: each route bundle has its own copy of the class,
  // while the store itself is shared through globalThis
  if (repo.kind !== "memory") return new Response("Bulunamadı", { status: 404 });
  const file = (repo as MemoryRepository).files.get(path.join("/"));
  if (!file) return new Response("Bulunamadı", { status: 404 });
  return new Response(file.data, { headers: { "content-type": file.type, "cache-control": "public, max-age=31536000, immutable" } });
}
