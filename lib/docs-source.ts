import { loader } from "fumadocs-core/source";
import { publicDocs, privateDocs } from "collections/index";
import type { I18nConfig } from "fumadocs-core/i18n";

const i18n: I18nConfig = {
  languages: ["el", "en"],
  defaultLanguage: "el",
};

/**
 * Public documentation source — accessible without authentication.
 * Content lives in content/docs/public/{el,en}/
 * Routes: /:locale/docs/...
 */
export const publicSource = loader({
  baseUrl: "/docs",
  source: publicDocs.toFumadocsSource(),
  i18n,
});

/**
 * Private documentation source — requires Clerk authentication.
 * Content lives in content/docs/private/{el,en}/
 * Routes: /:locale/app/docs/...
 */
export const privateSource = loader({
  baseUrl: "/app/docs",
  source: privateDocs.toFumadocsSource(),
  i18n,
});
