"use client";

import React, { useMemo } from "react";
import { useOrganization, useAuth } from "@clerk/nextjs";
import useSWR from "swr";
import { OrgRole } from "@prisma/client";
import {
  UserPermissionContext,
  PermissionConfig,
  PermissionKey,
  ModuleId,
  clerkRoleToOrgRole,
  orgRoleToClerkRole,
} from "./types";
import { DEFAULT_PERMISSIONS, ALL_MODULES, DEFAULT_VIEWER_MODULES } from "./defaults";

/**
 * Fetcher for SWR that calls our permission API
 */
const fetcher = (url: string) => fetch(url).then((res) => res.json());

/**
 * Hook to get the current user's permission context
 * Uses SWR for caching and revalidation
 */
export function usePermissions() {
  const { orgId, orgRole } = useAuth();
  const { organization, membership } = useOrganization();

  // Get custom permissions from API
  const { data: permissionData, error, isLoading } = useSWR(
    orgId ? `/api/org/permissions` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  // Compute permission context
  const context = useMemo<UserPermissionContext | null>(() => {
    if (!orgId || !membership) {
      return null;
    }

    const role = clerkRoleToOrgRole(orgRole);
    const clerkRoleKey = orgRoleToClerkRole(role);

    // Use server data if available, otherwise use defaults
    const permissions: PermissionConfig = permissionData?.permissions
      ? { ...DEFAULT_PERMISSIONS[role], ...permissionData.permissions }
      : DEFAULT_PERMISSIONS[role];

    const moduleAccess: ModuleId[] = permissionData?.moduleAccess
      ? permissionData.moduleAccess
      : role === OrgRole.VIEWER
        ? DEFAULT_VIEWER_MODULES
        : ALL_MODULES;

    return {
      userId: membership.publicUserData?.userId || "",
      organizationId: orgId,
      role,
      clerkRole: clerkRoleKey,
      permissions,
      moduleAccess,
      isOwner: role === OrgRole.OWNER,
      isLead: role === OrgRole.LEAD,
      isMember: role === OrgRole.MEMBER,
      isViewer: role === OrgRole.VIEWER,
    };
  }, [orgId, orgRole, membership, permissionData]);

  return {
    context,
    isLoading,
    error,
  };
}

/**
 * Hook to check a specific permission
 */
export function useHasPermission(permission: PermissionKey): boolean {
  const { context } = usePermissions();
  return context?.permissions[permission] === true;
}

/**
 * Hook to check multiple permissions
 */
export function useHasAllPermissions(permissions: PermissionKey[]): boolean {
  const { context } = usePermissions();
  if (!context) return false;
  return permissions.every((p) => context.permissions[p] === true);
}

/**
 * Hook to check if user has any of the specified permissions
 */
export function useHasAnyPermission(permissions: PermissionKey[]): boolean {
  const { context } = usePermissions();
  if (!context) return false;
  return permissions.some((p) => context.permissions[p] === true);
}

/**
 * Hook to check if user can access a module
 */
export function useCanAccessModule(moduleId: ModuleId): boolean {
  const { context } = usePermissions();
  if (!context) return false;
  return context.moduleAccess.includes(moduleId);
}

/**
 * Hook to get accessible modules for the current user
 */
export function useAccessibleModules(): ModuleId[] {
  const { context } = usePermissions();
  return context?.moduleAccess || [];
}

/**
 * Hook to check if user is an owner
 */
export function useIsOwner(): boolean {
  const { context } = usePermissions();
  return context?.isOwner === true;
}

/**
 * Hook to check if user is at least a lead
 */
export function useIsAtLeastLead(): boolean {
  const { context } = usePermissions();
  if (!context) return false;
  return context.isOwner || context.isLead;
}

/**
 * Hook to check if user is at least a member
 */
export function useIsAtLeastMember(): boolean {
  const { context } = usePermissions();
  if (!context) return false;
  return context.isOwner || context.isLead || context.isMember;
}

/**
 * Hook to get the current role
 */
export function useCurrentRole(): OrgRole | null {
  const { context } = usePermissions();
  return context?.role ?? null;
}

/**
 * Hook to check if user can modify assigned agents
 */
export function useCanReassignAgent(): boolean {
  return useHasPermission("canReassignAgent");
}

/**
 * Hook to check if user can export data
 */
export function useCanExport(): boolean {
  return useHasPermission("canExport");
}

/**
 * Hook to check if user can manage roles
 */
export function useCanManageRoles(): boolean {
  return useHasPermission("canManageRoles");
}

/**
 * Hook to check if user can invite users
 */
export function useCanInviteUsers(): boolean {
  return useHasPermission("canInviteUsers");
}

// Note: Component wrappers are defined in a separate .tsx file
// See lib/permissions/components.tsx for PermissionGate, ModuleGate, OwnerOnly, LeadPlusOnly
