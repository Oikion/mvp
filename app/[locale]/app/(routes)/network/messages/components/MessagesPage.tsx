"use client";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  Hash,
  Lock,
  MessageCircle,
  Plus,
  Search,
  Send,
  ServerOff,
  Settings,
  Users,
  Wrench,
} from "lucide-react";
import { useAblyNotifications } from "@/hooks/useAbly";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  useMessagingCredentials,
  useChannels,
  useConversations,
  useMarkAsRead,
  useMuteConversation,
  useDeleteConversation,
  useLeaveConversation,
  useLeaveChannel,
} from "@/hooks/swr/useMessaging";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConversationList } from "./ConversationList";
import { MessageThread } from "./MessageThread";
import { MessageComposer } from "./MessageComposer";
import { CreateChannelDialog } from "./CreateChannelDialog";
import { StartDMDialog } from "./StartDMDialog";
import { MessageSearch } from "./MessageSearch";
import { ConversationSettings } from "./ConversationSettings";
import { ThreadPanel } from "./ThreadPanel";
import { useE2EE } from "@/hooks/useE2EE";
import type { ConversationItem } from "./ConversationList";
import type { Message } from "@/hooks/swr/useMessaging";

interface MessagesPageProps {
  dict: Record<string, unknown>;
  locale: string;
}

