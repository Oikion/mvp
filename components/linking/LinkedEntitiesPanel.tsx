// @ts-nocheck
"use client";

import { useState } from "react";
import { Link, useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  User,
  Calendar,
  FileText,
  Plus,
  ExternalLink,
  Clock,
  MapPin,
  ChevronRight,
  Unlink,
  X,
  Search,
  DollarSign,
  ClipboardList,
  UserCircle,
  Handshake,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LinkedProperty {
  id: string;
  friendlyId: string;
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
  friendlyId: string;
  client_name: string;
  client_type?: string;
  client_status?: string;
  primary_email?: string;
  primary_phone?: string;
  assigned_to_user?: { id: string; name: string };
}

interface LinkedEvent {
  id: string;
  friendlyId: string;
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

interface LinkedDocument {
  id: string;
  friendlyId: string;
  document_name: string;
  document_type?: string;
  document_file_mimeType?: string;
  createdAt?: string;
}

interface LinkedContact {
  id: string;
  friendlyId: string;
  displayName: string;
  isCompany?: boolean;
  email?: string;
  primaryPhone?: string;
  category?: string[];
  status?: string;
  role?: string; // from RequestContact join
}

interface LinkedRequest {
  id: string;
  friendlyId: string;
  requestType: string;
  status?: string;
  urgency?: string;
  budgetMin?: number;
  budgetMax?: number;
  locationDisplayName?: string;
  municipality?: string;
}

interface LinkedDeal {
  id: string;
  friendlyId: string;
  title?: string;
  stage?: string;
  dealType?: string;
  agreedPrice?: number;
  property?: { title?: string; property_name?: string };
}

interface LinkedEntitiesPanelProps {
  type: "properties" | "clients" | "contacts" | "events" | "requests" | "documents" | "deals";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entities: any[];
  isLoading?: boolean;
  onLinkEntity?: () => void;
  onUnlinkEntity?: (entityId: string) => void;
  onCreateEvent?: () => void;
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
      onClick={() => router.push(`/app/mls/properties/${property.friendlyId}`)}
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
      onClick={() => router.push(`/app/crm/clients/${client.friendlyId}`)}
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
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

function DocumentCard({
  document,
  onUnlink,
}: {
  document: LinkedDocument;
  onUnlink?: () => void;
}) {
  const router = useRouter();

  return (
    <div
      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group relative"
      onClick={() => router.push(`/app/documents/${document.friendlyId}`)}
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
        <div className="p-2 rounded-md bg-orange-500/10">
          <FileText className="h-4 w-4 text-orange-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{document.document_name}</h4>
          {document.createdAt && (
            <p className="text-xs text-muted-foreground truncate">
              {format(new Date(document.createdAt), "MMM d, yyyy")}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            {document.document_type && (
              <Badge variant="outline" className="text-[10px] h-5">
                {document.document_type}
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
      onClick={() => router.push(`/app/calendar/events/${event.friendlyId}`)}
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

function ContactCard({
  contact,
  onUnlink,
}: {
  contact: LinkedContact;
  onUnlink?: () => void;
}) {
  return (
    <div className="group relative rounded-lg border p-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          {contact.isCompany ? (
            <Building2 className="h-4 w-4 text-amber-600" />
          ) : (
            <UserCircle className="h-4 w-4 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/app/crm/contacts/${contact.friendlyId}`}
            className="text-sm font-medium hover:underline truncate block"
          >
            {contact.displayName || "—"}
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {contact.email && <span className="truncate">{contact.email}</span>}
            {contact.role && (
              <Badge variant="outline" className="text-[10px] h-4">
                {contact.role}
              </Badge>
            )}
          </div>
        </div>
        {onUnlink && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onUnlink();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

function RequestCard({
  request,
  onUnlink,
}: {
  request: LinkedRequest;
  onUnlink?: () => void;
}) {
  const typeColors: Record<string, string> = {
    BUY: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    RENT: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  };
  const statusColors: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-800",
    MATCHED: "bg-purple-100 text-purple-800",
    UNDER_OFFER: "bg-amber-100 text-amber-800",
    CLOSED: "bg-gray-100 text-gray-800",
    PAUSED: "bg-slate-100 text-slate-800",
  };

  const budgetStr = (() => {
    const min = request.budgetMin ? `€${Number(request.budgetMin).toLocaleString()}` : null;
    const max = request.budgetMax ? `€${Number(request.budgetMax).toLocaleString()}` : null;
    if (min && max) return `${min} – ${max}`;
    if (min) return `${min}+`;
    if (max) return `up to ${max}`;
    return null;
  })();

  return (
    <div className="group relative rounded-lg border p-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Search className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={`/app/requests/${request.friendlyId}`}
            className="text-sm font-medium hover:underline truncate block"
          >
            {request.friendlyId}
          </Link>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge className={cn("text-[10px] h-4", typeColors[request.requestType])} variant="secondary">
              {request.requestType}
            </Badge>
            {request.status && (
              <Badge className={cn("text-[10px] h-4", statusColors[request.status])} variant="secondary">
                {request.status}
              </Badge>
            )}
            {budgetStr && <span className="truncate">{budgetStr}</span>}
          </div>
        </div>
        {onUnlink && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onUnlink();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
}

function DealCard({
  deal,
  onUnlink,
}: {
  deal: LinkedDeal;
  onUnlink?: () => void;
}) {
  const router = useRouter();

  return (
    <div
      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group relative"
      onClick={() => router.push(`/app/deals/${deal.friendlyId}`)}
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
      <div className="flex items-center gap-2 mb-1">
        <Handshake className="h-4 w-4 text-purple-500 shrink-0" />
        <span className="font-medium text-sm truncate">
          {deal.title || deal.property?.title || deal.property?.property_name || deal.friendlyId}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {deal.stage && (
          <Badge variant="outline" className="text-[10px] h-5">
            {deal.stage.replaceAll("_", " ")}
          </Badge>
        )}
        {deal.dealType && (
          <span>{deal.dealType}</span>
        )}
        {deal.friendlyId && (
          <span className="ml-auto">{deal.friendlyId}</span>
        )}
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
  onCreateEvent,
  emptyMessage,
  maxHeight = "400px",
  showAddButton = true,
}: LinkedEntitiesPanelProps) {
  const t = useTranslations("common");

  const iconMap = {
    properties: Building2,
    clients: User,
    contacts: UserCircle,
    events: Calendar,
    requests: ClipboardList,
    documents: FileText,
    deals: Handshake,
  };

  const titleMap = {
    properties: t("linkedEntities.linkedProperties"),
    clients: t("linkedEntities.linkedClients"),
    contacts: t("linkedEntities.linkedContacts"),
    events: t("linkedEntities.calendarEvents"),
    requests: t("linkedEntities.linkedRequests"),
    documents: t("linkedEntities.linkedDocuments"),
    deals: t("linkedEntities.linkedDeals"),
  };

  const defaultEmptyMap = {
    properties: t("linkedEntities.noLinkedProperties"),
    clients: t("linkedEntities.noLinkedClients"),
    contacts: t("linkedEntities.noLinkedContacts"),
    events: t("linkedEntities.noCalendarEvents"),
    requests: t("linkedEntities.noLinkedRequests"),
    documents: t("linkedEntities.noLinkedDocuments"),
    deals: t("linkedEntities.noLinkedDeals"),
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
          <div className="flex items-center gap-2">
            {onCreateEvent && (
              <Button variant="outline" size="sm" onClick={onCreateEvent}>
                <Plus className="h-3 w-3 mr-1" />
                {t("linkedEntities.createEvent")}
              </Button>
            )}
            {showAddButton && onLinkEntity && (
              <Button variant="outline" size="sm" onClick={onLinkEntity}>
                <Plus className="h-3 w-3 mr-1" />
                {t("linkedEntities.link")}
              </Button>
            )}
          </div>
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
              {type === "contacts" &&
                (entities as LinkedContact[]).map((contact) => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onUnlink={onUnlinkEntity ? () => onUnlinkEntity(contact.id) : undefined}
                  />
                ))}
              {type === "requests" &&
                (entities as LinkedRequest[]).map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onUnlink={onUnlinkEntity ? () => onUnlinkEntity(request.id) : undefined}
                  />
                ))}
              {type === "documents" &&
                (entities as LinkedDocument[]).map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onUnlink={onUnlinkEntity ? () => onUnlinkEntity(doc.id) : undefined}
                  />
                ))}
              {type === "deals" &&
                (entities as LinkedDeal[]).map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onUnlink={onUnlinkEntity ? () => onUnlinkEntity(deal.id) : undefined}
                  />
                ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}













