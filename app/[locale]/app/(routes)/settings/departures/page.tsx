import { getDepartureLogs } from "@/actions/data-ownership/get-departure-logs";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { DepartureListClient } from "./DepartureListClient";

export default async function DeparturesPage() {
  const t = await getTranslations("dataOwnership.departures");
  const result = await getDepartureLogs();

  if (!result.success) {
    redirect("/app/settings");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <DepartureListClient logs={result.data!} />
    </div>
  );
}
