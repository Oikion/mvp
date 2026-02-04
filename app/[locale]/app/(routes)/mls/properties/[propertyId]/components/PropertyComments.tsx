"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Send, Trash2, User } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  usePropertyComments,
  useAddPropertyComment,
  useDeletePropertyComment,
  type PropertyComment,
} from "@/hooks/swr";

interface PropertyCommentsProps {
  propertyId: string;
  canComment: boolean;
  currentUserId: string;
}

export function PropertyComments({
  propertyId,
  canComment,
  currentUserId,
}: PropertyCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);

  // SWR hooks for data fetching and mutations
  const { comments, isLoading, mutate } = usePropertyComments(propertyId);
  const { addComment, isAdding } = useAddPropertyComment(propertyId);
  const { deleteComment, isDeleting } = useDeletePropertyComment(propertyId);

  const handleSubmit = async () => {
    if (!newComment.trim() || !canComment) return;

    const commentContent = newComment.trim();
    
    // Optimistic update - add temporary comment immediately
    const tempComment: PropertyComment = {
      id: `temp-${Date.now()}`,
      content: commentContent,
      createdAt: new Date().toISOString(),
      user: {
        id: currentUserId,
        name: null,
        email: "",
        avatar: null,
      },
    };

    // Optimistically update the cache
    mutate(
      { comments: [tempComment, ...comments] },
      { revalidate: false }
    );
    
    setNewComment("");

    try {
      const result = await addComment({ content: commentContent });
      
      // Update cache with the actual comment from server
      mutate(
        { comments: [result.comment, ...comments.filter((c) => !c.id.startsWith("temp-"))] },
        { revalidate: false }
      );
      
      toast.success("Comment added");
    } catch (error: unknown) {
      // Rollback on error
      mutate({ comments }, { revalidate: true });
      
      const message =
        error instanceof Error ? error.message : "Failed to add comment";
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!commentToDelete) return;

    const commentId = commentToDelete;
    setDeleteDialogOpen(false);
    setCommentToDelete(null);

    // Store original comments for rollback
    const originalComments = comments;

    // Optimistically remove the comment
    mutate(
      { comments: comments.filter((c) => c.id !== commentId) },
      { revalidate: false }
    );

    try {
      await deleteComment({ commentId });
      toast.success("Comment deleted");
    } catch (error: unknown) {
      // Rollback on error
      mutate({ comments: originalComments }, { revalidate: true });
      
      const message =
        error instanceof Error ? error.message : "Failed to delete comment";
      toast.error(message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5" />
          Comments
          {comments.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({comments.length})
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment Input */}
        {canComment && (
          <div className="space-y-2">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              maxLength={2000}
              disabled={isAdding}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {newComment.length}/2000 characters • Cmd+Enter to send
              </span>
              <Button
                size="sm"
                leftIcon={<Send className="h-4 w-4" />}
                onClick={handleSubmit}
                disabled={!newComment.trim() || isAdding}
              >
                {isAdding ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-3">
          {isLoading ? (
            <>
              <CommentSkeleton />
              <CommentSkeleton />
            </>
          ) : comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No comments yet.{" "}
              {canComment && "Be the first to leave a comment!"}
            </p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="flex gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={comment.user.avatar || ""} />
                  <AvatarFallback className="text-xs">
                    {comment.user.name?.charAt(0) || (
                      <User className="h-3 w-3" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">
                        {comment.user.name || comment.user.email}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    {comment.user.id === currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setCommentToDelete(comment.id);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function CommentSkeleton() {
  return (
    <div className="flex gap-3 p-3">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}
