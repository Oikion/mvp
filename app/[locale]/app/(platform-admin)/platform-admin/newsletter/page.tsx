// app/[locale]/(platform-admin)/platform-admin/newsletter/page.tsx
// Newsletter Dashboard - Manage campaigns and subscribers

import { prismadb } from "@/lib/prisma";
import { NewsletterClient } from "./components/NewsletterClient";

export default async function NewsletterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const { locale } = await params;
  const { tab, page } = await searchParams;

  const pageSize = 20;
  const currentPage = parseInt(page || "1");
  const skip = (currentPage - 1) * pageSize;

  // Get campaigns
  const [campaigns, totalCampaigns] = await Promise.all([
    prismadb.newsletterCampaign.findMany({
      take: pageSize,
      skip,
      orderBy: { createdAt: "desc" },
    }),
    prismadb.newsletterCampaign.count(),
  ]);

  // Get subscribers
  const [subscribers, totalSubscribers] = await Promise.all([
    prismadb.newsletterSubscriber.findMany({
      take: pageSize,
      skip,
      orderBy: { subscribedAt: "desc" },
    }),
    prismadb.newsletterSubscriber.count(),
  ]);

  // Get stats
  const [activeSubscribers, sentCampaigns, totalOpens, totalClicks] = await Promise.all([
    prismadb.newsletterSubscriber.count({ where: { status: "ACTIVE" } }),
    prismadb.newsletterCampaign.count({ where: { status: "SENT" } }),
    prismadb.newsletterCampaign.aggregate({ _sum: { openCount: true } }),
    prismadb.newsletterCampaign.aggregate({ _sum: { clickCount: true } }),
  ]);

  const stats = {
    totalSubscribers,
    activeSubscribers,
    totalCampaigns,
    sentCampaigns,
    totalOpens: totalOpens._sum.openCount || 0,
    totalClicks: totalClicks._sum.clickCount || 0,
  };

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <NewsletterClient
          campaigns={campaigns.map((c) => ({
            ...c,
            scheduledAt: c.scheduledAt?.toISOString() || null,
            sentAt: c.sentAt?.toISOString() || null,
            completedAt: c.completedAt?.toISOString() || null,
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
          }))}
          subscribers={subscribers.map((s) => ({
            ...s,
            subscribedAt: s.subscribedAt.toISOString(),
            unsubscribedAt: s.unsubscribedAt?.toISOString() || null,
            lastEmailSentAt: s.lastEmailSentAt?.toISOString() || null,
            createdAt: s.createdAt.toISOString(),
            updatedAt: s.updatedAt.toISOString(),
          }))}
          stats={stats}
          currentPage={currentPage}
          totalCampaignPages={Math.ceil(totalCampaigns / pageSize)}
          totalSubscriberPages={Math.ceil(totalSubscribers / pageSize)}
          currentTab={tab || "campaigns"}
          locale={locale}
        />
      </div>
    </div>
  );
}
