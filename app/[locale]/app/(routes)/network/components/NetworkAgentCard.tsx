"use client";

import { Link } from "@/navigation";
import { useTranslations } from "next-intl";
import { User } from "lucide-react";

import type { DiscoverAgentItem } from "@/actions/network/discover-agents";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConnectionButton } from "@/components/social/ConnectionButton";

interface NetworkAgentCardProps {
  agent: DiscoverAgentItem;
}

export function NetworkAgentCard({ agent }: NetworkAgentCardProps) {
  const t = useTranslations("network");
  const displayName = agent.name ?? agent.username ?? "Agent";

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={agent.avatar ?? undefined} alt="" />
            <AvatarFallback>
              <User className="h-6 w-6" aria-hidden />
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            {agent.username ? (
              <Link
                href={`/app/network/agents/${agent.username}`}
                className="font-medium text-primary hover:underline"
              >
                {displayName}
              </Link>
            ) : (
              <span className="font-medium">{displayName}</span>
            )}
            {agent.serviceAreas.length > 0 && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {agent.serviceAreas.slice(0, 3).join(", ")}
              </p>
            )}
            {agent.bio && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {agent.bio}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/app/network/agents/${agent.username || agent.slug}`}>{t("viewProfile")}</Link>
              </Button>
              {agent.userId && (
                <ConnectionButton
                  targetUserId={agent.userId}
                  size="sm"
                  variant="outline"
                />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
