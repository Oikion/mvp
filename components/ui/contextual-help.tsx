"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  HelpCircle,
  Info,
  Lightbulb,
  ExternalLink,
  ChevronRight,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

/**
 * ContextualHelp - Help system for Heuristic #10 (Help & Documentation)
 *
 * Provides multiple help patterns:
 * - HelpButton: Expandable help popover
 * - HelpTip: Quick inline tip
 * - FeatureHighlight: New feature callout
 * - HelpLink: Link to documentation
 * - QuickTip: Contextual suggestion
 *
 * @example
 * ```tsx
 * // Help button with detailed content
 * <HelpButton title="About Properties">
 *   <p>Properties are your real estate listings...</p>
 * </HelpButton>
 *
 * // Quick inline tip
 * <HelpTip>Press Cmd+K to search anywhere</HelpTip>
 *
 * // New feature highlight
 * <FeatureHighlight
 *   title="New: Bulk Export"
 *   description="Export multiple properties at once"
 *   learnMoreHref="/docs/export"
 *   onDismiss={() => markAsSeen('bulk-export')}
 * />
 * ```
 */

// ============================================================================
// HelpButton - Expandable help popover
// ============================================================================

export interface HelpButtonProps {
  /**
   * Help content title
   */
  title?: string;
  /**
   * Help content (can be string or JSX)
   */
  children: React.ReactNode;
  /**
   * Icon variant
   */
  variant?: "help" | "info" | "tip";
  /**
   * Button size
   */
  size?: "sm" | "default";
  /**
   * Additional actions or links
   */
  actions?: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
  }>;
  /**
   * Popover side
   */
  side?: "top" | "right" | "bottom" | "left";
  /**
   * Custom trigger class
   */
  triggerClassName?: string;
}

const variantIcons: Record<NonNullable<HelpButtonProps["variant"]>, LucideIcon> = {
  help: HelpCircle,
  info: Info,
  tip: Lightbulb,
};

