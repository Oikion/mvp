"use client";

/**
 * PropertySelector
 * 
 * Specialized wrapper around UnifiedEntitySelector for selecting properties.
 * Drop-in replacement for existing PropertySelector components.
 */

import React from "react";
import { UnifiedEntitySelector } from "./UnifiedEntitySelector";

export interface PropertySelectorProps {
  /**
   * Selected property IDs
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
   * Optional property status filter
   */
  statusFilter?: string;
}

export function PropertySelector({
  value,
  onChange,
  placeholder = "Select properties...",
  searchPlaceholder = "Search properties...",
  disabled = false,
  emptyMessage = "No properties found.",
  className,
  statusFilter,
}: PropertySelectorProps) {
  return (
    <UnifiedEntitySelector
      mode="multi"
      entityTypes={["property"]}
      value={value}
      onChange={(val) => onChange(val as string[])}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
      emptyMessage={emptyMessage}
      className={className}
      filters={statusFilter ? { propertyStatus: statusFilter } : undefined}
      showSubtitles
      maxSelections={10}
    />
  );
}

/**
 * Single property selector variant
 */
export interface SinglePropertySelectorProps {
  /**
   * Selected property ID
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
   * Optional property status filter
   */
  statusFilter?: string;
}

export function SinglePropertySelector({
  value,
  onChange,
  placeholder = "Select a property...",
  searchPlaceholder = "Search properties...",
  disabled = false,
  required = false,
  className,
  statusFilter,
}: SinglePropertySelectorProps) {
  return (
    <UnifiedEntitySelector
      mode="single"
      entityTypes={["property"]}
      value={value}
      onChange={(val) => onChange(val as string)}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
      required={required}
      className={className}
      filters={statusFilter ? { propertyStatus: statusFilter } : undefined}
      showSubtitles
    />
  );
}

export default PropertySelector;
