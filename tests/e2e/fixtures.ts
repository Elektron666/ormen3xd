import { test as base, expect } from "@playwright/test";

// Every browser test also guards the Content Security Policy (gece toplantısı, 12 Oct):
// anything the policy blocks in any flow (a texture, a worker, the AR viewer, a panel
// upload) is a failure, not a silent hole in the page.
export const test = base.extend<{ cspGuard: void }>({
  cspGuard: [
    async ({ context }, use) => {
      const violations: string[] = [];
      await context.exposeBinding("__ormenCsp", (_source, v: string) => {
        violations.push(v);
      });
      await context.addInitScript(() => {
        document.addEventListener("securitypolicyviolation", (e) => {
          (window as unknown as { __ormenCsp?: (v: string) => void }).__ormenCsp?.(`${e.effectiveDirective} ${e.blockedURI} (${location.pathname})`);
        });
      });
      await use();
      expect(violations, "İçerik güvenlik politikası ihlali").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
