import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { getArchivedEntities } from "@/actions/archive/get-archived-entities";
import { getUserPermissionContext } from "@/lib/permissions/service";
import ArchivedList from "../components/ArchivedList";
import SuspenseLoading from "@/components/loadings/suspense";

export const dynamic = "force-dynamic";

async function ArchivedDealsContainer() {
  const [{ data }, ctx] = await Promise.all([
    getArchivedEntities("deal"),
    getUserPermissionContext(),
  ]);

  return (
    <ArchivedList
      entityType="deal"
      initialRows={data}
      canRestore={ctx?.permissions.canRestoreArchived ?? false}
      canPurge={ctx?.permissions.canPermanentDelete ?? false}
      refetch={async () => {
        "use server";
        const { data } = await getArchivedEntities("deal");
        return data;
      }}
    />
  );
}

export default async function ArchivedDealsPage() {
  const t = await getTranslations("archive");
  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">{t("pages.deals")}</h1>
      <Suspense fallback={<SuspenseLoading />}>
        <ArchivedDealsContainer />
      </Suspense>
    </div>
  );
}
