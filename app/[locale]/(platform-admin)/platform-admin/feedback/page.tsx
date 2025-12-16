// app/[locale]/(platform-admin)/platform-admin/feedback/page.tsx
// Platform Admin Feedback Management Page

import { getTranslations } from "next-intl/server";
import { MessageSquare } from "lucide-react";

import { getPlatformFeedback } from "@/actions/platform-admin/get-feedback";
import { getPlatformAdminUser } from "@/lib/platform-admin";
import { PlatformAdminHeader } from "../components/PlatformAdminHeader";
import { FeedbackDataTable } from "./components/FeedbackDataTable";
import { FeedbackMetrics } from "./components/FeedbackMetrics";

interface FeedbackPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    page?: string;
    search?: string;
    type?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function PlatformAdminFeedbackPage({
  params,
  searchParams,
}: FeedbackPageProps) {
  const { locale } = await params;
  const search = await searchParams;
  const t = await getTranslations("platformAdmin");

  // Get admin user info
  const adminUser = await getPlatformAdminUser();

  // Parse search params
  const page = parseInt(search.page || "1", 10);
  const searchQuery = search.search || "";
  const feedbackType = search.type || "ALL";
  const status = search.status || "ALL";
  const sortBy = search.sortBy as "createdAt" | "feedbackType" | "status" | undefined;
  const sortOrder = search.sortOrder as "asc" | "desc" | undefined;

  // Get feedback
  const feedbackData = await getPlatformFeedback({
    page,
    search: searchQuery,
    feedbackType,
    status,
    sortBy: sortBy || "createdAt",
    sortOrder: sortOrder || "desc",
    limit: 20,
  });

  return (
    <div className="flex flex-col min-h-screen">
      <PlatformAdminHeader adminUser={adminUser} locale={locale} />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {t("feedback.title")}
            </h1>
            <p className="text-muted-foreground">{t("feedback.description")}</p>
          </div>
        </div>

        {/* Metrics Cards */}
        <FeedbackMetrics
          countsByType={feedbackData.countsByType}
          countsByStatus={feedbackData.countsByStatus}
          totalCount={feedbackData.totalCount}
        />

        {/* Data Table */}
        <FeedbackDataTable
          feedback={feedbackData.feedback}
          totalCount={feedbackData.totalCount}
          page={feedbackData.page}
          totalPages={feedbackData.totalPages}
          currentSearch={searchQuery}
          currentType={feedbackType}
          currentStatus={status}
          locale={locale}
        />
      </main>
    </div>
  );
}

