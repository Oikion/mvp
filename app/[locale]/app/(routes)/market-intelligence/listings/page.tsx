"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search,
  Filter,
  ExternalLink,
  MapPin,
  Bed,
  Square,
  Building2,
  ChevronLeft,
  ChevronRight,
  ImageOff,
  Camera
} from "lucide-react";
import Image from "next/image";

interface Listing {
  id: string;
  source_platform: string;
  source_url: string;
  title: string | null;
  price: number | null;
  price_per_sqm: number | null;
  property_type: string | null;
  transaction_type: string | null;
  address: string | null;
  area: string | null;
  size_sqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  days_on_market: number | null;
  images: string[];
  last_seen_at: string;
}

interface Filters {
  search: string;
  area: string;
  minPrice: string;
  maxPrice: string;
  propertyType: string;
  transactionType: string;
  platform: string;
}

const PROPERTY_TYPES = [
  { value: "APARTMENT", label: "Apartment" },
  { value: "HOUSE", label: "House" },
  { value: "MAISONETTE", label: "Maisonette" },
  { value: "VILLA", label: "Villa" },
  { value: "LAND", label: "Land" },
  { value: "COMMERCIAL", label: "Commercial" },
];

const PLATFORMS = [
  { value: "spitogatos", label: "Spitogatos" },
  { value: "xe_gr", label: "XE.gr" },
  { value: "tospitimou", label: "Tospitimou" },
];

// Sentinel value for "All" options (empty string not allowed in Radix Select)
const ALL_VALUE = "__all__";

/**
 * ListingImage Component
 * Handles property images with loading states, error fallback, and image count
 */
