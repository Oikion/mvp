import { loader } from "fumadocs-core/source";
import { publicDocs, privateDocs } from "collections/index";

/**
 * Per-locale loaders for directory-based i18n content.
 *
 * Content uses locale directories (e.g. `el/index.mdx`, `en/index.mdx`) rather
 * than filename suffixes (`index.el.mdx`). Fumadocs-core's built-in i18n only
 * handles filename-suffix locales, so we create a separate loader per locale
 * using `rootDir` to scope each one to its directory.
 */

const LOCALES = ["el", "en"] as const;
type Locale = (typeof LOCALES)[number];
const DEFAULT_LOCALE: Locale = "el";

type LoaderResult = ReturnType<typeof loader>;

function resolveLocale(locale?: string): Locale {
  return LOCALES.includes(locale as Locale)
    ? (locale as Locale)
    : DEFAULT_LOCALE;
}

// --- Shared helper to build a locale-aware source wrapper ---

function createI18nSource(
  loaders: Record<Locale, LoaderResult>,
) {
  return {
    getPage(slugs: string[] | undefined, locale?: string) {
      return loaders[resolveLocale(locale)].getPage(slugs);
    },
    getPages(locale?: string) {
      return loaders[resolveLocale(locale)].getPages();
    },
    /** Indexed by locale — used by DocsLayout: tree={source.pageTree[locale]} */
    pageTree: Object.fromEntries(
      LOCALES.map((l) => [l, loaders[l].pageTree]),
    ) as Record<Locale, LoaderResult["pageTree"]>,

    // --- Search API compatibility (createFromSource) ---

    /** Signals createFromSource to use i18n search mode */
    _i18n: { languages: [...LOCALES], defaultLanguage: DEFAULT_LOCALE },

    /** Returns all pages grouped by language — used by createFromSource */
    getLanguages() {
      return LOCALES.map((lang) => ({
        language: lang,
        pages: loaders[lang].getPages(),
      }));
    },
  };
}

// --- Private docs (authenticated) ---

const privateLoaders = Object.fromEntries(
  LOCALES.map((l) => [
    l,
    loader({
      baseUrl: "/app/docs",
      source: privateDocs.toFumadocsSource(),
      rootDir: l,
    }),
  ]),
) as Record<Locale, LoaderResult>;

/**
 * Private documentation source — requires Clerk authentication.
 * Content lives in content/docs/private/{el,en}/
 * Routes: /:locale/app/docs/...
 */
export const privateSource = createI18nSource(privateLoaders);

// --- Public docs (unauthenticated) ---

const publicLoaders = Object.fromEntries(
  LOCALES.map((l) => [
    l,
    loader({
      baseUrl: "/docs",
      source: publicDocs.toFumadocsSource(),
      rootDir: l,
    }),
  ]),
) as Record<Locale, LoaderResult>;

/**
 * Public documentation source — accessible without authentication.
 * Content lives in content/docs/public/{el,en}/
 * Routes: /:locale/docs/...
 */
export const publicSource = createI18nSource(publicLoaders);
