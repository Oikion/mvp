"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  MessageSquare,
  Smile,
  MoreHorizontal,
  Copy,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  useThreadMessages,
  useAddReaction,
  useEditMessage,
  useDeleteMessage,
  type MessagingCredentials,
  type Message,
} from "@/hooks/swr/useMessaging";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MessageComposer } from "./MessageComposer";
import Link from "next/link";
import { useParams } from "next/navigation";

// Common emojis for quick reactions
const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "🤔", "👀", "🙏", "💯", "👎", "😢"];

interface ThreadPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentMessage: Message;
  channelId?: string;
  conversationId?: string;
  credentials?: MessagingCredentials;
}

// Helper to get initials from name or email
function getInitials(name: string | null | undefined, email?: string | null): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "U";
}

// Single message component for thread view
function ThreadMessage({
  message,
  isCurrentUser,
  credentials,
  onReaction,
  onEdit,
  onDelete,
  isParent = false,
  locale,
}: {
  message: Message;
  isCurrentUser: boolean;
  credentials?: MessagingCredentials;
  onReaction: (messageId: string, emoji: string) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  isParent?: boolean;
  locale: string;
}) {
  const [openReactionPicker, setOpenReactionPicker] = useState(false);
  const [isAddingReaction, setIsAddingReaction] = useState(false);

  const handleReaction = async (emoji: string) => {
    setIsAddingReaction(true);
    try {
      await onReaction(message.id, emoji);
    } finally {
      setIsAddingReaction(false);
      setOpenReactionPicker(false);
    }
  };

  return (
    <div
      className={cn(
        "flex gap-3 group px-4 py-2 hover:bg-muted/50 transition-colors",
        isParent && "bg-muted/30 border-b"
      )}
    >
      {/* Avatar */}
      {message.senderProfileSlug ? (
        <Link href={`/${locale}/agent/${message.senderProfileSlug}`}>
          <Avatar className="h-8 w-8 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
            {message.senderAvatar && (
              <AvatarImage src={message.senderAvatar} alt={message.senderName || "User"} />
            )}
            <AvatarFallback className="text-xs">
              {getInitials(message.senderName, message.senderEmail)}
            </AvatarFallback>
          </Avatar>
        </Link>
      ) : (
        <Avatar className="h-8 w-8 flex-shrink-0">
          {message.senderAvatar && (
            <AvatarImage src={message.senderAvatar} alt={message.senderName || "User"} />
          )}
          <AvatarFallback className="text-xs">
            {getInitials(message.senderName, message.senderEmail)}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Message content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {message.senderProfileSlug ? (
            <Link 
              href={`/${locale}/agent/${message.senderProfileSlug}`}
              className="text-sm font-medium hover:underline"
            >
              {message.senderName || message.senderEmail || "Unknown User"}
            </Link>
          ) : (
            <span className="text-sm font-medium">
              {message.senderName || message.senderEmail || "Unknown User"}
            </span>
          )}
          <span className="text-xs text-muted-foreground">
            {format(new Date(message.createdAt), "MMM d, HH:mm")}
          </span>
          {message.isEdited && (
            <span className="text-xs text-muted-foreground">(edited)</span>
          )}
        </div>

        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-primary underline"
              >
                📎 {attachment.fileName}
              </a>
            ))}
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(
              message.reactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([emoji, count]) => {
              const hasReacted = message.reactions.some(
                (r) => r.emoji === emoji && r.userId === credentials?.userId
              );
              return (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  disabled={isAddingReaction}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors",
                    hasReacted
                      ? "bg-primary/20 border border-primary/30"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  {emoji} {count}
                </button>
              );
            })}
          </div>
        )}

        {/* Actions (on hover) */}
        <div className="flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Popover open={openReactionPicker} onOpenChange={setOpenReactionPicker}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Smile className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="start" side="top">
              <div className="flex gap-1 flex-wrap max-w-[200px]">
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    disabled={isAddingReaction}
                    className="text-lg hover:bg-accent rounded p-1 transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {isCurrentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(message.content)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy text
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEdit(message)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(message.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}

