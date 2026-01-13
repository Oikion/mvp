// app/[locale]/changelog/page.tsx
// Public changelog page - displays published changelog entries

import { getPublishedChangelogEntries } from "@/actions/platform-admin/changelog-actions";
import { getTranslations } from "next-intl/server";
import { NavigationMenu } from "@/components/website";
import { ChangelogList } from "@/components/changelog/ChangelogList";
import { ScrollText } from "lucide-react";
import Link from "next/link";

export default async function ChangelogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("website.changelog");
  const entries = await getPublishedChangelogEntries();

  // Get category translations for the current locale
  const categoryTranslations: Record<string, string> = {
    "Feature": t("categories.Feature"),
    "Bug Fix": t("categories.Bug Fix"),
    "Improvement": t("categories.Improvement"),
    "Security": t("categories.Security"),
    "Performance": t("categories.Performance"),
    "UI/UX": t("categories.UI/UX"),
    "API": t("categories.API"),
    "Documentation": t("categories.Documentation"),
    "Maintenance": t("categories.Maintenance"),
    "Breaking Change": t("categories.Breaking Change"),
    "Other": t("categories.Other"),
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <NavigationMenu variant="landing" />
      
      <main className="pt-24 pb-16">
        <div className="container max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
              <ScrollText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              {t("title")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("description")}
            </p>
          </div>

          {/* Changelog List */}
          {entries.length > 0 ? (
            <ChangelogList entries={entries} categoryTranslations={categoryTranslations} />
          ) : (
            <div className="text-center py-16">
              <ScrollText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{t("noEntries")}</h3>
              <p className="text-muted-foreground mb-6">{t("checkBackLater")}</p>
              <Link
                href={`/${locale}`}
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t("backToHome")}
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
