import React from "react";
import { getTranslations } from "next-intl/server";
import Container from "../../components/ui/Container";
import { isOrgOwner } from "@/lib/org-admin";
import { RolesManager } from "./components/RolesManager";

const AdminRolesPage = async () => {
  try {
    const t = await getTranslations("admin");
    const isOwner = await isOrgOwner();

    if (!isOwner) {
      return (
        <Container
          title={t("rolesManagement") || "Roles & Permissions"}
          description={t("accessDenied")}
        >
          <div className="flex w-full h-full items-center justify-center">
            <p className="text-muted-foreground">
              {t("ownerOnlyAccess") || "Only organization owners can manage roles and permissions."}
            </p>
          </div>
        </Container>
      );
    }

    return (
      <Container
        title={t("rolesManagement") || "Roles & Permissions"}
        description={t("rolesManagementDescription") || "Configure permissions for each role in your organization"}
      >
        <RolesManager />
      </Container>
    );
  } catch (error) {
    console.error("Admin roles page error:", error);
    const t = await getTranslations("admin");
    return (
      <Container
        title={t("rolesManagement") || "Roles & Permissions"}
        description={t("accessNotAllowed")}
      >
        <div className="flex w-full h-full items-center justify-center">
          {t("accessNotAllowed")}
        </div>
      </Container>
    );
  }
};

export default AdminRolesPage;