export function HelpButton({
  title,
  children,
  variant = "help",
  size = "default",
  actions,
  side = "top",
  triggerClassName,
}: Readonly<HelpButtonProps>) {
  const Icon = variantIcons[variant];
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center rounded-full",
            "text-muted-foreground hover:text-foreground hover:bg-accent",
            "transition-colors focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-ring focus-visible:ring-offset-2",
            size === "sm" ? "h-5 w-5" : "h-6 w-6",
            triggerClassName
          )}
          aria-label="Help"
        >
          <Icon className={iconSize} />
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} className="w-80 p-0">
        {title && (
          <div className="border-b px-4 py-3">
            <h4 className="font-semibold text-sm">{title}</h4>
          </div>
        )}
        <div className="px-4 py-3 text-sm text-muted-foreground">
          {children}
        </div>
        {actions && actions.length > 0 && (
          <div className="border-t px-4 py-2 bg-muted/50">
            <div className="flex flex-wrap gap-2">
              {actions.map((action) =>
                action.href ? (
                  <a
                    key={action.label}
                    href={action.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    {action.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    className="text-xs text-primary hover:underline"
                  >
                    {action.label}
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// HelpTip - Quick inline tooltip hint
// ============================================================================

export interface HelpTipProps {
  /**
   * Tip content
   */
  children: React.ReactNode;
  /**
   * Icon to show
   */
  icon?: LucideIcon;
  /**
   * Tooltip side
   */
  side?: "top" | "right" | "bottom" | "left";
  /**
   * Additional class
   */
  className?: string;
}

export function HelpTip({
  children,
  icon: Icon = Lightbulb,
  side = "top",
  className,
}: Readonly<HelpTipProps>) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs text-muted-foreground cursor-help",
              className
            )}
          >
            <Icon className="h-3 w-3" />
          </span>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <p className="text-xs">{children}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// FeatureHighlight - New feature callout
// ============================================================================

export interface FeatureHighlightProps {
  /**
   * Feature title
   */
  title: string;
  /**
   * Feature description
   */
  description?: string;
  /**
   * Link to documentation
   */
  learnMoreHref?: string;
  /**
   * Handler when user dismisses
   */
  onDismiss?: () => void;
  /**
   * Handler when user clicks "Try it"
   */
  onTryIt?: () => void;
  /**
   * Visual variant
   */
  variant?: "banner" | "card" | "inline";
  /**
   * Whether this is a new feature
   */
  isNew?: boolean;
  /**
   * Custom icon
   */
  icon?: LucideIcon;
  /**
   * Additional class
   */
  className?: string;
}

export function FeatureHighlight({
  title,
  description,
  learnMoreHref,
  onDismiss,
  onTryIt,
  variant = "banner",
  isNew = true,
  icon: Icon = Lightbulb,
  className,
}: Readonly<FeatureHighlightProps>) {
  const t = useTranslations("common");

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 text-sm text-info",
          className
        )}
      >
        <Icon className="h-4 w-4" />
        <span>{title}</span>
        {isNew && (
          <Badge variant="info" size="sm">
            {t("new")}
          </Badge>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground ml-1"
            aria-label="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "relative rounded-lg border border-info/30 bg-info/5 p-4",
          className
        )}
      >
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-info/10 p-2">
            <Icon className="h-5 w-5 text-info" />
          </div>
          <div className="flex-1 pr-6">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm">{title}</h4>
              {isNew && (
                <Badge variant="info" size="sm">
                  {t("new")}
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted-foreground mb-3">
                {description}
              </p>
            )}
            <div className="flex items-center gap-3">
              {onTryIt && (
                <Button size="sm" onClick={onTryIt}>
                  {t("tryIt")}
                </Button>
              )}
              {learnMoreHref && (
                <a
                  href={learnMoreHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {t("learnMore")}
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: banner
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg bg-info/10 px-4 py-3",
        className
      )}
    >
      <Icon className="h-5 w-5 text-info shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{title}</span>
          {isNew && (
            <Badge variant="info" size="sm">
              {t("new")}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground truncate">
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onTryIt && (
          <Button size="sm" variant="default" onClick={onTryIt}>
            {t("tryIt")}
          </Button>
        )}
        {learnMoreHref && (
          <a
            href={learnMoreHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            {t("learnMore")}
            <ChevronRight className="h-3 w-3" />
          </a>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// QuickTip - Contextual suggestion
// ============================================================================

export interface QuickTipProps {
  /**
   * Tip content
   */
  children: React.ReactNode;
  /**
   * Whether to show dismiss button
   */
  dismissable?: boolean;
  /**
   * Handler when dismissed
   */
  onDismiss?: () => void;
  /**
   * Visual variant
   */
  variant?: "default" | "subtle" | "accent";
  /**
   * Icon
   */
  icon?: LucideIcon;
  /**
   * Additional class
   */
  className?: string;
}

export function QuickTip({
  children,
  dismissable = false,
  onDismiss,
  variant = "default",
  icon: Icon = Lightbulb,
  className,
}: Readonly<QuickTipProps>) {
  const [dismissed, setDismissed] = React.useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const variantStyles = {
    default: "bg-muted/50 text-muted-foreground",
    subtle: "bg-transparent text-muted-foreground",
    accent: "bg-primary/5 text-primary",
  };

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md px-3 py-2 text-sm",
        variantStyles[variant],
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">{children}</div>
      {dismissable && (
        <button
          type="button"
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="Dismiss tip"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

// ============================================================================
// HelpLink - Documentation link
// ============================================================================

export interface HelpLinkProps {
  /**
   * Link text
   */
  children: React.ReactNode;
  /**
   * Documentation URL
   */
  href: string;
  /**
   * Whether to open in new tab
   */
  external?: boolean;
  /**
   * Additional class
   */
  className?: string;
}

export function HelpLink({
  children,
  href,
  external = true,
  className,
}: Readonly<HelpLinkProps>) {
  const linkProps = external
    ? { target: "_blank", rel: "noopener noreferrer" }
    : {};

  return (
    <a
      href={href}
      {...linkProps}
      className={cn(
        "inline-flex items-center gap-1 text-sm text-primary hover:underline",
        className
      )}
    >
      {children}
      {external && <ExternalLink className="h-3 w-3" />}
    </a>
  );
}

// ============================================================================
// FieldHelp - Form field help text with tooltip
// ============================================================================

export interface FieldHelpProps {
  /**
   * Help text content
   */
  children: React.ReactNode;
  /**
   * Whether to show as tooltip (true) or inline text (false)
   */
  asTooltip?: boolean;
  /**
   * Additional class
   */
  className?: string;
}

export function FieldHelp({
  children,
  asTooltip = false,
  className,
}: Readonly<FieldHelpProps>) {
  if (asTooltip) {
    return <HelpTip className={className}>{children}</HelpTip>;
  }

  return (
    <p className={cn("text-xs text-muted-foreground mt-1", className)}>
      {children}
    </p>
  );
}

export default {
  HelpButton,
  HelpTip,
  FeatureHighlight,
  QuickTip,
  HelpLink,
  FieldHelp,
};
