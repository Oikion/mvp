import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider";
import { publicSource } from "@/lib/docs-source";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

interface DocsLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function Layout({ children, params }: DocsLayoutProps) {
  const { locale } = await params;
  const t = await getTranslations("docs");

  return (
    <RootProvider
      theme={{ enabled: false }}
      search={{ enabled: true, options: { api: "/api/docs-search" } }}
    >
      <DocsLayout
        tree={publicSource.pageTree[locale]}
        nav={{
          title: t("title"),
          url: `/${locale}/docs`,
        }}
        i18n={false}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
