// @ts-nocheck
// TODO: Fix type errors
"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  Loader2,
  AlertCircle,
  CheckCircle2,
  List,
  Grid3X3,
  BarChart3,
  Calculator,
  TrendingUp,
  Globe,
  ExternalLink,
  Building2,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { useRecordExport } from "@/hooks/swr";

// ============================================
// TYPES
// ============================================

export type ExportFormat = "xlsx" | "xls" | "csv" | "pdf" | "xml";
export type ExportModule = "crm" | "mls" | "calendar" | "reports";
export type ExportScope = "filtered" | "all";
export type CalendarViewType = "list" | "grid";
export type ExportTemplate = "CMA" | "SHORTLIST" | "ROI" | "MARKET_TRENDS" | null;

export interface ExportFilters {
  status?: string[];
  type?: string[];
  search?: string;
  eventType?: string[];
  startDate?: string;
  endDate?: string;
  month?: string; // YYYY-MM format for grid view
}

export interface ExportButtonProps {
  module: ExportModule;
  /** Available formats for this module */
  formats?: ExportFormat[];
  /** Current filters applied to the data */
  filters?: ExportFilters;
  /** Total row count (for warning display) */
  totalRows?: number;
  /** Filtered row count (for scope selection) */
  filteredRows?: number;
  /** For calendar: allow selection of list vs grid view */
  calendarViewOptions?: boolean;
  /** Enable template selection for XLSX exports */
  enableTemplates?: boolean;
  /** Enable portal export options (for MLS module) */
  enablePortals?: boolean;
  /** Property IDs for export (used with portals) */
  propertyIds?: string[];
  /** Entity ID for recording export history */
  entityId?: string;
  /** Entity data for export history snapshot */
  entityData?: Record<string, unknown> | Record<string, unknown>[];
  /** Export destination (e.g., "client", "xe.gr") */
  destination?: string;
  /** Custom class name */
  className?: string;
  /** Button variant */
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Show label text */
  showLabel?: boolean;
  /** Callback after successful export */
  onExportComplete?: (filename: string) => void;
  /** Callback when "Export to Portals" is clicked in dropdown */
  onPortalsClick?: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const FORMAT_ICONS: Record<ExportFormat, React.ReactNode> = {
  xlsx: <FileSpreadsheet className="h-4 w-4" />,
  xls: <FileSpreadsheet className="h-4 w-4" />,
  csv: <FileText className="h-4 w-4" />,
  pdf: <FileText className="h-4 w-4" />,
  xml: <FileCode className="h-4 w-4" />,
};

const FORMAT_LABELS: Record<ExportFormat, { en: string; el: string }> = {
  xlsx: { en: "Excel (.xlsx)", el: "Excel (.xlsx)" },
  xls: { en: "Excel (.xls)", el: "Excel (.xls)" },
  csv: { en: "CSV (.csv)", el: "CSV (.csv)" },
  pdf: { en: "PDF (.pdf)", el: "PDF (.pdf)" },
  xml: { en: "XML (.xml)", el: "XML (.xml)" },
};

const DEFAULT_FORMATS: Record<ExportModule, ExportFormat[]> = {
  crm: ["xlsx", "xls", "csv", "pdf", "xml"],
  mls: ["xlsx", "xls", "csv", "pdf", "xml"],
  calendar: ["pdf"], // Calendar only supports PDF
  reports: ["xlsx", "xls", "csv", "pdf", "xml"],
};

// Template definitions
interface TemplateDefinition {
  id: ExportTemplate;
  name: { en: string; el: string };
  description: { en: string; el: string };
  icon: React.ReactNode;
  supportsBulk: boolean;
}

const EXPORT_TEMPLATES: TemplateDefinition[] = [
  {
    id: "CMA",
    name: { en: "Comparative Market Analysis", el: "Συγκριτική Ανάλυση Αγοράς" },
    description: { en: "Compare properties by price, size, and features", el: "Σύγκριση ακινήτων βάσει τιμής, εμβαδού και χαρακτηριστικών" },
    icon: <BarChart3 className="h-4 w-4" />,
    supportsBulk: true,
  },
  {
    id: "SHORTLIST",
    name: { en: "Property Shortlist", el: "Λίστα Ακινήτων" },
    description: { en: "Client-ready property list with key details", el: "Λίστα ακινήτων για πελάτες" },
    icon: <List className="h-4 w-4" />,
    supportsBulk: true,
  },
  {
    id: "ROI",
    name: { en: "ROI Analysis", el: "Ανάλυση Απόδοσης" },
    description: { en: "Investment calculations and returns", el: "Υπολογισμοί επένδυσης και αποδόσεων" },
    icon: <Calculator className="h-4 w-4" />,
    supportsBulk: true,
  },
  {
    id: "MARKET_TRENDS",
    name: { en: "Market Trends", el: "Τάσεις Αγοράς" },
    description: { en: "Pricing trends and market statistics", el: "Τάσεις τιμών και στατιστικά αγοράς" },
    icon: <TrendingUp className="h-4 w-4" />,
    supportsBulk: true,
  },
];

// Portal template definitions
type PortalId = "spitogatos" | "golden_home" | "tospitimou" | "home_greek_home" | "facebook";

interface PortalDefinition {
  id: PortalId;
  name: string;
  nameEl: string;
  description: { en: string; el: string };
  format: "xml" | "csv";
  website: string;
  icon: React.ReactNode;
}

const PORTAL_TEMPLATES: PortalDefinition[] = [
  {
    id: "spitogatos",
    name: "Spitogatos.gr",
    nameEl: "Spitogatos.gr",
    description: { 
      en: "Greece's leading real estate portal", 
      el: "Η κορυφαία ελληνική πύλη ακινήτων" 
    },
    format: "xml",
    website: "https://www.spitogatos.gr",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    id: "golden_home",
    name: "Golden Home",
    nameEl: "Golden Home",
    description: { 
      en: "Premium real estate agency", 
      el: "Premium μεσιτική εταιρεία" 
    },
    format: "csv",
    website: "https://www.goldenhome.gr",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    id: "tospitimou",
    name: "Tospitimou.gr",
    nameEl: "Tospitimou.gr",
    description: { 
      en: "Greek real estate marketplace", 
      el: "Ελληνική αγορά ακινήτων" 
    },
    format: "csv",
    website: "https://www.tospitimou.gr",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    id: "home_greek_home",
    name: "HomeGreekHome",
    nameEl: "HomeGreekHome",
    description: { 
      en: "International Greek property listings", 
      el: "Διεθνείς αγγελίες ελληνικών ακινήτων" 
    },
    format: "xml",
    website: "https://www.homegreekhome.com",
    icon: <Globe className="h-4 w-4" />,
  },
  {
    id: "facebook",
    name: "Facebook Marketplace",
    nameEl: "Facebook Marketplace",
    description: { 
      en: "Social media marketplace listings", 
      el: "Αγγελίες στην αγορά του Facebook" 
    },
    format: "csv",
    website: "https://www.facebook.com/marketplace",
    icon: <Globe className="h-4 w-4" />,
  },
];

// ============================================
// COMPONENT
// ============================================

export function ExportButton({
  module,
  formats,
  filters = {},
  totalRows,
  filteredRows,
  calendarViewOptions = false,
  enableTemplates = false,
  enablePortals = false,
  propertyIds = [],
  entityId,
  entityData,
  destination,
  className,
  variant = "outline",
  size = "default",
  showLabel = true,
  onExportComplete,
  onPortalsClick,
}: ExportButtonProps) {
  const t = useTranslations("export");
  const locale = useLocale() as "en" | "el";
  const { recordExport } = useRecordExport();
  
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [selectedScope, setSelectedScope] = useState<ExportScope>("filtered");
  const [calendarViewType, setCalendarViewType] = useState<CalendarViewType>("list");
  const [selectedTemplate, setSelectedTemplate] = useState<ExportTemplate>(null);
  const [selectedPortal, setSelectedPortal] = useState<PortalId | null>(null);
  const [exportTab, setExportTab] = useState<"file" | "portal">("file");
  
  const availableFormats = formats || DEFAULT_FORMATS[module];
  const hasScopeOptions = filteredRows !== undefined && totalRows !== undefined && filteredRows !== totalRows;
  const showTemplateSelection = enableTemplates && (selectedFormat === "xlsx" || selectedFormat === "xls");
  const showPortalOptions = enablePortals && module === "mls";
  
  // Build export URL with filters
  const buildExportUrl = useCallback((format: ExportFormat, scope: ExportScope, template: ExportTemplate): string => {
    const params = new URLSearchParams();
    params.set("format", format);
    params.set("scope", scope);
    params.set("locale", locale);
    
    // Add template if selected
    if (template) {
      params.set("template", template);
    }
    
    // Add destination if specified
    if (destination) {
      params.set("destination", destination);
    }
    
    // Add filters if scope is "filtered"
    if (scope === "filtered" && filters) {
      if (filters.status?.length) {
        params.set("status", filters.status.join(","));
      }
      if (filters.type?.length) {
        params.set("type", filters.type.join(","));
      }
      if (filters.search) {
        params.set("search", filters.search);
      }
      if (filters.eventType?.length) {
        params.set("eventType", filters.eventType.join(","));
      }
      if (filters.startDate) {
        params.set("startDate", filters.startDate);
      }
      if (filters.endDate) {
        params.set("endDate", filters.endDate);
      }
      if (filters.month) {
        params.set("month", filters.month);
      }
    }
    
    // For calendar, add view type
    if (module === "calendar") {
      params.set("view", calendarViewType);
    }
    
    return `/api/export/${module}?${params.toString()}`;
  }, [module, locale, filters, calendarViewType, destination]);
  
  // Handle export
  const handleExport = useCallback(async (format: ExportFormat, scope: ExportScope, template: ExportTemplate) => {
    setIsExporting(true);
    
    try {
      const url = buildExportUrl(format, scope, template);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Export failed with status ${response.status}`);
      }
      
      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] || `export.${format}`;
      
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
      
      // Record export history if entityId is provided
      if (entityId) {
        try {
          const entityType = module === "mls" ? "PROPERTY" : module === "crm" ? "CLIENT" : module.toUpperCase();
          const isBulk = Array.isArray(entityData) && entityData.length > 1;
          
          await recordExport({
            entityType: isBulk ? `BULK_${entityType}S` : entityType,
            entityId: isBulk ? `bulk-${Date.now()}` : entityId,
            entityIds: isBulk && Array.isArray(entityData) 
              ? entityData.map(e => (e as Record<string, unknown>).id as string).filter(Boolean) 
              : [],
            exportFormat: format,
            exportTemplate: template || undefined,
            destination,
            filename,
            rowCount: Array.isArray(entityData) ? entityData.length : 1,
            entityData,
          });
        } catch (historyError) {
          // Don't fail the export if history recording fails
          console.error("[EXPORT_HISTORY_ERROR]", historyError);
        }
      }
      
      toast.success(
        locale === "el" ? "Η εξαγωγή ολοκληρώθηκε" : "Export completed",
        {
          description: locale === "el" 
            ? `Το αρχείο ${filename} κατέβηκε επιτυχώς`
            : `File ${filename} downloaded successfully`,
          icon: <CheckCircle2 className="h-4 w-4 text-success" />,
        }
      );
      
      // Call the callback if provided
      onExportComplete?.(filename);
      
    } catch (error) {
      console.error("[EXPORT_ERROR]", error);
      toast.error(
        locale === "el" ? "Η εξαγωγή απέτυχε" : "Export failed",
        {
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          icon: <AlertCircle className="h-4 w-4 text-destructive" />,
        }
      );
    } finally {
      setIsExporting(false);
      setShowExportDialog(false);
      setSelectedFormat(null);
      setSelectedTemplate(null);
    }
  }, [buildExportUrl, locale, entityId, entityData, module, destination, recordExport, onExportComplete]);
  
  // Handle format selection
  const handleFormatSelect = useCallback((format: ExportFormat) => {
    setSelectedFormat(format);
    setSelectedScope(hasScopeOptions ? "filtered" : "all");
    setShowExportDialog(true);
  }, [hasScopeOptions]);
  
  // Handle scope selection and export
  const handleExportConfirm = useCallback(() => {
    if (exportTab === "portal" && selectedPortal) {
      handlePortalExport();
    } else if (selectedFormat) {
      handleExport(selectedFormat, selectedScope, selectedTemplate);
    }
  }, [exportTab, selectedFormat, selectedScope, selectedTemplate, selectedPortal]);

  // Handle portal export
  const handlePortalExport = useCallback(async () => {
    if (!selectedPortal) return;
    
    setIsExporting(true);
    
    try {
      const params = new URLSearchParams();
      params.set("portal", selectedPortal);
      params.set("locale", locale);
      
      if (propertyIds.length > 0) {
        params.set("ids", propertyIds.join(","));
      }
      
      if (selectedScope === "filtered" && filters) {
        if (filters.status?.length) {
          params.set("status", filters.status.join(","));
        }
        if (filters.type?.length) {
          params.set("type", filters.type.join(","));
        }
        if (filters.search) {
          params.set("search", filters.search);
        }
      }
      
      const response = await fetch(`/api/export/portal?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Export failed with status ${response.status}`);
      }
      
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const portalInfo = PORTAL_TEMPLATES.find(p => p.id === selectedPortal);
      const filename = filenameMatch?.[1] || `${selectedPortal}_export.${portalInfo?.format || "csv"}`;
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      // Record export history
      if (entityId) {
        try {
          await recordExport({
            entityType: "PORTAL_EXPORT",
            entityId: `portal-${selectedPortal}-${Date.now()}`,
            entityIds: propertyIds,
            exportFormat: portalInfo?.format || "csv",
            exportTemplate: selectedPortal,
            destination: portalInfo?.name,
            filename,
            rowCount: propertyIds.length || totalRows || 0,
            entityData,
          });
        } catch (historyError) {
          console.error("[EXPORT_HISTORY_ERROR]", historyError);
        }
      }
      
      toast.success(
        locale === "el" ? "Η εξαγωγή ολοκληρώθηκε" : "Export completed",
        {
          description: locale === "el" 
            ? `Το αρχείο για ${portalInfo?.nameEl || selectedPortal} κατέβηκε επιτυχώς`
            : `File for ${portalInfo?.name || selectedPortal} downloaded successfully`,
          icon: <CheckCircle2 className="h-4 w-4 text-success" />,
        }
      );
      
      onExportComplete?.(filename);
      
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
      setShowExportDialog(false);
      setSelectedPortal(null);
    }
  }, [selectedPortal, locale, propertyIds, filters, selectedScope, entityId, entityData, totalRows, recordExport, onExportComplete]);
  
  // Render calendar submenu for PDF options
  const renderCalendarMenu = () => (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        {FORMAT_ICONS.pdf}
        <span className="ml-2">{FORMAT_LABELS.pdf[locale]}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuItem onClick={() => {
          setCalendarViewType("list");
          handleFormatSelect("pdf");
        }}>
          <List className="h-4 w-4 mr-2" />
          {locale === "el" ? "Προβολή Λίστας" : "List View"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          setCalendarViewType("grid");
          handleFormatSelect("pdf");
        }}>
          <Grid3X3 className="h-4 w-4 mr-2" />
          {locale === "el" ? "Προβολή Ημερολογίου" : "Calendar Grid"}
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
  
  return (
    <>
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
              <span className="ml-2">
                {isExporting 
                  ? (locale === "el" ? "Εξαγωγή..." : "Exporting...")
                  : (locale === "el" ? "Εξαγωγή" : "Export")
                }
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>
            {locale === "el" ? "Μορφή Αρχείου" : "File Format"}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {availableFormats.map((format) => {
              // For calendar with view options, show submenu
              if (module === "calendar" && format === "pdf" && calendarViewOptions) {
                return <React.Fragment key={format}>{renderCalendarMenu()}</React.Fragment>;
              }
              
              return (
                <DropdownMenuItem
                  key={format}
                  onClick={() => handleFormatSelect(format)}
                >
                  {FORMAT_ICONS[format]}
                  <span className="ml-2">{FORMAT_LABELS[format][locale]}</span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuGroup>
          
          {/* Export to Portals option - only for MLS module */}
          {onPortalsClick && module === "mls" && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onPortalsClick}
                className="text-success focus:text-success focus:bg-success/10 dark:focus:bg-emerald-950/30"
              >
                <Globe className="h-4 w-4" />
                <span className="ml-2">
                  {locale === "el" ? "Εξαγωγή σε Portals" : "Export to Portals"}
                </span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Scope Selection Dialog */}
      <Dialog
        open={showExportDialog}
        onOpenChange={(open) => {
          setShowExportDialog(open);
          if (!open) {
            setSelectedFormat(null);
            setSelectedPortal(null);
            setExportTab("file");
          }
        }}
      >
        <DialogContent className={showPortalOptions ? "sm:max-w-[550px]" : undefined}>
          <DialogHeader>
            <DialogTitle>
              {locale === "el" ? "Ενότητα Εξαγωγής" : "Export Module"}
            </DialogTitle>
            <DialogDescription>
              {locale === "el" 
                ? "Επιβεβαιώστε τις επιλογές εξαγωγής και προχωρήστε"
                : "Review export options and confirm to continue"
              }
            </DialogDescription>
          </DialogHeader>
          
          {showPortalOptions ? (
            <Tabs value={exportTab} onValueChange={(v) => setExportTab(v as "file" | "portal")} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file">
                  <FileSpreadsheet className="h-4 w-4" />
                  {locale === "el" ? "Αρχείο" : "File Export"}
                </TabsTrigger>
                <TabsTrigger value="portal">
                  <Globe className="h-4 w-4" />
                  {locale === "el" ? "Portals" : "Publish to Portals"}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="file" className="space-y-4 mt-4">
                {/* File format display */}
                {selectedFormat && (
                  <div className="flex items-center gap-3 rounded-lg border p-4">
                    {FORMAT_ICONS[selectedFormat]}
                    <div>
                      <div className="font-medium">
                        {locale === "el" ? "Μορφή αρχείου" : "File format"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {FORMAT_LABELS[selectedFormat][locale]}
                      </div>
                    </div>
                  </div>
                )}

                {/* Template Selection */}
                {showTemplateSelection && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">
                        {locale === "el" ? "Πρότυπο Εξαγωγής" : "Export Template"}
                      </div>
                      {selectedTemplate && (
                        <Badge 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-secondary/80"
                          onClick={() => setSelectedTemplate(null)}
                        >
                          {locale === "el" ? "Καθαρισμός" : "Clear"}
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {EXPORT_TEMPLATES.map((template) => (
                        <div
                          key={template.id}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedTemplate === template.id
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => setSelectedTemplate(template.id)}
                        >
                          <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                            {template.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">
                              {template.name[locale]}
                            </div>
                            <div className="text-xs text-muted-foreground line-clamp-2">
                              {template.description[locale]}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {locale === "el" 
                        ? "Επιλέξτε πρότυπο για προκαθορισμένες στήλες ή αφήστε κενό για τυπική εξαγωγή"
                        : "Select a template for predefined columns or leave empty for standard export"}
                    </p>
                  </div>
                )}

                {/* Scope selection */}
                {hasScopeOptions ? (
                  <RadioGroup
                    value={selectedScope}
                    onValueChange={(value) => setSelectedScope(value as ExportScope)}
                    className="gap-3"
                  >
                    <div className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedScope("filtered")}
                    >
                      <RadioGroupItem value="filtered" id="filtered-file" />
                      <Label htmlFor="filtered-file" className="flex-1 cursor-pointer">
                        <div className="font-medium text-sm">
                          {locale === "el" ? "Φιλτραρισμένα δεδομένα" : "Filtered data"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {filteredRows?.toLocaleString()} {locale === "el" ? "εγγραφές" : "records"}
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedScope("all")}
                    >
                      <RadioGroupItem value="all" id="all-file" />
                      <Label htmlFor="all-file" className="flex-1 cursor-pointer">
                        <div className="font-medium text-sm">
                          {locale === "el" ? "Όλα τα δεδομένα" : "All data"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {totalRows?.toLocaleString()} {locale === "el" ? "εγγραφές" : "records"}
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {locale === "el"
                      ? "Θα εξαχθούν όλα τα διαθέσιμα δεδομένα."
                      : "All available data will be exported."}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="portal" className="space-y-4 mt-4">
                {/* Portal Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {locale === "el" ? "Επιλέξτε Portal" : "Select Portal"}
                    </div>
                    {selectedPortal && (
                      <Badge 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-secondary/80"
                        onClick={() => setSelectedPortal(null)}
                      >
                        {locale === "el" ? "Καθαρισμός" : "Clear"}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PORTAL_TEMPLATES.map((portal) => (
                      <div
                        key={portal.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedPortal === portal.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedPortal(portal.id)}
                      >
                        <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                          {portal.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-sm">
                              {locale === "el" ? portal.nameEl : portal.name}
                            </div>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {portal.format.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {portal.description[locale]}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {locale === "el" 
                      ? "Επιλέξτε portal για εξαγωγή σε συμβατή μορφή αρχείου"
                      : "Select a portal to export in a compatible file format"}
                  </p>
                </div>

                {/* Selected Portal Info */}
                {selectedPortal && (
                  <div className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                    {PORTAL_TEMPLATES.find(p => p.id === selectedPortal)?.icon}
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {locale === "el" 
                          ? PORTAL_TEMPLATES.find(p => p.id === selectedPortal)?.nameEl 
                          : PORTAL_TEMPLATES.find(p => p.id === selectedPortal)?.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {PORTAL_TEMPLATES.find(p => p.id === selectedPortal)?.format.toUpperCase()} {locale === "el" ? "μορφή" : "format"}
                      </div>
                    </div>
                    <a
                      href={PORTAL_TEMPLATES.find(p => p.id === selectedPortal)?.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                )}

                {/* Scope selection for portals */}
                {hasScopeOptions && (
                  <RadioGroup
                    value={selectedScope}
                    onValueChange={(value) => setSelectedScope(value as ExportScope)}
                    className="gap-3"
                  >
                    <div className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedScope("filtered")}
                    >
                      <RadioGroupItem value="filtered" id="filtered-portal" />
                      <Label htmlFor="filtered-portal" className="flex-1 cursor-pointer">
                        <div className="font-medium text-sm">
                          {locale === "el" ? "Φιλτραρισμένα δεδομένα" : "Filtered data"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {filteredRows?.toLocaleString()} {locale === "el" ? "εγγραφές" : "records"}
                        </div>
                      </Label>
                    </div>
                    
                    <div className="flex items-center space-x-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedScope("all")}
                    >
                      <RadioGroupItem value="all" id="all-portal" />
                      <Label htmlFor="all-portal" className="flex-1 cursor-pointer">
                        <div className="font-medium text-sm">
                          {locale === "el" ? "Όλα τα δεδομένα" : "All data"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {totalRows?.toLocaleString()} {locale === "el" ? "εγγραφές" : "records"}
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <>
              {/* Original non-tabbed content for non-MLS modules */}
              {selectedFormat && (
                <div className="flex items-center gap-3 rounded-lg border p-4">
                  {FORMAT_ICONS[selectedFormat]}
                  <div>
                    <div className="font-medium">
                      {locale === "el" ? "Μορφή αρχείου" : "File format"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {FORMAT_LABELS[selectedFormat][locale]}
                    </div>
                  </div>
                </div>
              )}

              {module === "calendar" && calendarViewOptions && (
                <div className="space-y-3">
                  <div className="text-sm font-medium">
                    {locale === "el" ? "Προβολή Ημερολογίου" : "Calendar View"}
                  </div>
                  <RadioGroup
                    value={calendarViewType}
                    onValueChange={(value) => setCalendarViewType(value as CalendarViewType)}
                    className="grid grid-cols-2 gap-3"
                  >
                    <div className="flex items-center space-x-2 rounded-lg border p-3">
                      <RadioGroupItem value="list" id="calendar-view-list" />
                      <Label htmlFor="calendar-view-list" className="flex items-center gap-2">
                        <List className="h-4 w-4" />
                        {locale === "el" ? "Λίστα" : "List"}
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 rounded-lg border p-3">
                      <RadioGroupItem value="grid" id="calendar-view-grid" />
                      <Label htmlFor="calendar-view-grid" className="flex items-center gap-2">
                        <Grid3X3 className="h-4 w-4" />
                        {locale === "el" ? "Ημερολόγιο" : "Grid"}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {/* Template Selection */}
              {showTemplateSelection && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      {locale === "el" ? "Πρότυπο Εξαγωγής" : "Export Template"}
                    </div>
                    {selectedTemplate && (
                      <Badge 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-secondary/80"
                        onClick={() => setSelectedTemplate(null)}
                      >
                        {locale === "el" ? "Καθαρισμός" : "Clear"}
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {EXPORT_TEMPLATES.map((template) => (
                      <div
                        key={template.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedTemplate === template.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedTemplate(template.id)}
                      >
                        <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                          {template.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {template.name[locale]}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            {template.description[locale]}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {locale === "el" 
                      ? "Επιλέξτε πρότυπο για προκαθορισμένες στήλες ή αφήστε κενό για τυπική εξαγωγή"
                      : "Select a template for predefined columns or leave empty for standard export"}
                  </p>
                </div>
              )}

              {hasScopeOptions ? (
                <RadioGroup
                  value={selectedScope}
                  onValueChange={(value) => setSelectedScope(value as ExportScope)}
                  className="gap-4 py-4"
                >
                  <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedScope("filtered")}
                  >
                    <RadioGroupItem value="filtered" id="filtered" />
                    <Label htmlFor="filtered" className="flex-1 cursor-pointer">
                      <div className="font-medium">
                        {locale === "el" ? "Φιλτραρισμένα δεδομένα" : "Filtered data"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {filteredRows?.toLocaleString()} {locale === "el" ? "εγγραφές" : "records"}
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedScope("all")}
                  >
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="flex-1 cursor-pointer">
                      <div className="font-medium">
                        {locale === "el" ? "Όλα τα δεδομένα" : "All data"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {totalRows?.toLocaleString()} {locale === "el" ? "εγγραφές" : "records"}
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {locale === "el"
                    ? "Θα εξαχθούν όλα τα διαθέσιμα δεδομένα."
                    : "All available data will be exported."}
                </div>
              )}
            </>
          )}
          
          {totalRows && totalRows > 5000 && selectedScope === "all" && (
            <div className="flex items-center gap-2 text-sm text-warning bg-warning/10 dark:bg-amber-950/30 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                {locale === "el" 
                  ? "Η εξαγωγή μεγάλου αριθμού εγγραφών μπορεί να πάρει περισσότερο χρόνο"
                  : "Exporting a large number of records may take longer"
                }
              </span>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowExportDialog(false);
                setSelectedFormat(null);
                setSelectedPortal(null);
              }}
            >
              {locale === "el" ? "Ακύρωση" : "Cancel"}
            </Button>
            <Button
              onClick={handleExportConfirm}
              disabled={isExporting || (exportTab === "file" ? !selectedFormat : !selectedPortal)}
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {locale === "el" ? "Εξαγωγή..." : "Exporting..."}
                </>
              ) : exportTab === "portal" ? (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  {locale === "el" ? "Δημοσίευση" : "Publish"}
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
    </>
  );
}
