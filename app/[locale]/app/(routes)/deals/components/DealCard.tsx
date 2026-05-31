"use client";

import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "@/navigation";
import { useTranslations, useFormatter } from "next-intl";
import {
  Building2,
  Home,
  MapPin,
  Users as UsersIcon,
  ArrowRight,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────
interface DealAgent {
  id: string;
  name: string | null;
  avatar: string | null;
}

export interface DealCardData {
  id: string;
  friendlyId: string;
  title: string | null;
  stage: string;
  dealType: string | null;
  agreedPrice?: number | string | null;
  monthlyRentAmount?: number | string | null;
  // Property may be absent in list rows that omit the relation
  property?: {
    id: string;
    friendlyId?: string;
    title?: string | null;
    property_name?: string | null;
    property_type?: string | null;
    address_city?: string | null;
    price?: number | string | null;
  } | null;
  listingAgent?: DealAgent | null;
  buyerAgent?: DealAgent | null;
  // Accept rows that only have party IDs — the contact display is optional
  dealParties?: Array<{
    id: string;
    contact?: { id: string; displayName?: string | null } | null;
  }>;
  createdAt: string | Date;
  commissionCurrency?: string | null;
}

interface DealCardProps {
  deal: DealCardData;
  /** Optional index for image priority loading (parity with PropertyCard). */
  index?: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────
const initials = (name: string | null | undefined): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase();
};

// ── Component ───────────────────────────────────────────────────────────
/**
 * DealCard — single deal card for the grid view.
 *
 * Memoised so VirtualizedGrid can re-render efficiently when only a few
 * cards change. Click anywhere on the card navigates to the deal detail
 * page using the friendlyId (never expose internal CUIDs in URLs).
 */
export const DealCard = memo(function DealCard({ deal }: DealCardProps) {
  const t = useTranslations("deals");
  const format = useFormatter();

  const property = deal.property;
  const propertyName =
    property?.title ||
    property?.property_name ||
    deal.title ||
    deal.friendlyId;

  // Decide which money figure to surface (rental shows monthly rent)
  const isRental = deal.dealType === "RENT";
  const moneyValue = isRental
    ? deal.monthlyRentAmount ?? null
    : deal.agreedPrice ?? property?.price ?? null;

  const moneyLabel = isRental ? t("list.monthlyRent") : t("list.agreedPrice");

  const partyCount = deal.dealParties?.length ?? 0;

  return (
    <Link
      href={`/app/deals/${deal.friendlyId}`}
      className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
      aria-label={`${propertyName} — ${deal.friendlyId}`}
    >
      <Card className="h-full overflow-hidden transition-colors hover:border-primary/50 hover:shadow-sm cursor-pointer flex flex-col">
        {/* ── Header strip: stage badge + dealType ── */}
        <div className="flex items-center justify-between gap-2 px-4 pt-4">
          <StatusBadge
            entityType="deal"
            status={deal.stage}
            // next-intl requires string literal keys for type inference; we
            // know the runtime values are valid DealStage enum members.
            label={t(`stage.${deal.stage}` as Parameters<typeof t>[0])}
            size="sm"
          />
          {deal.dealType && (
            <Badge variant="outline" className="text-[10px]">
              <Tag className="h-3 w-3 mr-1" aria-hidden="true" />
              {t(`dealType.${deal.dealType}` as Parameters<typeof t>[0])}
            </Badge>
          )}
        </div>

        <CardContent className="p-4 pt-3 flex flex-col gap-3 flex-1">
          {/* ── Property name + friendly id ── */}
          <div className="space-y-0.5">
            <h3
              className="font-semibold text-sm leading-tight line-clamp-2"
              title={propertyName}
            >
              {propertyName}
            </h3>
            <p className="text-xs text-muted-foreground font-mono">
              {deal.friendlyId}
            </p>
          </div>

          {/* ── Property metadata ── */}
          <div className="space-y-1 text-xs text-muted-foreground">
            {property?.property_type && (
              <div className="flex items-center gap-1.5">
                <Home className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{property.property_type}</span>
              </div>
            )}
            {property?.address_city && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{property.address_city}</span>
              </div>
            )}
            {partyCount > 0 && (
              <div className="flex items-center gap-1.5">
                <UsersIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span>{t("list.parties", { count: partyCount })}</span>
              </div>
            )}
          </div>

          {/* ── Money + agents row (pushed to bottom) ── */}
          <div className="mt-auto pt-3 border-t flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {moneyLabel}
              </p>
              <p className="text-sm font-semibold text-foreground truncate">
                {moneyValue != null
                  ? format.number(Number(moneyValue), {
                      style: "currency",
                      currency: deal.commissionCurrency || "EUR",
                      maximumFractionDigits: 0,
                    })
                  : "—"}
              </p>
            </div>

            <div className="flex items-center -space-x-2 shrink-0">
              {deal.listingAgent && (
                <Avatar className="h-7 w-7 border-2 border-background">
                  <AvatarImage
                    src={deal.listingAgent.avatar ?? undefined}
                    alt={deal.listingAgent.name ?? ""}
                  />
                  <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                    {initials(deal.listingAgent.name)}
                  </AvatarFallback>
                </Avatar>
              )}
              {deal.buyerAgent && (
                <Avatar className="h-7 w-7 border-2 border-background">
                  <AvatarImage
                    src={deal.buyerAgent.avatar ?? undefined}
                    alt={deal.buyerAgent.name ?? ""}
                  />
                  <AvatarFallback className="text-[10px] bg-success/10 text-success">
                    {initials(deal.buyerAgent.name)}
                  </AvatarFallback>
                </Avatar>
              )}
              {!deal.listingAgent && !deal.buyerAgent && (
                <span className="text-xs text-muted-foreground">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
});

export default DealCard;
