"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ImportWizardSteps, type ImportResult } from "@/components/import";
import { clientImportSchema, clientImportFieldDefinitions } from "@/lib/import";
import { useToast } from "@/components/ui/use-toast";

interface ClientImportWizardProps {
  dict: {
    ImportWizard: {
      title: string;
      titleClients: string;
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
      client: {
        groups: Record<string, string>;
        fields: Record<string, string>;
        enums: Record<string, Record<string, string>>;
      };
    };
  };
  locale: string;
}

export function ClientImportWizard({ dict, locale }: ClientImportWizardProps) {
  const router = useRouter();
  const { toast } = useToast();

  const handleImport = useCallback(
    async (data: Record<string, unknown>[]): Promise<ImportResult> => {
      try {
        const response = await fetch("/api/crm/clients/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clients: data }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Import failed");
        }

        const result = await response.json();
        
        if (result.imported > 0) {
          toast({
            variant: "success",
            title: "Import successful",
            description: `Successfully imported ${result.imported} client(s)`,
          });
        }

        return {
          imported: result.imported || 0,
          skipped: result.skipped || 0,
          failed: result.failed || 0,
          errors: result.errors || [],
        };
      } catch (error) {
        console.error("Import error:", error);
        toast({
          variant: "destructive",
          title: "Import failed",
          description: error instanceof Error ? error.message : "Unknown error",
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
    router.push(`/${locale}/app/crm`);
    router.refresh();
  }, [router, locale]);

  const handleCancel = useCallback(() => {
    router.push(`/${locale}/app/crm`);
  }, [router, locale]);

  return (
    <ImportWizardSteps
      entityType="client"
      dict={dict.ImportWizard}
      fieldsDict={dict.ImportFields.client}
      schema={clientImportSchema}
      fieldDefinitions={clientImportFieldDefinitions}
      onImport={handleImport}
      onComplete={handleComplete}
      onCancel={handleCancel}
      viewUrl={`/${locale}/app/crm`}
    />
  );
}






