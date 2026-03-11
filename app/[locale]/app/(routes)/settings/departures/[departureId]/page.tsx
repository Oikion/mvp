import { getDepartureLog } from "@/actions/data-ownership/get-departure-logs";
import { getTranslations } from "next-intl/server";
import { redirect, notFound } from "next/navigation";
import { DepartureDetailClient } from "./DepartureDetailClient";

export default async function DepartureDetailPage({
  params,
}: {
  params: Promise<{ departureId: string }>;
}) {
  const { departureId } = await params;
  const t = await getTranslations("dataOwnership.departures");
  const result = await getDepartureLog(departureId);

  if (!result.success) {
    if ("code" in result && result.code === "NOT_FOUND") {
      notFound();
    }
    redirect("/app/settings/departures");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t("detail.title")}</h1>
      <DepartureDetailClient log={result.data!} />
    </div>
  );
}
