"use client";

import { useOrganization, useOrganizationList } from "@clerk/nextjs";
import { useMemo } from "react";
import type { OrgType, WorkspaceContextValue } from "@/types/workspace";

export function useWorkspaceContext(): WorkspaceContextValue {
  const { organization } = useOrganization();
  const { userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  const currentOrgType = useMemo<OrgType | null>(() => {
    if (!organization) return null;
    const metadata = organization.publicMetadata as Record<string, unknown>;
    const type = metadata?.type as OrgType | undefined;
    return type === "personal" || type === "agency" ? type : null;
  }, [organization]);

  const personalOrgId = useMemo<string | null>(() => {
    if (!userMemberships?.data) return null;
    const personalOrg = userMemberships.data.find(
      (membership) =>
        (membership.organization.publicMetadata as Record<string, unknown>)
          ?.type === "personal"
    );
    return personalOrg?.organization.id ?? null;
  }, [userMemberships]);

  const isPersonalWorkspace = currentOrgType === "personal";
  const isAgencyWorkspace = currentOrgType === "agency";

  return {
    isPersonalWorkspace,
    isAgencyWorkspace,
    currentOrgType,
    personalOrgId,
    isLoading: !organization && !userMemberships,
  };
}
