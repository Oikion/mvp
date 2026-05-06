"use client";

import Image from "next/image";
import { Link } from "@/navigation";
import { Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConnectionButton } from "@/components/social/ConnectionButton";
import { useTranslations } from "next-intl";
import type { DiscoverAgentItem } from "@/actions/network/discover-agents";
import type { DiscoverAgencyItem } from "@/actions/network/discover-agencies";

interface AgentDiscoveryCardProps {
  type: "agent";
  agent: DiscoverAgentItem;
}

interface AgencyDiscoveryCardProps {
  type: "agency";
  agency: DiscoverAgencyItem;
}

type FeedDiscoveryCardProps = AgentDiscoveryCardProps | AgencyDiscoveryCardProps;

export function FeedDiscoveryCard(props: FeedDiscoveryCardProps) {
  if (props.type === "agent") {
    return <AgentCard agent={props.agent} />;
  }
  return <AgencyCard agency={props.agency} />;
}

function AgentCard({ agent }: { agent: DiscoverAgentItem }) {
  const displayName = agent.name ?? agent.username ?? "Agent";
  const primarySpecialization = agent.specializations?.[0] ?? null;
  const serviceAreaPills = agent.serviceAreas.slice(0, 2);

  return (
    <div className="flex items-start gap-3 py-3">
      <Avatar className="h-9 w-9 shrink-0 mt-0.5">
        <AvatarImage src={agent.avatar ?? undefined} alt={displayName} />
        <AvatarFallback className="text-xs bg-muted font-medium">
          {displayName
            .split(" ")
            .map((w: string) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <Link
          href={`/agent/${agent.slug}`}
          className="text-sm font-medium text-foreground hover:text-primary hover:underline truncate block leading-snug"
        >
          {displayName}
        </Link>
        {primarySpecialization && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {primarySpecialization}
          </p>
        )}
        {serviceAreaPills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {serviceAreaPills.map((area) => (
              <Badge
                key={area}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 h-4 font-normal"
              >
                {area}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="shrink-0 mt-0.5">
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

function AgencyCard({ agency }: { agency: DiscoverAgencyItem }) {
  const t = useTranslations("socialFeed.sidebar");
  const location = [agency.city, agency.region].filter(Boolean).join(", ");

  return (
    <div className="flex items-start gap-3 py-3">
      {agency.logo ? (
        <div className="relative h-9 w-9 shrink-0 mt-0.5 overflow-hidden rounded-md border bg-muted">
          <Image
            src={agency.logo}
            alt={agency.name}
            fill
            className="object-contain"
            sizes="36px"
          />
        </div>
      ) : (
        <div className="flex h-9 w-9 shrink-0 mt-0.5 items-center justify-center rounded-md border bg-muted">
          <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <Link
          href={`/agency/${agency.slug}`}
          className="text-sm font-medium text-foreground hover:text-primary hover:underline truncate block leading-snug"
        >
          {agency.name}
        </Link>
        {location && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {location}
          </p>
        )}
      </div>
      <div className="shrink-0 mt-0.5">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/agency/${agency.slug}`}>
            {t("viewProfile")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
