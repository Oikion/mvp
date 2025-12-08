"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import {
  User,
  MoreHorizontal,
  UserMinus,
  ExternalLink,
  Share2,
  Loader2,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRemoveConnection } from "@/hooks/swr";

interface Connection {
  id: string;
  status: string;
  createdAt: Date;
  isIncoming?: boolean;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
    agentProfile?: {
      slug: string;
      bio: string | null;
      specializations: string[];
      visibility: "PERSONAL" | "SECURE" | "PUBLIC";
    } | null;
  };
}

interface ConnectionsListProps {
  connections: Connection[];
  showAsSent?: boolean;
  translations: Record<string, Record<string, string>>;
}

function ConnectionItem({
  connection,
  showAsSent,
  translations: t,
}: {
  connection: Connection;
  showAsSent: boolean;
  translations: Record<string, Record<string, string>>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { removeConnection, isRemoving } = useRemoveConnection(connection.id);

  const handleRemove = async () => {
    try {
      await removeConnection();
      toast({
        variant: "success",
        title: showAsSent ? t.toast.requestCancelled : t.toast.connectionRemoved,
        description: showAsSent
          ? t.toast.requestCancelledDesc
          : t.toast.connectionRemovedDesc,
      });
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.toast.removeError;
      toast({
        variant: "destructive",
        title: t.toast.error,
        description: message,
      });
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage
            src={connection.user.avatar || ""}
            alt={connection.user.name || ""}
          />
          <AvatarFallback className="bg-primary/10">
            {connection.user.name?.charAt(0) || <User className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
        <div>
          <h4 className="font-medium">{connection.user.name}</h4>
          <p className="text-sm text-muted-foreground">
            {connection.user.email}
          </p>
          {connection.user.agentProfile?.specializations &&
            connection.user.agentProfile.specializations.length > 0 && (
              <div className="flex gap-1 mt-1">
                {connection.user.agentProfile.specializations
                  .slice(0, 2)
                  .map((spec) => (
                    <Badge key={spec} variant="secondary" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                {connection.user.agentProfile.specializations.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{connection.user.agentProfile.specializations.length - 2}
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
            <Button variant="ghost" size="icon" disabled={isRemoving}>
              {isRemoving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {connection.user.agentProfile?.visibility !== "PERSONAL" &&
              connection.user.agentProfile?.slug && (
                <DropdownMenuItem asChild>
                  <Link href={`/agent/${connection.user.agentProfile.slug}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t.actions.viewProfile}
                  </Link>
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
        <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">
          {showAsSent
            ? t.connectionsList.sentEmpty
            : t.connectionsList.empty}
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
        <ConnectionItem
          key={connection.id}
          connection={connection}
          showAsSent={showAsSent}
          translations={t}
        />
      ))}
    </div>
  );
}
