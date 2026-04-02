import { getTranslations } from "next-intl/server";
import { getDocuments } from "@/actions/documents/get-documents";
import { getTemplates } from "@/actions/templates/get-templates";
import Container from "../components/ui/Container";
import DocumentsPageView from "./components/DocumentsPageView";

export default async function DocumentsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "documents.DocumentsPage" });
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
