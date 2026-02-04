"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Hash, 
  Lock, 
  Megaphone, 
  MessageCircle, 
  Users, 
  Settings,
  Bell,
  BellOff,
  LogOut,
  Info,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Channel, Conversation } from "@/hooks/swr/useMessaging";
import { format } from "date-fns";

interface ConversationSettingsProps {
  channel?: Channel | null;
  conversation?: Conversation | null;
  children?: React.ReactNode;
}

export function ConversationSettings({ 
  channel, 
  conversation, 
  children 
}: ConversationSettingsProps) {
  const [open, setOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Don't render if nothing is selected
  if (!channel && !conversation) {
    return children || null;
  }

  const getChannelTypeIcon = (channelType: string) => {
    switch (channelType) {
      case "PRIVATE":
        return <Lock className="h-5 w-5" />;
      case "ANNOUNCEMENT":
        return <Megaphone className="h-5 w-5" />;
      default:
        return <Hash className="h-5 w-5" />;
    }
  };

  const getConversationIcon = () => {
    if (conversation?.type === "entity") {
      return <Users className="h-5 w-5" />;
    }
    if (conversation?.isGroup) {
      return <Users className="h-5 w-5" />;
    }
    return <MessageCircle className="h-5 w-5" />;
  };

  const handleToggleMute = () => {
    // TODO: Implement mute functionality with API
    setIsMuted(!isMuted);
  };

  const handleLeaveChannel = () => {
    // TODO: Implement leave channel functionality with API
    console.log("Leave channel:", channel?.id);
    setOpen(false);
  };

  const handleLeaveConversation = () => {
    // TODO: Implement leave conversation functionality with API
    console.log("Leave conversation:", conversation?.id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {channel ? getChannelTypeIcon(channel.channelType) : getConversationIcon()}
            <span>
              {channel ? `#${channel.name}` : (conversation?.name || "Direct Message")}
            </span>
          </DialogTitle>
          {channel?.description && (
            <DialogDescription>{channel.description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Info section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>Details</span>
            </div>
            
            {channel && (
              <div className="space-y-2 pl-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="secondary" className="capitalize">
                    {channel.channelType.toLowerCase()}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Members</span>
                  <span>{channel.memberCount || 0}</span>
                </div>
                {channel.isDefault && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Default channel</span>
                    <Badge variant="outline">Yes</Badge>
                  </div>
                )}
              </div>
            )}

            {conversation && (
              <div className="space-y-2 pl-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="secondary" className="capitalize">
                    {conversation.type === "dm" ? "Direct Message" : 
                     conversation.type === "entity" ? "CRM Linked" : "Group"}
                  </Badge>
                </div>
                {conversation.participants && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Participants</span>
                    <span>{conversation.participants.length}</span>
                  </div>
                )}
                {conversation.entity && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Linked to</span>
                    <Badge variant="outline" className="capitalize">
                      {conversation.entity.type}
                    </Badge>
                  </div>
                )}
                {conversation.lastMessage && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last activity</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(conversation.lastMessage.createdAt), "MMM d, yyyy")}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Notification settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </div>
            
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2 pl-6",
                isMuted && "text-muted-foreground"
              )}
              onClick={handleToggleMute}
            >
              {isMuted ? (
                <>
                  <BellOff className="h-4 w-4" />
                  Unmute notifications
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" />
                  Mute notifications
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-1">
            {channel && !channel.isDefault && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLeaveChannel}
              >
                <LogOut className="h-4 w-4" />
                Leave channel
              </Button>
            )}
            
            {conversation && conversation.type !== "entity" && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLeaveConversation}
              >
                <LogOut className="h-4 w-4" />
                Leave conversation
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
