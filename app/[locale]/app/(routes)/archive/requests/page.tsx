import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getArchivedEntities } from "@/actions/archive/get-archived-entities";
import { getUserPermissionContext } from "@/lib/permissions/service";
import ArchivedList from "../components/ArchivedList";
import SuspenseLoading from "@/components/loadings/suspense";

export const dynamic = "force-dynamic";

async function ArchivedRequestsContainer() {
  const [{ data }, ctx] = await Promise.all([
    getArchivedEntities("request"),
    getUserPermissionContext(),
  ]);

  return (
    <ArchivedList
      entityType="request"
      initialRows={data}
      canRestore={ctx?.permissions.canRestoreArchived ?? false}
      canPurge={ctx?.permissions.canPermanentDelete ?? false}
      refetch={async () => {
        "use server";
        const { data } = await getArchivedEntities("request");
        return data;
      }}
    />
  );
}

export default async function ArchivedRequestsPage() {
  const t = await getTranslations("archive");
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">{t("pages.requests")}</h1>
      <Suspense fallback={<SuspenseLoading />}>
        <ArchivedRequestsContainer />
      </Suspense>
    </div>
  );
}
