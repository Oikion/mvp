"use client";

import { ArrowRight, Users, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/navigation";
import { FeedDiscoveryCard } from "./FeedDiscoveryCard";
import type { DiscoverAgentItem } from "@/actions/network/discover-agents";
import type { DiscoverAgencyItem } from "@/actions/network/discover-agencies";

interface FeedDiscoverySidebarProps {
  readonly agents: DiscoverAgentItem[];
  readonly agencies: DiscoverAgencyItem[];
  readonly t: any;
}

export function FeedDiscoverySidebar({
  agents,
  agencies,
  t,
}: FeedDiscoverySidebarProps) {
  const networkT = t?.network || {};
  const sidebarT = t?.socialFeed?.sidebar || {};

  if (agents.length === 0 && agencies.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6 sticky top-20">
      {/* Suggested Agents */}
      {agents.length > 0 && (
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {sidebarT?.suggestedAgents || "Suggested Agents"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              {agents.map((agent) => (
                <FeedDiscoveryCard
                  key={agent.id}
                  type="agent"
                  agent={agent}
                  t={networkT}
                />
              ))}
            </div>
            <Link
              href="/app/network/profile?tab=connections"
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
            >
              {sidebarT?.seeAllAgents || "See all"}
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Suggested Agencies */}
      {agencies.length > 0 && (
        <Card className="rounded-xl border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {sidebarT?.suggestedAgencies || "Suggested Agencies"}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y divide-border">
              {agencies.map((agency) => (
                <FeedDiscoveryCard
                  key={agency.id}
                  type="agency"
                  agency={agency}
                  t={networkT}
                />
              ))}
            </div>
            <Link
              href="/app/network/profile?tab=connections"
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
            >
              {sidebarT?.seeAllAgencies || "See all"}
              <ArrowRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
