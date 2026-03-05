"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  User,
  Check,
  X,
  Loader2,
  Clock,
  ExternalLink,
  UserPlus,
  MoreHorizontal,
  Users,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useRespondToConnection, useRemoveConnection } from "@/hooks/swr";

interface PendingRequest {
  id: string;
  createdAt: Date;
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

interface SentRequest {
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

interface PendingRequestsTabProps {
  pendingReceived: PendingRequest[];
  pendingSent: any[];
  translations: Record<string, any>;
  locale: string;
}

function ReceivedRequestItem({
  request,
  translations: t,
  dateLocale,
}: {
  request: PendingRequest;
  translations: Record<string, any>;
  dateLocale: typeof el | typeof enUS;
}) {
  const router = useRouter();
  const { toast } = useAppToast();
  const { acceptConnection, rejectConnection, isResponding } = useRespondToConnection(request.id);

  const handleAccept = async () => {
    try {
      await acceptConnection();
      toast.success(t.toast.connectionAccepted, { description: t.toast.connectionAcceptedDesc, isTranslationKey: false });
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.toast.respondError;
      toast.error(t.toast.error, { description: message, isTranslationKey: false });
    }
  };

  const handleReject = async () => {
    try {
      await rejectConnection();
      toast.success(t.toast.requestDeclined, { description: t.toast.requestDeclinedDesc, isTranslationKey: false });
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.toast.respondError;
      toast.error(t.toast.error, { description: message, isTranslationKey: false });
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage
            src={request.user.avatar || ""}
            alt={request.user.name || ""}
          />
          <AvatarFallback className="bg-warning/15 text-warning dark:text-orange-400">
            {request.user.name?.charAt(0) || <User className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{request.user.name}</h4>
            {request.user.agentProfile?.visibility !== "PERSONAL" &&
              request.user.agentProfile?.slug && (
                <Link
                  href={`/agent/${request.user.agentProfile.slug}`}
                  className="text-muted-foreground hover:text-primary"
                >
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
          </div>
          <p className="text-sm text-muted-foreground">
            {request.user.email}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {(t.pendingList?.sentAgo || "Sent {time} ago").replace(
              "{time}",
              formatDistanceToNow(new Date(request.createdAt), { locale: dateLocale })
            )}
          </p>
          {request.user.agentProfile?.specializations &&
            request.user.agentProfile.specializations.length > 0 && (
              <div className="flex gap-1 mt-2">
                {request.user.agentProfile.specializations
                  .slice(0, 3)
                  .map((spec) => (
                    <Badge key={spec} variant="outline" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
              </div>
            )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          leftIcon={isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          onClick={handleReject}
          disabled={isResponding}
        >
          {t.actions?.decline || "Decline"}
        </Button>
        <Button
          size="sm"
          leftIcon={isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          onClick={handleAccept}
          disabled={isResponding}
        >
          {t.actions?.accept || "Accept"}
        </Button>
      </div>
    </div>
  );
}

function SentRequestItem({
  connection,
  translations: t,
}: {
  connection: SentRequest;
  translations: Record<string, any>;
}) {
  const router = useRouter();
  const { toast } = useAppToast();
  const { removeConnection, isRemoving } = useRemoveConnection(connection.id);

  const handleCancel = async () => {
    try {
      await removeConnection();
      toast.success(t.toast?.requestCancelled || "Request Cancelled", { isTranslationKey: false });
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.toast?.removeError || "Failed to cancel request";
      toast.error(t.toast?.error || "Error", { description: message, isTranslationKey: false });
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
        <Badge variant="secondary" className="text-xs">
          {t.badges?.pending || "Pending"}
        </Badge>
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
                    {t.actions?.viewProfile || "View Profile"}
                  </Link>
                </DropdownMenuItem>
              )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleCancel}
            >
              <X className="h-4 w-4 mr-2" />
              {t.actions?.cancelRequest || "Cancel Request"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function PendingRequestsTab({
  pendingReceived,
  pendingSent,
  translations: t,
  locale,
}: PendingRequestsTabProps) {
  const dateLocale = locale === "el" ? el : enUS;

  // Map sent requests to the right shape
  const sentConnections: SentRequest[] = pendingSent.map((r) => ({
    ...r,
    status: "PENDING",
    isIncoming: false,
  }));

  return (
    <div className="space-y-6">
      {/* Received Requests Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            {t.pendingRequests?.title || "Received Requests"}
            {pendingReceived.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingReceived.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {t.pendingRequests?.description || "Connection requests waiting for your response"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingReceived.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">
                {t.pendingList?.empty || "No pending requests"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t.pendingList?.emptyHint || "When someone sends you a connection request, it will appear here."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingReceived.map((request) => (
                <ReceivedRequestItem
                  key={request.id}
                  request={request}
                  translations={t}
                  dateLocale={dateLocale}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sent Requests Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            {t.sentRequests?.title || "Sent Requests"}
            {sentConnections.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {sentConnections.length}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {t.sentRequests?.description || "Connection requests you've sent that are awaiting response"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sentConnections.length === 0 ? (
            <div className="py-8 text-center">
              <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm">
                {t.connectionsList?.sentEmpty || "You haven't sent any connection requests."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sentConnections.map((connection) => (
                <SentRequestItem
                  key={connection.id}
                  connection={connection}
                  translations={t}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
