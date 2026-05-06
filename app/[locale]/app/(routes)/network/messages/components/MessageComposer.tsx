"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import {
  AtSign,
  Loader2,
  Paperclip,
  Reply,
  Send,
  Share2,
  Smile,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAblyMessages } from "@/hooks/useAbly";
import { useSendMessage } from "@/hooks/swr/useMessaging";
import { useE2EE } from "@/hooks/useE2EE";
import { ShareEntityDialog } from "./ShareEntityDialog";
import type { SharedEntity } from "./ShareEntityDialog";
import type { MessagingCredentials } from "@/hooks/swr/useMessaging";

interface ReplyInfo {
  messageId: string;
  content: string;
  senderName: string | null;
}

interface MessageComposerProps {
  channelId?: string;
  conversationId?: string;
  isGroupConversation?: boolean;
  credentials?: MessagingCredentials;
  placeholder?: string;
  disabled?: boolean;
  replyTo?: ReplyInfo | null;
  onCancelReply?: () => void;
  onSend?: (message: string, attachments?: File[]) => Promise<void>;
}

// Common emoji for quick access
const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🤔", "👀", "🙏", "💯"];

export function MessageComposer({
  channelId,
  conversationId,
  isGroupConversation = false,
  credentials,
  placeholder = "Type a message...",
  disabled = false,
  replyTo,
  onCancelReply,
  onSend,
}: MessageComposerProps) {
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharedEntity, setSharedEntity] = useState<SharedEntity | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const typingEnabled = !!(channelId || conversationId);

  // Use the SWR mutation hook for sending messages
  const { sendMessage, isSending } = useSendMessage({ channelId, conversationId });

  // E2EE encryption
  const { isUnlocked, encryptDM, encryptGroup } = useE2EE();

  const { user } = useUser();
  const displayName = useMemo(
    () => user?.firstName || user?.fullName || user?.username || undefined,
    [user?.firstName, user?.fullName, user?.username]
  );

  // Ably for typing indicators
  const { sendTyping } = useAblyMessages({
    channelId,
    conversationId,
    organizationId: credentials?.organizationId,
    credentials,
  });

  // Handle typing indicator
  const handleTypingStart = useCallback(() => {
    if (!typingEnabled) return;
    if (!isTyping) {
      setIsTyping(true);
      sendTyping(true, displayName);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping(false, displayName);
    }, 3000);
  }, [isTyping, sendTyping, typingEnabled, displayName]);

  // Clean up typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Handle entity share
  const handleEntityShare = useCallback((entity: SharedEntity) => {
    setSharedEntity(entity);
    // Optionally add a message about the shared entity
    const entityLabel = entity.type.charAt(0).toUpperCase() + entity.type.slice(1);
    setMessage(`📎 Sharing ${entityLabel}: ${entity.title}`);
  }, []);

  // Remove shared entity
  const removeSharedEntity = useCallback(() => {
    setSharedEntity(null);
    setMessage("");
  }, []);

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!message.trim() && attachments.length === 0 && !sharedEntity) return;
    if (isSending || disabled) return;

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (isTyping && typingEnabled) {
      setIsTyping(false);
      sendTyping(false, displayName);
    }

    try {
      if (onSend) {
        await onSend(message, attachments);
      } else {
        // Upload file attachments first
        let uploadedAttachments: Array<{
          fileName: string;
          fileSize: number;
          fileType: string;
          url: string;
        }> = [];

        if (attachments.length > 0) {
          setIsUploadingFiles(true);
          try {
            const uploads = await Promise.all(
              attachments.map(async (file) => {
                const formData = new FormData();
                formData.append("file", file);
                const res = await fetch("/api/messaging/attachments", {
                  method: "POST",
                  body: formData,
                });
                if (!res.ok) {
                  const err = await res.json().catch(() => ({}));
                  throw new Error(err.error || "Failed to upload file");
                }
                const data = await res.json();
                return {
                  fileName: data.attachment.name,
                  fileSize: data.attachment.size,
                  fileType: data.attachment.type,
                  url: data.attachment.url,
                };
              })
            );
            uploadedAttachments = uploads;
          } finally {
            setIsUploadingFiles(false);
          }
        }

        // Encrypt message if E2EE is unlocked
        let content = message;
        let e2eeFields: {
          sessionId?: string;
          messageIndex?: number;
          dhPublicKey?: string;
          previousChainLen?: number;
        } = {};

        if (isUnlocked && message.trim()) {
          try {
            if (conversationId && !isGroupConversation) {
              // 1:1 DM — Double Ratchet
              const encrypted = await encryptDM(conversationId, message);
              content = JSON.stringify(encrypted);
              e2eeFields = {
                dhPublicKey: encrypted.header.dhPublicKey,
                previousChainLen: encrypted.header.previousChainLength,
                messageIndex: encrypted.header.messageNumber,
              };
            } else if (channelId || (conversationId && isGroupConversation)) {
              // Group channel or group DM — Megolm
              const sessionKey = channelId ?? conversationId!;
              const encrypted = await encryptGroup(sessionKey, message);
              content = JSON.stringify(encrypted);
              e2eeFields = {
                sessionId: encrypted.sessionId,
                messageIndex: encrypted.messageIndex,
              };
            }
          } catch (err) {
            console.error("[E2EE] Encryption failed, sending unencrypted:", err);
            // Fall back to unencrypted
          }
        }

        await sendMessage({
          channelId,
          conversationId,
          content,
          parentId: replyTo?.messageId,
          ...e2eeFields,
          attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
          entityAttachment: sharedEntity ? {
            type: sharedEntity.type,
            id: sharedEntity.id,
            title: sharedEntity.title,
            subtitle: sharedEntity.subtitle,
            metadata: sharedEntity.metadata,
          } : undefined,
        });
      }
      setMessage("");
      setAttachments([]);
      setSharedEntity(null);
      onCancelReply?.();
      textareaRef.current?.focus();
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }, [message, attachments, sharedEntity, isSending, disabled, onSend, sendMessage, channelId, conversationId, isTyping, sendTyping, replyTo, onCancelReply, typingEnabled, displayName]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle message change with typing indicator
  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    if (e.target.value.length > 0) {
      handleTypingStart();
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Insert emoji at cursor
  const insertEmoji = (emoji: string) => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const newMessage = message.substring(0, start) + emoji + message.substring(end);
      setMessage(newMessage);
      handleTypingStart();
      // Refocus and move cursor
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setMessage((prev) => prev + emoji);
      handleTypingStart();
    }
  };

  const isDisabled = disabled || !credentials?.userId;
  const canSend = (message.trim() || attachments.length > 0 || sharedEntity) && !isSending && !isUploadingFiles && !isDisabled;

  return (
    <div className="border-t p-4 bg-background">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-muted/50 border-l-2 border-primary rounded-r-lg">
          <Reply className="h-4 w-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-primary">
              Replying to {replyTo.senderName || "Unknown"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {replyTo.content}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0"
            onClick={onCancelReply}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Shared entity preview */}
      {sharedEntity && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-primary/5 border border-primary/20 rounded-lg">
          <Share2 className="h-4 w-4 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{sharedEntity.title}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {sharedEntity.type}
              {sharedEntity.subtitle && ` • ${sharedEntity.subtitle}`}
            </p>
          </div>
          <button
            onClick={removeSharedEntity}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-lg text-sm"
            >
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() => removeAttachment(index)}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Toolbar */}
        <div className="flex items-center gap-1">
          {/* File attachment */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isDisabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={isDisabled}
          />

          {/* Share entity */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isDisabled}
            onClick={() => setShareDialogOpen(true)}
            title="Share property, client, document, or event"
          >
            <Share2 className="h-4 w-4" />
          </Button>

          {/* Emoji picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={isDisabled}
              >
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start">
              <div className="flex gap-1">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => insertEmoji(emoji)}
                    className="p-2 hover:bg-muted rounded text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Mention */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isDisabled}
            onClick={() => insertEmoji("@")}
          >
            <AtSign className="h-4 w-4" />
          </Button>
        </div>

        {/* Message input */}
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleMessageChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          className={cn(
            "flex-1 min-h-[40px] max-h-[200px] resize-none py-2",
            isDisabled && "opacity-50"
          )}
          rows={1}
        />

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!canSend}
          size="icon"
          className="h-10 w-10"
        >
          {isSending || isUploadingFiles ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground mt-2">
        Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Enter</kbd> to send,{" "}
        <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Shift + Enter</kbd> for new line
      </p>

      {/* Share Entity Dialog */}
      <ShareEntityDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        onShare={handleEntityShare}
      />
    </div>
  );
}
