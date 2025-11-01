import { getUsers } from "@/actions/get-users";
import React from "react";
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
    const user = await getCurrentUser();

    if (!user?.is_admin) {
      return (
        <Container
          title="Administration"
          description="You are not admin, access not allowed"
        >
          <div className="flex w-full h-full items-center justify-center">
            Access not allowed
          </div>
        </Container>
      );
    }

    const users: Users[] = await getUsers();

    return (
      <Container
        title="Users administration"
        description={"Here you can manage your NextCRM users"}
      >
        <div className="flex-col1">
          <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
            Invite new user to NextCRM
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
    return (
      <Container
        title="Administration"
        description="Access not allowed"
      >
        <div className="flex w-full h-full items-center justify-center">
          Access not allowed
        </div>
      </Container>
    );
  }
};

export default AdminUsersPage;
