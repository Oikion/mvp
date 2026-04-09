import { getTranslations } from "next-intl/server";
import { TemplateDataTable } from "./components/TemplateDataTable";
import { listDocumentTemplates } from "@/actions/document-templates";

export default async function DocumentTemplatesPage() {
  const t = await getTranslations("document-templates");
  const result = await listDocumentTemplates();
  const templates = result.success ? (result.data as import("./components/TemplateDataTable").TemplateRow[]) : [];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      </div>
      <TemplateDataTable initialTemplates={templates} />
    </div>
  );
}
