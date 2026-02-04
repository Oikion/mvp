"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Users, AgentProfile } from "@prisma/client";
import axios from "axios";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/hooks/use-app-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Lock,
  Shield,
  Globe,
  Eye,
  Key,
  AlertTriangle,
  Loader2,
  UserX,
  Save,
  LucideIcon,
} from "lucide-react";

import { PasswordChangeForm } from "./PasswordChange";
import { DeleteAccountForm } from "./DeleteAccountForm";

interface PrivacySecurityTabProps {
  user: Users;
  agentProfile: AgentProfile | null;
}

interface VisibilityOptionConfig {
  value: string;
  translationKey: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
}

const VISIBILITY_OPTION_CONFIGS: VisibilityOptionConfig[] = [
  {
    value: "PERSONAL",
    translationKey: "personal",
    icon: Lock,
    color: "text-muted-foreground",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/30",
  },
  {
    value: "SECURE",
    translationKey: "secure",
    icon: Shield,
    color: "text-warning",
    bgColor: "bg-warning/10",
    borderColor: "border-warning/30",
  },
  {
    value: "PUBLIC",
    translationKey: "public",
    icon: Globe,
    color: "text-success",
    bgColor: "bg-success/10",
    borderColor: "border-success/30",
  },
];

export function PrivacySecurityTab({
  user,
  agentProfile,
}: PrivacySecurityTabProps) {
  const t = useTranslations("profile.privacy");
  const tVisibility = useTranslations("profile.visibility");
  const tCommon = useTranslations("common");
  const [visibility, setVisibility] = useState<string>(
    agentProfile?.visibility || "PERSONAL"
  );
  const [hideFromSearch, setHideFromSearch] = useState<boolean>(
    agentProfile?.hideFromAgentSearch || false
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const router = useRouter();
  const { toast } = useAppToast();

  // Track changes
  useEffect(() => {
    const visibilityChanged = visibility !== (agentProfile?.visibility || "PERSONAL");
    const hideChanged = hideFromSearch !== (agentProfile?.hideFromAgentSearch || false);
    setHasChanges(visibilityChanged || hideChanged);
  }, [visibility, hideFromSearch, agentProfile]);

  const handleSavePrivacy = async () => {
    setIsSaving(true);
    try {
      // If profile doesn't exist, we need to create it with a slug
      const slug = agentProfile?.slug || user.username || user.name?.toLowerCase().replace(/\s+/g, "-") || `user-${user.id.slice(0, 8)}`;
      
      await axios.post("/api/profile/social", {
        slug,
        visibility,
        hideFromAgentSearch: hideFromSearch,
        // Preserve existing profile data
        bio: agentProfile?.bio,
        publicPhone: agentProfile?.publicPhone,
        publicEmail: agentProfile?.publicEmail,
        specializations: agentProfile?.specializations || [],
        serviceAreas: agentProfile?.serviceAreas || [],
        languages: agentProfile?.languages || [],
        yearsExperience: agentProfile?.yearsExperience,
        certifications: agentProfile?.certifications || [],
        socialLinks: agentProfile?.socialLinks || {},
      });

      toast.success(t("saved"), { description: t("savedDescription"), isTranslationKey: false });

      setHasChanges(false);
      router.refresh();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error as { response?: { data?: string } })?.response?.data || t("saveFailed");
      toast.error(tCommon("toast.error"), { description: errorMessage, isTranslationKey: false });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedOption = VISIBILITY_OPTION_CONFIGS.find(
    (opt) => opt.value === visibility
  );

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t("changePassword.title")}</CardTitle>
              <CardDescription>
                {t("changePassword.description")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm userId={user.id} />
        </CardContent>
      </Card>

      <Separator />

      {/* Profile Visibility */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Eye className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle>{t("profileVisibility.title")}</CardTitle>
              <CardDescription>
                {t("profileVisibility.description")}
              </CardDescription>
            </div>
            {selectedOption && (
              <Badge
                variant="outline"
                className={`${selectedOption.bgColor} ${selectedOption.borderColor}`}
              >
                <selectedOption.icon className={`h-3 w-3 mr-1 ${selectedOption.color}`} />
                {tVisibility(`${selectedOption.translationKey}.label`)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {VISIBILITY_OPTION_CONFIGS.map((option) => {
              const Icon = option.icon;
              const isSelected = visibility === option.value;
              return (
                <div
                  key={option.value}
                  onClick={() => setVisibility(option.value)}
                  className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? `border-primary ${option.bgColor}`
                      : "border-transparent bg-muted/50 hover:bg-muted"
                  }`}
                >
                  <div className={`rounded-full p-2 ${option.bgColor}`}>
                    <Icon className={`h-4 w-4 ${option.color}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tVisibility(`${option.translationKey}.label`)}</span>
                      {isSelected && (
                        <Badge variant="outline" className="text-xs">
                          {tCommon("misc.selected")}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tVisibility(`${option.translationKey}.description`)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Agent Discovery */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <UserX className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>{t("agentDiscovery.title")}</CardTitle>
              <CardDescription>
                {t("agentDiscovery.description")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
            <div className="space-y-1">
              <Label
                htmlFor="hide-from-search"
                className="font-medium cursor-pointer"
              >
                {t("agentDiscovery.hideFromSearch")}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t("agentDiscovery.hideDescription")}
              </p>
            </div>
            <Switch
              id="hide-from-search"
              checked={hideFromSearch}
              onCheckedChange={setHideFromSearch}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <Button
            leftIcon={isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            onClick={handleSavePrivacy}
            disabled={isSaving}
            size="lg"
            className="shadow-lg"
          >
            {isSaving ? tCommon("buttonStates.saving") : tCommon("buttons.saveChanges")}
          </Button>
        </div>
      )}

      <Separator />

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-destructive">{t("dangerZone.title")}</CardTitle>
              <CardDescription>
                {t("dangerZone.description")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="space-y-1">
              <p className="font-medium">{t("dangerZone.deleteAccount")}</p>
              <p className="text-sm text-muted-foreground">
                {t("dangerZone.deleteDescription")}
              </p>
            </div>
            <DeleteAccountForm userId={user.id} username={user.username} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}












