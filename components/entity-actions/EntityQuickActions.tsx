"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Plus,
  FileText,
  CalendarPlus,
  Link2,
  Home,
  Users,
  ScrollText,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EntityType = "contact" | "property" | "request";

interface EntityQuickActionsProps {
  /** Which entity view this dropdown lives in */
  entityType: EntityType;
  /** Callbacks — omit any to hide that menu item */
  onCreateMandate?: () => void;
  onCreateEvent?: () => void;
  onLinkProperty?: () => void;
  onLinkClient?: () => void;
  onLinkMandate?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EntityQuickActions({
  entityType,
  onCreateMandate,
  onCreateEvent,
  onLinkProperty,
  onLinkClient,
  onLinkMandate,
}: EntityQuickActionsProps) {
  const hasCreateItems = !!(onCreateMandate || onCreateEvent);
  const hasLinkItems = !!(onLinkProperty || onLinkClient || onLinkMandate);

  if (!hasCreateItems && !hasLinkItems) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" leftIcon={<Plus className="h-4 w-4" />}>
          Quick Add
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {/* ── Create section ────────────────────────── */}
        {hasCreateItems && (
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Create
            </DropdownMenuLabel>
            {onCreateMandate && (
              <DropdownMenuItem onClick={onCreateMandate}>
                <FileText className="mr-2 h-4 w-4" />
                Mandate
              </DropdownMenuItem>
            )}
            {onCreateEvent && (
              <DropdownMenuItem onClick={onCreateEvent}>
                <CalendarPlus className="mr-2 h-4 w-4" />
                Event
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        )}

        {/* ── Link section ──────────────────────────── */}
        {hasLinkItems && (
          <>
            {hasCreateItems && <DropdownMenuSeparator />}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Link
              </DropdownMenuLabel>
              {onLinkProperty && (
                <DropdownMenuItem onClick={onLinkProperty}>
                  <Home className="mr-2 h-4 w-4" />
                  Property
                </DropdownMenuItem>
              )}
              {onLinkClient && (
                <DropdownMenuItem onClick={onLinkClient}>
                  <Users className="mr-2 h-4 w-4" />
                  Client
                </DropdownMenuItem>
              )}
              {onLinkMandate && (
                <DropdownMenuItem onClick={onLinkMandate}>
                  <ScrollText className="mr-2 h-4 w-4" />
                  Mandate
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
