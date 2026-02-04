import { AiToolsClient } from "./components/AiToolsClient";
import { getAiTools, getAiToolCategories } from "@/actions/platform-admin/ai-tools";

export default async function AiToolsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; search?: string; category?: string; status?: string }>;
}) {
  const { locale } = await params;
  const search = await searchParams;

  const page = parseInt(search.page || "1", 10);
  const searchQuery = search.search || "";
  const category = search.category || "";
  const isEnabled = search.status === "enabled" ? true : search.status === "disabled" ? false : undefined;

  const [toolsData, categories] = await Promise.all([
    getAiTools({
      page,
      limit: 20,
      search: searchQuery,
      category: category || undefined,
      isEnabled,
    }),
    getAiToolCategories(),
  ]);

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <AiToolsClient
          initialTools={toolsData.tools}
          totalCount={toolsData.totalCount}
          currentPage={toolsData.page}
          totalPages={toolsData.totalPages}
          categories={categories}
          locale={locale}
        />
      </div>
    </div>
  );
}
