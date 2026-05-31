"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Users } from "@prisma/client";
import { Loader2, Upload, X, Camera } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAppToast } from "@/hooks/use-app-toast";
import useAvatarStore from "@/store/useAvatarStore";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProfilePhotoUploadProps {
  user: Users;
}

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/gif": [".gif"],
};

export function ProfilePhotoUpload({ user }: ProfilePhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  
  const router = useRouter();
  const { toast } = useAppToast();
  const t = useTranslations("profile.photoUpload");
  const setAvatarStore = useAvatarStore((state) => state.setAvatar);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      // Show preview
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);

      // Upload file
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/profile/upload-avatar", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Upload failed");
        }

        // Update global avatar store
        setAvatarStore(data.url);

        toast.success(t("toast.updated"), { description: t("toast.updatedDesc"), isTranslationKey: false });

        router.refresh();
      } catch (error: any) {
        // Revert preview on error
        setPreview(null);
        toast.error(t("toast.uploadFailed"), { description: error.message || t("toast.uploadFailedDesc"), isTranslationKey: false });
      } finally {
        setIsUploading(false);
        URL.revokeObjectURL(previewUrl);
      }
    },
    [router, setAvatarStore, toast, t]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      accept: ACCEPTED_TYPES,
      maxSize: MAX_SIZE,
      maxFiles: 1,
      disabled: isUploading,
    });

  // Handle file rejections
  if (fileRejections.length > 0) {
    const rejection = fileRejections[0];
    const error = rejection.errors[0];
    if (error.code === "file-too-large") {
      toast.error(t("toast.fileTooLarge"), { description: t("toast.fileTooLargeDesc"), isTranslationKey: false });
    } else if (error.code === "file-invalid-type") {
      toast.error(t("toast.invalidType"), { description: t("toast.invalidTypeDesc"), isTranslationKey: false });
    }
  }

  const handleRemoveAvatar = async () => {
    setIsRemoving(true);
    try {
      const response = await fetch("/api/profile/upload-avatar", {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove avatar");
      }

      setAvatarStore("");
      setPreview(null);

      toast.success(t("toast.removed"), { description: t("toast.removedDesc"), isTranslationKey: false });

      router.refresh();
    } catch (error: any) {
      toast.error(t("toast.removeFailed"), { description: error.message || t("toast.removeFailedDesc"), isTranslationKey: false });
    } finally {
      setIsRemoving(false);
      setShowRemoveDialog(false);
    }
  };

  const currentAvatar = preview || user.avatar;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Avatar Preview */}
      <div className="relative group">
        <div
          {...getRootProps()}
          className={`
            relative w-32 h-32 rounded-full overflow-hidden cursor-pointer
            border-4 border-dashed transition-all duration-200
            ${isDragActive 
              ? "border-primary bg-primary/5 scale-105" 
              : "border-muted-foreground/25 hover:border-primary/50"
            }
            ${isUploading ? "opacity-50 cursor-wait" : ""}
          `}
        >
          <input {...getInputProps()} />
          
          {currentAvatar ? (
            <>
              <Image
                src={currentAvatar}
                alt="Profile photo"
                fill
                className="object-cover"
                priority
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="h-8 w-8 text-white" />
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Upload className="h-8 w-8" />
              <span className="text-xs">{t("upload")}</span>
            </div>
          )}

          {/* Loading overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
        </div>

        {/* Remove button */}
        {currentAvatar && !isUploading && (
          <Button
            variant="destructive"
            size="icon"
            aria-label={t("removePhoto")}
            className="absolute -top-2 -right-2 h-8 w-8 rounded-full shadow-lg"
            onClick={(e) => {
              e.stopPropagation();
              setShowRemoveDialog(true);
            }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center space-y-1">
        <p className="text-sm text-muted-foreground">
          {isDragActive ? t("dropHere") : t("clickOrDrag")}
        </p>
        <p className="text-xs text-muted-foreground/70">
          {t("fileHint")}
        </p>
      </div>

      {/* Remove confirmation dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAvatar}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("removing")}
                </>
              ) : (
                t("remove")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

