import React from "react";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { columns } from "./components/Columns";
import { DataTable } from "./components/data-table";
import Container from "../../components/ui/Container";
import { getModules } from "@/actions/get-modules";

const AdminModulesPage = async () => {
  try {
    const t = await getTranslations("admin");
    const user = await getCurrentUser();

    if (!user?.is_admin) {
      return (
        <Container
          title={t("title")}
          description={t("accessDenied")}
        >
          <div className="flex w-full h-full items-center justify-center">
            {t("accessNotAllowed")}
          </div>
        </Container>
      );
    }

    const modules: any = await getModules();
    return (
      <Container
        title={t("modulesAdministration")}
        description={t("manageModulesDescription")}
      >
        <DataTable columns={columns} data={modules} search="name" />
      </Container>
    );
  } catch (error) {
    const t = await getTranslations("admin");
    return (
      <Container
        title={t("title")}
        description={t("accessNotAllowed")}
      >
        <div className="flex w-full h-full items-center justify-center">
          {t("accessNotAllowed")}
        </div>
      </Container>
    );
  }
};

export default AdminModulesPage;
