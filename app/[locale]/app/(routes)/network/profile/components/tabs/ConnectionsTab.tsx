"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  MoreHorizontal,
  UserMinus,
  ExternalLink,
  Share2,
  Loader2,
  Users,
  MessageCircle,
  Clock,
  UserPlus,
  Check,
  X,
  Search,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { useRemoveConnection, useRespondToConnection, useSendConnectionRequest } from "@/hooks/swr";
import { startDirectMessage } from "@/actions/messaging/direct-messages";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { el, enUS } from "date-fns/locale";
import useDebounce from "@/hooks/useDebounce";
import axios from "axios";
import { Link as NavLink } from "@/navigation";

// ─── Types ──────────────────────────────────────────────────────────

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
      visibility: "PRIVATE" | "SECURE" | "PUBLIC";
    } | null;
  };
}

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
      visibility: "PRIVATE" | "SECURE" | "PUBLIC";
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
      visibility: "PRIVATE" | "SECURE" | "PUBLIC";
    } | null;
  };
}

interface Agent {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
  agentProfile?: {
    slug: string;
    bio: string | null;
    specializations: string[];
    serviceAreas: string[];
    visibility: "PRIVATE" | "SECURE" | "PUBLIC";
  } | null;
  _count: {
    properties: number;
  };
  connectionStatus: {
    status: string;
    connectionId?: string;
    isIncoming?: boolean;
  };
}

type Section = "connections" | "requests" | "find";

interface ConnectionsTabProps {
  connections: Connection[];
  pendingReceived: PendingRequest[];
  pendingSent: any[];
  translations: Record<string, any>;
  locale: string;
}

// ─── Connection Item ────────────────────────────────────────────────

