"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Bell, 
  Plus, 
  Trash2,
  TrendingDown,
  TrendingUp,
  Clock,
  DollarSign,
  Home,
  Activity,
  Settings,
  Power,
  PowerOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Play,
  Square,
  ChevronDown,
  Ban
} from "lucide-react";
import { toast } from "sonner";

interface MarketIntelConfig {
  id: string;
  organizationId: string;
  isEnabled: boolean;
  platforms: string[];
  targetAreas: string[];
  targetMunicipalities: string[];
  transactionTypes: string[];
  propertyTypes: string[];
  minPrice: number | null;
  maxPrice: number | null;
  scrapeFrequency: string;
  lastScrapeAt: string | null;
  nextScrapeAt: string | null;
  maxPagesPerPlatform: number;
  status: string;
  lastError: string | null;
  consecutiveFailures: number;
}

interface Platform {
  id: string;
  name: string;
}

interface FrequencyOption {
  value: string;
  label: string;
  description: string;
}

interface Alert {
  id: string;
  name: string;
  alertType: string;
  criteria: Record<string, unknown>;
  isActive: boolean;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  lastTriggered: string | null;
  triggerCount: number;
}

interface PlatformProgress {
  status: "pending" | "running" | "completed" | "failed";
  total: number;
  passed: number;
  failed: number;
  errors: string[];
}

interface JobProgress {
  [platform: string]: PlatformProgress;
}

interface CurrentAction {
  type: "initializing" | "connecting" | "scrolling" | "extracting" | "analyzing" | "saving" | "waiting";
  message: string;
  propertyTitle?: string;
  platform?: string;
  page?: number;
}

interface ScrapeJob {
  jobId: string;
  status: string;
  currentPlatform: string | null;
  currentAction: CurrentAction | null;
  platforms: string[];
  progress: JobProgress;
  summary: {
    totalAnalyzed: number;
    totalPassed: number;
    totalFailed: number;
    uniqueErrors: string[];
  };
  startedAt: string;
  completedAt: string | null;
  elapsedSeconds: number;
  errorMessage: string | null;
}

const ALERT_TYPES = [
  { value: "PRICE_DROP", label: "Price Drop", icon: TrendingDown, description: "When a listing price decreases" },
  { value: "NEW_LISTING", label: "New Listing", icon: Home, description: "When new listings match criteria" },
  { value: "UNDERPRICED", label: "Underpriced", icon: DollarSign, description: "Listings below market average" },
  { value: "DAYS_ON_MARKET", label: "Stale Listing", icon: Clock, description: "Listings on market for X days" },
  { value: "PRICE_INCREASE", label: "Price Increase", icon: TrendingUp, description: "When prices increase" },
  { value: "INVENTORY_CHANGE", label: "Inventory Change", icon: Activity, description: "Significant area inventory changes" },
];

const PROPERTY_TYPES = [
  { value: "APARTMENT", label: "Apartment" },
  { value: "HOUSE", label: "House" },
  { value: "MAISONETTE", label: "Maisonette" },
  { value: "VILLA", label: "Villa" },
  { value: "LAND", label: "Land" },
  { value: "COMMERCIAL", label: "Commercial" },
];

