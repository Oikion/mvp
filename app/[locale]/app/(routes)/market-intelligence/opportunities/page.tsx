"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingDown, 
  DollarSign, 
  Clock,
  ExternalLink,
  MapPin,
  Square,
  Sparkles
} from "lucide-react";

interface PriceChange {
  listingId: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  recordedAt: string;
  listing: {
    id: string;
    title: string;
    area: string;
    size_sqm: number;
    source_url: string;
    source_platform: string;
  };
}

interface UnderpricedListing {
  listing: {
    id: string;
    title: string;
    price: number;
    area: string;
    size_sqm: number;
    source_url: string;
    source_platform: string;
  };
  marketAvgPricePerSqm: number;
  percentBelowMarket: number;
}

interface NewListing {
  id: string;
  title: string;
  price: number;
  area: string;
  size_sqm: number;
  source_url: string;
  source_platform: string;
  first_scraped_at: string;
}

export default function OpportunitiesPage() {
  const [loading, setLoading] = useState(true);
  const [priceDrops, setPriceDrops] = useState<PriceChange[]>([]);
  const [underpriced, setUnderpriced] = useState<UnderpricedListing[]>([]);
  const [newListings, setNewListings] = useState<NewListing[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dropsRes, underpricedRes, newRes] = await Promise.all([
        fetch("/api/market-intel/opportunities?type=price-drops&hours=168"),
        fetch("/api/market-intel/opportunities?type=underpriced&threshold=15"),
        fetch("/api/market-intel/opportunities?type=new&hours=48")
      ]);

      const dropsData = await dropsRes.json();
      const underpricedData = await underpricedRes.json();
      const newData = await newRes.json();

      setPriceDrops(dropsData.changes || []);
      setUnderpriced(underpricedData.listings || []);
      setNewListings(newData.listings || []);
    } catch (error) {
      console.error("Failed to load opportunities:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("el-GR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("el-GR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getPlatformLabel = (platform: string) => {
    const labels: Record<string, string> = {
      spitogatos: "Spitogatos",
      xe_gr: "XE.gr",
      tospitimou: "Tospitimou"
    };
    return labels[platform] || platform;
  };

  if (loading) {
    return (
      <div className="h-full overflow-auto">
        <div className="container mx-auto py-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center">
          <Sparkles className="h-8 w-8 mr-2 text-warning" />
          Opportunities
        </h1>
        <p className="text-muted-foreground">
          Find investment opportunities from competitor listings
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <TrendingDown className="h-4 w-4 mr-2 text-success" />
              Price Drops
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{priceDrops.length}</p>
            <p className="text-xs text-muted-foreground">In the last 7 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-warning" />
              Underpriced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{underpriced.length}</p>
            <p className="text-xs text-muted-foreground">15%+ below market</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2 text-primary" />
              New Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{newListings.length}</p>
            <p className="text-xs text-muted-foreground">In the last 48 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="price-drops" className="space-y-4">
        <TabsList>
          <TabsTrigger value="price-drops">
            Price Drops ({priceDrops.length})
          </TabsTrigger>
          <TabsTrigger value="underpriced">
            Underpriced ({underpriced.length})
          </TabsTrigger>
          <TabsTrigger value="new">
            New Listings ({newListings.length})
          </TabsTrigger>
        </TabsList>

        {/* Price Drops Tab */}
        <TabsContent value="price-drops">
          <Card>
            <CardHeader>
              <CardTitle>Recent Price Drops</CardTitle>
              <CardDescription>
                Properties with significant price reductions in the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {priceDrops.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No price drops found in the last 7 days
                  </p>
                ) : (
                  priceDrops.map((change) => (
                    <div 
                      key={change.listingId}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {change.listing.title || "Untitled listing"}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          {change.listing.area}
                          {change.listing.size_sqm && (
                            <>
                              <span>•</span>
                              <Square className="h-3 w-3" />
                              {change.listing.size_sqm} m²
                            </>
                          )}
                          <span>•</span>
                          {getPlatformLabel(change.listing.source_platform)}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-muted-foreground line-through text-sm">
                            {formatPrice(change.oldPrice)}
                          </span>
                          <Badge variant="secondary" className="bg-success/20 text-emerald-700 dark:text-success border-success/30">
                            -{Math.abs(change.changePercent).toFixed(1)}%
                          </Badge>
                        </div>
                        <p className="text-lg font-bold text-success dark:text-success">
                          {formatPrice(change.newPrice)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(change.recordedAt)}
                        </p>
                      </div>
                      <a 
                        href={change.listing.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4"
                      >
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Underpriced Tab */}
        <TabsContent value="underpriced">
          <Card>
            <CardHeader>
              <CardTitle>Underpriced Listings</CardTitle>
              <CardDescription>
                Properties priced significantly below market average for their area
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {underpriced.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No underpriced listings found
                  </p>
                ) : (
                  underpriced.map((item) => (
                    <div 
                      key={item.listing.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {item.listing.title || "Untitled listing"}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          {item.listing.area}
                          <span>•</span>
                          <Square className="h-3 w-3" />
                          {item.listing.size_sqm} m²
                          <span>•</span>
                          {getPlatformLabel(item.listing.source_platform)}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <Badge variant="secondary" className="bg-warning/20 text-warning dark:text-warning border-warning/30">
                          {item.percentBelowMarket.toFixed(1)}% below market
                        </Badge>
                        <p className="text-lg font-bold mt-1">
                          {formatPrice(item.listing.price)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Market: {formatPrice(item.marketAvgPricePerSqm * item.listing.size_sqm)}
                        </p>
                      </div>
                      <a 
                        href={item.listing.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4"
                      >
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* New Listings Tab */}
        <TabsContent value="new">
          <Card>
            <CardHeader>
              <CardTitle>New Listings</CardTitle>
              <CardDescription>
                Properties added to competitor platforms in the last 48 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {newListings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No new listings in the last 48 hours
                  </p>
                ) : (
                  newListings.map((listing) => (
                    <div 
                      key={listing.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                            NEW
                          </Badge>
                          <p className="font-medium truncate">
                            {listing.title || "Untitled listing"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          {listing.area}
                          {listing.size_sqm && (
                            <>
                              <span>•</span>
                              <Square className="h-3 w-3" />
                              {listing.size_sqm} m²
                            </>
                          )}
                          <span>•</span>
                          {getPlatformLabel(listing.source_platform)}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold">
                          {formatPrice(listing.price)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Added {formatDate(listing.first_scraped_at)}
                        </p>
                      </div>
                      <a 
                        href={listing.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4"
                      >
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
