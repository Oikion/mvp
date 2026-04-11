"use client";

import React from "react";
import { PermissionKey, ModuleId } from "./types";
import { useHasPermission, useCanAccessModule, useIsOwner, useIsAtLeastLead } from "./hooks";

/**
 * Component wrapper that only renders children if user has permission
 */
export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: PermissionKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const hasPermission = useHasPermission(permission);
  return hasPermission ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component wrapper that only renders children if user can access module
 */
export function ModuleGate({
  moduleId,
  children,
  fallback = null,
}: {
  moduleId: ModuleId;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const canAccess = useCanAccessModule(moduleId);
  return canAccess ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component wrapper for owner-only content
 */
export function OwnerOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const isOwner = useIsOwner();
  return isOwner ? <>{children}</> : <>{fallback}</>;
}

/**
 * Component wrapper for lead+ content (owner or lead)
 */
export function LeadPlusOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const isAtLeastLead = useIsAtLeastLead();
  return isAtLeastLead ? <>{children}</> : <>{fallback}</>;
}
