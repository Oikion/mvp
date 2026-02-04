"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  User,
  Calendar,
  Plus,
  ExternalLink,
  Clock,
  MapPin,
  ChevronRight,
  Unlink,
  X,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LinkedProperty {
  id: string;
  property_name: string;
  property_type?: string;
  property_status?: string;
  address_street?: string;
  address_city?: string;
  area?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  assigned_to_user?: { id: string; name: string };
}

interface LinkedClient {
  id: string;
  client_name: string;
  client_type?: string;
  client_status?: string;
  primary_email?: string;
  primary_phone?: string;
  intent?: string;
  assigned_to_user?: { id: string; name: string };
}

interface LinkedEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  status?: string;
  eventType?: string;
  assignedUser?: { id: string; name: string; email: string };
  linkedClients?: { id: string; client_name: string }[];
  linkedProperties?: { id: string; property_name: string }[];
}

interface LinkedEntitiesPanelProps {
  type: "properties" | "clients" | "events";
  entities: LinkedProperty[] | LinkedClient[] | LinkedEvent[];
  isLoading?: boolean;
  onLinkEntity?: () => void;
  onUnlinkEntity?: (entityId: string) => void;
  emptyMessage?: string;
  maxHeight?: string;
  showAddButton?: boolean;
  entitySourceId?: string;
  entitySourceType?: "client" | "property";
}

function PropertyCard({
  property,
  onUnlink,
}: {
  property: LinkedProperty;
  onUnlink?: () => void;
}) {
  const router = useRouter();

  return (
    <div
      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group relative"
      onClick={() => router.push(`/app/mls/properties/${property.id}`)}
    >
      {onUnlink && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onUnlink();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10">
          <Building2 className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{property.property_name}</h4>
          {(property.address_street || property.address_city || property.area) && (
            <p className="text-xs text-muted-foreground truncate">
              {[property.address_street, property.address_city, property.area]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            {property.property_type && (
              <Badge variant="outline" className="text-[10px] h-5">
                {property.property_type}
              </Badge>
            )}
            {property.property_status && (
              <Badge
                variant={property.property_status === "ACTIVE" ? "default" : "secondary"}
                className="text-[10px] h-5"
              >
                {property.property_status}
              </Badge>
            )}
            {property.price && (
              <span className="text-xs font-medium text-muted-foreground">
                €{property.price.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

function ClientCard({
  client,
  onUnlink,
}: {
  client: LinkedClient;
  onUnlink?: () => void;
}) {
  const router = useRouter();

  return (
    <div
      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group relative"
      onClick={() => router.push(`/app/crm/clients/${client.id}`)}
    >
      {onUnlink && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onUnlink();
          }}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-primary/10">
          <User className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{client.client_name}</h4>
          {client.primary_email && (
            <p className="text-xs text-muted-foreground truncate">
              {client.primary_email}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            {client.client_type && (
              <Badge variant="outline" className="text-[10px] h-5">
                {client.client_type}
              </Badge>
            )}
            {client.client_status && (
              <Badge
                variant={client.client_status === "ACTIVE" ? "default" : "secondary"}
                className="text-[10px] h-5"
              >
                {client.client_status}
              </Badge>
            )}
            {client.intent && (
              <Badge variant="secondary" className="text-[10px] h-5">
                {client.intent}
              </Badge>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

function EventCard({ event }: { event: LinkedEvent }) {
  const router = useRouter();
  const eventDate = new Date(event.startTime);
  const isUpcoming = eventDate >= new Date();
  const isPast = eventDate < new Date();

  return (
    <div
      className={cn(
        "p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group",
        isPast && "opacity-60"
      )}
      onClick={() => router.push(`/app/calendar/events/${event.id}`)}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "p-2 rounded-md",
            isUpcoming ? "bg-success/10" : "bg-muted"
          )}
        >
          <Calendar
            className={cn(
              "h-4 w-4",
              isUpcoming ? "text-success" : "text-muted-foreground"
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{event.title}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <Clock className="h-3 w-3" />
            <span>{format(eventDate, "PPp")}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            {event.eventType && (
              <Badge variant="outline" className="text-[10px] h-5">
                {event.eventType.replace(/_/g, " ")}
              </Badge>
            )}
            {event.status && (
              <Badge
                variant={event.status === "scheduled" ? "default" : "secondary"}
                className="text-[10px] h-5"
              >
                {event.status}
              </Badge>
            )}
            {isUpcoming && (
              <span className="text-[10px] text-success">
                {formatDistanceToNow(eventDate, { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

export function LinkedEntitiesPanel({
  type,
  entities,
  isLoading,
  onLinkEntity,
  onUnlinkEntity,
  emptyMessage,
  maxHeight = "400px",
  showAddButton = true,
}: LinkedEntitiesPanelProps) {
  const iconMap = {
    properties: Building2,
    clients: User,
    events: Calendar,
  };

  const titleMap = {
    properties: "Linked Properties",
    clients: "Linked Clients",
    events: "Calendar Events",
  };

  const defaultEmptyMap = {
    properties: "No linked properties yet",
    clients: "No linked clients yet",
    events: "No calendar events yet",
  };

  const Icon = iconMap[type];
  const title = titleMap[type];
  const empty = emptyMessage || defaultEmptyMap[type];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
            {!isLoading && entities.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {entities.length}
              </Badge>
            )}
          </CardTitle>
          {showAddButton && onLinkEntity && (
            <Button variant="outline" size="sm" onClick={onLinkEntity}>
              <Plus className="h-3 w-3 mr-1" />
              Link
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : entities.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            {empty}
          </div>
        ) : (
          <ScrollArea style={{ maxHeight }} className="pr-4">
            <div className="space-y-2">
              {type === "properties" &&
                (entities as LinkedProperty[]).map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    onUnlink={onUnlinkEntity ? () => onUnlinkEntity(property.id) : undefined}
                  />
                ))}
              {type === "clients" &&
                (entities as LinkedClient[]).map((client) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    onUnlink={onUnlinkEntity ? () => onUnlinkEntity(client.id) : undefined}
                  />
                ))}
              {type === "events" &&
                (entities as LinkedEvent[]).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}













