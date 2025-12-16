"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { el, enUS, type Locale } from "date-fns/locale";
import Container from "../../components/ui/Container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Trash2,
  Filter,
  Send,
  Building2,
  User,
  FileText,
  Globe,
  Lock,
  Users,
  UserPlus,
  Shield,
  Settings,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Reply,
  CornerDownRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { createSocialPost, getMyProfileVisibility } from "@/actions/social-feed/create-social-post";
import { AttachmentUploader, AttachmentList, type AttachmentData } from "@/components/attachments";
import { deleteSocialPost } from "@/actions/social-feed/delete-social-post";
import { toggleLikePost } from "@/actions/social-feed/like-post";
import { addComment, deleteComment, getPostComments, type Comment } from "@/actions/social-feed/comment-post";

type ProfileVisibility = "PERSONAL" | "SECURE" | "PUBLIC";

interface PostAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
}

export interface SocialPost {
  id: string;
  type: "property" | "client" | "text";
  content: string;
  timestamp: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    organizationName?: string;
    visibility?: ProfileVisibility;
  };
  linkedEntity?: {
    id: string;
    type: "property" | "client";
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

export interface ShareableItem {
  id: string;
  type: "property" | "client";
  title: string;
  subtitle?: string;
}

interface SocialFeedPageProps {
  posts: SocialPost[];
  shareableItems: {
    properties: ShareableItem[];
    clients: ShareableItem[];
  };
  currentUser: any;
  dict: any;
  locale: string;
}

// Post Card Component with like/comment functionality
function PostCard({
  post,
  currentUser,
  onDelete,
  t,
  dateLocale,
}: {
  post: SocialPost;
  currentUser: any;
  onDelete: (id: string) => void;
  t: any;
  dateLocale: Locale;
}) {
  // Optimistic state for likes
  const [isLiked, setIsLiked] = useState(post.isLiked || false);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [isLiking, startLikeTransition] = useTransition();

  // Comment state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentCount, setCommentCount] = useState(post.comments);
  const [commentInput, setCommentInput] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  
  // Reply state
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
  const [replyInput, setReplyInput] = useState("");
  const [isAddingReply, setIsAddingReply] = useState(false);

  const { toast } = useToast();

  // Handle like toggle with optimistic update
  const handleLike = () => {
    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((prev) => (wasLiked ? prev - 1 : prev + 1));

    startLikeTransition(async () => {
      const result = await toggleLikePost(post.id);
      if (!result.success) {
        // Revert on error
        setIsLiked(wasLiked);
        setLikeCount((prev) => (wasLiked ? prev + 1 : prev - 1));
        toast({
          variant: "destructive",
          title: result.error || "Failed to like post",
        });
      }
    });
  };

  // Load comments
  const loadComments = useCallback(async (loadMore = false) => {
    if (isLoadingComments) return;
    
    setIsLoadingComments(true);
    try {
      const result = await getPostComments(post.id, {
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
      setCommentCount(result.total);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to load comments",
      });
    } finally {
      setIsLoadingComments(false);
    }
  }, [post.id, nextCursor, isLoadingComments, toast]);

  // Toggle comments section
  const toggleComments = () => {
    if (!showComments && comments.length === 0) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  // Add comment
  const handleAddComment = async () => {
    if (!commentInput.trim() || isAddingComment) return;

    setIsAddingComment(true);
    try {
      const result = await addComment(post.id, commentInput);
      if (result.success && result.comment) {
        setComments((prev) => [...prev, result.comment!]);
        setCommentCount((prev) => prev + 1);
        setCommentInput("");
        toast({
          variant: "success",
          title: t?.post?.commentAdded || "Comment added",
        });
      } else {
        toast({
          variant: "destructive",
          title: result.error || "Failed to add comment",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to add comment",
      });
    } finally {
      setIsAddingComment(false);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: string, isReply = false, parentId?: string) => {
    try {
      const result = await deleteComment(commentId);
      if (result.success) {
        if (isReply && parentId) {
          // Remove reply from parent comment
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
        setCommentCount((prev) => prev - 1);
        toast({
          variant: "success",
          title: t?.post?.commentDeleted || "Comment deleted",
        });
      } else {
        toast({
          variant: "destructive",
          title: result.error || "Failed to delete comment",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to delete comment",
      });
    }
  };

  // Add reply to a comment
  const handleAddReply = async (parentCommentId: string) => {
    if (!replyInput.trim() || isAddingReply) return;

    setIsAddingReply(true);
    try {
      const result = await addComment(post.id, replyInput, parentCommentId);
      if (result.success && result.comment) {
        // Add reply to the parent comment's replies array
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
        setCommentCount((prev) => prev + 1);
        setReplyInput("");
        setReplyingTo(null);
        toast({
          variant: "success",
          title: t?.post?.replyAdded || "Reply added",
        });
      } else {
        toast({
          variant: "destructive",
          title: result.error || "Failed to add reply",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to add reply",
      });
    } finally {
      setIsAddingReply(false);
    }
  };

  // Cancel replying
  const cancelReply = () => {
    setReplyingTo(null);
    setReplyInput("");
  };

  const getActionText = (type: string) => {
    switch (type) {
      case "property":
        return t?.post?.sharedProperty || "shared a property";
      case "client":
        return t?.post?.sharedClient || "shared a client";
      default:
        return t?.post?.postedUpdate || "posted an update";
    }
  };

  const getEntityLink = () => {
    if (!post.linkedEntity) return "#";
    switch (post.linkedEntity.type) {
      case "property":
        return `/mls/properties/${post.linkedEntity.id}`;
      case "client":
        return `/crm/clients/${post.linkedEntity.id}`;
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
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getPostColor = (type: string) => {
    switch (type) {
      case "property":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "client":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getVisibilityBadge = () => {
    if (post.isFromConnection) {
      return (
        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Users className="h-3 w-3 mr-1" />
          {t?.visibility?.connection || "Connection"}
        </Badge>
      );
    }
    
    switch (post.author.visibility) {
      case "PUBLIC":
        return (
          <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
            <Globe className="h-3 w-3 mr-1" />
            {t?.visibility?.public || "Public"}
          </Badge>
        );
      case "SECURE":
        return (
          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
            <Shield className="h-3 w-3 mr-1" />
            {t?.visibility?.secure || "Secure"}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author.avatar} />
              <AvatarFallback>
                {post.author.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{post.author.name}</span>
                {getVisibilityBadge()}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{getActionText(post.type)}</span>
                <span>•</span>
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
        {post.content && <p className="text-sm whitespace-pre-wrap">{post.content}</p>}

        {/* Post Attachments */}
        {post.attachments && post.attachments.length > 0 && (
          <AttachmentList
            attachments={post.attachments}
            compact
          />
        )}

        {/* Linked Entity Card */}
        {post.linkedEntity && (
          <Link href={getEntityLink()}>
            <div className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`rounded-full p-2 ${getPostColor(post.linkedEntity.type)}`}>
                  {getPostIcon(post.linkedEntity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {post.linkedEntity.type === "client" 
                        ? (t?.badges?.client || "Client")
                        : post.linkedEntity.type === "property"
                        ? (t?.badges?.property || "Property")
                        : post.linkedEntity.type}
                    </Badge>
                  </div>
                  <h4 className="font-medium mt-1 truncate">{post.linkedEntity.title}</h4>
                  {post.linkedEntity.subtitle && (
                    <p className="text-sm text-muted-foreground truncate">
                      {post.linkedEntity.subtitle}
                    </p>
                  )}
                  {post.linkedEntity.metadata?.price && (
                    <p className="text-sm font-medium text-primary mt-1">
                      €{post.linkedEntity.metadata.price.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Actions Bar */}
        <div className="flex items-center gap-1 pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            disabled={isLiking}
            className={`flex-1 ${isLiked ? "text-red-500 hover:text-red-600" : "text-muted-foreground hover:text-primary"}`}
          >
            <Heart className={`h-4 w-4 mr-1.5 ${isLiked ? "fill-current" : ""}`} />
            {likeCount > 0 && <span className="mr-1">{likeCount}</span>}
            {t?.post?.like || "Like"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleComments}
            className="flex-1 text-muted-foreground hover:text-primary"
          >
            <MessageCircle className="h-4 w-4 mr-1.5" />
            {commentCount > 0 && <span className="mr-1">{commentCount}</span>}
            {t?.post?.comment || "Comment"}
            {showComments ? (
              <ChevronUp className="h-3 w-3 ml-1" />
            ) : (
              <ChevronDown className="h-3 w-3 ml-1" />
            )}
          </Button>
          <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground">
            <Share2 className="h-4 w-4 mr-1.5" />
            {t?.post?.share || "Share"}
          </Button>
        </div>

        {/* Comments Section */}
        <Collapsible open={showComments}>
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
                            <span className="font-medium text-sm">{comment.author.name}</span>
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
                          <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                        {/* Reply button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 mt-1 text-xs text-muted-foreground hover:text-primary"
                          onClick={() => setReplyingTo({ id: comment.id, authorName: comment.author.name })}
                        >
                          <Reply className="h-3 w-3 mr-1" />
                          {t?.post?.reply || "Reply"}
                        </Button>
                      </div>
                    </div>

                    {/* Reply Input (when replying to this comment) */}
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
                            {t?.post?.replyingTo || "Replying to"} <span className="font-medium">{replyingTo.authorName}</span>
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder={t?.post?.writeReply || "Write a reply..."}
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
                          <div key={reply.id} className="flex items-start gap-2 group">
                            <CornerDownRight className="h-4 w-4 text-muted-foreground mt-2" />
                            <Avatar className="h-7 w-7">
                              <AvatarImage src={reply.author.avatar} />
                              <AvatarFallback className="text-xs">
                                {reply.author.name?.charAt(0)?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 bg-muted/30 rounded-lg px-3 py-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-sm">{reply.author.name}</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(reply.createdAt), {
                                      addSuffix: true,
                                      locale: dateLocale,
                                    })}
                                  </span>
                                  {reply.isOwn && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => handleDeleteComment(reply.id, true, comment.id)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <p className="text-sm mt-1 whitespace-pre-wrap">{reply.content}</p>
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
                    {isLoadingComments ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {t?.post?.loadMoreComments || "Load more comments"}
                  </Button>
                )}
              </div>
            )}

            {/* Empty State */}
            {!isLoadingComments && comments.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                {t?.post?.noComments || "No comments yet. Be the first to comment!"}
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

export function SocialFeedPage({ posts, shareableItems, currentUser, dict, locale }: SocialFeedPageProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [filter, setFilter] = useState<string>("all");
  const [postContent, setPostContent] = useState("");
  const [postType, setPostType] = useState<"property" | "client" | "text">("text");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [isPosting, setIsPosting] = useState(false);
  const [profileVisibility, setProfileVisibility] = useState<{ hasProfile: boolean; visibility: ProfileVisibility } | null>(null);
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);
  
  const t = dict.socialFeed || {};
  const dateLocale = locale === "el" ? el : enUS;

  useEffect(() => {
    getMyProfileVisibility().then(setProfileVisibility);
  }, []);

  const filteredPosts = filter === "all" 
    ? posts 
    : posts.filter(p => {
        if (filter === "properties") return p.type === "property";
        if (filter === "clients") return p.type === "client";
        if (filter === "updates") return p.type === "text";
        return true;
      });

  const handleCreatePost = async () => {
    if (!postContent.trim() && postType === "text" && attachments.length === 0) return;
    if ((postType === "property" || postType === "client") && !selectedEntityId) return;

    setIsPosting(true);
    try {
      const result = await createSocialPost({
        type: postType,
        content: postContent,
        linkedEntityId: selectedEntityId || undefined,
        attachmentIds: attachments.map(a => a.id),
      });

      toast({
        variant: "success",
        title: t.createPost?.success || "Posted successfully!",
        description: result.message,
      });

      setPostContent("");
      setPostType("text");
      setSelectedEntityId("");
      setAttachments([]);
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t.createPost?.error || "Failed to create post",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteSocialPost(postId);
      toast({
        variant: "success",
        title: t.post?.deleted || "Post deleted",
      });
      router.refresh();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to delete post",
      });
    }
  };

  const getVisibilityAlert = (visibility: ProfileVisibility) => {
    switch (visibility) {
      case "PERSONAL":
        return {
          icon: <Lock className="h-4 w-4 text-red-600" />,
          className: "border-red-500/50 bg-red-500/10",
          message: t?.privacy?.personal || "Your profile is Personal (hidden). Only your connections can see your posts.",
        };
      case "SECURE":
        return {
          icon: <Shield className="h-4 w-4 text-amber-600" />,
          className: "border-amber-500/50 bg-amber-500/10",
          message: t?.privacy?.secure || "Your profile is Secure. Only registered users can see your posts.",
        };
      case "PUBLIC":
        return null;
    }
  };

  const visibilityAlert = profileVisibility ? getVisibilityAlert(profileVisibility.visibility) : null;

  return (
    <Container
      title={t.title || "Social Feed"}
      description={t.description || "Share properties and clients with your connections"}
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Visibility Banner */}
        {visibilityAlert && (
          <Alert className={visibilityAlert.className}>
            {visibilityAlert.icon}
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">{visibilityAlert.message}</span>
              <Button variant="outline" size="sm" asChild>
                <Link href="/profile/public">
                  <Settings className="h-3 w-3 mr-1" />
                  {t.privacy?.settings || "Settings"}
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Create Post */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={currentUser?.avatar} />
                <AvatarFallback>
                  {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder={t.createPost?.placeholder || "Share something with your network..."}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="min-h-[80px] resize-none"
                />

                {/* Attachment Uploader */}
                <AttachmentUploader
                  entityType="socialPost"
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
                  disabled={isPosting}
                />
                
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={postType} onValueChange={(v: any) => {
                    setPostType(v);
                    setSelectedEntityId("");
                  }}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t.createPost?.selectType || "What to share?"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {t.createPost?.text || "Share an Update"}
                        </div>
                      </SelectItem>
                      <SelectItem value="property">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          {t.createPost?.property || "Share a Property"}
                        </div>
                      </SelectItem>
                      <SelectItem value="client">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {t.createPost?.client || "Share a Client"}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {postType === "property" && (
                    <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder={t.createPost?.selectProperty || "Select a property"} />
                      </SelectTrigger>
                      <SelectContent>
                        {shareableItems.properties.length === 0 ? (
                          <SelectItem value="__none__" disabled>
                            {t.createPost?.noProperties || "No properties available"}
                          </SelectItem>
                        ) : (
                          shareableItems.properties.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.title}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}

                  {postType === "client" && (
                    <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder={t.createPost?.selectClient || "Select a client"} />
                      </SelectTrigger>
                      <SelectContent>
                        {shareableItems.clients.length === 0 ? (
                          <SelectItem value="__none__" disabled>
                            {t.createPost?.noClients || "No clients available"}
                          </SelectItem>
                        ) : (
                          shareableItems.clients.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.title}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}

                  <div className="flex-1" />
                  
                  <Button 
                    onClick={handleCreatePost} 
                    disabled={isPosting || (!postContent.trim() && postType === "text" && attachments.length === 0) || ((postType === "property" || postType === "client") && !selectedEntityId)}
                  >
                    {isPosting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    {isPosting ? (t.createPost?.posting || "Posting...") : (t.createPost?.button || "Post")}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.filters?.all || "All Posts"}</SelectItem>
                <SelectItem value="properties">{t.filters?.properties || "Properties"}</SelectItem>
                <SelectItem value="clients">{t.filters?.clients || "Clients"}</SelectItem>
                <SelectItem value="updates">{t.filters?.updates || "Updates"}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/connections">
              <UserPlus className="h-4 w-4 mr-2" />
              {t.findAgents || "Find Agents"}
            </Link>
          </Button>
        </div>

        {/* Posts */}
        {filteredPosts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Share2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">{t.empty?.title || "No posts yet"}</h3>
              <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">
                {t.empty?.description || "Be the first to share something with your network, or connect with other agents to see their posts."}
              </p>
              <div className="flex gap-2 mt-4">
                <Button asChild variant="outline">
                  <Link href="/connections">
                    <Users className="h-4 w-4 mr-2" />
                    {t.empty?.findConnections || "Find Connections"}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map((post) => (
              <PostCard
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
    </Container>
  );
}
