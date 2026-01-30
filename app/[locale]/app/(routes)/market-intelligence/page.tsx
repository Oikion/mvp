"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingDown, 
  Home, 
  MapPin,
  Clock,
  DollarSign,
  Activity,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Ban,
  Settings
} from "lucide-react";
import Link from "next/link";

interface PlatformStat {
  platform: string;
  totalListings: number;
  avgPrice: number;
  lastScrape: string | null;
}

interface AreaStat {
  area: string;
  totalListings: number;
  avgPrice: number;
  avgPricePerSqm: number;
  minPrice: number;
  maxPrice: number;
}

interface PriceChange {
  listingId: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  changeType: string;
  listing: {
    title: string;
    area: string;
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

export default function MarketIntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);
  const [platformStats, setPlatformStats] = useState<PlatformStat[]>([]);
  const [areaStats, setAreaStats] = useState<AreaStat[]>([]);
  const [priceDrops, setPriceDrops] = useState<PriceChange[]>([]);
  const [underpriced, setUnderpriced] = useState<UnderpricedListing[]>([]);
  const [totalListings, setTotalListings] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Check access first
      const configRes = await fetch("/api/market-intel/config");
      const configData = await configRes.json();
      
      if (configData.hasAccess === false) {
        setHasAccess(false);
        setLoading(false);
        return;
      }
      setHasAccess(true);

      const [statsRes, opportunitiesRes] = await Promise.all([
        fetch("/api/market-intel/stats?type=platforms"),
        fetch("/api/market-intel/opportunities?type=all")
      ]);

      const statsData = await statsRes.json();
      const opportunitiesData = await opportunitiesRes.json();

      setPlatformStats(statsData.stats || []);
      setTotalListings(statsData.stats?.reduce((sum: number, p: PlatformStat) => sum + p.totalListings, 0) || 0);
      
      setPriceDrops(opportunitiesData.priceDrops || []);
      setUnderpriced(opportunitiesData.underpriced || []);

