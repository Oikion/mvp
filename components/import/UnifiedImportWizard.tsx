"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ImportWizardSteps, type ImportResult } from "@/components/import";
import { UNIFIED_FIELD_DEFINITIONS, REQUEST_FIELD_KEYS } from "@/lib/import/unified-field-definitions";
import { useAppToast } from "@/hooks/use-app-toast";
import type { BatchImportResult } from "@/lib/import/unified-engine";

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
        importing?: { title: string; description: string };
        complete: { title: string; description: string };
      };
      upload: {
        dropzone: string;
        supportedFormats: string;
        maxSize: string;
        maxRows: string;
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
      contact?: { groups: Record<string, string>; fields: Record<string, string>; enums?: Record<string, Record<string, string>> };
      property?: { groups: Record<string, string>; fields: Record<string, string>; enums?: Record<string, Record<string, string>> };
      request?: { groups: Record<string, string>; fields: Record<string, string>; enums?: Record<string, Record<string, string>> };
      unified?: { groups: Record<string, string>; fields: Record<string, string> };
    };
  };
  locale: string;
  returnUrl: string;
}

export function UnifiedImportWizard({ dict, locale, returnUrl }: Readonly<UnifiedImportWizardProps>) {
  const router = useRouter();
  const { toast } = useAppToast();

  // Build a flat fieldsDict from the nested per-entity ImportFields structure.
  // The TableMappingStep expects { groups, fields, enums } at the top level.
  const fieldsDict = useMemo(() => {
    const importFields = dict.ImportFields;
    const groups = importFields.unified?.groups ?? {};
    const fields = importFields.unified?.fields ?? {};
    // Merge enums from all entity types into a single flat map
    const enums: Record<string, Record<string, string>> = {
      ...importFields.contact?.enums,
      ...importFields.property?.enums,
      ...importFields.request?.enums,
    };
    return { groups, fields, enums };
  }, [dict.ImportFields]);

  const handleImport = useCallback(
    async (
      data: Record<string, unknown>[],
      signalOrOptions?: AbortSignal | { assignedTo?: string | null; importHistoryId?: string; sourceFilename?: string },
      signal?: AbortSignal,
    ): Promise<ImportResult> => {
      // Disambiguate the overloaded second argument
      const options = signalOrOptions instanceof AbortSignal ? undefined : signalOrOptions;
      const resolvedSignal = signalOrOptions instanceof AbortSignal ? signalOrOptions : signal;
      try {
        // Store import-in-progress marker in sessionStorage
        if (globalThis.window !== undefined) {
          sessionStorage.setItem("importInProgress", "true");
        }

        const response = await fetch("/api/import/unified", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rows: data,
            assignedTo: options?.assignedTo ?? null,
            importHistoryId: options?.importHistoryId ?? undefined,
            sourceFilename: options?.sourceFilename ?? "import.csv",
          }),
          signal: resolvedSignal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Import failed");
        }

        const result: BatchImportResult = await response.json();

        // Clear the in-progress marker
        if (globalThis.window !== undefined) {
          sessionStorage.removeItem("importInProgress");
        }

        const totalCreated =
          result.contacts.length + result.properties.length + result.requests.length;

        if (totalCreated > 0) {
          toast.success("Import successful", {
            description: `Created ${result.contacts.length} contact(s), ${result.properties.length} property(ies), ${result.requests.length} request(s)`,
            isTranslationKey: false,
          });
        }

        return {
          imported: totalCreated,
          skipped: result.skippedCount,
          failed: result.errors.length,
          errors: result.errors.map((e) => ({
            row: e.rowIndex,
            field: e.entity,
            error: e.error,
          })),
          // Summary counts for legacy display
          contacts: {
            created: result.contacts.length,
            reused: 0,
            failed: result.errors.filter((e) => e.entity === "contact").length,
          },
          properties: {
            created: result.properties.length,
            failed: result.errors.filter((e) => e.entity === "property").length,
          },
          requests: {
            created: result.requests.length,
            failed: result.errors.filter((e) => e.entity === "request").length,
          },
          links: {
            contactProperty: result.linkCounts.contactProperty,
            requestContact: result.linkCounts.requestContact,
            requestProperty: result.linkCounts.requestProperty,
          },
          // Attach the raw batch result for the new CompleteStep
          _batchResult: result,
        };
      } catch (error) {
        // Clear the in-progress marker on error too
        if (globalThis.window !== undefined) {
          sessionStorage.removeItem("importInProgress");
        }

        console.error("[UNIFIED_IMPORT]", error);
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
    [toast, dict.ImportWizard.errors.serverError],
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
      fieldsDict={fieldsDict}
      fieldDefinitions={UNIFIED_FIELD_DEFINITIONS}
      onImport={handleImport}
      onComplete={handleComplete}
      onCancel={handleCancel}
      returnUrl={returnUrl}
      unifiedMode={true}
      requestFieldKeys={REQUEST_FIELD_KEYS}
      locale={locale}
    />
  );
}
