"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/ui/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bug,
  Sparkles,
  MessageSquare,
  HelpCircle,
  MoreHorizontal,
  Send,
  User,
  Shield,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageCircle,
} from "lucide-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import axios from "axios";

interface FeedbackComment {
  id: string;
  createdAt: string;
  authorId: string;
  authorType: string;
  authorName: string | null;
  content: string;
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
  comments?: FeedbackComment[];
}

interface FeedbackChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedbackId: string | null;
  onBack?: () => void;
}

const feedbackTypeConfig = {
  bug: { 
    label: "Bug Report", 
    icon: Bug, 
    color: "bg-red-500/15 text-red-600 dark:text-red-400" 
  },
  feature: { 
    label: "Feature Request", 
    icon: Sparkles, 
    color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" 
  },
  general: { 
    label: "General Feedback", 
    icon: MessageSquare, 
    color: "bg-green-500/15 text-green-600 dark:text-green-400" 
  },
  question: { 
    label: "Question", 
    icon: HelpCircle, 
    color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" 
  },
  other: { 
    label: "Other", 
    icon: MoreHorizontal, 
    color: "bg-muted text-muted-foreground" 
  },
};

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "text-yellow-600" },
  reviewed: { label: "Reviewed", icon: CheckCircle2, color: "text-blue-600" },
  resolved: { label: "Resolved", icon: CheckCircle2, color: "text-green-600" },
  user_replied: { label: "User Replied", icon: MessageCircle, color: "text-purple-600" },
};

const FeedbackChatSheet = ({ 
  open, 
  onOpenChange, 
  feedbackId,
  onBack 
}: FeedbackChatSheetProps) => {
  const t = useTranslations("feedback");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackItem | null>(null);
  const [comments, setComments] = useState<FeedbackComment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && feedbackId) {
      fetchFeedbackDetails();
    }
  }, [open, feedbackId]);

  // Scroll to bottom when comments change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const fetchFeedbackDetails = async () => {
    if (!feedbackId) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/feedback/${feedbackId}`);
      const data = response.data.feedback;
      setFeedback(data);
      setComments(data.comments || []);
    } catch (err) {
      console.error("Failed to fetch feedback details:", err);
      setError(t("chat.loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !feedbackId) return;

    setIsSending(true);
    try {
      const response = await axios.post(`/api/feedback/${feedbackId}/comments`, {
        content: newMessage.trim(),
      });
      
      setComments((prev) => [...prev, response.data.comment]);
      setNewMessage("");
    } catch (err: unknown) {
      console.error("Failed to send message:", err);
      if (axios.isAxiosError(err) && err.response?.data?.error === "Maximum comments reached for this feedback") {
        setError(t("chat.maxCommentsReached"));
      } else {
        setError(t("chat.sendError"));
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getFeedbackTypeConfig = (type: string) => {
    return feedbackTypeConfig[type as keyof typeof feedbackTypeConfig] || feedbackTypeConfig.other;
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || statusConfig.pending;
  };

  const formatTime = (dateStr: string) => {
    return format(new Date(dateStr), "MMM d, yyyy 'at' h:mm a");
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="min-w-[700px] sm:max-w-[700px] flex flex-col p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3 mb-2">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <SheetHeader className="flex-1">
              <SheetTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {t("chat.title")}
              </SheetTitle>
              <SheetDescription>
                {t("chat.description")}
              </SheetDescription>
            </SheetHeader>
          </div>

          {/* Feedback Info Badge */}
          {feedback && (
            <div className="flex items-center gap-2 mt-3">
              {(() => {
                const typeConfig = getFeedbackTypeConfig(feedback.feedbackType);
                return (
                  <Badge className={typeConfig.color}>
                    {t(`types.${feedback.feedbackType}`) || typeConfig.label}
                  </Badge>
                );
              })()}
              {feedback.status && (
                <Badge variant="outline" className="gap-1">
                  {(() => {
                    const status = getStatusConfig(feedback.status);
                    const StatusIcon = status.icon;
                    return (
                      <>
                        <StatusIcon className={`h-3 w-3 ${status.color}`} />
                        {status.label}
                      </>
                    );
                  })()}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {t("chat.commentsCount", { count: comments.length })} • {comments.length}/100
              </span>
            </div>
          )}
        </div>

        {/* Messages Area */}
        <ScrollArea ref={scrollRef} className="flex-1 px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Icons.spinner className="h-6 w-6 animate-spin" />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3 mb-4">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && feedback && (
            <div className="space-y-4">
              {/* Original Feedback as first message (user's message - right side, primary) */}
              <div className="flex gap-3 flex-row-reverse">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-sm font-medium">{t("chat.you")}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(feedback.createdAt)}
                    </span>
                  </div>
                  <div className="rounded-lg p-3 inline-block max-w-[85%] bg-primary text-primary-foreground ml-auto">
                    <p className="text-sm whitespace-pre-wrap">{feedback.feedback}</p>
                  </div>
                </div>
              </div>

              {/* Admin Response (if any, shown before comments for legacy support - left side, muted) */}
              {feedback.adminResponse && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <Shield className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{t("chat.adminLabel")}</span>
                      {feedback.respondedAt && (
                        <span className="text-xs text-muted-foreground">
                          {formatTime(feedback.respondedAt)}
                        </span>
                      )}
                    </div>
                    <div className="rounded-lg p-3 inline-block max-w-[85%] bg-muted">
                      <p className="text-sm whitespace-pre-wrap">{feedback.adminResponse}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Comment History */}
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`flex gap-3 ${
                    comment.authorType === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback
                      className={
                        comment.authorType === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {comment.authorType === "admin" ? (
                        <Shield className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className={`flex-1 space-y-1 ${
                      comment.authorType === "user" ? "text-right" : ""
                    }`}
                  >
                    <div
                      className={`flex items-center gap-2 ${
                        comment.authorType === "user" ? "justify-end" : ""
                      }`}
                    >
                      <span className="text-sm font-medium">
                        {comment.authorType === "admin" 
                          ? (comment.authorName || t("chat.adminLabel"))
                          : t("chat.you")}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(comment.createdAt)}
                      </span>
                    </div>
                    <div
                      className={`rounded-lg p-3 inline-block max-w-[85%] ${
                        comment.authorType === "user"
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty state when no conversation yet */}
              {comments.length === 0 && !feedback.adminResponse && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">{t("chat.noMessages")}</p>
                  <p className="text-xs mt-1">{t("chat.waitingForAdmin")}</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t bg-background">
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("chat.placeholder")}
              className="min-h-[60px] max-h-[120px] resize-none"
              disabled={isSending || loading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isSending || !newMessage.trim() || loading}
              size="icon"
              className="h-[60px] w-[60px] shrink-0"
            >
              {isSending ? (
                <Icons.spinner className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t("chat.inputHint")}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FeedbackChatSheet;
