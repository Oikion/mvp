"use client";

import * as React from "react";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * SearchInput - Standardized search input component
 *
 * Features:
 * - Optional debounce for search-as-you-type
 * - Clear button when value exists
 * - Search icon
 * - Loading state indicator
 * - Minimum query length support
 * - Keyboard shortcuts (Enter to search, Escape to clear)
 *
 * @example
 * ```tsx
 * // Basic usage with debounce
 * const [query, setQuery] = useState("");
 *
 * <SearchInput
 *   value={query}
 *   onChange={setQuery}
 *   placeholder="Search clients..."
 *   debounceMs={300}
 * />
 *
 * // Without debounce (manual search trigger)
 * <SearchInput
 *   value={query}
 *   onChange={setQuery}
 *   onSearch={handleSearch}
 *   placeholder="Search..."
 * />
 *
 * // With loading state
 * <SearchInput
 *   value={query}
 *   onChange={setQuery}
 *   isLoading={isSearching}
 *   placeholder="Search..."
 * />
 * ```
 */

export interface SearchInputProps {
  /**
   * Current search value
   */
  value: string;
  /**
   * Called when the value changes (or after debounce if debounceMs is set)
   */
  onChange: (value: string) => void;
  /**
   * Called when Enter is pressed or search is explicitly triggered
   * If not provided, onChange is called on every keystroke (with debounce if set)
   */
  onSearch?: (value: string) => void;
  /**
   * Debounce delay in milliseconds. Set to 0 to disable debounce.
   * Default: 0 (no debounce)
   */
  debounceMs?: number;
  /**
   * Minimum query length before onChange/onSearch is called
   * Default: 0
   */
  minLength?: number;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Whether a search is in progress
   */
  isLoading?: boolean;
  /**
   * Whether the input is disabled
   */
  disabled?: boolean;
  /**
   * Additional class name for the container
   */
  className?: string;
  /**
   * Additional class name for the input
   */
  inputClassName?: string;
  /**
   * Whether to show the search icon
   * Default: true
   */
  showIcon?: boolean;
  /**
   * Whether to show the clear button when value exists
   * Default: true
   */
  showClear?: boolean;
  /**
   * Called when the input is cleared
   */
  onClear?: () => void;
  /**
   * Auto focus the input on mount
   */
  autoFocus?: boolean;
  /**
   * Size variant
   */
  size?: "sm" | "default" | "lg";
}

const sizeConfig = {
  sm: {
    input: "h-9 text-sm",
    icon: "h-3.5 w-3.5",
    iconLeft: "left-2.5",
    inputPadding: "pl-8 pr-10",
    // Touch target meets 44px minimum via relative positioning
    clearButton: "h-7 w-7 relative after:absolute after:inset-0 after:min-h-[44px] after:min-w-[44px] after:-translate-x-1/2 after:-translate-y-1/2 after:left-1/2 after:top-1/2",
  },
  default: {
    input: "h-11",
    icon: "h-4 w-4",
    iconLeft: "left-3",
    inputPadding: "pl-10 pr-12",
    // Meets 44px minimum touch target
    clearButton: "h-9 w-9 relative after:absolute after:inset-0 after:min-h-[44px] after:min-w-[44px] after:-translate-x-1/2 after:-translate-y-1/2 after:left-1/2 after:top-1/2",
  },
  lg: {
    input: "h-12 text-lg",
    icon: "h-5 w-5",
    iconLeft: "left-3.5",
    inputPadding: "pl-11 pr-14",
    // Already meets 44px minimum
    clearButton: "h-11 w-11",
  },
};

export function SearchInput({
  value,
  onChange,
  onSearch,
  debounceMs = 0,
  minLength = 0,
  placeholder = "Search...",
  isLoading = false,
  disabled = false,
  className,
  inputClassName,
  showIcon = true,
  showClear = true,
  onClear,
  autoFocus = false,
  size = "default",
}: Readonly<SearchInputProps>) {
  const [internalValue, setInternalValue] = React.useState(value);
  const debounceTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const sizeStyles = sizeConfig[size];

  // Sync internal value with external value
  React.useEffect(() => {
    setInternalValue(value);
  }, [value]);

  // Cleanup debounce timeout on unmount
  React.useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const triggerChange = React.useCallback(
    (newValue: string) => {
      // Check minimum length
      if (newValue.length > 0 && newValue.length < minLength) {
        return;
      }

      onChange(newValue);
    },
    [onChange, minLength]
  );

  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setInternalValue(newValue);

      // Clear existing timeout
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      if (debounceMs > 0) {
        // Debounced change
        debounceTimeoutRef.current = setTimeout(() => {
          triggerChange(newValue);
        }, debounceMs);
      } else if (!onSearch) {
        // Immediate change if no manual search trigger
        triggerChange(newValue);
      }
    },
    [debounceMs, onSearch, triggerChange]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // Cancel any pending debounce
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        if (onSearch) {
          onSearch(internalValue);
        } else {
          triggerChange(internalValue);
        }
      } else if (e.key === "Escape") {
        handleClear();
      }
    },
    [internalValue, onSearch, triggerChange]
  );

  const handleClear = React.useCallback(() => {
    setInternalValue("");
    // Cancel any pending debounce
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    onChange("");
    onClear?.();
    // Focus the input after clearing
    inputRef.current?.focus();
  }, [onChange, onClear]);

  const showClearButton = showClear && internalValue.length > 0 && !isLoading;

  return (
    <div className={cn("relative", className)}>
      {/* Search icon */}
      {showIcon && (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
            sizeStyles.iconLeft
          )}
        >
          <Search className={sizeStyles.icon} />
        </div>
      )}

      {/* Input */}
      <Input
        ref={inputRef}
        type="search"
        value={internalValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn(
          sizeStyles.input,
          showIcon && sizeStyles.inputPadding,
          !showIcon && showClear && "pr-10",
          // Hide browser's default clear button
          "[&::-webkit-search-cancel-button]:hidden",
          inputClassName
        )}
        aria-label={placeholder}
      />

      {/* Clear button or loading indicator */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
        {isLoading && (
          <Loader2
            className={cn(sizeStyles.icon, "animate-spin text-muted-foreground")}
          />
        )}
        {showClearButton && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className={cn(
              sizeStyles.clearButton,
              "text-muted-foreground hover:text-foreground"
            )}
            aria-label="Clear search"
          >
            <X className={sizeStyles.icon} />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * useSearchInput - Hook for managing search input state with debounce
 *
 * @example
 * ```tsx
 * const { query, setQuery, debouncedQuery } = useSearchInput({ debounceMs: 300 });
 *
 * // Use debouncedQuery for API calls
 * const { data } = useSWR(debouncedQuery ? `/api/search?q=${debouncedQuery}` : null);
 *
 * <SearchInput value={query} onChange={setQuery} />
 * ```
 */
export function useSearchInput(options?: {
  initialValue?: string;
  debounceMs?: number;
  minLength?: number;
}) {
  const { initialValue = "", debounceMs = 300, minLength = 0 } = options ?? {};

  const [query, setQuery] = React.useState(initialValue);
  const [debouncedQuery, setDebouncedQuery] = React.useState(initialValue);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (query.length === 0 || query.length >= minLength) {
        setDebouncedQuery(query);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [query, debounceMs, minLength]);

  const clear = React.useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
  }, []);

  return {
    query,
    setQuery,
    debouncedQuery,
    clear,
    hasQuery: query.length > 0,
    isDebouncing: query !== debouncedQuery,
  };
}
