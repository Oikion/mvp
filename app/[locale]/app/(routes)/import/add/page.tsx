import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDictionary } from "@/dictionaries";
import { requireAction } from "@/lib/permissions/action-guards";
import { UnifiedImportWizard } from "@/components/import/UnifiedImportWizard";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ImportAddPage({ params }: PageProps) {
  const { locale } = await params;
  const { orgId } = await auth();

  if (!orgId) {
    redirect(`/${locale}/app`);
  }

  // Check permission to create imports
  const permissionGuard = await requireAction("import:create");
  if (permissionGuard) {
    redirect(`/${locale}/app`);
  }

  const dict = await getDictionary(locale);

  const importDict = dict.import as {
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

  return (
    <div className="container mx-auto max-w-6xl py-6">
      <UnifiedImportWizard
        dict={importDict}
        locale={locale}
        returnUrl={`/${locale}/app/import`}
      />
    </div>
  );
}
