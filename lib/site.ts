// Absolute base address of the site: the real domain once it is set, otherwise
// the address Vercel gives the deployment, otherwise the local dev server.

export function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/** True once the real domain is configured (printed QR codes should wait for it). */
export function siteUrlIsFinal(): boolean {
  return !!process.env.NEXT_PUBLIC_SITE_URL;
}

/** Public paths a QR code may point to: a firm page or one of its models. */
export const FIRM_PATH = /^\/f\/[a-z0-9-]{2,60}(\/[a-z0-9-]{2,60})?$/;
