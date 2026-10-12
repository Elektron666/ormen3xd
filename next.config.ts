import type { NextConfig } from "next";

// Content Security Policy (gece toplantısı, 12 Oct). Scripts only from this site (Next's
// own inline bootstrap needs 'unsafe-inline'; a nonce would make every page dynamic), so an
// injected <script src> from elsewhere does not run; the page talks only to this site and
// Supabase, so data cannot be sent anywhere else. 'wasm-unsafe-eval': the Draco decoder
// for GLB models; blob: workers: the same decoder. Development also needs 'unsafe-eval'.
const supabase = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
  } catch {
    return "";
  }
})();
const dev = process.env.NODE_ENV === "development";
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`.trim(),
  `media-src 'self' blob: ${supabase}`.trim(),
  "font-src 'self' data:",
  `connect-src 'self' blob: data: ${supabase}`.trim(),
  "worker-src 'self' blob:",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // always https once seen (two years); not preloaded, so it can still be undone
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // AR (WebXR) needs xr-spatial-tracking; nothing here uses the microphone or location
          { key: "Permissions-Policy", value: "microphone=(), geolocation=(), xr-spatial-tracking=(self)" },
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
      {
        // The panel and its APIs must never load inside another site's frame.
        // Public pages (/, /f/…, /p/…) stay embeddable: firms may put the configurator on their own site.
        source: "/panel/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
        ],
      },
      {
        source: "/api/panel/:path*",
        headers: [{ key: "X-Frame-Options", value: "DENY" }],
      },
    ];
  },
};

export default nextConfig;
