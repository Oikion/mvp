import { getTranslations } from "next-intl/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import Container from "../components/ui/Container";
import { ImportHistoryClient } from "./components/ImportHistoryClient";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const t = await getTranslations("import.history");
  const { orgId } = await auth();

  if (!orgId) {
    return null;
  }

  const imports = await prismadb.importHistory.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      importType: true,
      sourceFilename: true,
      rowCount: true,
      createdCount: true,
      reusedCount: true,
      failedCount: true,
      skippedCount: true,
      status: true,
      createdAt: true,
    },
  });

  const serializedImports = imports.map((imp) => ({
    id: imp.id,
    importType: imp.importType,
    sourceFilename: imp.sourceFilename,
    rowCount: imp.rowCount,
    createdCount: imp.createdCount,
    reusedCount: imp.reusedCount,
    failedCount: imp.failedCount,
    skippedCount: imp.skippedCount,
    status: imp.status,
    createdAt: imp.createdAt.toISOString(),
  }));

  return (
    <Container
      title={t("page.title")}
      description={t("page.description")}
    >
      <ImportHistoryClient imports={serializedImports} />
    </Container>
  );
}
