"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, File, X, Loader2, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuickUploadZoneProps {
  className?: string;
}

export function QuickUploadZone({ className }: QuickUploadZoneProps) {
  const t = useTranslations("documents");
  const router = useRouter();
  
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showNameDialog, setShowNameDialog] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      // Auto-set document name from file name (without extension)
      const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
      setDocumentName(nameWithoutExt);
      setShowNameDialog(true);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/plain": [".txt"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    maxFiles: 1,
    noClick: true,
    noKeyboard: true,
  });

  const handleUpload = async () => {
    if (!file || !documentName.trim()) {
      toast.error(t("uploadModal.selectFileAndName"));
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_name", documentName.trim());

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = t("documentGrid.failedToUpload");
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
          // If parsing fails, use the default message
        }
        throw new Error(errorMessage);
      }

      toast.success(t("uploadModal.documentUploadedSuccess"));
      setShowNameDialog(false);
      setFile(null);
      setDocumentName("");
      router.refresh();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(error instanceof Error ? error.message : t("uploadModal.failedToUpload"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setShowNameDialog(false);
    setFile(null);
    setDocumentName("");
  };

  return (
    <>
      {/* Drop Zone - Hidden but active for drag-drop */}
      <div
        {...getRootProps()}
        className={cn(
          "relative",
          isDragActive && "after:absolute after:inset-0 after:bg-primary/10 after:border-2 after:border-dashed after:border-primary after:rounded-lg after:z-50",
          className
        )}
      >
        <input {...getInputProps()} />
        
        {/* Upload Button */}
        <Button onClick={open} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {t("documentGrid.uploadDocument")}
        </Button>

        {/* Drag Active Overlay */}
        {isDragActive && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 flex items-center justify-center">
            <div className="bg-background border-2 border-dashed border-primary rounded-xl p-12 text-center shadow-lg">
              <Upload className="h-12 w-12 mx-auto text-primary mb-4" />
              <p className="text-lg font-medium">{t("uploadModal.dropFileHere")}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("uploadModal.dragDropOrClick")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Quick Name Dialog */}
      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("uploadModal.uploadDocument")}</DialogTitle>
            <DialogDescription>
              {t("quickUploadDescription") || "Give your document a name and upload"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {/* File Preview */}
            {file && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <File className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 flex-shrink-0"
                  onClick={() => {
                    setFile(null);
                    setShowNameDialog(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* Document Name Input */}
            <div className="space-y-2">
              <Label htmlFor="quick-doc-name">{t("uploadModal.documentName")}</Label>
              <Input
                id="quick-doc-name"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder={t("uploadModal.documentNamePlaceholder")}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancel} disabled={isUploading}>
              {t("uploadModal.cancel")}
            </Button>
            <Button onClick={handleUpload} disabled={!documentName.trim() || isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("uploadModal.uploading")}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t("uploadModal.upload")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}







