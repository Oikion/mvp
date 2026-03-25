"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import type { Locale } from "date-fns/locale";
import {
  MoreHorizontal,
  Trash2,
  Building2,
  User,
  FileText,
  Globe,
  Shield,
  Users,
  ClipboardList,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@/navigation";
import { AttachmentList } from "@/components/attachments";
import { FeedPostEngagement } from "./FeedPostEngagement";
import { FeedCommentThread } from "./FeedCommentThread";

type ProfileVisibility = "PRIVATE" | "SECURE" | "PUBLIC";

interface PostAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
}

export interface SocialPost {
  id: string;
  slug?: string | null;
  type: "property" | "client" | "mandate" | "text";
  content: string;
  timestamp: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    organizationName?: string;
    visibility?: ProfileVisibility;
  } | null;
  linkedEntity?: {
    id: string;
    friendlyId: string;
    type: "property" | "client" | "mandate";
    title: string;
    subtitle?: string;
    image?: string;
    metadata?: Record<string, any>;
  };
  attachments?: PostAttachment[];
  likes: number;
  comments: number;
  isLiked?: boolean;
  isOwn?: boolean;
  isFromConnection?: boolean;
}

interface FeedPostCardProps {
  post: SocialPost;
  currentUser: any;
  onDelete: (id: string) => void;
  t: any;
  dateLocale: Locale;
}

export function FeedPostCard({
  post,
  currentUser,
  onDelete,
  t,
  dateLocale,
}: FeedPostCardProps) {
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [showComments, setShowComments] = useState(false);

  const getActionText = (type: string) => {
    switch (type) {
      case "property":
        return t?.post?.sharedProperty || "shared a property";
      case "client":
        return t?.post?.sharedClient || "shared a client";
      case "mandate":
        return t?.post?.sharedMandate || "shared a mandate";
      default:
        return t?.post?.postedUpdate || "posted an update";
    }
  };

  const getEntityLink = () => {
    if (!post.linkedEntity) return "#";
    switch (post.linkedEntity.type) {
      case "property":
        return `/app/mls/properties/${post.linkedEntity.friendlyId}`;
      case "client":
        return `/app/crm/clients/${post.linkedEntity.friendlyId}`;
      case "mandate":
        return `/app/crm/mandates/${post.linkedEntity.friendlyId}`;
      default:
        return "#";
    }
  };

  const getPostIcon = (type: string) => {
    switch (type) {
      case "property":
        return <Building2 className="h-4 w-4" />;
      case "client":
        return <User className="h-4 w-4" />;
      case "mandate":
        return <ClipboardList className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getPostColor = (type: string) => {
    switch (type) {
      case "property":
        return "bg-primary/10 text-primary border-primary/20";
      case "client":
        return "bg-success/10 text-success border-success/20";
      case "mandate":
        return "bg-warning/10 text-warning border-warning/20";
      default:
        return "bg-gray-500/10 text-muted-foreground border-gray-500/20";
    }
  };

  const getVisibilityBadge = () => {
    if (post.isFromConnection) {
      return (
        <Badge
          variant="outline"
          className="text-xs bg-primary/10 text-primary border-primary/20"
        >
          <Users className="h-3 w-3 mr-1" />
          {t?.visibility?.connection || "Connection"}
        </Badge>
      );
    }

    switch (post.author?.visibility) {
      case "PUBLIC":
        return (
          <Badge
            variant="outline"
            className="text-xs bg-success/10 text-success border-success/20"
          >
            <Globe className="h-3 w-3 mr-1" />
            {t?.visibility?.public || "Public"}
          </Badge>
        );
      case "SECURE":
        return (
          <Badge
            variant="outline"
            className="text-xs bg-warning/10 text-warning border-warning/20"
          >
            <Shield className="h-3 w-3 mr-1" />
            {t?.visibility?.secure || "Secure"}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="rounded-xl border shadow-sm overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author?.avatar} />
              <AvatarFallback>
                {post.author?.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href={`/app/network/profile`}
                  className="font-semibold text-sm text-foreground hover:text-primary hover:underline"
                >
                  {post.author?.name ?? "Deleted User"}
                </Link>
                {getVisibilityBadge()}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                {post.author?.organizationName && (
                  <>
                    <span>{post.author?.organizationName}</span>
                    <span className="text-muted-foreground/50">|</span>
                  </>
                )}
                <span>{getActionText(post.type)}</span>
                <span className="text-muted-foreground/50">--</span>
                <span>
                  {formatDistanceToNow(new Date(post.timestamp), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </span>
              </div>
            </div>
          </div>
          {post.isOwn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(post.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t?.post?.deletePost || "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Post content */}
        {post.content && (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {post.content}
          </p>
        )}

        {/* Post Attachments */}
        {post.attachments && post.attachments.length > 0 && (
          <AttachmentList attachments={post.attachments} compact />
        )}

        {/* Linked Entity Embed Card */}
        {post.linkedEntity && (
          <Link href={getEntityLink()}>
            <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors mt-2">
              <div className="flex items-start gap-3">
                {post.linkedEntity.image ? (
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                    <img
                      src={post.linkedEntity.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className={`rounded-full p-2.5 shrink-0 ${getPostColor(post.linkedEntity.type)}`}
                  >
                    {getPostIcon(post.linkedEntity.type)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {post.linkedEntity.type === "client"
                        ? t?.badges?.client || "Client"
                        : post.linkedEntity.type === "property"
                          ? t?.badges?.property || "Property"
                          : post.linkedEntity.type === "mandate"
                            ? t?.badges?.mandate || "Mandate"
                            : post.linkedEntity.type}
                    </Badge>
                  </div>
                  <h4 className="font-medium mt-1 truncate text-sm">
                    {post.linkedEntity.title}
                  </h4>
                  {post.linkedEntity.subtitle && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {post.linkedEntity.subtitle}
                    </p>
                  )}
                  {post.linkedEntity.metadata?.price && (
                    <p className="text-sm font-semibold text-primary mt-1">
                      &euro;{post.linkedEntity.metadata.price.toLocaleString()}
                    </p>
                  )}
                  {post.linkedEntity.type === "mandate" &&
                    (post.linkedEntity.metadata?.budgetMin ||
                      post.linkedEntity.metadata?.budgetMax) && (
                      <p className="text-sm font-semibold text-warning mt-1">
                        &euro;
                        {post.linkedEntity.metadata.budgetMin?.toLocaleString() ||
                          "0"}
                        {post.linkedEntity.metadata.budgetMax
                          ? ` – €${post.linkedEntity.metadata.budgetMax.toLocaleString()}`
                          : "+"}
                      </p>
                    )}
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Engagement Bar */}
        <FeedPostEngagement
          postId={post.id}
          postSlug={post.slug}
          isLiked={isLiked}
          likeCount={likeCount}
          commentCount={commentCount}
          showComments={showComments}
          onLikeChange={(liked, count) => {
            setIsLiked(liked);
            setLikeCount(count);
          }}
          onToggleComments={() => setShowComments(!showComments)}
          t={t}
        />

        {/* Comment Thread */}
        <FeedCommentThread
          postId={post.id}
          currentUser={currentUser}
          showComments={showComments}
          commentCount={commentCount}
          onCommentCountChange={setCommentCount}
          t={t}
          dateLocale={dateLocale}
        />
      </CardContent>
    </Card>
  );
}
