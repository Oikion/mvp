"use client";

import React, { useState, useCallback } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Link2,
  Loader2,
  Check,
  ChevronDown,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================

export type QuickExportType = "xe-xml" | "spitogatos-csv" | "pdf-flyer" | "copy-link";
export type EntityType = "property" | "client";

export interface QuickExportButtonProps {
  /** Type of entity to export */
  entityType: EntityType;
  /** ID of the entity */
  entityId: string;
  /** Display name of the entity (for notifications) */
  entityName?: string;
  /** Additional data for export (optional, will fetch if not provided) */
  entityData?: Record<string, unknown>;
  /** Available export options (defaults to all for properties, limited for clients) */
  exportOptions?: QuickExportType[];
  /** Public URL for copy link (optional, will generate if not provided) */
  publicUrl?: string;
  /** Custom class name */
  className?: string;
  /** Button variant */
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Show label text */
  showLabel?: boolean;
  /** Callback after successful export */
  onExportComplete?: (type: QuickExportType) => void;
}

// ============================================
// CONSTANTS
// ============================================

const EXPORT_ICONS: Record<QuickExportType, React.ReactNode> = {
  "xe-xml": <FileCode2 className="h-4 w-4" />,
  "spitogatos-csv": <FileSpreadsheet className="h-4 w-4" />,
  "pdf-flyer": <FileText className="h-4 w-4" />,
  "copy-link": <Link2 className="h-4 w-4" />,
};

const DEFAULT_OPTIONS: Record<EntityType, QuickExportType[]> = {
  property: ["xe-xml", "spitogatos-csv", "pdf-flyer", "copy-link"],
  client: ["pdf-flyer", "copy-link"],
};

// ============================================
// COMPONENT
// ============================================

