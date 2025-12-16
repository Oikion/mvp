import { getTranslations } from "next-intl/server";
import { ClientConversionWizard } from "./components/ClientConversionWizard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "conversion" });
  
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function ClientConvertPage() {
  return (
    <div className="container max-w-4xl py-8">
      <ClientConversionWizard />
    </div>
  );
}


