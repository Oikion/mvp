"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/**
 * PageHeader - Standardized page header component
 *
 * Provides consistent page header styling with:
 * - Optional back navigation
 * - Title and description
 * - Action buttons area
 * - Responsive layout
 *
 * @example
 * ```tsx
 * // Basic usage
 * <PageHeader
 *   title="Properties"
 *   description="Manage your property listings"
 * />
 *
 * // With actions
 * <PageHeader
 *   title="Properties"
 *   description="Manage your property listings"
 *   actions={<Button>Add Property</Button>}
 * />
 *
 * // With back button
 * <PageHeader
 *   title="Property Details"
 *   showBack
 *   actions={
 *     <div className="flex gap-2">
 *       <Button variant="outline">Edit</Button>
 *       <Button variant="destructive">Delete</Button>
 *     </div>
 *   }
 * />
 *
 * // Detail page variant
 * <PageHeader
 *   title={property.name}
 *   description={`ID: ${property.id}`}
 *   variant="detail"
 *   showBack
 *   backHref="/mls/properties"
 * />
 * ```
 */

export interface PageHeaderProps {
  /**
   * Page title
   */
  title: React.ReactNode;
  /**
   * Page description or subtitle
   */
  description?: React.ReactNode;
  /**
   * Action buttons to display on the right
   */
  actions?: React.ReactNode;
  /**
   * Whether to show the back button
   */
  showBack?: boolean;
  /**
   * Custom back navigation href (uses router.back() if not provided)
   */
  backHref?: string;
  /**
   * Back button label for accessibility
   */
  backLabel?: string;
  /**
   * Variant affecting layout and styling
   */
  variant?: "default" | "detail" | "compact";
  /**
   * Whether to show a separator below the header
   */
  showSeparator?: boolean;
  /**
   * Additional class name
   */
  className?: string;
  /**
   * Children to render below title/description
   */
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  actions,
  showBack = false,
  backHref,
  backLabel = "Go back",
  variant = "default",
  showSeparator = false,
  className,
  children,
}: Readonly<PageHeaderProps>) {
  const router = useRouter();

  const handleBack = React.useCallback(() => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  }, [backHref, router]);

  const isCompact = variant === "compact";
  const isDetail = variant === "detail";

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
          isCompact && "gap-2"
        )}
      >
        <div className="flex items-start gap-3">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-9 w-9 shrink-0 -ml-2"
              aria-label={backLabel}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="space-y-1">
            {typeof title === "string" ? (
              <h1
                className={cn(
                  "font-semibold tracking-tight",
                  isCompact ? "text-xl" : "text-2xl sm:text-3xl",
                  isDetail && "text-xl sm:text-2xl"
                )}
              >
                {title}
              </h1>
            ) : (
              title
            )}
            {description && (
              <p
                className={cn(
                  "text-muted-foreground",
                  isCompact ? "text-xs" : "text-sm"
                )}
              >
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div
            className={cn(
              "flex items-center gap-2 shrink-0",
              "flex-wrap sm:flex-nowrap",
              showBack && "sm:ml-0"
            )}
          >
            {actions}
          </div>
        )}
      </div>
      {children}
      {showSeparator && <Separator />}
    </div>
  );
}

/**
 * PageSection - Section header within a page
 *
 * @example
 * ```tsx
 * <PageSection
 *   title="Recent Activity"
 *   description="Your latest actions"
 *   actions={<Button size="sm">View All</Button>}
 * />
 * ```
 */
export function PageSection({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * PageActions - Wrapper for page action buttons with consistent styling
 *
 * @example
 * ```tsx
 * <PageActions>
 *   <Button variant="outline">Cancel</Button>
 *   <Button>Save</Button>
 * </PageActions>
 * ```
 */
export function PageActions({
  children,
  className,
  align = "right",
}: {
  children: React.ReactNode;
  className?: string;
  align?: "left" | "center" | "right";
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2",
        align === "left" && "justify-start",
        align === "center" && "justify-center",
        align === "right" && "justify-end",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * DetailHeader - Specialized header for detail/view pages
 *
 * @example
 * ```tsx
 * <DetailHeader
 *   title={client.name}
 *   subtitle={client.email}
 *   status={<StatusBadge entityType="client" status={client.status} />}
 *   actions={
 *     <>
 *       <Button variant="outline">Edit</Button>
 *       <Button variant="destructive">Delete</Button>
 *     </>
 *   }
 * />
 * ```
 */
export function DetailHeader({
  title,
  subtitle,
  status,
  actions,
  showBack = true,
  backHref,
  className,
}: {
  title: string;
  subtitle?: string;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  showBack?: boolean;
  backHref?: string;
  className?: string;
}) {
  const router = useRouter();

  const handleBack = React.useCallback(() => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  }, [backHref, router]);

  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="h-9 w-9 shrink-0 -ml-2 mt-0.5"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-semibold sm:text-2xl">{title}</h1>
            {status}
          </div>
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          {actions}
        </div>
      )}
    </div>
  );
}
