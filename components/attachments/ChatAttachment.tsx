"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  Download,
  FileIcon,
  FileText,
  FileSpreadsheet,
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

interface ChatAttachmentProps {
  url: string;
  fileName: string;
  fileSize?: number;
  fileType: string;
  isOwn?: boolean; // Whether this is the current user's message (affects styling)
  className?: string;
}

export function ChatAttachment({
  url,
  fileName,
  fileSize,
  fileType,
  isOwn = false,
  className,
}: Readonly<ChatAttachmentProps>) {
  const t = useTranslations("attachments");
  const [showPreview, setShowPreview] = React.useState(false);
  const isImage = fileType.startsWith("image/");

  const getFileIcon = () => {
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

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  if (isImage) {
    return (
      <>
        <div className={cn("mt-2", className)}>
          <div className="relative group rounded-lg overflow-hidden bg-black/5 max-w-[250px]">
            <button
              type="button"
              className="w-full block border-0 bg-transparent p-0 cursor-pointer"
              onClick={() => setShowPreview(true)}
              aria-label={`View ${fileName} in full size`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={fileName}
                className="w-full h-auto max-h-[200px] object-contain"
              />
            </button>
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none">
              <div className="flex gap-2 pointer-events-auto">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setShowPreview(true)}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <p className={cn(
            "text-xs mt-1 truncate max-w-[250px]",
            isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {fileName}
            {fileSize && ` (${formatFileSize(fileSize)})`}
          </p>
        </div>

        {/* Image Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="truncate">{fileName}</DialogTitle>
            </DialogHeader>
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={fileName}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t("download")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Non-image file
  const Icon = getFileIcon();
  return (
    <div className={cn("mt-2", className)}>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg text-xs transition-colors max-w-[250px]",
          isOwn 
            ? "bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground" 
            : "bg-muted hover:bg-muted/80 text-foreground"
        )}
      >
        <div className={cn(
          "rounded p-1.5 shrink-0",
          isOwn ? "bg-primary-foreground/20" : "bg-background"
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate font-medium">{fileName}</p>
          {fileSize && (
            <p className={cn(
              "text-[10px]",
              isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              {formatFileSize(fileSize)}
            </p>
          )}
        </div>
        <Download className="h-4 w-4 shrink-0 opacity-60" />
      </a>
    </div>
  );
}


