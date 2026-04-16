"use client";

/**
 * RequestSelector
 *
 * Specialized wrapper around UnifiedEntitySelector for selecting requests (v2.0 — replaces MandateSelector).
 */

import React from "react";
import { UnifiedEntitySelector } from "./UnifiedEntitySelector";

export interface RequestSelectorProps {
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

export function RequestSelector({
  value,
  onChange,
  placeholder = "Select requests...",
  searchPlaceholder = "Search requests...",
  disabled = false,
  emptyMessage = "No requests found.",
  className,
  createNewLabel,
  onCreateNew,
}: RequestSelectorProps) {
  return (
    <UnifiedEntitySelector
      mode="multi"
      entityTypes={["request"]}
      value={value}
      onChange={(val) => onChange(val as string[])}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
      emptyMessage={emptyMessage}
      className={className}
      showSubtitles
      maxSelections={10}
      createNewLabel={createNewLabel}
      onCreateNew={onCreateNew}
    />
  );
}

export default RequestSelector;
