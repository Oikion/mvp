"use client";

/**
 * DocumentSelector
 * 
 * Specialized wrapper around UnifiedEntitySelector for selecting documents.
 * Drop-in replacement for existing DocumentSelector components.
 */

import React from "react";
import { UnifiedEntitySelector } from "./UnifiedEntitySelector";

export interface DocumentSelectorProps {
  /**
   * Selected document IDs
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
   * Optional document type filter
   */
  typeFilter?: string;
}

export function DocumentSelector({
  value,
  onChange,
  placeholder = "Select documents...",
  searchPlaceholder = "Search documents...",
  disabled = false,
  emptyMessage = "No documents found.",
  className,
  typeFilter,
}: DocumentSelectorProps) {
  return (
    <UnifiedEntitySelector
      mode="multi"
      entityTypes={["document"]}
      value={value}
      onChange={(val) => onChange(val as string[])}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
      emptyMessage={emptyMessage}
      className={className}
      filters={typeFilter ? { documentType: typeFilter } : undefined}
      showSubtitles
      maxSelections={10}
    />
  );
}

/**
 * Single document selector variant
 */
export interface SingleDocumentSelectorProps {
  /**
   * Selected document ID
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
   * Optional document type filter
   */
  typeFilter?: string;
}

export function SingleDocumentSelector({
  value,
  onChange,
  placeholder = "Select a document...",
  searchPlaceholder = "Search documents...",
  disabled = false,
  required = false,
  className,
  typeFilter,
}: SingleDocumentSelectorProps) {
  return (
    <UnifiedEntitySelector
      mode="single"
      entityTypes={["document"]}
      value={value}
      onChange={(val) => onChange(val as string)}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      disabled={disabled}
      required={required}
      className={className}
      filters={typeFilter ? { documentType: typeFilter } : undefined}
      showSubtitles
    />
  );
}

export default DocumentSelector;