export default function MarketIntelSettingsPage() {
  // Configuration state
  const [config, setConfig] = useState<MarketIntelConfig | null>(null);
  const [availablePlatforms, setAvailablePlatforms] = useState<Platform[]>([]);
  const [frequencyOptions, setFrequencyOptions] = useState<FrequencyOption[]>([]);
  const [schemaExists, setSchemaExists] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);
  
  // Form state
  const [formState, setFormState] = useState({
    isEnabled: false,
    platforms: [] as string[],
    targetAreas: "",
    transactionTypes: ["sale", "rent"],
    propertyTypes: [] as string[],
    minPrice: "",
    maxPrice: "",
    scrapeFrequency: "DAILY",
    maxPagesPerPlatform: 10
  });
  
  // Alert state
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  
  // Scrape job state
  const [activeJob, setActiveJob] = useState<ScrapeJob | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // New alert form state
  const [newAlert, setNewAlert] = useState({
    name: "",
    alertType: "",
    area: "",
    minPrice: "",
    maxPrice: "",
    propertyType: "",
    threshold: "10",
    emailEnabled: true,
    inAppEnabled: true
  });

  // Poll for job progress
  const pollJobProgress = useCallback(async (jobId: string) => {
    try {
      const res = await fetch(`/api/market-intel/scrape/${jobId}`);
      if (!res.ok) return;
      
      const job: ScrapeJob = await res.json();
      setActiveJob(job);
      
      // Stop polling if job is complete
      if (["COMPLETED", "FAILED", "CANCELLED"].includes(job.status)) {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        
        // Show completion toast
        if (job.status === "COMPLETED") {
          toast.success(`Scrape completed! Analyzed ${job.summary.totalAnalyzed} listings.`);
        } else if (job.status === "FAILED") {
          toast.error("Scrape failed. Check the errors for details.");
        }
        
        // Reload config to get updated stats
        loadConfig();
      }
    } catch (error) {
      console.error("Failed to poll job progress:", error);
    }
  }, []);

  // Check for active jobs on mount
  const checkActiveJob = useCallback(async () => {
    try {
      const res = await fetch("/api/market-intel/scrape");
      if (!res.ok) return;
      
      const data = await res.json();
      setHasAccess(data.hasAccess !== false);
      
      if (data.activeJob) {
        setActiveJob({
          jobId: data.activeJob.id,
          status: data.activeJob.status,
          currentPlatform: data.activeJob.currentPlatform,
          platforms: data.activeJob.platforms || [],
          progress: data.activeJob.progress || {},
          summary: { totalAnalyzed: 0, totalPassed: 0, totalFailed: 0, uniqueErrors: [] },
          startedAt: data.activeJob.startedAt,
          completedAt: null,
          elapsedSeconds: 0,
          errorMessage: null
        });
        
        // Start polling
        pollingRef.current = setInterval(() => {
          pollJobProgress(data.activeJob.id);
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to check active job:", error);
    }
  }, [pollJobProgress]);

  useEffect(() => {
    loadConfig();
    loadAlerts();
    checkActiveJob();
    
    // Cleanup polling on unmount
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [checkActiveJob]);

  const loadConfig = async () => {
    try {
      const res = await fetch("/api/market-intel/config");
      const data = await res.json();
      
      if (data.config) {
        setConfig(data.config);
        setFormState({
          isEnabled: data.config.isEnabled,
          platforms: data.config.platforms || [],
          targetAreas: (data.config.targetAreas || []).join(", "),
          transactionTypes: data.config.transactionTypes || ["sale", "rent"],
          propertyTypes: data.config.propertyTypes || [],
          minPrice: data.config.minPrice?.toString() || "",
          maxPrice: data.config.maxPrice?.toString() || "",
          scrapeFrequency: data.config.scrapeFrequency || "DAILY",
          maxPagesPerPlatform: data.config.maxPagesPerPlatform || 10
        });
      }
      
      setAvailablePlatforms(data.availablePlatforms || []);
      setFrequencyOptions(data.frequencyOptions || []);
      setSchemaExists(data.schemaExists);
      if (data.hasAccess !== undefined) {
        setHasAccess(data.hasAccess);
      }
    } catch (error) {
      console.error("Failed to load config:", error);
      toast.error("Failed to load configuration");
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/market-intel/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isEnabled: formState.isEnabled,
          platforms: formState.platforms,
          targetAreas: formState.targetAreas.split(",").map(a => a.trim()).filter(Boolean),
          transactionTypes: formState.transactionTypes,
          propertyTypes: formState.propertyTypes,
          minPrice: formState.minPrice ? Number.parseInt(formState.minPrice, 10) : null,
          maxPrice: formState.maxPrice ? Number.parseInt(formState.maxPrice, 10) : null,
          scrapeFrequency: formState.scrapeFrequency,
          maxPagesPerPlatform: formState.maxPagesPerPlatform
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to save configuration");
      }

      setConfig(data.config);
      toast.success(data.message || "Configuration saved");
    } catch (error) {
      console.error("Failed to save config:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = async () => {
    const newEnabled = !formState.isEnabled;
    setFormState(prev => ({ ...prev, isEnabled: newEnabled }));
    
    try {
      const res = await fetch("/api/market-intel/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: newEnabled })
      });

      if (!res.ok) throw new Error("Failed to toggle");
      
      const data = await res.json();
      setConfig(data.config);
      toast.success(newEnabled ? "Market Intelligence enabled" : "Market Intelligence paused");
    } catch {
      setFormState(prev => ({ ...prev, isEnabled: !newEnabled }));
      toast.error("Failed to toggle Market Intelligence");
    }
  };

  const triggerScrape = async () => {
    setTriggering(true);
    try {
      const res = await fetch("/api/market-intel/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to start scrape");
      }

      toast.success("Scrape started! Monitoring progress...");
      
      // Initialize active job state
      setActiveJob({
        jobId: data.jobId,
        status: "RUNNING",
        currentPlatform: null,
        currentAction: {
          type: "initializing",
          message: "Preparing to scan platforms..."
        },
        platforms: data.platforms || [],
        progress: {},
        summary: { totalAnalyzed: 0, totalPassed: 0, totalFailed: 0, uniqueErrors: [] },
        startedAt: new Date().toISOString(),
        completedAt: null,
        elapsedSeconds: 0,
        errorMessage: null
      });
      
      // Start polling for progress
      pollingRef.current = setInterval(() => {
        pollJobProgress(data.jobId);
      }, 1000);
      
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start scrape");
    } finally {
      setTriggering(false);
    }
  };

  const cancelScrape = async () => {
    if (!activeJob) return;
    
    try {
      const res = await fetch(`/api/market-intel/scrape/${activeJob.jobId}`, {
        method: "DELETE"
      });

      if (res.ok) {
        toast.success("Scrape cancelled");
        
        // Stop polling
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        
        setActiveJob(prev => prev ? { ...prev, status: "CANCELLED" } : null);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to cancel scrape");
      }
    } catch (error) {
      toast.error("Failed to cancel scrape");
    }
  };

  const getPlatformName = (platformId: string): string => {
    const platform = availablePlatforms.find(p => p.id === platformId);
    return platform?.name || platformId;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case 'ERROR':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'PAUSED':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-success/20 text-emerald-700 dark:text-emerald-400 border-success/30">Active</Badge>;
      case 'ERROR':
        return <Badge variant="destructive">Error</Badge>;
      case 'PAUSED':
        return <Badge variant="secondary">Paused</Badge>;
      case 'DISABLED':
        return <Badge variant="outline">Disabled</Badge>;
      default:
        return <Badge variant="outline">Setup Required</Badge>;
    }
  };

  const loadAlerts = async () => {
    try {
      const res = await fetch("/api/market-intel/alerts");
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error("Failed to load alerts:", error);
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  };

  const createAlert = async () => {
    if (!newAlert.name || !newAlert.alertType) {
      toast.error("Please fill in required fields");
      return;
    }

    setSaving(true);
    try {
      const criteria: Record<string, unknown> = {};
      if (newAlert.area) criteria.area = newAlert.area;
      if (newAlert.minPrice) criteria.minPrice = Number.parseInt(newAlert.minPrice, 10);
      if (newAlert.maxPrice) criteria.maxPrice = Number.parseInt(newAlert.maxPrice, 10);
      if (newAlert.propertyType) criteria.propertyType = newAlert.propertyType;
      if (newAlert.threshold) criteria.threshold = Number.parseInt(newAlert.threshold, 10);

      const res = await fetch("/api/market-intel/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAlert.name,
          alertType: newAlert.alertType,
          criteria,
          emailEnabled: newAlert.emailEnabled,
          inAppEnabled: newAlert.inAppEnabled
        })
      });

      if (!res.ok) throw new Error("Failed to create alert");

      toast.success("Alert created successfully");
      setDialogOpen(false);
      setNewAlert({
        name: "",
        alertType: "",
        area: "",
        minPrice: "",
        maxPrice: "",
        propertyType: "",
        threshold: "10",
        emailEnabled: true,
        inAppEnabled: true
      });
      loadAlerts();
    } catch (error) {
      console.error("Failed to create alert:", error);
      toast.error("Failed to create alert");
    } finally {
      setSaving(false);
    }
  };

  const toggleAlert = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch("/api/market-intel/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive })
      });

      if (!res.ok) throw new Error("Failed to update alert");

      setAlerts(prev => prev.map(a => a.id === id ? { ...a, isActive } : a));
      toast.success(isActive ? "Alert enabled" : "Alert disabled");
    } catch (error) {
      console.error("Failed to toggle alert:", error);
      toast.error("Failed to update alert");
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      const res = await fetch(`/api/market-intel/alerts?id=${id}`, {
        method: "DELETE"
      });

      if (!res.ok) throw new Error("Failed to delete alert");

      setAlerts(prev => prev.filter(a => a.id !== id));
      toast.success("Alert deleted");
    } catch (error) {
      console.error("Failed to delete alert:", error);
      toast.error("Failed to delete alert");
    }
  };

  const getAlertTypeInfo = (type: string) => {
    return ALERT_TYPES.find(t => t.value === type);
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Settings className="h-8 w-8 mr-2" />
            Market Intelligence Settings
          </h1>
          <p className="text-muted-foreground">
            Configure data collection and alert notifications
          </p>
        </div>
        
        {config && (
          <div className="flex items-center gap-4">
            {getStatusBadge(config.status)}
            <Button
              variant={formState.isEnabled ? "destructive" : "default"}
              onClick={toggleEnabled}
              disabled={!schemaExists}
            >
              {formState.isEnabled ? (
                <>
                  <PowerOff className="h-4 w-4 mr-2" />
                  Disable
                </>
              ) : (
                <>
                  <Power className="h-4 w-4 mr-2" />
                  Enable
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Access Denied Warning */}
      {!hasAccess && (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Ban className="h-6 w-6 text-destructive" />
              <div>
                <h3 className="font-semibold text-destructive">Access Not Granted</h3>
                <p className="text-destructive/80 text-sm mt-1">
                  Your organization does not have access to Market Intelligence.
                  Please contact your platform administrator to request access.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schema Warning */}
      {hasAccess && !schemaExists && (
        <Card className="border-warning/30 bg-warning/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertCircle className="h-6 w-6 text-warning dark:text-amber-400" />
              <div>
                <h3 className="font-semibold text-amber-700 dark:text-amber-300">Database Setup Required</h3>
                <p className="text-warning dark:text-amber-400 text-sm mt-1">
                  The Market Intelligence database schema has not been created yet.
                  Please run the database migration to enable this feature.
                </p>
                <pre className="mt-2 text-xs bg-warning/20 p-2 rounded text-amber-800 dark:text-amber-200">
                  pnpm prisma migrate deploy
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Scrape Progress */}
      {activeJob && ["PENDING", "RUNNING"].includes(activeJob.status) && (
        <Card className="border-primary/30 bg-primary/5 dark:bg-primary/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                Scrape in Progress
              </CardTitle>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={cancelScrape}
              >
                <Square className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
            <CardDescription>
              Analyzing competitor listings from {activeJob.platforms.length} platform{activeJob.platforms.length > 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dynamic Status Banner - AI-like */}
            {activeJob.currentAction && (
              <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    {activeJob.currentAction.type === "connecting" && (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-primary animate-pulse" />
                      </div>
                    )}
                    {activeJob.currentAction.type === "scrolling" && (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      </div>
                    )}
                    {activeJob.currentAction.type === "extracting" && (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Home className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    {activeJob.currentAction.type === "analyzing" && (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Activity className="h-4 w-4 text-primary animate-pulse" />
                      </div>
                    )}
                    {activeJob.currentAction.type === "saving" && (
                      <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      </div>
                    )}
                    {(activeJob.currentAction.type === "initializing" || activeJob.currentAction.type === "waiting") && (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {activeJob.currentAction.message}
                    </p>
                    {activeJob.currentAction.propertyTitle && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        &ldquo;{activeJob.currentAction.propertyTitle}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Overall Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">
                  {activeJob.summary.totalAnalyzed} listings analyzed
                </span>
              </div>
              <Progress 
                value={
                  activeJob.platforms.length > 0 
                    ? (Object.values(activeJob.progress).filter(p => p.status === "completed").length / activeJob.platforms.length) * 100 
                    : 0
                } 
                className="h-2"
              />
            </div>

            {/* Platform-by-Platform Progress */}
            <div className="space-y-3">
              {activeJob.platforms.map((platformId) => {
                const progress = activeJob.progress[platformId] || { status: "pending", total: 0, passed: 0, failed: 0, errors: [] };
                const isActive = activeJob.currentPlatform === platformId;
                const currentAction = activeJob.currentAction;
                
                // Dynamic status badge text based on current action
                const getStatusBadgeText = () => {
                  if (!isActive || !currentAction) return "Scanning...";
                  switch (currentAction.type) {
                    case "connecting": return "Connecting...";
                    case "scrolling": return "Loading pages...";
                    case "extracting": return "Extracting data...";
                    case "analyzing": return "Analyzing...";
                    case "saving": return "Saving...";
                    case "waiting": return "Processing...";
                    default: return "Scanning...";
                  }
                };
                
                return (
                  <div 
                    key={platformId}
                    className={`p-3 rounded-lg border transition-colors ${
                      isActive 
                        ? "border-primary bg-primary/10 dark:bg-primary/20" 
                        : progress.status === "completed"
                        ? "border-success/30 bg-success/10 dark:bg-success/10"
                        : progress.status === "failed"
                        ? "border-destructive/30 bg-destructive/10 dark:bg-destructive/10"
                        : "border-border bg-muted/30 dark:bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isActive && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                        {progress.status === "completed" && <CheckCircle2 className="h-4 w-4 text-success" />}
                        {progress.status === "failed" && <XCircle className="h-4 w-4 text-destructive" />}
                        {progress.status === "pending" && <Clock className="h-4 w-4 text-muted-foreground" />}
                        <span className="font-medium text-foreground">{getPlatformName(platformId)}</span>
                        {isActive && (
                          <Badge variant="secondary" className="text-xs animate-pulse">
                            {getStatusBadgeText()}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">{progress.total} analyzed</span>
                        <span className="text-success dark:text-emerald-400 font-medium">{progress.passed} passed</span>
                        {progress.failed > 0 && (
                          <span className="text-destructive font-medium">{progress.failed} failed</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Error Details */}
                    {progress.errors.length > 0 && (
                      <Collapsible className="mt-2">
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive">
                            <ChevronDown className="h-3 w-3 mr-1" />
                            {progress.errors.length} error{progress.errors.length > 1 ? "s" : ""}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-1">
                          <div className="text-xs text-destructive space-y-1 pl-4">
                            {progress.errors.slice(0, 5).map((err, i) => (
                              <p key={i}>• {err}</p>
                            ))}
                            {progress.errors.length > 5 && (
                              <p className="text-muted-foreground">... and {progress.errors.length - 5} more</p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{activeJob.summary.totalAnalyzed}</p>
                <p className="text-xs text-muted-foreground">Total Analyzed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-success dark:text-emerald-400">{activeJob.summary.totalPassed}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">{activeJob.summary.totalFailed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Scrape Summary */}
      {activeJob && ["COMPLETED", "FAILED"].includes(activeJob.status) && (
        <Card className={`${activeJob.status === "COMPLETED" ? "border-success/30 bg-success/10 dark:bg-success/10" : "border-destructive/30 bg-destructive/10 dark:bg-destructive/10"}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {activeJob.status === "COMPLETED" ? (
                  <CheckCircle2 className="h-5 w-5 text-success dark:text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                Scrape {activeJob.status === "COMPLETED" ? "Completed" : "Failed"}
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setActiveJob(null)}
              >
                Dismiss
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground">{activeJob.summary.totalAnalyzed}</p>
                <p className="text-xs text-muted-foreground">Total Analyzed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-success dark:text-emerald-400">{activeJob.summary.totalPassed}</p>
                <p className="text-xs text-muted-foreground">Saved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">{activeJob.summary.totalFailed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
            
            {activeJob.summary.uniqueErrors.length > 0 && (
              <Collapsible className="mt-4" open={showErrors} onOpenChange={setShowErrors}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${showErrors ? "rotate-180" : ""}`} />
                    View {activeJob.summary.uniqueErrors.length} unique error{activeJob.summary.uniqueErrors.length > 1 ? "s" : ""}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive space-y-1">
                    {activeJob.summary.uniqueErrors.map((err, i) => (
                      <p key={i}>• {err}</p>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="configuration" className="space-y-4">
        <TabsList>
          <TabsTrigger value="configuration">
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <Bell className="h-4 w-4 mr-2" />
            Alerts
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-4">
          {/* Status Card */}
          {config && config.status !== 'PENDING_SETUP' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {getStatusIcon(config.status)}
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium">{config.status}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Scrape</p>
                    <p className="font-medium">
                      {config.lastScrapeAt 
                        ? new Date(config.lastScrapeAt).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Next Scrape</p>
                    <p className="font-medium">
                      {config.nextScrapeAt 
                        ? new Date(config.nextScrapeAt).toLocaleString()
                        : "Not scheduled"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Failures</p>
                    <p className="font-medium">{config.consecutiveFailures}</p>
                  </div>
                </div>
                {config.lastError && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{config.lastError}</p>
                  </div>
                )}
                <div className="mt-4">
                  <Button 
                    variant="default"
                    onClick={triggerScrape}
                    disabled={triggering || !formState.isEnabled || !hasAccess || (activeJob && ["PENDING", "RUNNING"].includes(activeJob.status))}
                  >
                    {triggering ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Starting...
                      </>
                    ) : activeJob && ["PENDING", "RUNNING"].includes(activeJob.status) ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Scrape in Progress
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Start Scrape Now
                      </>
                    )}
                  </Button>
                  {!hasAccess && (
                    <p className="text-xs text-destructive mt-2">
                      Access required. Contact your administrator.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Platform Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Data Sources</CardTitle>
              <CardDescription>
                Select which Greek real estate platforms to monitor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {availablePlatforms.map((platform) => (
                  <div 
                    key={platform.id}
                    className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                      formState.platforms.includes(platform.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => {
                      setFormState(prev => ({
                        ...prev,
                        platforms: prev.platforms.includes(platform.id)
                          ? prev.platforms.filter(p => p !== platform.id)
                          : [...prev.platforms, platform.id]
                      }));
                    }}
                  >
                    <Checkbox 
                      checked={formState.platforms.includes(platform.id)}
                      onCheckedChange={() => {}}
                    />
                    <div>
                      <p className="font-medium">{platform.name}</p>
                      <p className="text-xs text-muted-foreground">{platform.id}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Filtering Options */}
          <Card>
            <CardHeader>
              <CardTitle>Search Filters</CardTitle>
              <CardDescription>
                Narrow down which listings to collect
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Target Areas */}
              <div className="space-y-2">
                <Label htmlFor="targetAreas">Target Areas</Label>
                <Input
                  id="targetAreas"
                  placeholder="e.g., Κολωνάκι, Γλυφάδα, Κηφισιά (comma separated)"
                  value={formState.targetAreas}
                  onChange={(e) => setFormState(prev => ({ ...prev, targetAreas: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to collect from all areas
                </p>
              </div>

              {/* Transaction Types */}
              <div className="space-y-2">
                <Label>Transaction Types</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="sale"
                      checked={formState.transactionTypes.includes("sale")}
                      onCheckedChange={(checked) => {
                        setFormState(prev => ({
                          ...prev,
                          transactionTypes: checked
                            ? [...prev.transactionTypes, "sale"]
                            : prev.transactionTypes.filter(t => t !== "sale")
                        }));
                      }}
                    />
                    <Label htmlFor="sale" className="cursor-pointer">For Sale</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="rent"
                      checked={formState.transactionTypes.includes("rent")}
                      onCheckedChange={(checked) => {
                        setFormState(prev => ({
                          ...prev,
                          transactionTypes: checked
                            ? [...prev.transactionTypes, "rent"]
                            : prev.transactionTypes.filter(t => t !== "rent")
                        }));
                      }}
                    />
                    <Label htmlFor="rent" className="cursor-pointer">For Rent</Label>
                  </div>
                </div>
              </div>

              {/* Property Types */}
              <div className="space-y-2">
                <Label>Property Types</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {PROPERTY_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center space-x-2">
                      <Checkbox 
                        id={type.value}
                        checked={formState.propertyTypes.includes(type.value)}
                        onCheckedChange={(checked) => {
                          setFormState(prev => ({
                            ...prev,
                            propertyTypes: checked
                              ? [...prev.propertyTypes, type.value]
                              : prev.propertyTypes.filter(t => t !== type.value)
                          }));
                        }}
                      />
                      <Label htmlFor={type.value} className="cursor-pointer">{type.label}</Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave all unchecked to collect all property types
                </p>
              </div>

              {/* Price Range */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minPrice">Min Price (€)</Label>
                  <Input
                    id="minPrice"
                    type="number"
                    placeholder="0"
                    value={formState.minPrice}
                    onChange={(e) => setFormState(prev => ({ ...prev, minPrice: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPrice">Max Price (€)</Label>
                  <Input
                    id="maxPrice"
                    type="number"
                    placeholder="No limit"
                    value={formState.maxPrice}
                    onChange={(e) => setFormState(prev => ({ ...prev, maxPrice: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule Settings</CardTitle>
              <CardDescription>
                Configure how often to collect new data
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Update Frequency</Label>
                <Select
                  value={formState.scrapeFrequency}
                  onValueChange={(v) => setFormState(prev => ({ ...prev, scrapeFrequency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {frequencyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            - {option.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxPages">Max Pages per Platform</Label>
                <Input
                  id="maxPages"
                  type="number"
                  min={1}
                  max={100}
                  value={formState.maxPagesPerPlatform}
                  onChange={(e) => setFormState(prev => ({ ...prev, maxPagesPerPlatform: Number.parseInt(e.target.value, 10) || 10 }))}
                />
                <p className="text-xs text-muted-foreground">
                  Limit pages to control data volume (1 page ≈ 20 listings)
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={saveConfig} disabled={saving || !schemaExists || !hasAccess}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Configuration"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Alert
                </Button>
              </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Alert</DialogTitle>
              <DialogDescription>
                Set up a new market intelligence alert
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Alert Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Kolonaki Price Drops"
                  value={newAlert.name}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alertType">Alert Type *</Label>
                <Select 
                  value={newAlert.alertType} 
                  onValueChange={(v) => setNewAlert(prev => ({ ...prev, alertType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select alert type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALERT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <type.icon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Area (optional)</Label>
                <Input
                  id="area"
                  placeholder="e.g., Κολωνάκι"
                  value={newAlert.area}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, area: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minPrice">Min Price</Label>
                  <Input
                    id="minPrice"
                    type="number"
                    placeholder="0"
                    value={newAlert.minPrice}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, minPrice: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPrice">Max Price</Label>
                  <Input
                    id="maxPrice"
                    type="number"
                    placeholder="1000000"
                    value={newAlert.maxPrice}
                    onChange={(e) => setNewAlert(prev => ({ ...prev, maxPrice: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="threshold">Threshold % (for price alerts)</Label>
                <Input
                  id="threshold"
                  type="number"
                  placeholder="10"
                  value={newAlert.threshold}
                  onChange={(e) => setNewAlert(prev => ({ ...prev, threshold: e.target.value }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="email">Email notifications</Label>
                <Switch
                  id="email"
                  checked={newAlert.emailEnabled}
                  onCheckedChange={(c) => setNewAlert(prev => ({ ...prev, emailEnabled: c }))}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="inApp">In-app notifications</Label>
                <Switch
                  id="inApp"
                  checked={newAlert.inAppEnabled}
                  onCheckedChange={(c) => setNewAlert(prev => ({ ...prev, inAppEnabled: c }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createAlert} disabled={saving}>
                {saving ? "Creating..." : "Create Alert"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

          {/* Alert List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Alerts</CardTitle>
              <CardDescription>
                {alerts.length} alert{alerts.length === 1 ? '' : 's'} configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alerts.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No alerts configured yet</p>
                  <p className="text-sm text-muted-foreground">
                    Create an alert to get notified about market changes
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => {
                    const typeInfo = getAlertTypeInfo(alert.alertType);
                    const Icon = typeInfo?.icon || Bell;
                    
                    return (
                      <div 
                        key={alert.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg ${alert.isActive ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Icon className={`h-5 w-5 ${alert.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{alert.name}</p>
                              <Badge variant="secondary">
                                {typeInfo?.label || alert.alertType}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              {alert.criteria && (
                                <>
                                  {(alert.criteria as { area?: string }).area && (
                                    <span>Area: {(alert.criteria as { area: string }).area}</span>
                                  )}
                                  {(alert.criteria as { threshold?: number }).threshold && (
                                    <span>• {(alert.criteria as { threshold: number }).threshold}% threshold</span>
                                  )}
                                </>
                              )}
                              <span>• Triggered {alert.triggerCount} times</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {alert.emailEnabled && (
                              <Badge variant="outline">Email</Badge>
                            )}
                            {alert.inAppEnabled && (
                              <Badge variant="outline">In-app</Badge>
                            )}
                          </div>
                          <Switch
                            checked={alert.isActive}
                            onCheckedChange={(checked) => toggleAlert(alert.id, checked)}
                          />
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteAlert(alert.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
