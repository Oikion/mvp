"use client";

import React, { useState } from "react";
import useSWR from "swr";
import { OrgRole } from "@prisma/client";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/hooks/use-app-toast";
import { Icons } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import {
  PermissionKey,
  ModuleId,
  getRoleDisplayName,
} from "@/lib/permissions/types";
import {
  PERMISSION_DESCRIPTIONS,
  MODULE_DISPLAY_NAMES,
  DEFAULT_PERMISSIONS,
} from "@/lib/permissions/defaults";
import { OwnershipTransfer } from "./OwnershipTransfer";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface RolePermissions {
  [key: string]: boolean;
}

interface RoleModuleAccess {
  [key: string]: boolean;
}

interface RolesData {
  permissions: Record<OrgRole, RolePermissions>;
  moduleAccess: Record<OrgRole, RoleModuleAccess>;
  availableModules: ModuleId[];
}

export function RolesManager() {
  const t = useTranslations("admin");
  const { toast } = useAppToast();
  const [selectedRole, setSelectedRole] = useState<OrgRole>(OrgRole.LEAD);
  const [isSaving, setIsSaving] = useState(false);
  const [localPermissions, setLocalPermissions] = useState<RolePermissions | null>(null);
  const [localModuleAccess, setLocalModuleAccess] = useState<RoleModuleAccess | null>(null);

  const { data, error, isLoading, mutate } = useSWR<RolesData>(
    "/api/org/roles",
    fetcher
  );

  // Initialize local state when data loads or role changes
  React.useEffect(() => {
    if (data && selectedRole) {
      setLocalPermissions(data.permissions[selectedRole] || {});
      setLocalModuleAccess(data.moduleAccess[selectedRole] || {});
    }
  }, [data, selectedRole]);

  const handlePermissionChange = (key: PermissionKey, value: boolean) => {
    setLocalPermissions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleModuleAccessChange = (moduleId: ModuleId, value: boolean) => {
    setLocalModuleAccess((prev) => ({
      ...prev,
      [moduleId]: value,
    }));
  };

  const handleSave = async () => {
    if (selectedRole === OrgRole.OWNER) {
      toast.error(t("cannotEditOwnerRole") || "Cannot edit owner role", { isTranslationKey: false });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/org/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: selectedRole,
          permissions: localPermissions,
          moduleAccess: localModuleAccess,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      toast.success(t("rolesSaved") || "Roles saved successfully", { isTranslationKey: false });

      mutate();
    } catch (error) {
      toast.error(t("rolesSaveError") || "Failed to save roles", { isTranslationKey: false });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (data && selectedRole) {
      setLocalPermissions(DEFAULT_PERMISSIONS[selectedRole]);
      // Reset module access to defaults would need to be handled separately
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{t("loadError") || "Failed to load roles"}</p>
      </div>
    );
  }

  const roles = [OrgRole.OWNER, OrgRole.LEAD, OrgRole.MEMBER, OrgRole.VIEWER];
  const permissionKeys = Object.keys(PERMISSION_DESCRIPTIONS) as PermissionKey[];

  return (
    <div className="space-y-6">
      {/* Ownership Transfer Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("ownershipSettings") || "Ownership Settings"}</CardTitle>
          <CardDescription>
            {t("ownershipSettingsDescription") || "Transfer organization ownership to another member"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OwnershipTransfer />
        </CardContent>
      </Card>

      {/* Role Tabs */}
      <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as OrgRole)}>
        <TabsList className="inline-grid grid-cols-4">
          {roles.map((role) => (
            <TabsTrigger key={role} value={role}>
              {getRoleDisplayName(role)}
              {role === OrgRole.OWNER && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  {t("locked") || "Locked"}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {roles.map((role) => (
          <TabsContent key={role} value={role} className="space-y-6">
            {/* Role Description */}
            <Card>
              <CardHeader>
                <CardTitle>{getRoleDisplayName(role)}</CardTitle>
                <CardDescription>
                  {role === OrgRole.OWNER && (t("roleOwnerDescription") || "Full access to all organization features and settings")}
                  {role === OrgRole.LEAD && (t("roleLeadDescription") || "Can edit, delete, and reassign all entities")}
                  {role === OrgRole.MEMBER && (t("roleMemberDescription") || "Can edit and delete, but cannot reassign agents")}
                  {role === OrgRole.VIEWER && (t("roleViewerDescription") || "Read-only access to permitted modules")}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Permissions */}
            <Card>
              <CardHeader>
                <CardTitle>{t("permissions") || "Permissions"}</CardTitle>
                <CardDescription>
                  {t("permissionsDescription") || "Configure what this role can do"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {permissionKeys.map((key) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor={`${role}-${key}`} className="font-medium">
                        {key.replace(/^can/, "").replace(/([A-Z])/g, " $1").trim()}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {PERMISSION_DESCRIPTIONS[key]}
                      </p>
                    </div>
                    <Switch
                      id={`${role}-${key}`}
                      checked={localPermissions?.[key] ?? false}
                      onCheckedChange={(checked) => handlePermissionChange(key, checked)}
                      disabled={role === OrgRole.OWNER}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Module Access (only for Viewer role) */}
            {role === OrgRole.VIEWER && (
              <Card>
                <CardHeader>
                  <CardTitle>{t("moduleAccess") || "Module Access"}</CardTitle>
                  <CardDescription>
                    {t("moduleAccessDescription") || "Configure which modules Viewers can access by default"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {data?.availableModules.map((moduleId) => (
                    <div key={moduleId} className="flex items-center justify-between">
                      <Label htmlFor={`${role}-module-${moduleId}`} className="font-medium">
                        {MODULE_DISPLAY_NAMES[moduleId]}
                      </Label>
                      <Switch
                        id={`${role}-module-${moduleId}`}
                        checked={localModuleAccess?.[moduleId] ?? false}
                        onCheckedChange={(checked) => handleModuleAccessChange(moduleId, checked)}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Save Button */}
            {role !== OrgRole.OWNER && (
              <div className="flex justify-end gap-4">
                <Button variant="outline" onClick={handleReset} disabled={isSaving}>
                  {t("resetToDefaults") || "Reset to Defaults"}
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                      {t("saving") || "Saving..."}
                    </>
                  ) : (
                    t("saveChanges") || "Save Changes"
                  )}
                </Button>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
