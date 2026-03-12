"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  Upload,
  Star,
  Trash2,
  GripVertical,
  Loader2,
  ImagePlus,
  AlertCircle,
} from "lucide-react";
import { deletePropertyImage } from "@/actions/mls/property-images/delete-property-image";
import { reorderPropertyImages } from "@/actions/mls/property-images/reorder-property-images";
import { setPrimaryImage } from "@/actions/mls/property-images/set-primary-image";
import {
  getPropertyImages,
  getSessionImages,
} from "@/actions/mls/property-images/get-property-images";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PropertyImageData {
  id: string;
  url: string;
  blobPathname: string;
  width: number | null;
  height: number | null;
  fileSize: number;
  originalFileSize: number;
  mimeType: string;
  originalFileName: string;
  position: number;
  isPrimary: boolean;
  savingsPercent?: number;
  // Optimistic UI during upload
  isUploading?: boolean;
  previewUrl?: string;
  uploadProgress?: number;
  uploadError?: string;
}

export interface PropertyImageUploaderProps {
  propertyId?: string;
  uploadSessionId?: string;
  maxImages?: number;
  disabled?: boolean;
  onImagesChange?: (images: PropertyImageData[]) => void;
}

// ---------------------------------------------------------------------------
// SortableImageItem (inline component)
// ---------------------------------------------------------------------------

interface SortableImageItemProps {
  image: PropertyImageData;
  onSetPrimary: (id: string) => void;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  onDismissError: (id: string) => void;
  isSettingPrimary: string | null;
  isDeleting: string | null;
  t: ReturnType<typeof useTranslations>;
}

