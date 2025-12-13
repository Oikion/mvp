"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Download,
  ZoomIn,
  ZoomOut,
  FileText,
  AlertCircle,
  Maximize2,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface DocumentViewerProps {
  readonly url: string;
  readonly mimeType: string;
  readonly fileName?: string;
  readonly className?: string;
  readonly height?: string;
}

export function DocumentViewer({
  url,
  mimeType,
  fileName = "document",
  className = "",
  height = "600px",
}: DocumentViewerProps) {
  const t = useTranslations("documents.viewer");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const containerRef = useRef<HTMLDivElement>(null);

  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  // Render PDF viewer
  const renderPdfViewer = () => (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <Skeleton className="w-full h-full" />
        </div>
      )}
      <iframe
        src={`${url}#zoom=${zoom}&toolbar=0`}
        className="w-full h-full border-0 rounded-lg"
        title={fileName}
        style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(t("failedToLoadPdf"));
          setLoading(false);
        }}
      />
    </div>
  );

  // Render Image viewer
  const renderImageViewer = () => (
    <div className="relative w-full h-full flex items-center justify-center overflow-auto">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
          <Skeleton className="w-full h-full" />
        </div>
      )}
      <img
        src={url}
        alt={fileName}
        className="max-w-full max-h-full object-contain"
        style={{ transform: `scale(${zoom / 100})` }}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(t("failedToLoadImage"));
          setLoading(false);
        }}
      />
    </div>
  );

  // Render unsupported format
  const renderUnsupported = () => (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <FileText className="h-16 w-16 text-muted-foreground" />
      <p className="text-muted-foreground text-center">
        {t("previewNotAvailable")}
      </p>
      <Button onClick={handleDownload}>
        <Download className="h-4 w-4 mr-2" />
        {t("downloadToView")}
      </Button>
    </div>
  );

  // Render error state
  if (error) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center gap-4 p-8" style={{ height }}>
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-destructive text-center">{error}</p>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            {t("downloadInstead")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/50 rounded-t-lg">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleFullscreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Document Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-muted/20 rounded-b-lg"
        style={{ height }}
      >
        {isPdf && renderPdfViewer()}
        {isImage && renderImageViewer()}
        {!isPdf && !isImage && renderUnsupported()}
      </div>
    </div>
  );
}

export default DocumentViewer;


