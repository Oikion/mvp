import { prismadb } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";

async function getArchiveCounts(organizationId: string) {
  const [properties, contacts, requests, deals, events, documents] =
    await Promise.all([
      prismadb.properties.count({
        where: { organizationId, archivedAt: { not: null } },
      }),
      prismadb.contact.count({
        where: { organizationId, archivedAt: { not: null } },
      }),
      prismadb.request.count({
        where: { organizationId, archivedAt: { not: null } },
      }),
      prismadb.deal.count({
        where: { organizationId, archivedAt: { not: null } },
      }),
      prismadb.calendarEvent.count({
        where: { organizationId, archivedAt: { not: null } },
      }),
      prismadb.documents.count({
        where: { organizationId, archivedAt: { not: null } },
      }),
    ]);

  return { properties, contacts, requests, deals, events, documents };
}

export default async function ArchiveOverview() {
  const { orgId: organizationId } = await auth();
  if (!organizationId) return null;

  const t = await getTranslations("archive");
  const counts = await getArchiveCounts(organizationId);

  const modules = [
    { key: "properties" as const, href: "/app/archive/properties", count: counts.properties },
    { key: "contacts" as const, href: "/app/archive/contacts", count: counts.contacts },
    { key: "requests" as const, href: "/app/archive/requests", count: counts.requests },
    { key: "deals" as const, href: "/app/archive/deals", count: counts.deals },
    { key: "events" as const, href: "/app/archive/events", count: counts.events },
    { key: "documents" as const, href: "/app/archive/documents", count: counts.documents },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {modules.map((m) => (
        <a
          key={m.key}
          href={m.href}
          className="rounded-lg border p-4 hover:bg-muted/50 transition-colors"
        >
          <p className="text-2xl font-semibold tabular-nums">{m.count}</p>
          <p className="text-sm text-muted-foreground">{t(`overview.stats.${m.key}`)}</p>
        </a>
      ))}
    </div>
  );
}
