import React from "react";
import { getTranslations } from "next-intl/server";
import { columns } from "./components/Columns";
import { DataTable } from "./components/data-table";
import Container from "../../components/ui/Container";
import { getModules } from "@/actions/get-modules";
import { isOrgAdmin } from "@/lib/org-admin";

const AdminModulesPage = async () => {
  try {
    const t = await getTranslations("admin");
    const isAdmin = await isOrgAdmin();

    if (!isAdmin) {
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
    console.error("Admin modules page error:", error);
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
