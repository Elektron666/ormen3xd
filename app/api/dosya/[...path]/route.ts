import { getRepository } from "@/lib/data";
import { MemoryRepository } from "@/lib/data/memory-repo";

// Serves files uploaded in demo mode (no Supabase). With Supabase, files are
// served directly from Supabase Storage and this route is not used.

export async function GET(_req: Request, ctx: RouteContext<"/api/dosya/[...path]">) {
  const { path } = await ctx.params;
  const repo = getRepository();
  if (!(repo instanceof MemoryRepository)) return new Response("Bulunamadı", { status: 404 });
  const file = repo.files.get(path.join("/"));
  if (!file) return new Response("Bulunamadı", { status: 404 });
  return new Response(file.data, { headers: { "content-type": file.type, "cache-control": "public, max-age=31536000, immutable" } });
}
