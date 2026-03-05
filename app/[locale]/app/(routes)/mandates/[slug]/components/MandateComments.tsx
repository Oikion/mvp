"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import {
  useMandateComments,
  useAddMandateComment,
  useDeleteMandateComment,
} from "@/hooks/swr/useMandateComments"
import { useAppToast } from "@/hooks/use-app-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2, Send, Loader2 } from "lucide-react"
import { format } from "date-fns"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MandateCommentsProps {
  mandateId: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }
  return email.charAt(0).toUpperCase()
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MandateComments({ mandateId }: Readonly<MandateCommentsProps>) {
  const { toast } = useAppToast()

  // Current user for optimistic updates
  const { user: clerkUser } = useUser()
  const currentUser = clerkUser
    ? {
        id: clerkUser.id,
        name: clerkUser.fullName ?? clerkUser.firstName ?? null,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
        avatar: clerkUser.imageUrl ?? null,
      }
    : undefined

  // SWR hooks
  const { comments, isLoading } = useMandateComments(mandateId)
  const { addComment, isAdding } = useAddMandateComment(mandateId, {
    currentUser,
  })
  const { deleteComment, isDeleting } = useDeleteMandateComment(mandateId)

  // Local state
  const [newComment, setNewComment] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSubmit = async () => {
    const content = newComment.trim()
    if (!content) return

    try {
      await addComment({ content })
      setNewComment("")
      toast.success("commentAdded")
    } catch (err) {
      toast.error("commentFailed", {
        description:
          err instanceof Error ? err.message : "Failed to add comment",
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteComment({ commentId: deleteTarget })
      toast.success("commentDeleted")
    } catch (err) {
      toast.error("commentFailed", {
        description:
          err instanceof Error ? err.message : "Failed to delete comment",
      })
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault()
      handleSubmit()
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Add comment */}
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0">
          {currentUser?.avatar && <AvatarImage src={currentUser.avatar} />}
          <AvatarFallback className="text-xs">
            {currentUser
              ? getInitials(currentUser.name, currentUser.email)
              : "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-2">
          <Textarea
            placeholder="Add a comment..."
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
              Post
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
          No comments yet. Be the first to add one.
        </p>
      )}

      {!isLoading && comments.length > 0 && (
        <div className="space-y-4">
          {comments.map((comment) => {
            const commentUser = comment.user
            const isOwn = currentUser && commentUser?.id === currentUser.id

            return (
              <div
                key={comment.id}
                className="flex gap-3 group"
              >
                <Avatar className="h-8 w-8 shrink-0">
                  {commentUser?.avatar && (
                    <AvatarImage src={commentUser.avatar} />
                  )}
                  <AvatarFallback className="text-xs">
                    {commentUser
                      ? getInitials(
                          commentUser.name,
                          commentUser.email
                        )
                      : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {commentUser?.name ?? commentUser?.email ?? "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(
                        new Date(comment.createdAt),
                        "dd/MM/yyyy HH:mm"
                      )}
                    </span>
                    {isOwn && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(comment.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-muted-foreground hover:text-destructive"
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap mt-0.5">
                    {comment.content}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
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
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
