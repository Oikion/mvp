import { AiPromptsClient } from "./components/AiPromptsClient";
import { getAiSystemPrompts, getPromptCategories } from "@/actions/platform-admin/ai-prompts";

export default async function AiPromptsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; category?: string; locale?: string; status?: string }>;
}) {
  const { locale: pageLocale } = await params;
  const search = await searchParams;

  const searchQuery = search.search || "";
  const category = search.category || "";
  const promptLocale = search.locale || "";
  const isEnabled = search.status === "enabled" ? true : search.status === "disabled" ? false : undefined;

  const [prompts, categories] = await Promise.all([
    getAiSystemPrompts({
      search: searchQuery || undefined,
      category: category || undefined,
      locale: promptLocale || undefined,
      isEnabled,
    }),
    getPromptCategories(),
  ]);

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <AiPromptsClient
          initialPrompts={prompts}
          categories={categories}
          locale={pageLocale}
        />
      </div>
    </div>
  );
}
