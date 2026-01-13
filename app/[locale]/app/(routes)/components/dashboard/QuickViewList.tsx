"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowRight, Loader2, MoreHorizontal, BedDouble, Bath, Ruler, MapPin, Home } from "lucide-react";
import moment from "moment";
import { useToast } from "@/components/ui/use-toast";

interface QuickViewItem {
  id: string;
  name?: string;
  property_name?: string;
  client_name?: string;
  status?: string | null;
  email?: string | null;
  primary_email?: string;
  createdAt: Date | string;
  assigned_to_user?: { name: string | null } | null;
  property_status?: string;
  client_status?: string | null;
  // Property-specific fields
  price?: number | null;
  property_type?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  square_feet?: number | null;
  address_city?: string | null;
  image_url?: string | null;
}

interface QuickViewListProps {
  title: string;
  items: QuickViewItem[];
  viewAllHref: string;
  icon?: React.ReactNode;
  getStatusLabel?: (item: QuickViewItem) => string;
  getStatusColor?: (status: string) => string;
}

// Status color mapping (returning variant names for Badge)
const getPropertyStatusVariant = (status: string): string => {
  const variants: Record<string, string> = {
    ACTIVE: "success",
    PENDING: "warning",
    SOLD: "info",
    OFF_MARKET: "secondary",
    WITHDRAWN: "destructive",
  };
  return variants[status] || "secondary";
};

const getClientStatusVariant = (status: string): string => {
  const variants: Record<string, string> = {
    LEAD: "info",
    ACTIVE: "success",
    INACTIVE: "secondary",
    CONVERTED: "purple",
    LOST: "destructive",
  };
  return variants[status] || "secondary";
};

const getPropertyStatusLabel = (status: string, t: (key: string) => string): string => {
  const statusKey = `statusLabels.property.${status}`;
  const translated = t(statusKey);
  // If translation returns the key itself, it means the key doesn't exist, fallback to status
  return translated !== statusKey ? translated : status;
};

const getClientStatusLabel = (status: string, t: (key: string) => string): string => {
  const statusKey = `statusLabels.client.${status}`;
  const translated = t(statusKey);
  return translated !== statusKey ? translated : status;
};

// Property type labels mapping
const propertyTypeLabels: Record<string, string> = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  LAND: "Land",
  RENTAL: "Rental",
  VACATION: "Vacation",
  APARTMENT: "Apartment",
  HOUSE: "House",
  MAISONETTE: "Maisonette",
  WAREHOUSE: "Warehouse",
  PARKING: "Parking",
  PLOT: "Plot",
  FARM: "Farm",
  INDUSTRIAL: "Industrial",
  OTHER: "Other",
};

const formatPrice = (price: number | null | undefined): string => {
  if (!price) return "";
  return `€${price.toLocaleString("en-US")}`;
};

