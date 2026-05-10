import React from "react";
import { notFound } from "next/navigation";
import Container from "../../components/ui/Container";
import RequestView from "./components/RequestView";
import { getRequest } from "@/actions/requests/get-request";
import { getSharedRequest } from "@/actions/requests/get-shared-request";
import { SharedAccessBanner } from "@/components/shared/SharedAccessBanner";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

interface RequestDetailPageProps {
  params: Promise<{ requestId: string }>;
}

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { requestId } = await params;
  const t = await getTranslations("requests");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let request: any = await getRequest(requestId);
  let isSharedView = false;
  let shareInfo: NonNullable<Awaited<ReturnType<typeof getSharedRequest>>>["_shareInfo"] | null = null;

  if (!request) {
    const shared = await getSharedRequest(requestId);
    if (shared) {
      request = shared;
      isSharedView = true;
      shareInfo = shared._shareInfo;
    }
  }

  if (!request) notFound();

  return (
    <Container
      title={`${t("pageTitle")} — ${request.friendlyId}`}
      description={t("pageDescription")}
    >
      {isSharedView && shareInfo && (
        <SharedAccessBanner shareInfo={shareInfo} entityType="request" />
      )}
      <RequestView request={request} isReadOnly={isSharedView} sharePermission={shareInfo?.permissions ?? null} />
    </Container>
  );
}
