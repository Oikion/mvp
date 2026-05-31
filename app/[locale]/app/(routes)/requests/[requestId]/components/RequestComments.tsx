"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import {
  useRequestComments,
  useAddRequestComment,
  useDeleteRequestComment,
} from "@/hooks/swr/useRequestComments";
import { useAppToast } from "@/hooks/use-app-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { Trash2, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useTranslations } from "next-intl";

interface RequestCommentsProps {
  requestId: string;
}

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email.charAt(0).toUpperCase();
}

export default function RequestComments({ requestId }: Readonly<RequestCommentsProps>) {
  const { toast } = useAppToast();
  const t = useTranslations("requests");
  const tCommon = useTranslations("common");

  const { user: clerkUser } = useUser();
  const currentUser = clerkUser
    ? {
        id: clerkUser.id,
        name: clerkUser.fullName ?? clerkUser.firstName ?? null,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
        avatar: clerkUser.imageUrl ?? null,
      }
    : undefined;

  const { comments, isLoading } = useRequestComments(requestId);
  const { addComment } = useAddRequestComment(requestId);
  const { deleteComment } = useDeleteRequestComment(requestId);

  const [newComment, setNewComment] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleSubmit = async () => {
    const content = newComment.trim();
    if (!content) return;
    setIsAdding(true);
    try {
      await addComment(content);
      setNewComment("");
    } catch (err) {
      toast.error("commentFailed", {
        description: err instanceof Error ? err.message : t("view.commentFailed"),
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteComment(deleteTarget);
    } catch (err) {
      toast.error("deleteCommentFailed", {
        description: err instanceof Error ? err.message : t("view.deleteCommentFailed"),
      });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      {/* Add comment */}
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          {currentUser?.avatar && <AvatarImage src={currentUser.avatar} />}
          <AvatarFallback className="text-xs">
            {currentUser ? getInitials(currentUser.name, currentUser.email) : "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder={t("view.commentPlaceholder")}
            rows={2}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isAdding}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!newComment.trim() || isAdding}
            >
              {isAdding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {t("view.postComment")}
            </Button>
          </div>
        </div>
      </div>

      {/* Comments list */}
      {isLoading && (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && comments.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-6">
          {t("view.noComments")}
        </p>
      )}

      {!isLoading && comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment: { id: string; content: string; createdAt: string; user?: { id?: string; name?: string | null; email?: string; avatar?: string | null } }) => {
            const commentUser = comment.user;
            const isOwn = currentUser && commentUser?.id === currentUser.id;

            return (
              <div key={comment.id} className="flex gap-3 group">
                <Avatar className="h-8 w-8 shrink-0">
                  {commentUser?.avatar && <AvatarImage src={commentUser.avatar} />}
                  <AvatarFallback className="text-xs">
                    {commentUser
                      ? getInitials(commentUser.name, commentUser.email ?? "")
                      : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {commentUser?.name ?? commentUser?.email ?? "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(comment.createdAt), "dd/MM/yyyy HH:mm")}
                    </span>
                    {isOwn && (
                      <button
                        type="button"
                        aria-label="Delete comment"
                        onClick={() => setDeleteTarget(comment.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap mt-0.5">{comment.content}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("view.deleteCommentTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("view.deleteCommentDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