export const QuickViewList: React.FC<QuickViewListProps> = ({
  title,
  items,
  viewAllHref,
  icon,
  getStatusLabel,
  getStatusColor,
}) => {
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  const locale = useLocale();
  const isProperties = viewAllHref.includes("mls");
  const router = useRouter();
  const { toast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const getStatusInfo = (item: QuickViewItem) => {
    const status = item.property_status || item.client_status || item.status;
    if (!status) return { label: tCommon("statusLabels.na"), variant: "secondary" };
    
    if (getStatusLabel && getStatusColor) {
      // If parent provides custom logic, we assume it returns a class string or variant
      // We'll map it to a variant if it matches known ones, or pass as class if needed (though Badge variant is preferred)
      // For now, assuming parent logic is compatible or we use it as variant
      return {
        label: getStatusLabel(item),
        variant: getStatusColor(status),
      };
    }
    
    if (isProperties) {
      return {
        label: getPropertyStatusLabel(status, tCommon),
        variant: getPropertyStatusVariant(status),
      };
    } else {
      return {
        label: getClientStatusLabel(status, tCommon),
        variant: getClientStatusVariant(status),
      };
    }
  };

  const handleDelete = async (item: QuickViewItem, displayName: string) => {
    const deleteEndpoint = isProperties ? `/api/mls/properties/${item.id}` : `/api/crm/account/${item.id}`;
    const shouldDelete = window.confirm(
      tDashboard("deleteConfirmation", { name: displayName })
    );
    if (!shouldDelete) return;

    setDeletingId(item.id);
    try {
      const response = await fetch(deleteEndpoint, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      toast({
        title: tCommon("success"),
        description: isProperties ? tDashboard("propertyDeleted") : tDashboard("clientDeleted"),
      });

      router.refresh();
    } catch (error) {
      console.error("Failed to delete item", error);
      toast({
        variant: "destructive",
        title: tCommon("error"),
        description: tDashboard("deleteError"),
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={viewAllHref} className="flex items-center gap-1">
            {tCommon("viewAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4 text-center">
            {isProperties 
              ? tDashboard("noRecentProperties")
              : tDashboard("noRecentClients")}
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const statusInfo = getStatusInfo(item);
              const displayName = item.name || item.property_name || item.client_name || tCommon("unnamed");
              const displayEmail = item.email || item.primary_email;
              const viewHref = isProperties ? `/${locale}/app/mls/properties/${item.id}` : `/${locale}/app/crm/clients/${item.id}`;
              const editHref = `${viewHref}?action=edit`;
              const isDeleting = deletingId === item.id;
              
              // Property-specific display
              if (isProperties) {
                const hasDetails = item.bedrooms || item.bathrooms || item.square_feet;
                const propertyTypeLabel = item.property_type ? propertyTypeLabels[item.property_type] || item.property_type : null;
                
                return (
                  <Link
                    key={item.id}
                    href={viewHref}
                    className="block rounded-lg border bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200"
                  >
                    <div className="flex gap-3 p-3">
                      {/* Property thumbnail */}
                      <div className="relative h-20 w-20 flex-shrink-0 rounded-md bg-muted overflow-hidden">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={displayName}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Home className="h-8 w-8" />
                          </div>
                        )}
                      </div>
                      
                      {/* Property info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm truncate">{displayName}</p>
                            {item.address_city && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{item.address_city}</span>
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Badge
                              variant={statusInfo.variant as any}
                              className="whitespace-nowrap text-xs"
                            >
                              {statusInfo.label}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                  <span className="sr-only">{tCommon("actions")}</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem asChild>
                                  <Link href={viewHref} className="w-full">
                                    {tCommon("view")}
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link href={editHref} className="w-full">
                                    {tCommon("edit")}
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    handleDelete(item, displayName);
                                  }}
                                  disabled={isDeleting}
                                >
                                  {isDeleting && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  )}
                                  {tCommon("delete")}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        {/* Price and type row */}
                        <div className="flex items-center gap-2 mt-1.5">
                          {item.price && (
                            <span className="font-bold text-sm text-primary">
                              {formatPrice(item.price)}
                            </span>
                          )}
                          {propertyTypeLabel && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {propertyTypeLabel}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Property details row */}
                        {hasDetails && (
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            {item.bedrooms && (
                              <span className="flex items-center gap-1">
                                <BedDouble className="h-3 w-3" />
                                {item.bedrooms}
                              </span>
                            )}
                            {item.bathrooms && (
                              <span className="flex items-center gap-1">
                                <Bath className="h-3 w-3" />
                                {item.bathrooms}
                              </span>
                            )}
                            {item.square_feet && (
                              <span className="flex items-center gap-1">
                                <Ruler className="h-3 w-3" />
                                {item.square_feet.toLocaleString()} ft²
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              }
              
              // Client card (original design)
              return (
                <div
                  key={item.id}
                  className="rounded-lg border bg-card p-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{displayName}</p>
                    <Badge
                      variant={statusInfo.variant as any}
                      className="whitespace-nowrap"
                    >
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    {displayEmail && (
                      <span className="truncate max-w-[150px]">{displayEmail}</span>
                    )}
                    {item.assigned_to_user?.name && (
                      <span className="truncate">
                        {tCommon("assigned")} {item.assigned_to_user.name}
                      </span>
                    )}
                    <span>{moment(item.createdAt).format("MMM DD, YYYY")}</span>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">{tCommon("actions")}</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild>
                          <Link href={viewHref} className="w-full">
                            {tCommon("view")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={editHref} className="w-full">
                            {tCommon("edit")}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => handleDelete(item, displayName)}
                          disabled={isDeleting}
                        >
                          {isDeleting && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          {tCommon("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
