import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { availableLocales } from "@/lib/locales";
import { rateLimit, getRateLimitIdentifier } from "@/lib/rate-limit";

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

const proxy = clerkMiddleware(async (auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname;

  // Handle root redirect to default locale
  if (pathname === "/") {
    return intlMiddleware(req);
  }

  // For API routes, ensure Clerk middleware runs but don't redirect
  // Let the API route handle authentication errors
  // IMPORTANT: Check API routes BEFORE static file checks
  if (pathname.startsWith("/api")) {
    // Apply rate limiting to all API routes
    try {
      // Get auth result for user identification
      const authResult = await auth();
      
      // Create identifier: prefer user ID if authenticated, otherwise use IP
      const identifier = authResult.userId 
        ? `user:${authResult.userId}` 
        : getRateLimitIdentifier(req);

      // Check rate limit
      const { success, limit, remaining, reset } = await rateLimit(identifier);

      if (!success) {
        // Rate limit exceeded
        const response = NextResponse.json(
          {
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
          },
          { status: 429 }
        );

        // Add rate limit headers (RFC 6585)
        response.headers.set('X-RateLimit-Limit', limit.toString());
        response.headers.set('X-RateLimit-Remaining', remaining.toString());
        response.headers.set('X-RateLimit-Reset', new Date(reset).toISOString());
        
        // Add Retry-After header (seconds until reset)
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);
        response.headers.set('Retry-After', retryAfter.toString());

        return response;
      }

      // Create response with rate limit headers
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', limit.toString());
      response.headers.set('X-RateLimit-Remaining', remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(reset).toISOString());

      // Check if it's a public API route
      if (isPublicRoute(req)) {
        // For public API routes, just pass through - Clerk middleware already ran
        return response;
      }

      if (!authResult.userId) {
        return NextResponse.json(
          { error: 'Unauthenticated' },
          { status: 401 }
        );
      }

      // For protected API routes, ensure auth context is available
      return response;
    } catch (error) {
      // If rate limiting fails, log error but allow request through
      // This prevents rate limiting from breaking the app
      console.error('[RATE_LIMIT_ERROR]', error);
      
      // Check if it's a public API route
      if (isPublicRoute(req)) {
        return NextResponse.next();
      }
      
      const authResult = await auth();
      if (!isPublicRoute(req) && !authResult.userId) {
        return NextResponse.json(
          { error: 'Unauthenticated' },
          { status: 401 }
        );
      }
      return NextResponse.next();
    }
  }

  // Handle static files and Next.js internals - let them pass through
  // Check for Next.js internals (with or without locale prefix)
  const isNextJsStatic = 
    pathname.startsWith("/_next") ||
    pathname.includes("/_next/") ||
    /^\/[a-z]{2}\/_next/.test(pathname) || // Locale-prefixed Next.js paths like /en/_next
    /\/_next\/static/.test(pathname) ||
    /\/_next\/image/.test(pathname) ||
    pathname.includes("favicon.ico") ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$/i.test(pathname);
  
  if (isNextJsStatic) {
    // For static files, bypass intlMiddleware and let Next.js handle them directly
    return NextResponse.next();
  }

  // For page routes, run intlMiddleware FIRST to extract locale and set up context
  // This ensures the locale is properly available in the request/response
  const intlResponse = intlMiddleware(req);
  
  // If intlMiddleware returns a redirect (e.g., locale normalization), return it
  if (intlResponse && (intlResponse.status === 307 || intlResponse.status === 308)) {
    return intlResponse;
  }

  // IMPORTANT: Always call auth() for page routes to set up Clerk's auth context
  // This ensures auth() works in server components and layouts
  // Clerk needs this to detect that clerkMiddleware is being used
  const authResult = await auth();

  // Protect non-public routes for pages
  if (!isPublicRoute(req)) {
    if (!authResult.userId) {
      // Extract locale from pathname or use default
      const pathLocale = pathname.split("/")[1];
      const localeCodes = availableLocales.map((l) => l.code) as readonly ("en" | "el")[];
      const locale: "en" | "el" = (pathLocale && localeCodes.includes(pathLocale as "en" | "el"))
          ? (pathLocale as "en" | "el")
          : "en";
      const signInUrl = new URL(`/${locale}/sign-in`, req.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Return the intlMiddleware response which has the locale context set up
  return intlResponse || NextResponse.next();
});

// Export as default for Next.js proxy file
export default proxy;

export const config = {
  matcher: [
    // Match all requests except internal/static assets and locale-prefixed Next.js internals
    "/((?!_next/static|_next/image|favicon\\.ico|[a-z]{2}/_next|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)$).*)",
  ],
};

