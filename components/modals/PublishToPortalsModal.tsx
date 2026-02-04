// @ts-nocheck
// TODO: Fix type errors
"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Globe, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Download,
  Building2,
  FileCode,
  FileText,
  ExternalLink,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { syncPropertiesToXe, isXeIntegrationActive } from "@/actions/xe";
import { BatchProgressAnimation } from "@/components/ui/thinking-text-animation";

// ============================================
// TYPES
// ============================================

type PortalType = "publish" | "export";

interface Portal {
  id: string;
  name: string;
  nameEl?: string;
  description?: { en: string; el: string };
  icon?: React.ReactNode;
  enabled: boolean;
  type: PortalType;
  format?: "xml" | "csv";
  website?: string;
}

// ============================================
// PORTAL DEFINITIONS
// ============================================

const PUBLISH_PORTALS: Portal[] = [
  {
    id: "xe.gr",
    name: "xe.gr",
    nameEl: "xe.gr",
    description: {
      en: "Greece's largest classifieds portal",
      el: "Η μεγαλύτερη πύλη αγγελιών στην Ελλάδα",
    },
    icon: <Globe className="h-4 w-4 text-success" />,
    enabled: true,
    type: "publish",
    website: "https://www.xe.gr",
  },
];

const EXPORT_PORTALS: Portal[] = [
  {
    id: "spitogatos",
    name: "Spitogatos.gr",
    nameEl: "Spitogatos.gr",
    description: {
      en: "Greece's leading real estate portal",
      el: "Η κορυφαία ελληνική πύλη ακινήτων",
    },
    icon: <Building2 className="h-4 w-4 text-primary" />,
    enabled: true,
    type: "export",
    format: "xml",
    website: "https://www.spitogatos.gr",
  },
  {
    id: "golden_home",
    name: "Golden Home",
    nameEl: "Golden Home",
    description: {
      en: "Premium real estate agency",
      el: "Premium μεσιτική εταιρεία",
    },
    icon: <Building2 className="h-4 w-4 text-warning" />,
    enabled: true,
    type: "export",
    format: "csv",
    website: "https://www.goldenhome.gr",
  },
  {
    id: "tospitimou",
    name: "Tospitimou.gr",
    nameEl: "Tospitimou.gr",
    description: {
      en: "Greek real estate marketplace",
      el: "Ελληνική αγορά ακινήτων",
    },
    icon: <Building2 className="h-4 w-4 text-purple-600" />,
    enabled: true,
    type: "export",
    format: "csv",
    website: "https://www.tospitimou.gr",
  },
  {
    id: "home_greek_home",
    name: "HomeGreekHome",
    nameEl: "HomeGreekHome",
    description: {
      en: "International Greek property listings",
      el: "Διεθνείς αγγελίες ελληνικών ακινήτων",
    },
    icon: <Globe className="h-4 w-4 text-cyan-600" />,
    enabled: true,
    type: "export",
    format: "xml",
    website: "https://www.homegreekhome.com",
  },
  {
    id: "facebook",
    name: "Facebook Marketplace",
    nameEl: "Facebook Marketplace",
    description: {
      en: "Social media marketplace listings",
      el: "Αγγελίες στην αγορά του Facebook",
    },
    icon: <Globe className="h-4 w-4 text-primary" />,
    enabled: true,
    type: "export",
    format: "csv",
    website: "https://www.facebook.com/marketplace",
  },
];

const ALL_PORTALS = [...PUBLISH_PORTALS, ...EXPORT_PORTALS];

// ============================================
// COMPONENT
// ============================================

interface PublishToPortalsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProperties: { id: string; property_name?: string; [key: string]: unknown }[];
  onPublish: (propertyIds: string[], portalIds: string[]) => Promise<void>;
}

