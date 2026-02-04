import { useState, useEffect, useCallback, useRef } from "react";
import useDebounce from "./useDebounce";

export interface AddressLookupResult {
  postalCode?: string;
  municipality?: string;
  area?: string;
  region?: string;
  suggestions?: Array<{
    postalCode: string;
    municipality: string;
    area?: string;
    region?: string;
  }>;
}

export interface UseAddressAutofillOptions {
  country?: string;
  onLookupComplete?: (result: AddressLookupResult) => void;
  debounceMs?: number;
}

export interface UseAddressAutofillReturn {
  lookupByPostalCode: (postalCode: string) => Promise<void>;
  lookupByMunicipality: (municipality: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  lastResult: AddressLookupResult | null;
}

/**
 * Hook for bi-directional address autofill
 * 
 * Features:
 * - Debounced lookups to prevent excessive API calls
 * - Hybrid approach: static data first, API fallback
 * - Country restriction (default: Greece)
 */
export function useAddressAutofill(
  options: UseAddressAutofillOptions = {}
): UseAddressAutofillReturn {
  const {
    country = "GR",
    onLookupComplete,
    debounceMs = 500,
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<AddressLookupResult | null>(null);
  
  // Track the last lookup to prevent duplicate calls
  const lastLookupRef = useRef<{ type: "postalCode" | "municipality"; value: string } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Perform lookup by postal code
   */
  const lookupByPostalCode = useCallback(async (postalCode: string) => {
    const normalized = postalCode.trim().replace(/\s+/g, "");
    
    // Validate format
    if (!normalized || normalized.length === 0) {
      setError(null);
      setLastResult(null);
      return;
    }

    // Check if this is a duplicate lookup
    if (
      lastLookupRef.current?.type === "postalCode" &&
      lastLookupRef.current?.value === normalized
    ) {
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Validate Greek postal code format (5 digits)
    if (!/^\d{5}$/.test(normalized)) {
      setError("Το ΤΚ πρέπει να έχει 5 ψηφία");
      setLastResult(null);
      return;
    }

    lastLookupRef.current = { type: "postalCode", value: normalized };
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const params = new URLSearchParams({
        postalCode: normalized,
        country,
      });

      const response = await fetch(`/api/location/lookup?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to lookup postal code");
      }

      const result: AddressLookupResult = await response.json();
      
      if (!controller.signal.aborted) {
        setLastResult(result);
        setError(null);
        onLookupComplete?.(result);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return; // Request was cancelled, ignore
      }
      
      if (!controller.signal.aborted) {
        console.error("Postal code lookup error:", err);
        setError(err.message || "Σφάλμα αναζήτησης ΤΚ");
        setLastResult(null);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [country, onLookupComplete]);

  /**
   * Perform lookup by municipality
   */
  const lookupByMunicipality = useCallback(async (municipality: string) => {
    const normalized = municipality.trim();
    
    if (!normalized || normalized.length < 2) {
      setError(null);
      setLastResult(null);
      return;
    }

    // Check if this is a duplicate lookup
    if (
      lastLookupRef.current?.type === "municipality" &&
      lastLookupRef.current?.value === normalized
    ) {
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    lastLookupRef.current = { type: "municipality", value: normalized };
    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const params = new URLSearchParams({
        municipality: normalized,
        country,
      });

      const response = await fetch(`/api/location/lookup?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to lookup municipality");
      }

      const result: AddressLookupResult = await response.json();
      
      if (!controller.signal.aborted) {
        setLastResult(result);
        setError(null);
        onLookupComplete?.(result);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        return; // Request was cancelled, ignore
      }
      
      if (!controller.signal.aborted) {
        console.error("Municipality lookup error:", err);
        setError(err.message || "Σφάλμα αναζήτησης δήμου");
        setLastResult(null);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [country, onLookupComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    lookupByPostalCode,
    lookupByMunicipality,
    isLoading,
    error,
    lastResult,
  };
}

/**
 * Debounced version of useAddressAutofill
 * Automatically debounces lookups to prevent excessive API calls
 */
export function useDebouncedAddressAutofill(
  options: UseAddressAutofillOptions = {}
) {
  const { debounceMs = 500, ...restOptions } = options;
  const [postalCode, setPostalCode] = useState("");
  const [municipality, setMunicipality] = useState("");
  
  const debouncedPostalCode = useDebounce(postalCode, debounceMs);
  const debouncedMunicipality = useDebounce(municipality, debounceMs);
  
  const autofill = useAddressAutofill(restOptions);

  useEffect(() => {
    if (debouncedPostalCode && /^\d{5}$/.test(debouncedPostalCode)) {
      autofill.lookupByPostalCode(debouncedPostalCode);
    }
  }, [debouncedPostalCode, autofill]);

  useEffect(() => {
    if (debouncedMunicipality && debouncedMunicipality.length >= 2) {
      autofill.lookupByMunicipality(debouncedMunicipality);
    }
  }, [debouncedMunicipality, autofill]);

  return {
    ...autofill,
    setPostalCode,
    setMunicipality,
  };
}
