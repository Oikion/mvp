import { AiAgentsClient } from "./components/AiAgentsClient";
import {
  getAiAgents,
  getModelProviders,
  getAvailableSystemPrompts,
  getAvailableTools,
  getAiAgentStats,
} from "@/actions/platform-admin/ai-agents";

export default async function AiAgentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    provider?: string;
    status?: string;
    type?: string;
  }>;
}) {
  const { locale } = await params;
  const search = await searchParams;

  const page = parseInt(search.page || "1", 10);
  const searchQuery = search.search || "";
  const provider = search.provider as "OPENAI" | "ANTHROPIC" | undefined;
  const isEnabled =
    search.status === "enabled"
      ? true
      : search.status === "disabled"
        ? false
        : undefined;
  const isSystemAgent =
    search.type === "system" ? true : search.type === "custom" ? false : undefined;

  const [agentsData, providersData, prompts, tools, stats] = await Promise.all([
    getAiAgents({
      page,
      limit: 20,
      search: searchQuery || undefined,
      provider: provider || undefined,
      isEnabled,
      isSystemAgent,
    }),
    getModelProviders(),
    getAvailableSystemPrompts(),
    getAvailableTools(),
    getAiAgentStats(),
  ]);

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <AiAgentsClient
          initialAgents={agentsData.agents}
          totalCount={agentsData.totalCount}
          currentPage={agentsData.page}
          totalPages={agentsData.totalPages}
          providers={providersData.providers}
          availablePrompts={prompts}
          availableTools={tools}
          stats={stats}
          locale={locale}
        />
      </div>
    </div>
  );
}
