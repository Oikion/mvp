"use client";

import { useTransition } from "react";
import { Heart, MessageCircle, Share2 } from "lucide-react";
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
    <div className="flex items-center gap-0.5 border-t pt-3">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLike}
        disabled={isLiking}
        className={`h-8 w-8 pointer-coarse:min-h-11 pointer-coarse:min-w-11 ${
          isLiked
            ? "text-destructive hover:text-destructive"
            : "text-muted-foreground hover:text-foreground"
        }`}
        aria-label={t?.post?.like || "Like"}
      >
        <Heart
          className={`h-4 w-4 transition-all ${isLiked ? "fill-current scale-110" : ""}`}
          aria-hidden="true"
        />
      </Button>
      {likeCount > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums -ml-0.5 mr-1">{likeCount}</span>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleComments}
        className="h-8 w-8 text-muted-foreground hover:text-foreground pointer-coarse:min-h-11 pointer-coarse:min-w-11"
        aria-label={t?.post?.comment || "Comment"}
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
      </Button>
      {commentCount > 0 && (
        <span className="text-xs text-muted-foreground tabular-nums -ml-0.5 mr-1">{commentCount}</span>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground pointer-coarse:min-h-11 pointer-coarse:min-w-11"
        onClick={handleShare}
        aria-label={t?.post?.share || "Share"}
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
