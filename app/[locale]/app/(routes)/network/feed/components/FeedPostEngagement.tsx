"use client";

import { useTransition } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/hooks/use-app-toast";
import { toggleLikePost } from "@/actions/social-feed/like-post";

interface FeedPostEngagementProps {
  postId: string;
  postSlug?: string | null;
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  showComments: boolean;
  onLikeChange: (isLiked: boolean, count: number) => void;
  onToggleComments: () => void;
  t: any;
}

export function FeedPostEngagement({
  postId,
  postSlug,
  isLiked,
  likeCount,
  commentCount,
  showComments,
  onLikeChange,
  onToggleComments,
  t,
}: FeedPostEngagementProps) {
  const [isLiking, startLikeTransition] = useTransition();
  const { toast } = useAppToast();

  const handleLike = () => {
    // Optimistic update
    const wasLiked = isLiked;
    const newCount = wasLiked ? likeCount - 1 : likeCount + 1;
    onLikeChange(!wasLiked, newCount);

    startLikeTransition(async () => {
      const result = await toggleLikePost(postId);
      if (!result.success) {
        // Revert on error
        onLikeChange(wasLiked, likeCount);
        toast.error(result.error || "An error occurred", {
          isTranslationKey: false,
        });
      }
    });
  };

  const handleShare = () => {
    const postUrl = `${window.location.origin}/post/${postSlug || postId}`;
    navigator.clipboard
      .writeText(postUrl)
      .then(() => {
        toast.success(t?.post?.linkCopied || "Link copied", {
          description:
            t?.post?.linkCopiedDesc || "Post link copied to clipboard",
          isTranslationKey: false,
        });
      })
      .catch(() => {
        toast.error(t?.post?.linkCopyFailed || "Failed to copy link", {
          isTranslationKey: false,
        });
      });
  };

  return (
    <div className="flex items-center gap-1 border-t pt-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLike}
        disabled={isLiking}
        className={`flex-1 gap-1.5 ${
          isLiked
            ? "text-destructive hover:text-destructive"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Heart
          className={`h-4 w-4 transition-all ${isLiked ? "fill-current scale-110" : ""}`}
        />
        {likeCount > 0 && <span className="text-xs">{likeCount}</span>}
        <span className="text-xs">{t?.post?.like || "Like"}</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleComments}
        className="flex-1 gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <MessageCircle className="h-4 w-4" />
        {commentCount > 0 && <span className="text-xs">{commentCount}</span>}
        <span className="text-xs">{t?.post?.comment || "Comment"}</span>
        {showComments ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="flex-1 gap-1.5 text-muted-foreground hover:text-foreground"
        onClick={handleShare}
      >
        <Share2 className="h-4 w-4" />
        <span className="text-xs">{t?.post?.share || "Share"}</span>
      </Button>
    </div>
  );
}
