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
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  File,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { type PlatformFeedback, type CommentAttachment } from "@/actions/platform-admin/get-feedback";
import {
  useFeedbackComments,
  useAddFeedbackComment,
} from "@/hooks/swr/useFeedbackComments";
import { ChatAttachment } from "@/components/attachments";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
];

interface FeedbackChatHistoryProps {
  feedback: PlatformFeedback;
  locale: string;
  adminId?: string;
  adminName?: string | null;
}

export function FeedbackChatHistory({
  feedback,
  locale,
  adminId,
  adminName,
}: FeedbackChatHistoryProps) {
  const t = useTranslations("platformAdmin");
  const router = useRouter();

  const [newMessage, setNewMessage] = React.useState("");
  const [isUploading, setIsUploading] = React.useState(false);
  const [pendingAttachment, setPendingAttachment] = React.useState<CommentAttachment | null>(null);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const prevCommentsLengthRef = React.useRef<number>(0);

  // Use SWR hook for real-time comments with polling every 10 seconds
  const { comments, isLoading, isValidating } = useFeedbackComments(feedback.id, {
    refreshInterval: 10000, // Poll every 10 seconds for real-time updates
    isAdmin: true,
  });

  // Use add comment hook with optimistic updates
  const { addComment, isAdding } = useAddFeedbackComment(feedback.id, {
    currentUser: adminId ? {
      id: adminId,
      name: adminName || null,
    } : undefined,
    authorType: "admin",
    isAdmin: true,
  });

  // Scroll to bottom when new comments arrive
  React.useEffect(() => {
    if (comments.length > prevCommentsLengthRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    prevCommentsLengthRef.current = comments.length;
  }, [comments.length]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t("feedback.chat.fileTooLarge"));
      return;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error(t("feedback.chat.fileTypeNotAllowed"));
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("feedbackId", feedback.id);

      const response = await fetch("/api/platform-admin/feedback/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      setPendingAttachment({
        url: data.url,
        name: data.fileName,
        size: data.fileSize,
        type: data.fileType,
      });
      setPendingFile(file);
      toast.success(t("feedback.chat.fileUploaded"));
    } catch (error) {
      console.error("File upload error:", error);
      toast.error(t("feedback.chat.uploadError"));
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const clearPendingAttachment = () => {
    setPendingAttachment(null);
    setPendingFile(null);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !pendingAttachment) return;

    if (!feedback.userId) {
      toast.error(t("feedback.chat.noUserToRespond"));
      return;
    }

    try {
      await addComment({
        content: newMessage.trim(),
        attachment: pendingAttachment || undefined,
      });
      setNewMessage("");
      setPendingAttachment(null);
      setPendingFile(null);
      toast.success(t("feedback.chat.messageSent"));
      router.refresh();
    } catch (error) {
      if (error instanceof Error && error.message === "Maximum comments reached for this feedback") {
        toast.error(t("feedback.chat.maxCommentsReached"));
      } else {
        toast.error(t("feedback.chat.sendError"));
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date | string) => {
    return new Date(date).toLocaleString(locale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return ImageIcon;
    if (fileType.includes("pdf")) return FileText;
    return File;
  };

  return (
    <div className="flex flex-col h-[550px] border rounded-lg overflow-hidden">
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
          {isValidating && !isLoading && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />
          )}
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
                <div className="rounded-lg bg-muted p-3 max-w-[85%]">
                  <p className="text-sm whitespace-pre-wrap">{feedback.feedback}</p>
                  {/* Original Feedback Attachments */}
                  {feedback.attachments && feedback.attachments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-current/10 space-y-2">
                      {feedback.attachments.map((att) => (
                        <ChatAttachment
                          key={att.id}
                          url={att.url}
                          fileName={att.fileName}
                          fileSize={att.fileSize}
                          fileType={att.fileType}
                          isOwn={false}
                        />
                      ))}
                    </div>
                  )}
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
                        isOwn={comment.authorType === "admin"}
                        className={comment.content ? "pt-2 border-t border-current/10" : ""}
                      />
                    )}
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
          <div className="space-y-2">
            {/* Pending Attachment Preview */}
            {pendingAttachment && pendingFile && (
              <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                {(() => {
                  const Icon = getFileIcon(pendingAttachment.type);
                  return <Icon className="h-4 w-4 text-muted-foreground shrink-0" />;
                })()}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{pendingAttachment.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(pendingAttachment.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={clearPendingAttachment}
                  disabled={isAdding}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept={ALLOWED_TYPES.join(",")}
                disabled={isAdding || isUploading}
              />
              
              {/* Attachment button */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-[60px] w-[60px] shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAdding || isUploading || !!pendingAttachment}
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Paperclip className="h-5 w-5" />
                )}
              </Button>
              
              <Textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("feedback.chat.placeholder")}
                className="min-h-[60px] max-h-[120px] resize-none"
                disabled={isAdding}
              />
              
              <Button
                onClick={handleSendMessage}
                disabled={isAdding || (!newMessage.trim() && !pendingAttachment)}
                size="icon"
                className="h-[60px] w-[60px] shrink-0"
              >
                {isAdding ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
            
            {/* File size hint */}
            <p className="text-xs text-muted-foreground text-center">
              {t("feedback.chat.maxFileSize")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}