export function QuickExportButton({
  entityType,
  entityId,
  entityName,
  entityData,
  exportOptions,
  publicUrl,
  className,
  variant = "outline",
  size = "default",
  showLabel = true,
  onExportComplete,
}: QuickExportButtonProps) {
  const t = useTranslations("export");
  const locale = useLocale() as "en" | "el";
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportingType, setExportingType] = useState<QuickExportType | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const availableOptions = exportOptions || DEFAULT_OPTIONS[entityType];

  // Get export option labels
  const getLabel = useCallback((type: QuickExportType): string => {
    const labels: Record<QuickExportType, { en: string; el: string }> = {
      "xe-xml": { en: "XE.gr (XML)", el: "XE.gr (XML)" },
      "spitogatos-csv": { en: "Spitogatos (CSV)", el: "Spitogatos (CSV)" },
      "pdf-flyer": { en: "PDF Flyer", el: "PDF Φυλλάδιο" },
      "copy-link": { en: "Copy Link", el: "Αντιγραφή Συνδέσμου" },
    };
    return labels[type][locale];
  }, [locale]);

  // Generate public URL
  const getPublicUrl = useCallback((): string => {
    if (publicUrl) return publicUrl;
    
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    switch (entityType) {
      case "property":
        return `${baseUrl}/${locale}/property/${entityId}`;
      case "client":
        return `${baseUrl}/${locale}/client/${entityId}`;
      default:
        return `${baseUrl}/${locale}/${entityType}/${entityId}`;
    }
  }, [publicUrl, entityType, entityId, locale]);

  // Handle copy link
  const handleCopyLink = useCallback(async () => {
    try {
      const url = getPublicUrl();
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      toast.success(
        locale === "el" ? "Ο σύνδεσμος αντιγράφηκε!" : "Link copied!",
        {
          description: url,
          icon: <Check className="h-4 w-4 text-success" />,
        }
      );
      setTimeout(() => setLinkCopied(false), 2000);
      onExportComplete?.("copy-link");
    } catch (error) {
      toast.error(
        locale === "el" ? "Αποτυχία αντιγραφής" : "Failed to copy",
        { description: error instanceof Error ? error.message : "Unknown error" }
      );
    }
  }, [getPublicUrl, locale, onExportComplete]);

  // Handle file export (XE.gr XML, Spitogatos CSV, PDF Flyer)
  const handleFileExport = useCallback(async (type: QuickExportType) => {
    setIsExporting(true);
    setExportingType(type);

    try {
      // Build export URL
      const params = new URLSearchParams({
        format: type,
        locale,
      });
      
      const url = `/api/export/quick/${entityType}/${entityId}?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Export failed with status ${response.status}`);
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename[*]?=['"]?(?:UTF-8'')?([^;'"\n]+)['"]?/i);
      const extension = type === "xe-xml" ? "xml" : type === "spitogatos-csv" ? "csv" : "pdf";
      const defaultFilename = `${entityType}_${entityId}_${type}.${extension}`;
      const filename = filenameMatch?.[1] ? decodeURIComponent(filenameMatch[1]) : defaultFilename;

      // Download the file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success(
        locale === "el" ? "Η εξαγωγή ολοκληρώθηκε" : "Export completed",
        {
          description: locale === "el" 
            ? `Το αρχείο ${filename} κατέβηκε επιτυχώς`
            : `File ${filename} downloaded successfully`,
          icon: <Check className="h-4 w-4 text-success" />,
        }
      );
      
      onExportComplete?.(type);
    } catch (error) {
      console.error("[QUICK_EXPORT_ERROR]", error);
      toast.error(
        locale === "el" ? "Η εξαγωγή απέτυχε" : "Export failed",
        {
          description: error instanceof Error ? error.message : "An unexpected error occurred",
        }
      );
    } finally {
      setIsExporting(false);
      setExportingType(null);
    }
  }, [entityType, entityId, locale, onExportComplete]);

  // Handle export selection
  const handleExportSelect = useCallback((type: QuickExportType) => {
    if (type === "copy-link") {
      handleCopyLink();
    } else {
      handleFileExport(type);
    }
  }, [handleCopyLink, handleFileExport]);

  // Get icon for current export type
  const getExportIcon = (type: QuickExportType) => {
    if (exportingType === type) {
      return <Loader2 className="h-4 w-4 animate-spin" />;
    }
    if (type === "copy-link" && linkCopied) {
      return <Check className="h-4 w-4 text-success" />;
    }
    return EXPORT_ICONS[type];
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={className}
          disabled={isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {showLabel && size !== "icon" && (
            <>
              <span className="ml-2">
                {locale === "el" ? "Γρήγορη Εξαγωγή" : "Quick Export"}
              </span>
              <ChevronDown className="ml-1 h-3 w-3" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>
          {locale === "el" ? "Εξαγωγή σε" : "Export to"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Portal Export Options */}
        {(availableOptions.includes("xe-xml") || availableOptions.includes("spitogatos-csv")) && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal py-1">
                {locale === "el" ? "Πύλες Ακινήτων" : "Property Portals"}
              </DropdownMenuLabel>
              {availableOptions.includes("xe-xml") && (
                <DropdownMenuItem 
                  onClick={() => handleExportSelect("xe-xml")}
                  disabled={isExporting}
                >
                  {getExportIcon("xe-xml")}
                  <span className="ml-2">{getLabel("xe-xml")}</span>
                </DropdownMenuItem>
              )}
              {availableOptions.includes("spitogatos-csv") && (
                <DropdownMenuItem 
                  onClick={() => handleExportSelect("spitogatos-csv")}
                  disabled={isExporting}
                >
                  {getExportIcon("spitogatos-csv")}
                  <span className="ml-2">{getLabel("spitogatos-csv")}</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Document Export Options */}
        <DropdownMenuGroup>
          {availableOptions.includes("pdf-flyer") && (
            <DropdownMenuItem 
              onClick={() => handleExportSelect("pdf-flyer")}
              disabled={isExporting}
            >
              {getExportIcon("pdf-flyer")}
              <span className="ml-2">{getLabel("pdf-flyer")}</span>
            </DropdownMenuItem>
          )}
          {availableOptions.includes("copy-link") && (
            <DropdownMenuItem 
              onClick={() => handleExportSelect("copy-link")}
              disabled={isExporting}
            >
              {getExportIcon("copy-link")}
              <span className="ml-2">{getLabel("copy-link")}</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
