import React from "react";
import { getTranslations } from "next-intl/server";
import { auth } from "@clerk/nextjs/server";

import Container from "../../components/ui/Container";
import { Separator } from "@/components/ui/separator";
import { isOrgAdmin } from "@/lib/org-admin";
import { getOrgMembersFromDb } from "@/lib/org-members";
import { OrganizationInviteForm } from "./components/OrgInviteForm";
import { UsersTable } from "./components/UsersTable";

const AdminUsersPage = async () => {
  try {
    const t = await getTranslations("admin");
    const isAdmin = await isOrgAdmin();
    const { orgId } = await auth();

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

    if (!orgId) {
      return (
        <Container
          title={t("usersAdministration")}
          description={t("noOrganizationContext")}
        >
          <div className="flex w-full h-full items-center justify-center">
            {t("noOrganizationContext")}
          </div>
        </Container>
      );
    }

    // Get org members from database (matched with Clerk memberships)
    const { users, memberships } = await getOrgMembersFromDb();

    // Enhance users with role info from Clerk memberships
    const usersWithRoles = users.map((user) => {
      const membership = memberships.find(
        (m) => m.publicUserData?.userId === user.clerkUserId
      );
      return {
        ...user,
        orgRole: membership?.role ?? "org:member",
      };
    });

    return (
      <Container
        title={t("usersAdministration")}
        description={t("manageOrgMembersDescription")}
      >
        <div className="flex-col1">
          <h4 className="scroll-m-20 text-xl font-semibold tracking-tight">
            {t("inviteNewMember")}
          </h4>
          <OrganizationInviteForm />
        </div>
        <Separator />

        <UsersTable 
          users={usersWithRoles}
          translations={{
            dateCreated: t("dateCreated"),
            lastLogin: t("lastLogin"),
            name: t("name"),
            email: t("email"),
            role: t("role"),
            roleAdmin: t("roleAdmin"),
            roleMember: t("roleMember"),
            status: t("status"),
            language: t("language"),
            filterPlaceholder: t("filterPlaceholder") || "Filter users...",
          }}
        />
      </Container>
    );
  } catch (error) {
    console.error("Admin users page error:", error);
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

export default AdminUsersPage;
