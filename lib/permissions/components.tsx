"use client";

import React from "react";
import { PermissionKey, ModuleId } from "./types";
import type { ActionPermission } from "./action-permissions";
import {
  useHasPermission,
  useCanAccessModule,
  useIsOwner,
  useIsAtLeastLead,
} from "./hooks";

/**
 * Component wrapper that only renders children if user has permission.
 *
 * Accepts either:
 * - Legacy `permission` prop with a coarse role-level key (PermissionKey),
 *   enforced client-side via the existing `usePermissions()` hook.
 * - New `action` prop with a fine-grained action permission (ActionPermission).
 *   **NOTE:** No client-side action permission hook exists yet — the `action`
 *   mode currently renders children unconditionally and relies on the server
 *   action layer (`requireAction()`) to enforce permission when the button is
 *   actually clicked. A future `useHasActionPermission()` hook will close this
 *   gap; until then, treat `action=` as a UX annotation, not a security gate.
 *   TODO(phase-4): wire `action` mode to a real client-side permission check.
 */
export function PermissionGate(
  props:
    | {
        permission: PermissionKey;
        action?: never;
        children: React.ReactNode;
        fallback?: React.ReactNode;
      }
    | {
        action: ActionPermission;
        permission?: never;
        children: React.ReactNode;
        fallback?: React.ReactNode;
      }
) {
  const { children, fallback = null } = props;
  // Legacy coarse permission check — only consulted in legacy `permission=` mode.
  // The sentinel value keeps hook order stable when `action=` mode is used.
  const legacyAllowed = useHasPermission(
    "permission" in props && props.permission
      ? props.permission
      : ("canEdit" as PermissionKey)
  );

  if ("action" in props && props.action) {
    // Client-side action permission checks aren't wired yet — rely on
    // server-side `requireAction()` enforcement at call time.
    return <>{children}</>;
  }

  return legacyAllowed ? <>{children}</> : <>{fallback}</>;
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
