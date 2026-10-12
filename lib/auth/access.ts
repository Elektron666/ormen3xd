// Who may use the panel, as a pure decision (no Supabase, no cookies), so it
// can be tested on its own. lib/auth/panel.ts feeds it the session's facts.

export interface PanelUser {
  email: string;
  mode: "supabase" | "demo";
  /** Two-step verification (TOTP) is on for this account and this session passed it. */
  twoFactor?: boolean;
}

/**
 * Where a session stands: no panel user, a user who has passed the password
 * but still owes the code from the authenticator app, or a full panel user.
 */
export type PanelAccess =
  | { state: "yok" }
  | { state: "ikinci-adim"; email: string }
  /** Two-step verification is required (pilot day) and this account has not set it up: Güvenlik page only. */
  | { state: "kurulum"; user: PanelUser }
  | { state: "tamam"; user: PanelUser };

/** The decision itself, without Supabase (tested on its own). */
export function decideAccess(a: { email: string | null; isPanelUser: boolean; currentLevel: string | null; nextLevel: string | null; require2fa?: boolean }): PanelAccess {
  if (!a.email || !a.isPanelUser) return { state: "yok" };
  // once a verified TOTP factor exists, the session must have passed it
  if (a.nextLevel === "aal2" && a.currentLevel !== "aal2") return { state: "ikinci-adim", email: a.email };
  const user: PanelUser = { email: a.email, mode: "supabase", twoFactor: a.currentLevel === "aal2" };
  // no factor yet, but the panel requires one: set it up before anything else
  if (a.require2fa && !user.twoFactor) return { state: "kurulum", user };
  return { state: "tamam", user };
}
