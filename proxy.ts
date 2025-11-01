import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";

// Configure next-intl middleware for locale routing
const intlMiddleware = createMiddleware({
  locales: ["en"],
  defaultLocale: "en",
  localePrefix: "always",
});

// Define public routes that don't require authentication
const isPublicRoute = createRouteMatcher([
  "/:locale/sign-in(.*)",
  "/:locale/sign-up(.*)",
  "/:locale/register(.*)",
  "/:locale/sso-callback(.*)",
  "/api/webhooks(.*)",
]);

export const proxy = clerkMiddleware(async (auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname;

  // Skip API routes and static files - let them pass through
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return intlMiddleware(req);
  }

  // Handle root redirect to default locale
  if (pathname === "/") {
    return intlMiddleware(req);
  }

  // Protect non-public routes
  if (!isPublicRoute(req)) {
    const authResult = await auth();

    if (!authResult.userId) {
      // Extract locale from pathname or use default
      const locale =
        pathname.split("/")[1] && ["en"].includes(pathname.split("/")[1])
          ? pathname.split("/")[1]
          : "en";
      const signInUrl = new URL(`/${locale}/sign-in`, req.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Apply next-intl middleware for locale routing
  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};

