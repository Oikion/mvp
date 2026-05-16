import React, { Suspense } from "react";
import { getTranslations } from "next-intl/server";

import Container from "../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getEmployees } from "@/actions/get-empoloyees";
import { getPendingInvitations } from "@/actions/get-pending-invitations";
import { DataTable } from "@/components/ui/data-table/data-table";
import { columns } from "./table-components/columns";
import { InviteButton } from "./components/InviteDialog";
import { PendingInvitationsSection } from "./components/PendingInvitationsSection";

const EmployeesPage = async () => {
  const t = await getTranslations("admin");
  const [users, invitations] = await Promise.all([
    getEmployees(),
    getPendingInvitations(),
  ]);

  return (
    <Container
      title={t("pageEmployees")}
      description={t("pageEmployeesDescription")}
      headerExtra={<InviteButton />}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <DataTable
          data={users}
          columns={columns}
          searchKey="name"
          searchPlaceholder={t("filterPlaceholder")}
        />
      </Suspense>
      {invitations !== null && <PendingInvitationsSection invitations={invitations} />}
    </Container>
  );
};

export default EmployeesPage;
