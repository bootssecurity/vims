import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIX = "/admin";
const LOGIN_PATH = "/login";
const SESSION_COOKIE = "vims-session";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE)?.value;

  // Redirect authenticated users away from login page
  if (pathname === LOGIN_PATH && session) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  // Protect /admin and all sub-routes
  if (pathname.startsWith(PROTECTED_PREFIX) && !session) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
