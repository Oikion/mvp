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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Loader2,
  Play,
  Workflow,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Plus,
  ExternalLink,
} from "lucide-react";
import {
  getN8nIntegrationStatus,
  getMyN8nWorkflows,
  runMyN8nWorkflow,
  type N8nWorkflowInfo,
  type N8nIntegrationStatus,
} from "@/actions/n8n";

export function N8NWorkflowsSection() {
  const locale = useLocale() as "en" | "el";
  const [loading, setLoading] = useState(true);
  const [integrationStatus, setIntegrationStatus] = useState<N8nIntegrationStatus | null>(null);
  const [workflows, setWorkflows] = useState<N8nWorkflowInfo[]>([]);
  const [runningWorkflowId, setRunningWorkflowId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusResult, workflowsResult] = await Promise.all([
        getN8nIntegrationStatus(),
        getMyN8nWorkflows(),
      ]);

      if (statusResult.success && statusResult.data) {
        setIntegrationStatus(statusResult.data);
      }

      if (workflowsResult.success && workflowsResult.data) {
        setWorkflows(workflowsResult.data);
      }
    } catch (error) {
      console.error("Failed to load n8n data:", error);
      toast.error(
        locale === "el"
          ? "Αποτυχία φόρτωσης δεδομένων"
          : "Failed to load data"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRunWorkflow = async (workflowId: string) => {
    setRunningWorkflowId(workflowId);
    try {
      const result = await runMyN8nWorkflow(workflowId);

      if (result.success) {
        toast.success(
          locale === "el"
            ? "Η ροή εργασίας εκτελέστηκε"
            : "Workflow executed successfully"
        );
        // Reload to get updated status
        loadData();
      } else {
        toast.error(result.error || "Failed to run workflow");
      }
    } catch (error) {
      toast.error(
        locale === "el"
          ? "Αποτυχία εκτέλεσης"
          : "Failed to run workflow"
      );
    } finally {
      setRunningWorkflowId(null);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat(locale === "el" ? "el-GR" : "en-US", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(date));
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          {locale === "el" ? "Ποτέ" : "Never"}
        </Badge>
      );
    }

    if (status === "success") {
      return (
        <Badge className="bg-success/10 text-success">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {locale === "el" ? "Επιτυχία" : "Success"}
        </Badge>
      );
    }

    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        {locale === "el" ? "Σφάλμα" : "Error"}
      </Badge>
    );
  };

  // Not configured state
  if (!loading && (!integrationStatus?.isConfigured || !integrationStatus?.isActive)) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                {locale === "el" ? "Ροές Εργασίας Αυτοματισμού" : "Automation Workflows"}
              </CardTitle>
              <CardDescription>
                {locale === "el"
                  ? "Προβολή και εκτέλεση των ροών εργασίας n8n που σας έχουν ανατεθεί"
                  : "View and run your assigned n8n workflows"}
              </CardDescription>
            </div>
            <Button asChild>
              <a href="/app/admin/n8n" target="_blank" rel="noopener noreferrer">
                <Plus className="h-4 w-4 mr-2" />
                {locale === "el" ? "Ρύθμιση Ενσωμάτωσης" : "Configure Integration"}
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-warning mb-2" />
            <h4 className="font-medium">
              {locale === "el"
                ? "Η αυτοματοποίηση δεν έχει ρυθμιστεί"
                : "Automation not configured"}
            </h4>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {locale === "el"
                ? "Ο διαχειριστής του οργανισμού σας πρέπει πρώτα να ρυθμίσει την ενσωμάτωση n8n"
                : "Your organization admin must first set up n8n integration"}
            </p>
            <Button variant="outline" asChild>
              <a href="https://docs.n8n.io/" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                {locale === "el" ? "Μάθετε Περισσότερα" : "Learn More"}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              {locale === "el" ? "Ροές Εργασίας Αυτοματισμού" : "Automation Workflows"}
            </CardTitle>
            <CardDescription>
              {locale === "el"
                ? "Προβολή και εκτέλεση των ροών εργασίας n8n που σας έχουν ανατεθεί"
                : "View and run your assigned n8n workflows"}
            </CardDescription>
          </div>
          {workflows.length > 0 && (
            <Button asChild variant="outline" size="sm">
              <a href="/app/admin/n8n" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                {locale === "el" ? "Διαχείριση" : "Manage"}
              </a>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : workflows.length === 0 ? (
          <div className="text-center py-8">
            <Workflow className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">
              {locale === "el"
                ? "Δεν έχουν ανατεθεί ροές εργασίας"
                : "No workflows assigned"}
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {locale === "el"
                ? "Επικοινωνήστε με τον διαχειριστή σας για να σας αναθέσει ροές εργασίας"
                : "Contact your administrator to get workflows assigned"}
            </p>
            <Button asChild>
              <a href="/app/admin/n8n" target="_blank" rel="noopener noreferrer">
                <Plus className="h-4 w-4 mr-2" />
                {locale === "el" ? "Προσθήκη Ροής Εργασίας" : "Add Workflow"}
              </a>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{locale === "el" ? "Ροή Εργασίας" : "Workflow"}</TableHead>
                <TableHead>{locale === "el" ? "Κατάσταση" : "Status"}</TableHead>
                <TableHead>{locale === "el" ? "Τελευταία Εκτέλεση" : "Last Run"}</TableHead>
                <TableHead className="text-right">
                  {locale === "el" ? "Ενέργειες" : "Actions"}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((workflow) => (
                <TableRow key={workflow.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{workflow.workflowName}</span>
                      {!workflow.isActive && (
                        <Badge variant="secondary">
                          {locale === "el" ? "Ανενεργό" : "Inactive"}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(workflow.lastRunStatus)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(workflow.lastRunAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRunWorkflow(workflow.workflowId)}
                      disabled={!workflow.isActive || runningWorkflowId === workflow.workflowId}
                    >
                      {runningWorkflowId === workflow.workflowId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-1" />
                          {locale === "el" ? "Εκτέλεση" : "Run"}
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
