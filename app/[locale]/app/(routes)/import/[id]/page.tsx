import { getTranslations } from "next-intl/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ImportDetailClient } from "./components/ImportDetailClient";

export default async function ImportDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { id } = await params;
  const { orgId } = await auth();
  if (!orgId) return notFound();

  const t = await getTranslations("import.history");

  const importRecord = await prismadb.importHistory.findFirst({
    where: { id, organizationId: orgId },
  });

  if (!importRecord) return notFound();

  // Serialize dates and Decimal/BigInt values for client component
  return <ImportDetailClient record={JSON.parse(JSON.stringify(importRecord))} />;
}
