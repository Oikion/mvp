"use client";

import { Hash, Users, Megaphone, Lock, Loader2, BellOff, Bell, CheckCheck, Trash2, LogOut, Eye } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { ChannelType } from "@prisma/client";

export interface ConversationItem {
  id: string;
  name: string;
  type: "channel" | "dm" | "group" | "entity";
  avatar?: string;
  lastMessage?: string;
  unreadCount?: number;
  isDefault?: boolean;
  channelType?: ChannelType;
  entityType?: string;
  isMuted?: boolean;
}

interface ConversationListProps {
  items: ConversationItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  // Context menu actions
  onMarkAsRead?: (item: ConversationItem) => void;
  onMuteToggle?: (item: ConversationItem) => void;
  onLeave?: (item: ConversationItem) => void;
  onDelete?: (item: ConversationItem) => void;
}

export function ConversationList({
  items,
  selectedId,
  onSelect,
  isLoading,
  emptyMessage = "No conversations",
  onMarkAsRead,
  onMuteToggle,
  onLeave,
  onDelete,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item) => (
        <ContextMenu key={item.id}>
          <ContextMenuTrigger asChild>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                "hover:bg-accent/50",
                selectedId === item.id && "bg-accent"
              )}
            >
              {/* Icon/Avatar */}
              {item.type === "channel" ? (
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-muted">
                  {item.channelType === "PRIVATE" ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : item.channelType === "ANNOUNCEMENT" ? (
                    <Megaphone className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Hash className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              ) : item.type === "entity" || item.type === "group" ? (
                <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-muted">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              ) : (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  {item.avatar && <AvatarImage src={item.avatar} />}
                  <AvatarFallback className="text-xs">
                    {item.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "truncate text-sm",
                    selectedId === item.id ? "font-medium" : "font-normal",
                    item.unreadCount && item.unreadCount > 0 && "font-semibold"
                  )}>
                    {item.type === "channel" ? `#${item.name.toLowerCase()}` : item.name}
                  </span>
                  {item.isDefault && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                      Default
                    </Badge>
                  )}
                  {item.isMuted && (
                    <BellOff className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                {item.lastMessage && (
                  <p className="text-xs text-muted-foreground truncate">
                    {item.lastMessage}
                  </p>
                )}
              </div>

              {/* Unread badge */}
              {item.unreadCount && item.unreadCount > 0 && (
                <Badge className="h-5 min-w-5 flex items-center justify-center rounded-full text-[10px] px-1.5">
                  {item.unreadCount > 99 ? "99+" : item.unreadCount}
                </Badge>
              )}
            </button>
          </ContextMenuTrigger>
          
          <ContextMenuContent className="w-56">
            {/* Mark as Read */}
            {item.unreadCount && item.unreadCount > 0 ? (
              <ContextMenuItem 
                onClick={() => onMarkAsRead?.(item)}
                className="cursor-pointer"
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark as Read
              </ContextMenuItem>
            ) : (
              <ContextMenuItem 
                onClick={() => onMarkAsRead?.(item)}
                className="cursor-pointer"
                disabled
              >
                <Eye className="mr-2 h-4 w-4" />
                Mark as Unread
              </ContextMenuItem>
            )}

            {/* Mute/Unmute */}
            <ContextMenuItem 
              onClick={() => onMuteToggle?.(item)}
              className="cursor-pointer"
            >
              {item.isMuted ? (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  Unmute Notifications
                </>
              ) : (
                <>
                  <BellOff className="mr-2 h-4 w-4" />
                  Mute Notifications
                </>
              )}
            </ContextMenuItem>

            <ContextMenuSeparator />

            {/* Leave - only for DMs, groups, and non-default channels */}
            {(item.type === "dm" || item.type === "group" || (item.type === "channel" && !item.isDefault)) && (
              <ContextMenuItem 
                onClick={() => onLeave?.(item)}
                className="cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {item.type === "channel" ? "Leave Channel" : "Leave Conversation"}
              </ContextMenuItem>
            )}

            {/* Delete - only for DMs and groups (not channels) */}
            {(item.type === "dm" || item.type === "group") && (
              <ContextMenuItem 
                onClick={() => onDelete?.(item)}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Conversation
              </ContextMenuItem>
            )}
          </ContextMenuContent>
        </ContextMenu>
      ))}
    </div>
  );
}
