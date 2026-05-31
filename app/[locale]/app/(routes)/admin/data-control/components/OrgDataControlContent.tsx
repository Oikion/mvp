"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("admin");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          {t("dataControl.encryption.title")}
        </CardTitle>
        <CardDescription>
          {t("dataControl.encryption.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          {t("dataControl.encryption.note")}
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
  const t = useTranslations("admin");

  if (isLoadingStatus) {
    return <Loading variant="dots" size="sm" />;
  }

  if (pendingExport) {
    return (
      <Alert>
        <Clock className="h-4 w-4" />
        <AlertTitle>{t("dataControl.export.inProgressTitle")}</AlertTitle>
        <AlertDescription>
          {t("dataControl.export.inProgressDescription")}
        </AlertDescription>
      </Alert>
    );
  }

  if (completedExport?.downloadUrl) {
    return (
      <Alert className="border-green-500/50 bg-green-50 dark:bg-green-950/20">
        <Download className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-700 dark:text-green-400">{t("dataControl.export.readyTitle")}</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{t("dataControl.export.readyDescription")}</p>
          <a
            href={completedExport.downloadUrl}
            download
            className="inline-flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400 underline"
          >
            <Download className="h-3 w-3" />
            {t("dataControl.export.downloadExport")}
          </a>
          {completedExport.expiresAt && (
            <p className="text-xs text-muted-foreground">
              {t("dataControl.export.expiresOn", {
                date: new Date(completedExport.expiresAt).toLocaleDateString(),
              })}
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
        {t("dataControl.export.requestExport")}
      </Button>
      <p className="text-sm text-muted-foreground">
        {t("dataControl.export.requestNote")}
      </p>
    </>
  );
}

function OrgDataExportSection() {
  const t = useTranslations("admin");
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
        toast.success(t("dataControl.export.requestSuccess"), { isTranslationKey: false });
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
        toast.error(result.error || t("dataControl.export.requestError"), { isTranslationKey: false });
      }
    } catch {
      toast.error(t("dataControl.export.requestError"), { isTranslationKey: false });
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          {t("dataControl.export.title")}
        </CardTitle>
        <CardDescription>
          {t("dataControl.export.description")}
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
  const t = useTranslations("admin");
  const router = useRouter();
  const { signOut } = useClerk();
  const { toast } = useAppToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDeleteOrganization = async () => {
    if (deleteConfirmation !== "DELETE ORGANIZATION") {
      toast.error(t("dataControl.deletion.confirmRequired"), { isTranslationKey: false });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await deleteOrganization(deleteConfirmation);
      if (result.success) {
        toast.success(t("dataControl.deletion.deleteSuccess"), { isTranslationKey: false });
        setShowDeleteDialog(false);
        // Sign out and redirect to home
        setTimeout(async () => {
          await signOut();
          router.push("/");
        }, 1500);
      } else {
        toast.error(result.error || t("dataControl.deletion.deleteError"), { isTranslationKey: false });
      }
    } catch {
      toast.error(t("dataControl.deletion.deleteError"), { isTranslationKey: false });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          {t("dataControl.deletion.title")}
        </CardTitle>
        <CardDescription>
          {t("dataControl.deletion.description")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              {t("dataControl.deletion.title")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">{t("dataControl.deletion.title")}</DialogTitle>
              <DialogDescription>
                {t("dataControl.deletion.dialogDescription")}
              </DialogDescription>
            </DialogHeader>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 py-2">
              <li>{t("dataControl.deletion.itemMembers")}</li>
              <li>{t("dataControl.deletion.itemEntities")}</li>
              <li>{t("dataControl.deletion.itemDocuments")}</li>
              <li>{t("dataControl.deletion.itemKeys")}</li>
              <li>{t("dataControl.deletion.itemIntegrations")}</li>
            </ul>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{t("dataControl.deletion.warningTitle")}</AlertTitle>
              <AlertDescription>
                {t.rich("dataControl.deletion.warningDescription", {
                  phrase: () => <strong>{t("dataControl.deletion.confirmPhrase")}</strong>,
                })}
              </AlertDescription>
            </Alert>
            <Input
              placeholder={t("dataControl.deletion.confirmPlaceholder")}
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                {t("dataControl.deletion.cancel")}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteOrganization}
                disabled={isSubmitting || deleteConfirmation !== "DELETE ORGANIZATION"}
              >
                {isSubmitting ? <Loading variant="spinner" size="sm" /> : t("dataControl.deletion.confirmButton")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <p className="text-sm text-muted-foreground mt-2">
          {t("dataControl.deletion.irreversibleNote")}
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
