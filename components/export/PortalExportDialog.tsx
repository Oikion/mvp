"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Download,
  FileCode,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  Info,
} from "lucide-react";
import { useLocale } from "next-intl";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================

type PortalId = 
  | "spitogatos" 
  | "golden_home" 
  | "tospitimou" 
  | "home_greek_home" 
  | "facebook";

interface PortalInfo {
  id: PortalId;
  name: string;
  nameEl: string;
  description: string;
  descriptionEl: string;
  format: "xml" | "csv";
  website: string;
  requiredFields: string[];
}

interface ValidationSummary {
  total: number;
  valid: number;
  invalid: number;
  warnings: number;
  errors: number;
}

interface PortalExportDialogProps {
  /** Property IDs to export (if empty, exports all visible) */
  propertyIds?: string[];
  /** Total number of properties to export */
  propertyCount?: number;
  /** Filters to apply */
  filters?: {
    status?: string[];
    type?: string[];
    search?: string;
  };
  /** Custom trigger element */
  trigger?: React.ReactNode;
  /** Callback after successful export */
  onExportComplete?: (portal: PortalId, filename: string) => void;
  /** Button variant */
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Custom class name */
  className?: string;
}

// ============================================
// PORTAL DATA
// ============================================

const PORTALS: PortalInfo[] = [
  {
    id: "spitogatos",
    name: "Spitogatos.gr",
    nameEl: "Spitogatos.gr",
    description: "Greece's leading real estate portal",
    descriptionEl: "Η κορυφαία ελληνική πύλη ακινήτων",
    format: "xml",
    website: "https://www.spitogatos.gr",
    requiredFields: ["property_name", "price", "square_feet", "property_type", "address_city"],
  },
  {
    id: "golden_home",
    name: "Golden Home",
    nameEl: "Golden Home",
    description: "Premium real estate agency",
    descriptionEl: "Premium μεσιτική εταιρεία",
    format: "csv",
    website: "https://www.goldenhome.gr",
    requiredFields: ["property_name", "price", "square_feet", "property_type", "address_city"],
  },
  {
    id: "tospitimou",
    name: "Tospitimou.gr",
    nameEl: "Tospitimou.gr",
    description: "Greek real estate marketplace",
    descriptionEl: "Ελληνική αγορά ακινήτων",
    format: "csv",
    website: "https://www.tospitimou.gr",
    requiredFields: ["property_name", "price", "square_feet", "property_type", "address_city", "description"],
  },
  {
    id: "home_greek_home",
    name: "HomeGreekHome",
    nameEl: "HomeGreekHome",
    description: "International Greek property listings",
    descriptionEl: "Διεθνείς αγγελίες ελληνικών ακινήτων",
    format: "xml",
    website: "https://www.homegreekhome.com",
    requiredFields: ["property_name", "price", "square_feet", "property_type", "address_city", "description"],
  },
  {
    id: "facebook",
    name: "Facebook Marketplace",
    nameEl: "Facebook Marketplace",
    description: "Social media marketplace listings",
    descriptionEl: "Αγγελίες στην αγορά του Facebook",
    format: "csv",
    website: "https://www.facebook.com/marketplace",
    requiredFields: ["property_name", "price", "images", "description"],
  },
];

const FORMAT_ICONS: Record<"xml" | "csv", React.ReactNode> = {
  xml: <FileCode className="h-4 w-4" />,
  csv: <FileText className="h-4 w-4" />,
};

// ============================================
// COMPONENT
// ============================================

