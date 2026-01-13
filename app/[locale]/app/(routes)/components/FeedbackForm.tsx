"use client";

import * as z from "zod";
import axios from "axios";
import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import html2canvas from "html2canvas";
import { useConsoleCapture } from "@/hooks/use-console-capture";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Icons } from "@/components/ui/icons";
import { Info, Bug, Sparkles, MessageSquare, HelpCircle, MoreHorizontal, Camera, Terminal, Shield, Clock, History, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { AttachmentUploader, type AttachmentData } from "@/components/attachments";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import FeedbackHistorySheet from "./FeedbackHistorySheet";

import { APP_VERSION } from "@/lib/version";

const feedbackTypeIcons = {
  bug: { icon: Bug, color: "text-red-600 dark:text-red-400" },
  feature: { icon: Sparkles, color: "text-blue-600 dark:text-blue-400" },
  general: { icon: MessageSquare, color: "text-green-600 dark:text-green-400" },
  question: { icon: HelpCircle, color: "text-yellow-600 dark:text-yellow-400" },
  other: { icon: MoreHorizontal, color: "text-gray-600 dark:text-gray-400" },
};

interface FeedbackFormProps {
  setOpen: (open: boolean) => void;
}

const FeedbackForm = ({ setOpen }: FeedbackFormProps) => {
  const t = useTranslations("feedback");
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);
  const { toast } = useToast();

  // Create schema with translated messages
  const formSchema = useMemo(() => z.object({
    feedbackType: z.string().min(1, {
      message: t("validation.feedbackTypeRequired"),
    }),
    feedback: z.string().min(10, {
      message: t("validation.feedbackRequired"),
    }),
    consentToCapture: z.boolean().optional(),
  }).refine((data) => {
    if (data.feedbackType === "bug") {
      return data.consentToCapture === true;
    }
    return true;
  }, {
    message: t("consent.required"),
    path: ["consentToCapture"],
  }), [t]);

  // Build feedback types with translated labels
  const feedbackTypes = useMemo(() => [
    { value: "bug", label: t("types.bug"), ...feedbackTypeIcons.bug },
    { value: "feature", label: t("types.feature"), ...feedbackTypeIcons.feature },
    { value: "general", label: t("types.general"), ...feedbackTypeIcons.general },
    { value: "question", label: t("types.question"), ...feedbackTypeIcons.question },
    { value: "other", label: t("types.other"), ...feedbackTypeIcons.other },
  ], [t]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      feedbackType: "",
      feedback: "",
      consentToCapture: false,
    },
  });

  const selectedFeedbackType = form.watch("feedbackType");
  const selectedType = feedbackTypes.find(t => t.value === selectedFeedbackType);
  const isBugReport = selectedFeedbackType === "bug";

  // Enable console capture only for bug reports
  const { getLogs, clearLogs } = useConsoleCapture(isBugReport);

  // Reset consent when feedback type changes
  useEffect(() => {
    if (!isBugReport) {
      form.setValue("consentToCapture", false);
    }
  }, [selectedFeedbackType, isBugReport, form]);

  const captureScreenshot = async (): Promise<string | null> => {
    try {
      // Find the feedback sheet element to exclude it
      const feedbackSheet = document.querySelector('[data-radix-dialog-content]') as HTMLElement;
      
      // Temporarily hide the feedback sheet
      const originalDisplay = feedbackSheet?.style.display || "";
      const originalVisibility = feedbackSheet?.style.visibility || "";
      if (feedbackSheet) {
        feedbackSheet.style.display = "none";
        feedbackSheet.style.visibility = "hidden";
      }

      // Capture the entire document body
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        logging: false,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scale: 0.5, // Reduce size for performance
        ignoreElements: (element) => {
          // Exclude the feedback sheet and any overlays
          return element.classList.contains('feedback-sheet') || 
                 element.getAttribute('data-radix-dialog-content') !== null ||
                 element.getAttribute('data-radix-dialog-overlay') !== null ||
                 element.closest('[data-radix-dialog-content]') !== null;
        },
      });

      // Restore the feedback sheet
      if (feedbackSheet) {
        feedbackSheet.style.display = originalDisplay;
        feedbackSheet.style.visibility = originalVisibility;
      }

      // Convert canvas to base64
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error("Failed to capture screenshot:", error);
      return null;
    }
  };

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setLoading(true);
    try {
      let screenshot: string | null = null;
      let consoleLogs: any[] = [];

      // Only capture screenshot and console logs for bug reports with consent
      if (isBugReport && data.consentToCapture) {
        screenshot = await captureScreenshot();
        consoleLogs = getLogs();
      }

      // Prepare payload - always include technical details
      const payload = {
        feedbackType: data.feedbackType,
        feedback: data.feedback,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        attachmentIds: attachments.map(a => a.id),
        ...(isBugReport && data.consentToCapture && {
          screenshot: screenshot,
          consoleLogs: consoleLogs,
        }),
      };

      await axios.post("/api/feedback", payload);
      
      // Clear logs after successful submission
      if (isBugReport) {
        clearLogs();
      }
      
      toast({
        variant: "success",
        title: t("title"),
        description: t("messages.success"),
      });
      form.reset();
      setAttachments([]);
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: t("title"),
        description: t("messages.error"),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FeedbackHistorySheet open={historyOpen} onOpenChange={setHistoryOpen} />
      <div className="space-y-6 px-2">
        {/* Header with View History Button */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("submitFeedback")}</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            {t("viewHistory")}
          </Button>
        </div>

        {/* Version Info Card */}
        <Card variant="outlined" className="border-border bg-muted/50">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <CardTitle className="text-base text-foreground">{t("versionInfo.title", { version: APP_VERSION })}</CardTitle>
              <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                {t("versionInfo.description")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Feedback Form */}
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="feedbackType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("fields.feedbackType")}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={loading}
                >
                  <FormControl>
                    <SelectTrigger>
                      <div className="flex items-center gap-2 flex-1">
                        {selectedType && (() => {
                          const Icon = selectedType.icon;
                          return <Icon className={cn("h-4 w-4 flex-shrink-0", selectedType.color)} />;
                        })()}
                        <SelectValue placeholder={t("fields.feedbackTypePlaceholder")} />
                      </div>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {feedbackTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <SelectItem 
                          key={type.value} 
                          value={type.value}
                          className="pl-8"
                        >
                          <div className="flex items-center gap-2 -ml-6">
                            <Icon className={cn("h-4 w-4 flex-shrink-0", type.color)} />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormDescription>
                  {t("descriptions.feedbackType")}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

        <FormField
          control={form.control}
          name="feedback"
          render={({ field }) => (
            <FormItem>
                <FormLabel>{t("fields.feedback")}</FormLabel>
              <FormControl>
                <Textarea
                    placeholder={t("fields.feedbackPlaceholder")}
                  disabled={loading}
                    rows={6}
                    className="resize-none"
                  {...field}
                />
              </FormControl>
                <FormDescription>
                  {t("descriptions.feedback")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Attachments */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Paperclip className="h-4 w-4" />
            <span>{t("attachments.title")} {t("attachments.optional")}</span>
          </div>
          <AttachmentUploader
            entityType="feedback"
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            disabled={loading}
            maxFiles={3}
          />
        </div>

        {/* Consent checkbox - only shown for bug reports */}
        {isBugReport && (
          <FormField
            control={form.control}
            name="consentToCapture"
            render={({ field }) => (
              <FormItem className="space-y-0 rounded-md border p-4 bg-muted/30">
                <div className="flex items-start space-x-3 mb-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value || false}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      disabled={loading}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none flex-1">
                    <FormLabel className="text-sm font-medium cursor-pointer">
                      {t("consent.title")}
                    </FormLabel>
                    <FormDescription className="text-xs text-muted-foreground">
                      {t("consent.description")}
                    </FormDescription>
                  </div>
                </div>

                <TooltipProvider delayDuration={200}>
                  <div className="grid grid-cols-4 gap-3 pt-2 border-t">
                    {/* Screenshot */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center text-center p-3 rounded-md hover:bg-muted/50 transition-colors cursor-help">
                          <Camera className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
                          <span className="text-xs font-medium text-foreground">{t("consent.screenshot.title")}</span>
                          <span className="text-xs text-muted-foreground mt-1">{t("consent.screenshot.subtitle")}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px]">
                        <p className="text-xs leading-relaxed">
                          {t("consent.screenshot.description")}
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Console Logs */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center text-center p-3 rounded-md hover:bg-muted/50 transition-colors cursor-help">
                          <Terminal className="h-8 w-8 text-green-600 dark:text-green-400 mb-2" />
                          <span className="text-xs font-medium text-foreground">{t("consent.consoleLogs.title")}</span>
                          <span className="text-xs text-muted-foreground mt-1">{t("consent.consoleLogs.subtitle")}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px]">
                        <p className="text-xs leading-relaxed">
                          {t("consent.consoleLogs.description")}
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Processing */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center text-center p-3 rounded-md hover:bg-muted/50 transition-colors cursor-help">
                          <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-2" />
                          <span className="text-xs font-medium text-foreground">{t("consent.processing.title")}</span>
                          <span className="text-xs text-muted-foreground mt-1">{t("consent.processing.subtitle")}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px]">
                        <p className="text-xs leading-relaxed">
                          {t("consent.processing.description")}
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Retention */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center text-center p-3 rounded-md hover:bg-muted/50 transition-colors cursor-help">
                          <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400 mb-2" />
                          <span className="text-xs font-medium text-foreground">{t("consent.retention.title")}</span>
                          <span className="text-xs text-muted-foreground mt-1">{t("consent.retention.subtitle")}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px]">
                        <p className="text-xs leading-relaxed">
                          {t("consent.retention.description")}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>

                <FormMessage className="mt-2" />
              </FormItem>
            )}
          />
        )}

          <div className="flex justify-end gap-2 pt-2">
          <Button
              type="button"
              variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            {t("buttons.cancel")}
          </Button>
            <Button type="submit" variant="default" disabled={loading}>
            {loading ? (
                <div className="flex items-center gap-2">
                <Icons.spinner className="h-4 w-4 animate-spin" />
                  <span>{t("buttons.sending")}</span>
              </div>
            ) : (
                t("buttons.submit")
            )}
          </Button>
        </div>
      </form>
    </Form>
    </div>
    </>
  );
};

export default FeedbackForm;
