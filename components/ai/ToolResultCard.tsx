"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Users,
  Home,
  FileText,
  Handshake,
  Clock,
  MapPin,
  Mail,
  Phone,
  Euro,
  Bed,
  Bath,
  Maximize2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Search,
  ListChecks,
  MessageSquare,
  Cake,
  Link2,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/dictionaries";

// ============================================
// Types
// ============================================

export interface ToolCallResult {
  id: string;
  name: string;
  args: Record<string, unknown>;
  success: boolean;
  result?: unknown;
  error?: string;
}

type ToolResultCardProps = Readonly<{
  toolCall: ToolCallResult;
  locale: string;
  dict: Dictionary;
}>;

// ============================================
// Helper Components
// ============================================

function formatDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

function formatPrice(price: number | string | null | undefined): string {
  if (price === null || price === undefined) return "N/A";
  const num = typeof price === "string" ? Number.parseFloat(price) : price;
  return new Intl.NumberFormat("el-GR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

// ============================================
// Card Components for Different Tool Types
// ============================================

function EventCard({
  event,
  locale,
}: Readonly<{
  event: Record<string, unknown>;
  locale: string;
}>) {
  const id = event.id as string;
  const title = (event.title as string) || "Untitled Event";
  const startTime = event.startTime as string;
  const endTime = event.endTime as string;
  const location = event.location as string | undefined;
  const eventType = event.eventType as string | undefined;

  return (
    <Card className="bg-gradient-to-br from-purple-500/5 to-purple-500/10 border-purple-500/20 hover:border-purple-500/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="shrink-0 w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-sm truncate">{title}</h4>
              <div className="flex flex-col gap-1 mt-1.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    {formatDateTime(startTime)}
                    {endTime && ` - ${formatDateTime(endTime)}`}
                  </span>
                </div>
                {location && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{location}</span>
                  </div>
                )}
              </div>
              {eventType && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  {eventType}
                </Badge>
              )}
            </div>
          </div>
          <Link href={`/${locale}/app/calendar/events/${id}`}>
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function ClientCard({
  client,
  locale,
}: Readonly<{
  client: Record<string, unknown>;
  locale: string;
}>) {
  const id = client.id as string;
  const name = (client.client_name as string) || (client.name as string) || "Unnamed Client";
  const email = client.primary_email as string | undefined;
  const phone = client.primary_phone as string | undefined;
  const clientType = client.client_type as string | undefined;
  const status = client.client_status as string | undefined;

  return (
    <Card className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 border-blue-500/20 hover:border-blue-500/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-sm truncate">{name}</h4>
              <div className="flex flex-col gap-1 mt-1.5">
                {email && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{email}</span>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 shrink-0" />
                    <span className="truncate">{phone}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-1.5 mt-2">
                {clientType && (
                  <Badge variant="secondary" className="text-xs">
                    {clientType}
                  </Badge>
                )}
                {status && (
                  <Badge variant="outline" className="text-xs">
                    {status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Link href={`/${locale}/app/crm/clients/${id}`}>
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function PropertyCard({
  property,
  locale,
}: Readonly<{
  property: Record<string, unknown>;
  locale: string;
}>) {
  const id = property.id as string;
  const name = (property.property_name as string) || (property.name as string) || "Unnamed Property";
  const price = property.price as number | undefined;
  const city = property.city as string | undefined;
  const address = property.address as string | undefined;
  const bedrooms = property.bedrooms as number | undefined;
  const bathrooms = property.bathrooms as number | undefined;
  const area = property.total_area_sq_m as number | undefined;
  const propertyType = property.property_type as string | undefined;
  const transactionType = property.transaction_type as string | undefined;

  return (
    <Card className="bg-gradient-to-br from-green-500/5 to-green-500/10 border-green-500/20 hover:border-green-500/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="shrink-0 w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Home className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-sm truncate">{name}</h4>
              <div className="flex flex-col gap-1 mt-1.5">
                {(city || address) && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">{address || city}</span>
                  </div>
                )}
                {price !== undefined && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                    <Euro className="h-3 w-3 shrink-0" />
                    <span>{formatPrice(price)}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {bedrooms !== undefined && (
                    <span className="flex items-center gap-1">
                      <Bed className="h-3 w-3" /> {bedrooms}
                    </span>
                  )}
                  {bathrooms !== undefined && (
                    <span className="flex items-center gap-1">
                      <Bath className="h-3 w-3" /> {bathrooms}
                    </span>
                  )}
                  {area !== undefined && (
                    <span className="flex items-center gap-1">
                      <Maximize2 className="h-3 w-3" /> {area}m²
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 mt-2">
                {propertyType && (
                  <Badge variant="secondary" className="text-xs">
                    {propertyType}
                  </Badge>
                )}
                {transactionType && (
                  <Badge variant="outline" className="text-xs">
                    {transactionType}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Link href={`/${locale}/app/mls/properties/${id}`}>
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function DealCard({
  deal,
  locale,
}: Readonly<{
  deal: Record<string, unknown>;
  locale: string;
}>) {
  const id = deal.id as string;
  const title = (deal.title as string) || (deal.name as string) || "Unnamed Deal";
  const value = deal.value as number | undefined;
  const stage = deal.stage as string | undefined;
  const status = deal.status as string | undefined;

  return (
    <Card className="bg-gradient-to-br from-amber-500/5 to-amber-500/10 border-amber-500/20 hover:border-amber-500/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="shrink-0 w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Handshake className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-sm truncate">{title}</h4>
              <div className="flex flex-col gap-1 mt-1.5">
                {value !== undefined && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                    <Euro className="h-3 w-3 shrink-0" />
                    <span>{formatPrice(value)}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-1.5 mt-2">
                {stage && (
                  <Badge variant="secondary" className="text-xs">
                    {stage}
                  </Badge>
                )}
                {status && (
                  <Badge variant="outline" className="text-xs">
                    {status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Link href={`/${locale}/app/deals/${id}`}>
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentCard({
  document,
  locale,
}: Readonly<{
  document: Record<string, unknown>;
  locale: string;
}>) {
  const id = document.id as string;
  const name = (document.document_name as string) || (document.name as string) || "Unnamed Document";
  const documentType = document.document_type as string | undefined;
  const description = document.description as string | undefined;

  return (
    <Card className="bg-gradient-to-br from-rose-500/5 to-rose-500/10 border-rose-500/20 hover:border-rose-500/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="shrink-0 w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-rose-600 dark:text-rose-400" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-medium text-sm truncate">{name}</h4>
              {description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {description}
                </p>
              )}
              {documentType && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  {documentType}
                </Badge>
              )}
            </div>
          </div>
          <Link href={`/${locale}/app/documents/${id}`}>
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Generic success/list card for other tool types
function GenericResultCard({
  toolName,
  result,
  success,
  error,
  dict,
}: Readonly<{
  toolName: string;
  result?: unknown;
  success: boolean;
  error?: string;
  dict: Dictionary;
}>) {
  const t = dict.ai || {};
  const toolLabels = (t.toolLabels || {}) as Record<string, string>;

  // Fallback tool labels
  const fallbackLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    list_clients: { label: "Listed clients", icon: <Users className="h-4 w-4" /> },
    search_clients: { label: "Searched clients", icon: <Search className="h-4 w-4" /> },
    get_client_details: { label: "Retrieved client details", icon: <Users className="h-4 w-4" /> },
    list_properties: { label: "Listed properties", icon: <Home className="h-4 w-4" /> },
    search_properties: { label: "Searched properties", icon: <Search className="h-4 w-4" /> },
    list_events: { label: "Listed events", icon: <Calendar className="h-4 w-4" /> },
    query_calendar: { label: "Queried calendar", icon: <Calendar className="h-4 w-4" /> },
    get_upcoming_events: { label: "Retrieved upcoming events", icon: <Calendar className="h-4 w-4" /> },
    find_available_slots: { label: "Found available slots", icon: <Clock className="h-4 w-4" /> },
    list_tasks: { label: "Listed tasks", icon: <ListChecks className="h-4 w-4" /> },
    create_task: { label: "Created task", icon: <ListChecks className="h-4 w-4" /> },
    list_documents: { label: "Listed documents", icon: <FileText className="h-4 w-4" /> },
    analyze_document: { label: "Analyzed document", icon: <FileText className="h-4 w-4" /> },
    find_matches_for_client: { label: "Found matching properties", icon: <Sparkles className="h-4 w-4" /> },
    find_matches_for_property: { label: "Found matching clients", icon: <Sparkles className="h-4 w-4" /> },
    link_entities: { label: "Linked entities", icon: <Link2 className="h-4 w-4" /> },
    draft_message_response: { label: "Drafted message", icon: <MessageSquare className="h-4 w-4" /> },
    get_upcoming_birthdays: { label: "Retrieved upcoming birthdays", icon: <Cake className="h-4 w-4" /> },
    create_reminder: { label: "Created reminder", icon: <Clock className="h-4 w-4" /> },
  };

  const toolInfo = fallbackLabels[toolName] || {
    label: toolLabels[toolName] || toolName.replaceAll("_", " "),
    icon: <Sparkles className="h-4 w-4" />,
  };

  // Count items if result is an array or has a count property
  let itemCount: number | undefined;
  if (result && typeof result === "object") {
    const resultObj = result as Record<string, unknown>;
    if (Array.isArray(resultObj.clients)) itemCount = resultObj.clients.length;
    else if (Array.isArray(resultObj.properties)) itemCount = resultObj.properties.length;
    else if (Array.isArray(resultObj.events)) itemCount = resultObj.events.length;
    else if (Array.isArray(resultObj.documents)) itemCount = resultObj.documents.length;
    else if (Array.isArray(resultObj.tasks)) itemCount = resultObj.tasks.length;
    else if (Array.isArray(resultObj.availableSlots)) itemCount = resultObj.availableSlots.length;
    else if (Array.isArray(resultObj.matches)) itemCount = resultObj.matches.length;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2",
        success
          ? "bg-success/5 border border-success/20"
          : "bg-destructive/5 border border-destructive/20"
      )}
    >
      <div
        className={cn(
          "shrink-0 w-8 h-8 rounded-md flex items-center justify-center",
          success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
        )}
      >
        {success ? toolInfo.icon : <XCircle className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {success ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
          )}
          <span className="text-sm font-medium truncate">{toolInfo.label}</span>
          {itemCount !== undefined && (
            <Badge variant="secondary" className="text-xs ml-auto">
              {itemCount} {itemCount === 1 ? "item" : "items"}
            </Badge>
          )}
        </div>
        {error && (
          <p className="text-xs text-destructive mt-1 truncate">{error}</p>
        )}
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function ToolResultCard({ toolCall, locale, dict }: ToolResultCardProps) {
  const { name, success, result, error } = toolCall;

  // If failed, show generic error card
  if (!success) {
    return (
      <GenericResultCard
        toolName={name}
        result={result}
        success={false}
        error={error}
        dict={dict}
      />
    );
  }

  // Parse result data
  const resultData = result as Record<string, unknown> | undefined;

  // Render specific card based on tool type
  switch (name) {
    case "create_event": {
      const event = resultData?.event as Record<string, unknown> | undefined;
      if (event) {
        return <EventCard event={event} locale={locale} />;
      }
      break;
    }

    case "create_client": {
      const client = resultData?.client as Record<string, unknown> | undefined;
      if (client) {
        return <ClientCard client={client} locale={locale} />;
      }
      break;
    }

    case "create_property": {
      const property = resultData?.property as Record<string, unknown> | undefined;
      if (property) {
        return <PropertyCard property={property} locale={locale} />;
      }
      break;
    }

    case "create_deal": {
      const deal = resultData?.deal as Record<string, unknown> | undefined;
      if (deal) {
        return <DealCard deal={deal} locale={locale} />;
      }
      break;
    }

    case "create_document":
    case "analyze_document": {
      const document = resultData?.document as Record<string, unknown> | undefined;
      if (document) {
        return <DocumentCard document={document} locale={locale} />;
      }
      break;
    }

    // For list/search operations, we could expand to show multiple cards
    // For now, use generic card with count
  }

  // Default: generic result card
  return (
    <GenericResultCard
      toolName={name}
      result={result}
      success={success}
      error={error}
      dict={dict}
    />
  );
}

// ============================================
// Export container for multiple tool results
// ============================================

type ToolResultsContainerProps = Readonly<{
  toolCalls: ToolCallResult[];
  locale: string;
  dict: Dictionary;
}>;

export function ToolResultsContainer({
  toolCalls,
  locale,
  dict,
}: ToolResultsContainerProps) {
  if (!toolCalls || toolCalls.length === 0) return null;

  return (
    <div className="space-y-2 mt-3">
      {toolCalls.map((toolCall) => (
        <ToolResultCard
          key={toolCall.id}
          toolCall={toolCall}
          locale={locale}
          dict={dict}
        />
      ))}
    </div>
  );
}