export function PortalExportDialog({
  propertyIds = [],
  propertyCount,
  filters = {},
  trigger,
  onExportComplete,
  variant = "outline",
  size = "default",
  className,
}: PortalExportDialogProps) {
  const locale = useLocale() as "en" | "el";
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPortal, setSelectedPortal] = useState<PortalId | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
  
  const selectedPortalInfo = selectedPortal 
    ? PORTALS.find(p => p.id === selectedPortal) 
    : null;
  
  // Validate properties when portal is selected
  useEffect(() => {
    if (!selectedPortal || !isOpen) {
      setValidationSummary(null);
      return;
    }
    
    const validateProperties = async () => {
      setIsValidating(true);
      try {
        const response = await fetch("/api/export/portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "validate",
            portalId: selectedPortal,
            propertyIds: propertyIds.length > 0 ? propertyIds : undefined,
          }),
        });
        
        if (response.ok) {
          const data = await response.json();
          setValidationSummary(data.summary);
        }
      } catch (error) {
        console.error("Validation error:", error);
      } finally {
        setIsValidating(false);
      }
    };
    
    validateProperties();
  }, [selectedPortal, isOpen, propertyIds]);
  
  // Build export URL
  const buildExportUrl = useCallback(() => {
    if (!selectedPortal) return "";
    
    const params = new URLSearchParams();
    params.set("portal", selectedPortal);
    params.set("locale", locale);
    
    if (propertyIds.length > 0) {
      params.set("ids", propertyIds.join(","));
    }
    
    if (filters.status?.length) {
      params.set("status", filters.status.join(","));
    }
    if (filters.type?.length) {
      params.set("type", filters.type.join(","));
    }
    if (filters.search) {
      params.set("search", filters.search);
    }
    
    return `/api/export/portal?${params.toString()}`;
  }, [selectedPortal, locale, propertyIds, filters]);
  
  // Handle export
  const handleExport = useCallback(async () => {
    if (!selectedPortal || !selectedPortalInfo) return;
    
    setIsExporting(true);
    
    try {
      const url = buildExportUrl();
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Export failed with status ${response.status}`);
      }
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `${selectedPortal}_export.${selectedPortalInfo.format}`;
      
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
            ? `Το αρχείο για ${selectedPortalInfo.nameEl} κατέβηκε επιτυχώς`
            : `File for ${selectedPortalInfo.name} downloaded successfully`,
          icon: <CheckCircle2 className="h-4 w-4 text-success" />,
        }
      );
      
      onExportComplete?.(selectedPortal, filename);
      setIsOpen(false);
      
    } catch (error) {
      console.error("[PORTAL_EXPORT_ERROR]", error);
      toast.error(
        locale === "el" ? "Η εξαγωγή απέτυχε" : "Export failed",
        {
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          icon: <AlertCircle className="h-4 w-4 text-destructive" />,
        }
      );
    } finally {
      setIsExporting(false);
    }
  }, [selectedPortal, selectedPortalInfo, buildExportUrl, locale, onExportComplete]);
  
  // Reset state when dialog closes
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSelectedPortal(null);
      setValidationSummary(null);
    }
  };
  
  const displayCount = propertyCount ?? propertyIds.length;
  
  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant={variant} size={size} className={className}>
            <Download className="h-4 w-4 mr-2" />
            {locale === "el" ? "Εξαγωγή σε Portal" : "Export to Portal"}
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {locale === "el" ? "Εξαγωγή σε Portal" : "Export to Portal"}
          </DialogTitle>
          <DialogDescription>
            {locale === "el" 
              ? "Επιλέξτε ένα portal για να εξάγετε τα ακίνητα σε συμβατή μορφή"
              : "Select a portal to export properties in a compatible format"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Property count */}
          {displayCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              {locale === "el" 
                ? `${displayCount} ακίνητα θα εξαχθούν`
                : `${displayCount} properties will be exported`}
            </div>
          )}
          
          {/* Portal selection */}
          <div className="space-y-2">
            <Label>
              {locale === "el" ? "Επιλέξτε Portal" : "Select Portal"}
            </Label>
            <Select
              value={selectedPortal || ""}
              onValueChange={(value) => setSelectedPortal(value as PortalId)}
            >
              <SelectTrigger>
                <SelectValue placeholder={locale === "el" ? "Επιλέξτε..." : "Select..."} />
              </SelectTrigger>
              <SelectContent>
                {PORTALS.map((portal) => (
                  <SelectItem key={portal.id} value={portal.id}>
                    <div className="flex items-center gap-2">
                      {FORMAT_ICONS[portal.format]}
                      <span>{locale === "el" ? portal.nameEl : portal.name}</span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {portal.format.toUpperCase()}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Selected portal details */}
          {selectedPortalInfo && (
            <>
              <Separator />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">
                      {locale === "el" ? selectedPortalInfo.nameEl : selectedPortalInfo.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {locale === "el" ? selectedPortalInfo.descriptionEl : selectedPortalInfo.description}
                    </p>
                  </div>
                  <a
                    href={selectedPortalInfo.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    {FORMAT_ICONS[selectedPortalInfo.format]}
                    <span className="font-medium">{selectedPortalInfo.format.toUpperCase()}</span>
                  </div>
                  <div className="text-muted-foreground">
                    {locale === "el" ? "Απαιτούμενα πεδία:" : "Required fields:"}
                    {" "}{selectedPortalInfo.requiredFields.length}
                  </div>
                </div>
                
                {/* Validation status */}
                {isValidating ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {locale === "el" ? "Επικύρωση δεδομένων..." : "Validating data..."}
                  </div>
                ) : validationSummary && (
                  <div className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {validationSummary.invalid > 0 ? (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      )}
                      {locale === "el" ? "Αποτελέσματα Επικύρωσης" : "Validation Results"}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">
                          {locale === "el" ? "Έγκυρα:" : "Valid:"}
                        </span>{" "}
                        <span className="font-medium text-success">{validationSummary.valid}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          {locale === "el" ? "Με σφάλματα:" : "With errors:"}
                        </span>{" "}
                        <span className="font-medium text-destructive">{validationSummary.invalid}</span>
                      </div>
                      {validationSummary.warnings > 0 && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">
                            {locale === "el" ? "Προειδοποιήσεις:" : "Warnings:"}
                          </span>{" "}
                          <span className="font-medium text-warning">{validationSummary.warnings}</span>
                        </div>
                      )}
                    </div>
                    
                    {validationSummary.invalid > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {locale === "el" 
                          ? "Τα ακίνητα με σφάλματα θα εξαχθούν με ελλιπή στοιχεία"
                          : "Properties with errors will be exported with incomplete data"}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isExporting}
          >
            {locale === "el" ? "Ακύρωση" : "Cancel"}
          </Button>
          <Button
            onClick={handleExport}
            disabled={!selectedPortal || isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {locale === "el" ? "Εξαγωγή..." : "Exporting..."}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                {locale === "el" ? "Εξαγωγή" : "Export"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// QUICK PORTAL EXPORT BUTTON
// ============================================

interface QuickPortalExportButtonProps {
  portalId: PortalId;
  propertyIds?: string[];
  filters?: {
    status?: string[];
    type?: string[];
    search?: string;
  };
  onExportComplete?: (filename: string) => void;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function QuickPortalExportButton({
  portalId,
  propertyIds = [],
  filters = {},
  onExportComplete,
  variant = "outline",
  size = "sm",
  className,
}: QuickPortalExportButtonProps) {
  const locale = useLocale() as "en" | "el";
  const [isExporting, setIsExporting] = useState(false);
  
  const portalInfo = PORTALS.find(p => p.id === portalId);
  
  const handleExport = async () => {
    if (!portalInfo) return;
    
    setIsExporting(true);
    
    try {
      const params = new URLSearchParams();
      params.set("portal", portalId);
      params.set("locale", locale);
      
      if (propertyIds.length > 0) {
        params.set("ids", propertyIds.join(","));
      }
      if (filters.status?.length) {
        params.set("status", filters.status.join(","));
      }
      if (filters.type?.length) {
        params.set("type", filters.type.join(","));
      }
      if (filters.search) {
        params.set("search", filters.search);
      }
      
      const response = await fetch(`/api/export/portal?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Export failed");
      }
      
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `${portalId}_export.${portalInfo.format}`;
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      toast.success(locale === "el" ? "Εξαγωγή επιτυχής" : "Export successful");
      onExportComplete?.(filename);
      
    } catch (error) {
      toast.error(
        locale === "el" ? "Η εξαγωγή απέτυχε" : "Export failed",
        { description: error instanceof Error ? error.message : "Unknown error" }
      );
    } finally {
      setIsExporting(false);
    }
  };
  
  if (!portalInfo) return null;
  
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleExport}
      disabled={isExporting}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        FORMAT_ICONS[portalInfo.format]
      )}
      <span className="ml-2">
        {portalInfo.name}
      </span>
    </Button>
  );
}
