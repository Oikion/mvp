// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Building2, FileText, UserCheck, Clock, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { discoverAgents } from "@/actions/network/discover-agents";
import { discoverAgencies } from "@/actions/network/discover-agencies";
import { discoverPosts } from "@/actions/network/discover-posts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NetworkAgentCard } from "./NetworkAgentCard";
import { NetworkAgencyCard } from "./NetworkAgencyCard";
import { NetworkFeed } from "./NetworkFeed";
import { ConnectionsList } from "./ConnectionsList";
import { PendingRequestsList } from "./PendingRequestsList";
import type { ConnectionItem } from "./ConnectionsList";
import type { PendingRequestItem } from "./PendingRequestsList";

type TabValue = "agents" | "agencies" | "posts" | "connections" | "pending" | "sent";

interface NetworkPageClientProps {
  translations: Record<string, unknown>;
  connections: ConnectionItem[];
  pendingReceived: PendingRequestItem[];
  pendingSent: ConnectionItem[];
  pendingCount: number;
}

export function NetworkPageClient({
  translations: _t,
  connections,
  pendingReceived,
  pendingSent,
  pendingCount,
}: NetworkPageClientProps) {
  const t = useTranslations("network");
  const [activeTab, setActiveTab] = useState<TabValue>("agents");
  const [agentsQuery, setAgentsQuery] = useState("");
  const [agenciesQuery, setAgenciesQuery] = useState("");
  const [agents, setAgents] = useState<Awaited<ReturnType<typeof discoverAgents>>["agents"]>([]);
  const [agencies, setAgencies] = useState<Awaited<ReturnType<typeof discoverAgencies>>["agencies"]>([]);
  const [posts, setPosts] = useState<Awaited<ReturnType<typeof discoverPosts>>["posts"]>([]);
  const [agentsNextCursor, setAgentsNextCursor] = useState<string | null>(null);
  const [agenciesNextCursor, setAgenciesNextCursor] = useState<string | null>(null);
  const [postsNextCursor, setPostsNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadAgents = useCallback(
    async (cursor?: string | null, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      const result = await discoverAgents({
        query: agentsQuery || undefined,
        cursor: cursor ?? null,
        limit: 20,
      });
      if (append) {
        setAgents((prev) => [...prev, ...result.agents]);
      } else {
        setAgents(result.agents);
      }
      setAgentsNextCursor(result.nextCursor);
      setLoading(false);
      setLoadingMore(false);
    },
    [agentsQuery]
  );

  const loadAgencies = useCallback(
    async (cursor?: string | null, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      const result = await discoverAgencies({
        query: agenciesQuery || undefined,
        cursor: cursor ?? null,
        limit: 20,
      });
      if (append) {
        setAgencies((prev) => [...prev, ...result.agencies]);
      } else {
        setAgencies(result.agencies);
      }
      setAgenciesNextCursor(result.nextCursor);
      setLoading(false);
      setLoadingMore(false);
    },
    [agenciesQuery]
  );

  const loadPosts = useCallback(async (cursor?: string | null, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    const result = await discoverPosts({ cursor: cursor ?? null, limit: 20 });
    if (append) {
      setPosts((prev) => [...prev, ...result.posts]);
    } else {
      setPosts(result.posts);
    }
    setPostsNextCursor(result.nextCursor);
    setLoading(false);
    setLoadingMore(false);
  }, []);

  useEffect(() => {
    if (activeTab === "agents") loadAgents();
    else if (activeTab === "agencies") loadAgencies();
    else if (activeTab === "posts") loadPosts();
  }, [activeTab, loadAgents, loadAgencies, loadPosts]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as TabValue);
  };

  const connectionsT = _t.connections as Record<string, Record<string, string>>;

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
      <TabsList className="grid w-full max-w-2xl grid-cols-6">
        <TabsTrigger value="agents" className="gap-1.5">
          <Users className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">{t("agents")}</span>
        </TabsTrigger>
        <TabsTrigger value="agencies" className="gap-1.5">
          <Building2 className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">{t("agencies")}</span>
        </TabsTrigger>
        <TabsTrigger value="posts" className="gap-1.5">
          <FileText className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">{t("posts")}</span>
        </TabsTrigger>
        <TabsTrigger value="connections" className="gap-1.5">
          <UserCheck className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">{t("myConnections")}</span>
          {connections.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-xs hidden sm:inline">
              {connections.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="pending" className="gap-1.5">
          <Clock className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">{t("pending")}</span>
          {pendingCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-warning text-white text-xs">
              {pendingCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="sent" className="gap-1.5">
          <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">{t("sent")}</span>
          {pendingSent.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-xs hidden sm:inline">
              {pendingSent.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="agents" className="mt-4 space-y-4">
        <Input
          type="search"
          placeholder={t("searchPlaceholder")}
          value={agentsQuery}
          onChange={(e) => setAgentsQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadAgents()}
          className="max-w-sm"
          aria-label={t("searchPlaceholder")}
        />
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => loadAgents()}
        >
          {t("search")}
        </button>
        {loading && <p className="text-muted-foreground">{t("loading")}</p>}
        {!loading && agents.length === 0 && (
          <p className="text-muted-foreground">{t("emptyState.agents")}</p>
        )}
        {!loading && agents.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <NetworkAgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
        {agentsNextCursor && (
          <button
            type="button"
            className="text-sm text-primary hover:underline disabled:opacity-50"
            disabled={loadingMore}
            onClick={() => loadAgents(agentsNextCursor, true)}
          >
            {loadingMore ? t("loading") : t("loadMore")}
          </button>
        )}
      </TabsContent>

      <TabsContent value="agencies" className="mt-4 space-y-4">
        <Input
          type="search"
          placeholder={t("searchAgenciesPlaceholder")}
          value={agenciesQuery}
          onChange={(e) => setAgenciesQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && loadAgencies()}
          className="max-w-sm"
          aria-label={t("searchAgenciesPlaceholder")}
        />
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => loadAgencies()}
        >
          {t("search")}
        </button>
        {loading && <p className="text-muted-foreground">{t("loading")}</p>}
        {!loading && agencies.length === 0 && (
          <p className="text-muted-foreground">{t("emptyState.agencies")}</p>
        )}
        {!loading && agencies.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agencies.map((agency) => (
              <NetworkAgencyCard key={agency.id} agency={agency} />
            ))}
          </div>
        )}
        {agenciesNextCursor && (
          <button
            type="button"
            className="text-sm text-primary hover:underline disabled:opacity-50"
            disabled={loadingMore}
            onClick={() => loadAgencies(agenciesNextCursor, true)}
          >
            {loadingMore ? t("loading") : t("loadMore")}
          </button>
        )}
      </TabsContent>

      <TabsContent value="posts" className="mt-4">
        {loading && <p className="text-muted-foreground">{t("loading")}</p>}
        {!loading && posts.length === 0 && (
          <p className="text-muted-foreground">{t("emptyState.posts")}</p>
        )}
        {!loading && posts.length > 0 && (
          <NetworkFeed
            posts={posts}
            nextCursor={postsNextCursor}
            loadingMore={loadingMore}
            onLoadMore={() => postsNextCursor && loadPosts(postsNextCursor, true)}
          />
        )}
      </TabsContent>

      <TabsContent value="connections" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" aria-hidden />
              {connectionsT.yourConnections?.title}
            </CardTitle>
            <CardDescription>
              {connectionsT.yourConnections?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConnectionsList
              connections={connections}
              translations={connectionsT}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="pending" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" aria-hidden />
              {connectionsT.pendingRequests?.title}
            </CardTitle>
            <CardDescription>
              {connectionsT.pendingRequests?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PendingRequestsList
              requests={pendingReceived}
              translations={connectionsT}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="sent" className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" aria-hidden />
              {connectionsT.sentRequests?.title}
            </CardTitle>
            <CardDescription>
              {connectionsT.sentRequests?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConnectionsList
              connections={pendingSent}
              showAsSent
              translations={connectionsT}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
