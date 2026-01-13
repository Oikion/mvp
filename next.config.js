const withNextIntl = require("next-intl/plugin")(
  // This is the default (also the `src` folder is supported out of the box)
  "./i18n.ts"
);

const isDev = process.env.NODE_ENV === "development";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // App structure:
  // - Website at /:locale/ (landing, legal, public pages)
  // - Application at /:locale/app/ (dashboard, CRM, MLS, auth, etc.)
  outputFileTracingRoot: __dirname,
  // Performance optimizations for dev mode
  experimental: {
    // Enable Turbopack file system cache - CRITICAL for fast subsequent startups
    // This persists the cache between dev server restarts, dramatically reducing startup time
    turbopackFileSystemCacheForDev: true,
    
    // Optimize package imports - reduces bundle size and compilation time
    // This tree-shakes unused exports from large packages, significantly reducing compilation overhead
    //
    // IMPORTANT: In Next.js 16 + Turbopack, this can add noticeable up-front work during `next dev`.
    // Keep it for production builds, but disable it in dev to improve startup time.
    optimizePackageImports: isDev
      ? undefined
      : [
      // Radix UI components - heavily used throughout the app
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-hover-card",
      "@radix-ui/react-icons",
      "@radix-ui/react-label",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
      // Large icon libraries
      "lucide-react",
      // Date utilities
      "date-fns",
      // Chart library
      "recharts",
    ],
  },
  
  // TypeScript optimization - skip type checking during dev (faster startup)
  // Type checking is still done via lint command and CI
  typescript: {
    ignoreBuildErrors: false, // Keep false for production builds
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "images.clerk.dev",
      },
    ],
  },
  // Redirects for route migrations
  async redirects() {
    return [
      // MLS routes migration: /mls/properties -> /mls
      {
        source: "/:locale/app/mls/properties",
        destination: "/:locale/app/mls",
        permanent: true,
      },
      // CRM routes migration: /crm/clients -> /crm
      {
        source: "/:locale/app/crm/clients",
        destination: "/:locale/app/crm",
        permanent: true,
      },
      // Import page redirects
      {
        source: "/:locale/app/mls/properties/import",
        destination: "/:locale/app/mls/import",
        permanent: true,
      },
      {
        source: "/:locale/app/crm/clients/import",
        destination: "/:locale/app/crm/import",
        permanent: true,
      },
    ];
  },
  // Security headers for Clerk bot protection (CAPTCHA)
  // Note: Clerk uses two domain patterns:
  // - API domain: *.clerk.accounts.dev
  // - Account Portal: *.accounts.clerk.dev
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.accounts.clerk.dev https://clerk.oikion.com https://challenges.cloudflare.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://*.clerk.accounts.dev https://*.accounts.clerk.dev https://clerk.oikion.com https://img.clerk.com https://images.clerk.dev https://lh3.googleusercontent.com https://res.cloudinary.com",
              "font-src 'self' data:",
              "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.accounts.clerk.dev https://clerk.oikion.com https://accounts.oikion.com",
              "connect-src 'self' https://*.clerk.accounts.dev https://*.accounts.clerk.dev https://clerk.oikion.com https://accounts.oikion.com https://challenges.cloudflare.com wss://*.clerk.accounts.dev wss://*.accounts.clerk.dev",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
