import { NextResponse, type NextRequest } from "next/server";

// First line of defence for the panel: without a session cookie the panel pages
// are not rendered at all (each page also checks the session itself; this is
// only the fast, optimistic check the Next.js docs recommend for proxy).

const SESSION_COOKIE = /^(ormen_panel|sb-.+-auth-token(\.\d+)?)$/;

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.getAll().some((c) => SESSION_COOKIE.test(c.name) && c.value);
  if (hasSession) return NextResponse.next();
  return NextResponse.redirect(new URL("/panel/giris", request.url));
}

export const config = {
  // every panel page except the login page itself
  matcher: ["/panel", "/panel/((?!giris).*)"],
};
