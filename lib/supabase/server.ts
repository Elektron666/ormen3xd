import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, SUPABASE_URL } from "./config";

let service: SupabaseClient | undefined;

/**
 * Server-only client with the service role. Used after the app has checked
 * the panel session itself; never sent to the browser.
 */
export function serviceClient(): SupabaseClient {
  if (!service) service = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return service;
}

/** Client bound to the visitor's auth cookies (sign in / sign out / who am I). */
export async function sessionClient(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          /* called from a Server Component: cookies are read-only there, the refresh happens on the next action */
        }
      },
    },
  });
}
