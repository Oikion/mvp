"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Globe,
  Settings,
  History,
  Users,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

// Import XE components
import { XeIntegrationForm } from "@/components/xe/xe-integration-form";
import { XeAgentSettingsTable } from "@/components/xe/xe-agent-settings";
import { XeSyncHistoryTable } from "@/components/xe/xe-sync-history";

// Import actions
import {
  getXeIntegration,
  getXeSyncStats,
} from "@/actions/xe";

export default function XeIntegrationPage() {
  const locale = useLocale() as "en" | "el";
  const [loading, setLoading] = useState(true);
  const [integration, setIntegration] = useState<{
    id: string;
    username: string;
    authToken: string;
    agentId: string;
    isActive: boolean;
    autoPublish: boolean;
    publicationType: "BASIC" | "GOLD";
    trademark: string | null;
    lastSyncAt: Date | null;
    lastPackageId: string | null;
  } | null>(null);
  const [stats, setStats] = useState<{
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    pendingSyncs: number;
    totalPropertiesSynced: number;
    lastSyncAt: Date | null;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [integrationResult, statsResult] = await Promise.all([
        getXeIntegration(),
        getXeSyncStats(),
      ]);

      if (integrationResult.success && integrationResult.data) {
        setIntegration(integrationResult.data);
      }

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }
    } catch (error) {
      console.error("Failed to load XE integration data:", error);
      toast.error(
        locale === "el"
          ? "Αποτυχία φόρτωσης ρυθμίσεων"
          : "Failed to load settings"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Globe className="h-8 w-8 text-success" />
            {locale === "el" ? "Ενσωμάτωση xe.gr" : "xe.gr Integration"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {locale === "el"
              ? "Διαχείριση αυτόματης δημοσίευσης ακινήτων στο xe.gr"
              : "Manage automatic property publishing to xe.gr portal"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {integration ? (
            <Badge
              variant={integration.isActive ? "default" : "secondary"}
              className={
                integration.isActive
                  ? "bg-success/10 text-success hover:bg-success/20"
                  : ""
              }
            >
              {integration.isActive ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {locale === "el" ? "Ενεργό" : "Active"}
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1" />
                  {locale === "el" ? "Ανενεργό" : "Inactive"}
                </>
              )}
            </Badge>
          ) : (
            <Badge variant="outline">
              <AlertCircle className="h-3 w-3 mr-1" />
              {locale === "el" ? "Δεν έχει ρυθμιστεί" : "Not configured"}
            </Badge>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && integration && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {locale === "el" ? "Δημοσιευμένα" : "Published"}
              </CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalPropertiesSynced}
              </div>
              <p className="text-xs text-muted-foreground">
                {locale === "el" ? "ακίνητα στο xe.gr" : "properties on xe.gr"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {locale === "el" ? "Επιτυχείς Συγχρονισμοί" : "Successful Syncs"}
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successfulSyncs}</div>
              <p className="text-xs text-muted-foreground">
                {locale === "el"
                  ? `από ${stats.totalSyncs} συνολικά`
                  : `of ${stats.totalSyncs} total`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {locale === "el" ? "Αποτυχημένοι" : "Failed"}
              </CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.failedSyncs}</div>
              <p className="text-xs text-muted-foreground">
                {locale === "el" ? "χρειάζονται επανάληψη" : "need retry"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {locale === "el" ? "Σε Εκκρεμότητα" : "Pending"}
              </CardTitle>
              <RefreshCw className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingSyncs}</div>
              <p className="text-xs text-muted-foreground">
                {locale === "el" ? "αναμένουν επιβεβαίωση" : "awaiting confirmation"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="inline-grid grid-cols-3">
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 shrink-0" />
            {locale === "el" ? "Ρυθμίσεις" : "Settings"}
          </TabsTrigger>
          <TabsTrigger value="agents">
            <Users className="h-4 w-4 shrink-0" />
            {locale === "el" ? "Πράκτορες" : "Agents"}
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 shrink-0" />
            {locale === "el" ? "Ιστορικό" : "History"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <XeIntegrationForm
            integration={integration}
            onSave={loadData}
          />
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          <XeAgentSettingsTable onUpdate={loadData} />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <XeSyncHistoryTable />
        </TabsContent>
      </Tabs>

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle>
            {locale === "el" ? "Οδηγός Εγκατάστασης" : "Setup Guide"}
          </CardTitle>
          <CardDescription>
            {locale === "el"
              ? "Πώς να συνδέσετε το Oikion με το xe.gr"
              : "How to connect Oikion with xe.gr"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">1</Badge>
                <span className="font-medium">
                  {locale === "el" ? "Λάβετε Διαπιστευτήρια" : "Get Credentials"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {locale === "el"
                  ? "Επικοινωνήστε με το xe.gr για να αποκτήσετε πρόσβαση στο Bulk Import Tool (BIT) API."
                  : "Contact xe.gr to get access to their Bulk Import Tool (BIT) API."}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">2</Badge>
                <span className="font-medium">
                  {locale === "el" ? "Ρυθμίστε τους Πράκτορες" : "Configure Agents"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {locale === "el"
                  ? "Προσθέστε τα στοιχεία XE για κάθε πράκτορα που θα δημοσιεύει ακίνητα."
                  : "Add XE details for each agent who will publish properties."}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">3</Badge>
                <span className="font-medium">
                  {locale === "el" ? "Δημοσιεύστε Ακίνητα" : "Publish Properties"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {locale === "el"
                  ? "Επιλέξτε ακίνητα από τη λίστα MLS και δημοσιεύστε τα στο xe.gr."
                  : "Select properties from your MLS listings and publish to xe.gr."}
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">
              {locale === "el" ? "Σύνδεσμοι Βοήθειας" : "Helpful Links"}
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://www.xe.gr/property/pros"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {locale === "el" ? "Μεσιτικά Γραφεία xe.gr" : "xe.gr Real Estate Agencies"}
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://support.xe.gr/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {locale === "el" ? "Υποστήριξη xe.gr" : "xe.gr Support"}
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
