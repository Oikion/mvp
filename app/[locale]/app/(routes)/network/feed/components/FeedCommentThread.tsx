"use client";

import { useState, useCallback, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import type { Locale } from "date-fns/locale";
import {
  Send,
  Loader2,
  X,
  Reply,
  CornerDownRight,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  addComment,
  deleteComment,
  getPostComments,
  type Comment,
} from "@/actions/social-feed/comment-post";

interface FeedCommentThreadProps {
  postId: string;
  currentUser: any;
  showComments: boolean;
  commentCount: number;
  onCommentCountChange: (count: number) => void;
  t: any;
  dateLocale: Locale;
}

export function FeedCommentThread({
  postId,
  currentUser,
  showComments,
  commentCount,
  onCommentCountChange,
  t,
  dateLocale,
}: FeedCommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasLoaded, setHasLoaded] = useState(false);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    authorName: string;
  } | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [isAddingReply, setIsAddingReply] = useState(false);

  const { toast } = useAppToast();

  // Load comments
  const loadComments = useCallback(
    async (loadMore = false) => {
      if (isLoadingComments) return;

      setIsLoadingComments(true);
      try {
        const result = await getPostComments(postId, {
          limit: 5,
          cursor: loadMore ? nextCursor : undefined,
        });

        if (loadMore) {
          setComments((prev) => [...prev, ...result.comments]);
        } else {
          setComments(result.comments);
        }
        setHasMoreComments(result.hasMore);
        setNextCursor(result.nextCursor);
        onCommentCountChange(result.total);
        setHasLoaded(true);
      } catch {
        toast.error("Failed to load comments", { isTranslationKey: false });
      } finally {
        setIsLoadingComments(false);
      }
    },
    [postId, nextCursor, isLoadingComments, toast, onCommentCountChange]
  );

  // Trigger load when showComments changes to true
  useEffect(() => {
    if (showComments && !hasLoaded) {
      loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComments]);

  // Add comment
  const handleAddComment = async () => {
    if (!commentInput.trim() || isAddingComment) return;

    setIsAddingComment(true);
    try {
      const result = await addComment(postId, commentInput);
      if (result.success && result.comment) {
        setComments((prev) => [...prev, result.comment!]);
        onCommentCountChange(commentCount + 1);
        setCommentInput("");
      } else {
        toast.error(result.error || "An error occurred", {
          isTranslationKey: false,
        });
      }
    } catch {
      toast.error("Failed to add comment", { isTranslationKey: false });
    } finally {
      setIsAddingComment(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (
    commentId: string,
    isReply = false,
    parentId?: string
  ) => {
    try {
      const result = await deleteComment(commentId);
      if (result.success) {
        if (isReply && parentId) {
          setComments((prev) =>
            prev.map((c) =>
              c.id === parentId
                ? {
                    ...c,
                    replies: c.replies?.filter((r) => r.id !== commentId) || [],
                    replyCount: (c.replyCount || 1) - 1,
                  }
                : c
            )
          );
        } else {
          setComments((prev) => prev.filter((c) => c.id !== commentId));
        }
        onCommentCountChange(commentCount - 1);
      } else {
        toast.error(result.error || "An error occurred", {
          isTranslationKey: false,
        });
      }
    } catch {
      toast.error("Failed to delete comment", { isTranslationKey: false });
    }
  };

  // Add reply
  const handleAddReply = async (parentCommentId: string) => {
    if (!replyInput.trim() || isAddingReply) return;

    setIsAddingReply(true);
    try {
      const result = await addComment(postId, replyInput, parentCommentId);
      if (result.success && result.comment) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === parentCommentId
              ? {
                  ...c,
                  replies: [...(c.replies || []), result.comment!],
                  replyCount: (c.replyCount || 0) + 1,
                }
              : c
          )
        );
        onCommentCountChange(commentCount + 1);
        setReplyInput("");
        setReplyingTo(null);
      } else {
        toast.error(result.error || "An error occurred", {
          isTranslationKey: false,
        });
      }
    } catch {
      toast.error("Failed to add reply", { isTranslationKey: false });
    } finally {
      setIsAddingReply(false);
    }
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyInput("");
  };

  return (
    <Collapsible open={showComments} onOpenChange={(open) => {
      if (open && !hasLoaded) {
        loadComments();
      }
    }}>
      <CollapsibleContent className="space-y-3 pt-3 border-t">
        {/* Comment Input */}
        <div className="flex items-start gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={currentUser?.avatar} />
            <AvatarFallback className="text-xs">
              {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 flex gap-2">
            <Input
              placeholder={t?.post?.writeComment || "Write a comment..."}
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
              disabled={isAddingComment}
              className="text-sm"
            />
            <Button
              size="sm"
              onClick={handleAddComment}
              disabled={!commentInput.trim() || isAddingComment}
            >
              {isAddingComment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoadingComments && comments.length === 0 && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Comments List */}
        {comments.length > 0 && (
          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="space-y-2">
                {/* Main Comment */}
                <div className="flex items-start gap-2 group">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.author.avatar} />
                    <AvatarFallback className="text-xs">
                      {comment.author.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">
                          {comment.author.name}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.createdAt), {
                              addSuffix: true,
                              locale: dateLocale,
                            })}
                          </span>
                          {comment.isOwn && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteComment(comment.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm mt-1 whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                    {/* Reply button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 mt-1 text-xs text-muted-foreground hover:text-primary"
                      onClick={() =>
                        setReplyingTo({
                          id: comment.id,
                          authorName: comment.author.name,
                        })
                      }
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      {t?.post?.reply || "Reply"}
                    </Button>
                  </div>
                </div>

                {/* Reply Input */}
                {replyingTo?.id === comment.id && (
                  <div className="ml-10 flex items-start gap-2">
                    <CornerDownRight className="h-4 w-4 text-muted-foreground mt-2" />
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={currentUser?.avatar} />
                      <AvatarFallback className="text-xs">
                        {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground mb-1">
                        {t?.post?.replyingTo || "Replying to"}{" "}
                        <span className="font-medium">
                          {replyingTo.authorName}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          placeholder={
                            t?.post?.writeReply || "Write a reply..."
                          }
                          value={replyInput}
                          onChange={(e) => setReplyInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleAddReply(comment.id);
                            }
                            if (e.key === "Escape") {
                              cancelReply();
                            }
                          }}
                          disabled={isAddingReply}
                          className="text-sm h-8"
                          autoFocus
                        />
                        <Button
                          size="sm"
                          className="h-8"
                          onClick={() => handleAddReply(comment.id)}
                          disabled={!replyInput.trim() || isAddingReply}
                        >
                          {isAddingReply ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8"
                          onClick={cancelReply}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="ml-10 space-y-2">
                    {comment.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className="flex items-start gap-2 group"
                      >
                        <CornerDownRight className="h-4 w-4 text-muted-foreground mt-2" />
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={reply.author.avatar} />
                          <AvatarFallback className="text-xs">
                            {reply.author.name?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 bg-muted/30 rounded-lg px-3 py-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm">
                              {reply.author.name}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(
                                  new Date(reply.createdAt),
                                  {
                                    addSuffix: true,
                                    locale: dateLocale,
                                  }
                                )}
                              </span>
                              {reply.isOwn && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() =>
                                    handleDeleteComment(
                                      reply.id,
                                      true,
                                      comment.id
                                    )
                                  }
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm mt-1 whitespace-pre-wrap">
                            {reply.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Load More Comments */}
            {hasMoreComments && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => loadComments(true)}
                disabled={isLoadingComments}
                className="w-full text-muted-foreground"
              >
                {isLoadingComments && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                {t?.post?.loadMoreComments || "Load more comments"}
              </Button>
            )}
          </div>
        )}

        {/* Empty State */}
        {!isLoadingComments && comments.length === 0 && hasLoaded && (
          <p className="text-sm text-muted-foreground text-center py-2">
            {t?.post?.noComments || "No comments yet. Be the first to comment!"}
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
