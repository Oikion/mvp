"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  TrendingDown, 
  TrendingUp, 
  ExternalLink,
  MapPin,
  Square,
  Activity,
  RefreshCw
} from "lucide-react";

interface PriceChange {
  listingId: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  changeType: string;
  recordedAt: string;
  listing: {
    id: string;
    title: string;
    area: string;
    size_sqm: number;
    source_url: string;
    source_platform: string;
    property_type: string;
  };
}

interface Summary {
  total: number;
  increases: number;
  decreases: number;
  avgIncreasePercent: number;
  avgDecreasePercent: number;
}

export default function PriceTrackerPage() {
  const [loading, setLoading] = useState(true);
  const [changes, setChanges] = useState<PriceChange[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [timeRange, setTimeRange] = useState("168"); // 7 days default
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    loadData();
  }, [timeRange, filterType]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("hours", timeRange);
      if (filterType !== "all") {
        params.set("type", filterType);
      }

      const res = await fetch(`/api/market-intel/price-changes?${params.toString()}`);
      const data = await res.json();

      setChanges(data.changes || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error("Failed to load price changes:", error);
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
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
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Price Tracker
          </h1>
          <p className="text-muted-foreground">
            Monitor price changes across competitor listings
          </p>
        </div>
        <Button 
          onClick={loadData} 
          variant="outline" 
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Changes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Price Drops
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-success" />
                <span className="text-2xl font-bold">{summary.decreases}</span>
              </div>
              {summary.avgDecreasePercent > 0 && (
                <p className="text-sm text-muted-foreground">
                  Avg: -{summary.avgDecreasePercent}%
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Price Increases
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-destructive" />
                <span className="text-2xl font-bold">{summary.increases}</span>
              </div>
              {summary.avgIncreasePercent > 0 && (
                <p className="text-sm text-muted-foreground">
                  Avg: +{summary.avgIncreasePercent}%
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Drop Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {summary.total > 0 
                  ? Math.round((summary.decreases / summary.total) * 100) 
                  : 0}%
              </p>
              <p className="text-sm text-muted-foreground">of all changes</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24">Last 24 hours</SelectItem>
            <SelectItem value="72">Last 3 days</SelectItem>
            <SelectItem value="168">Last 7 days</SelectItem>
            <SelectItem value="336">Last 14 days</SelectItem>
            <SelectItem value="720">Last 30 days</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Changes</SelectItem>
            <SelectItem value="decrease">Price Drops</SelectItem>
            <SelectItem value="increase">Price Increases</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Changes List */}
      <Card>
        <CardHeader>
          <CardTitle>Price Changes</CardTitle>
          <CardDescription>
            {changes.length} price change{changes.length !== 1 ? 's' : ''} in selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          {changes.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No price changes found</p>
              <p className="text-sm text-muted-foreground">
                Try expanding the time range
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {changes.map((change, idx) => (
                <div 
                  key={`${change.listingId}-${idx}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      change.changeType === 'decrease' 
                        ? 'bg-success/20' 
                        : 'bg-destructive/20'
                    }`}>
                      {change.changeType === 'decrease' ? (
                        <TrendingDown className="h-5 w-5 text-success dark:text-success" />
                      ) : (
                        <TrendingUp className="h-5 w-5 text-destructive" />
                      )}
                    </div>
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
                  </div>

                  <div className="text-right ml-4 flex items-center gap-6">
                    <div>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-muted-foreground line-through text-sm">
                          {formatPrice(change.oldPrice)}
                        </span>
                        <span className="text-lg font-bold">
                          {formatPrice(change.newPrice)}
                        </span>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={
                          change.changeType === 'decrease'
                            ? 'bg-success/20 text-emerald-700 dark:text-success border-success/30'
                            : 'bg-destructive/20 text-destructive border-destructive/30'
                        }
                      >
                        {change.changeType === 'decrease' ? '-' : '+'}
                        {Math.abs(change.changePercent).toFixed(1)}%
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground w-24 text-right">
                      {formatDate(change.recordedAt)}
                    </div>

                    <a 
                      href={change.listing.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        </Card>
      </div>
    </div>
  );
}
