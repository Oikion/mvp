"use client";

/**
 * MandateSelector
 *
 * Specialized wrapper around UnifiedEntitySelector for selecting mandates.
 */

import React from "react";
import { UnifiedEntitySelector } from "./UnifiedEntitySelector";

export interface MandateSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function MandateSelector({
  value,
  onChange,
  placeholder = "Select mandates...",
  searchPlaceholder = "Search mandates...",
  disabled = false,
  emptyMessage = "No mandates found.",
  className,
}: MandateSelectorProps) {
  return (
    <UnifiedEntitySelector
      mode="multi"
      entityTypes={["mandate"]}
      value={value}
      onChange={(val) => onChange(val as string[])}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
      emptyMessage={emptyMessage}
      className={className}
      showSubtitles
      maxSelections={10}
    />
  );
}

export default MandateSelector;
