"use client";

import Image from "next/image";
import { Link } from "@/navigation";
import { User, Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConnectionButton } from "@/components/social/ConnectionButton";
import type { DiscoverAgentItem } from "@/actions/network/discover-agents";
import type { DiscoverAgencyItem } from "@/actions/network/discover-agencies";

interface AgentDiscoveryCardProps {
  type: "agent";
  agent: DiscoverAgentItem;
  t: any;
}

interface AgencyDiscoveryCardProps {
  type: "agency";
  agency: DiscoverAgencyItem;
  t: any;
}

type FeedDiscoveryCardProps = AgentDiscoveryCardProps | AgencyDiscoveryCardProps;

export function FeedDiscoveryCard(props: FeedDiscoveryCardProps) {
  if (props.type === "agent") {
    return <AgentCard agent={props.agent} t={props.t} />;
  }
  return <AgencyCard agency={props.agency} t={props.t} />;
}

function AgentCard({ agent, t }: { agent: DiscoverAgentItem; t: any }) {
  const displayName = agent.name ?? agent.username ?? "Agent";
  const specialization =
    agent.specializations?.[0] ||
    (agent.serviceAreas.length > 0
      ? agent.serviceAreas.slice(0, 2).join(", ")
      : null);

  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={agent.avatar ?? undefined} alt="" />
        <AvatarFallback className="text-xs">
          <User className="h-4 w-4" aria-hidden />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <Link
          href={`/agent/${agent.slug}`}
          className="text-sm font-medium text-foreground hover:text-primary hover:underline truncate block"
        >
          {displayName}
        </Link>
        {specialization && (
          <p className="text-xs text-muted-foreground truncate">
            {specialization}
          </p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-1.5">
        {agent.userId && (
          <ConnectionButton
            targetUserId={agent.userId}
            size="sm"
            variant="outline"
          />
        )}
      </div>
    </div>
  );
}

function AgencyCard({ agency, t }: { agency: DiscoverAgencyItem; t: any }) {
  const location = [agency.city, agency.region].filter(Boolean).join(", ");

  return (
    <div className="flex items-center gap-3 py-2">
      {agency.logo ? (
        <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border bg-muted">
          <Image
            src={agency.logo}
            alt={agency.name}
            fill
            className="object-contain"
            sizes="32px"
          />
        </div>
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-muted">
          <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <Link
          href={`/agency/${agency.slug}`}
          className="text-sm font-medium text-foreground hover:text-primary hover:underline truncate block"
        >
          {agency.name}
        </Link>
        {location && (
          <p className="text-xs text-muted-foreground truncate">{location}</p>
        )}
      </div>
      <div className="shrink-0">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/agency/${agency.slug}`}>
            {t?.viewProfile || "View"}
          </Link>
        </Button>
      </div>
    </div>
  );
}