function ListingImage({ 
  images, 
  title, 
  platform 
}: { 
  images: string[] | null; 
  title: string | null; 
  platform: string; 
}) {
  const [imageState, setImageState] = useState<"loading" | "loaded" | "error">("loading");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  const hasImages = images && images.length > 0;
  const imageCount = images?.length || 0;
  const currentImage = hasImages ? images[currentImageIndex] : null;
  
  // Reset state when images change
  useEffect(() => {
    setImageState(hasImages ? "loading" : "error");
    setCurrentImageIndex(0);
  }, [hasImages, images]);

  const handleImageLoad = () => {
    setImageState("loaded");
  };

  const handleImageError = () => {
    // Try next image if available
    if (currentImageIndex < imageCount - 1) {
      setCurrentImageIndex(prev => prev + 1);
      setImageState("loading");
    } else {
      setImageState("error");
    }
  };

  // Get platform-specific gradient
  const getPlatformGradient = () => {
    switch (platform) {
      case 'spitogatos':
        return 'from-primary/20 to-primary/5';
      case 'xe_gr':
        return 'from-emerald-500/20 to-emerald-500/5';
      case 'tospitimou':
        return 'from-violet-500/20 to-violet-500/5';
      default:
        return 'from-muted to-muted/50';
    }
  };

  return (
    <div className="relative h-44 bg-muted overflow-hidden">
      {/* Loading State */}
      {imageState === "loading" && hasImages && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`absolute inset-0 bg-gradient-to-br ${getPlatformGradient()} animate-pulse`} />
          <Skeleton className="absolute inset-0" />
        </div>
      )}
      
      {/* Image */}
      {hasImages && currentImage && imageState !== "error" && (
        <Image
          src={currentImage}
          alt={title || "Property listing"}
          fill
          className={`object-cover transition-all duration-300 group-hover:scale-105 ${
            imageState === "loaded" ? "opacity-100" : "opacity-0"
          }`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          onLoad={handleImageLoad}
          onError={handleImageError}
          unoptimized // External URLs need unoptimized mode
        />
      )}
      
      {/* Error/No Image State */}
      {(imageState === "error" || !hasImages) && (
        <div className={`absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br ${getPlatformGradient()}`}>
          {hasImages ? (
            <>
              <ImageOff className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <span className="text-xs text-muted-foreground">Image unavailable</span>
            </>
          ) : (
            <>
              <Building2 className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <span className="text-xs text-muted-foreground">No image</span>
            </>
          )}
        </div>
      )}
      
      {/* Image Count Badge */}
      {imageCount > 1 && imageState === "loaded" && (
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <Camera className="h-3 w-3" />
          {imageCount}
        </div>
      )}
      
      {/* Gradient overlay for text readability */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
    </div>
  );
}

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [areas, setAreas] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({
    search: "",
    area: "",
    minPrice: "",
    maxPrice: "",
    propertyType: "",
    transactionType: "",
    platform: "",
  });

  useEffect(() => {
    loadAreas();
  }, []);

  useEffect(() => {
    loadListings();
  }, [page, filters]);

  const loadAreas = async () => {
    try {
      const res = await fetch("/api/market-intel/listings", { method: "OPTIONS" });
      const data = await res.json();
      setAreas(data.areas || []);
    } catch (error) {
      console.error("Failed to load areas:", error);
    }
  };

  const loadListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      params.set("sortBy", "last_seen_at");
      params.set("sortOrder", "desc");

      if (filters.search) params.set("search", filters.search);
      if (filters.area) params.set("area", filters.area);
      if (filters.minPrice) params.set("minPrice", filters.minPrice);
      if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
      if (filters.propertyType) params.set("propertyType", filters.propertyType);
      if (filters.transactionType) params.set("transactionType", filters.transactionType);
      if (filters.platform) params.set("platform", filters.platform);

      const res = await fetch(`/api/market-intel/listings?${params.toString()}`);
      const data = await res.json();

      setListings(data.listings || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Failed to load listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = useCallback((key: keyof Filters, value: string) => {
    // Convert ALL_VALUE back to empty string for actual filtering
    const actualValue = value === ALL_VALUE ? "" : value;
    setFilters(prev => ({ ...prev, [key]: actualValue }));
    setPage(1);
  }, []);

  const clearFilters = () => {
    setFilters({
      search: "",
      area: "",
      minPrice: "",
      maxPrice: "",
      propertyType: "",
      transactionType: "",
      platform: "",
    });
    setPage(1);
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "N/A";
    return new Intl.NumberFormat("el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(price);
  };

  const getPlatformBadgeColor = (platform: string) => {
    const colors: Record<string, string> = {
      spitogatos: "bg-primary/20 text-primary border-primary/30",
      xe_gr: "bg-success/20 text-emerald-700 dark:text-emerald-400 border-success/30",
      tospitimou: "bg-violet-500/20 text-violet-700 dark:text-violet-400 border-violet-500/30"
    };
    return colors[platform] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Competitor Listings</h1>
        <p className="text-muted-foreground">
          Browse and filter properties from all monitored platforms
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search title or address..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Area */}
            <Select value={filters.area || ALL_VALUE} onValueChange={(v) => handleFilterChange("area", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Area" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All Areas</SelectItem>
                {areas.map((area) => (
                  <SelectItem key={area} value={area}>{area}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Property Type */}
            <Select value={filters.propertyType || ALL_VALUE} onValueChange={(v) => handleFilterChange("propertyType", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Property Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All Types</SelectItem>
                {PROPERTY_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Transaction Type */}
            <Select value={filters.transactionType || ALL_VALUE} onValueChange={(v) => handleFilterChange("transactionType", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Transaction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All</SelectItem>
                <SelectItem value="sale">For Sale</SelectItem>
                <SelectItem value="rent">For Rent</SelectItem>
              </SelectContent>
            </Select>

            {/* Platform */}
            <Select value={filters.platform || ALL_VALUE} onValueChange={(v) => handleFilterChange("platform", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All Platforms</SelectItem>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Price Range */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min Price"
                value={filters.minPrice}
                onChange={(e) => handleFilterChange("minPrice", e.target.value)}
                className="w-32"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                placeholder="Max Price"
                value={filters.maxPrice}
                onChange={(e) => handleFilterChange("maxPrice", e.target.value)}
                className="w-32"
              />
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {listings.length} of {total.toLocaleString()} listings
        </p>
      </div>

      {/* Listings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((listing) => (
            <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow group">
              {/* Property Image with Loading State */}
              <ListingImage 
                images={listing.images} 
                title={listing.title} 
                platform={listing.source_platform}
              />

              <CardContent className="p-4">
                {/* Platform badge */}
                <div className="flex items-center justify-between mb-2">
                  <Badge className={getPlatformBadgeColor(listing.source_platform)}>
                    {listing.source_platform === 'spitogatos' ? 'Spitogatos' :
                     listing.source_platform === 'xe_gr' ? 'XE.gr' :
                     listing.source_platform === 'tospitimou' ? 'Tospitimou' :
                     listing.source_platform}
                  </Badge>
                  {listing.days_on_market !== null && (
                    <span className="text-xs text-muted-foreground">
                      {listing.days_on_market} days on market
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-semibold line-clamp-2 mb-2">
                  {listing.title || "Untitled listing"}
                </h3>

                {/* Location */}
                <div className="flex items-center text-sm text-muted-foreground mb-2">
                  <MapPin className="h-3 w-3 mr-1" />
                  {listing.area || listing.address || "Unknown location"}
                </div>

                {/* Details */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  {listing.size_sqm && (
                    <span className="flex items-center">
                      <Square className="h-3 w-3 mr-1" />
                      {listing.size_sqm} m²
                    </span>
                  )}
                  {listing.bedrooms && (
                    <span className="flex items-center">
                      <Bed className="h-3 w-3 mr-1" />
                      {listing.bedrooms} bed
                    </span>
                  )}
                </div>

                {/* Price */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-bold">{formatPrice(listing.price)}</p>
                    {listing.price_per_sqm && (
                      <p className="text-xs text-muted-foreground">
                        {formatPrice(listing.price_per_sqm)}/m²
                      </p>
                    )}
                  </div>
                  <a 
                    href={listing.source_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        )}
      </div>
    </div>
  );
}
