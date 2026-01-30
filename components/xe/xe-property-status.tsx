"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Globe, CheckCircle2, XCircle, Clock, Loader2, Info } from "lucide-react";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { getPropertyXeStatus } from "@/actions/xe";
import type { XeSyncItemStatus } from "@prisma/client";

// ============================================
// TYPES
// ============================================

interface XePropertyStatusProps {
  propertyId: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

interface XePropertyStatusBadgeProps {
  isPublished: boolean;
  status?: XeSyncItemStatus | null;
  lastSync?: Date | null;
  xeRefId?: string | null;
  showLabel?: boolean;
  size?: "sm" | "md";
}

// ============================================
// STATUS BADGE COMPONENT
// ============================================

export function XePropertyStatusBadge({
  isPublished,
  status,
  lastSync,
  xeRefId,
  showLabel = true,
  size = "md",
}: XePropertyStatusBadgeProps) {
  const locale = useLocale() as "en" | "el";
  const dateLocale = locale === "el" ? el : enUS;
  
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const badgeClass = size === "sm" ? "text-xs px-1.5 py-0" : "";

  if (!isPublished && !status) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`text-muted-foreground ${badgeClass}`}
            >
              <Globe className={`${iconSize} ${showLabel ? "mr-1" : ""}`} />
              {showLabel && (locale === "el" ? "Μη δημοσιευμένο" : "Not published")}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {locale === "el"
                ? "Δεν έχει δημοσιευτεί στο xe.gr"
                : "Not published to xe.gr"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const getBadgeContent = () => {
    if (status === "SUCCESS" || (isPublished && !status)) {
      return {
        variant: "default" as const,
        className: "bg-success/10 text-success hover:bg-success/20",
        icon: <CheckCircle2 className={iconSize} />,
        label: locale === "el" ? "Στο xe.gr" : "On xe.gr",
        tooltipText: locale === "el" ? "Δημοσιευμένο στο xe.gr" : "Published on xe.gr",
      };
    }
    
    if (status === "PENDING") {
      return {
        variant: "secondary" as const,
        className: "bg-warning/10 text-warning",
        icon: <Clock className={iconSize} />,
        label: locale === "el" ? "Σε εκκρεμότητα" : "Pending",
        tooltipText: locale === "el" ? "Αναμένεται επιβεβαίωση από xe.gr" : "Awaiting confirmation from xe.gr",
      };
    }
    
    if (status === "FAILED") {
      return {
        variant: "destructive" as const,
        className: "",
        icon: <XCircle className={iconSize} />,
        label: locale === "el" ? "Αποτυχία" : "Failed",
        tooltipText: locale === "el" ? "Αποτυχία δημοσίευσης στο xe.gr" : "Failed to publish to xe.gr",
      };
    }

    return {
      variant: "outline" as const,
      className: "",
      icon: <Globe className={iconSize} />,
      label: locale === "el" ? "Άγνωστο" : "Unknown",
      tooltipText: "",
    };
  };

  const content = getBadgeContent();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Badge
          variant={content.variant}
          className={`cursor-pointer ${content.className} ${badgeClass}`}
        >
          {content.icon}
          {showLabel && <span className="ml-1">{content.label}</span>}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="start">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-success" />
            <span className="font-medium">xe.gr</span>
          </div>
          
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {locale === "el" ? "Κατάσταση:" : "Status:"}
              </span>
              <span>{content.label}</span>
            </div>
            
            {lastSync && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {locale === "el" ? "Τελ. συγχρονισμός:" : "Last sync:"}
                </span>
                <span>
                  {format(new Date(lastSync), "dd MMM yyyy HH:mm", {
                    locale: dateLocale,
                  })}
                </span>
              </div>
            )}
            
            {xeRefId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ref ID:</span>
                <span className="font-mono text-xs truncate max-w-[120px]">
                  {xeRefId}
                </span>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// ASYNC STATUS COMPONENT
// ============================================

export function XePropertyStatus({
  propertyId,
  showLabel = true,
  size = "md",
}: XePropertyStatusProps) {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<{
    isPublished: boolean;
    xeRefId: string | null;
    lastSync: Date | null;
    status: XeSyncItemStatus | null;
  } | null>(null);

  useEffect(() => {
    loadStatus();
  }, [propertyId]);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const result = await getPropertyXeStatus(propertyId);
      setStatus(result);
    } catch (error) {
      console.error("Failed to load XE status:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Badge variant="outline" className={size === "sm" ? "text-xs px-1.5 py-0" : ""}>
        <Loader2 className={`${size === "sm" ? "h-3 w-3" : "h-4 w-4"} animate-spin`} />
      </Badge>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <XePropertyStatusBadge
      isPublished={status.isPublished}
      status={status.status}
      lastSync={status.lastSync}
      xeRefId={status.xeRefId}
      showLabel={showLabel}
      size={size}
    />
  );
}

// ============================================
// COMPACT STATUS INDICATOR
// ============================================

interface XeStatusIndicatorProps {
  isPublished: boolean;
  className?: string;
}

export function XeStatusIndicator({ isPublished, className }: XeStatusIndicatorProps) {
  const locale = useLocale() as "en" | "el";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`flex items-center ${className}`}>
            {isPublished ? (
              <div className="h-2 w-2 rounded-full bg-success" />
            ) : (
              <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isPublished
              ? locale === "el"
                ? "Δημοσιευμένο στο xe.gr"
                : "Published on xe.gr"
              : locale === "el"
                ? "Δεν έχει δημοσιευτεί στο xe.gr"
                : "Not published to xe.gr"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
