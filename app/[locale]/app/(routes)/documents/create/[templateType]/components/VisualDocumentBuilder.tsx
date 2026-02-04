"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "@/navigation";
import { TemplateType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Loader2, Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { BuilderSidebar } from "./BuilderSidebar";
import { DocumentCanvas } from "./DocumentCanvas";
import type { TemplateDefinition } from "@/lib/templates";

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

interface VisualDocumentBuilderProps {
  readonly templateType: TemplateType;
  readonly definition: TemplateDefinition;
  readonly properties: PropertyOption[];
  readonly clients: ClientOption[];
  readonly locale: "en" | "el";
}

export function VisualDocumentBuilder({
  templateType,
  definition,
  properties,
  clients,
  locale,
}: VisualDocumentBuilderProps) {
  const t = useTranslations("documents.builder");
  const router = useRouter();
  const isGreek = locale === "el";

  const [values, setValues] = useState<Record<string, string>>(() => {
    // Initialize with default values from placeholders
    const initialValues: Record<string, string> = {};
    definition.placeholders.forEach((p) => {
      if (p.defaultValue) {
        initialValues[p.key] = p.defaultValue;
      }
    });
    return initialValues;
  });

  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  
  // Field refs map for focusing fields from sidebar
  const fieldRefs = useRef<Map<string, HTMLInputElement | HTMLButtonElement>>(new Map());

  const handleValueChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleAutoFill = useCallback(
    async (propertyId: string, clientId: string) => {
      try {
        const response = await fetch("/api/templates/auto-fill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateType,
            propertyId: propertyId || undefined,
            clientId: clientId || undefined,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          // Merge auto-filled values, preserving user-edited values
          setValues((prev) => {
            const newValues = { ...prev };
            Object.entries(data.values).forEach(([key, value]) => {
              // Only auto-fill if field is empty or matches previous auto-fill
              if (!prev[key] || prev[key] === "") {
                newValues[key] = value as string;
              }
            });
            return newValues;
          });
        }
      } catch (error) {
        console.error("Auto-fill failed:", error);
      }
    },
    [templateType]
  );

  const handlePropertyChange = useCallback(
    (propertyId: string) => {
      setSelectedPropertyId(propertyId);
      if (propertyId) {
        handleAutoFill(propertyId, selectedClientId);
      }
    },
    [selectedClientId, handleAutoFill]
  );

  const handleClientChange = useCallback(
    (clientId: string) => {
      setSelectedClientId(clientId);
      if (clientId) {
        handleAutoFill(selectedPropertyId, clientId);
      }
    },
    [selectedPropertyId, handleAutoFill]
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch("/api/templates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateType,
          values,
          locale,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.missing) {
          toast.error(t("missingRequiredFields"));
          return;
        }
        throw new Error(errorData.error || "Export failed");
      }

      const blob = await response.blob();
      const filename =
        response.headers
          .get("Content-Disposition")
          ?.split("filename=")[1]
          ?.replaceAll('"', "") ||
        `${definition.name}_${new Date().toISOString().split("T")[0]}.pdf`;

      const url = globalThis.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = decodeURIComponent(filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      globalThis.URL.revokeObjectURL(url);

      toast.success(t("exportSuccess"));
    } catch (error) {
      console.error("Export failed:", error);
      toast.error(t("exportFailed"));
    } finally {
      setIsExporting(false);
    }
  };

  const handleClear = useCallback(() => {
    const clearedValues: Record<string, string> = {};
    definition.placeholders.forEach((p) => {
      if (p.defaultValue) {
        clearedValues[p.key] = p.defaultValue;
      }
    });
    setValues(clearedValues);
    setSelectedPropertyId("");
    setSelectedClientId("");
  }, [definition.placeholders]);

  // Register field ref for focusing
  const registerFieldRef = useCallback((key: string, ref: HTMLInputElement | HTMLButtonElement | null) => {
    if (ref) {
      fieldRefs.current.set(key, ref);
    } else {
      fieldRefs.current.delete(key);
    }
  }, []);

  // Focus field when clicked from sidebar
  const handleFieldFocus = useCallback((key: string) => {
    const ref = fieldRefs.current.get(key);
    if (ref) {
      ref.focus();
      // Scroll the field into view
      ref.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  // Calculate completion
  const requiredFields = definition.placeholders.filter((p) => p.required);
  const filledRequired = requiredFields.filter((p) => values[p.key]?.trim()).length;
  const completionPercentage = Math.round((filledRequired / requiredFields.length) * 100);

  const templateName = isGreek ? definition.nameEl : definition.nameEn;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Bar - Theme-aware */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/app/documents")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-lg">{templateName}</h1>
            <p className="text-sm text-muted-foreground">
              {t("completionStatus", { percentage: completionPercentage })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Eye className="h-4 w-4" />}
            onClick={() => setIsPreviewing(!isPreviewing)}
          >
            {isPreviewing ? t("edit") : t("preview")}
          </Button>
          <Button
            leftIcon={isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            onClick={handleExport}
            disabled={isExporting || completionPercentage < 100}
            size="sm"
          >
            {isExporting ? t("exporting") : t("exportPdf")}
          </Button>
        </div>
      </div>

      {/* Main Content - Sidebar on RIGHT */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Document Canvas - Theme-aware background, full width */}
        <main className="flex-1 overflow-auto bg-muted/50 p-6">
          <DocumentCanvas
            templateType={templateType}
            definition={definition}
            values={values}
            locale={locale}
            isPreview={isPreviewing}
            onValueChange={handleValueChange}
            registerFieldRef={registerFieldRef}
          />
        </main>

        {/* Sidebar - Now on the RIGHT */}
        <BuilderSidebar
          definition={definition}
          properties={properties}
          clients={clients}
          selectedPropertyId={selectedPropertyId}
          selectedClientId={selectedClientId}
          values={values}
          locale={locale}
          onPropertyChange={handlePropertyChange}
          onClientChange={handleClientChange}
          onClear={handleClear}
          onFieldClick={handleFieldFocus}
        />
      </div>
    </div>
  );
}
