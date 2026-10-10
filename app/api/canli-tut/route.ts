import { cronAllowed } from "@/lib/keepalive";
import { supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient } from "@/lib/supabase/server";

// Daily from Vercel (vercel.json → crons): one light read so Supabase does not pause.
export async function GET(request: Request) {
  if (!cronAllowed(request.headers.get("authorization"), process.env.CRON_SECRET)) return new Response(null, { status: 401 });
  if (!supabaseEnabled()) return Response.json({ ok: true, db: "yok" });
  const { error } = await serviceClient().from("fabrics").select("id").limit(1);
  return Response.json({ ok: !error, db: error ? "hata" : "uyanık" }, { status: error ? 503 : 200 });
}
