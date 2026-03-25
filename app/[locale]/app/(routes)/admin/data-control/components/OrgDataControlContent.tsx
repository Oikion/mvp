"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import {
  Lock,
  Download,
  Trash2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAppToast } from "@/hooks/use-app-toast";
import { requestDataExport, getDataExportStatus } from "@/actions/data-export/request-data-export";
import { deleteOrganization } from "@/actions/user/delete-account";
import { Loading } from "@/components/ui/loading";

// =============================================================================
// Data Encryption Info Section
// =============================================================================

function DataEncryptionInfoSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Data Encryption
        </CardTitle>
        <CardDescription>
          Organization data is protected by server-side encryption and PIN-based E2EE for messaging.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Team members can manage their encryption PIN in Security Settings.
        </p>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Organization Data Export Section
// =============================================================================

interface ExportRequest {
  id: string;
  status: string;
  format: string;
  downloadUrl: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}

function OrgExportStatusContent({
  isLoadingStatus,
  pendingExport,
  completedExport,
  isRequesting,
  onRequestExport,
}: {
  isLoadingStatus: boolean;
  pendingExport: ExportRequest | null;
  completedExport: ExportRequest | null;
  isRequesting: boolean;
  onRequestExport: () => void;
}) {
  if (isLoadingStatus) {
    return <Loading variant="dots" size="sm" />;
  }

  if (pendingExport) {
    return (
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertTitle>Export in Progress</AlertTitle>
        <AlertDescription>
          Your organization data export is being processed. You will receive an email with the download link.
        </AlertDescription>
      </Alert>
    );
  }

  if (completedExport?.downloadUrl) {
    return (
      <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
        <Download className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-700 dark:text-green-400">Export Ready</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>Your organization data export is ready for download.</p>
          <a
            href={completedExport.downloadUrl}
            download
            className="inline-flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400 underline"
          >
            <Download className="h-3 w-3" />
            Download Export
          </a>
          {completedExport.expiresAt && (
            <p className="text-xs text-muted-foreground">
              Expires: {new Date(completedExport.expiresAt).toLocaleDateString()}
            </p>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <Button variant="outline" onClick={onRequestExport} disabled={isRequesting}>
        {isRequesting ? <Loading variant="spinner" size="sm" /> : <Download className="h-4 w-4 mr-2" />}
        Request Full Export
      </Button>
      <p className="text-sm text-muted-foreground">
        Export includes all clients, properties, documents, and team data. 
        You will receive an email with download link within a few minutes.
      </p>
    </>
  );
}

function OrgDataExportSection() {
  const { toast } = useAppToast();
  const [isRequesting, setIsRequesting] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [pendingExport, setPendingExport] = useState<ExportRequest | null>(null);
  const [completedExport, setCompletedExport] = useState<ExportRequest | null>(null);

  // Load existing export status on mount
  useEffect(() => {
    async function loadExportStatus() {
      try {
        const result = await getDataExportStatus();
        if (result.success && result.data?.requests) {
          const pending = result.data.requests.find(
            (r) => r.status === "PENDING" || r.status === "PROCESSING"
          );
          const completed = result.data.requests.find(
            (r) => r.status === "COMPLETED" && r.downloadUrl
          );
          setPendingExport(pending ? (pending as ExportRequest) : null);
          setCompletedExport(completed ? (completed as ExportRequest) : null);
        }
      } catch (err) {
        console.error("Failed to load export status:", err);
      } finally {
        setIsLoadingStatus(false);
      }
    }
    loadExportStatus();
  }, []);

  const handleRequestExport = async () => {
    setIsRequesting(true);
    try {
      const result = await requestDataExport({ processImmediately: true });
      if (result.success) {
        toast.success("Data export request submitted. You will receive an email when ready.", { isTranslationKey: false });
        if (result.data) {
          setPendingExport({
            id: result.data.requestId,
            status: "PENDING",
            format: "json",
            downloadUrl: null,
            expiresAt: null,
            createdAt: new Date(),
          });
        }
      } else {
        toast.error(result.error || "Failed to request data export");
      }
    } catch {
      toast.error("Failed to request data export");
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Organization Data
        </CardTitle>
        <CardDescription>
          Download a complete copy of all organization data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <OrgExportStatusContent
          isLoadingStatus={isLoadingStatus}
          pendingExport={pendingExport}
          completedExport={completedExport}
          isRequesting={isRequesting}
          onRequestExport={handleRequestExport}
        />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Organization Deletion Section
// =============================================================================

function OrgDeletionSection() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { toast } = useAppToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDeleteOrganization = async () => {
    if (deleteConfirmation !== "DELETE ORGANIZATION") {
      toast.error("Please type 'DELETE ORGANIZATION' to confirm");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await deleteOrganization(deleteConfirmation);
      if (result.success) {
        toast.success("Organization deleted successfully. You will be redirected.", { isTranslationKey: false });
        setShowDeleteDialog(false);
        // Sign out and redirect to home
        setTimeout(async () => {
          await signOut();
          router.push("/");
        }, 1500);
      } else {
        toast.error(result.error || "Failed to delete organization");
      }
    } catch {
      toast.error("Failed to delete organization");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Delete Organization
        </CardTitle>
        <CardDescription>
          Permanently delete this organization and all associated data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete Organization</DialogTitle>
              <DialogDescription>
                This will permanently delete your organization and all data including:
              </DialogDescription>
            </DialogHeader>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 py-2">
              <li>All team members and their access</li>
              <li>All properties, clients, and contacts</li>
              <li>All documents, messages, and files</li>
              <li>All encryption keys and settings</li>
              <li>All integrations and API keys</li>
            </ul>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>This action cannot be undone</AlertTitle>
              <AlertDescription>
                Type <strong>DELETE ORGANIZATION</strong> below to confirm.
              </AlertDescription>
            </Alert>
            <Input
              placeholder="Type DELETE ORGANIZATION"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteOrganization}
                disabled={isSubmitting || deleteConfirmation !== "DELETE ORGANIZATION"}
              >
                {isSubmitting ? <Loading variant="spinner" size="sm" /> : "Delete Organization"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <p className="text-sm text-muted-foreground mt-2">
          This action is irreversible. Make sure to export your data first.
        </p>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function OrgDataControlContent() {
  return (
    <div className="space-y-6">
      <DataEncryptionInfoSection />
      <OrgDataExportSection />
      <OrgDeletionSection />
    </div>
  );
}
