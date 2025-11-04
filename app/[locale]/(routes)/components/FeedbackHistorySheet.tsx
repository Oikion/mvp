"use client";

import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/ui/icons";
import { Bug, Sparkles, MessageSquare, HelpCircle, MoreHorizontal, Camera, Terminal, Calendar, Globe } from "lucide-react";
import { format } from "date-fns";
import axios from "axios";

interface FeedbackHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FeedbackItem {
  id: string;
  createdAt: string;
  feedbackType: string;
  feedback: string;
  url?: string;
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  osVersion?: string;
  screenResolution?: string;
  hasScreenshot: boolean;
  hasConsoleLogs: boolean;
  consoleLogsCount?: number;
  emailSent: boolean;
  emailSentAt?: string;
}

const feedbackTypeConfig = {
  bug: { 
    label: "Bug Report", 
    icon: Bug, 
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" 
  },
  feature: { 
    label: "Feature Request", 
    icon: Sparkles, 
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" 
  },
  general: { 
    label: "General Feedback", 
    icon: MessageSquare, 
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
  },
  question: { 
    label: "Question", 
    icon: HelpCircle, 
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" 
  },
  other: { 
    label: "Other", 
    icon: MoreHorizontal, 
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" 
  },
};

const FeedbackHistorySheet = ({ open, onOpenChange }: FeedbackHistorySheetProps) => {
  const [loading, setLoading] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchFeedbackHistory();
    }
  }, [open]);

  const fetchFeedbackHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("/api/feedback/history");
      setFeedbackHistory(response.data.feedback || []);
    } catch (err) {
      console.error("Failed to fetch feedback history:", err);
      setError("Failed to load feedback history. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const getFeedbackTypeConfig = (type: string) => {
    return feedbackTypeConfig[type as keyof typeof feedbackTypeConfig] || feedbackTypeConfig.other;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="min-w-[700px] sm:max-w-[700px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Feedback History</SheetTitle>
          <SheetDescription>
            View all your past feedback submissions
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Icons.spinner className="h-6 w-6 animate-spin" />
            </div>
          )}

          {error && (
            <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
              <CardContent className="pt-6">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && feedbackHistory.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">
                  No feedback submissions yet. Submit your first feedback to see it here!
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && feedbackHistory.map((item) => {
            const typeConfig = getFeedbackTypeConfig(item.feedbackType);
            const Icon = typeConfig.icon;
            
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base">
                          {typeConfig.label}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(item.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge className={typeConfig.color}>
                      {typeConfig.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-foreground whitespace-pre-wrap">
                    {item.feedback}
                  </div>

                  {/* Technical Details */}
                  {(item.url || item.browserName || item.osName || item.screenResolution) && (
                    <div className="pt-3 border-t space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Technical Details</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {item.url && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">URL:</span>
                            <span className="truncate">{item.url}</span>
                          </div>
                        )}
                        {item.browserName && (
                          <div>
                            <span className="text-muted-foreground">Browser: </span>
                            <span>{item.browserName}{item.browserVersion ? ` ${item.browserVersion}` : ""}</span>
                          </div>
                        )}
                        {item.osName && (
                          <div>
                            <span className="text-muted-foreground">OS: </span>
                            <span>{item.osName}{item.osVersion ? ` ${item.osVersion}` : ""}</span>
                          </div>
                        )}
                        {item.screenResolution && (
                          <div>
                            <span className="text-muted-foreground">Resolution: </span>
                            <span>{item.screenResolution}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bug Report Indicators */}
                  {item.feedbackType === "bug" && (item.hasScreenshot || item.hasConsoleLogs) && (
                    <div className="pt-3 border-t">
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {item.hasScreenshot && (
                          <div className="flex items-center gap-1">
                            <Camera className="h-3 w-3" />
                            <span>Screenshot</span>
                          </div>
                        )}
                        {item.hasConsoleLogs && (
                          <div className="flex items-center gap-1">
                            <Terminal className="h-3 w-3" />
                            <span>{item.consoleLogsCount || 0} console logs</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Email Status */}
                  {item.emailSent && (
                    <div className="pt-2">
                      <Badge variant="outline" className="text-xs">
                        Email sent {item.emailSentAt ? format(new Date(item.emailSentAt), "MMM d, yyyy") : ""}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FeedbackHistorySheet;

