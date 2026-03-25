import { getTranslations } from "next-intl/server";
import { getDocuments } from "@/actions/documents/get-documents";
import { getTemplates } from "@/actions/templates/get-templates";
import Container from "../components/ui/Container";
import DocumentsPageView from "./components/DocumentsPageView";

export default async function DocumentsPage() {
  const t = await getTranslations("documents.DocumentsPage");
  const [documents, templates] = await Promise.all([
    getDocuments(),
    getTemplates(),
  ]);

  return (
    <Container
      title={t("title")}
      description={t("description")}
    >
      <DocumentsPageView
        documents={documents}
        templates={templates}
      />
    </Container>
  );
}