function SortableImageItem({
  image,
  onSetPrimary,
  onDelete,
  onRetry,
  onDismissError,
  isSettingPrimary,
  isDeleting,
  t,
}: SortableImageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isLoading = image.isUploading;
  const hasError = !!image.uploadError;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group aspect-square rounded-lg overflow-hidden border-2 ${
        image.isPrimary
          ? "border-yellow-400 ring-2 ring-yellow-400/30"
          : "border-border"
      } ${isDragging ? "z-50 shadow-xl" : ""}`}
    >
      {/* Image thumbnail */}
      <img
        src={image.previewUrl || image.url}
        alt={image.originalFileName}
        className="w-full h-full object-cover"
      />

      {/* Upload progress overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 text-white animate-spin" />
          {image.uploadProgress != null && (
            <div className="w-3/4">
              <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-200"
                  style={{ width: `${image.uploadProgress}%` }}
                />
              </div>
              <p className="text-white text-xs text-center mt-1">
                {Math.round(image.uploadProgress)}%
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error overlay */}
      {hasError && (
        <div className="absolute inset-0 bg-destructive/80 flex flex-col items-center justify-center gap-2 p-2">
          <AlertCircle className="h-6 w-6 text-white" />
          <p className="text-white text-xs text-center line-clamp-2">
            {image.uploadError}
          </p>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="h-7 text-xs"
              onClick={() => onRetry(image.id)}
            >
              {t("propertyImages.retry")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-white hover:text-white"
              onClick={() => onDismissError(image.id)}
            >
              {t("propertyImages.dismiss")}
            </Button>
          </div>
        </div>
      )}

      {/* Hover controls overlay (hidden during upload/error) */}
      {!isLoading && !hasError && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
          {/* Top-left: Star / primary toggle */}
          <button
            type="button"
            className={`absolute top-1.5 left-1.5 p-1.5 rounded-full transition-all ${
              image.isPrimary
                ? "bg-yellow-400 text-yellow-900 opacity-100"
                : "bg-black/50 text-white opacity-0 group-hover:opacity-100 hover:bg-yellow-400 hover:text-yellow-900"
            } ${
              // Always show on touch devices
              "max-sm:opacity-100"
            }`}
            onClick={() => onSetPrimary(image.id)}
            disabled={isSettingPrimary === image.id || image.isPrimary}
            title={t("propertyImages.setPrimary")}
          >
            {isSettingPrimary === image.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Star
                className={`h-4 w-4 ${image.isPrimary ? "fill-current" : ""}`}
              />
            )}
          </button>

          {/* Top-right: Delete */}
          <button
            type="button"
            className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 max-sm:opacity-100 hover:bg-destructive transition-all"
            onClick={() => onDelete(image.id)}
            disabled={isDeleting === image.id}
            title={t("propertyImages.delete")}
          >
            {isDeleting === image.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>

          {/* Bottom: Drag handle */}
          <button
            type="button"
            className="absolute bottom-1.5 left-1/2 -translate-x-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 max-sm:opacity-100 cursor-grab active:cursor-grabbing transition-all"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          {/* Primary badge */}
          {image.isPrimary && (
            <Badge className="absolute bottom-1.5 left-1.5 bg-yellow-400 text-yellow-900 hover:bg-yellow-400 text-[10px] px-1.5 py-0">
              {t("propertyImages.primary")}
            </Badge>
          )}

          {/* Savings badge */}
          {image.savingsPercent != null && image.savingsPercent > 0 && (
            <Badge
              variant="secondary"
              className="absolute bottom-1.5 right-1.5 text-[10px] px-1.5 py-0 opacity-0 group-hover:opacity-100 max-sm:opacity-100 transition-all"
            >
              {t("propertyImages.saved", {
                percent: Math.round(image.savingsPercent),
              })}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PropertyImageUploader (main component)
// ---------------------------------------------------------------------------

export function PropertyImageUploader({
  propertyId,
  uploadSessionId,
  maxImages = 20,
  disabled = false,
  onImagesChange,
}: PropertyImageUploaderProps) {
  const t = useTranslations("mls");
  const { toast } = useAppToast();
  const [images, setImages] = useState<PropertyImageData[]>([]);
  const [isSettingPrimary, setIsSettingPrimary] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Keep refs for retry: maps temp id -> File
  const retryFilesRef = useRef<Map<string, File>>(new Map());
  // Track preview URLs for cleanup
  const previewUrlsRef = useRef<Set<string>>(new Set());

  // Notify parent on change
  const updateImages = useCallback(
    (updater: (prev: PropertyImageData[]) => PropertyImageData[]) => {
      setImages((prev) => {
        const next = updater(prev);
        onImagesChange?.(next.filter((img) => !img.isUploading && !img.uploadError));
        return next;
      });
    },
    [onImagesChange]
  );

  // ---------------------------------------------------------------------------
  // State Recovery on Mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function loadImages() {
      try {
        let fetched: PropertyImageData[] = [];
        if (propertyId) {
          fetched = await getPropertyImages(propertyId);
        } else if (uploadSessionId) {
          fetched = await getSessionImages(uploadSessionId);
        }
        if (!cancelled) {
          setImages(fetched);
          onImagesChange?.(fetched);
        }
      } catch {
        // Silently fail — empty grid is fine
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadImages();
    return () => {
      cancelled = true;
    };
  }, [propertyId, uploadSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Cleanup preview URLs on unmount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const urls = previewUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // DnD sensors
  // ---------------------------------------------------------------------------

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ---------------------------------------------------------------------------
  // Upload a single file
  // ---------------------------------------------------------------------------

  const uploadFile = useCallback(
    async (file: File, tempId: string) => {
      const formData = new FormData();
      formData.append("file", file);
      if (propertyId) formData.append("propertyId", propertyId);
      if (uploadSessionId) formData.append("uploadSessionId", uploadSessionId);

      try {
        const response = await axios.post(
          "/api/mls/property-images/upload",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percent = Math.round(
                  (progressEvent.loaded * 100) / progressEvent.total
                );
                setImages((prev) =>
                  prev.map((img) =>
                    img.id === tempId ? { ...img, uploadProgress: percent } : img
                  )
                );
              }
            },
          }
        );

        const data = response.data as PropertyImageData;

        // Revoke preview URL
        setImages((prev) => {
          const existing = prev.find((img) => img.id === tempId);
          if (existing?.previewUrl) {
            URL.revokeObjectURL(existing.previewUrl);
            previewUrlsRef.current.delete(existing.previewUrl);
          }
          return prev;
        });

        // Replace temp entry with real data
        updateImages((prev) =>
          prev.map((img) =>
            img.id === tempId
              ? {
                  ...data,
                  isUploading: false,
                  previewUrl: undefined,
                  uploadProgress: undefined,
                  uploadError: undefined,
                }
              : img
          )
        );

        retryFilesRef.current.delete(tempId);
      } catch (error: unknown) {
        const message =
          axios.isAxiosError(error)
            ? error.response?.data?.error || error.message
            : "Upload failed";

        setImages((prev) =>
          prev.map((img) =>
            img.id === tempId
              ? { ...img, isUploading: false, uploadError: message }
              : img
          )
        );
      }
    },
    [propertyId, uploadSessionId, updateImages]
  );

  // ---------------------------------------------------------------------------
  // Handle file drop / select
  // ---------------------------------------------------------------------------

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const currentCount = images.filter(
        (img) => !img.uploadError
      ).length;
      const slotsAvailable = maxImages - currentCount;

      if (slotsAvailable <= 0) {
        toast.warning(
          t("propertyImages.errors.maxReached", { max: maxImages }),
          { isTranslationKey: false }
        );
        return;
      }

      const filesToUpload = acceptedFiles.slice(0, slotsAvailable);

      // Create temp entries
      const tempEntries: PropertyImageData[] = filesToUpload.map(
        (file, index) => {
          const tempId = `temp-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`;
          const previewUrl = URL.createObjectURL(file);
          previewUrlsRef.current.add(previewUrl);
          retryFilesRef.current.set(tempId, file);

          return {
            id: tempId,
            url: "",
            blobPathname: "",
            width: null,
            height: null,
            fileSize: file.size,
            originalFileSize: file.size,
            mimeType: file.type,
            originalFileName: file.name,
            position: currentCount + index,
            isPrimary: false,
            isUploading: true,
            previewUrl,
            uploadProgress: 0,
          };
        }
      );

      setImages((prev) => [...prev, ...tempEntries]);

      // Start uploads concurrently
      tempEntries.forEach((entry) => {
        const file = retryFilesRef.current.get(entry.id);
        if (file) uploadFile(file, entry.id);
      });
    },
    [images, maxImages, uploadFile, toast, t]
  );

  // ---------------------------------------------------------------------------
  // Dropzone
  // ---------------------------------------------------------------------------

  const currentImageCount = images.filter((img) => !img.uploadError).length;
  const isAtMax = currentImageCount >= maxImages;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"] },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
    disabled: disabled || isAtMax,
    onDropRejected: (rejections) => {
      const first = rejections[0]?.errors[0];
      if (first) {
        toast.error(first.message, { isTranslationKey: false });
      }
    },
  });

  // ---------------------------------------------------------------------------
  // Drag reorder
  // ---------------------------------------------------------------------------

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = images.findIndex((img) => img.id === active.id);
    const newIndex = images.findIndex((img) => img.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(images, oldIndex, newIndex).map(
      (img, idx) => ({ ...img, position: idx })
    );

    // Optimistic update
    updateImages(() => reordered);

    // Persist to server (only real image ids)
    const realIds = reordered
      .filter((img) => !img.id.startsWith("temp-"))
      .map((img) => img.id);

    if (realIds.length > 0) {
      const result = await reorderPropertyImages(realIds);
      if (!result.success) {
        toast.error("Failed to save order", { isTranslationKey: false });
        // Revert
        updateImages(() => images);
      }
    }
  };

  // ---------------------------------------------------------------------------
  // Set primary
  // ---------------------------------------------------------------------------

  const handleSetPrimary = async (imageId: string) => {
    setIsSettingPrimary(imageId);
    try {
      const result = await setPrimaryImage(imageId);
      if (result.success) {
        updateImages((prev) =>
          prev.map((img) => ({
            ...img,
            isPrimary: img.id === imageId,
          }))
        );
      } else {
        toast.error(result.error || "Failed to set primary", {
          isTranslationKey: false,
        });
      }
    } catch {
      toast.error("Failed to set primary image", { isTranslationKey: false });
    } finally {
      setIsSettingPrimary(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Delete image
  // ---------------------------------------------------------------------------

  const handleDelete = async (imageId: string) => {
    // If it's a temp entry (failed upload), just remove locally
    if (imageId.startsWith("temp-")) {
      const entry = images.find((img) => img.id === imageId);
      if (entry?.previewUrl) {
        URL.revokeObjectURL(entry.previewUrl);
        previewUrlsRef.current.delete(entry.previewUrl);
      }
      retryFilesRef.current.delete(imageId);
      updateImages((prev) => prev.filter((img) => img.id !== imageId));
      return;
    }

    setIsDeleting(imageId);
    try {
      const result = await deletePropertyImage(imageId);
      if (result.success) {
        updateImages((prev) => {
          const filtered = prev.filter((img) => img.id !== imageId);
          // If deleted image was primary, promote first remaining
          const hasPrimary = filtered.some((img) => img.isPrimary);
          if (!hasPrimary && filtered.length > 0) {
            filtered[0] = { ...filtered[0], isPrimary: true };
          }
          return filtered;
        });
      } else {
        toast.error(result.error || "Failed to delete image", {
          isTranslationKey: false,
        });
      }
    } catch {
      toast.error("Failed to delete image", { isTranslationKey: false });
    } finally {
      setIsDeleting(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Retry failed upload
  // ---------------------------------------------------------------------------

  const handleRetry = (tempId: string) => {
    const file = retryFilesRef.current.get(tempId);
    if (!file) {
      // No file ref — just dismiss
      handleDismissError(tempId);
      return;
    }

    setImages((prev) =>
      prev.map((img) =>
        img.id === tempId
          ? { ...img, isUploading: true, uploadError: undefined, uploadProgress: 0 }
          : img
      )
    );

    uploadFile(file, tempId);
  };

  // ---------------------------------------------------------------------------
  // Dismiss error
  // ---------------------------------------------------------------------------

  const handleDismissError = (tempId: string) => {
    const entry = images.find((img) => img.id === tempId);
    if (entry?.previewUrl) {
      URL.revokeObjectURL(entry.previewUrl);
      previewUrlsRef.current.delete(entry.previewUrl);
    }
    retryFilesRef.current.delete(tempId);
    updateImages((prev) => prev.filter((img) => img.id !== tempId));
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Count indicator */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("propertyImages.count", {
            current: currentImageCount,
            max: maxImages,
          })}
        </p>
      </div>

      {/* Image Grid with DnD */}
      {images.length > 0 && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={images.map((img) => img.id)}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {images.map((image) => (
                <SortableImageItem
                  key={image.id}
                  image={image}
                  onSetPrimary={handleSetPrimary}
                  onDelete={handleDelete}
                  onRetry={handleRetry}
                  onDismissError={handleDismissError}
                  isSettingPrimary={isSettingPrimary}
                  isDeleting={isDeleting}
                  t={t}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : isAtMax || disabled
              ? "border-muted bg-muted/20 cursor-not-allowed opacity-60"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {isDragActive ? (
            <>
              <Upload className="h-8 w-8 text-primary" />
              <p className="text-sm font-medium text-primary">
                {t("propertyImages.dropHere")}
              </p>
            </>
          ) : (
            <>
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                {t("propertyImages.dropzone")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("propertyImages.dropzoneHint")}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