export function ThreadPanel({
  open,
  onOpenChange,
  parentMessage,
  channelId,
  conversationId,
  credentials,
}: ThreadPanelProps) {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const scrollRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Fetch thread replies
  const { replies, isLoading, error, mutate } = useThreadMessages({
    parentId: parentMessage.id,
    channelId,
    conversationId,
    enabled: open,
  });

  // Hooks for message actions
  const { addReaction } = useAddReaction();
  const { editMessage, isEditing } = useEditMessage();
  const { deleteMessage } = useDeleteMessage();

  // Scroll to bottom when new replies arrive
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    if (open && replies.length > 0) {
      // Small delay to ensure content is rendered
      setTimeout(scrollToBottom, 100);
    }
  }, [replies.length, open, scrollToBottom]);

  // Handle reactions
  const handleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      try {
        await addReaction({ messageId, emoji });
        mutate();
      } catch (error) {
        console.error("Failed to add reaction:", error);
      }
    },
    [addReaction, mutate]
  );

  // Handle edit
  const handleStartEdit = useCallback((message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  }, []);

  const handleSaveEdit = useCallback(
    async (messageId: string) => {
      if (!editContent.trim()) return;
      try {
        await editMessage({
          messageId,
          content: editContent,
          channelId,
          conversationId,
        });
        setEditingMessageId(null);
        setEditContent("");
        mutate();
      } catch (error) {
        console.error("Failed to edit message:", error);
      }
    },
    [editMessage, editContent, channelId, conversationId, mutate]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditContent("");
  }, []);

  // Handle delete
  const handleDelete = useCallback(
    async (messageId: string) => {
      try {
        await deleteMessage({
          messageId,
          channelId,
          conversationId,
        });
        mutate();
      } catch (error) {
        console.error("Failed to delete message:", error);
      }
    },
    [deleteMessage, channelId, conversationId, mutate]
  );

  const isCurrentUser = (senderId: string) => senderId === credentials?.userId;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] p-0 flex flex-col"
      >
        <SheetHeader className="px-4 py-3 border-b shrink-0">
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Thread
          </SheetTitle>
          <SheetDescription className="sr-only">
            View and reply to this thread
          </SheetDescription>
        </SheetHeader>

        {/* Thread content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ScrollArea className="flex-1" ref={scrollRef}>
            {/* Parent message */}
            <div className="border-b">
              <ThreadMessage
                message={parentMessage}
                isCurrentUser={isCurrentUser(parentMessage.senderId)}
                credentials={credentials}
                onReaction={handleReaction}
                onEdit={handleStartEdit}
                onDelete={handleDelete}
                isParent
                locale={locale}
              />
              <div className="px-4 py-2 text-xs text-muted-foreground border-t bg-muted/20">
                {parentMessage.threadCount} {parentMessage.threadCount === 1 ? "reply" : "replies"}
              </div>
            </div>

            {/* Replies - Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Replies - Error state */}
            {!isLoading && error && (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                Failed to load replies
              </div>
            )}

            {/* Replies - Empty state */}
            {!isLoading && !error && replies.length === 0 && (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                No replies yet
              </div>
            )}

            {/* Replies - Content */}
            {!isLoading && !error && replies.length > 0 && (
              <div className="py-2">
                {replies.map((reply) => {
                  if (editingMessageId === reply.id) {
                    return (
                      <div key={reply.id} className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveEdit(reply.id);
                              } else if (e.key === "Escape") {
                                handleCancelEdit();
                              }
                            }}
                            className="flex-1"
                            autoFocus
                            disabled={isEditing}
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleSaveEdit(reply.id)}
                            disabled={isEditing || !editContent.trim()}
                          >
                            {isEditing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={handleCancelEdit}
                            disabled={isEditing}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <ThreadMessage
                      key={reply.id}
                      message={reply}
                      isCurrentUser={isCurrentUser(reply.senderId)}
                      credentials={credentials}
                      onReaction={handleReaction}
                      onEdit={handleStartEdit}
                      onDelete={handleDelete}
                      locale={locale}
                    />
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Thread composer */}
          <div className="shrink-0 border-t">
            <MessageComposer
              channelId={channelId}
              conversationId={conversationId}
              credentials={credentials}
              placeholder="Reply to thread..."
              replyTo={{
                messageId: parentMessage.id,
                content: parentMessage.content,
                senderName: parentMessage.senderName || null,
              }}
              onCancelReply={() => {}} // Don't show cancel in thread view
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
