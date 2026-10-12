import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseEnabled } from "@/lib/supabase/config";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { serviceClient, sessionClient } from "@/lib/supabase/server";

// Panel sign-in. With Supabase configured, Supabase Auth (email + password,
// no sign-up screen; users are added in the Supabase dashboard and need a row
// in `profiles`). Without Supabase (demo / local), one panel user defined by
// PANEL_DEMO_EMAIL / PANEL_DEMO_PASSWORD with a signed cookie session.

export type { PanelAccess, PanelUser } from "./access";
import { decideAccess, type PanelAccess, type PanelUser } from "./access";

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

/**
 * Key that signs the demo session cookie. In production it must be set
 * (PANEL_SESSION_SECRET, at least 32 characters); without it demo login is
 * off and no cookie is accepted, so a cookie can never be forged with a
 * guessable key. Locally a fixed development key is used.
 */
function secret(): string | null {
  const s = process.env.PANEL_SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV !== "production") return "ormen-yalnizca-gelistirme-anahtari-uretimde-kullanilmaz";
  return null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** Demo login is available only with credentials and a signing key. */
function demoSetup(): { email: string; password: string; key: string } | null {
  const creds = demoCredentials();
  const key = secret();
  return creds && key ? { ...creds, key } : null;
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function panelLoginAvailable(): boolean {
  return supabaseEnabled() || demoSetup() !== null;
}

export async function signIn(email: string, password: string): Promise<{ ok: true; needsCode?: boolean } | { ok: false; error: string }> {
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
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    return { ok: true, needsCode: aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2" };
  }
  const demo = demoSetup();
  if (!demo) return { ok: false, error: "Panel girişi henüz ayarlanmadı (bkz. README)." };
  if (!safeEqual(cleanEmail, demo.email.toLowerCase()) || !safeEqual(password, demo.password)) return { ok: false, error: "E-posta ya da şifre hatalı." };
  const payload = Buffer.from(JSON.stringify({ e: demo.email, x: Date.now() + 7 * DAY * 1000 })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload, demo.key)}`, {
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

export async function panelAccess(): Promise<PanelAccess> {
  if (supabaseEnabled()) {
    const sb = await sessionClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return { state: "yok" };
    const [{ data: profile }, { data: aal }] = await Promise.all([
      serviceClient().from("profiles").select("id").eq("id", data.user.id).maybeSingle(),
      sb.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    return decideAccess({
      email: data.user.email ?? "",
      isPanelUser: !!profile,
      currentLevel: aal?.currentLevel ?? null,
      nextLevel: aal?.nextLevel ?? null,
      require2fa: twoFactorRequired(),
    });
  }
  const demo = await demoUser();
  return demo ? { state: "tamam", user: demo } : { state: "yok" };
}

/**
 * Pilot day (11 Oct meeting): with PANEL_2FA_ZORUNLU=1 every panel account must
 * use two-step verification; one without it can only reach the Güvenlik page.
 */
export function twoFactorRequired(): boolean {
  return supabaseEnabled() && process.env.PANEL_2FA_ZORUNLU === "1";
}

/** Like getPanelUser, but also an account that still has to set up two-step verification (Güvenlik page). */
export async function getSetupUser(): Promise<PanelUser | null> {
  const a = await panelAccess();
  return a.state === "tamam" || a.state === "kurulum" ? a.user : null;
}

/** The panel user of a fully signed-in session (both steps when two-step verification is on). */
export async function getPanelUser(): Promise<PanelUser | null> {
  const a = await panelAccess();
  return a.state === "tamam" ? a.user : null;
}

async function demoUser(): Promise<PanelUser | null> {
  const demo = demoSetup();
  if (!demo) return null;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload, demo.key))) return null;
  try {
    const { e, x } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { e: string; x: number };
    if (Date.now() > x || e.toLowerCase() !== demo.email.toLowerCase()) return null;
    return { email: e, mode: "demo" };
  } catch {
    return null;
  }
}

/** For pages and actions: the signed-in panel user, or a redirect to the login page (or to the code step). */
export async function requirePanelUser(opts: { setup?: boolean } = {}): Promise<PanelUser> {
  const a = await panelAccess();
  if (a.state === "ikinci-adim") redirect("/panel/giris/dogrulama");
  if (a.state === "yok") redirect("/panel/giris");
  // two-step verification required but not set up: only the Güvenlik page (and the layout around it)
  if (a.state === "kurulum" && !opts.setup) redirect("/panel/guvenlik");
  return a.user;
}

// ---------------------------------------------------------------- two-step verification (TOTP)

const CODE = /^\d{6}$/;
const tr = (m: string | undefined) =>
  !m ? "İşlem yapılamadı." : /invalid|expired|code/i.test(m) ? "Kod hatalı ya da süresi geçti; uygulamadaki yeni kodu yazın." : "İşlem yapılamadı; biraz sonra tekrar deneyin.";

async function verifiedTotp(sb: Awaited<ReturnType<typeof sessionClient>>) {
  const { data } = await sb.auth.mfa.listFactors();
  return data?.totp?.[0] ?? null;
}

/** Second step of the login: the 6-digit code from the authenticator app. */
export async function verifyLoginCode(code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabaseEnabled()) return { ok: false, error: "İki adımlı doğrulama yalnızca Supabase ile çalışır." };
  if (!CODE.test(code.trim())) return { ok: false, error: "Uygulamadaki 6 haneli kodu yazın." };
  const sb = await sessionClient();
  const factor = await verifiedTotp(sb);
  if (!factor) return { ok: false, error: "Bu hesapta iki adımlı doğrulama açık değil." };
  const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
  return error ? { ok: false, error: tr(error.message) } : { ok: true };
}

/** Starts turning it on: a QR code for the app and the same key as text. Leftover unfinished attempts are cleared first. */
export async function startTwoFactor(): Promise<{ ok: true; factorId: string; qr: string; secret: string } | { ok: false; error: string }> {
  if (!supabaseEnabled()) return { ok: false, error: "İki adımlı doğrulama yalnızca Supabase ile çalışır." };
  if (!(await getSetupUser())) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  const sb = await sessionClient();
  const { data: list } = await sb.auth.mfa.listFactors();
  for (const f of list?.all ?? []) if (f.factor_type === "totp" && f.status !== "verified") await sb.auth.mfa.unenroll({ factorId: f.id });
  const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: `ORMEN panel ${new Date().toISOString().slice(0, 10)}`, issuer: "ORMEN Atelier" });
  if (error || !data) return { ok: false, error: tr(error?.message) };
  return { ok: true, factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret };
}

/** Finishes turning it on with the first code the app shows. */
export async function confirmTwoFactor(factorId: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(await getSetupUser())) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (!CODE.test(code.trim())) return { ok: false, error: "Uygulamadaki 6 haneli kodu yazın." };
  const { error } = await (await sessionClient()).auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
  return error ? { ok: false, error: tr(error.message) } : { ok: true };
}

/** Turns it off; asks for a current code so a forgotten open session cannot do it alone. */
export async function disableTwoFactor(code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getPanelUser();
  if (!user?.twoFactor) return { ok: false, error: "İki adımlı doğrulama zaten kapalı." };
  if (twoFactorRequired()) return { ok: false, error: "İki adımlı doğrulama zorunlu; kapatılamaz." };
  if (!CODE.test(code.trim())) return { ok: false, error: "Uygulamadaki 6 haneli kodu yazın." };
  const sb = await sessionClient();
  const factor = await verifiedTotp(sb);
  if (!factor) return { ok: false, error: "İki adımlı doğrulama zaten kapalı." };
  const check = await sb.auth.mfa.challengeAndVerify({ factorId: factor.id, code: code.trim() });
  if (check.error) return { ok: false, error: tr(check.error.message) };
  const { error } = await sb.auth.mfa.unenroll({ factorId: factor.id });
  return error ? { ok: false, error: tr(error.message) } : { ok: true };
}

export const PASSWORD_MIN = 10;

/** Changes the password after checking the current one (on a separate, throwaway client: the panel session is untouched). */
export async function changePassword(current: string, next: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabaseEnabled()) return { ok: false, error: "Şifre değiştirme yalnızca Supabase ile çalışır; demo şifresi ortam değişkeninden gelir." };
  const user = await getSetupUser();
  if (!user) return { ok: false, error: "Oturum süresi doldu. Yeniden giriş yapın." };
  if (next.length < PASSWORD_MIN) return { ok: false, error: `Yeni şifre en az ${PASSWORD_MIN} karakter olmalı.` };
  if (next === current) return { ok: false, error: "Yeni şifre eskisiyle aynı." };
  const probe = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: wrong } = await probe.auth.signInWithPassword({ email: user.email, password: current });
  if (wrong) return { ok: false, error: "Şu anki şifre hatalı." };
  await probe.auth.signOut({ scope: "local" });
  const { error } = await (await sessionClient()).auth.updateUser({ password: next });
  return error ? { ok: false, error: /weak|short|pwned|leak/i.test(error.message) ? "Bu şifre zayıf ya da sızdırılmış bir şifre listesinde; başka bir şifre seçin." : "Şifre değiştirilemedi." } : { ok: true };
}
