"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, File, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/navigation";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FileWithName {
  file: File;
  name: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface MassUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFiles?: File[];
}

export function MassUploadModal({ open, onOpenChange, initialFiles }: MassUploadModalProps) {
  const t = useTranslations("documents");
  const router = useRouter();
  
  const [files, setFiles] = useState<FileWithName[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Handle initial files from drag-drop
  useEffect(() => {
    if (open && initialFiles && initialFiles.length > 0) {
      const newFiles: FileWithName[] = initialFiles.map(file => ({
        file,
        name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        status: "pending" as const,
      }));
      setFiles(newFiles);
    }
  }, [open, initialFiles]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: FileWithName[] = acceptedFiles.map(file => ({
      file,
      name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
      status: "pending" as const,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/plain": [".txt"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateFileName = (index: number, newName: string) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, name: newName } : f));
  };

  const handleUploadAll = async () => {
    if (files.length === 0) return;

    // Validate all files have names
    const invalidFiles = files.filter(f => !f.name.trim());
    if (invalidFiles.length > 0) {
      toast.error(t("massUpload.allFilesMustHaveNames"));
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    let successCount = 0;
    let errorCount = 0;

    // Upload files sequentially to avoid overwhelming the server
    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i];
      
      // Update status to uploading
      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: "uploading" as const } : f
      ));

      try {
        const formData = new FormData();
        formData.append("file", fileItem.file);
        formData.append("document_name", fileItem.name.trim());

        const response = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Upload failed");
        }

        // Update status to success
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: "success" as const } : f
        ));
        successCount++;
      } catch (error) {
        // Update status to error
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { 
            ...f, 
            status: "error" as const,
            error: error instanceof Error ? error.message : "Upload failed"
          } : f
        ));
        errorCount++;
      }

      // Update progress
      setUploadProgress(((i + 1) / files.length) * 100);
    }

    setIsUploading(false);

    // Show summary toast
    if (errorCount === 0) {
      toast.success(t("massUpload.allUploaded", { count: successCount }));
      setTimeout(() => {
        onOpenChange(false);
        setFiles([]);
        setUploadProgress(0);
        router.refresh();
      }, 1500);
    } else if (successCount === 0) {
      toast.error(t("massUpload.allFailed"));
    } else {
      toast.warning(t("massUpload.partialSuccess", { success: successCount, failed: errorCount }));
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFiles([]);
      setUploadProgress(0);
      onOpenChange(false);
    }
  };

  const getStatusIcon = (status: FileWithName["status"]) => {
    switch (status) {
      case "uploading":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("massUpload.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden flex flex-col">
          {/* Drop Zone */}
          {!isUploading && (
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
                transition-colors duration-fast
                ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
                hover:border-primary hover:bg-primary/5
              `}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {isDragActive
                  ? t("massUpload.dropFilesHere")
                  : t("massUpload.dragDropMultiple")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {t("massUpload.supportedFormats")}
              </p>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("massUpload.uploading")} ({files.filter(f => f.status === "success").length} / {files.length})
                </span>
                <span className="font-medium">{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Files List */}
          {files.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <Label className="mb-2">
                {t("massUpload.filesSelected", { count: files.length })}
              </Label>
              <ScrollArea className="flex-1 border rounded-lg">
                <div className="p-4 space-y-3">
                  {files.map((fileItem, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="mt-1">
                        {getStatusIcon(fileItem.status)}
                      </div>
                      
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground truncate">
                            {fileItem.file.name}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            ({(fileItem.file.size / 1024).toFixed(1)} KB)
                          </span>
                        </div>
                        
                        <Input
                          value={fileItem.name}
                          onChange={(e) => updateFileName(index, e.target.value)}
                          placeholder={t("uploadModal.documentNamePlaceholder")}
                          disabled={isUploading || fileItem.status === "success"}
                          className="h-8 text-sm"
                        />
                        
                        {fileItem.error && (
                          <p className="text-xs text-destructive">{fileItem.error}</p>
                        )}
                      </div>

                      {!isUploading && fileItem.status !== "success" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove file"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {isUploading ? t("massUpload.pleaseWait") : t("uploadModal.cancel")}
          </Button>
          <Button
            onClick={handleUploadAll}
            disabled={files.length === 0 || isUploading || files.some(f => !f.name.trim())}
            leftIcon={isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          >
            {isUploading 
              ? t("massUpload.uploading")
              : t("massUpload.uploadAll", { count: files.length })
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
