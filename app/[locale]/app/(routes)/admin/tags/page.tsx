import React from "react";
import { getTranslations } from "next-intl/server";
import { auth } from "@clerk/nextjs/server";

import Container from "../../components/ui/Container";
import { isOrgAdmin } from "@/lib/org-admin";
import { TagsAdminClient } from "./components/TagsAdminClient";
import { getTags, getTagCategories } from "@/actions/tags";

const AdminTagsPage = async () => {
  try {
    const t = await getTranslations("common");
    const adminT = await getTranslations("admin");
    const isAdmin = await isOrgAdmin();
    const { orgId } = await auth();

    if (!isAdmin) {
      return (
        <Container
          title={t("tags.title")}
          description={adminT("accessDenied")}
        >
          <div className="flex w-full h-full items-center justify-center">
            {adminT("accessNotAllowed")}
          </div>
        </Container>
      );
    }

    if (!orgId) {
      return (
        <Container
          title={t("tags.title")}
          description={adminT("noOrganizationContext")}
        >
          <div className="flex w-full h-full items-center justify-center">
            {adminT("noOrganizationContext")}
          </div>
        </Container>
      );
    }

    // Fetch initial tags and categories
    const [tagsResult, categoriesResult] = await Promise.all([
      getTags(),
      getTagCategories(),
    ]);

    const initialTags = tagsResult.success ? tagsResult.data ?? [] : [];
    const initialCategories = categoriesResult.success ? categoriesResult.data ?? [] : [];

    return (
      <Container
        title={t("tags.title")}
        description={t("tags.description")}
      >
        <TagsAdminClient 
          initialTags={initialTags} 
          initialCategories={initialCategories}
        />
      </Container>
    );
  } catch (error) {
    console.error("Admin tags page error:", error);
    const t = await getTranslations("admin");
    return (
      <Container
        title="Tags"
        description={t("accessNotAllowed")}
      >
        <div className="flex w-full h-full items-center justify-center">
          {t("accessNotAllowed")}
        </div>
      </Container>
    );
  }
};

export default AdminTagsPage;
