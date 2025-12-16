"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MapPin, X, Loader2, Search, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import useDebounce from "@/hooks/useDebounce";

export interface LocationData {
  address: string;
  city?: string;
  country?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
  raw?: PhotonFeature;
}

interface PhotonFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    osm_id?: number;
    osm_type?: string;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    postcode?: string;
    district?: string;
    locality?: string;
  };
}

interface PhotonResponse {
  type: string;
  features: PhotonFeature[];
}

interface LocationAutocompleteProps {
  value?: string | LocationData;
  onChange: (location: LocationData | string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function formatAddress(feature: PhotonFeature): string {
  const props = feature.properties;
  const parts: string[] = [];

  // Build address from most specific to least specific
  if (props.housenumber && props.street) {
    parts.push(`${props.street} ${props.housenumber}`);
  } else if (props.street) {
    parts.push(props.street);
  } else if (props.name) {
    parts.push(props.name);
  }

  if (props.locality && !parts.includes(props.locality)) {
    parts.push(props.locality);
  }

  if (props.city && !parts.includes(props.city)) {
    parts.push(props.city);
  }

  if (props.postcode) {
    parts.push(props.postcode);
  }

  return parts.join(", ") || props.name || "Unknown location";
}

function featureToLocationData(feature: PhotonFeature): LocationData {
  const [lng, lat] = feature.geometry.coordinates;
  return {
    address: formatAddress(feature),
    city: feature.properties.city || feature.properties.locality,
    country: feature.properties.country,
    postalCode: feature.properties.postcode,
    lat,
    lng,
    raw: feature,
  };
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
}: LocationAutocompleteProps) {
  const t = useTranslations("common.locationSearch");
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<PhotonFeature[]>([]);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Get display value
  const displayValue = typeof value === "string" ? value : value?.address || "";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search locations via our proxy API
  const searchLocations = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        q: query,
        limit: "5",
      });
      
      const response = await fetch(`/api/location/search?${params}`);
      const data: PhotonResponse = await response.json();
      setResults(data.features || []);
    } catch (error) {
      console.error("Location search error:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Effect to search when debounced query changes
  useEffect(() => {
    if (debouncedQuery && !isManualMode) {
      searchLocations(debouncedQuery);
    }
  }, [debouncedQuery, isManualMode, searchLocations]);

  // Handle selection from search results
  const handleSelect = (feature: PhotonFeature) => {
    const locationData = featureToLocationData(feature);
    onChange(locationData);
    setIsOpen(false);
    setSearchQuery("");
    setResults([]);
  };

  // Handle manual entry
  const handleManualSubmit = () => {
    if (manualValue.trim()) {
      onChange(manualValue.trim());
      setIsManualMode(false);
      setManualValue("");
    }
  };

  // Clear location
  const handleClear = () => {
    onChange("");
    setSearchQuery("");
    setManualValue("");
    setResults([]);
  };

  // Switch to manual mode
  const handleSwitchToManual = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsManualMode(true);
    setIsOpen(false);
    setManualValue(displayValue);
  };

  // Switch back to search mode
  const handleSwitchToSearch = () => {
    setIsManualMode(false);
    setManualValue("");
  };

  if (isManualMode) {
    return (
      <div className={cn("flex gap-2", className)}>
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={manualValue}
            onChange={(e) => setManualValue(e.target.value)}
            placeholder={placeholder || t("placeholder")}
            disabled={disabled}
            className="pl-9 pr-20"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleManualSubmit();
              }
            }}
            aria-label={t("selectedLocation")}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSwitchToSearch}
              className="h-7 px-2"
              aria-label={t("placeholder")}
            >
              <Search className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleManualSubmit}
              disabled={!manualValue.trim()}
              className="h-7 px-2"
            >
              OK
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (displayValue) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2",
          className
        )}
      >
        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="flex-1 text-sm truncate" title={displayValue}>
          {displayValue}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleSwitchToManual}
          className="h-7 w-7 p-0"
          aria-label={t("useManual")}
          disabled={disabled}
        >
          <Edit2 className="h-3 w-3" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="h-7 w-7 p-0"
          aria-label={t("clearLocation")}
          disabled={disabled}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
        <Input
          ref={inputRef}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder || t("placeholder")}
          disabled={disabled}
          className="pl-9 pr-10"
          aria-label={t("placeholder")}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        />
        {isSearching ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground pointer-events-none" />
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSwitchToManual}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
            aria-label={t("useManual")}
            disabled={disabled}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md">
          <ScrollArea className="max-h-[300px]">
            {isSearching && (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("searching")}
              </div>
            )}
            
            {!isSearching && results.length === 0 && searchQuery.length >= 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t("noResults")}
              </div>
            )}
            
            {!isSearching && results.length > 0 && (
              <div className="py-1">
                {results.map((feature, index) => (
                  <button
                    key={`${feature.properties.osm_id || index}-${feature.geometry.coordinates.join(",")}`}
                    type="button"
                    onClick={() => handleSelect(feature)}
                    className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-accent focus:bg-accent focus:outline-none cursor-pointer transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate font-medium text-sm">
                        {feature.properties.name || feature.properties.street || "Location"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {formatAddress(feature)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
            
            {!isSearching && searchQuery.length < 2 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {t("placeholder")}
              </div>
            )}
          </ScrollArea>
          
          <div className="border-t p-2">
            <button
              type="button"
              onClick={handleSwitchToManual}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent rounded-sm transition-colors"
            >
              <Edit2 className="h-4 w-4" />
              {t("useManual")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
