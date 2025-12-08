import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { availableLocales } from "@/lib/locales";
import { rateLimit, getRateLimitIdentifier, getRateLimitTier } from "@/lib/rate-limit";

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

// Define routes excluded from rate limiting (webhooks, health checks, etc.)
const isRateLimitExcluded = createRouteMatcher([
  "/api/webhooks(.*)",
  "/api/health(.*)",
  "/api/cron(.*)",
]);

const proxy = clerkMiddleware(async (auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname;

  // Handle root redirect to default locale
  if (pathname === "/") {
    // For root path, run intlMiddleware and merge with NextResponse.next()
    const intlResponse = intlMiddleware(req);
    if (intlResponse && (intlResponse.status === 307 || intlResponse.status === 308)) {
      return intlResponse;
    }
    // Return next() to allow Clerk headers to be preserved
    const response = NextResponse.next();
    // Copy locale cookies from intlResponse
    if (intlResponse) {
      intlResponse.cookies.getAll().forEach((cookie) => {
        response.cookies.set(cookie.name, cookie.value);
      });
    }
    return response;
  }

  // For API routes, ensure Clerk middleware runs but don't redirect
  // Let the API route handle authentication errors
  // IMPORTANT: Check API routes BEFORE static file checks
  if (pathname.startsWith("/api")) {
    // Skip rate limiting for excluded routes (webhooks, health, cron)
    if (isRateLimitExcluded(req)) {
      return NextResponse.next();
    }

    // Apply rate limiting to API routes with appropriate tier
    const identifier = getRateLimitIdentifier(req);
    const tier = getRateLimitTier(pathname);
    const rateLimitResult = await rateLimit(identifier, tier);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { 
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': Math.ceil((rateLimitResult.reset - Date.now()) / 1000).toString(),
          }
        }
      );
    }

    // Check if it's a public API route (webhooks handled above)
    if (isPublicRoute(req)) {
      const response = NextResponse.next();
      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
      return response;
    }
    
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json(
        { error: 'Unauthenticated' },
        { status: 401 }
      );
    }
    
    // Return successful response with rate limit headers
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
    return response;
  }

  // Handle static files and Next.js internals - let them pass through
  // Most are filtered by matcher, this is a fallback safety check
  if (
    pathname.startsWith("/_next") ||
    pathname.includes("/_next/") ||
    pathname.includes("favicon.ico") ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|map)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // IMPORTANT: Always call auth() FIRST to set up Clerk's auth context
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

  // For page routes, run intlMiddleware to get locale headers/cookies
  const intlResponse = intlMiddleware(req);
  
  // If intlMiddleware returns a redirect (e.g., locale normalization), return it
  if (intlResponse && (intlResponse.status === 307 || intlResponse.status === 308)) {
    return intlResponse;
  }

  // CRITICAL: Return NextResponse.next() to preserve Clerk's auth headers
  // Then copy locale-related cookies from intlResponse
  // This ensures both Clerk auth context AND locale context are preserved
  const response = NextResponse.next();
  
  // Copy locale cookies from intlResponse to preserve locale context
  if (intlResponse) {
    intlResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie.name, cookie.value);
    });
    // Copy any locale-related headers
    const localeHeader = intlResponse.headers.get('x-middleware-request-x-next-intl-locale');
    if (localeHeader) {
      response.headers.set('x-middleware-request-x-next-intl-locale', localeHeader);
    }
  }
  
  return response;
});

// Export as default for Next.js proxy file
export default proxy;

export const config = {
  matcher: [
    // Match all requests except:
    // - _next/* (all Next.js internals including HMR, static, image, etc.)
    // - Static files (images, fonts, etc.)
    // - Locale-prefixed Next.js paths
    "/((?!_next|[a-z]{2}/_next|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|map)$).*)",
  ],
};

