"use client";

/**
 * ContactSelector
 *
 * Specialized wrapper around UnifiedEntitySelector for selecting contacts (v2.0 — replaces ClientSelector).
 */

import React from "react";
import { UnifiedEntitySelector } from "./UnifiedEntitySelector";

export interface ContactSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  statusFilter?: string;
  createNewLabel?: string;
  onCreateNew?: () => void;
}

export function ContactSelector({
  value,
  onChange,
  placeholder = "Select contacts...",
  searchPlaceholder = "Search contacts...",
  disabled = false,
  emptyMessage = "No contacts found.",
  className,
  statusFilter,
  createNewLabel,
  onCreateNew,
}: ContactSelectorProps) {
  return (
    <UnifiedEntitySelector
      mode="multi"
      entityTypes={["contact"]}
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
      createNewLabel={createNewLabel}
      onCreateNew={onCreateNew}
    />
  );
}

export interface SingleContactSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  statusFilter?: string;
}

export function SingleContactSelector({
  value,
  onChange,
  placeholder = "Select a contact...",
  searchPlaceholder = "Search contacts...",
  disabled = false,
  required = false,
  className,
  statusFilter,
}: SingleContactSelectorProps) {
  return (
    <UnifiedEntitySelector
      mode="single"
      entityTypes={["contact"]}
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

export default ContactSelector;
