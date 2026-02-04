"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Upload,
  X,
  FileIcon,
  ImageIcon,
  FileText,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

interface AttachmentUploaderProps {
  entityType: "socialPost" | "feedback";
  entityId?: string;
  attachments: AttachmentData[];
  onAttachmentsChange: (attachments: AttachmentData[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
}

const MAX_FILE_SIZE_MB = 10;
const MAX_FILES = 5;

export function AttachmentUploader({
  entityType,
  entityId,
  attachments,
  onAttachmentsChange,
  maxFiles = MAX_FILES,
  maxSizeMB = MAX_FILE_SIZE_MB,
  disabled = false,
  className,
}: AttachmentUploaderProps) {
  const t = useTranslations("attachments");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [uploadingFiles, setUploadingFiles] = React.useState<
    { name: string; progress: number }[]
  >([]);

  const canAddMore = attachments.length + uploadingFiles.length < maxFiles;

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

  const uploadFile = async (file: File): Promise<AttachmentData | null> => {
    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(t("fileTooLarge", { maxSize: maxSizeMB }));
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("entityType", entityType);
    if (entityId) {
      formData.append("entityId", entityId);
    }

    try {
      const response = await fetch("/api/attachments/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();
      return data as AttachmentData;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        error instanceof Error ? error.message : t("uploadError")
      );
      return null;
    }
  };

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const availableSlots = maxFiles - attachments.length - uploadingFiles.length;

    if (fileArray.length > availableSlots) {
      toast.error(t("tooManyFiles", { max: maxFiles }));
      return;
    }

    // Add files to uploading state
    setUploadingFiles((prev) => [
      ...prev,
      ...fileArray.map((f) => ({ name: f.name, progress: 0 })),
    ]);

    // Upload files
    const uploadPromises = fileArray.map(async (file, index) => {
      const result = await uploadFile(file);

      // Update progress (simulate since we don't have real progress events)
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.name === file.name ? { ...f, progress: 100 } : f
        )
      );

      return result;
    });

    const results = await Promise.all(uploadPromises);
    const successfulUploads = results.filter(
      (r): r is AttachmentData => r !== null
    );

    // Remove from uploading state and add to attachments
    setUploadingFiles((prev) =>
      prev.filter((f) => !fileArray.some((file) => file.name === f.name))
    );

    if (successfulUploads.length > 0) {
      onAttachmentsChange([...attachments, ...successfulUploads]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled && canAddMore) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled || !canAddMore) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = async (attachment: AttachmentData) => {
    try {
      const response = await fetch(`/api/attachments/${attachment.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      onAttachmentsChange(attachments.filter((a) => a.id !== attachment.id));
      toast.success(t("deleted"));
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(t("deleteError"));
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop Zone */}
      {canAddMore && (
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-4 transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            disabled && "opacity-50 pointer-events-none"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-sm">
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                {t("clickToUpload")}
              </button>
              <span className="text-muted-foreground">
                {" "}
                {t("orDragDrop")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("maxSize", { size: maxSizeMB })} • {t("maxFiles", { count: maxFiles })}
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={disabled}
          />
        </div>
      )}

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file) => (
            <div
              key={file.name}
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
            >
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{file.name}</p>
                <Progress value={file.progress} className="h-1 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attached Files */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => {
            const Icon = getFileIcon(attachment.fileType);
            const isImage = attachment.fileType.startsWith("image/");

            return (
              <div
                key={attachment.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 group"
              >
                {isImage ? (
                  <div className="h-10 w-10 rounded overflow-hidden flex-shrink-0">
                    <img
                      src={attachment.url}
                      alt={attachment.fileName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{attachment.fileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.fileSize)}
                  </p>
                </div>
                {!disabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemove(attachment)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* File count indicator */}
      {attachments.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {attachments.length}/{maxFiles} {t("filesAttached")}
        </p>
      )}
    </div>
  );
}






