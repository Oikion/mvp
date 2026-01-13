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
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Calendar as CalendarIcon,
  List,
  Grid3X3,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================

export type ExportFormat = "xlsx" | "xls" | "csv" | "pdf";
export type ExportModule = "crm" | "mls" | "calendar" | "reports";
export type ExportScope = "filtered" | "all";
export type CalendarViewType = "list" | "grid";

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
  /** Custom class name */
  className?: string;
  /** Button variant */
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Show label text */
  showLabel?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const FORMAT_ICONS: Record<ExportFormat, React.ReactNode> = {
  xlsx: <FileSpreadsheet className="h-4 w-4" />,
  xls: <FileSpreadsheet className="h-4 w-4" />,
  csv: <FileText className="h-4 w-4" />,
  pdf: <FileText className="h-4 w-4" />,
};

const FORMAT_LABELS: Record<ExportFormat, { en: string; el: string }> = {
  xlsx: { en: "Excel (.xlsx)", el: "Excel (.xlsx)" },
  xls: { en: "Excel (.xls)", el: "Excel (.xls)" },
  csv: { en: "CSV (.csv)", el: "CSV (.csv)" },
  pdf: { en: "PDF (.pdf)", el: "PDF (.pdf)" },
};

const DEFAULT_FORMATS: Record<ExportModule, ExportFormat[]> = {
  crm: ["xlsx", "xls", "csv", "pdf"],
  mls: ["xlsx", "xls", "csv", "pdf"],
  calendar: ["pdf"], // Calendar only supports PDF
  reports: ["xlsx", "xls", "csv", "pdf"],
};

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
  className,
  variant = "outline",
  size = "default",
  showLabel = true,
}: ExportButtonProps) {
  const t = useTranslations("export");
  const locale = useLocale() as "en" | "el";
  
  const [isExporting, setIsExporting] = useState(false);
  const [showScopeDialog, setShowScopeDialog] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat | null>(null);
  const [selectedScope, setSelectedScope] = useState<ExportScope>("filtered");
  const [calendarViewType, setCalendarViewType] = useState<CalendarViewType>("list");
  
  const availableFormats = formats || DEFAULT_FORMATS[module];
  
  // Build export URL with filters
  const buildExportUrl = useCallback((format: ExportFormat, scope: ExportScope): string => {
    const params = new URLSearchParams();
    params.set("format", format);
    params.set("scope", scope);
    params.set("locale", locale);
    
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
  }, [module, locale, filters, calendarViewType]);
  
  // Handle export
  const handleExport = useCallback(async (format: ExportFormat, scope: ExportScope) => {
    setIsExporting(true);
    
    try {
      const url = buildExportUrl(format, scope);
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
      
      toast.success(
        locale === "el" ? "Η εξαγωγή ολοκληρώθηκε" : "Export completed",
        {
          description: locale === "el" 
            ? `Το αρχείο ${filename} κατέβηκε επιτυχώς`
            : `File ${filename} downloaded successfully`,
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
        }
      );
      
    } catch (error) {
      console.error("[EXPORT_ERROR]", error);
      toast.error(
        locale === "el" ? "Η εξαγωγή απέτυχε" : "Export failed",
        {
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          icon: <AlertCircle className="h-4 w-4 text-red-500" />,
        }
      );
    } finally {
      setIsExporting(false);
      setShowScopeDialog(false);
      setSelectedFormat(null);
    }
  }, [buildExportUrl, locale]);
  
  // Handle format selection
  const handleFormatSelect = useCallback((format: ExportFormat) => {
    // If there's filtered data and total data, show scope dialog
    if (filteredRows !== undefined && totalRows !== undefined && filteredRows !== totalRows) {
      setSelectedFormat(format);
      setShowScopeDialog(true);
    } else {
      // Export directly with all data
      handleExport(format, "all");
    }
  }, [filteredRows, totalRows, handleExport]);
  
  // Handle scope selection and export
  const handleScopeConfirm = useCallback(() => {
    if (selectedFormat) {
      handleExport(selectedFormat, selectedScope);
    }
  }, [selectedFormat, selectedScope, handleExport]);
  
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
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Scope Selection Dialog */}
      <Dialog open={showScopeDialog} onOpenChange={setShowScopeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {locale === "el" ? "Επιλογή Δεδομένων" : "Select Data"}
            </DialogTitle>
            <DialogDescription>
              {locale === "el" 
                ? "Επιλέξτε ποια δεδομένα θέλετε να εξαγάγετε"
                : "Choose which data you want to export"
              }
            </DialogDescription>
          </DialogHeader>
          
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
          
          {totalRows && totalRows > 5000 && selectedScope === "all" && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg">
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
              onClick={() => setShowScopeDialog(false)}
            >
              {locale === "el" ? "Ακύρωση" : "Cancel"}
            </Button>
            <Button
              onClick={handleScopeConfirm}
              disabled={isExporting}
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
    </>
  );
}
