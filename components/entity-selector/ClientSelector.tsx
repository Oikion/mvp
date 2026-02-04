"use client";

/**
 * ClientSelector
 * 
 * Specialized wrapper around UnifiedEntitySelector for selecting clients.
 * Drop-in replacement for existing ClientSelector components.
 */

import React from "react";
import { UnifiedEntitySelector } from "./UnifiedEntitySelector";

export interface ClientSelectorProps {
  /**
   * Selected client IDs
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
   * Optional client status filter
   */
  statusFilter?: string;
}

export function ClientSelector({
  value,
  onChange,
  placeholder = "Select clients...",
  searchPlaceholder = "Search clients...",
  disabled = false,
  emptyMessage = "No clients found.",
  className,
  statusFilter,
}: ClientSelectorProps) {
  return (
    <UnifiedEntitySelector
      mode="multi"
      entityTypes={["client"]}
      value={value}
      onChange={(val) => onChange(val as string[])}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
      emptyMessage={emptyMessage}
      className={className}
      filters={statusFilter ? { clientStatus: statusFilter } : undefined}
      showSubtitles
      maxSelections={10}
    />
  );
}

/**
 * Single client selector variant
 */
export interface SingleClientSelectorProps {
  /**
   * Selected client ID
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
   * Optional client status filter
   */
  statusFilter?: string;
}

export function SingleClientSelector({
  value,
  onChange,
  placeholder = "Select a client...",
  searchPlaceholder = "Search clients...",
  disabled = false,
  required = false,
  className,
  statusFilter,
}: SingleClientSelectorProps) {
  return (
    <UnifiedEntitySelector
      mode="single"
      entityTypes={["client"]}
      value={value}
      onChange={(val) => onChange(val as string)}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
      required={required}
      className={className}
      filters={statusFilter ? { clientStatus: statusFilter } : undefined}
      showSubtitles
    />
  );
}

export default ClientSelector;
