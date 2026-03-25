"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ImportWizardSteps, type ImportResult } from "@/components/import";
import { UNIFIED_FIELD_DEFINITIONS, MANDATE_FIELD_KEYS } from "@/lib/import";
import { useAppToast } from "@/hooks/use-app-toast";

interface UnifiedImportWizardProps {
  dict: {
    ImportWizard: {
      title: string;
      progress: string;
      steps: {
        upload: { title: string; description: string };
        mapping: { title: string; description: string };
        validation: { title: string; description: string };
        review: { title: string; description: string };
        complete: { title: string; description: string };
      };
      upload: {
        dropzone: string;
        supportedFormats: string;
        maxSize: string;
        selectedFile: string;
        removeFile: string;
        downloadTemplate: string;
        templateDescription: string;
      };
      mapping: {
        csvColumn: string;
        targetField: string;
        preview: string;
        unmapped: string;
        required: string;
        optional: string;
        autoMapped: string;
        manuallyMapped: string;
        noMapping: string;
        selectField: string;
        sampleData: string;
      };
      validation: {
        validRows: string;
        invalidRows: string;
        totalRows: string;
        noErrors: string;
        hasErrors: string;
        errorDetails: string;
        row: string;
        field: string;
        error: string;
        value: string;
        fixHint: string;
      };
      review: {
        previewTitle: string;
        previewDescription: string;
        readyToImport: string;
        willSkip: string;
        confirmImport: string;
      };
      complete: {
        successTitle: string;
        successDescription: string;
        imported: string;
        skipped: string;
        failed: string;
        viewImported: string;
        importMore: string;
        done: string;
      };
      buttons: {
        back: string;
        next: string;
        import: string;
        cancel: string;
        close: string;
        done: string;
        retry: string;
      };
      errors: {
        fileRequired: string;
        invalidFileType: string;
        fileTooLarge: string;
        parseError: string;
        noData: string;
        importFailed: string;
        serverError: string;
        requiredFieldMissing: string;
        invalidValue: string;
      };
    };
    ImportFields: {
      groups: Record<string, string>;
      fields: Record<string, string>;
      enums?: Record<string, Record<string, string>>;
    };
  };
  locale: string;
  returnUrl: string;
}

export function UnifiedImportWizard({ dict, locale, returnUrl }: UnifiedImportWizardProps) {
  const router = useRouter();
  const { toast } = useAppToast();

  // Passthrough schema — validates row is usable without stripping any fields.
  // Real per-entity Zod validation happens server-side after partitioning.
  const schema = useMemo(() => z.record(z.unknown()).refine(
    (row) => {
      const hasClient = !!(row.client_name || row.primary_phone || row.primary_email);
      const hasProperty = !!row.property_name;
      const hasMandate = Object.entries(row).some(
        ([key, val]) => MANDATE_FIELD_KEYS.has(key) && val !== null && val !== undefined && val !== ""
      );
      return hasClient || hasProperty || hasMandate;
    },
    { message: "Row must contain data for at least one entity (client, property, or mandate)" }
  ), []);

  const handleImport = useCallback(
    async (data: Record<string, unknown>[], signal?: AbortSignal): Promise<ImportResult> => {
      try {
        const response = await fetch("/api/import/unified", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: data }),
          signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Import failed");
        }

        const result = await response.json();

        if ((result.clients?.created ?? 0) + (result.properties?.created ?? 0) + (result.mandates?.created ?? 0) > 0) {
          toast.success("Import successful", {
            description: `Created ${result.clients?.created ?? 0} client(s), ${result.properties?.created ?? 0} property(ies), ${result.mandates?.created ?? 0} mandate(s)`,
            isTranslationKey: false,
          });
        }

        return {
          imported: (result.clients?.created ?? 0)
            + (result.properties?.created ?? 0) + (result.mandates?.created ?? 0),
          skipped: result.skipped ?? 0,
          failed: (result.clients?.failed ?? 0) + (result.properties?.failed ?? 0) + (result.mandates?.failed ?? 0),
          errors: result.errors ?? [],
          clients: result.clients,
          properties: result.properties,
          mandates: result.mandates,
          links: result.links,
        };
      } catch (error) {
        console.error("Import error:", error);
        toast.error("Import failed", {
          description: error instanceof Error ? error.message : String(error),
          isTranslationKey: false,
        });
        return {
          imported: 0,
          skipped: 0,
          failed: data.length,
          errors: [{ row: 0, field: "", error: dict.ImportWizard.errors.serverError }],
        };
      }
    },
    [toast, dict.ImportWizard.errors.serverError]
  );

  const handleComplete = useCallback(() => {
    router.push(returnUrl);
    router.refresh();
  }, [router, returnUrl]);

  const handleCancel = useCallback(() => {
    router.push(returnUrl);
  }, [router, returnUrl]);

  return (
    <ImportWizardSteps
      entityType="property"
      dict={dict.ImportWizard}
      fieldsDict={dict.ImportFields}
      schema={schema}
      fieldDefinitions={UNIFIED_FIELD_DEFINITIONS}
      onImport={handleImport}
      onComplete={handleComplete}
      onCancel={handleCancel}
      viewUrl={returnUrl}
      unifiedMode={true}
      mandateFieldKeys={MANDATE_FIELD_KEYS}
    />
  );
}
