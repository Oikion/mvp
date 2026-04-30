import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getArchivedEntities } from "@/actions/archive/get-archived-entities";
import { getUserPermissionContext } from "@/lib/permissions/service";
import ArchivedList from "../components/ArchivedList";
import SuspenseLoading from "@/components/loadings/suspense";

export const dynamic = "force-dynamic";

async function ArchivedPropertiesContainer() {
  const [{ data }, ctx] = await Promise.all([
    getArchivedEntities("property"),
    getUserPermissionContext(),
  ]);

  return (
    <ArchivedList
      entityType="property"
      initialRows={data}
      canRestore={ctx?.permissions.canRestoreArchived ?? false}
      canPurge={ctx?.permissions.canPermanentDelete ?? false}
      refetch={async () => {
        "use server";
        const { data } = await getArchivedEntities("property");
        return data;
      }}
    />
  );
}

export default async function ArchivedPropertiesPage() {
  const t = await getTranslations("archive");
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">{t("pages.properties")}</h1>
      <Suspense fallback={<SuspenseLoading />}>
        <ArchivedPropertiesContainer />
      </Suspense>
    </div>
  );
}
