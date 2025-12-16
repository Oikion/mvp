"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Download,
  FileIcon,
  ImageIcon,
  FileText,
  FileSpreadsheet,
  X,
  ExternalLink,
  Maximize2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface AttachmentData {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  createdAt?: string;
}

interface AttachmentListProps {
  attachments: AttachmentData[];
  onDelete?: (attachment: AttachmentData) => void;
  canDelete?: boolean;
  compact?: boolean;
  className?: string;
}

export function AttachmentList({
  attachments,
  onDelete,
  canDelete = false,
  compact = false,
  className,
}: AttachmentListProps) {
  const t = useTranslations("attachments");
  const [previewImage, setPreviewImage] = React.useState<AttachmentData | null>(
    null
  );

  if (attachments.length === 0) return null;

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return ImageIcon;
    if (fileType.includes("pdf")) return FileText;
    if (fileType.includes("spreadsheet") || fileType.includes("excel"))
      return FileSpreadsheet;
    return FileIcon;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDelete = async (attachment: AttachmentData) => {
    if (!onDelete) return;

    try {
      const response = await fetch(`/api/attachments/${attachment.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      onDelete(attachment);
      toast.success(t("deleted"));
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(t("deleteError"));
    }
  };

  const handleDownload = (attachment: AttachmentData) => {
    const link = document.createElement("a");
    link.href = attachment.url;
    link.download = attachment.fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Check if there are any images for gallery view
  const images = attachments.filter((a) => a.fileType.startsWith("image/"));
  const files = attachments.filter((a) => !a.fileType.startsWith("image/"));

  return (
    <div className={cn("space-y-3", className)}>
      {/* Image Gallery */}
      {images.length > 0 && (
        <div
          className={cn(
            "grid gap-2",
            images.length === 1
              ? "grid-cols-1"
              : images.length === 2
              ? "grid-cols-2"
              : "grid-cols-3"
          )}
        >
          {images.map((attachment) => (
            <div
              key={attachment.id}
              className="relative group rounded-lg overflow-hidden bg-muted aspect-video"
            >
              <img
                src={attachment.url}
                alt={attachment.fileName}
                className="h-full w-full object-cover cursor-pointer"
                onClick={() => setPreviewImage(attachment)}
                onKeyDown={(e) => e.key === "Enter" && setPreviewImage(attachment)}
                tabIndex={0}
                role="button"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPreviewImage(attachment)}
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(attachment)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {canDelete && onDelete && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDelete(attachment)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((attachment) => {
            const Icon = getFileIcon(attachment.fileType);

            return (
              <div
                key={attachment.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border bg-card group",
                  compact ? "p-2" : "p-3"
                )}
              >
                <div
                  className={cn(
                    "rounded flex items-center justify-center flex-shrink-0 bg-muted",
                    compact ? "h-8 w-8" : "h-10 w-10"
                  )}
                >
                  <Icon
                    className={cn(
                      "text-muted-foreground",
                      compact ? "h-4 w-4" : "h-5 w-5"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "truncate font-medium",
                      compact ? "text-xs" : "text-sm"
                    )}
                  >
                    {attachment.fileName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.fileSize)}
                  </p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => window.open(attachment.url, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleDownload(attachment)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  {canDelete && onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(attachment)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="truncate">
              {previewImage?.fileName}
            </DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="relative">
              <img
                src={previewImage.url}
                alt={previewImage.fileName}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownload(previewImage)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t("download")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
