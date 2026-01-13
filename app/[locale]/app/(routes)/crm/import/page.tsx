import { Metadata } from "next";
import { getDictionary } from "@/dictionaries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClientImportWizard } from "../clients/import/components/ClientImportWizard";
import { FileSpreadsheet } from "lucide-react";

export const metadata: Metadata = {
  title: "Import Clients",
  description: "Import clients from CSV or Excel file",
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function ClientImportPage({ params }: PageProps) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  const importDict = dict.import as {
    ImportWizard: {
      title: string;
      titleClients: string;
      description: string;
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

  return (
    <div className="container max-w-5xl py-6 h-full flex flex-col overflow-hidden">
      <Card className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>{importDict.ImportWizard.titleClients}</CardTitle>
              <CardDescription>
                {importDict.ImportWizard.description.replace("{entity}", "clients")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex-1 min-h-0">
          <ClientImportWizard dict={importDict} locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