function ConnectionItem({
  connection,
  translations: t,
  locale,
}: {
  connection: Connection;
  translations: Record<string, any>;
  locale: string;
}) {
  const router = useRouter();
  const { toast } = useAppToast();
  const tn = useTranslations("network");
  const { removeConnection, isRemoving } = useRemoveConnection(connection.id);
  const [isStartingMessage, setIsStartingMessage] = useState(false);

  const handleMessage = async () => {
    try {
      setIsStartingMessage(true);
      const result = await startDirectMessage(connection.user?.id ?? "");
      if (result.success && result.conversationId) {
        router.push(`/${locale}/app/network/messages?conversationId=${result.conversationId}`);
      } else {
        toast.error(t.toast.error, { description: result.error || tn("connectionToast.startConversationFailed"), isTranslationKey: false });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : tn("connectionToast.startConversationFailed");
      toast.error(t.toast.error, { description: message, isTranslationKey: false });
    } finally {
      setIsStartingMessage(false);
    }
  };

  const handleRemove = async () => {
    try {
      await removeConnection();
      toast.success(t.toast.connectionRemoved, { isTranslationKey: false });
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.toast.removeError;
      toast.error(t.toast.error, { description: message, isTranslationKey: false });
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage
            src={connection.user?.avatar || ""}
            alt={connection.user?.name || ""}
          />
          <AvatarFallback className="bg-primary/10">
            {connection.user?.name?.charAt(0) || <User className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
        <div>
          <h4 className="font-medium">{connection.user?.name ?? tn("connectionLabels.deletedUser")}</h4>
          <p className="text-sm text-muted-foreground">
            {connection.user?.email ?? ""}
          </p>
          {connection.user?.agentProfile?.specializations &&
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={tn("connectionLabels.options")} disabled={isRemoving || isStartingMessage}>
              {isRemoving || isStartingMessage ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {connection.user?.agentProfile?.visibility !== "PRIVATE" &&
              connection.user?.agentProfile?.slug && (
                <DropdownMenuItem asChild>
                  <Link href={`/agent/${connection.user.agentProfile.slug}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t.actions.viewProfile}
                  </Link>
                </DropdownMenuItem>
              )}
            <DropdownMenuItem onClick={handleMessage} disabled={isStartingMessage}>
              <MessageCircle className="h-4 w-4 mr-2" />
              {t.actions?.message || tn("connectionLabels.message")}
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Share2 className="h-4 w-4 mr-2" />
              {t.actions.shareEntity}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleRemove}
            >
              <UserMinus className="h-4 w-4 mr-2" />
              {t.actions.removeConnection}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Received Request Item ──────────────────────────────────────────

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
  const tn = useTranslations("network");
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
            src={request.user?.avatar || ""}
            alt={request.user?.name || ""}
          />
          <AvatarFallback className="bg-warning/15 text-warning dark:text-orange-400">
            {request.user?.name?.charAt(0) || <User className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{request.user?.name ?? tn("connectionLabels.deletedUser")}</h4>
            {request.user?.agentProfile?.visibility !== "PRIVATE" &&
              request.user?.agentProfile?.slug && (
                <Link
                  href={`/agent/${request.user.agentProfile.slug}`}
                  className="text-muted-foreground hover:text-primary"
                >
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
          </div>
          <p className="text-sm text-muted-foreground">
            {request.user?.email ?? ""}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t.pendingList?.sentAgo
              ? t.pendingList.sentAgo.replace(
                  "{time}",
                  formatDistanceToNow(new Date(request.createdAt), { locale: dateLocale })
                )
              : tn("connectionLabels.sentAgo", {
                  time: formatDistanceToNow(new Date(request.createdAt), { locale: dateLocale }),
                })}
          </p>
          {request.user?.agentProfile?.specializations &&
            request.user?.agentProfile.specializations.length > 0 && (
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
          {t.actions?.decline || tn("connectionLabels.decline")}
        </Button>
        <Button
          size="sm"
          leftIcon={isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          onClick={handleAccept}
          disabled={isResponding}
        >
          {t.actions?.accept || tn("connectionLabels.accept")}
        </Button>
      </div>
    </div>
  );
}

// ─── Sent Request Item ──────────────────────────────────────────────

function SentRequestItem({
  connection,
  translations: t,
}: {
  connection: SentRequest;
  translations: Record<string, any>;
}) {
  const router = useRouter();
  const { toast } = useAppToast();
  const tn = useTranslations("network");
  const { removeConnection, isRemoving } = useRemoveConnection(connection.id);

  const handleCancel = async () => {
    try {
      await removeConnection();
      toast.success(t.toast?.requestCancelled || tn("connectionToast.requestCancelled"), { isTranslationKey: false });
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.toast?.removeError || tn("connectionToast.cancelRequestFailed");
      toast.error(t.toast?.error || tn("connectionToast.error"), { description: message, isTranslationKey: false });
    }
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage
            src={connection.user?.avatar || ""}
            alt={connection.user?.name || ""}
          />
          <AvatarFallback className="bg-primary/10">
            {connection.user?.name?.charAt(0) || <User className="h-5 w-5" />}
          </AvatarFallback>
        </Avatar>
        <div>
          <h4 className="font-medium">{connection.user?.name ?? tn("connectionLabels.deletedUser")}</h4>
          <p className="text-sm text-muted-foreground">
            {connection.user?.email ?? ""}
          </p>
          {connection.user?.agentProfile?.specializations &&
            connection.user?.agentProfile.specializations.length > 0 && (
              <div className="flex gap-1 mt-1">
                {connection.user.agentProfile.specializations
                  .slice(0, 2)
                  .map((spec) => (
                    <Badge key={spec} variant="secondary" className="text-xs">
                      {spec}
                    </Badge>
                  ))}
                {connection.user?.agentProfile?.specializations && connection.user.agentProfile.specializations.length > 2 && (
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
          {t.badges?.pending || tn("connectionLabels.pending")}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={tn("connectionLabels.options")} disabled={isRemoving}>
              {isRemoving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {connection.user?.agentProfile?.visibility !== "PRIVATE" &&
              connection.user?.agentProfile?.slug && (
                <DropdownMenuItem asChild>
                  <Link href={`/agent/${connection.user.agentProfile.slug}`}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t.actions?.viewProfile || tn("connectionLabels.viewProfile")}
                  </Link>
                </DropdownMenuItem>
              )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleCancel}
            >
              <X className="h-4 w-4 mr-2" />
              {t.actions?.cancelRequest || tn("connectionLabels.cancelRequest")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Find Agents Section ────────────────────────────────────────────

function FindAgentsSection({ translations: t }: { translations: Record<string, any> }) {
  const [query, setQuery] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const debouncedQuery = useDebounce(query, 300);
  const router = useRouter();
  const { toast } = useAppToast();
  const tn = useTranslations("network");
  const { sendRequest, isSending } = useSendConnectionRequest();

  useEffect(() => {
    const searchAgents = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          `/api/connections/search?q=${encodeURIComponent(debouncedQuery)}`
        );
        setAgents(response.data);
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    searchAgents();
  }, [debouncedQuery]);

  const handleConnect = async (agentId: string) => {
    try {
      setConnectingId(agentId);
      await sendRequest(agentId);
      toast.success(t.toast?.requestSent || tn("connectionToast.requestSent"), { description: t.toast?.requestSentDesc || tn("connectionToast.requestSentDesc"), isTranslationKey: false });
      const response = await axios.get(
        `/api/connections/search?q=${encodeURIComponent(debouncedQuery)}`
      );
      setAgents(response.data);
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : (t.toast?.sendError || tn("connectionToast.sendRequestFailed"));
      toast.error(t.toast?.error || tn("connectionToast.error"), { description: message, isTranslationKey: false });
    } finally {
      setConnectingId(null);
    }
  };

  const getStatusButton = (agent: Agent) => {
    const { status, isIncoming } = agent.connectionStatus;

    if (connectingId === agent.id || (isSending && connectingId === agent.id)) {
      return (
        <Button size="sm" disabled aria-label={tn("connectionLabels.loading")}>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        </Button>
      );
    }

    switch (status) {
      case "ACCEPTED":
        return (
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Check className="h-4 w-4" />}
            disabled
          >
            {t.actions?.connected || tn("connectionLabels.connected")}
          </Button>
        );
      case "PENDING":
        if (isIncoming) {
          return (
            <Button size="sm" variant="outline" asChild>
              <NavLink href="/app/network/profile?tab=connections">
                <Clock className="h-4 w-4 mr-1" />
                {t.actions?.respond || tn("connectionLabels.respond")}
              </NavLink>
            </Button>
          );
        }
        return (
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Clock className="h-4 w-4" />}
            disabled
          >
            {t.actions?.pending || tn("connectionLabels.pending")}
          </Button>
        );
      default:
        return (
          <Button
            size="sm"
            leftIcon={<UserPlus className="h-4 w-4" />}
            onClick={() => handleConnect(agent.id)}
          >
            {t.actions?.connect || tn("connectionLabels.connect")}
          </Button>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search?.placeholder || tn("connectionLabels.searchPlaceholder")}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="py-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">{t.search?.searching || tn("connectionLabels.searching")}</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="py-12 text-center">
          <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            {t.search?.noResults || tn("connectionLabels.noSearchResults")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={agent.avatar || ""} alt={agent.name || ""} />
                  <AvatarFallback className="bg-primary/10">
                    {agent.name?.charAt(0) || <User className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{agent.name || tn("connectionLabels.unknownUser")}</h4>
                    {agent.agentProfile?.visibility !== "PRIVATE" &&
                      agent.agentProfile?.slug && (
                        <NavLink
                          href={`/agent/${agent.agentProfile.slug}`}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </NavLink>
                      )}
                  </div>
                  <p className="text-sm text-muted-foreground">{agent.email}</p>
                  <div className="flex items-center gap-3 mt-1">
                    {agent._count.properties > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {agent._count.properties} {t.search?.properties || tn("connectionLabels.properties")}
                      </span>
                    )}
                  </div>
                  {agent.agentProfile?.specializations &&
                    agent.agentProfile.specializations.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {agent.agentProfile.specializations.slice(0, 3).map((spec) => (
                          <Badge key={spec} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    )}
                </div>
              </div>

              {getStatusButton(agent)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section Navigation ─────────────────────────────────────────────

const SECTIONS = [
  { value: "connections", icon: Users, labelKey: "yourConnections.title", fallbackKey: "connectionLabels.myConnectionsSection" },
  { value: "requests", icon: Clock, labelKey: "pendingRequests.title", fallbackKey: "connectionLabels.requestsSection" },
  { value: "find", icon: Search, labelKey: "search.title", fallbackKey: "connectionLabels.findSection" },
] as const;

function getNestedTranslation(obj: Record<string, any>, path: string): string | undefined {
  const parts = path.split(".");
  let current: any = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return typeof current === "string" ? current : undefined;
}

// ─── Main Component ─────────────────────────────────────────────────

export function ConnectionsTab({
  connections,
  pendingReceived,
  pendingSent,
  translations: t,
  locale,
}: ConnectionsTabProps) {
  const tn = useTranslations("network");
  const pendingCount = pendingReceived.length + pendingSent.length;
  const [activeSection, setActiveSection] = useState<Section>(
    pendingCount > 0 ? "requests" : "connections"
  );
  const dateLocale = locale === "el" ? el : enUS;

  const sentConnections: SentRequest[] = pendingSent.map((r) => ({
    ...r,
    status: "PENDING",
    isIncoming: false,
  }));

  return (
    <div className="space-y-6">
      {/* Section Navigation */}
      <div className="flex gap-2 p-1 bg-muted/50 rounded-lg w-fit">
        {SECTIONS.map(({ value, icon: Icon, labelKey, fallbackKey }) => {
          const isActive = activeSection === value;
          const count =
            value === "connections" ? connections.length :
            value === "requests" ? pendingCount :
            undefined;

          return (
            <button
              key={value}
              onClick={() => setActiveSection(value)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }
              `}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{getNestedTranslation(t, labelKey) || tn(fallbackKey)}</span>
              {count != null && count > 0 && (
                <span className={`
                  ml-1 px-1.5 py-0.5 rounded-full text-xs
                  ${value === "requests" && !isActive
                    ? "bg-warning text-white"
                    : "bg-muted-foreground/15 text-muted-foreground"
                  }
                `}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Connections Section */}
      {activeSection === "connections" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t.yourConnections?.title || tn("connectionLabels.yourConnectionsTitle")}
            </CardTitle>
            <CardDescription>
              {t.yourConnections?.description || tn("connectionLabels.yourConnectionsDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connections.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {t.connectionsList?.empty || tn("connectionLabels.noConnections")}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t.connectionsList?.emptyHint || tn("connectionLabels.noConnectionsHint")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {connections.map((connection) => (
                  <ConnectionItem
                    key={connection.id}
                    connection={connection}
                    translations={t}
                    locale={locale}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Requests Section */}
      {activeSection === "requests" && (
        <div className="space-y-6">
          {/* Received Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                {t.pendingRequests?.title || tn("connectionLabels.receivedRequestsTitle")}
                {pendingReceived.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {pendingReceived.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {t.pendingRequests?.description || tn("connectionLabels.receivedRequestsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingReceived.length === 0 ? (
                <div className="py-8 text-center">
                  <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {t.pendingList?.empty || tn("connectionLabels.noPendingRequests")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.pendingList?.emptyHint || tn("connectionLabels.noPendingRequestsHint")}
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

          {/* Sent Requests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                {t.sentRequests?.title || tn("connectionLabels.sentRequestsTitle")}
                {sentConnections.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {sentConnections.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                {t.sentRequests?.description || tn("connectionLabels.sentRequestsDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sentConnections.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {t.connectionsList?.sentEmpty || tn("connectionLabels.noSentRequests")}
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
      )}

      {/* Find Agents Section */}
      {activeSection === "find" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              {t.search?.title || tn("connectionLabels.findTitle")}
            </CardTitle>
            <CardDescription>
              {t.search?.description || tn("connectionLabels.findDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FindAgentsSection translations={t} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
