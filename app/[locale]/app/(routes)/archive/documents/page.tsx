import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getArchivedEntities } from "@/actions/archive/get-archived-entities";
import { getUserPermissionContext } from "@/lib/permissions/service";
import ArchivedList from "../components/ArchivedList";
import SuspenseLoading from "@/components/loadings/suspense";

export const dynamic = "force-dynamic";

async function ArchivedDocumentsContainer() {
  const [{ data }, ctx] = await Promise.all([
    getArchivedEntities("document"),
    getUserPermissionContext(),
  ]);

  return (
    <ArchivedList
      entityType="document"
      initialRows={data}
      canRestore={ctx?.permissions.canRestoreArchived ?? false}
      canPurge={ctx?.permissions.canPermanentDelete ?? false}
      refetch={async () => {
        "use server";
        const { data } = await getArchivedEntities("document");
        return data;
      }}
    />
  );
}

export default async function ArchivedDocumentsPage() {
  const t = await getTranslations("archive");
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">{t("pages.documents")}</h1>
      <Suspense fallback={<SuspenseLoading />}>
        <ArchivedDocumentsContainer />
      </Suspense>
    </div>
  );
}
