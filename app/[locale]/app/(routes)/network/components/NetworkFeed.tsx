"use client";

import { formatDistanceToNow } from "date-fns";
import { el, enUS } from "date-fns/locale";
import { useLocale } from "next-intl";
import { Link } from "@/navigation";
import { Heart, MessageCircle, User } from "lucide-react";

import type { DiscoverPostItem } from "@/actions/network/discover-posts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface NetworkFeedProps {
  posts: DiscoverPostItem[];
  nextCursor: string | null;
  loadingMore: boolean;
  onLoadMore: () => void;
}

export function NetworkFeed({
  posts,
  nextCursor,
  loadingMore,
  onLoadMore,
}: NetworkFeedProps) {
  const t = useTranslations("network");
  const locale = useLocale();
  const dateLocale = locale === "el" ? el : enUS;

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <Card key={post.id}>
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={post.author?.avatar ?? undefined} alt="" />
                <AvatarFallback>
                  <User className="h-5 w-5" aria-hidden />
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  <Link
                    href={`/agent/${post.author?.slug ?? ""}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {post.author?.name ?? post.author?.username ?? "Deleted User"}
                  </Link>
                  <span className="text-muted-foreground">
                    · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: dateLocale })}
                  </span>
                </div>
                {post.content && (
                  <p className="mt-1 whitespace-pre-wrap text-sm">{post.content}</p>
                )}
                {post.linkedEntity && (
                  <Link
                    href={
                      post.linkedEntity.type === "property"
                        ? `/property/${post.linkedEntity.id}`
                        : "#"
                    }
                    className="mt-2 block rounded-md border bg-muted/50 p-2 text-sm text-primary hover:underline"
                  >
                    {post.linkedEntity.title ?? "Property"}
                    {post.linkedEntity.subtitle && (
                      <span className="text-muted-foreground"> — {post.linkedEntity.subtitle}</span>
                    )}
                  </Link>
                )}
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5" aria-hidden />
                    {post.likesCount} {t("likes")}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                    {post.commentsCount} {t("comments")}
                  </span>
                  <Link
                    href={`/post/${post.id}`}
                    className="text-primary hover:underline"
                  >
                    {t("viewPost")}
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {nextCursor && (
        <div className="flex justify-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
