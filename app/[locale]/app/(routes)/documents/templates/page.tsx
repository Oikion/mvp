import { getTemplates } from "@/actions/templates/get-templates";
import { getDictionary } from "@/dictionaries";
import { TemplatesGrid } from "./components/TemplatesGrid";

export default async function TemplatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const templates = await getTemplates();

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{dict.templates?.page?.title || "Document Templates"}</h1>
          <p className="text-muted-foreground mt-1">
            {dict.templates?.page?.description || "Generate professional documents for your real estate transactions"}
          </p>
        </div>
      </div>

      <TemplatesGrid templates={templates} />
    </div>
  );
}










