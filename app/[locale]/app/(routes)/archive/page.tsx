import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import ArchiveOverview from "./components/ArchiveOverview";
import SuspenseLoading from "@/components/loadings/suspense";

export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const t = await getTranslations("archive");

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("overview.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("overview.description")}</p>
      </div>
      <Suspense fallback={<SuspenseLoading />}>
        <ArchiveOverview />
      </Suspense>
    </div>
  );
}
