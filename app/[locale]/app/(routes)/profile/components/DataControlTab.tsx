"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useClerk } from "@clerk/nextjs";
import {
  Database,
  Lock,
  Download,
  Trash2,
  UserX,
  AlertTriangle,
  Clock,
  FileDown,
  Users,
  Home,
  FileText,
  Calendar,
  CheckSquare,
  MessageSquare,
  Share2,
  Bell,
  Key,
  Webhook,
  ClipboardList,
  XCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import {
  requestDataExport,
  getDataExportStatus,
} from "@/actions/data-export/request-data-export";
import {
  initiateDeletionRequest,
  verifyDeletionOtp,
  getDataDeletionStatus,
  cancelDataDeletion,
} from "@/actions/data-deletion/request-data-deletion";
import { disableAccount } from "@/actions/user/disable-account";
import { deleteAccount } from "@/actions/user/delete-account";
import { Link } from "@/navigation";
import { Loading } from "@/components/ui/loading";

// =============================================================================
// Data Categories (for "Your Data" section)
// =============================================================================

const DATA_CATEGORIES = [
  { key: "clients", icon: Users },
  { key: "properties", icon: Home },
  { key: "requests", icon: ClipboardList },
  { key: "documents", icon: FileText },
  { key: "calendar", icon: Calendar },
  { key: "tasks", icon: CheckSquare },
  { key: "messages", icon: MessageSquare },
  { key: "socialPosts", icon: Share2 },
  { key: "notifications", icon: Bell },
  { key: "apiKeys", icon: Key },
  { key: "webhooks", icon: Webhook },
] as const;

// =============================================================================
// Your Data Section
// =============================================================================

function YourDataSection() {
  const t = useTranslations("profile.dataControl");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>{t("yourData.title")}</CardTitle>
            <CardDescription>{t("yourData.description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {DATA_CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <AccordionItem key={category.key} value={category.key}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {t(`yourData.categories.${category.key}.title`)}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground pl-7">
                    {t(`yourData.categories.${category.key}.description`)}
                  </p>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}


// =============================================================================
// Data Export Section
// =============================================================================

interface ExportRequest {
  id: string;
  status: string;
  format: string;
  downloadUrl: string | null;
  expiresAt: Date | null;
  createdAt: Date;
}

function DataExportSection() {
  const t = useTranslations("profile.dataControl");
  const tCommon = useTranslations("common");
  const { toast } = useAppToast();

  const [exportRequests, setExportRequests] = useState<ExportRequest[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [loadingExports, setLoadingExports] = useState(true);

  const loadExportStatus = useCallback(async () => {
    try {
      const result = await getDataExportStatus();
      if (result.success && result.data) {
        setExportRequests(result.data.requests as ExportRequest[]);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingExports(false);
    }
  }, []);

  useEffect(() => {
    loadExportStatus();
  }, [loadExportStatus]);

  const handleRequestExport = async () => {
    setIsExporting(true);
    try {
      const result = await requestDataExport({ processImmediately: true });
      if (result.success) {
        toast.success(t("export.requestExport"), {
          description: t("export.processing"),
          isTranslationKey: false,
        });
        await loadExportStatus();
      } else {
        toast.error(tCommon("toast.error"), {
          description: result.error,
          isTranslationKey: false,
        });
      }
    } catch {
      toast.error(tCommon("toast.error"));
    } finally {
      setIsExporting(false);
    }
  };

  const getExportStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge
            variant="outline"
            className="bg-green-500/10 border-green-500/30 text-green-700"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("export.ready")}
          </Badge>
        );
      case "PENDING":
      case "PROCESSING":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 border-blue-500/30 text-blue-700"
          >
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            {t("export.processing")}
          </Badge>
        );
      case "EXPIRED":
        return (
          <Badge
            variant="outline"
            className="bg-muted border-muted-foreground/30"
          >
            <Clock className="h-3 w-3 mr-1" />
            {t("export.expired")}
          </Badge>
        );
      case "FAILED":
        return (
          <Badge
            variant="outline"
            className="bg-red-500/10 border-red-500/30 text-red-700"
          >
            <XCircle className="h-3 w-3 mr-1" />
            {t("export.failed")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Download className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>{t("export.title")}</CardTitle>
            <CardDescription>{t("export.description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleRequestExport}
          disabled={isExporting}
          variant="outline"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 mr-2" />
          )}
          {t("export.requestExport")}
        </Button>

        {loadingExports ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : exportRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("export.noRequests")}
          </p>
        ) : (
          <div className="space-y-3">
            {exportRequests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getExportStatusBadge(req.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t("export.requestedAt")}{" "}
                    {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {req.status === "COMPLETED" && req.downloadUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={req.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      {t("export.download")}
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Data Deletion Request Section
// =============================================================================

function DataDeletionSection() {
  const t = useTranslations("profile.dataControl");
  const tCommon = useTranslations("common");
  const { toast } = useAppToast();

  const [deletionRequest, setDeletionRequest] = useState<{
    id: string;
    status: string;
    reason: string | null;
    reviewNote: string | null;
    gracePeriodEndsAt: Date | null;
    createdAt: Date;
  } | null>(null);
  const [loadingDeletion, setLoadingDeletion] = useState(true);
  const [deletionReason, setDeletionReason] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [isSubmittingDeletion, setIsSubmittingDeletion] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [step, setStep] = useState<"idle" | "otp">("idle");
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const loadDeletionStatus = useCallback(async () => {
    try {
      const result = await getDataDeletionStatus();
      if (result.success && result.data) {
        setDeletionRequest(result.data.request);
      }
    } catch {
      // Silently fail
    } finally {
      setLoadingDeletion(false);
    }
  }, []);

  useEffect(() => {
    loadDeletionStatus();
  }, [loadDeletionStatus]);

  const handleInitiate = async () => {
    setIsSubmittingDeletion(true);
    try {
      const result = await initiateDeletionRequest(deletionReason || undefined);
      if (!result.success) {
        toast.error(tCommon("toast.error"), {
          description: result.error,
          isTranslationKey: false,
        });
        return;
      }
      if (result.data) {
        setPendingRequestId(result.data.requestId);
        setStep("otp");
        toast.success("Check your email", {
          description: "Enter the 8-digit code we sent you.",
          isTranslationKey: false,
        });
      }
    } catch {
      toast.error(tCommon("toast.error"));
    } finally {
      setIsSubmittingDeletion(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!pendingRequestId || otpValue.length !== 8) return;
    setIsVerifying(true);
    try {
      const result = await verifyDeletionOtp(pendingRequestId, otpValue);
      if (!result.success) {
        toast.error("Invalid code", {
          description: result.error,
          isTranslationKey: false,
        });
        return;
      }
      toast.success("Deletion request confirmed", {
        description: "Your data will be deleted in 7 days. You can cancel until then.",
        isTranslationKey: false,
      });
      setStep("idle");
      setOtpValue("");
      setPendingRequestId(null);
      setDeletionReason("");
      setUnderstood(false);
      await loadDeletionStatus();
    } catch {
      toast.error(tCommon("toast.error"));
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancelDeletion = async () => {
    if (!deletionRequest) return;
    setIsCancelling(true);
    try {
      const result = await cancelDataDeletion(deletionRequest.id);
      if (result.success) {
        toast.success(t("deletion.cancelled"), {
          description: t("deletion.cancelledDescription"),
          isTranslationKey: false,
        });
        setDeletionRequest(null);
      } else {
        toast.error(tCommon("toast.error"), {
          description: result.error,
          isTranslationKey: false,
        });
      }
    } catch {
      toast.error(tCommon("toast.error"));
    } finally {
      setIsCancelling(false);
    }
  };

  const daysRemaining = deletionRequest?.gracePeriodEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(deletionRequest.gracePeriodEndsAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  const getDeletionStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_VERIFICATION":
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/10 border-blue-500/30 text-blue-700"
          >
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Awaiting Confirmation
          </Badge>
        );
      case "PENDING":
        return (
          <Badge
            variant="outline"
            className="bg-amber-500/10 border-amber-500/30 text-amber-700"
          >
            <Clock className="h-3 w-3 mr-1" />
            {t("deletion.pendingTitle")}
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge
            variant="outline"
            className="bg-green-500/10 border-green-500/30 text-green-700"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            {t("deletion.approved")}
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge
            variant="outline"
            className="bg-red-500/10 border-red-500/30 text-red-700"
          >
            <XCircle className="h-3 w-3 mr-1" />
            {t("deletion.rejected")}
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge
            variant="outline"
            className="bg-muted border-muted-foreground/30"
          >
            {t("deletion.completed")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10">
            <Trash2 className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <CardTitle className="text-destructive">
              {t("deletion.title")}
            </CardTitle>
            <CardDescription>{t("deletion.description")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loadingDeletion ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : deletionRequest &&
          ["PENDING_VERIFICATION", "PENDING", "APPROVED"].includes(deletionRequest.status) ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="space-y-2">
                  {getDeletionStatusBadge(deletionRequest.status)}
                  <p className="text-sm text-muted-foreground">
                    {deletionRequest.status === "PENDING"
                      ? t("deletion.pendingDescription")
                      : deletionRequest.status === "APPROVED"
                      ? t("deletion.approvedDescription")
                      : "Check your email for the confirmation code."}
                  </p>
                  {deletionRequest.gracePeriodEndsAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {t("deletion.gracePeriodEnds")}:{" "}
                        {new Date(
                          deletionRequest.gracePeriodEndsAt
                        ).toLocaleDateString()}
                      </span>
                      {daysRemaining !== null && (
                        <span className="text-muted-foreground">
                          ({daysRemaining} {t("deletion.daysRemaining")})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {["PENDING_VERIFICATION", "PENDING"].includes(deletionRequest.status) && (
              <Button
                variant="outline"
                onClick={handleCancelDeletion}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                {t("deletion.cancelRequest")}
              </Button>
            )}
          </div>
        ) : deletionRequest && deletionRequest.status === "REJECTED" ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/5">
              <div className="space-y-2">
                {getDeletionStatusBadge("REJECTED")}
                <p className="text-sm text-muted-foreground">
                  {t("deletion.rejected")}
                </p>
                {deletionRequest.reviewNote && (
                  <p className="text-sm italic">
                    {t("deletion.rejectedDescription")}{" "}
                    &quot;{deletionRequest.reviewNote}&quot;
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* === STEP: idle — trigger dialog === */}
            {step === "idle" && (
              <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                <div className="space-y-1">
                  <p className="font-medium">{t("deletion.title")}</p>
                  <p className="text-sm text-muted-foreground">
                    {t("deletion.description")}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("deletion.requestDeletion")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {t("deletion.confirmTitle")}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("deletion.confirmDescription")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="deletion-reason">
                          {t("deletion.reasonLabel")}
                        </Label>
                        <Textarea
                          id="deletion-reason"
                          placeholder={t("deletion.reasonPlaceholder")}
                          value={deletionReason}
                          onChange={(e) => setDeletionReason(e.target.value)}
                          rows={3}
                        />
                      </div>
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="understand"
                          checked={understood}
                          onCheckedChange={(checked) =>
                            setUnderstood(checked === true)
                          }
                        />
                        <Label
                          htmlFor="understand"
                          className="text-sm leading-5 cursor-pointer"
                        >
                          {t("deletion.understand")}
                        </Label>
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>
                        {tCommon("buttons.cancel")}
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleInitiate}
                        disabled={!understood || isSubmittingDeletion}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {isSubmittingDeletion && (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        )}
                        Send Confirmation Code
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}

            {/* === STEP: OTP entry === */}
            {step === "otp" && (
              <div className="space-y-4 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-2 flex-1">
                    <p className="font-medium">Enter your confirmation code</p>
                    <p className="text-sm text-muted-foreground">
                      We sent an 8-digit code to your email. Enter it below to
                      confirm your deletion request. The code expires in 15
                      minutes.
                    </p>
                    <div className="flex gap-2 pt-2">
                      <Input
                        placeholder="12345678"
                        value={otpValue}
                        onChange={(e) =>
                          setOtpValue(
                            e.target.value.replace(/\D/g, "").slice(0, 8)
                          )
                        }
                        maxLength={8}
                        className="font-mono text-lg tracking-widest max-w-[160px]"
                      />
                      <Button
                        onClick={handleVerifyOtp}
                        disabled={otpValue.length !== 8 || isVerifying}
                        variant="destructive"
                      >
                        {isVerifying ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Confirm Deletion
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1"
                      onClick={() => {
                        setStep("idle");
                        setOtpValue("");
                        setPendingRequestId(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Account Actions Section (existing)
// =============================================================================

function AccountActionsSection() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { toast } = useAppToast();
  const t = useTranslations("profile.dataControl.accountActions");
  const success = (msg: string) =>
    toast.success(msg, { isTranslationKey: false });
  const showError = (msg: string) =>
    toast.error(msg, { isTranslationKey: false });
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDisableAccount = async () => {
    setIsSubmitting(true);
    try {
      const result = await disableAccount();
      if (result.success) {
        success(t("toast.disabled"));
        setShowDisableDialog(false);
        setTimeout(async () => {
          await signOut();
          router.push("/");
        }, 1500);
      } else {
        showError(result.error || t("toast.disableFailed"));
      }
    } catch {
      showError(t("toast.disableFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE MY DATA") {
      showError(t("toast.deleteConfirmRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await deleteAccount(deleteConfirmation);
      if (result.success) {
        success(t("toast.deleted"));
        setShowDeleteDialog(false);
        setTimeout(async () => {
          await signOut();
          router.push("/");
        }, 1500);
      } else {
        showError(result.error || t("toast.deleteFailed"));
      }
    } catch {
      showError(t("toast.deleteFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h4 className="font-medium flex items-center gap-2">
              <UserX className="h-4 w-4" />
              {t("disableTitle")}
            </h4>
            <p className="text-sm text-muted-foreground">
              {t("disableHint")}
            </p>
          </div>
          <Dialog
            open={showDisableDialog}
            onOpenChange={setShowDisableDialog}
          >
            <DialogTrigger asChild>
              <Button variant="outline">{t("disable")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("disableTitle")}</DialogTitle>
                <DialogDescription>
                  {t("disableDialogDescription")}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDisableDialog(false)}
                >
                  {t("cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDisableAccount}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loading variant="spinner" size="sm" />
                  ) : (
                    t("disableTitle")
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg bg-destructive/5">
          <div>
            <h4 className="font-medium flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              {t("deleteTitle")}
            </h4>
            <p className="text-sm text-muted-foreground">
              {t("deleteHint")}
            </p>
          </div>
          <Dialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
          >
            <DialogTrigger asChild>
              <Button variant="destructive">{t("delete")}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-destructive">
                  {t("deleteDialogTitle")}
                </DialogTitle>
                <DialogDescription>
                  {t("deleteDialogDescription")}
                </DialogDescription>
              </DialogHeader>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 py-2">
                <li>{t("deleteItem1")}</li>
                <li>{t("deleteItem2")}</li>
                <li>{t("deleteItem3")}</li>
                <li>{t("deleteItem4")}</li>
              </ul>
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t("irreversibleTitle")}</AlertTitle>
                <AlertDescription>
                  {t.rich("confirmInstruction", {
                    code: (chunks) => <strong>{chunks}</strong>,
                  })}
                </AlertDescription>
              </Alert>
              <Input
                placeholder={t("deleteConfirmPlaceholder")}
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
              />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                >
                  {t("cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={
                    isSubmitting || deleteConfirmation !== "DELETE MY DATA"
                  }
                >
                  {isSubmitting ? (
                    <Loading variant="spinner" size="sm" />
                  ) : (
                    t("deleteAccountButton")
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function DataControlTab() {
  const t = useTranslations("profile.dataControl");

  return (
    <div className="space-y-6">
      <YourDataSection />
      <Separator />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {t("encryption_info_title")}
          </CardTitle>
          <CardDescription>
            {t("encryption_info_description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("encryption_info_link_text")}{" "}
            <Link href="/app/settings/security" className="text-primary underline">
              {t("encryption_info_link_label")}
            </Link>
          </p>
        </CardContent>
      </Card>
      <Separator />
      <DataExportSection />
      <Separator />
      <DataDeletionSection />
      <Separator />
      <AccountActionsSection />
    </div>
  );
}
