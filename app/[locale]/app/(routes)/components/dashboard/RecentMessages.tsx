"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowRight,
  MessageSquare,
  Users,
  Hash,
} from "lucide-react";
import moment from "moment";

export interface Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  type: "dm" | "group" | "entity";
  entity?: {
    type: string;
    id: string;
  };
  participants: Array<{
    userId: string;
    name?: string | null;
    avatar?: string | null;
  }>;
  lastMessage?: {
    content: string;
    senderId: string;
    createdAt: Date;
  };
  unreadCount: number;
  isMuted: boolean;
}

interface RecentMessagesProps {
  conversations: Conversation[];
  currentUserId: string;
}

export const RecentMessages: React.FC<RecentMessagesProps> = ({
  conversations,
  currentUserId,
}) => {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  // Sort by unread first, then by last message time
  const sortedConversations = [...conversations].sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    
    const aTime = a.lastMessage?.createdAt
      ? new Date(a.lastMessage.createdAt).getTime()
      : 0;
    const bTime = b.lastMessage?.createdAt
      ? new Date(b.lastMessage.createdAt).getTime()
      : 0;
    return bTime - aTime;
  });

  const getConversationIcon = (conv: Conversation) => {
    if (conv.type === "entity") {
      return <Hash className="h-4 w-4" />;
    }
    if (conv.isGroup) {
      return <Users className="h-4 w-4" />;
    }
    return null;
  };

  const getConversationName = (conv: Conversation): string => {
    if (conv.name) return conv.name;
    
    // For DMs, show the other participant's name
    if (!conv.isGroup && conv.participants.length > 0) {
      const otherParticipant = conv.participants.find(
        (p) => p.userId !== currentUserId
      );
      return otherParticipant?.name || t("unknownUser");
    }
    
    return t("unknownConversation");
  };

  const getAvatar = (conv: Conversation) => {
    if (conv.isGroup || conv.type === "entity") {
      return (
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          {getConversationIcon(conv)}
        </div>
      );
    }
    
    const otherParticipant = conv.participants.find(
      (p) => p.userId !== currentUserId
    );
    
    return (
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={otherParticipant?.avatar || undefined} />
        <AvatarFallback className="text-xs">
          {otherParticipant?.name?.charAt(0) || "?"}
        </AvatarFallback>
      </Avatar>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">{t("recentMessages")}</CardTitle>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/app/messages`} className="flex items-center gap-1">
            {tCommon("viewAll")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {sortedConversations.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            {t("noRecentMessages")}
          </div>
        ) : (
          <ScrollArea className="h-full max-h-[320px]">
            <div className="space-y-2 pr-4">
              {sortedConversations.slice(0, 5).map((conv) => (
                <Link
                  key={conv.id}
                  href={`/${locale}/app/messages?conversation=${conv.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 -mx-2 hover:bg-muted/50 transition-colors"
                >
                  {getAvatar(conv)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {getConversationName(conv)}
                      </p>
                      {conv.unreadCount > 0 && (
                        <Badge variant="default" className="h-5 min-w-5 px-1.5 shrink-0">
                          {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.lastMessage.senderId === currentUserId ? (
                          <span className="text-muted-foreground/70">
                            {t("you")}:{" "}
                          </span>
                        ) : null}
                        {conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {moment(conv.lastMessage.createdAt).fromNow(true)}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
