"use client";

import { useRouter, useParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppToast } from "@/hooks/use-app-toast";
import { User, Check, X, Loader2, Clock, ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useRespondToConnection } from "@/hooks/swr";

interface AgentProfileData {
  slug: string;
  bio: string | null;
  specializations: string[];
  visibility: "PERSONAL" | "SECURE" | "PUBLIC";
}

interface PendingRequestUser {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  AgentProfile?: AgentProfileData | null;
}

export interface PendingRequestItem {
  id: string;
  createdAt: Date;
  user: PendingRequestUser | null;
}

interface PendingRequestsListProps {
  requests: PendingRequestItem[];
  translations: Record<string, Record<string, string>>;
}

function PendingItem({
  request,
  translations: t,
  dateLocale,
}: {
  request: PendingRequestItem;
  translations: Record<string, Record<string, string>>;
  dateLocale: typeof el | typeof enUS;
}) {
  const router = useRouter();
  const { toast } = useAppToast();
  const { acceptConnection, rejectConnection, isResponding } = useRespondToConnection(request.id);

  const user = request.user;
  if (!user) return null;

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

  const agentProfile = user.AgentProfile;

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.avatar || ""} alt={user.name || ""} />
          <AvatarFallback className="bg-warning/15 text-warning">
            {user.name?.charAt(0) || <User className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{user.name}</h4>
            {agentProfile?.visibility !== "PERSONAL" && agentProfile?.slug && (
              <Link
                href={`/agent/${agentProfile.slug}`}
                className="text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-3 w-3" aria-hidden />
              </Link>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {t.pendingList.sentAgo.replace(
              "{time}",
              formatDistanceToNow(new Date(request.createdAt), { locale: dateLocale })
            )}
          </p>
          {agentProfile?.specializations && agentProfile.specializations.length > 0 && (
            <div className="flex gap-1 mt-2">
              {agentProfile.specializations.slice(0, 3).map((spec) => (
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
          {t.actions.decline}
        </Button>
        <Button
          size="sm"
          leftIcon={isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          onClick={handleAccept}
          disabled={isResponding}
        >
          {t.actions.accept}
        </Button>
      </div>
    </div>
  );
}

export function PendingRequestsList({ requests, translations: t }: PendingRequestsListProps) {
  const params = useParams();
  const locale = params.locale as string;
  const dateLocale = locale === "el" ? el : enUS;

  if (requests.length === 0) {
    return (
      <div className="py-12 text-center">
        <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" aria-hidden />
        <p className="text-muted-foreground">{t.pendingList.empty}</p>
        <p className="text-sm text-muted-foreground mt-2">
          {t.pendingList.emptyHint}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((request) => (
        <PendingItem
          key={request.id}
          request={request}
          translations={t}
          dateLocale={dateLocale}
        />
      ))}
    </div>
  );
}
