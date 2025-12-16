"use client";

import * as z from "zod";
import axios from "axios";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

const formSchema = z.object({
  feedbackType: z.string().min(1, {
    message: "Please select a feedback type.",
  }),
  feedback: z.string().min(10, {
    message: "Feedback must be at least 10 characters.",
  }),
  consentToCapture: z.boolean().optional(),
}).refine((data) => {
  // Consent is only required when feedback type is "bug"
  if (data.feedbackType === "bug") {
    return data.consentToCapture === true;
  }
  return true;
}, {
  message: "You must consent to diagnostic data capture to submit a bug report.",
  path: ["consentToCapture"],
});

const feedbackTypes = [
  { 
    value: "bug", 
    label: "Bug Report", 
    icon: Bug, 
    color: "text-red-600 dark:text-red-400" 
  },
  { 
    value: "feature", 
    label: "Feature Request", 
    icon: Sparkles, 
    color: "text-blue-600 dark:text-blue-400" 
  },
  { 
    value: "general", 
    label: "General Feedback", 
    icon: MessageSquare, 
    color: "text-green-600 dark:text-green-400" 
  },
  { 
    value: "question", 
    label: "Question", 
    icon: HelpCircle, 
    color: "text-yellow-600 dark:text-yellow-400" 
  },
  { 
    value: "other", 
    label: "Other", 
    icon: MoreHorizontal, 
    color: "text-gray-600 dark:text-gray-400" 
  },
];

const appVersion = process.env.NEXT_PUBLIC_APP_V || "0.0.3-beta";

interface FeedbackFormProps {
  setOpen: (open: boolean) => void;
}

const FeedbackForm = ({ setOpen }: FeedbackFormProps) => {
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);
  const { toast } = useToast();

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
        title: "Success",
        description: "Thank you for your feedback. We appreciate your help in making Oikion better!",
      });
      form.reset();
      setAttachments([]);
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again later.",
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
          <h2 className="text-lg font-semibold">Submit Feedback</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setHistoryOpen(true)}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            View History
          </Button>
        </div>

        {/* Version Info Card */}
        <Card variant="outlined" className="border-border bg-muted/50">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <CardTitle className="text-base text-foreground">Version {appVersion}</CardTitle>
              <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                This is the very first version of Oikion. As we're just getting started, 
                some actions might not work perfectly or could cause unexpected results. 
                If you encounter any issues, please let us know through this feedback form. 
                Your patience and feedback help us improve the app for everyone.
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
                <FormLabel>What type of feedback is this?</FormLabel>
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
                        <SelectValue placeholder="Select feedback type" />
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
                  Choose the category that best describes your feedback
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
                <FormLabel>Your Feedback</FormLabel>
              <FormControl>
                <Textarea
                    placeholder="Please share your thoughts, report a bug, suggest a feature, or ask a question..."
                  disabled={loading}
                    rows={6}
                    className="resize-none"
                  {...field}
                />
              </FormControl>
                <FormDescription>
                  Be as detailed as possible so we can better understand and address your feedback
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Attachments */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Paperclip className="h-4 w-4" />
            <span>Attachments (optional)</span>
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
                      I consent to diagnostic data capture for bug reporting
                    </FormLabel>
                    <FormDescription className="text-xs text-muted-foreground">
                      Hover over each icon to learn what we collect and how we handle it
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
                          <span className="text-xs font-medium text-foreground">Screenshot</span>
                          <span className="text-xs text-muted-foreground mt-1">App window only</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px]">
                        <p className="text-xs leading-relaxed">
                          We capture only the Oikion application window displayed in your browser. 
                          This excludes other tabs, applications, your desktop, and this feedback form.
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Console Logs */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center text-center p-3 rounded-md hover:bg-muted/50 transition-colors cursor-help">
                          <Terminal className="h-8 w-8 text-green-600 dark:text-green-400 mb-2" />
                          <span className="text-xs font-medium text-foreground">Console Logs</span>
                          <span className="text-xs text-muted-foreground mt-1">Error & debug info</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px]">
                        <p className="text-xs leading-relaxed">
                          Browser console logs including error messages, warnings, API calls, and debugging 
                          information specific to the Oikion application only.
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Processing */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center text-center p-3 rounded-md hover:bg-muted/50 transition-colors cursor-help">
                          <Shield className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-2" />
                          <span className="text-xs font-medium text-foreground">Processing</span>
                          <span className="text-xs text-muted-foreground mt-1">Secure & private</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px]">
                        <p className="text-xs leading-relaxed">
                          Data is sent securely via email to our development team and used solely for 
                          debugging and fixing the reported issue. We never share this information with 
                          third parties.
                        </p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Retention */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center text-center p-3 rounded-md hover:bg-muted/50 transition-colors cursor-help">
                          <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400 mb-2" />
                          <span className="text-xs font-medium text-foreground">Retention</span>
                          <span className="text-xs text-muted-foreground mt-1">90 days after resolution</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[280px]">
                        <p className="text-xs leading-relaxed">
                          Diagnostic data is retained for up to 90 days after the bug is resolved, 
                          then permanently deleted from our systems.
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
            Cancel
          </Button>
            <Button type="submit" variant="default" disabled={loading}>
            {loading ? (
                <div className="flex items-center gap-2">
                <Icons.spinner className="h-4 w-4 animate-spin" />
                  <span>Sending...</span>
              </div>
            ) : (
                "Submit Feedback"
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
