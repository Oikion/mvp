import React from "react";
import { getCurrentUser } from "@/lib/get-current-user";
import { columns } from "./components/Columns";
import { DataTable } from "./components/data-table";
import Container from "../../components/ui/Container";
import { getModules } from "@/actions/get-modules";

const AdminModulesPage = async () => {
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

    const modules: any = await getModules();
    return (
      <Container
        title="Modules administration"
        description={"Here you can manage your NextCRM modules"}
      >
        <DataTable columns={columns} data={modules} search="name" />
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

export default AdminModulesPage;
