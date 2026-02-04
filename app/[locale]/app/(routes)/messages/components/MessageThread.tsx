"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import {
  Loader2,
  MessageSquare,
  Smile,
  MoreHorizontal,
  Building2,
  User,
  FileText,
  Calendar,
  ExternalLink,
  Copy,
  Pencil,
  Trash2,
  X,
  Check,
  Reply,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { useMessages, useAddReaction, useEditMessage, useDeleteMessage, type MessagingCredentials, type Message } from "@/hooks/swr/useMessaging";
import { useAblyMessages, useAblyConnection } from "@/hooks/useAbly";
import Link from "next/link";
import { useParams } from "next/navigation";

// Common emojis for quick reactions
const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "🤔", "👀", "🙏", "💯", "👎", "😢"];

interface MessageThreadProps {
  channelId?: string;
  conversationId?: string;
  credentials?: MessagingCredentials;
  onReply?: (messageId: string, content: string, senderName: string | null) => void;
  onOpenThread?: (message: Message) => void;
}

// Entity icon helper
function getEntityIcon(type: string) {
  switch (type) {
    case "property":
      return <Building2 className="h-4 w-4" />;
    case "client":
      return <User className="h-4 w-4" />;
    case "document":
      return <FileText className="h-4 w-4" />;
    case "event":
      return <Calendar className="h-4 w-4" />;
    default:
      return null;
  }
}

// Get entity link path
function getEntityPath(type: string, id: string, locale: string) {
  switch (type) {
    case "property":
      return `/${locale}/app/mls/properties/${id}`;
    case "client":
      return `/${locale}/app/crm/clients/${id}`;
    case "document":
      return `/${locale}/app/documents/${id}`;
    case "event":
      return `/${locale}/app/calendar?eventId=${id}`;
    default:
      return "#";
  }
}

