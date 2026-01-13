"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Building2, User, Calendar, FileText, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RelationshipBadgeProps {
  type: "client" | "property" | "event" | "document";
  count: number;
  preview?: { id: string; name: string }[];
  onClick?: () => void;
  className?: string;
}

const iconMap = {
  client: User,
  property: Building2,
  event: Calendar,
  document: FileText,
};

const labelMap = {
  client: "client",
  property: "property",
  event: "event",
  document: "document",
};

export function RelationshipBadge({
  type,
  count,
  preview,
  onClick,
  className,
}: RelationshipBadgeProps) {
  if (count === 0) return null;

  const Icon = iconMap[type];
  const label = count === 1 ? labelMap[type] : `${labelMap[type]}s`;

  const badge = (
    <Badge
      variant="secondary"
      className={cn(
        "cursor-pointer hover:bg-secondary/80 transition-colors gap-1",
        className
      )}
      onClick={onClick}
    >
      <Icon className="h-3 w-3" />
      <span>
        {count} {label}
      </span>
    </Badge>
  );

  if (!preview || preview.length === 0) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <div className="space-y-1">
            <p className="text-xs font-medium flex items-center gap-1">
              <Link2 className="h-3 w-3" />
              Linked {labelMap[type]}s
            </p>
            <ul className="text-xs text-muted-foreground">
              {preview.slice(0, 5).map((item) => (
                <li key={item.id} className="truncate">
                  • {item.name}
                </li>
              ))}
              {count > 5 && (
                <li className="text-muted-foreground/60">
                  +{count - 5} more...
                </li>
              )}
            </ul>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface RelationshipBadgesProps {
  clients?: { count: number; preview?: { id: string; name: string }[] };
  properties?: { count: number; preview?: { id: string; name: string }[] };
  events?: { count: number; preview?: { id: string; name: string }[] };
  documents?: { count: number; preview?: { id: string; name: string }[] };
  onClientClick?: () => void;
  onPropertyClick?: () => void;
  onEventClick?: () => void;
  onDocumentClick?: () => void;
  className?: string;
}

export function RelationshipBadges({
  clients,
  properties,
  events,
  documents,
  onClientClick,
  onPropertyClick,
  onEventClick,
  onDocumentClick,
  className,
}: RelationshipBadgesProps) {
  const hasAny =
    (clients?.count || 0) +
      (properties?.count || 0) +
      (events?.count || 0) +
      (documents?.count || 0) >
    0;

  if (!hasAny) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
      {clients && clients.count > 0 && (
        <RelationshipBadge
          type="client"
          count={clients.count}
          preview={clients.preview}
          onClick={onClientClick}
        />
      )}
      {properties && properties.count > 0 && (
        <RelationshipBadge
          type="property"
          count={properties.count}
          preview={properties.preview}
          onClick={onPropertyClick}
        />
      )}
      {events && events.count > 0 && (
        <RelationshipBadge
          type="event"
          count={events.count}
          preview={events.preview}
          onClick={onEventClick}
        />
      )}
      {documents && documents.count > 0 && (
        <RelationshipBadge
          type="document"
          count={documents.count}
          preview={documents.preview}
          onClick={onDocumentClick}
        />
      )}
    </div>
  );
}















