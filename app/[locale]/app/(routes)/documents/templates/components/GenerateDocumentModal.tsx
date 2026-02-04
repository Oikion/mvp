"use client";

import { useState, useEffect, useCallback } from "react";
import { TemplateType } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Download, AlertCircle } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { toast } from "sonner";
import { getTemplate } from "@/actions/templates/get-templates";
import {
  getAutoFillData,
  getPropertiesForTemplate,
  getClientsForTemplate,
} from "@/actions/templates/get-auto-fill-data";
import type { TemplateDefinition, TemplatePlaceholder } from "@/lib/templates";

interface GenerateDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateType: TemplateType | null;
}

type PropertyOption = {
  id: string;
  property_name: string;
  address_street: string | null;
  municipality: string | null;
};

type ClientOption = {
  id: string;
  client_name: string;
  primary_email: string | null;
  primary_phone: string | null;
};

export function GenerateDocumentModal({
  open,
  onOpenChange,
  templateType,
}: GenerateDocumentModalProps) {
  const t = useTranslations("templates");
  const locale = useLocale() as "en" | "el";
  const isGreek = locale === "el";

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [template, setTemplate] = useState<TemplateDefinition | null>(null);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<string[]>([]);

  // Load template and options when modal opens
  useEffect(() => {
    if (open && templateType) {
      loadData();
    } else {
      // Reset state when closing
      setTemplate(null);
      setValues({});
      setSelectedPropertyId("");
      setSelectedClientId("");
      setErrors([]);
    }
  }, [open, templateType]);

  const loadData = async () => {
    if (!templateType) return;

    setLoading(true);
    try {
      const [templateData, propertiesData, clientsData] = await Promise.all([
        getTemplate(templateType),
        getPropertiesForTemplate(),
        getClientsForTemplate(),
      ]);

      setTemplate(templateData);
      setProperties(propertiesData as PropertyOption[]);
      setClients(clientsData as ClientOption[]);

      // Initialize values with defaults
      if (templateData) {
        const initialValues: Record<string, string> = {};
        templateData.placeholders.forEach((p) => {
          if (p.defaultValue) {
            initialValues[p.key] = p.defaultValue;
          }
        });
        setValues(initialValues);
      }
    } catch (error) {
      console.error("Failed to load template data:", error);
      toast.error(t("failedToLoadTemplate"));
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill when property or client changes
  const handleAutoFill = useCallback(
    async (propertyId: string, clientId: string) => {
      if (!templateType) return;

      try {
        const result = await getAutoFillData({
          templateType,
          propertyId: propertyId || undefined,
          clientId: clientId || undefined,
        });

        // Merge auto-filled values with existing (user values take precedence)
        setValues((prev) => ({
          ...result.values,
          ...prev,
        }));
      } catch (error) {
        console.error("Auto-fill failed:", error);
      }
    },
    [templateType]
  );

  const handlePropertyChange = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
    if (propertyId) {
      handleAutoFill(propertyId, selectedClientId);
    }
  };

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    if (clientId) {
      handleAutoFill(selectedPropertyId, clientId);
    }
  };

  const handleValueChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Clear error for this field
    setErrors((prev) => prev.filter((e) => e !== key));
  };

  const handleGenerate = async () => {
    if (!template) return;

    setGenerating(true);
    setErrors([]);

    try {
      const response = await fetch("/api/templates/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateType,
          values,
          locale,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.missing) {
          setErrors(errorData.missing);
          toast.error(t("missingRequiredFields"));
          return;
        }
        throw new Error(errorData.error || "Failed to generate PDF");
      }

      // Download the PDF
      const blob = await response.blob();
      const filename =
        response.headers
          .get("Content-Disposition")
          ?.split("filename=")[1]
          ?.replaceAll('"', "") ||
        `${template.name}_${new Date().toISOString().split("T")[0]}.pdf`;

      const url = globalThis.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = decodeURIComponent(filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.URL.revokeObjectURL(url);

      toast.success(t("pdfGenerated"));
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error(t("failedToGeneratePdf"));
    } finally {
      setGenerating(false);
    }
  };

  const renderField = (placeholder: TemplatePlaceholder) => {
    const label = isGreek ? placeholder.labelEl : placeholder.labelEn;
    const value = values[placeholder.key] || "";
    const hasError = errors.includes(label);

    const fieldClass = hasError
      ? "border-destructive focus-visible:ring-destructive"
      : "";

    switch (placeholder.type) {
      case "select":
        return (
          <div key={placeholder.key} className="space-y-2">
            <Label className={hasError ? "text-destructive" : ""}>
              {label}
              {placeholder.required && <span className="text-destructive"> *</span>}
            </Label>
            <Select
              value={value}
              onValueChange={(v) => handleValueChange(placeholder.key, v)}
            >
              <SelectTrigger className={fieldClass}>
                <SelectValue placeholder={t("selectOption")} />
              </SelectTrigger>
              <SelectContent>
                {placeholder.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {isGreek ? option.labelEl : option.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case "boolean":
        return (
          <div key={placeholder.key} className="flex items-center justify-between space-y-0 py-2">
            <Label className={hasError ? "text-destructive" : ""}>
              {label}
              {placeholder.required && <span className="text-destructive"> *</span>}
            </Label>
            <Switch
              checked={value === "true"}
              onCheckedChange={(checked) =>
                handleValueChange(placeholder.key, checked ? "true" : "false")
              }
            />
          </div>
        );

      case "date":
        return (
          <div key={placeholder.key} className="space-y-2">
            <Label className={hasError ? "text-destructive" : ""}>
              {label}
              {placeholder.required && <span className="text-destructive"> *</span>}
            </Label>
            <Input
              type="date"
              value={value}
              onChange={(e) => handleValueChange(placeholder.key, e.target.value)}
              className={fieldClass}
            />
          </div>
        );

      case "number":
      case "currency":
        return (
          <div key={placeholder.key} className="space-y-2">
            <Label className={hasError ? "text-destructive" : ""}>
              {label}
              {placeholder.required && <span className="text-destructive"> *</span>}
            </Label>
            <Input
              type="number"
              value={value}
              onChange={(e) => handleValueChange(placeholder.key, e.target.value)}
              className={fieldClass}
              step={placeholder.type === "currency" ? "0.01" : "1"}
            />
          </div>
        );

      default:
        return (
          <div key={placeholder.key} className="space-y-2">
            <Label className={hasError ? "text-destructive" : ""}>
              {label}
              {placeholder.required && <span className="text-destructive"> *</span>}
            </Label>
            <Input
              type="text"
              value={value}
              onChange={(e) => handleValueChange(placeholder.key, e.target.value)}
              className={fieldClass}
            />
          </div>
        );
    }
  };

  // Group placeholders by category (first word of key before underscore)
  const groupedPlaceholders = template?.placeholders.reduce(
    (acc, p) => {
      const category = p.key.split("_")[0];
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(p);
      return acc;
    },
    {} as Record<string, TemplatePlaceholder[]>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {(() => {
              if (!template) return t("generateDocument");
              return isGreek ? template.nameEl : template.nameEn;
            })()}
          </DialogTitle>
          <DialogDescription>
            {t("fillFieldsToGenerate")}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && template && (
          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-6 pb-4">
              {/* Entity Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("selectProperty")}</Label>
                  <Select
                    value={selectedPropertyId || "none"}
                    onValueChange={(value) => handlePropertyChange(value === "none" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("optionalSelectProperty")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("noProperty")}</SelectItem>
                      {properties.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.property_name}
                          {p.municipality && ` - ${p.municipality}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("selectClient")}</Label>
                  <Select
                    value={selectedClientId || "none"}
                    onValueChange={(value) => handleClientChange(value === "none" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("optionalSelectClient")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t("noClient")}</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.client_name}
                          {c.primary_phone && ` - ${c.primary_phone}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Show errors */}
              {errors.length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-destructive">{t("missingFields")}:</p>
                    <ul className="list-disc list-inside mt-1 text-destructive/80">
                      {errors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Form Fields */}
              {groupedPlaceholders &&
                Object.entries(groupedPlaceholders).map(([category, placeholders]) => (
                  <div key={category} className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide border-b pb-2">
                      {category}
                    </h3>
                    <div className="grid gap-4">
                      {placeholders.map(renderField)}
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button 
            leftIcon={generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            onClick={handleGenerate} 
            disabled={generating || loading}
          >
            {generating ? t("generating") : t("generateAndDownload")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
