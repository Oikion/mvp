"use client";

import { memo } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, MapPin, User2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface MandateCardProps {
  data: {
    id: string;
    friendlyId?: string;
    title: string;
    transaction_type: string;
    property_type?: string | null;
    status: string;
    urgency?: string | null;
    budget_min?: number | string | null;
    budget_max?: number | string | null;
    areas_of_interest?: string[] | null;
    clientId?: string | null;
    client?: {
      id: string;
      client_name?: string | null;
    } | null;
    assigned_to_user?: {
      id: string;
      name?: string | null;
    } | null;
    updatedAt?: string | Date | null;
  };
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  DRAFT: "secondary",
  ACTIVE: "default",
  PAUSED: "outline",
  FULFILLED: "default",
  EXPIRED: "destructive",
  CANCELLED: "destructive",
};

const URGENCY_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  LOW: "secondary",
  MEDIUM: "outline",
  HIGH: "default",
  CRITICAL: "destructive",
};

const TRANSACTION_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  SALE: "default",
  RENTAL: "secondary",
  SHORT_TERM: "outline",
  EXCHANGE: "outline",
};

function formatBudget(min?: number | string | null, max?: number | string | null): string {
  const minVal = min ? Number(min) : null;
  const maxVal = max ? Number(max) : null;

  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toLocaleString();
  };

  if (minVal && maxVal) return `\u20AC${fmt(minVal)} - \u20AC${fmt(maxVal)}`;
  if (minVal) return `\u20AC${fmt(minVal)}+`;
  if (maxVal) return `up to \u20AC${fmt(maxVal)}`;
  return "\u2014";
}

/**
 * Memoized mandate card component for optimal rendering in virtualized lists.
 * Only re-renders when the mandate data changes.
 */
export const MandateCard = memo(
  function MandateCard({ data }: MandateCardProps) {
    const t = useTranslations("mandates");
    const commonT = useTranslations("common");

    const isUnlinked = !data.clientId;
    const areas = Array.isArray(data.areas_of_interest)
      ? data.areas_of_interest
      : [];

    return (
      <Card
        className={cn(
          "hover:shadow-lg transition-shadow flex flex-col h-full group",
          isUnlinked && "border-l-2 border-l-dashed border-l-muted-foreground/30"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 overflow-hidden">
              <h3 className="font-semibold text-base truncate">{data.title}</h3>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <Badge variant={TRANSACTION_VARIANT[data.transaction_type] ?? "outline"} className="text-xs">
                  {data.transaction_type}
                </Badge>
                <Badge variant={STATUS_VARIANT[data.status] ?? "secondary"} className="text-xs">
                  {t(`MandateForm.status.${data.status}`)}
                </Badge>
                {data.urgency && (
                  <Badge variant={URGENCY_VARIANT[data.urgency] ?? "outline"} className="text-xs">
                    {t(`MandateForm.urgency.${data.urgency}`)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-3 text-sm">
          {/* Budget */}
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">
              {formatBudget(data.budget_min, data.budget_max)}
            </span>
          </div>

          {/* Areas of Interest */}
          {areas.length > 0 && (
            <div className="flex items-start gap-1.5">
              <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="flex flex-wrap gap-1">
                {areas.slice(0, 3).map((area, i) => (
                  <Badge key={i} variant="outline" className="text-xs font-normal">
                    {area}
                  </Badge>
                ))}
                {areas.length > 3 && (
                  <Badge variant="outline" className="text-xs font-normal">
                    +{areas.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Client Link */}
          <div className="pt-2 border-t mt-2">
            <div className="flex items-center gap-2">
              <User2 className="h-3.5 w-3.5 text-muted-foreground" />
              {data.client?.client_name ? (
                <span className="text-sm truncate">{data.client.client_name}</span>
              ) : (
                <span className="text-sm text-muted-foreground/60 italic">
                  {t("MandatesTable.noClient")}
                </span>
              )}
            </div>
          </div>

          {/* Assigned Agent */}
          {data.assigned_to_user?.name && (
            <div className="text-xs text-muted-foreground">
              {commonT("assigned")} {data.assigned_to_user.name}
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-0 flex justify-end">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link
              href={`/app/mandates/${data.friendlyId ?? data.id}`}
              className="inline-flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              {commonT("view")}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.data.id === nextProps.data.id &&
      prevProps.data.updatedAt === nextProps.data.updatedAt &&
      prevProps.data.status === nextProps.data.status &&
      prevProps.data.title === nextProps.data.title &&
      prevProps.data.clientId === nextProps.data.clientId
    );
  }
);
