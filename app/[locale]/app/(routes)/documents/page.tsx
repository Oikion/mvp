import { getDocuments } from "@/actions/documents/get-documents";
import { getClients } from "@/actions/crm/get-clients";
import { getProperties } from "@/actions/mls/get-properties";
import { getMentionOptions } from "@/actions/documents/get-mention-options";
import { getTemplates } from "@/actions/templates/get-templates";
import { DocumentGrid } from "./components/DocumentGrid";
import { DocumentFilters } from "./components/DocumentFilters";
import { TemplatesSection } from "./components/TemplatesSection";
import { QuickUploadZone } from "./components/QuickUploadZone";
import { getDictionary } from "@/dictionaries";
import { Separator } from "@/components/ui/separator";

export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const searchParamsData = await searchParams;
  
  const filters = {
    clientId: typeof searchParamsData.clientId === "string" ? searchParamsData.clientId : undefined,
    propertyId: typeof searchParamsData.propertyId === "string" ? searchParamsData.propertyId : undefined,
    eventId: typeof searchParamsData.eventId === "string" ? searchParamsData.eventId : undefined,
    taskId: typeof searchParamsData.taskId === "string" ? searchParamsData.taskId : undefined,
    search: typeof searchParamsData.search === "string" ? searchParamsData.search : undefined,
  };

  const [documents, clients, properties, mentionOptions, templates] = await Promise.all([
    getDocuments(filters),
    getClients(),
    getProperties(),
    getMentionOptions(),
    getTemplates(),
  ]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with Upload Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{dict.documents.page.title}</h1>
          <p className="text-muted-foreground mt-1">
            {dict.documents.page.description}
          </p>
        </div>
        <QuickUploadZone />
      </div>

      {/* Document Templates Section */}
      <TemplatesSection templates={templates} />

      <Separator />

      <DocumentFilters
        clients={clients}
        properties={properties}
        initialFilters={filters}
      />

      <DocumentGrid documents={documents} mentionOptions={mentionOptions} />
    </div>
  );
}
