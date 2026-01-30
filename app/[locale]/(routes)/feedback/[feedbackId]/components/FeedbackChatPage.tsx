"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  Calendar,
  Globe,
  Camera,
  Terminal,
} from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Icons } from "@/components/ui/icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  useFeedbackComments,
  useAddFeedbackComment,
  type FeedbackComment,
} from "@/hooks/swr/useFeedbackComments";
import { ChatAttachment } from "@/components/attachments";

interface FeedbackAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
}

interface FeedbackData {
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
  attachments?: FeedbackAttachment[];
  comments?: FeedbackComment[];
}

interface FeedbackChatPageProps {
  feedback: FeedbackData;
  locale: string;
  currentUserId?: string;
  currentUserName?: string | null;
}

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

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "text-warning" },
  reviewed: { label: "Reviewed", icon: CheckCircle2, color: "text-primary" },
  resolved: { label: "Resolved", icon: CheckCircle2, color: "text-success" },
  user_replied: { label: "User Replied", icon: MessageCircle, color: "text-purple-600" },
};

export function FeedbackChatPage({ 
  feedback, 
  locale, 
  currentUserId, 
  currentUserName 
}: FeedbackChatPageProps) {
  const router = useRouter();
  const t = useTranslations("feedback");
  const [newMessage, setNewMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCommentsLengthRef = useRef<number>(feedback.comments?.length || 0);

  // Use SWR hook for real-time comments with polling every 10 seconds
  const { comments, isLoading, isValidating } = useFeedbackComments(feedback.id, {
    refreshInterval: 10000, // Poll every 10 seconds for real-time updates
    isAdmin: false,
  });

  // Use add comment hook with optimistic updates
  const { addComment, isAdding } = useAddFeedbackComment(feedback.id, {
    currentUser: currentUserId ? {
      id: currentUserId,
      name: currentUserName || null,
    } : undefined,
    authorType: "user",
    isAdmin: false,
  });

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (comments.length > prevCommentsLengthRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevCommentsLengthRef.current = comments.length;
  }, [comments.length]);

  // Initial scroll to bottom on mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setError(null);
    try {
      await addComment({ content: newMessage.trim() });
      setNewMessage("");
    } catch (err: unknown) {
      console.error("Failed to send message:", err);
      if (err instanceof Error && err.message === "Maximum comments reached for this feedback") {
        setError(t("chat.maxCommentsReached"));
      } else {
        setError(t("chat.sendError"));
      }
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

  const typeConfig = getFeedbackTypeConfig(feedback.feedbackType);
  const TypeIcon = typeConfig.icon;
  const status = getStatusConfig(feedback.status || "pending");
  const StatusIcon = status.icon;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        className="mb-4 gap-2"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4" />
        {t("chat.back")}
      </Button>

      <div className="grid gap-6">
        {/* Feedback Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                  <TypeIcon className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {t(`types.${feedback.feedbackType}`) || typeConfig.label}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Calendar className="h-3 w-3" />
                    {formatTime(feedback.createdAt)}
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="gap-1">
                <StatusIcon className={`h-3 w-3 ${status.color}`} />
                {t(`history.status.${feedback.status}`) || status.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-foreground whitespace-pre-wrap">
              {feedback.feedback}
            </div>

            {/* Technical Details */}
            {(feedback.url || feedback.browserName || feedback.osName || feedback.screenResolution) && (
              <div className="pt-3 border-t space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("history.technicalDetails")}
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {feedback.url && (
                    <div className="flex items-center gap-2">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">URL:</span>
                      <span className="truncate">{feedback.url}</span>
                    </div>
                  )}
                  {feedback.browserName && (
                    <div>
                      <span className="text-muted-foreground">{t("history.browser")}: </span>
                      <span>{feedback.browserName}{feedback.browserVersion ? ` ${feedback.browserVersion}` : ""}</span>
                    </div>
                  )}
                  {feedback.osName && (
                    <div>
                      <span className="text-muted-foreground">{t("history.os")}: </span>
                      <span>{feedback.osName}{feedback.osVersion ? ` ${feedback.osVersion}` : ""}</span>
                    </div>
                  )}
                  {feedback.screenResolution && (
                    <div>
                      <span className="text-muted-foreground">{t("history.resolution")}: </span>
                      <span>{feedback.screenResolution}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bug Report Indicators */}
            {feedback.feedbackType === "bug" && (feedback.hasScreenshot || feedback.hasConsoleLogs) && (
              <div className="pt-3 border-t">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {feedback.hasScreenshot && (
                    <div className="flex items-center gap-1">
                      <Camera className="h-3 w-3" />
                      <span>{t("history.screenshot")}</span>
                    </div>
                  )}
                  {feedback.hasConsoleLogs && (
                    <div className="flex items-center gap-1">
                      <Terminal className="h-3 w-3" />
                      <span>{feedback.consoleLogsCount || 0} {t("history.consoleLogs")}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat Card */}
        <Card className="flex flex-col min-h-[500px]">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">{t("chat.title")}</CardTitle>
                {isValidating && !isLoading && (
                  <Icons.spinner className="h-3 w-3 animate-spin text-muted-foreground" />
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {comments.length}/100 {t("chat.commentsCount", { count: comments.length }).replace(/\d+/, "")}
              </span>
            </div>
          </CardHeader>
          
          {/* Messages Area */}
          <ScrollArea ref={scrollRef} className="flex-1 p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Icons.spinner className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
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
                      {/* Original Feedback Attachments */}
                      {feedback.attachments && feedback.attachments.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-primary-foreground/20 space-y-2">
                          {feedback.attachments.map((att) => (
                            <ChatAttachment
                              key={att.id}
                              url={att.url}
                              fileName={att.fileName}
                              fileSize={att.fileSize}
                              fileType={att.fileType}
                              isOwn={true}
                            />
                          ))}
                        </div>
                      )}
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
                        {comment.content && (
                          <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                        )}
                        {/* Attachment Display with Image Preview */}
                        {comment.attachmentUrl && comment.attachmentName && (
                          <ChatAttachment
                            url={comment.attachmentUrl}
                            fileName={comment.attachmentName}
                            fileSize={comment.attachmentSize || undefined}
                            fileType={comment.attachmentType || "application/octet-stream"}
                            isOwn={comment.authorType === "user"}
                            className={comment.content ? "pt-2 border-t border-current/10" : ""}
                          />
                        )}
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

          {/* Error message */}
          {error && (
            <div className="px-4 py-2">
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t bg-background">
            <div className="flex gap-2">
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("chat.placeholder")}
                className="min-h-[60px] max-h-[120px] resize-none"
                disabled={isAdding}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isAdding || !newMessage.trim()}
                size="icon"
                className="h-[60px] w-[60px] shrink-0"
              >
                {isAdding ? (
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
        </Card>
      </div>
    </div>
  );
}





