"use client";

import { useState, useEffect, useCallback } from "react";
import { el, enUS } from "date-fns/locale";
import { Wifi, WifiOff, Share2, Users } from "lucide-react";
import Container from "../../../components/ui/Container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@/navigation";
import { useRouter } from "next/navigation";
import { useAppToast } from "@/hooks/use-app-toast";
import { deleteSocialPost } from "@/actions/social-feed/delete-social-post";
import { getMyProfileVisibility } from "@/actions/social-feed/create-social-post";
import { useMessagingCredentials } from "@/hooks/swr/useMessaging";
import { useAblyFeed } from "@/hooks/useAbly";
import type { DiscoverAgentItem } from "@/actions/network/discover-agents";
import type { DiscoverAgencyItem } from "@/actions/network/discover-agencies";
import { FeedPostComposer, type ShareableItem } from "./FeedPostComposer";
import { FeedFilters } from "./FeedFilters";
import { FeedPostCard, type SocialPost } from "./FeedPostCard";
import { FeedDiscoverySidebar } from "./FeedDiscoverySidebar";

type ProfileVisibility = "PRIVATE" | "SECURE" | "PUBLIC";

interface FeedPageProps {
  posts: SocialPost[];
  shareableItems: {
    properties: ShareableItem[];
    clients: ShareableItem[];
  };
  currentUser: any;
  dict: any;
  locale: string;
  suggestedAgents: DiscoverAgentItem[];
  suggestedAgencies: DiscoverAgencyItem[];
}

export function FeedPage({
  posts: initialPosts,
  shareableItems,
  currentUser,
  dict,
  locale,
  suggestedAgents,
  suggestedAgencies,
}: FeedPageProps) {
  const router = useRouter();
  const { toast } = useAppToast();
  const [filter, setFilter] = useState<string>("all");
  const [profileVisibility, setProfileVisibility] = useState<{
    hasProfile: boolean;
    visibility: ProfileVisibility;
  } | null>(null);

  // Real-time posts state
  const [localPosts, setLocalPosts] = useState<SocialPost[]>(initialPosts);

  const t = dict.socialFeed || {};
  const dateLocale = locale === "el" ? el : enUS;

  // Sync with server-side posts when they change
  useEffect(() => {
    setLocalPosts(initialPosts);
  }, [initialPosts]);

  useEffect(() => {
    getMyProfileVisibility().then(setProfileVisibility);
  }, []);

  // Get Ably credentials for real-time updates
  const { credentials, isConfigured } = useMessagingCredentials();

  // Real-time feed updates via Ably
  const { isSubscribed } = useAblyFeed({
    organizationId: credentials?.organizationId,
    credentials,
    // SECURITY: Ably events no longer carry full post data (PII stripped).
    // On new-post notification, refetch the feed from the server.
    onPostNotification: useCallback(
      (data: { id: string; authorId?: string; type: string }) => {
        // Don't refetch for our own posts — they're already added via server refresh
        if (data.authorId === currentUser?.id) return;
        router.refresh();
      },
      [currentUser?.id, router]
    ),
    onPostDeleted: useCallback((postId: string) => {
      setLocalPosts((prev) => prev.filter((p) => p.id !== postId));
    }, []),
    onPostLiked: useCallback(
      (data: {
        postId: string;
        userId: string;
        newLikeCount: number;
        isLiked: boolean;
      }) => {
        setLocalPosts((prev) =>
          prev.map((p) =>
            p.id === data.postId
              ? {
                  ...p,
                  likes: data.newLikeCount,
                  isLiked:
                    data.userId === currentUser?.id ? data.isLiked : p.isLiked,
                }
              : p
          )
        );
      },
      [currentUser?.id]
    ),
    onCommentAdded: useCallback(
      (data: { postId: string; newCommentCount: number }) => {
        setLocalPosts((prev) =>
          prev.map((p) =>
            p.id === data.postId
              ? { ...p, comments: data.newCommentCount }
              : p
          )
        );
      },
      []
    ),
    onCommentDeleted: useCallback(
      (data: { postId: string; newCommentCount: number }) => {
        setLocalPosts((prev) =>
          prev.map((p) =>
            p.id === data.postId
              ? { ...p, comments: data.newCommentCount }
              : p
          )
        );
      },
      []
    ),
  });

  const filteredPosts =
    filter === "all"
      ? localPosts
      : localPosts.filter((p) => {
          if (filter === "properties") return p.type === "property";
          if (filter === "clients") return p.type === "client";
          if (filter === "mandates") return p.type === "mandate";
          if (filter === "updates") return p.type === "text";
          return true;
        });

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteSocialPost(postId);
      toast.success(t?.post?.deleted || "Post deleted", {
        isTranslationKey: false,
      });
      router.refresh();
    } catch {
      toast.error("Failed to delete post", { isTranslationKey: false });
    }
  };

  return (
    <Container
      title={t.title || "Feed"}
      description={
        t.description || "Share properties and clients with your connections"
      }
      headerExtra={
        isConfigured && (
          <div className="flex items-center gap-1.5 text-xs">
            {isSubscribed ? (
              <>
                <Wifi className="h-3 w-3 text-success" />
                <span className="text-muted-foreground">
                  {t.realtime?.connected || "Live"}
                </span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {t.realtime?.connecting || "Connecting..."}
                </span>
              </>
            )}
          </div>
        )
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Feed Column */}
        <div className="lg:col-span-8 space-y-5">
          {/* Post Composer */}
          <FeedPostComposer
            currentUser={currentUser}
            shareableItems={shareableItems}
            profileVisibility={profileVisibility}
            t={t}
          />

          {/* Filter Pills */}
          <FeedFilters filter={filter} onFilterChange={setFilter} t={t} />

          {/* Posts List */}
          {filteredPosts.length === 0 ? (
            <Card className="rounded-xl border shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Share2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">
                  {t.empty?.title || "No posts yet"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
                  {t.empty?.description ||
                    "Be the first to share something with your network, or connect with other agents to see their posts."}
                </p>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    leftIcon={<Users className="h-4 w-4" />}
                    asChild
                  >
                    <Link href="/app/connections">
                      {t.empty?.findConnections || "Find Connections"}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <FeedPostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onDelete={handleDeletePost}
                  t={t}
                  dateLocale={dateLocale}
                />
              ))}
            </div>
          )}
        </div>

        {/* Discovery Sidebar (desktop only) */}
        <div className="hidden lg:block lg:col-span-4">
          <FeedDiscoverySidebar
            agents={suggestedAgents}
            agencies={suggestedAgencies}
            t={dict}
          />
        </div>

        {/* Discovery Section (mobile, at bottom) */}
        <div className="lg:hidden">
          <FeedDiscoverySidebar
            agents={suggestedAgents}
            agencies={suggestedAgencies}
            t={dict}
          />
        </div>
      </div>
    </Container>
  );
}
