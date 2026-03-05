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
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  UserPlus,
  UserMinus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Channel, Conversation } from "@/hooks/swr/useMessaging";
import { format } from "date-fns";
import { addGroupMember, removeGroupMember } from "@/actions/messaging/group-members";
import { useOrgUsers } from "@/hooks/swr/useOrgUsers";
import { useAppToast } from "@/hooks/use-app-toast";

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
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { users: orgUsers } = useOrgUsers();
  const { toast } = useAppToast();

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

          {/* Members section — group DMs only */}
          {conversation?.isGroup && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Members ({conversation.participants?.length ?? 0})</span>
              </div>

              {/* Current participants */}
              <div className="space-y-1 pl-6">
                {conversation.participants?.map((p) => {
                  const user = orgUsers?.find((u) => u.id === p.userId);
                  return (
                    <div key={p.userId} className="flex items-center gap-2 text-sm">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user?.avatar || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {(user?.name ?? "?").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{user?.name ?? p.userId}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        disabled={removingId === p.userId}
                        onClick={async () => {
                          setRemovingId(p.userId);
                          const result = await removeGroupMember(conversation.id, p.userId);
                          setRemovingId(null);
                          if (!result.success) {
                            toast.error(result.error ?? "Could not remove member", { isTranslationKey: false });
                          }
                        }}
                      >
                        <UserMinus className="h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {/* Add member search */}
              <div className="pl-6 space-y-1">
                <div className="relative">
                  <UserPlus className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Add a team member..."
                    value={addMemberSearch}
                    onChange={(e) => setAddMemberSearch(e.target.value)}
                    className="pl-7 h-7 text-sm"
                  />
                </div>
                {addMemberSearch.trim() &&
                  (() => {
                    const currentIds = new Set(
                      conversation.participants?.map((p) => p.userId) ?? []
                    );
                    const matches = (orgUsers ?? []).filter(
                      (u) =>
                        !currentIds.has(u.id) &&
                        (u.name
                          ?.toLowerCase()
                          .includes(addMemberSearch.toLowerCase()) ||
                          u.email
                            ?.toLowerCase()
                            .includes(addMemberSearch.toLowerCase()))
                    );
                    return matches.length > 0 ? (
                      <div className="rounded border bg-popover shadow-sm">
                        {matches.slice(0, 5).map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent text-left"
                            disabled={isAdding}
                            onClick={async () => {
                              setIsAdding(true);
                              const result = await addGroupMember(
                                conversation.id,
                                u.id
                              );
                              setIsAdding(false);
                              setAddMemberSearch("");
                              if (!result.success) {
                                toast.error(result.error ?? "Could not add member", { isTranslationKey: false });
                              }
                            }}
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px]">
                                {(u.name ?? "?").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{u.name ?? u.email}</span>
                          </button>
                        ))}
                      </div>
                    ) : null;
                  })()}
              </div>
            </div>
          )}

          {conversation?.isGroup && <Separator />}

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
