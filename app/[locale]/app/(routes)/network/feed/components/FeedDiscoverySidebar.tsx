"use client";

import { ArrowRight, Users, Building2, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/navigation";
import { useTranslations } from "next-intl";
import { FeedDiscoveryCard } from "./FeedDiscoveryCard";
import type { DiscoverAgentItem } from "@/actions/network/discover-agents";
import type { DiscoverAgencyItem } from "@/actions/network/discover-agencies";

interface FeedDiscoverySidebarProps {
  readonly agents: DiscoverAgentItem[];
  readonly agencies: DiscoverAgencyItem[];
}

export function FeedDiscoverySidebar({
  agents,
  agencies,
}: FeedDiscoverySidebarProps) {
  const t = useTranslations("socialFeed.sidebar");
  const hasAgents = agents.length > 0;
  const hasAgencies = agencies.length > 0;

  return (
    <div className="space-y-4 sticky top-20">
      {/* Suggested Agents */}
      <Card className="rounded-xl border shadow-sm overflow-hidden">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              {t("suggestedAgents")}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-3">
          {hasAgents ? (
            <>
              <div className="divide-y divide-border">
                {agents.map((agent) => (
                  <FeedDiscoveryCard key={agent.id} type="agent" agent={agent} />
                ))}
              </div>
              <Link
                href="/app/network?tab=agents"
                className="mt-3 flex w-full items-center justify-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
              >
                {t("seeAllAgents")}
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </Link>
            </>
          ) : (
            <div className="flex flex-col items-center py-5 text-center gap-3">
              <div className="rounded-full bg-muted p-3">
                <UserPlus className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{t("emptyTitle")}</p>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-[180px]">
                  {t("emptyDescription")}
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/app/network?tab=agents">
                  {t("findAgents")}
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggested Agencies */}
      {hasAgencies && (
        <Card className="rounded-xl border shadow-sm overflow-hidden">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {t("suggestedAgencies")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-3">
            <div className="divide-y divide-border">
              {agencies.map((agency) => (
                <FeedDiscoveryCard
                  key={agency.id}
                  type="agency"
                  agency={agency}
                />
              ))}
            </div>
            <Link
              href="/app/network?tab=agencies"
              className="mt-3 flex w-full items-center justify-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
            >
              {t("seeAllAgencies")}
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
