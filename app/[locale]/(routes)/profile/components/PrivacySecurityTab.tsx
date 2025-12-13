"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Lock,
  Shield,
  Globe,
  Eye,
  EyeOff,
  Key,
  AlertTriangle,
  Loader2,
  UserX,
  Save,
} from "lucide-react";

import { PasswordChangeForm } from "./PasswordChange";
import { DeleteAccountForm } from "./DeleteAccountForm";

interface PrivacySecurityTabProps {
  user: Users;
  agentProfile: AgentProfile | null;
}

const VISIBILITY_OPTIONS = [
  {
    value: "PERSONAL",
    label: "Personal",
    description: "Your profile is hidden from everyone",
    icon: Lock,
    color: "text-gray-600",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/30",
  },
  {
    value: "SECURE",
    label: "Secure",
    description: "Only registered users can view your profile",
    icon: Shield,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
  },
  {
    value: "PUBLIC",
    label: "Public",
    description: "Anyone can view your profile, even without an account",
    icon: Globe,
    color: "text-green-600",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
  },
];

export function PrivacySecurityTab({
  user,
  agentProfile,
}: PrivacySecurityTabProps) {
  const [visibility, setVisibility] = useState<string>(
    agentProfile?.visibility || "PERSONAL"
  );
  const [hideFromSearch, setHideFromSearch] = useState<boolean>(
    agentProfile?.hideFromAgentSearch || false
  );
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

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

      toast({
        variant: "success",
        title: "Privacy settings updated",
        description: "Your privacy preferences have been saved.",
      });

      setHasChanges(false);
      router.refresh();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.response?.data || "Failed to update privacy settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedOption = VISIBILITY_OPTIONS.find(
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
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
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
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Eye className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <CardTitle>Profile Visibility</CardTitle>
              <CardDescription>
                Control who can see your public agent profile
              </CardDescription>
            </div>
            {selectedOption && (
              <Badge
                variant="outline"
                className={`${selectedOption.bgColor} ${selectedOption.borderColor}`}
              >
                <selectedOption.icon className={`h-3 w-3 mr-1 ${selectedOption.color}`} />
                {selectedOption.label}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {VISIBILITY_OPTIONS.map((option) => {
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
                      <span className="font-medium">{option.label}</span>
                      {isSelected && (
                        <Badge variant="outline" className="text-xs">
                          Selected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {option.description}
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
              <CardTitle>Agent Discovery</CardTitle>
              <CardDescription>
                Control how other agents can find you
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
                Hide from &quot;Find Agents&quot; list
              </Label>
              <p className="text-sm text-muted-foreground">
                When enabled, you won&apos;t appear in agent search results. Other
                agents won&apos;t be able to discover you, but you can still send
                connection requests.
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
            onClick={handleSavePrivacy}
            disabled={isSaving}
            size="lg"
            className="shadow-lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Privacy Settings
              </>
            )}
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
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions that affect your account
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="space-y-1">
              <p className="font-medium">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data. This
                action cannot be undone.
              </p>
            </div>
            <DeleteAccountForm userId={user.id} username={user.username} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}






