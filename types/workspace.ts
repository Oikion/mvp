export type OrgType = "personal" | "agency";

export interface WorkspaceContextValue {
  isPersonalWorkspace: boolean;
  isAgencyWorkspace: boolean;
  currentOrgType: OrgType | null;
  personalOrgId: string | null;
  isLoading: boolean;
}
