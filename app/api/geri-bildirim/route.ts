import { getRepository } from "@/lib/data";
import { parseFeedback } from "@/lib/feedback";
import { allow, callerKey } from "@/lib/rate-limit";

// Visitor feedback. Nothing about the visitor is stored (see lib/feedback.ts).
export async function POST(request: Request) {
  if (!allow("geri-bildirim", callerKey(request.headers), 5, 10 * 60_000)) return Response.json({ error: "Çok sık gönderildi; biraz sonra tekrar deneyin." }, { status: 429 });
  const text = await request.text();
  if (text.length > 4000) return Response.json({ error: "Mesaj çok uzun." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const parsed = parseFeedback(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 422 });
  try {
    await getRepository().recordFeedback(parsed.value);
  } catch {
    return Response.json({ error: "Şu an kaydedilemedi; biraz sonra tekrar deneyin." }, { status: 503 });
  }
  return Response.json({ ok: true });
}