export function MessagesPage({ dict, locale }: MessagesPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("messages");
  const { toast } = useAppToast();
  const { isSetUp, isLoading: isLoadingE2EE } = useE2EE();

  const selectedChannelId = searchParams.get("channelId");
  const selectedConversationId = searchParams.get("conversationId");

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"channels" | "internal">("internal");
  const [createChannelOpen, setCreateChannelOpen] = useState(false);
  const [startDMOpen, setStartDMOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    messageId: string;
    content: string;
    senderName: string | null;
  } | null>(null);
  const [activeThread, setActiveThread] = useState<Message | null>(null);

  // Fetch messaging credentials
  const { credentials, isLoading: isLoadingCredentials, error: credentialsError } = useMessagingCredentials();

  // Fetch channels and conversations immediately (no need to wait for Ably credentials)
  const { channels, isLoading: isLoadingChannels } = useChannels({
    enabled: true,
  });

  const { conversations, isLoading: isLoadingConversations, mutate: mutateConversations } = useConversations({
    enabled: true,
  });

  // Subscribe to real-time updates for new conversations
  useAblyNotifications({
    userId: credentials?.userId,
    credentials,
    onConversationCreated: () => {
      mutateConversations();
    },
  });

  // Context menu action hooks
  const { markAsRead } = useMarkAsRead();
  const { toggleMute } = useMuteConversation();
  const { deleteConversation } = useDeleteConversation();
  const { leaveConversation } = useLeaveConversation();
  const { leaveChannel } = useLeaveChannel();

  // Filter conversations by type
  const directMessages = conversations.filter((c) => c.type === "dm");
  const groupConversations = conversations.filter((c) => c.type === "group");

  // Handle channel selection
  const handleSelectChannel = (channelId: string) => {
    const params = new URLSearchParams();
    params.set("channelId", channelId);
    router.push(`/${locale}/app/network/messages?${params.toString()}`);
  };

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string) => {
    const params = new URLSearchParams();
    params.set("conversationId", conversationId);
    router.push(`/${locale}/app/network/messages?${params.toString()}`);
  };

  // Context menu handlers for conversations
  const handleMarkAsRead = useCallback(async (item: ConversationItem) => {
    try {
      if (item.type === "channel") {
        await markAsRead({ channelId: item.id });
      } else {
        await markAsRead({ conversationId: item.id });
      }
      toast.success("statusUpdated");
      mutateConversations();
    } catch (err) {
      console.error("Failed to mark as read:", err);
      toast.error("statusUpdateFailed");
    }
  }, [markAsRead, mutateConversations]);

  const handleMuteToggle = useCallback(async (item: ConversationItem) => {
    try {
      await toggleMute({
        conversationId: item.id,
        mute: !item.isMuted
      });
      toast.success("updateSuccess");
    } catch (err) {
      console.error("Failed to update notification settings:", err);
      toast.error("updateFailed");
    }
  }, [toggleMute]);

  const handleLeave = useCallback(async (item: ConversationItem) => {
    try {
      if (item.type === "channel") {
        await leaveChannel({ channelId: item.id });
        toast.success("updateSuccess");
      } else {
        await leaveConversation({ conversationId: item.id });
        toast.success("updateSuccess");
      }

      if (item.id === selectedConversationId || item.id === selectedChannelId) {
        router.push(`/${locale}/app/network/messages`);
      }
    } catch (err) {
      console.error("Failed to leave:", err);
      toast.error("updateFailed");
    }
  }, [leaveConversation, leaveChannel, selectedConversationId, selectedChannelId, router, locale]);

  const handleDelete = useCallback(async (item: ConversationItem) => {
    try {
      await deleteConversation({ conversationId: item.id });
      toast.success("deleteSuccess");

      if (item.id === selectedConversationId) {
        router.push(`/${locale}/app/network/messages`);
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
      toast.error("deleteFailed");
    }
  }, [deleteConversation, selectedConversationId, router, locale]);

  // Filter items by search
  const filteredChannels = useMemo(
    () => channels.filter((channel) =>
      channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [channels, searchQuery]
  );

  const filteredDMs = useMemo(
    () => directMessages.filter((dm) =>
      (dm.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [directMessages, searchQuery]
  );

  // Get selected items
  const selectedChannel = channels.find((c) => c.id === selectedChannelId);
  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);

  // E2EE is opt-in: show a dismissible banner if not set up, don't block access
  const [e2eeBannerDismissed, setE2eeBannerDismissed] = useState(false);
  const showE2eeBanner = !isLoadingE2EE && !isSetUp && !e2eeBannerDismissed;

  // Error state - check for specific error types (only when credentials fully failed, not loading)
  if (credentialsError && !isLoadingCredentials) {
    const errorMessage = credentialsError.message || "";
    const isNotConfigured = errorMessage.includes("not configured") || errorMessage.includes("NOT_CONFIGURED");
    const isUnavailable = errorMessage.includes("unavailable") || errorMessage.includes("UNAVAILABLE");

    if (isNotConfigured) {
      return (
        <div className="flex h-[calc(100vh-7.5rem)] items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center max-w-md">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Wrench className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t("status.notConfigured")}</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {t("status.notConfiguredDesc")}
              </p>
            </div>
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg font-mono">
              Get your API key at <code>ably.com</code>
            </div>
          </div>
        </div>
      );
    }

    if (isUnavailable) {
      return (
        <div className="flex h-[calc(100vh-7.5rem)] items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center max-w-md">
            <div className="h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <ServerOff className="h-8 w-8 text-warning dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t("status.unavailable")}</h3>
              <p className="text-sm text-muted-foreground mt-2">
                {t("status.unavailableDesc")}
              </p>
            </div>
            <Button onClick={() => window.location.reload()}>
              {t("status.tryAgain")}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-[calc(100vh-7.5rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div>
            <h3 className="font-semibold">{t("status.genericError")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("status.genericErrorDesc")}
            </p>
          </div>
          <Button onClick={() => window.location.reload()}>
            {t("status.tryAgain")}
          </Button>
        </div>
      </div>
    );
  }

  const hasSelection = selectedChannelId || selectedConversationId;

  return (
    <div className="flex flex-col h-[calc(100vh-7.5rem)] overflow-hidden rounded-xl border">
      {/* E2EE opt-in banner */}
      {showE2eeBanner && (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-primary/5 border-b text-sm">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <span>
              {t("e2ee.banner")}{" "}
              <a href={`/${locale}/app/settings/security`} className="font-medium underline underline-offset-2 hover:text-primary">
                {t("e2ee.setup")}
              </a>
            </span>
          </div>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setE2eeBannerDismissed(true)}>
            {t("e2ee.dismiss")}
          </Button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <div
        className="w-80 border-r flex flex-col bg-sidebar text-sidebar-foreground rounded-l-xl"
        onContextMenu={(e) => {
          const target = e.target as HTMLElement;
          if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA" && !target.isContentEditable) {
            e.preventDefault();
          }
        }}
      >
        {/* Search */}
        <div className="p-3 border-b border-sidebar-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sidebar-foreground/60" />
            <Input
              placeholder={t("sidebar.search")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-sidebar-accent border-sidebar-border"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "channels" | "internal")} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-3 pt-3 pb-2 shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="internal">
                <MessageCircle className="h-4 w-4" />
                {t("tabs.internal")}
              </TabsTrigger>
              <TabsTrigger value="channels">
                <Hash className="h-4 w-4" />
                {t("tabs.channels")}
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1 px-2">
            <TabsContent value="channels" className="m-0 pt-0 pb-2">
              <ConversationList
                items={filteredChannels.map((c) => ({
                  id: c.id,
                  name: c.name,
                  type: "channel" as const,
                  isDefault: c.isDefault,
                  channelType: c.channelType,
                  unreadCount: c.unreadCount,
                }))}
                selectedId={selectedChannelId}
                onSelect={handleSelectChannel}
                isLoading={isLoadingChannels}
                emptyMessage={t("empty.channels")}
                onMarkAsRead={handleMarkAsRead}
                onMuteToggle={handleMuteToggle}
                onLeave={handleLeave}
              />
            </TabsContent>

            <TabsContent value="internal" className="m-0 pt-0 pb-2">
              <ConversationList
                items={filteredDMs.map((d) => ({
                  id: d.id,
                  name: d.name || t("status.directMessage"),
                  type: "dm" as const,
                  lastMessage: d.lastMessage?.content,
                  unreadCount: d.unreadCount,
                }))}
                selectedId={selectedConversationId}
                onSelect={handleSelectConversation}
                isLoading={isLoadingConversations}
                emptyMessage={t("empty.conversations")}
                onMarkAsRead={handleMarkAsRead}
                onMuteToggle={handleMuteToggle}
                onLeave={handleLeave}
                onDelete={handleDelete}
              />

              {/* Group conversations */}
              {groupConversations.length > 0 && (
                <div className="mt-4">
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("status.groups")}
                  </div>
                  <ConversationList
                    items={groupConversations.map((g) => ({
                      id: g.id,
                      name: g.name || t("status.groups"),
                      type: "group" as const,
                      lastMessage: g.lastMessage?.content,
                      unreadCount: g.unreadCount,
                    }))}
                    selectedId={selectedConversationId}
                    onSelect={handleSelectConversation}
                    isLoading={false}
                    emptyMessage=""
                    onMarkAsRead={handleMarkAsRead}
                    onMuteToggle={handleMuteToggle}
                    onLeave={handleLeave}
                    onDelete={handleDelete}
                  />
                </div>
              )}

            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Action buttons */}
        <div className="p-3 border-t border-sidebar-border flex gap-2">
          <Button
            variant="outline"
            className="flex-1 gap-2 border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setCreateChannelOpen(true)}
          >
            <Plus className="h-4 w-4" />
            {t("actions.createChannel")}
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2 border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setStartDMOpen(true)}
          >
            <Send className="h-4 w-4" />
            {t("actions.sendDM")}
          </Button>
        </div>
      </div>

      {/* Dialogs */}
      <CreateChannelDialog
        open={createChannelOpen}
        onOpenChange={setCreateChannelOpen}
      />
      <StartDMDialog
        open={startDMOpen}
        onOpenChange={setStartDMOpen}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col bg-background rounded-r-xl">
        {hasSelection ? (
          <>
            {/* Header */}
            <div className="h-14 border-b flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                {selectedChannel ? (
                  <>
                    <Hash className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium">{selectedChannel.name}</span>
                    {selectedChannel.description && (
                      <span className="text-sm text-muted-foreground">
                        — {selectedChannel.description}
                      </span>
                    )}
                  </>
                ) : selectedConversation ? (
                  <>
                    {selectedConversation.isGroup ? (
                      <Users className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <MessageCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                    <span className="font-medium">
                      {selectedConversation.name || t("status.directMessage")}
                    </span>
                  </>
                ) : (
                  <span className="font-medium">{t("status.conversation")}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <MessageSearch locale={locale}>
                  <Button variant="ghost" size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </MessageSearch>
                <ConversationSettings
                  channel={selectedChannel}
                  conversation={selectedConversation}
                >
                  <Button variant="ghost" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </ConversationSettings>
              </div>
            </div>

            {/* Messages */}
            <MessageThread
              channelId={selectedChannelId || undefined}
              conversationId={selectedConversationId || undefined}
              credentials={credentials}
              onReply={(messageId, content, senderName) => {
                setReplyTo({ messageId, content, senderName });
              }}
              onOpenThread={(message) => setActiveThread(message)}
            />

            {/* Composer */}
            <MessageComposer
              channelId={selectedChannelId || undefined}
              conversationId={selectedConversationId || undefined}
              credentials={credentials}
              placeholder={
                selectedChannel
                  ? `Message #${selectedChannel.name}`
                  : t("composer.placeholder")
              }
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
            />
          </>
        ) : (
          /* Empty state */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("status.selectConversation")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("status.selectDescription")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Thread Panel */}
      {activeThread && (
        <ThreadPanel
          open={!!activeThread}
          onOpenChange={(open) => !open && setActiveThread(null)}
          parentMessage={activeThread}
          channelId={selectedChannelId || undefined}
          conversationId={selectedConversationId || undefined}
          credentials={credentials}
        />
      )}
      </div>
    </div>
  );
}
