import { useEffect, useState, useCallback, useRef } from "react";

/**
 * useDebounce - Generic debounce hook for any value type
 *
 * Delays updating the returned value until after the specified delay
 * has passed since the last change.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState("");
 * const debouncedSearch = useDebounce(search, 300);
 *
 * // Use debouncedSearch for API calls
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     fetchResults(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedCallback - Debounce a callback function
 *
 * Creates a debounced version of the provided callback that will only
 * execute after the specified delay has passed since the last call.
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns A debounced version of the callback
 *
 * @example
 * ```tsx
 * const handleSearch = useDebouncedCallback((query: string) => {
 *   fetch(`/api/search?q=${query}`);
 * }, 300);
 *
 * <input onChange={(e) => handleSearch(e.target.value)} />
 * ```
 */
export function useDebouncedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay = 300
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Update the callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

/**
 * useDebouncedState - State hook with built-in debounce
 *
 * Returns both the immediate and debounced state values along with a setter.
 * Useful when you need to show immediate UI feedback but delay API calls.
 *
 * @param initialValue - Initial state value
 * @param delay - Delay in milliseconds (default: 300)
 * @returns Tuple of [immediateValue, debouncedValue, setValue]
 *
 * @example
 * ```tsx
 * const [search, debouncedSearch, setSearch] = useDebouncedState("", 300);
 *
 * // search updates immediately (for input display)
 * // debouncedSearch updates after 300ms (for API calls)
 *
 * <input value={search} onChange={(e) => setSearch(e.target.value)} />
 * ```
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay = 300
): [T, T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(initialValue);
  const debouncedValue = useDebounce(value, delay);

  return [value, debouncedValue, setValue];
}

// Default export for backward compatibility with useDebounce.tsx
export default useDebounce;

