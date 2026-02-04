"use client";

import * as React from "react";
import { Info, HelpCircle, AlertCircle, type LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * InfoTooltip - Standardized icon + tooltip pattern
 *
 * Provides consistent tooltip display for help text, info, and warnings.
 *
 * @example
 * ```tsx
 * // Basic info tooltip
 * <InfoTooltip content="This is helpful information" />
 *
 * // Help tooltip
 * <InfoTooltip variant="help" content="Click here for help" />
 *
 * // Warning tooltip
 * <InfoTooltip variant="warning" content="This action cannot be undone" />
 *
 * // With custom icon
 * <InfoTooltip icon={Settings} content="Settings info" />
 *
 * // Inline with label
 * <Label>
 *   Email Address
 *   <InfoTooltip content="We'll never share your email" />
 * </Label>
 * ```
 */

export type InfoTooltipVariant = "info" | "help" | "warning";

const variantConfig: Record<
  InfoTooltipVariant,
  { icon: LucideIcon; className: string }
> = {
  info: {
    icon: Info,
    className: "text-muted-foreground hover:text-foreground",
  },
  help: {
    icon: HelpCircle,
    className: "text-muted-foreground hover:text-foreground",
  },
  warning: {
    icon: AlertCircle,
    className: "text-warning hover:text-warning/80",
  },
};

export interface InfoTooltipProps {
  /**
   * Tooltip content
   */
  content: React.ReactNode;
  /**
   * Tooltip variant determining icon and styling
   */
  variant?: InfoTooltipVariant;
  /**
   * Custom icon (overrides variant icon)
   */
  icon?: LucideIcon;
  /**
   * Icon size
   */
  size?: "sm" | "default" | "lg";
  /**
   * Tooltip side
   */
  side?: "top" | "right" | "bottom" | "left";
  /**
   * Tooltip alignment
   */
  align?: "start" | "center" | "end";
  /**
   * Delay before showing tooltip (ms)
   */
  delayDuration?: number;
  /**
   * Additional class name for the icon button
   */
  className?: string;
  /**
   * Additional class name for the tooltip content
   */
  contentClassName?: string;
  /**
   * Accessible label for the icon
   */
  "aria-label"?: string;
}

const iconSizes = {
  sm: "h-3 w-3",
  default: "h-4 w-4",
  lg: "h-5 w-5",
};

export function InfoTooltip({
  content,
  variant = "info",
  icon: IconOverride,
  size = "default",
  side = "top",
  align = "center",
  delayDuration = 300,
  className,
  contentClassName,
  "aria-label": ariaLabel,
}: Readonly<InfoTooltipProps>) {
  const config = variantConfig[variant];
  const Icon = IconOverride ?? config.icon;

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm",
              config.className,
              className
            )}
            aria-label={ariaLabel ?? `${variant} tooltip`}
          >
            <Icon className={iconSizes[size]} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className={cn("max-w-xs", contentClassName)}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * LabelWithTooltip - Label with integrated info tooltip
 *
 * @example
 * ```tsx
 * <LabelWithTooltip
 *   label="Email Address"
 *   tooltip="We'll never share your email with third parties"
 *   htmlFor="email"
 * />
 * ```
 */
export function LabelWithTooltip({
  label,
  tooltip,
  htmlFor,
  required,
  className,
}: {
  label: string;
  tooltip: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <InfoTooltip content={tooltip} size="sm" />
    </div>
  );
}

/**
 * TextWithTooltip - Text span with inline tooltip
 *
 * @example
 * ```tsx
 * <TextWithTooltip
 *   text="API Key"
 *   tooltip="Your unique API key for authentication"
 * />
 * ```
 */
export function TextWithTooltip({
  text,
  tooltip,
  variant = "info",
  className,
}: {
  text: string;
  tooltip: React.ReactNode;
  variant?: InfoTooltipVariant;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {text}
      <InfoTooltip content={tooltip} variant={variant} size="sm" />
    </span>
  );
}
