import { clerkMiddleware, createRouteMatcher, clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { availableLocales } from "@/lib/locales";
import { rateLimit, getRateLimitIdentifier, getRateLimitTier } from "@/lib/rate-limit";

// Configure next-intl middleware for locale routing
const intlMiddleware = createMiddleware({
  locales: availableLocales.map((l) => l.code),
  defaultLocale: "el", // Greek as default
  localePrefix: "always",
});

// Define public routes that don't require authentication
// Website routes (root, legal, public profiles) are always public
// App auth routes (sign-in, register) are also public
const isPublicRoute = createRouteMatcher([
  // Website routes (public)
  "/:locale",
  "/:locale/legal(.*)",
  "/:locale/agent(.*)",
  "/:locale/property(.*)",
  // App auth routes (public) - includes SSO callbacks
  "/:locale/app/sign-in(.*)",
  "/:locale/app/sign-up(.*)",
  "/:locale/app/register(.*)",
  "/:locale/app/forgot-password(.*)",
  "/:locale/app/inactive(.*)",
  "/:locale/app/pending(.*)",
  // API webhooks (public)
  "/api/webhooks(.*)",
]);

// Define Clerk organization routes that should redirect to custom onboarding
// This skips Clerk's built-in organization creation flow
const isClerkOrgRoute = createRouteMatcher([
  "/:locale/app/register/tasks/choose-organization(.*)",
  "/:locale/app/sign-up/tasks/choose-organization(.*)",
  "/:locale/app/sign-in/tasks/choose-organization(.*)",
  "/:locale/app/create-organization(.*)",
]);

// Define routes excluded from rate limiting (webhooks, health checks, etc.)
const isRateLimitExcluded = createRouteMatcher([
  "/api/webhooks(.*)",
  "/api/health(.*)",
  "/api/cron(.*)",
]);

// Define external API routes that use API key authentication instead of Clerk
// These routes are for external integrations (n8n, Make.com, webhooks, etc.)
const isExternalApiRoute = createRouteMatcher([
  "/api/v1(.*)",
]);

// Define platform admin routes that require special admin privileges
// These routes are ONLY accessible to users with isPlatformAdmin: true in Clerk metadata
const isPlatformAdminRoute = createRouteMatcher([
  "/:locale/app/platform-admin(.*)",
  "/api/platform-admin(.*)",
]);

// Access denied page should NOT require admin status (to avoid infinite redirect)
const isPlatformAdminAccessDenied = createRouteMatcher([
  "/:locale/app/platform-admin/access-denied(.*)",
]);

// Define app routes that require authentication (everything under /app except auth pages)
const isAppRoute = createRouteMatcher([
  "/:locale/app(.*)",
]);


/**
 * Check if user is a platform admin
 * Checks env-based admin emails and Clerk privateMetadata.isPlatformAdmin flag
 */
async function checkPlatformAdmin(userId: string): Promise<boolean> {
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    const userEmail = user.emailAddresses?.[0]?.emailAddress?.toLowerCase().trim();

    if (userEmail) {
      // Production admin emails (always checked)
      const prodAdminEmails = process.env.PLATFORM_ADMIN_EMAILS;
      if (prodAdminEmails) {
        const adminEmailList = prodAdminEmails
          .replace(/"/g, "")
          .split(",")
          .map(e => e.toLowerCase().trim());
        
        if (adminEmailList.includes(userEmail)) {
          return true;
        }
      }

      // Development bypass (disabled in production)
      if (process.env.NODE_ENV !== "production") {
        const devAdminEmails = process.env.PLATFORM_ADMIN_DEV_EMAILS;
        if (devAdminEmails) {
          const devEmailList = devAdminEmails
            .replace(/"/g, "")
            .split(",")
            .map(e => e.toLowerCase().trim());
          
          if (devEmailList.includes(userEmail)) {
            return true;
          }
        }
      }
    }
    
    // Check Clerk privateMetadata (more secure than publicMetadata)
    return user.privateMetadata?.isPlatformAdmin === true;
  } catch (error) {
    console.error("[PLATFORM_ADMIN_MIDDLEWARE_CHECK]", error);
    return false;
  }
}

const isDev = process.env.NODE_ENV === 'development';

const proxy = clerkMiddleware(async (auth, req: NextRequest) => {
  const pathname = req.nextUrl.pathname;

  // ============================================
  // DEVELOPMENT FAST PATH
  // Skip middleware for HMR/Turbopack paths to improve hot refresh speed
  // ============================================
  if (isDev && (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/__nextjs') ||
    pathname.includes('/_next/') ||
    pathname.includes('/__nextjs_')
  )) {
    return NextResponse.next();
  }

  // ============================================
  // ROUTE STRUCTURE:
  // - Website: /:locale/ (landing, legal, public pages)
  // - App: /:locale/app/ (dashboard, CRM, MLS, auth, etc.)
  // ============================================

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

  // Intercept Clerk's organization creation routes and redirect to custom onboarding
  // This skips Clerk's built-in organization flow in favor of our custom one
  if (isClerkOrgRoute(req)) {
    const pathLocale = pathname.split("/")[1];
    const localeCodes = availableLocales.map((l) => l.code) as readonly ("en" | "el")[];
    const locale: "en" | "el" = (pathLocale && localeCodes.includes(pathLocale as "en" | "el"))
      ? (pathLocale as "en" | "el")
      : "el";
    const onboardUrl = new URL(`/${locale}/app/onboard`, req.url);
    return NextResponse.redirect(onboardUrl);
  }

  // PLATFORM ADMIN ROUTE PROTECTION
  // Check platform-admin routes BEFORE other route checks
  // These routes require special admin privileges beyond normal authentication
  // EXCEPTION: access-denied page must be accessible to non-admins (to show the error)
  if (isPlatformAdminRoute(req) && !isPlatformAdminAccessDenied(req)) {
    const authResult = await auth();
    
    // Must be authenticated first
    if (!authResult.userId) {
      const pathLocale = pathname.split("/")[1];
      const localeCodes = availableLocales.map((l) => l.code) as readonly ("en" | "el")[];
      const locale: "en" | "el" = (pathLocale && localeCodes.includes(pathLocale as "en" | "el"))
        ? (pathLocale as "en" | "el")
        : "el";
      const signInUrl = new URL(`/${locale}/app/sign-in`, req.url);
      return NextResponse.redirect(signInUrl);
    }
    
    // Check if user is a platform admin
    const isAdmin = await checkPlatformAdmin(authResult.userId);
    
    if (!isAdmin) {
      // For API routes, return 403 JSON response
      if (pathname.startsWith("/api/platform-admin")) {
        return NextResponse.json(
          { 
            error: 'Forbidden',
            message: 'Platform admin access required'
          },
          { status: 403 }
        );
      }
      
      // For page routes, redirect to access denied page
      const pathLocale = pathname.split("/")[1];
      const localeCodes = availableLocales.map((l) => l.code) as readonly ("en" | "el")[];
      const locale: "en" | "el" = (pathLocale && localeCodes.includes(pathLocale as "en" | "el"))
        ? (pathLocale as "en" | "el")
        : "el";
      
      // Redirect to home with access denied message
      // The platform admin pages will handle showing proper access denied UI
      const accessDeniedUrl = new URL(`/${locale}/app/platform-admin/access-denied`, req.url);
      return NextResponse.redirect(accessDeniedUrl);
    }
    
    // Admin verified - apply strict rate limiting for admin API routes
    if (pathname.startsWith("/api/platform-admin")) {
      const identifier = getRateLimitIdentifier(req);
      const rateLimitResult = await rateLimit(identifier, 'strict');
      
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
      
      const response = NextResponse.next();
      response.headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
      return response;
    }
    
    // For platform admin page routes, continue to intl middleware
    const intlResponse = intlMiddleware(req);
    if (intlResponse && (intlResponse.status === 307 || intlResponse.status === 308)) {
      return intlResponse;
    }
    
    const response = NextResponse.next();
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

    // EXTERNAL API ROUTES (/api/v1/*) - Use API key authentication
    // These routes skip Clerk auth and handle their own authentication via API keys
    // Rate limiting is handled within the route handlers using the 'api' tier
    if (isExternalApiRoute(req)) {
      // Let the route handler manage authentication and rate limiting
      // The external-api-middleware handles API key validation and rate limiting
      const response = NextResponse.next();
      // Add CORS headers for external API access
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Webhook-Signature, X-Webhook-Timestamp');
      response.headers.set('Access-Control-Max-Age', '86400');
      
      // Handle preflight OPTIONS requests
      if (req.method === 'OPTIONS') {
        return new NextResponse(null, { status: 204, headers: response.headers });
      }
      
      return response;
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

  // Protect app routes that aren't public (require authentication)
  // Website routes are always public (handled by isPublicRoute)
  if (isAppRoute(req) && !isPublicRoute(req)) {
    if (!authResult.userId) {
      // Extract locale from pathname or use default (Greek)
      const pathLocale = pathname.split("/")[1];
      const localeCodes = availableLocales.map((l) => l.code) as readonly ("en" | "el")[];
      const locale: "en" | "el" = (pathLocale && localeCodes.includes(pathLocale as "en" | "el"))
          ? (pathLocale as "en" | "el")
          : "el";
      const signInUrl = new URL(`/${locale}/app/sign-in`, req.url);
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
    // - _next/* (all Next.js internals including HMR, static, images, etc.)
    // - __nextjs_* (Next.js internal routes for HMR/Turbopack)
    // - Static files (images, fonts, etc.)
    // - Locale-prefixed Next.js paths
    // 
    // IMPORTANT: The negative lookahead must be comprehensive to avoid
    // middleware running on HMR/hot-reload paths which would slow down development
    "/((?!_next|__nextjs|[a-z]{2}/_next|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot|map|json)$).*)",
  ],
};