export function PublishToPortalsModal({
  open,
  onOpenChange,
  selectedProperties,
  onPublish,
}: PublishToPortalsModalProps) {
  const t = useTranslations("mls.BulkActions");
  const locale = useLocale() as "en" | "el";
  const [selectedPortals, setSelectedPortals] = React.useState<string[]>([]);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"publish" | "export">("export");
  const [xeIntegrationEnabled, setXeIntegrationEnabled] = React.useState<boolean | null>(null);
  
  // Processing animation state
  const [processingState, setProcessingState] = React.useState<{
    currentProperty: string;
    currentPortal: string;
    processedCount: number;
    totalCount: number;
  } | null>(null);

  // Reset selections when modal opens and check XE integration status
  React.useEffect(() => {
    if (open) {
      setSelectedPortals([]);
      setActiveTab("export");
      
      // Check if XE integration is active
      isXeIntegrationActive().then(setXeIntegrationEnabled);
    }
  }, [open]);

  const handlePortalToggle = (portalId: string) => {
    setSelectedPortals((prev) =>
      prev.includes(portalId)
        ? prev.filter((id) => id !== portalId)
        : [...prev, portalId]
    );
  };

  const handleSelectAll = (portals: Portal[]) => {
    const enabledPortalIds = portals.filter(p => p.enabled).map(p => p.id);
    const allSelected = enabledPortalIds.every(id => selectedPortals.includes(id));
    
    if (allSelected) {
      // Deselect all from this category
      setSelectedPortals(prev => prev.filter(id => !enabledPortalIds.includes(id)));
    } else {
      // Select all from this category
      setSelectedPortals(prev => [...new Set([...prev, ...enabledPortalIds])]);
    }
  };

  // Handle export to portal (download file)
  const handleExportToPortal = async (portalId: string) => {
    const propertyIds = selectedProperties.map((p) => p.id);
    
    try {
      const params = new URLSearchParams();
      params.set("portal", portalId);
      params.set("locale", locale);
      params.set("ids", propertyIds.join(","));
      
      const response = await fetch(`/api/export/portal?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Export failed with status ${response.status}`);
      }
      
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const portal = EXPORT_PORTALS.find(p => p.id === portalId);
      const filename = filenameMatch?.[1] || `${portalId}_export.${portal?.format || "csv"}`;
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      
      return { success: true, filename, portalId };
    } catch (error) {
      console.error(`Export to ${portalId} failed:`, error);
      return { 
        success: false, 
        portalId, 
        error: error instanceof Error ? error.message : "Unknown error" 
      };
    }
  };

  const handleSubmit = async () => {
    if (selectedPortals.length === 0) {
      toast.error(locale === "el" ? "Επιλέξτε τουλάχιστον ένα portal" : "Select at least one portal");
      return;
    }

    setIsProcessing(true);
    
    try {
      const propertyIds = selectedProperties.map((p) => p.id);
      
      // Separate publish and export portals
      const publishPortalIds = selectedPortals.filter(id => 
        PUBLISH_PORTALS.some(p => p.id === id)
      );
      const exportPortalIds = selectedPortals.filter(id => 
        EXPORT_PORTALS.some(p => p.id === id)
      );
      
      const results: { portal: string; success: boolean; filename?: string; error?: string }[] = [];
      const totalOperations = publishPortalIds.length + exportPortalIds.length;
      let completedOperations = 0;
      
      // Helper to get portal display name
      const getPortalName = (portalId: string) => {
        const portal = ALL_PORTALS.find(p => p.id === portalId);
        return locale === "el" ? (portal?.nameEl || portal?.name || portalId) : (portal?.name || portalId);
      };
      
      // Helper to get property display name
      const getPropertyName = (index: number) => {
        const property = selectedProperties[index % selectedProperties.length];
        return property?.property_name || `Property ${index + 1}`;
      };
      
      // Handle publish portals (API submission)
      if (publishPortalIds.length > 0) {
        // Handle xe.gr separately with the new XE sync action
        if (publishPortalIds.includes("xe.gr")) {
          // Update animation state
          setProcessingState({
            currentProperty: getPropertyName(0),
            currentPortal: getPortalName("xe.gr"),
            processedCount: completedOperations,
            totalCount: totalOperations,
          });
          
          try {
            const xeResult = await syncPropertiesToXe({ propertyIds });
            results.push({
              portal: "xe.gr",
              success: xeResult.success,
              error: xeResult.success ? undefined : xeResult.message,
            });
            
            if (xeResult.success && xeResult.packageId) {
              toast.info(
                locale === "el"
                  ? `Πακέτο xe.gr: ${xeResult.packageId}`
                  : `xe.gr Package: ${xeResult.packageId}`,
                { duration: 5000 }
              );
            }
          } catch (error) {
            results.push({
              portal: "xe.gr",
              success: false,
              error: error instanceof Error ? error.message : "XE sync failed",
            });
          }
          completedOperations++;
        }
        
        // Handle other publish portals with the original callback
        const otherPublishPortals = publishPortalIds.filter(id => id !== "xe.gr");
        if (otherPublishPortals.length > 0) {
          for (const portalId of otherPublishPortals) {
            // Update animation state
            setProcessingState({
              currentProperty: getPropertyName(0),
              currentPortal: getPortalName(portalId),
              processedCount: completedOperations,
              totalCount: totalOperations,
            });
            
            try {
              await onPublish(propertyIds, [portalId]);
              results.push({ portal: portalId, success: true });
            } catch (error) {
              results.push({ 
                portal: portalId, 
                success: false, 
                error: error instanceof Error ? error.message : "Publish failed" 
              });
            }
            completedOperations++;
          }
        }
      }
      
      // Handle export portals (file download)
      for (let i = 0; i < exportPortalIds.length; i++) {
        const portalId = exportPortalIds[i];
        
        // Update animation state with cycling through properties
        setProcessingState({
          currentProperty: getPropertyName(i),
          currentPortal: getPortalName(portalId),
          processedCount: completedOperations,
          totalCount: totalOperations,
        });
        
        // Small delay for animation visibility
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const result = await handleExportToPortal(portalId);
        results.push({
          portal: portalId,
          success: result.success,
          filename: result.success ? result.filename : undefined,
          error: !result.success ? result.error : undefined,
        });
        completedOperations++;
      }
      
      // Clear processing state
      setProcessingState(null);
      
      // Show results
      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;
      
      if (successCount > 0 && failedCount === 0) {
        const exportedFiles = results.filter(r => r.filename).length;
        const publishedCount = results.filter(r => r.success && !r.filename).length;
        
        let message = "";
        if (exportedFiles > 0 && publishedCount > 0) {
          message = locale === "el" 
            ? `${exportedFiles} αρχεία κατέβηκαν, ${publishedCount} δημοσιεύτηκαν`
            : `${exportedFiles} files downloaded, ${publishedCount} published`;
        } else if (exportedFiles > 0) {
          message = locale === "el" 
            ? `${exportedFiles} αρχεία κατέβηκαν επιτυχώς`
            : `${exportedFiles} files downloaded successfully`;
        } else {
          message = locale === "el"
            ? `Δημοσιεύτηκαν επιτυχώς σε ${publishedCount} portals`
            : `Successfully published to ${publishedCount} portals`;
        }
        
        toast.success(message);
        onOpenChange(false);
      } else if (failedCount > 0) {
        const failedPortals = results.filter(r => !r.success).map(r => r.portal).join(", ");
        toast.error(
          locale === "el" 
            ? `Αποτυχία για: ${failedPortals}` 
            : `Failed for: ${failedPortals}`,
          { 
            description: successCount > 0 
              ? (locale === "el" ? `${successCount} επιτυχώς` : `${successCount} succeeded`)
              : undefined
          }
        );
        if (successCount > 0) {
          onOpenChange(false);
        }
      }
      
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(locale === "el" ? "Σφάλμα επεξεργασίας" : "Processing error");
      setProcessingState(null);
    } finally {
      setIsProcessing(false);
      setProcessingState(null);
    }
  };

  const renderPortalItem = (portal: Portal) => {
    const isSelected = selectedPortals.includes(portal.id);
    
    return (
      <div
        key={portal.id}
        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
          isSelected
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        } ${!portal.enabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        onClick={() => portal.enabled && handlePortalToggle(portal.id)}
        role="button"
        tabIndex={portal.enabled ? 0 : -1}
        onKeyDown={(e) => {
          if (portal.enabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handlePortalToggle(portal.id);
          }
        }}
      >
        <Checkbox
          id={portal.id}
          checked={isSelected}
          onCheckedChange={() => handlePortalToggle(portal.id)}
          disabled={!portal.enabled}
        />
        <div className="flex-shrink-0">
          {portal.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Label
              htmlFor={portal.id}
              className="cursor-pointer font-medium text-sm"
            >
              {locale === "el" ? portal.nameEl || portal.name : portal.name}
            </Label>
            {portal.format && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                {portal.format.toUpperCase()}
              </Badge>
            )}
          </div>
          {portal.description && (
            <p className="text-xs text-muted-foreground line-clamp-1">
              {portal.description[locale]}
            </p>
          )}
        </div>
        {!portal.enabled && (
          <Badge variant="outline" className="text-xs shrink-0">
            {locale === "el" ? "Σύντομα" : "Coming soon"}
          </Badge>
        )}
        {portal.website && portal.enabled && (
          <a
            href={portal.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    );
  };

  const selectedExportPortals = selectedPortals.filter(id => 
    EXPORT_PORTALS.some(p => p.id === id)
  );
  const selectedPublishPortals = selectedPortals.filter(id => 
    PUBLISH_PORTALS.some(p => p.id === id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-success" />
            {locale === "el" ? "Δημοσίευση σε Portals" : "Publish to Portals"}
          </DialogTitle>
          <DialogDescription>
            {locale === "el" 
              ? `Εξαγωγή ${selectedProperties.length} ακινήτων σε επιλεγμένα portals`
              : `Export ${selectedProperties.length} properties to selected portals`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Processing Animation Overlay */}
          {isProcessing && processingState && (
            <BatchProgressAnimation
              currentProperty={processingState.currentProperty}
              currentPortal={processingState.currentPortal}
              processedCount={processingState.processedCount}
              totalCount={processingState.totalCount}
              className="mb-4"
            />
          )}
          
          {/* Selected properties summary */}
          {!isProcessing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="secondary">
                {selectedProperties.length} {locale === "el" ? "επιλεγμένα" : "selected"}
              </Badge>
              <span>{locale === "el" ? "ακίνητα επιλέχθηκαν" : "properties selected"}</span>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "publish" | "export")} className={`w-full ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="export">
                <Download className="h-4 w-4" />
                {locale === "el" ? "Εξαγωγή Αρχείου" : "Export File"}
                {selectedExportPortals.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                    {selectedExportPortals.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="publish">
                <Globe className="h-4 w-4" />
                {locale === "el" ? "API Δημοσίευση" : "API Publish"}
                {selectedPublishPortals.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center">
                    {selectedPublishPortals.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="export" className="space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {locale === "el" ? "Επιλέξτε Portals για Εξαγωγή" : "Select Portals to Export"}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => handleSelectAll(EXPORT_PORTALS)}
                >
                  {EXPORT_PORTALS.filter(p => p.enabled).every(p => selectedPortals.includes(p.id))
                    ? (locale === "el" ? "Αποεπιλογή όλων" : "Deselect all")
                    : (locale === "el" ? "Επιλογή όλων" : "Select all")}
                </Button>
              </div>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {EXPORT_PORTALS.map(renderPortalItem)}
              </div>
              <p className="text-xs text-muted-foreground">
                {locale === "el" 
                  ? "Τα αρχεία θα κατέβουν αυτόματα σε συμβατή μορφή για κάθε portal"
                  : "Files will be automatically downloaded in compatible format for each portal"}
              </p>
            </TabsContent>
            
            <TabsContent value="publish" className="space-y-3 mt-4">
              <Label className="text-sm font-medium">
                {locale === "el" ? "Επιλέξτε Portals για Δημοσίευση" : "Select Portals to Publish"}
              </Label>
              <div className="space-y-2">
                {PUBLISH_PORTALS.map(renderPortalItem)}
              </div>
              
              {/* XE Integration Status */}
              {xeIntegrationEnabled === false && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
                  <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <div>
                    <p className="text-destructive font-medium">
                      {locale === "el"
                        ? "Η ενσωμάτωση xe.gr δεν είναι ρυθμισμένη"
                        : "xe.gr integration is not configured"}
                    </p>
                    <p className="text-destructive/80 text-xs mt-1">
                      {locale === "el"
                        ? "Ρυθμίστε τα διαπιστευτήρια XE στις ρυθμίσεις διαχειριστή."
                        : "Configure XE credentials in admin settings."}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Info note for API publish */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 text-sm">
                <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <p className="text-warning dark:text-amber-300">
                  {locale === "el"
                    ? "Τα ακίνητα θα οριστούν σε ΔΗΜΟΣΙΑ ορατότητα και θα υποβληθούν στα επιλεγμένα portals."
                    : "Properties will be set to PUBLIC visibility and submitted to selected portals."}
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Selection summary */}
          {selectedPortals.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2 border-t">
              {selectedPortals.map((portalId) => {
                const portal = ALL_PORTALS.find(p => p.id === portalId);
                return (
                  <Badge 
                    key={portalId} 
                    variant="secondary" 
                    className="text-xs cursor-pointer hover:bg-destructive/20"
                    onClick={() => handlePortalToggle(portalId)}
                  >
                    {portal?.name}
                    {portal?.format && ` (${portal.format.toUpperCase()})`}
                    <span className="ml-1 text-muted-foreground">×</span>
                  </Badge>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            {locale === "el" ? "Ακύρωση" : "Cancel"}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isProcessing || selectedPortals.length === 0}
            className="gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {locale === "el" ? "Επεξεργασία..." : "Processing..."}
              </>
            ) : selectedExportPortals.length > 0 && selectedPublishPortals.length === 0 ? (
              <>
                <Download className="h-4 w-4" />
                {locale === "el" 
                  ? `Εξαγωγή (${selectedExportPortals.length})` 
                  : `Export (${selectedExportPortals.length})`}
              </>
            ) : selectedPublishPortals.length > 0 && selectedExportPortals.length === 0 ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {locale === "el" 
                  ? `Δημοσίευση (${selectedPublishPortals.length})` 
                  : `Publish (${selectedPublishPortals.length})`}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {locale === "el" 
                  ? `Επιβεβαίωση (${selectedPortals.length})` 
                  : `Confirm (${selectedPortals.length})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
