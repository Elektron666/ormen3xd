import { getRepository } from "@/lib/data";
import { parseEvent } from "@/lib/events";

// Anonymous usage events from the configurator (sent with sendBeacon).
// Nothing about the visitor is read from the request: no IP, no user agent.

/** ORMEN's own staff (signed in to the panel) are not counted. Presence of the cookie is enough. */
function fromPanelUser(request: Request): boolean {
  const cookie = request.headers.get("cookie") ?? "";
  return /(?:^|;\s*)(ormen_panel=|sb-[^=]*-auth-token)/.test(cookie);
}

export async function POST(request: Request) {
  if (fromPanelUser(request)) return new Response(null, { status: 204 });
  const text = await request.text();
  if (text.length > 1000) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  const e = parseEvent(body);
  if (!e) return new Response(null, { status: 422 });
  try {
    await getRepository().recordEvent(e);
  } catch {
    // analytics must never break the site
  }
  return new Response(null, { status: 204 });
}
