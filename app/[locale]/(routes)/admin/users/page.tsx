import { getUsers } from "@/actions/get-users";
import React from "react";
import { getTranslations } from "next-intl/server";
import Container from "../../components/ui/Container";
import { InviteForm } from "./components/IviteForm";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser } from "@/lib/get-current-user";
import { AdminUserDataTable } from "./table-components/data-table";
import { columns } from "./table-components/columns";
import { Users } from "@prisma/client";
import { Button } from "@/components/ui/button";
import SendMailToAll from "./components/send-mail-to-all";

const AdminUsersPage = async () => {
  try {
    const t = await getTranslations();
    const user = await getCurrentUser();

    if (!user?.is_admin) {
      return (
        <Container
          title={t("Admin.title")}
          description={t("Admin.accessDenied")}
        >
          <div className="flex w-full h-full items-center justify-center">
            {t("Admin.accessNotAllowed")}
          </div>
        </Container>
      );
    }

    const users: Users[] = await getUsers();

    return (
      <Container
        title={t("Admin.usersAdministration")}
        description={t("Admin.manageUsersDescription")}
      >
        <div className="flex-col1">
          <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
            {t("Admin.inviteNewUser")}
          </h4>
          <InviteForm />
        </div>
        <Separator />
        <div>
          <SendMailToAll />
        </div>
        <Separator />

        <AdminUserDataTable columns={columns} data={users} />
      </Container>
    );
  } catch (error) {
    const t = await getTranslations();
    return (
      <Container
        title={t("Admin.title")}
        description={t("Admin.accessNotAllowed")}
      >
        <div className="flex w-full h-full items-center justify-center">
          {t("Admin.accessNotAllowed")}
        </div>
      </Container>
    );
  }
};

export default AdminUsersPage;
