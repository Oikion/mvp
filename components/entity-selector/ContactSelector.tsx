"use client";

/**
 * ContactSelector — v2.0 replacement for ClientSelector.
 *
 * Specialized wrapper around UnifiedEntitySelector for selecting contacts.
 */

import React from "react";
import { UnifiedEntitySelector } from "./UnifiedEntitySelector";

export interface ContactSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
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
      showSubtitles
      maxSelections={20}
      createNewLabel={createNewLabel}
      onCreateNew={onCreateNew}
    />
  );
}

export interface SingleContactSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function SingleContactSelector({
  value,
  onChange,
  placeholder = "Select a contact...",
  searchPlaceholder = "Search contacts...",
  disabled = false,
  emptyMessage = "No contacts found.",
  className,
}: SingleContactSelectorProps) {
  return (
    <UnifiedEntitySelector
      mode="single"
      entityTypes={["contact"]}
      value={value ? [value] : []}
      onChange={(val) => {
        const arr = val as string[];
        onChange(arr.length > 0 ? arr[0] : null);
      }}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
      emptyMessage={emptyMessage}
      className={className}
      showSubtitles
    />
  );
}

export default ContactSelector;
