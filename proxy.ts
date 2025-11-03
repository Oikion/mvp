import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { availableLocales } from "@/lib/locales";

// Configure next-intl middleware for locale routing
const intlMiddleware = createMiddleware({
  locales: availableLocales.map((l) => l.code),
  defaultLocale: "en",
  localePrefix: "always",
});

// Define public routes that don't require authentication
// Note: SSO callbacks are handled automatically by Clerk's virtual routing
const isPublicRoute = createRouteMatcher([
  "/:locale/sign-in(.*)",
  "/:locale/sign-up(.*)",
  "/:locale/register(.*)",
  "/api/webhooks(.*)",
]);

export const proxy = clerkMiddleware(async (auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname;

  // Handle root redirect to default locale
  if (pathname === "/") {
    return intlMiddleware(req);
  }

  // For API routes, ensure Clerk middleware runs but don't redirect
  // Let the API route handle authentication errors
  // IMPORTANT: Check API routes BEFORE static file checks
  if (pathname.startsWith("/api")) {
    // Check if it's a public API route
    if (isPublicRoute(req)) {
      // For public API routes, just pass through - Clerk middleware already ran
      return NextResponse.next();
    }
    // For protected API routes, ensure auth context is available
    // Clerk middleware will set up the auth context, but we don't redirect here
    // The API route handler will check auth and return appropriate errors
    await auth();
    // Note: We don't check authResult.userId here - let the API route handle it
    // This ensures Clerk's auth() function works in API routes
    return NextResponse.next();
  }

  // Handle static files and Next.js internals - let them pass through
  // Apply intlMiddleware first to set up locale context
  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return intlMiddleware(req);
  }

  // For page routes, run intlMiddleware FIRST to extract locale and set up context
  // This ensures the locale is properly available in the request/response
  const intlResponse = intlMiddleware(req);
  
  // If intlMiddleware returns a redirect (e.g., locale normalization), return it
  if (intlResponse && (intlResponse.status === 307 || intlResponse.status === 308)) {
    return intlResponse;
  }

  // Protect non-public routes for pages
  if (!isPublicRoute(req)) {
    const authResult = await auth();

    if (!authResult.userId) {
      // Extract locale from pathname or use default
      const availableLocaleCodes = availableLocales.map((l) => l.code);
      const locale =
        pathname.split("/")[1] && availableLocaleCodes.includes(pathname.split("/")[1])
          ? pathname.split("/")[1]
          : "en";
      const signInUrl = new URL(`/${locale}/sign-in`, req.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Return the intlMiddleware response which has the locale context set up
  return intlResponse || NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

