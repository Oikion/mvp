"use client";

/**
 * EventSelector
 * 
 * Specialized wrapper around UnifiedEntitySelector for selecting events.
 * New component (no existing equivalent to replace).
 */

import React from "react";
import { UnifiedEntitySelector } from "./UnifiedEntitySelector";

export interface EventSelectorProps {
  /**
   * Selected event IDs
   */
  value: string[];

  /**
   * Change handler
   */
  onChange: (value: string[]) => void;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Search placeholder text
   */
  searchPlaceholder?: string;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Loading state (controlled externally)
   */
  isLoading?: boolean;

  /**
   * Empty message
   */
  emptyMessage?: string;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Optional event type filter
   */
  typeFilter?: string;
}

export function EventSelector({
  value,
  onChange,
  placeholder = "Select events...",
  searchPlaceholder = "Search events...",
  disabled = false,
  emptyMessage = "No events found.",
  className,
  typeFilter,
}: EventSelectorProps) {
  return (
    <UnifiedEntitySelector
      mode="multi"
      entityTypes={["event"]}
      value={value}
      onChange={(val) => onChange(val as string[])}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
      emptyMessage={emptyMessage}
      className={className}
      filters={typeFilter ? { eventType: typeFilter } : undefined}
      showSubtitles
      maxSelections={10}
    />
  );
}

/**
 * Single event selector variant
 */
export interface SingleEventSelectorProps {
  /**
   * Selected event ID
   */
  value: string;

  /**
   * Change handler
   */
  onChange: (value: string) => void;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Search placeholder text
   */
  searchPlaceholder?: string;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Required field
   */
  required?: boolean;

  /**
   * Custom className
   */
  className?: string;

  /**
   * Optional event type filter
   */
  typeFilter?: string;
}

export function SingleEventSelector({
  value,
  onChange,
  placeholder = "Select an event...",
  searchPlaceholder = "Search events...",
  disabled = false,
  required = false,
  className,
  typeFilter,
}: SingleEventSelectorProps) {
  return (
    <UnifiedEntitySelector
      mode="single"
      entityTypes={["event"]}
      value={value}
      onChange={(val) => onChange(val as string)}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
      required={required}
      className={className}
      filters={typeFilter ? { eventType: typeFilter } : undefined}
      showSubtitles
    />
  );
}

export default EventSelector;
