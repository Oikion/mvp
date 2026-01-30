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
import { Bug, Sparkles, MessageSquare, HelpCircle, MoreHorizontal, Camera, Terminal, Calendar, Globe, MessageCircle, CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import axios from "axios";
import FeedbackChatSheet from "./FeedbackChatSheet";

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
  status?: string;
  adminResponse?: string | null;
  respondedAt?: string | null;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "text-warning" },
  reviewed: { label: "Reviewed", icon: CheckCircle2, color: "text-primary" },
  resolved: { label: "Resolved", icon: CheckCircle2, color: "text-success" },
  user_replied: { label: "Awaiting Response", icon: MessageCircle, color: "text-purple-600" },
};

const feedbackTypeConfig = {
  bug: { 
    label: "Bug Report", 
    icon: Bug, 
    color: "bg-destructive/15 text-destructive dark:text-red-400" 
  },
  feature: { 
    label: "Feature Request", 
    icon: Sparkles, 
    color: "bg-primary/15 text-primary dark:text-blue-400" 
  },
  general: { 
    label: "General Feedback", 
    icon: MessageSquare, 
    color: "bg-success/15 text-success dark:text-green-400" 
  },
  question: { 
    label: "Question", 
    icon: HelpCircle, 
    color: "bg-warning/15 text-warning dark:text-amber-400" 
  },
  other: { 
    label: "Other", 
    icon: MoreHorizontal, 
    color: "bg-muted text-muted-foreground" 
  },
};

const FeedbackHistorySheet = ({ open, onOpenChange }: FeedbackHistorySheetProps) => {
  const t = useTranslations("feedback");
  const [loading, setLoading] = useState(false);
  const [feedbackHistory, setFeedbackHistory] = useState<FeedbackItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (open) {
      fetchFeedbackHistory();
    }
  }, [open]);

  const handleOpenChat = (feedbackId: string) => {
    setSelectedFeedbackId(feedbackId);
    setChatOpen(true);
  };

  const handleCloseChat = () => {
    setChatOpen(false);
    setSelectedFeedbackId(null);
    // Refresh the list in case status changed
    fetchFeedbackHistory();
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || statusConfig.pending;
  };

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
    <>
      <Sheet open={open && !chatOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:min-w-[500px] md:min-w-[700px] sm:max-w-[700px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("history.title")}</SheetTitle>
            <SheetDescription>
              {t("history.description")}
            </SheetDescription>
          </SheetHeader>

        <div className="mt-6 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Icons.spinner className="h-6 w-6 animate-spin" />
            </div>
          )}

          {error && (
            <Card className="border-destructive/30 bg-destructive/10">
              <CardContent className="pt-6">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && feedbackHistory.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">
                  {t("history.noFeedback")}
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && !error && feedbackHistory.map((item) => {
            const typeConfig = getFeedbackTypeConfig(item.feedbackType);
            const Icon = typeConfig.icon;
            const status = getStatusConfig(item.status || "pending");
            const StatusIcon = status.icon;
            const hasAdminResponse = !!item.adminResponse;
            
            return (
              <Card 
                key={item.id} 
                className="hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handleOpenChat(item.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {t(`types.${item.feedbackType}`) || typeConfig.label}
                          {hasAdminResponse && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <MessageCircle className="h-3 w-3" />
                              {t("history.hasResponse")}
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(item.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="gap-1">
                        <StatusIcon className={`h-3 w-3 ${status.color}`} />
                        {t(`history.status.${item.status}`) || status.label}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-foreground whitespace-pre-wrap line-clamp-3">
                    {item.feedback}
                  </div>

                  {/* Technical Details */}
                  {(item.url || item.browserName || item.osName || item.screenResolution) && (
                    <div className="pt-3 border-t space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">{t("history.technicalDetails")}</p>
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
                            <span className="text-muted-foreground">{t("history.browser")}: </span>
                            <span>{item.browserName}{item.browserVersion ? ` ${item.browserVersion}` : ""}</span>
                          </div>
                        )}
                        {item.osName && (
                          <div>
                            <span className="text-muted-foreground">{t("history.os")}: </span>
                            <span>{item.osName}{item.osVersion ? ` ${item.osVersion}` : ""}</span>
                          </div>
                        )}
                        {item.screenResolution && (
                          <div>
                            <span className="text-muted-foreground">{t("history.resolution")}: </span>
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
                            <span>{t("history.screenshot")}</span>
                          </div>
                        )}
                        {item.hasConsoleLogs && (
                          <div className="flex items-center gap-1">
                            <Terminal className="h-3 w-3" />
                            <span>{item.consoleLogsCount || 0} {t("history.consoleLogs")}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* View Chat Hint */}
                  <div className="pt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.emailSent && (
                        <Badge variant="outline" className="text-xs">
                          {t("history.emailSent")} {item.emailSentAt ? format(new Date(item.emailSentAt), "MMM d, yyyy") : ""}
                        </Badge>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-xs gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenChat(item.id);
                      }}
                    >
                      <MessageCircle className="h-3 w-3" />
                      {t("history.viewChat")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>

    {/* Chat Sheet */}
    <FeedbackChatSheet
      open={chatOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleCloseChat();
        }
      }}
      feedbackId={selectedFeedbackId}
      onBack={handleCloseChat}
    />
  </>
  );
};

export default FeedbackHistorySheet;

