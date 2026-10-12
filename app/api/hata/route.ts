import { parseClientError } from "@/lib/client-error";
import { allow, callerKey } from "@/lib/rate-limit";

// Errors from visitors' browsers (lib/client-error.ts), written to the server log only.
// Nothing about the visitor is read from the request: no IP, no user agent.

export async function POST(request: Request) {
  // a broken page reports a few errors; a flood is only noise in the log
  if (!allow("hata", callerKey(request.headers), 20, 10 * 60_000)) return new Response(null, { status: 204 });
  const text = await request.text();
  if (text.length > 2000) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const e = parseClientError(body);
  if (!e) return new Response(null, { status: 422 });
  console.warn(`[istemci-hatasi] ${JSON.stringify(e)}`);
  return new Response(null, { status: 204 });
}
