"use client";

import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, type EmptyStateType } from "@/components/ui/empty-state";

/**
 * ResponsiveTable - Wrapper that shows table on desktop and cards on mobile
 *
 * Provides a standardized pattern for responsive data tables:
 * - Full table view on desktop (md and above)
 * - Card/list view on mobile
 * - Consistent loading states
 * - Empty state handling
 *
 * @example
 * ```tsx
 * <ResponsiveTable
 *   data={clients}
 *   isLoading={isLoading}
 *   emptyStateType="clients"
 *   onCreateNew={() => router.push("/crm/clients/new")}
 *   renderTable={(data) => <ClientsTable data={data} />}
 *   renderCard={(item) => <ClientCard client={item} />}
 * />
 * ```
 */

export interface ResponsiveTableProps<T> {
  /**
   * Data to display
   */
  data: T[];
  /**
   * Whether data is loading
   */
  isLoading?: boolean;
  /**
   * Render the desktop table view
   */
  renderTable: (data: T[]) => React.ReactNode;
  /**
   * Render a single card for mobile view
   */
  renderCard: (item: T, index: number) => React.ReactNode;
  /**
   * Key extractor for list rendering
   */
  getKey: (item: T) => string | number;
  /**
   * Empty state type for consistent empty states
   */
  emptyStateType?: EmptyStateType;
  /**
   * Custom empty state title
   */
  emptyStateTitle?: string;
  /**
   * Custom empty state description
   */
  emptyStateDescription?: string;
  /**
   * Handler for create new action in empty state
   */
  onCreateNew?: () => void;
  /**
   * Number of skeleton cards to show while loading (mobile)
   */
  loadingCardCount?: number;
  /**
   * Additional class name for the container
   */
  className?: string;
  /**
   * Class name for the cards container (mobile)
   */
  cardsClassName?: string;
}

export function ResponsiveTable<T>({
  data,
  isLoading = false,
  renderTable,
  renderCard,
  getKey,
  emptyStateType = "generic",
  emptyStateTitle,
  emptyStateDescription,
  onCreateNew,
  loadingCardCount = 3,
  className,
  cardsClassName,
}: Readonly<ResponsiveTableProps<T>>) {
  const isMobile = useIsMobile();

  // Loading state
  if (isLoading) {
    if (isMobile) {
      return (
        <div className={cn("space-y-3", className, cardsClassName)}>
          {Array.from({ length: loadingCardCount }).map((_, index) => (
            <ResponsiveCardSkeleton key={index} />
          ))}
        </div>
      );
    }
    return (
      <div className={cn("rounded-md border", className)}>
        <ResponsiveTableSkeleton rows={5} />
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          type={emptyStateType}
          title={emptyStateTitle}
          description={emptyStateDescription}
          onAction={onCreateNew}
        />
      </div>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <div className={cn("space-y-3", className, cardsClassName)}>
        {data.map((item, index) => (
          <div key={getKey(item)}>{renderCard(item, index)}</div>
        ))}
      </div>
    );
  }

  // Desktop table view
  return <div className={className}>{renderTable(data)}</div>;
}

/**
 * ResponsiveCard - Standardized card for mobile table rows
 *
 * Provides consistent styling for mobile card view items.
 *
 * @example
 * ```tsx
 * <ResponsiveCard
 *   title="John Smith"
 *   subtitle="john@example.com"
 *   badge={{ label: "Active", variant: "success" }}
 *   metadata={["Created 2 days ago", "3 properties"]}
 *   actions={<DropdownMenu>...</DropdownMenu>}
 * />
 * ```
 */

export interface ResponsiveCardProps {
  /**
   * Main title
   */
  title: React.ReactNode;
  /**
   * Subtitle or secondary text
   */
  subtitle?: React.ReactNode;
  /**
   * Optional badge
   */
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info";
  };
  /**
   * Metadata items to display
   */
  metadata?: React.ReactNode[];
  /**
   * Actions (typically a dropdown menu)
   */
  actions?: React.ReactNode;
  /**
   * Click handler for the card
   */
  onClick?: () => void;
  /**
   * Additional class name
   */
  className?: string;
  /**
   * Children for custom content
   */
  children?: React.ReactNode;
}

export function ResponsiveCard({
  title,
  subtitle,
  badge,
  metadata,
  actions,
  onClick,
  className,
  children,
}: Readonly<ResponsiveCardProps>) {
  const isClickable = !!onClick;

  return (
    <Card
      className={cn(
        "relative",
        isClickable && "cursor-pointer hover:bg-accent/50 transition-colors",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm truncate">{title}</h3>
              {badge && (
                <Badge variant={badge.variant ?? "secondary"} className="shrink-0">
                  {badge.label}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
              {actions}
            </div>
          )}
        </div>
      </CardHeader>
      {(metadata || children) && (
        <CardContent className="p-4 pt-0">
          {metadata && metadata.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {metadata.map((item, index) => (
                <span key={index} className="flex items-center gap-1">
                  {item}
                </span>
              ))}
            </div>
          )}
          {children}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * ResponsiveTableSkeleton - Loading skeleton for desktop table
 */
export function ResponsiveTableSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="border-b px-4 py-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b px-4 py-3 flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * ResponsiveCardSkeleton - Loading skeleton for mobile cards
 */
export function ResponsiveCardSkeleton() {
  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex gap-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * useResponsiveTable - Hook for managing responsive table state
 *
 * @example
 * ```tsx
 * const { isMobile, viewMode, setViewMode } = useResponsiveTable();
 * ```
 */
export function useResponsiveTable() {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = React.useState<"table" | "cards">("table");

  // Auto-switch to cards on mobile
  React.useEffect(() => {
    if (isMobile) {
      setViewMode("cards");
    }
  }, [isMobile]);

  return {
    isMobile,
    viewMode,
    setViewMode,
    isTableView: viewMode === "table" && !isMobile,
    isCardView: viewMode === "cards" || isMobile,
  };
}
