import React, { Suspense } from "react";

import RequestsPageView from "./components/RequestsPageView";
import Container from "../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getRequests } from "@/actions/requests/get-requests";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

const RequestsPage = async () => {
  const t = await getTranslations("requests");

  const [requests, crmData] = await Promise.all([
    getRequests(),
    getAllCrmData(),
  ]);

  return (
    <Container
      title={t("pageTitle")}
      description={t("pageDescription")}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <RequestsPageView
          requests={requests}
          crmData={crmData}
        />
      </Suspense>
    </Container>
  );
};

export default RequestsPage;
