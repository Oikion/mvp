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
  Workflow,
  Settings,
  Users,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// Import N8N components
import { N8nConfigForm, N8nWorkflowAssignments } from "@/components/n8n";

// Import actions
import {
  getN8nConfig,
  getN8nStats,
  type N8nConfigData,
} from "@/actions/n8n";
import { getOrganizationUsers } from "@/actions/organization/get-organization-users";

interface OrgMember {
  id: string;
  clerkUserId: string;
  name: string | null;
  email: string;
  avatar: string | null;
}

export default function N8nIntegrationPage() {
  const locale = useLocale() as "en" | "el";
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<N8nConfigData | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [stats, setStats] = useState<{
    totalAssignments: number;
    activeAssignments: number;
    lastHealthCheck: Date | null;
    lastHealthStatus: string | null;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configResult, statsResult, orgUsers] = await Promise.all([
        getN8nConfig(),
        getN8nStats(),
        getOrganizationUsers<OrgMember>({
          select: {
            id: true,
            clerkUserId: true,
            name: true,
            email: true,
            avatar: true,
          },
        }),
      ]);

      if (configResult.success && configResult.data) {
        setConfig(configResult.data);
      } else {
        setConfig(null);
      }

      if (statsResult.success && statsResult.data) {
        setStats(statsResult.data);
      }

      if (orgUsers) {
        setMembers(
          orgUsers.map((u: any) => ({
            id: u.id,
            clerkUserId: u.clerkUserId || "",
            name: u.name,
            email: u.email,
            avatar: u.avatar,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to load n8n data:", error);
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Workflow className="h-8 w-8 text-warning" />
            {locale === "el" ? "Ενσωμάτωση n8n" : "n8n Integration"}
          </h1>
          <p className="text-muted-foreground mt-1">
            {locale === "el"
              ? "Διαχείριση αυτοματισμών και ροών εργασίας"
              : "Manage workflow automations for your organization"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {config ? (
            <Badge
              variant={config.isActive ? "default" : "secondary"}
              className={
                config.isActive
                  ? "bg-success/10 text-success hover:bg-success/20"
                  : ""
              }
            >
              {config.isActive ? (
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
      {config && stats && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {locale === "el" ? "Αναθέσεις" : "Assignments"}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAssignments}</div>
              <p className="text-xs text-muted-foreground">
                {locale === "el"
                  ? `${stats.activeAssignments} ενεργές`
                  : `${stats.activeAssignments} active`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {locale === "el" ? "Κατάσταση Σύνδεσης" : "Connection Status"}
              </CardTitle>
              {stats.lastHealthStatus === "healthy" ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : stats.lastHealthStatus === "error" ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : (
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {stats.lastHealthStatus || (locale === "el" ? "Άγνωστο" : "Unknown")}
              </div>
              {stats.lastHealthCheck && (
                <p className="text-xs text-muted-foreground">
                  {locale === "el" ? "Τελευταίος έλεγχος:" : "Last check:"}{" "}
                  {new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-US", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(stats.lastHealthCheck))}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {locale === "el" ? "Μέλη Οργανισμού" : "Org Members"}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
              <p className="text-xs text-muted-foreground">
                {locale === "el"
                  ? "διαθέσιμα για ανάθεση"
                  : "available for assignment"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {locale === "el" ? "Ενσωμάτωση" : "Integration"}
              </CardTitle>
              <Zap className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {config.isActive
                  ? (locale === "el" ? "Ενεργή" : "Active")
                  : (locale === "el" ? "Ανενεργή" : "Inactive")}
              </div>
              <p className="text-xs text-muted-foreground">
                {config.baseUrl}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList className="inline-grid grid-cols-2">
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 shrink-0" />
            {locale === "el" ? "Ρυθμίσεις" : "Settings"}
          </TabsTrigger>
          <TabsTrigger value="workflows">
            <Workflow className="h-4 w-4 shrink-0" />
            {locale === "el" ? "Ροές Εργασίας" : "Workflows"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          <N8nConfigForm config={config} onSave={loadData} />
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <N8nWorkflowAssignments
            isConfigured={!!config}
            isActive={config?.isActive ?? false}
            members={members}
            onUpdate={loadData}
          />
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
              ? "Πώς να συνδέσετε το Oikion με το n8n"
              : "How to connect Oikion with n8n"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">1</Badge>
                <span className="font-medium">
                  {locale === "el" ? "Ρύθμιση n8n" : "Set up n8n"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {locale === "el"
                  ? "Εγκαταστήστε το n8n και δημιουργήστε ένα API key από τις Ρυθμίσεις → n8n API."
                  : "Install n8n and create an API key from Settings → n8n API."}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">2</Badge>
                <span className="font-medium">
                  {locale === "el" ? "Σύνδεση" : "Connect"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {locale === "el"
                  ? "Εισάγετε τη διεύθυνση URL του n8n instance και ορίστε ένα webhook secret."
                  : "Enter your n8n instance URL and set a webhook secret."}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">3</Badge>
                <span className="font-medium">
                  {locale === "el" ? "Ανάθεση Ροών" : "Assign Workflows"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {locale === "el"
                  ? "Αναθέστε ροές εργασίας n8n σε μέλη του οργανισμού σας."
                  : "Assign n8n workflows to your organization members."}
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">
              {locale === "el" ? "Σημαντικό" : "Important"}
            </h4>
            <p className="text-sm text-muted-foreground">
              {locale === "el"
                ? "Βεβαιωθείτε ότι έχετε ορίσει τη μεταβλητή περιβάλλοντος N8N_API_KEY στον server για να επιτρέψετε την επικοινωνία με το n8n API."
                : "Make sure to set the N8N_API_KEY environment variable on the server to allow communication with the n8n API."}
            </p>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">
              {locale === "el" ? "Σύνδεσμοι Βοήθειας" : "Helpful Links"}
            </h4>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://docs.n8n.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {locale === "el" ? "Τεκμηρίωση n8n" : "n8n Documentation"}
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a
                  href="https://docs.n8n.io/api/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {locale === "el" ? "n8n API" : "n8n API Reference"}
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
