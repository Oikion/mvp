// app/[locale]/(platform-admin)/platform-admin/changelog/page.tsx
// Changelog Management - View and manage changelog entries

import { ChangelogClient } from "./components/ChangelogClient";
import { getChangelogEntries, getCustomCategories } from "@/actions/platform-admin/changelog-actions";

export default async function ChangelogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { locale } = await params;
  const { status, page } = await searchParams;

  // Get changelog entries and categories
  const currentPage = parseInt(page || "1");
  const [{ entries, total, stats }, categories] = await Promise.all([
    getChangelogEntries({
      status: status || "all",
      page: currentPage,
      pageSize: 20,
    }),
    getCustomCategories(),
  ]);

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <ChangelogClient
          entries={entries}
          stats={stats}
          categories={categories}
          currentPage={currentPage}
          totalPages={Math.ceil(total / 20)}
          currentStatus={status || "all"}
          locale={locale}
        />
      </div>
    </div>
  );
}
