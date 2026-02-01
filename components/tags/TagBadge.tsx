"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagBadgeProps {
  name: string;
  color: string;
  onRemove?: () => void;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * TagBadge - Displays a tag with its color
 * 
 * @example
 * <TagBadge name="Urgent" color="#ef4444" />
 * <TagBadge name="VIP" color="#8b5cf6" onRemove={() => handleRemove()} />
 */
export function TagBadge({
  name,
  color,
  onRemove,
  onClick,
  size = "md",
  className,
}: TagBadgeProps) {
  // Generate contrasting text color based on background
  const getContrastColor = (hexColor: string) => {
    // Remove # if present
    const hex = hexColor.replace("#", "");
    const r = Number.parseInt(hex.substring(0, 2), 16);
    const g = Number.parseInt(hex.substring(2, 4), 16);
    const b = Number.parseInt(hex.substring(4, 6), 16);
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? "#000000" : "#ffffff";
  };

  const textColor = getContrastColor(color);

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5 h-5",
    md: "text-sm px-2 py-0.5 h-6",
    lg: "text-sm px-2.5 py-1 h-7",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium transition-all",
        onClick && "cursor-pointer hover:opacity-80",
        sizeClasses[size],
        className
      )}
      style={{
        backgroundColor: color,
        color: textColor,
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {name}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70 focus:outline-none"
          aria-label={`Remove ${name} tag`}
        >
          <X className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
        </button>
      )}
    </span>
  );
}

/**
 * TagBadgeList - Displays multiple tags with optional overflow handling
 */
interface TagBadgeListProps {
  tags: Array<{ id: string; name: string; color: string }>;
  onRemove?: (tagId: string) => void;
  onClick?: (tagId: string) => void;
  size?: "sm" | "md" | "lg";
  maxVisible?: number;
  className?: string;
}

export function TagBadgeList({
  tags,
  onRemove,
  onClick,
  size = "md",
  maxVisible,
  className,
}: TagBadgeListProps) {
  const visibleTags = maxVisible ? tags.slice(0, maxVisible) : tags;
  const hiddenCount = maxVisible ? tags.length - maxVisible : 0;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {visibleTags.map((tag) => (
        <TagBadge
          key={tag.id}
          name={tag.name}
          color={tag.color}
          size={size}
          onRemove={onRemove ? () => onRemove(tag.id) : undefined}
          onClick={onClick ? () => onClick(tag.id) : undefined}
        />
      ))}
      {hiddenCount > 0 && (
        <span className="text-xs text-muted-foreground">+{hiddenCount}</span>
      )}
    </div>
  );
}
