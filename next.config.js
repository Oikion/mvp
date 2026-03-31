const withNextIntl = require("next-intl/plugin")(
  // This is the default (also the `src` folder is supported out of the box)
  "./i18n.ts"
);

const isDev = process.env.NODE_ENV === "development";
const useTurbopack = process.env.NEXT_TURBOPACK === "1";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // App structure:
  // - Website at /:locale/ (landing, legal, public pages)
  // - Application at /:locale/app/ (dashboard, CRM, MLS, auth, etc.)
  outputFileTracingRoot: __dirname,

  // Force-include files that are missed by output file tracing.
  // Fixes production runtime crash:
  //   Cannot find module '../data/patch.json' (css-tree, via svgo)
  // Root cause: css-tree loads JSON via createRequire(), which static tracing can miss.
  outputFileTracingIncludes: {
    "/*": [
      // pnpm layout
      "./node_modules/.pnpm/css-tree@*/node_modules/css-tree/data/*.json",
      // non-pnpm / future layouts
      "./node_modules/css-tree/data/*.json",
    ],
  },
  
  // Server external packages - packages that should be resolved from node_modules
  // rather than bundled. This is needed for packages with native dependencies
  // or that have different node/browser builds.
  serverExternalPackages: [
    "ably",
    // Playwright is optional for market intelligence scraping - 
    // keep external to prevent build failures when not installed
    "playwright",
    "playwright-core",
    // SVGO uses dynamic requires; keep it external to avoid webpack warnings
    "svgo",
  ],
  
  // Transpile packages configuration
  // This helps resolve module resolution issues with certain packages
  transpilePackages: [],
  
  // Performance optimizations for dev mode
  experimental: {
    // Enable Turbopack FS cache in dev for faster restarts
    // Cache significantly improves startup time after the first run
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
    // Production (main) runs full TS checking; preview/staging skips it
    // because Vercel's 2-core build machine times out on full TS check.
    // TS errors are caught locally and in CI lint step.
    ignoreBuildErrors: process.env.VERCEL_ENV === 'preview',
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
      {
        // Vercel Blob storage for user avatars and uploads
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  // Reduce watch overhead in dev (especially large folders in repo root)
  webpack: (config, { dev }) => {
    // canvas is an optional native dependency of jsdom (pulled in by isomorphic-dompurify).
    // We only use DOMPurify on the client side where the browser's native DOM is available,
    // so canvas is never needed. Stub it out to prevent webpack resolution errors.
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };

    if (dev) {
      const ignored = [
        ...(Array.isArray(config.watchOptions?.ignored)
          ? config.watchOptions.ignored
          : []),
        "**/.pnpm-store/**",
        "**/.git/**",
        "**/.next/**",
        "**/node_modules/**",
      ];
      config.watchOptions = {
        ...config.watchOptions,
        ignored,
      };
    }

    return config;
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
  // Security headers for Clerk bot protection (CAPTCHA) and Socket.io messaging
  // Note: Clerk uses two domain patterns:
  // - API domain: *.clerk.accounts.dev
  // - Account Portal: *.accounts.clerk.dev
  async headers() {
    // In development, allow localhost connections for debugging tools, Next.js devtools, and n8n
    const devConnectSrc = isDev ? " http://127.0.0.1:* http://localhost:* https://localhost:* ws://127.0.0.1:* ws://localhost:* wss://localhost:*" : "";
    const devLocalhost5678Frame = isDev ? " https://localhost:5678 http://localhost:5678" : "";
    const devLocalhost5678Connect = isDev ? " https://localhost:5678 wss://localhost:5678" : "";

    // unsafe-eval is required by Webpack hot-reload (dev only).
    // Production builds do not use eval — omitting it closes the most exploitable CSP gap.
    // unsafe-inline in script-src is still required by Clerk's SDK (inline event handlers);
    // the long-term fix is nonce-based CSP via middleware nonce injection.
    const devUnsafeEval = isDev ? " 'unsafe-eval'" : "";

    const cspDirectives = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${devUnsafeEval} https://*.clerk.accounts.dev https://*.accounts.clerk.dev https://clerk.oikion.com https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.clerk.accounts.dev https://*.accounts.clerk.dev https://clerk.oikion.com https://img.clerk.com https://images.clerk.dev https://lh3.googleusercontent.com https://res.cloudinary.com https://*.public.blob.vercel-storage.com",
      "font-src 'self' data:",
      `frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.accounts.clerk.dev https://clerk.oikion.com https://accounts.oikion.com${devLocalhost5678Frame}`,
      // Ably WebSocket connections for real-time messaging
      // Ably uses multiple domains: *.ably.io, *.ably.net (realtime), *.ably-realtime.com (fallbacks)
      // In dev mode, also allow localhost connections for debugging and Next.js devtools
      `connect-src 'self' https://*.clerk.accounts.dev https://*.accounts.clerk.dev https://clerk.oikion.com https://accounts.oikion.com https://challenges.cloudflare.com wss://*.clerk.accounts.dev wss://*.accounts.clerk.dev${devLocalhost5678Connect} https://*.ably.io wss://*.ably.io https://*.ably.net wss://*.ably.net https://*.ably-realtime.com wss://*.ably-realtime.com${devConnectSrc}`,
      "worker-src 'self' blob:",
    ];
    const cspValue = cspDirectives.join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspValue,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
