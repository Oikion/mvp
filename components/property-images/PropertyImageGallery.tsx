"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PropertyImageGalleryProps {
  images: Array<{
    id: string;
    url: string;
    caption?: string | null;
    isPrimary: boolean;
    width?: number | null;
    height?: number | null;
  }>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PropertyImageGallery({ images }: PropertyImageGalleryProps) {
  const t = useTranslations("mls.propertyImages.gallery");
  const [activeIndex, setActiveIndex] = useState(() => {
    const primaryIdx = images.findIndex((img) => img.isPrimary);
    return primaryIdx >= 0 ? primaryIdx : 0;
  });
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // If images array is empty, render nothing
  if (images.length === 0) return null;

  const activeImage = images[activeIndex];

  return (
    <>
      {/* Hero Image */}
      <div
        role="button"
        tabIndex={0}
        aria-label={t("open")}
        className="relative h-[400px] md:h-[500px] w-full overflow-hidden rounded-lg bg-muted cursor-pointer group"
        onClick={() => setLightboxOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setLightboxOpen(true);
          }
        }}
      >
        <Image
          src={activeImage.url}
          alt={activeImage.caption || t("imageAlt")}
          fill
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 800px"
          priority
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200" />
        {/* Image count badge */}
        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full">
            {activeIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {images.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={cn(
                "relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all duration-200",
                idx === activeIndex
                  ? "border-primary ring-1 ring-primary/30"
                  : "border-transparent hover:border-muted-foreground/30"
              )}
            >
              <Image
                src={img.url}
                alt={img.caption || t("thumbnailAlt", { index: idx + 1 })}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          images={images}
          initialIndex={activeIndex}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setActiveIndex}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Lightbox Sub-Component
// ---------------------------------------------------------------------------

function Lightbox({
  images,
  initialIndex,
  onClose,
  onIndexChange,
}: {
  images: PropertyImageGalleryProps["images"];
  initialIndex: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}) {
  const t = useTranslations("mls.propertyImages.gallery");
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const goTo = useCallback(
    (index: number) => {
      setCurrentIndex(index);
      onIndexChange(index);
    },
    [onIndexChange]
  );

  const goPrev = useCallback(() => {
    goTo(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
  }, [currentIndex, images.length, goTo]);

  const goNext = useCallback(() => {
    goTo(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
  }, [currentIndex, images.length, goTo]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, goPrev, goNext]);

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const current = images[currentIndex];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("dialogLabel")}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Counter - top left */}
      <div className="absolute top-4 left-4 text-white/80 text-sm font-medium z-10">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Close button - top right */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 text-white/80 hover:text-white z-10 p-2 rounded-full hover:bg-white/10 transition-colors pointer-coarse:min-h-11 pointer-coarse:min-w-11"
        aria-label={t("close")}
      >
        <X className="h-6 w-6" />
      </button>

      {/* Previous button */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10 p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label={t("previous")}
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {/* Next button */}
      {images.length > 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10 p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label={t("next")}
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Main image */}
      <div
        className="relative max-w-[90vw] max-h-[80vh] w-full h-full flex flex-col items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative w-full h-full">
          <Image
            key={current.id}
            src={current.url}
            alt={current.caption || t("imageAlt")}
            fill
            className="object-contain transition-opacity duration-300"
            sizes="90vw"
            priority
          />
        </div>
        {/* Caption */}
        {current.caption && (
          <p className="absolute bottom-4 text-white/90 text-sm text-center max-w-lg px-4">
            {current.caption}
          </p>
        )}
      </div>
    </div>
  );
}
