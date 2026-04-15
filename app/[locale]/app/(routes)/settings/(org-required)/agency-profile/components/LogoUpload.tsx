"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { Loader2, Upload, X, Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppToast } from "@/hooks/use-app-toast";

interface LogoUploadProps {
  currentLogo?: string | null;
  onChange: (url: string) => void;
  disabled?: boolean;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/svg+xml": [".svg"],
};

export function LogoUpload({ currentLogo, onChange, disabled }: LogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { toast } = useAppToast();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/agency-profile/upload-logo", {
          method: "POST",
          body: formData,
        });

        const data = await response.json() as { error?: string; url?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Upload failed");
        }

        if (data.url) {
          onChange(data.url);
        }

        toast.success("Logo uploaded", {
          description: "Your agency logo has been saved.",
          isTranslationKey: false,
        });
      } catch (error: unknown) {
        setPreview(null);
        const message =
          error instanceof Error ? error.message : "Failed to upload logo";
        toast.error("Upload failed", {
          description: message,
          isTranslationKey: false,
        });
      } finally {
        setIsUploading(false);
        URL.revokeObjectURL(previewUrl);
      }
    },
    [onChange, toast]
  );

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const urlToDelete = preview ?? currentLogo;
    setPreview(null);
    onChange("");

    if (urlToDelete?.includes("blob.vercel-storage.com")) {
      try {
        await fetch("/api/agency-profile/upload-logo", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlToDelete }),
        });
      } catch {
        // Silently ignore cleanup errors — the logo is already cleared from the form
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: ACCEPTED_TYPES,
      maxSize: MAX_SIZE,
      maxFiles: 1,
      disabled: isUploading || disabled,
    });

  // Show rejection errors (runs on next render, hook-safe outside JSX)
  if (fileRejections.length > 0) {
    const error = fileRejections[0]?.errors[0];
    if (error?.code === "file-too-large") {
      toast.error("File too large", {
        description: "Maximum file size is 5MB.",
        isTranslationKey: false,
      });
    } else if (error?.code === "file-invalid-type") {
      toast.error("Invalid file type", {
        description: "Only JPEG, PNG, WebP, and SVG are allowed.",
        isTranslationKey: false,
      });
    }
  }

  const displayLogo = preview ?? currentLogo;

  return (
    <div className="space-y-2">
      <div className="relative">
        <div
          {...getRootProps()}
          className={`
            relative h-32 rounded-lg border-2 border-dashed overflow-hidden
            flex items-center justify-center transition-all duration-200
            ${isDragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
            }
            ${isUploading || disabled
              ? "opacity-50 cursor-not-allowed"
              : "cursor-pointer"
            }
          `}
        >
          <input {...getInputProps()} />

          {displayLogo ? (
            <>
              <Image
                src={displayLogo}
                alt="Agency logo preview"
                fill
                className="object-contain p-3"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Upload className="h-5 w-5 text-white" />
                <span className="text-white text-sm font-medium">
                  {isDragActive ? "Drop to replace" : "Click to replace"}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
              {isDragActive ? (
                <>
                  <Upload className="h-8 w-8" />
                  <span className="text-sm">Drop logo here</span>
                </>
              ) : (
                <>
                  <Building2 className="h-8 w-8" />
                  <span className="text-sm font-medium">
                    Click or drag to upload logo
                  </span>
                </>
              )}
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
        </div>

        {displayLogo && !isUploading && !disabled && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-md"
            onClick={handleRemove}
            aria-label="Remove logo"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        JPEG, PNG, WebP, or SVG · Max 5MB · Square format recommended
      </p>
    </div>
  );
}
