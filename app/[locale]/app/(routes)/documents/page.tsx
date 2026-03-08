import { getDocuments } from "@/actions/documents/get-documents";
import { getTemplates } from "@/actions/templates/get-templates";
import DocumentsPageView from "./components/DocumentsPageView";

export default async function DocumentsPage() {
  const [documents, templates] = await Promise.all([
    getDocuments(),
    getTemplates(),
  ]);

  return (
    <div className="w-full py-6">
      <DocumentsPageView
        documents={documents}
        templates={templates}
      />
    </div>
  );
}
