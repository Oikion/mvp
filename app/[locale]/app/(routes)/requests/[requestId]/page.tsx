import React from "react";
import { notFound } from "next/navigation";
import Container from "../../components/ui/Container";
import RequestView from "./components/RequestView";
import { getRequest } from "@/actions/requests/get-request";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

interface RequestDetailPageProps {
  params: Promise<{ requestId: string }>;
}

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { requestId } = await params;
  const t = await getTranslations("requests");

  const request = await getRequest(requestId);
  if (!request) notFound();

  return (
    <Container
      title={`${t("pageTitle")} — ${request.friendlyId}`}
      description={t("pageDescription")}
    >
      <RequestView request={request} />
    </Container>
  );
}
