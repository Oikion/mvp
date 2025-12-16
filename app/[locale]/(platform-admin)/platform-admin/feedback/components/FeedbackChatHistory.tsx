"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Send,
  Loader2,
  MessageCircle,
  User,
  Shield,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  getFeedbackComments,
  addFeedbackComment,
  type FeedbackCommentData,
  type PlatformFeedback,
} from "@/actions/platform-admin/get-feedback";

interface FeedbackChatHistoryProps {
  feedback: PlatformFeedback;
  locale: string;
}

export function FeedbackChatHistory({
  feedback,
  locale,
}: FeedbackChatHistoryProps) {
  const t = useTranslations("platformAdmin");
  const router = useRouter();

  const [comments, setComments] = React.useState<FeedbackCommentData[]>([]);
  const [newMessage, setNewMessage] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSending, setIsSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Load comments on mount
  React.useEffect(() => {
    async function loadComments() {
      try {
        const data = await getFeedbackComments(feedback.id);
        setComments(data);
      } catch (error) {
        console.error("Failed to load comments:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadComments();
  }, [feedback.id]);

  // Scroll to bottom when comments change
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    if (!feedback.userId) {
      toast.error(t("feedback.chat.noUserToRespond"));
      return;
    }

    setIsSending(true);
    try {
      const comment = await addFeedbackComment(feedback.id, newMessage.trim());
      setComments((prev) => [...prev, comment]);
      setNewMessage("");
      toast.success(t("feedback.chat.messageSent"));
      router.refresh();
    } catch (error) {
      if (error instanceof Error && error.message === "Maximum comments reached for this feedback") {
        toast.error(t("feedback.chat.maxCommentsReached"));
      } else {
        toast.error(t("feedback.chat.sendError"));
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

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString(locale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-[400px] border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">
            {t("feedback.chat.title")}
          </span>
          <span className="text-xs text-muted-foreground">
            ({comments.length}/100)
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Original Feedback as first message */}
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-muted text-muted-foreground">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {feedback.userName || t("feedback.anonymous")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(feedback.createdAt)}
                  </span>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm whitespace-pre-wrap">{feedback.feedback}</p>
                </div>
              </div>
            </div>

            {/* Comment History */}
            {comments.map((comment) => (
              <div
                key={comment.id}
                className={`flex gap-3 ${
                  comment.authorType === "admin" ? "flex-row-reverse" : ""
                }`}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback
                    className={
                      comment.authorType === "admin"
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
                    comment.authorType === "admin" ? "text-right" : ""
                  }`}
                >
                  <div
                    className={`flex items-center gap-2 ${
                      comment.authorType === "admin" ? "justify-end" : ""
                    }`}
                  >
                    <span className="text-sm font-medium">
                      {comment.authorName || 
                        (comment.authorType === "admin" 
                          ? t("feedback.chat.adminLabel") 
                          : t("feedback.anonymous"))}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(comment.createdAt)}
                    </span>
                  </div>
                  <div
                    className={`rounded-lg p-3 inline-block max-w-[85%] ${
                      comment.authorType === "admin"
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Empty state */}
            {comments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t("feedback.chat.noMessages")}</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-background">
        {!feedback.userId ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{t("feedback.chat.anonymousNote")}</span>
          </div>
        ) : (
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("feedback.chat.placeholder")}
              className="min-h-[60px] max-h-[120px] resize-none"
              disabled={isSending}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isSending || !newMessage.trim()}
              size="icon"
              className="h-[60px] w-[60px] shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

