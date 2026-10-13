import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/token";

const AUTH_PAGES = ["/login", "/register", "/forgot", "/reset"];
const APP_PAGES = [
  "/dashboard",
  "/searches",
  "/leads",
  "/enrich",
  "/extract",
  "/pipeline",
  "/templates",
  "/settings",
  "/team",
  "/billing",
  "/admin",
  "/watches",
  "/developers",
  "/outreach",
  "/campaigns",
  "/inbox",
  "/rank",
  "/sites",
  "/help",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  // The home page is open to everyone, signed in or not (it shows a Dashboard button when signed in)

  // Remember who referred this visitor, for when they sign up
  const ref = req.nextUrl.searchParams.get("ref");
  if (ref && /^[A-Z0-9]{6,12}$/.test(ref) && !session) {
    const res = NextResponse.next();
    res.cookies.set("ref", ref, { maxAge: 60 * 60 * 24 * 30, path: "/", sameSite: "lax" });
    return res;
  }

  if (!session && APP_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (session && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  // Lets the app layout know which page is open (for turning features on and off)
  const headers = new Headers(req.headers);
  headers.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/register",
    "/forgot",
    "/reset",
    "/dashboard/:path*",
    "/searches/:path*",
    "/leads/:path*",
    "/enrich/:path*",
    "/extract/:path*",
    "/pipeline/:path*",
    "/templates/:path*",
    "/settings/:path*",
    "/team/:path*",
    "/billing/:path*",
    "/admin/:path*",
    "/watches/:path*",
    "/developers/:path*",
    "/outreach/:path*",
    "/campaigns/:path*",
    "/inbox/:path*",
    "/rank/:path*",
    "/sites/:path*",
    "/help/:path*",
  ],
};
