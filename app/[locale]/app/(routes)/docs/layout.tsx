import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider";
import { privateSource } from "@/lib/docs-source";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

interface PrivateDocsLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Private docs layout — inherits Clerk auth from the parent (routes) layout.
 * Uses Fumadocs DocsLayout for sidebar navigation but disables its own
 * theme provider since the app already has one.
 */
export default async function Layout({ children, params }: PrivateDocsLayoutProps) {
  const { locale } = await params;
  const t = await getTranslations("docs");

  return (
    <RootProvider
      theme={{ enabled: false }}
      search={{ enabled: true, options: { api: "/api/docs-search?scope=private" } }}
    >
      <DocsLayout
        tree={privateSource.pageTree[locale]}
        nav={{
          title: t("internalTitle"),
          url: `/${locale}/app/docs`,
        }}
        i18n={false}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
