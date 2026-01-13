"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, File, X } from "lucide-react";
import { MentionInput, type MentionOption } from "./MentionInput";
import { EntityLinker } from "./EntityLinker";
import { MultiSelectOption } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (data: {
    file: File;
    document_name: string;
    description?: string;
    clientIds?: string[];
    propertyIds?: string[];
    eventIds?: string[];
    taskIds?: string[];
  }) => Promise<void>;
  mentionOptions?: MentionOption[];
  clientOptions?: MultiSelectOption[];
  propertyOptions?: MultiSelectOption[];
  eventOptions?: MultiSelectOption[];
  taskOptions?: MultiSelectOption[];
}

export function UploadModal({
  open,
  onOpenChange,
  onUpload,
  mentionOptions = [],
  clientOptions = [],
  propertyOptions = [],
  eventOptions = [],
  taskOptions = [],
}: UploadModalProps) {
  const t = useTranslations("documents");
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      if (!documentName) {
        setDocumentName(selectedFile.name);
      }
    }
  }, [documentName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
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
  });

  const handleUpload = async () => {
    if (!file || !documentName.trim()) {
      toast.error(t("uploadModal.selectFileAndName"));
      return;
    }

    setIsUploading(true);
    try {
      await onUpload({
        file,
        document_name: documentName.trim(),
        description: description.trim() || undefined,
        clientIds: selectedClientIds.length > 0 ? selectedClientIds : undefined,
        propertyIds: selectedPropertyIds.length > 0 ? selectedPropertyIds : undefined,
        eventIds: selectedEventIds.length > 0 ? selectedEventIds : undefined,
        taskIds: selectedTaskIds.length > 0 ? selectedTaskIds : undefined,
      });

      // Reset form
      setFile(null);
      setDocumentName("");
      setDescription("");
      setSelectedClientIds([]);
      setSelectedPropertyIds([]);
      setSelectedEventIds([]);
      setSelectedTaskIds([]);
      onOpenChange(false);
      toast.success(t("uploadModal.documentUploadedSuccess"));
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(t("uploadModal.failedToUpload"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFile(null);
      setDocumentName("");
      setDescription("");
      setSelectedClientIds([]);
      setSelectedPropertyIds([]);
      setSelectedEventIds([]);
      setSelectedTaskIds([]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("uploadModal.uploadDocument")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>{t("uploadModal.file")}</Label>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-fast
                ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
                hover:border-primary hover:bg-primary/5
              `}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <File className="h-5 w-5" />
                  <span className="font-medium">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {isDragActive
                      ? t("uploadModal.dropFileHere")
                      : t("uploadModal.dragDropOrClick")}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Document Name */}
          <div className="space-y-2">
            <Label htmlFor="document-name">{t("uploadModal.documentName")}</Label>
            <Input
              id="document-name"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder={t("uploadModal.documentNamePlaceholder")}
              required
            />
          </div>

          {/* Description with Mentions */}
          <div className="space-y-2">
            <Label htmlFor="description">{t("uploadModal.description")}</Label>
            <MentionInput
              value={description}
              onChange={setDescription}
              options={mentionOptions}
              placeholder={t("uploadModal.descriptionPlaceholder")}
            />
          </div>

          {/* Explicit Associations */}
          {(clientOptions.length > 0 ||
            propertyOptions.length > 0 ||
            eventOptions.length > 0 ||
            taskOptions.length > 0) && (
            <div className="space-y-2">
              <Label>{t("uploadModal.linkToEntities")}</Label>
              <EntityLinker
                clientOptions={clientOptions}
                propertyOptions={propertyOptions}
                eventOptions={eventOptions}
                taskOptions={taskOptions}
                selectedClientIds={selectedClientIds}
                selectedPropertyIds={selectedPropertyIds}
                selectedEventIds={selectedEventIds}
                selectedTaskIds={selectedTaskIds}
                onClientChange={setSelectedClientIds}
                onPropertyChange={setSelectedPropertyIds}
                onEventChange={setSelectedEventIds}
                onTaskChange={setSelectedTaskIds}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            {t("uploadModal.cancel")}
          </Button>
          <Button onClick={handleUpload} disabled={!file || !documentName.trim() || isUploading}>
            {isUploading ? t("uploadModal.uploading") : t("uploadModal.upload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
