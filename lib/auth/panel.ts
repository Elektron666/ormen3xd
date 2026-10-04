import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseEnabled } from "@/lib/supabase/config";
import { serviceClient, sessionClient } from "@/lib/supabase/server";

// Panel sign-in. With Supabase configured, Supabase Auth (email + password,
// no sign-up screen; users are added in the Supabase dashboard and need a row
// in `profiles`). Without Supabase (demo / local), one panel user defined by
// PANEL_DEMO_EMAIL / PANEL_DEMO_PASSWORD with a signed cookie session.

export interface PanelUser {
  email: string;
  mode: "supabase" | "demo";
}

const COOKIE = "ormen_panel";
const DAY = 24 * 60 * 60;

function demoCredentials(): { email: string; password: string } | null {
  const email = process.env.PANEL_DEMO_EMAIL;
  const password = process.env.PANEL_DEMO_PASSWORD;
  if (email && password) return { email, password };
  // convenience for local development only
  if (process.env.NODE_ENV !== "production") return { email: "demo@ormen.local", password: "ormen-demo" };
  return null;
}

function secret(): string {
  return process.env.PANEL_SESSION_SECRET || demoCredentials()?.password || "unset";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function panelLoginAvailable(): boolean {
  return supabaseEnabled() || demoCredentials() !== null;
}

export async function signIn(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (supabaseEnabled()) {
    const sb = await sessionClient();
    const { data, error } = await sb.auth.signInWithPassword({ email: cleanEmail, password });
    if (error || !data.user) return { ok: false, error: "E-posta ya da şifre hatalı." };
    const { data: profile } = await serviceClient().from("profiles").select("id").eq("id", data.user.id).maybeSingle();
    if (!profile) {
      await sb.auth.signOut();
      return { ok: false, error: "Bu hesabın panel yetkisi yok." };
    }
    return { ok: true };
  }
  const demo = demoCredentials();
  if (!demo) return { ok: false, error: "Panel girişi henüz ayarlanmadı (bkz. README)." };
  if (!safeEqual(cleanEmail, demo.email.toLowerCase()) || !safeEqual(password, demo.password)) return { ok: false, error: "E-posta ya da şifre hatalı." };
  const payload = Buffer.from(JSON.stringify({ e: demo.email, x: Date.now() + 7 * DAY * 1000 })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 7 * DAY,
  });
  return { ok: true };
}

export async function signOut(): Promise<void> {
  if (supabaseEnabled()) await (await sessionClient()).auth.signOut();
  (await cookies()).delete(COOKIE);
}

export async function getPanelUser(): Promise<PanelUser | null> {
  if (supabaseEnabled()) {
    const { data } = await (await sessionClient()).auth.getUser();
    if (!data.user) return null;
    const { data: profile } = await serviceClient().from("profiles").select("id").eq("id", data.user.id).maybeSingle();
    return profile ? { email: data.user.email ?? "", mode: "supabase" } : null;
  }
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { e: string; x: number };
    if (Date.now() > x) return null;
    return { email: e, mode: "demo" };
  } catch {
    return null;
  }
}

/** For pages and actions: the signed-in panel user, or a redirect to the login page. */
export async function requirePanelUser(): Promise<PanelUser> {
  const user = await getPanelUser();
  if (!user) redirect("/panel/giris");
  return user;
}
