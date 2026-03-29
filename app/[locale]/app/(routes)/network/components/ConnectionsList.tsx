"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  User,
  MoreHorizontal,
  UserMinus,
  ExternalLink,
  Share2,
  Loader2,
  Users,
  X,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { useRemoveConnection } from "@/hooks/swr";
import { startDirectMessage } from "@/actions/messaging/direct-messages";
import { usePresence, toPresenceBorder } from "@/hooks/use-presence";

interface AgentProfileData {
  slug: string;
  bio: string | null;
  specializations: string[];
  visibility: "PRIVATE" | "SECURE" | "PUBLIC";
}

interface ConnectionUser {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  AgentProfile?: AgentProfileData | null;
}

export interface ConnectionItem {
  id: string;
  status: string;
  createdAt: Date;
  isIncoming?: boolean;
  user: ConnectionUser | null;
}

interface ConnectionsListProps {
  connections: ConnectionItem[];
  showAsSent?: boolean;
  translations: Record<string, Record<string, string>>;
}

function ConnectionListItem({
  connection,
  showAsSent,
  translations: t,
}: {
  connection: ConnectionItem;
  showAsSent: boolean;
  translations: Record<string, Record<string, string>>;
}) {
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;
  const { toast } = useAppToast();
  const { removeConnection, isRemoving } = useRemoveConnection(connection.id);
  const [isStartingMessage, setIsStartingMessage] = useState(false);
  const { getUserStatus } = usePresence();

  const user = connection.user;
  if (!user) return null;

  const handleMessage = async () => {
    try {
      setIsStartingMessage(true);
      const result = await startDirectMessage(user.id);
      if (result.success && result.conversationId) {
        router.push(`/${locale}/app/messages?conversationId=${result.conversationId}`);
      } else {
        toast.error(t.toast.error, { description: result.error || "Failed to start conversation", isTranslationKey: false });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to start conversation";
      toast.error(t.toast.error, { description: message, isTranslationKey: false });
    } finally {
      setIsStartingMessage(false);
    }
  };

  const handleRemove = async () => {
    try {
      await removeConnection();
      toast.success(showAsSent ? t.toast.requestCancelled : t.toast.connectionRemoved, { isTranslationKey: false });
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.toast.removeError;
      toast.error(t.toast.error, { description: message, isTranslationKey: false });
    }
  };

  const agentProfile = user.AgentProfile;

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-4">
        <Avatar className={`h-12 w-12 border-2 transition-colors ${toPresenceBorder(getUserStatus(user.id))}`}>
          <AvatarImage src={user.avatar || ""} alt={user.name || ""} />
          <AvatarFallback className="bg-primary/10">
            {user.name?.charAt(0) || <User className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
        <div>
          <h4 className="font-medium">{user.name}</h4>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          {agentProfile?.specializations && agentProfile.specializations.length > 0 && (
            <div className="flex gap-1 mt-1">
              {agentProfile.specializations.slice(0, 2).map((spec) => (
                <Badge key={spec} variant="secondary" className="text-xs">
                  {spec}
                </Badge>
              ))}
              {agentProfile.specializations.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{agentProfile.specializations.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {showAsSent && (
          <Badge variant="secondary" className="text-xs">
            {t.badges.pending}
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={isRemoving || isStartingMessage} aria-label="Actions">
              {isRemoving || isStartingMessage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {agentProfile?.visibility !== "PRIVATE" && agentProfile?.slug && (
              <DropdownMenuItem asChild>
                <Link href={`/agent/${agentProfile.slug}`}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {t.actions.viewProfile}
                </Link>
              </DropdownMenuItem>
            )}
            {!showAsSent && (
              <DropdownMenuItem onClick={handleMessage} disabled={isStartingMessage}>
                <MessageCircle className="h-4 w-4 mr-2" />
                {t.actions?.message || "Message"}
              </DropdownMenuItem>
            )}
            {!showAsSent && (
              <DropdownMenuItem disabled>
                <Share2 className="h-4 w-4 mr-2" />
                {t.actions.shareEntity}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleRemove}
            >
              {showAsSent ? (
                <>
                  <X className="h-4 w-4 mr-2" />
                  {t.actions.cancelRequest}
                </>
              ) : (
                <>
                  <UserMinus className="h-4 w-4 mr-2" />
                  {t.actions.removeConnection}
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function ConnectionsList({
  connections,
  showAsSent = false,
  translations: t,
}: ConnectionsListProps) {
  if (connections.length === 0) {
    return (
      <div className="py-12 text-center">
        <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" aria-hidden />
        <p className="text-muted-foreground">
          {showAsSent ? t.connectionsList.sentEmpty : t.connectionsList.empty}
        </p>
        {!showAsSent && (
          <p className="text-sm text-muted-foreground mt-2">
            {t.connectionsList.emptyHint}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {connections.map((connection) => (
        <ConnectionListItem
          key={connection.id}
          connection={connection}
          showAsSent={showAsSent}
          translations={t}
        />
      ))}
    </div>
  );
}
