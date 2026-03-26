import React, { Suspense } from "react";

import MandatesPageView from "./components/MandatesPageView";
import Container from "../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getMandates } from "@/actions/mandates/get-mandates";
import { getOrganizationUsers } from "@/actions/organization/get-organization-users";
import { getCachedDictionary } from "@/lib/cached";

// force-dynamic is required because:
// 1. Mandate data changes frequently as agents update briefs
// 2. Users expect to see current data when managing mandates
// 3. Client link status needs to be real-time
export const dynamic = "force-dynamic";

const MandatesPage = async ({
  params,
}: {
  params: Promise<{ locale: string }>;
}) => {
  const { locale } = await params;
  const [mandates, users, dict] = await Promise.all([
    getMandates(),
    getOrganizationUsers({
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        userStatus: true,
      },
      onlyActive: true,
    }),
    getCachedDictionary(locale),
  ]);

  return (
    <Container
      title={dict.navigation.ModuleMenu.mandates.title}
      description={dict.mandates.MandatesPage.description}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <MandatesPageView mandates={mandates} users={users} />
      </Suspense>
    </Container>
  );
};

export default MandatesPage;
