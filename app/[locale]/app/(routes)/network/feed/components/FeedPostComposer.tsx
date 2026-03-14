"use client";

import { useState, useRef } from "react";
import {
  Send,
  Globe,
  Lock,
  Shield,
  Settings,
  Loader2,
  X,
  FileIcon,
  ImageIcon,
  Building2,
  User,
  ClipboardList,
  FileText,
  Paperclip,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "@/navigation";
import { useRouter } from "next/navigation";
import { useAppToast } from "@/hooks/use-app-toast";
import { createSocialPost } from "@/actions/social-feed/create-social-post";
import { type AttachmentData } from "@/components/attachments";
import {
  FeedAttachmentDialog,
  type AttachEntityType,
} from "./FeedAttachmentDialog";

type ProfileVisibility = "PRIVATE" | "SECURE" | "PUBLIC";

export interface ShareableItem {
  id: string;
  type: "property" | "client";
  title: string;
  subtitle?: string;
}

interface LinkedEntity {
  type: AttachEntityType;
  id: string;
  title: string;
}

interface FeedPostComposerProps {
  currentUser: any;
  shareableItems: {
    properties: ShareableItem[];
    clients: ShareableItem[];
  };
  profileVisibility: {
    hasProfile: boolean;
    visibility: ProfileVisibility;
  } | null;
  t: any;
}

const ENTITY_TYPE_ICON: Record<AttachEntityType, React.ElementType> = {
  property: Building2,
  client: User,
  mandate: ClipboardList,
  document: FileText,
};

export function FeedPostComposer({
  currentUser,
  shareableItems,
  profileVisibility,
  t,
}: FeedPostComposerProps) {
  const router = useRouter();
  const { toast } = useAppToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [postContent, setPostContent] = useState("");
  const [linkedEntity, setLinkedEntity] = useState<LinkedEntity | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  // ─── File upload ────────────────────────────────────────────────────────────

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const available = 5 - attachments.length;
    if (fileArray.length > available) {
      toast.error(`Can only attach ${available} more file(s)`);
      return;
    }

    setUploadingCount((c) => c + fileArray.length);

    const results = await Promise.all(
      fileArray.map(async (file) => {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 10 MB limit`);
          return null;
        }
        const fd = new FormData();
        fd.append("file", file);
        fd.append("entityType", "socialPost");
        try {
          const res = await fetch("/api/attachments/upload", {
            method: "POST",
            body: fd,
          });
          if (!res.ok) throw new Error("Upload failed");
          return (await res.json()) as AttachmentData;
        } catch {
          toast.error(`Failed to upload ${file.name}`);
          return null;
        }
      })
    );

    setUploadingCount((c) => c - fileArray.length);
    const successful = results.filter((r): r is AttachmentData => r !== null);
    if (successful.length > 0) {
      setAttachments((prev) => [...prev, ...successful]);
    }
  };

  const handleRemoveAttachment = async (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/attachments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setAttachments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error("Failed to remove attachment");
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // ─── Post ───────────────────────────────────────────────────────────────────

  const canPost =
    !isPosting &&
    uploadingCount === 0 &&
    (postContent.trim().length > 0 ||
      linkedEntity !== null ||
      attachments.length > 0);

  const handleCreatePost = async () => {
    if (!canPost) return;

    setIsPosting(true);
    try {
      const postType = linkedEntity?.type ?? "text";
      const result = await createSocialPost({
        type: postType,
        content: postContent,
        linkedEntityId: linkedEntity?.id,
        attachmentIds: attachments.map((a) => a.id),
      });

      toast.success(t?.createPost?.success || "Posted", {
        description: result.message,
        isTranslationKey: false,
      });

      setPostContent("");
      setLinkedEntity(null);
      setAttachments([]);
      router.refresh();
    } catch {
      toast.error(t?.createPost?.error || "Failed to post", {
        isTranslationKey: false,
      });
    } finally {
      setIsPosting(false);
    }
  };

  // ─── Visibility ─────────────────────────────────────────────────────────────

  const getVisibilityAlert = (visibility: ProfileVisibility) => {
    switch (visibility) {
      case "PRIVATE":
        return {
          icon: <Lock className="h-4 w-4 text-destructive" />,
          className: "border-destructive/50 bg-destructive/10",
          message:
            t?.privacy?.personal ||
            "Your profile is Private (hidden). Only your connections can see your posts.",
        };
      case "SECURE":
        return {
          icon: <Shield className="h-4 w-4 text-warning" />,
          className: "border-warning/50 bg-warning/10",
          message:
            t?.privacy?.secure ||
            "Your profile is Secure. Only registered users can see your posts.",
        };
      case "PUBLIC":
        return null;
    }
  };

  const visibilityAlert = profileVisibility
    ? getVisibilityAlert(profileVisibility.visibility)
    : null;

  const getVisibilityBadge = () => {
    if (!profileVisibility) return null;
    switch (profileVisibility.visibility) {
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
      case "PRIVATE":
        return (
          <Badge
            variant="outline"
            className="text-xs bg-destructive/10 text-destructive border-destructive/20"
          >
            <Lock className="h-3 w-3 mr-1" />
            {t?.visibility?.personal || "Private"}
          </Badge>
        );
      default:
        return null;
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Visibility Alert */}
      {visibilityAlert && (
        <Alert className={visibilityAlert.className}>
          {visibilityAlert.icon}
          <AlertDescription className="flex items-center justify-between gap-3">
            <span className="text-sm">{visibilityAlert.message}</span>
            <Button variant="outline" size="sm" className="flex-shrink-0" asChild>
              <Link href="/app/profile/public">
                <Settings className="h-3 w-3 mr-1" />
                {t?.privacy?.settings || "Settings"}
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Attachment dialog */}
      <FeedAttachmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        properties={shareableItems.properties}
        clients={shareableItems.clients}
        onEntitySelect={(type, id, title) => setLinkedEntity({ type, id, title })}
        onFileUploadRequested={() => fileInputRef.current?.click()}
      />

      {/* Composer Card */}
      <Card className="rounded-xl border shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={currentUser?.avatar} />
              <AvatarFallback>
                {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-3">
              {/* Author + visibility */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-foreground">
                  {currentUser?.name || "You"}
                </span>
                {getVisibilityBadge()}
              </div>

              {/* Text input */}
              <Textarea
                placeholder={
                  t?.createPost?.placeholder ||
                  "Share something with your network..."
                }
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                className="min-h-[80px] resize-none border-input focus-visible:ring-1"
              />

              {/* Attachment pills — linked entity + uploaded files */}
              {(linkedEntity || attachments.length > 0 || uploadingCount > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {/* Linked entity pill */}
                  {linkedEntity && (() => {
                    const Icon = ENTITY_TYPE_ICON[linkedEntity.type];
                    return (
                      <div className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs max-w-[220px]">
                        <Icon className="h-3 w-3 text-primary shrink-0" />
                        <span className="truncate text-primary font-medium">
                          {linkedEntity.title}
                        </span>
                        {!isPosting && (
                          <button
                            type="button"
                            className="ml-0.5 rounded-full p-0.5 text-primary/60 hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                            onClick={() => setLinkedEntity(null)}
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* File attachment pills */}
                  {attachments.map((a) => {
                    const isImage = a.fileType.startsWith("image/");
                    const Icon = isImage ? ImageIcon : FileIcon;
                    return (
                      <div
                        key={a.id}
                        className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-muted/70 border border-border/50 text-xs max-w-[200px]"
                      >
                        <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{a.fileName}</span>
                        {deletingIds.has(a.id) ? (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0 ml-0.5" />
                        ) : (
                          !isPosting && (
                            <button
                              type="button"
                              className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                              onClick={() => handleRemoveAttachment(a.id)}
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          )
                        )}
                      </div>
                    );
                  })}

                  {/* Uploading indicator pills */}
                  {uploadingCount > 0 &&
                    Array.from({ length: uploadingCount }).map((_, i) => (
                      <div
                        key={`uploading-${i}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/40 text-xs text-muted-foreground"
                      >
                        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                        <span>Uploading…</span>
                      </div>
                    ))}
                </div>
              )}

              {/* Toolbar */}
              <div className="flex items-center gap-2">
                {/* Attachment button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 gap-1.5 text-muted-foreground hover:text-foreground px-2.5"
                  onClick={() => setDialogOpen(true)}
                  disabled={isPosting}
                >
                  <Paperclip className="h-4 w-4" />
                  <span className="text-xs">Attach</span>
                </Button>

                <div className="flex-1" />

                <Button
                  onClick={handleCreatePost}
                  disabled={!canPost}
                  size="sm"
                >
                  {isPosting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {isPosting
                    ? t?.createPost?.posting || "Posting..."
                    : t?.createPost?.button || "Post"}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