// Entity card colors
function getEntityColors(type: string) {
  switch (type) {
    case "property":
      return "bg-primary/10 text-primary border-primary/20";
    case "client":
      return "bg-success/10 text-success border-success/20";
    case "document":
      return "bg-warning/10 text-warning border-warning/20";
    case "event":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    default:
      return "bg-gray-500/10 text-muted-foreground border-gray-500/20";
  }
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

export function MessageThread({ channelId, conversationId, credentials, onReply, onOpenThread }: MessageThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const [openReactionPicker, setOpenReactionPicker] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // Fetch messages using SWR
  const { messages, isLoading, error, hasMore, mutate } = useMessages({
    channelId,
    conversationId,
    enabled: !!(channelId || conversationId),
  });

  // Reaction hook
  const { addReaction, isAdding: isAddingReaction } = useAddReaction();

  // Edit and delete hooks
  const { editMessage, isEditing } = useEditMessage();
  const { deleteMessage, isDeleting } = useDeleteMessage();

  // Handle adding a reaction
  const handleReaction = useCallback(async (messageId: string, emoji: string) => {
    try {
      await addReaction({ messageId, emoji });
      // Revalidate messages to show updated reactions
      mutate();
      setOpenReactionPicker(null);
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
  }, [addReaction, mutate]);

  // Handle copy message
  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  // Handle start editing
  const handleStartEdit = useCallback((message: Message) => {
    setEditingMessageId(message.id);
    setEditContent(message.content);
  }, []);

  // Handle save edit
  const handleSaveEdit = useCallback(async (messageId: string) => {
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
  }, [editMessage, editContent, channelId, conversationId, mutate]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditContent("");
  }, []);

  // Handle delete message
  const handleDelete = useCallback(async (messageId: string) => {
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
  }, [deleteMessage, channelId, conversationId, mutate]);

  // Subscribe to real-time updates via Ably
  const { isSubscribed, typingUsers } = useAblyMessages({
    channelId,
    conversationId,
    organizationId: credentials?.organizationId,
    credentials,
    onNewMessage: () => {
      // Revalidate messages on new message (handled by hook)
    },
    onMessageEdit: () => {
      // Revalidate on edit (handled by hook)
    },
    onMessageDelete: () => {
      // Revalidate on delete (handled by hook)
    },
  });

  // Ably connection status
  const { isConnected, isConnecting } = useAblyConnection(credentials);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Format date for message groups
  const formatDateHeader = (date: Date) => {
    const d = new Date(date);
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMMM d, yyyy");
  };

  // Group messages by date
  const messageGroups: { date: Date; messages: Message[] }[] = [];
  let currentGroup: { date: Date; messages: Message[] } | null = null;

  messages.forEach((msg) => {
    const msgDate = new Date(msg.createdAt);
    if (!currentGroup || !isSameDay(currentGroup.date, msgDate)) {
      currentGroup = { date: msgDate, messages: [] };
      messageGroups.push(currentGroup);
    }
    currentGroup.messages.push(msg);
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Loading messages...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Unable to load messages
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 px-4" ref={scrollRef}>
      <div className="py-4 space-y-6">
        {/* Connection status indicator */}
        {isConnecting && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Connecting to real-time updates...
          </div>
        )}

        {messageGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* Date header */}
            <div className="flex items-center justify-center my-4">
              <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                {formatDateHeader(group.date)}
              </div>
            </div>

            {/* Messages */}
            <div className="space-y-4">
              {group.messages.map((message, msgIndex) => {
                const isCurrentUser = message.senderId === credentials?.userId;
                const showAvatar =
                  msgIndex === 0 ||
                  group.messages[msgIndex - 1].senderId !== message.senderId;

                return (
                  <ContextMenu key={message.id}>
                    <ContextMenuTrigger asChild>
                      <div
                        className={cn(
                          "flex gap-3 group",
                          isCurrentUser && "flex-row-reverse"
                        )}
                      >
                        {/* Avatar - placeholder when not showing */}
                        {!showAvatar && <div className="w-8" />}

                        {/* Avatar - with profile link */}
                        {showAvatar && message.senderProfileSlug && (
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
                        )}

                        {/* Avatar - without profile link */}
                        {showAvatar && !message.senderProfileSlug && (
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
                    <div
                      className={cn(
                        "flex flex-col max-w-[70%]",
                        isCurrentUser && "items-end"
                      )}
                    >
                      {showAvatar && (
                        <div
                          className={cn(
                            "flex items-center gap-2 mb-1",
                            isCurrentUser && "flex-row-reverse"
                          )}
                        >
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
                            {format(new Date(message.createdAt), "HH:mm")}
                          </span>
                          {message.isEdited && (
                            <span className="text-xs text-muted-foreground">(edited)</span>
                          )}
                        </div>
                      )}

                      <div
                        className={cn(
                          "rounded-lg px-4 py-2 text-sm relative",
                          isCurrentUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        )}
                      >
                        {/* Text content or edit input */}
                        {editingMessageId === message.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSaveEdit(message.id);
                                } else if (e.key === "Escape") {
                                  handleCancelEdit();
                                }
                              }}
                              className="flex-1 h-8 bg-background text-foreground"
                              autoFocus
                              disabled={isEditing}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={() => handleSaveEdit(message.id)}
                              disabled={isEditing || !editContent.trim()}
                            >
                              {isEditing ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              onClick={handleCancelEdit}
                              disabled={isEditing}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        )}

                        {/* Entity attachment card */}
                        {message.entityAttachment && (
                          <Link
                            href={getEntityPath(
                              message.entityAttachment.type,
                              message.entityAttachment.id,
                              locale
                            )}
                            className="block mt-2"
                          >
                            <div
                              className={cn(
                                "rounded-lg border p-3 transition-colors hover:bg-background/50",
                                isCurrentUser
                                  ? "bg-background/10 border-primary-foreground/20"
                                  : getEntityColors(message.entityAttachment.type)
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={cn(
                                    "rounded-full p-2",
                                    isCurrentUser
                                      ? "bg-primary-foreground/20"
                                      : getEntityColors(message.entityAttachment.type)
                                  )}
                                >
                                  {getEntityIcon(message.entityAttachment.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        "text-xs capitalize",
                                        isCurrentUser && "border-primary-foreground/30"
                                      )}
                                    >
                                      {message.entityAttachment.type}
                                    </Badge>
                                    <ExternalLink className="h-3 w-3 opacity-50" />
                                  </div>
                                  <h4 className="font-medium mt-1 truncate">
                                    {message.entityAttachment.title}
                                  </h4>
                                  {message.entityAttachment.subtitle && (
                                    <p
                                      className={cn(
                                        "text-xs truncate mt-0.5",
                                        isCurrentUser
                                          ? "text-primary-foreground/70"
                                          : "text-muted-foreground"
                                      )}
                                    >
                                      {message.entityAttachment.subtitle}
                                    </p>
                                  )}
                                  {typeof message.entityAttachment.metadata?.price === 'number' && (
                                    <p className="text-xs font-medium mt-1">
                                      €
                                      {Number(
                                        message.entityAttachment.metadata.price
                                      ).toLocaleString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                        )}

                        {/* Attachments */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {message.attachments.map((attachment) => (
                              <a
                                key={attachment.id}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs underline"
                              >
                                📎 {attachment.fileName}
                              </a>
                            ))}
                          </div>
                        )}

                        {/* Reactions */}
                        {message.reactions && message.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {/* Group reactions by emoji */}
                            {Object.entries(
                              message.reactions.reduce((acc, r) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                              }, {} as Record<string, number>)
                            ).map(([emoji, count]) => {
                              // Check if current user has this reaction
                              const hasReacted = message.reactions.some(
                                r => r.emoji === emoji && r.userId === credentials?.userId
                              );
                              return (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(message.id, emoji)}
                                  disabled={isAddingReaction}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors",
                                    hasReacted
                                      ? "bg-primary/20 border border-primary/30"
                                      : "bg-background/50 hover:bg-background/80"
                                  )}
                                >
                                  {emoji} {count}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Thread indicator */}
                        {message.threadCount > 0 && (
                          <div className="mt-2 pt-2 border-t border-current/10">
                            <button 
                              className="flex items-center gap-1 text-xs opacity-80 hover:opacity-100 hover:underline"
                              onClick={() => onOpenThread?.(message)}
                            >
                              <MessageSquare className="h-3 w-3" />
                              {message.threadCount} {message.threadCount === 1 ? "reply" : "replies"}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Message actions (shown on hover) */}
                      <div className={cn(
                        "flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity",
                        isCurrentUser && "flex-row-reverse"
                      )}>
                        {/* Reaction picker */}
                        <Popover 
                          open={openReactionPicker === message.id} 
                          onOpenChange={(open) => setOpenReactionPicker(open ? message.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <Smile className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent 
                            className="w-auto p-2" 
                            align={isCurrentUser ? "end" : "start"}
                            side="top"
                          >
                            <div className="flex gap-1 flex-wrap max-w-[200px]">
                              {REACTION_EMOJIS.map((emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReaction(message.id, emoji)}
                                  disabled={isAddingReaction}
                                  className="text-lg hover:bg-accent rounded p-1 transition-colors"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6"
                          onClick={() => onReply?.(message.id, message.content, message.senderName || null)}
                          title="Reply"
                        >
                          <MessageSquare className="h-3 w-3" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <MoreHorizontal className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align={isCurrentUser ? "end" : "start"}>
                            <DropdownMenuItem onClick={() => handleCopy(message.content)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy text
                            </DropdownMenuItem>
                            {isCurrentUser && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleStartEdit(message)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDelete(message.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                    </ContextMenuTrigger>
                    
                    {/* Right-click Context Menu */}
                    <ContextMenuContent className="w-48">
                      <ContextMenuItem 
                        onClick={() => onReply?.(message.id, message.content, message.senderName || null)}
                        className="cursor-pointer"
                      >
                        <Reply className="mr-2 h-4 w-4" />
                        Reply
                      </ContextMenuItem>
                      
                      <ContextMenuSub>
                        <ContextMenuSubTrigger className="cursor-pointer">
                          <Smile className="mr-2 h-4 w-4" />
                          Add Reaction
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-48">
                          <div className="flex flex-wrap gap-1 p-2">
                            {REACTION_EMOJIS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleReaction(message.id, emoji)}
                                disabled={isAddingReaction}
                                className="text-lg hover:bg-accent rounded p-1 transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </ContextMenuSubContent>
                      </ContextMenuSub>
                      
                      <ContextMenuItem 
                        onClick={() => handleCopy(message.content)}
                        className="cursor-pointer"
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Text
                      </ContextMenuItem>
                      
                      {isCurrentUser && (
                        <>
                          <ContextMenuSeparator />
                          <ContextMenuItem 
                            onClick={() => handleStartEdit(message)}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Message
                          </ContextMenuItem>
                          <ContextMenuItem 
                            onClick={() => handleDelete(message.id)}
                            className="cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Message
                          </ContextMenuItem>
                        </>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
            </div>
          </div>
        ))}

        {messages.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No messages yet</p>
            <p className="text-sm mt-1">Start the conversation!</p>
          </div>
        )}

        {/* Typing indicators */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
            </div>
            <span>
              {typingUsers.length === 1
                ? "Someone is typing"
                : `${typingUsers.length} people are typing`}
            </span>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
