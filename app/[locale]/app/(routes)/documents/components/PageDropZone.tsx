"use client";

import { useState, useCallback, ReactNode } from "react";
import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { MassUploadModal } from "./MassUploadModal";

interface PageDropZoneProps {
  children: ReactNode;
}

export function PageDropZone({ children }: PageDropZoneProps) {
  const t = useTranslations("documents");
  const [showMassUpload, setShowMassUpload] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setPendingFiles(acceptedFiles);
      setShowMassUpload(true);
    }
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
    noClick: true, // Don't trigger on click, only on drop
    noKeyboard: true,
  });

  const handleModalClose = (open: boolean) => {
    setShowMassUpload(open);
    if (!open) {
      setPendingFiles([]);
    }
  };

  return (
    <>
      <div {...getRootProps()} className="relative min-h-screen">
        <input {...getInputProps()} />
        
        {/* Main Content */}
        {children}

        {/* Drag Active Overlay */}
        {isDragActive && (
          <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-none">
            <div className="bg-background border-2 border-dashed border-primary rounded-2xl p-16 text-center shadow-2xl">
              <Upload className="h-16 w-16 mx-auto text-primary mb-6 animate-bounce" />
              <p className="text-2xl font-semibold mb-2">{t("massUpload.dropFilesHere")}</p>
              <p className="text-muted-foreground">
                {t("massUpload.dragDropMultiple")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mass Upload Modal */}
      <MassUploadModal 
        open={showMassUpload} 
        onOpenChange={handleModalClose}
        initialFiles={pendingFiles}
      />
    </>
  );
}
