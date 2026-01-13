"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Bug,
  Lightbulb,
  MessageCircle,
  HelpCircle,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  Eye,
  Archive,
  ExternalLink,
  Monitor,
  Globe,
  User,
  Calendar,
  Camera,
  Terminal,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  ZoomIn,
  Download,
  Loader2,
  Paperclip,
} from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  updateFeedbackStatus,
  type PlatformFeedback,
  type ConsoleLogEntry,
} from "@/actions/platform-admin/get-feedback";
import { FeedbackChatHistory } from "./FeedbackChatHistory";
import { AttachmentList } from "@/components/attachments";

interface FeedbackDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedback: PlatformFeedback | null;
  locale: string;
  adminId?: string;
  adminName?: string | null;
}

export function FeedbackDetailDialog({
  open,
  onOpenChange,
  feedback,
  locale,
  adminId,
  adminName,
}: FeedbackDetailDialogProps) {
  const t = useTranslations("platformAdmin");
  const router = useRouter();

  const [status, setStatus] = React.useState(feedback?.status || "pending");
  const [adminNotes, setAdminNotes] = React.useState(
    feedback?.adminNotes || ""
  );
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [showFullScreenshot, setShowFullScreenshot] = React.useState(false);

  // Reset state when feedback changes
  React.useEffect(() => {
    if (feedback) {
      setStatus(feedback.status);
      setAdminNotes(feedback.adminNotes || "");
    }
  }, [feedback]);

  if (!feedback) return null;

  const typeIcons: Record<string, React.ElementType> = {
    bug: Bug,
    feature: Lightbulb,
    general: MessageCircle,
    question: HelpCircle,
    other: MoreHorizontal,
  };

  const statusIcons: Record<string, React.ElementType> = {
    pending: Clock,
    reviewed: Eye,
    resolved: CheckCircle2,
    archived: Archive,
  };

  const TypeIcon = typeIcons[feedback.feedbackType] || MoreHorizontal;
  const StatusIcon = statusIcons[feedback.status] || Clock;

  const handleUpdateStatus = async () => {
    setIsUpdating(true);
    try {
      await updateFeedbackStatus(feedback.id, status, adminNotes);
      toast.success(t("feedback.statusUpdated"));
      router.refresh();
    } catch {
      toast.error(t("feedback.statusUpdateError"));
    } finally {
      setIsUpdating(false);
    }
  };

  const getLogTypeIcon = (type: string) => {
    const logType = type.toLowerCase();
    if (logType === "error" || logType === "err") {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (logType === "warning" || logType === "warn") {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  const getLogTypeClass = (type: string) => {
    const logType = type.toLowerCase();
    if (logType === "error" || logType === "err") {
      return "border-red-500/30 bg-red-500/10";
    }
    if (logType === "warning" || logType === "warn") {
      return "border-amber-500/30 bg-amber-500/10";
    }
    return "border-blue-500/30 bg-blue-500/10";
  };

  const formatTimestamp = (timestamp: number | string | undefined) => {
    if (!timestamp) return "N/A";
    try {
      const date =
        typeof timestamp === "number"
          ? new Date(timestamp)
          : new Date(timestamp);
      return date.toLocaleTimeString(locale);
    } catch {
      return String(timestamp);
    }
  };

  const downloadScreenshot = () => {
    if (!feedback.screenshot) return;
    const link = document.createElement("a");
    link.href = feedback.screenshot;
    link.download = `feedback-screenshot-${feedback.id}.png`;
    // For blob URLs, set target to handle CORS
    if (feedback.screenshot.includes("blob.vercel-storage.com")) {
      link.target = "_blank";
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadConsoleLogs = () => {
    if (!feedback.consoleLogsUrl) return;
    const link = document.createElement("a");
    link.href = feedback.consoleLogsUrl;
    link.download = `feedback-console-logs-${feedback.id}.txt`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check if we have console logs URL (new format) or legacy JSON
  const hasConsoleLogsUrl = !!feedback.consoleLogsUrl;
  const hasLegacyConsoleLogs = feedback.consoleLogs && feedback.consoleLogs.length > 0;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl lg:max-w-4xl overflow-hidden flex flex-col p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <TypeIcon className="h-5 w-5" />
              {t(`feedback.types.${feedback.feedbackType}`)}{" "}
              {t("feedback.details")}
            </SheetTitle>
            <SheetDescription>
              {t("feedback.submittedAt")}{" "}
              {new Date(feedback.createdAt).toLocaleString(locale)}
            </SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="content" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-4 mx-6 mt-4 w-[calc(100%-3rem)]">
              <TabsTrigger value="content">
                {t("feedback.tabs.content")}
              </TabsTrigger>
              <TabsTrigger value="technical">
                {t("feedback.tabs.technical")}
              </TabsTrigger>
              <TabsTrigger value="screenshot" disabled={!feedback.hasScreenshot}>
                <Camera className="h-4 w-4 mr-2" />
                {t("feedback.tabs.screenshot")}
              </TabsTrigger>
              <TabsTrigger
                value="consoleLogs"
                disabled={!feedback.hasConsoleLogs}
              >
                <Terminal className="h-4 w-4 mr-2" />
                {t("feedback.tabs.consoleLogs")}
                {(feedback.consoleLogsCount ?? 0) > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {feedback.consoleLogsCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 mt-4 px-6">
              {/* Content Tab */}
              <TabsContent value="content" className="space-y-6 pb-6">
                {/* User Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {t("feedback.user")}
                    </Label>
                    <p className="font-medium">
                      {feedback.userName || t("feedback.anonymous")}
                    </p>
                    {feedback.userEmail && (
                      <p className="text-sm text-muted-foreground">
                        {feedback.userEmail}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t("feedback.submitted")}
                    </Label>
                    <p className="font-medium">
                      {new Date(feedback.createdAt).toLocaleDateString(locale)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(feedback.createdAt).toLocaleTimeString(locale)}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Bug Report Diagnostic Data Status */}
                {feedback.feedbackType === "bug" && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <Bug className="h-4 w-4" />
                        {t("feedback.diagnosticData")}
                      </Label>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <Camera className={`h-4 w-4 ${feedback.hasScreenshot ? "text-green-500" : "text-muted-foreground"}`} />
                          <span className={feedback.hasScreenshot ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                            {feedback.hasScreenshot ? t("feedback.screenshotCaptured") : t("feedback.noScreenshotCaptured")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Terminal className={`h-4 w-4 ${feedback.hasConsoleLogs ? "text-green-500" : "text-muted-foreground"}`} />
                          <span className={feedback.hasConsoleLogs ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}>
                            {feedback.hasConsoleLogs 
                              ? t("feedback.consoleLogsCaptured", { count: feedback.consoleLogsCount ?? 0 })
                              : t("feedback.noConsoleLogsCaptured")}
                          </span>
                        </div>
                      </div>
                      {!feedback.hasScreenshot && !feedback.hasConsoleLogs && (
                        <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
                          {t("feedback.noDiagnosticDataWarning")}
                        </p>
                      )}
                    </div>
                    <Separator />
                  </>
                )}

                {/* Feedback Content */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">
                    {t("feedback.content")}
                  </Label>
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <p className="whitespace-pre-wrap">{feedback.feedback}</p>
                  </div>
                </div>

                {/* Page URL */}
                {feedback.url && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {t("feedback.pageUrl")}
                    </Label>
                    <a
                      href={feedback.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      {feedback.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {/* User Attachments */}
                {feedback.attachments && feedback.attachments.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />
                        {t("feedback.attachments")} ({feedback.attachments.length})
                      </Label>
                      <AttachmentList
                        attachments={feedback.attachments.map((att) => ({
                          id: att.id,
                          fileName: att.fileName,
                          fileSize: att.fileSize,
                          fileType: att.fileType,
                          url: att.url,
                        }))}
                      />
                    </div>
                  </>
                )}

                <Separator />

                {/* Status Update */}
                <div className="space-y-4">
                  <Label className="text-muted-foreground">
                    {t("feedback.updateStatus")}
                  </Label>
                  <div className="flex items-center gap-4">
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-yellow-500" />
                            {t("feedback.statuses.pending")}
                          </div>
                        </SelectItem>
                        <SelectItem value="reviewed">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-blue-500" />
                            {t("feedback.statuses.reviewed")}
                          </div>
                        </SelectItem>
                        <SelectItem value="resolved">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            {t("feedback.statuses.resolved")}
                          </div>
                        </SelectItem>
                        <SelectItem value="archived">
                          <div className="flex items-center gap-2">
                            <Archive className="h-4 w-4 text-gray-500" />
                            {t("feedback.statuses.archived")}
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge variant="outline" className="gap-1">
                      <StatusIcon className="h-3 w-3" />
                      {t("feedback.currentStatus")}:{" "}
                      {t(`feedback.statuses.${feedback.status}`)}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="adminNotes">
                      {t("feedback.adminNotes")}
                    </Label>
                    <Textarea
                      id="adminNotes"
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder={t("feedback.adminNotesPlaceholder")}
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleUpdateStatus} disabled={isUpdating}>
                    {isUpdating && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {t("feedback.saveChanges")}
                  </Button>
                </div>

                <Separator />

                {/* Chat History Section */}
                <FeedbackChatHistory 
                  feedback={feedback} 
                  locale={locale}
                  adminId={adminId}
                  adminName={adminName}
                />
              </TabsContent>

              {/* Technical Tab */}
              <TabsContent value="technical" className="space-y-6 pb-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Browser Info */}
                  <div className="space-y-4">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      {t("feedback.browserInfo")}
                    </Label>
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("feedback.browser")}
                        </span>
                        <span className="font-medium">
                          {feedback.browserName || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("feedback.version")}
                        </span>
                        <span className="font-medium">
                          {feedback.browserVersion || "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* OS Info */}
                  <div className="space-y-4">
                    <Label className="text-muted-foreground flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      {t("feedback.systemInfo")}
                    </Label>
                    <div className="rounded-lg border p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("feedback.os")}
                        </span>
                        <span className="font-medium">
                          {feedback.osName || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("feedback.osVersion")}
                        </span>
                        <span className="font-medium">
                          {feedback.osVersion || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          {t("feedback.resolution")}
                        </span>
                        <span className="font-medium">
                          {feedback.screenResolution || "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* User Agent */}
                {feedback.userAgent && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">
                      {t("feedback.userAgent")}
                    </Label>
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <code className="text-xs break-all">
                        {feedback.userAgent}
                      </code>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Screenshot Tab */}
              <TabsContent value="screenshot" className="space-y-4 pb-6">
                {feedback.screenshot ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        {t("feedback.screenshotCapture")}
                      </Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowFullScreenshot(true)}
                        >
                          <ZoomIn className="h-4 w-4 mr-2" />
                          {t("feedback.viewFullSize")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={downloadScreenshot}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {t("feedback.download")}
                        </Button>
                      </div>
                    </div>
                    <div className="rounded-lg border overflow-hidden bg-muted/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={feedback.screenshot}
                        alt="User screenshot"
                        className="w-full h-auto max-h-[400px] object-contain cursor-pointer"
                        onClick={() => setShowFullScreenshot(true)}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t("feedback.noScreenshot")}</p>
                  </div>
                )}
              </TabsContent>

              {/* Console Logs Tab */}
              <TabsContent value="consoleLogs" className="space-y-4 pb-6">
                {hasConsoleLogsUrl ? (
                  // New format: Console logs stored in Vercel Blob as text file
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        {t("feedback.consoleEntries", {
                          count: feedback.consoleLogsCount ?? 0,
                        })}
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={downloadConsoleLogs}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {t("feedback.downloadLogs")}
                      </Button>
                    </div>
                    <div className="rounded-lg border bg-muted/30 p-6 text-center">
                      <Terminal className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">
                        {t("feedback.consoleLogsStoredAsFile")}
                      </p>
                      <Button
                        variant="default"
                        onClick={downloadConsoleLogs}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        {t("feedback.downloadLogs")} ({feedback.consoleLogsCount ?? 0} {t("feedback.entries")})
                      </Button>
                    </div>
                  </div>
                ) : hasLegacyConsoleLogs ? (
                  // Legacy format: Console logs stored as JSON in database
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-muted-foreground flex items-center gap-2">
                        <Terminal className="h-4 w-4" />
                        {t("feedback.consoleEntries", {
                          count: feedback.consoleLogs!.length,
                        })}
                      </Label>
                      <div className="flex gap-2">
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {
                            feedback.consoleLogs!.filter(
                              (log) =>
                                log.type?.toLowerCase() === "error" ||
                                log.type?.toLowerCase() === "err"
                            ).length
                          }{" "}
                          {t("feedback.errors")}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="gap-1 border-yellow-500 text-yellow-600"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {
                            feedback.consoleLogs!.filter(
                              (log) =>
                                log.type?.toLowerCase() === "warning" ||
                                log.type?.toLowerCase() === "warn"
                            ).length
                          }{" "}
                          {t("feedback.warnings")}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {feedback.consoleLogs!.map(
                        (log: ConsoleLogEntry, index: number) => (
                          <div
                            key={index}
                            className={`rounded-lg border p-3 ${getLogTypeClass(log.type || "log")}`}
                          >
                            <div className="flex items-start gap-3">
                              {getLogTypeIcon(log.type || "log")}
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {(log.type || "log").toUpperCase()}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimestamp(log.timestamp)}
                                  </span>
                                </div>
                                <p className="text-sm font-mono break-all">
                                  {log.message || "No message"}
                                </p>
                                {log.stack && (
                                  <details className="mt-2">
                                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                      {t("feedback.viewStack")}
                                    </summary>
                                    <pre className="mt-2 text-xs bg-background/50 p-2 rounded overflow-x-auto">
                                      {log.stack}
                                    </pre>
                                  </details>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t("feedback.noConsoleLogs")}</p>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Full Screen Screenshot Modal */}
      {showFullScreenshot && feedback.screenshot && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowFullScreenshot(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setShowFullScreenshot(false)}
          >
            <X className="h-6 w-6" />
          </Button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={feedback.screenshot}
            alt="Full size screenshot"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