      // Load area stats
      const areaRes = await fetch("/api/market-intel/stats?type=areas");
      const areaData = await areaRes.json();
      setAreaStats(areaData.stats?.slice(0, 10) || []);

    } catch (error) {
      console.error("Failed to load market intel data:", error);
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString("el-GR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      spitogatos: "bg-primary",
      xe_gr: "bg-success",
      tospitimou: "bg-violet-500"
    };
    return colors[platform] || "bg-muted-foreground";
  };

  const getPlatformName = (platform: string) => {
    const names: Record<string, string> = {
      spitogatos: "Spitogatos",
      xe_gr: "XE.gr",
      tospitimou: "Tospitimou"
    };
    return names[platform] || platform;
  };

  if (loading) {
    return (
      <div className="h-full overflow-auto">
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Show access denied message
  if (!hasAccess) {
    return (
      <div className="h-full overflow-auto">
        <div className="container mx-auto py-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Market Intelligence</h1>
            <p className="text-muted-foreground">
              Monitor competitor listings across Greek real estate platforms
            </p>
          </div>
          
          <Card className="p-8 border-destructive/30 bg-destructive/10">
            <div className="text-center space-y-4">
              <Ban className="h-16 w-16 text-destructive mx-auto" />
              <h2 className="text-2xl font-semibold text-destructive">Access Not Granted</h2>
              <p className="text-destructive/80 max-w-md mx-auto">
                Your organization does not have access to Market Intelligence.
                Please contact your platform administrator to request access.
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Show setup message if no data
  if (totalListings === 0 && platformStats.length === 0) {
    return (
      <div className="h-full overflow-auto">
        <div className="container mx-auto py-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Market Intelligence</h1>
            <p className="text-muted-foreground">
              Monitor competitor listings across Greek real estate platforms
            </p>
          </div>
          
          <Card className="p-8">
            <div className="text-center space-y-4">
              <Activity className="h-16 w-16 text-muted-foreground mx-auto" />
              <h2 className="text-2xl font-semibold">No Data Available</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                You have access to Market Intelligence but no data has been collected yet.
                Go to Settings to configure and start your first scrape.
              </p>
              <div className="flex justify-center gap-4 mt-4">
                <Link href="/app/market-intelligence/settings">
                  <Button>
                    <Settings className="h-4 w-4 mr-2" />
                    Configure & Start Scraping
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Market Intelligence</h1>
          <p className="text-muted-foreground">
            Monitor competitor listings across Greek real estate platforms
          </p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Listings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalListings.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {platformStats.length} platforms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Price Drops (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <TrendingDown className="h-5 w-5 text-success mr-2" />
              {priceDrops.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Potential opportunities
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Underpriced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <DollarSign className="h-5 w-5 text-warning mr-2" />
              {underpriced.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Below market average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Areas Tracked
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              <MapPin className="h-5 w-5 text-primary mr-2" />
              {areaStats.length}+
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Geographic coverage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Areas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Top Areas by Listings
                </CardTitle>
                <CardDescription>
                  Areas with most competitor listings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {areaStats.map((area, idx) => (
                    <div key={area.area} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground w-6">
                          {idx + 1}.
                        </span>
                        <span className="font-medium">{area.area}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          {area.totalListings} listings
                        </span>
                        <span className="font-medium">
                          {formatPrice(area.avgPricePerSqm)}/m²
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Link href="/app/market-intelligence/listings">
                    <Button variant="outline" size="sm" className="w-full">
                      View All Areas
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Recent Price Drops */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingDown className="h-5 w-5 mr-2 text-success" />
                  Recent Price Drops
                </CardTitle>
                <CardDescription>
                  Listings with price reductions this week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {priceDrops.slice(0, 5).map((change) => (
                    <div key={change.listingId} className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {change.listing.title || "Untitled listing"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {change.listing.area}
                        </p>
                      </div>
                      <div className="text-right ml-4">
                        <div className="flex items-center text-success dark:text-emerald-400">
                          <TrendingDown className="h-4 w-4 mr-1" />
                          {Math.abs(change.changePercent).toFixed(1)}%
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {formatPrice(change.newPrice)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Link href="/app/market-intelligence/price-tracker">
                    <Button variant="outline" size="sm" className="w-full">
                      View All Price Changes
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="platforms" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {platformStats.map((platform) => (
              <Card key={platform.platform}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${getPlatformColor(platform.platform)}`} />
                    {getPlatformName(platform.platform)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Listings</p>
                      <p className="text-2xl font-bold">
                        {platform.totalListings.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Price</p>
                      <p className="text-2xl font-bold">
                        {formatPrice(platform.avgPrice)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    Last scrape: {formatDate(platform.lastScrape)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-warning" />
                Underpriced Listings
              </CardTitle>
              <CardDescription>
                Properties priced significantly below market average for their area
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {underpriced.slice(0, 10).map((item) => (
                  <div 
                    key={item.listing.id} 
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {item.listing.title || "Untitled listing"}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {item.listing.area}
                        <span>•</span>
                        {item.listing.size_sqm} m²
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <Badge variant="secondary" className="bg-warning/20 text-amber-700 dark:text-amber-400 border-warning/30">
                        {item.percentBelowMarket.toFixed(1)}% below market
                      </Badge>
                      <p className="text-lg font-bold mt-1">
                        {formatPrice(item.listing.price)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Market avg: {formatPrice(item.marketAvgPricePerSqm * item.listing.size_sqm)}
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
                ))}
              </div>
              <div className="mt-4">
                <Link href="/app/market-intelligence/opportunities">
                  <Button variant="outline" className="w-full">
                    View All Opportunities
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-4">
        <Link href="/app/market-intelligence/listings">
          <Button>
            <Home className="h-4 w-4 mr-2" />
            Browse All Listings
          </Button>
        </Link>
        <Link href="/app/market-intelligence/price-tracker">
          <Button variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            Price Tracker
          </Button>
        </Link>
        <Link href="/app/market-intelligence/settings">
          <Button variant="outline">
            <AlertCircle className="h-4 w-4 mr-2" />
            Configure Alerts
          </Button>
        </Link>
        </div>
      </div>
    </div>
  );
}
