// Supabase is switched on simply by setting these environment variables.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const STORAGE_BUCKET = "atelier";

export function supabaseEnabled(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_SERVICE_KEY);
}

/** Public URL of a stored file; site-relative paths (/seed/…) are kept as they are. */
export function publicFileUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("/") || /^https?:\/\//.test(path)) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;
}
