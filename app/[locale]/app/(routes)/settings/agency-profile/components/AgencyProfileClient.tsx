"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Eye, ExternalLink, Lock, Shield, Globe, Building2 } from "lucide-react";
import { Link } from "@/navigation";

import type { AgencyProfile } from "@prisma/client";
import { AgencyProfilePreview } from "./AgencyProfilePreview";
import { AgencyProfileEditor } from "./AgencyProfileEditor";

interface ProfileDict {
  profile?: {
    preview?: Record<string, string | undefined>;
    agencyProfile?: Record<string, string | undefined>;
    actions?: Record<string, string | undefined>;
    visibility?: {
      public?: { label?: string; description?: string };
      secure?: { label?: string; description?: string };
      personal?: { label?: string; description?: string };
    };
  };
  common?: Record<string, string | undefined>;
}

interface AgencyProfileClientProps {
  profile: AgencyProfile | null;
  clerkOrgName: string;
  clerkOrgSlug: string;
  dict?: ProfileDict;
  locale: string;
}

const getVisibilityInfo = (visibility: string | undefined, t?: ProfileDict) => {
  const visibilityT = t?.profile?.visibility;
  switch (visibility) {
    case "PUBLIC":
      return {
        label: visibilityT?.public?.label || "Public",
        description: visibilityT?.public?.description || "Anyone can view your profile",
        icon: Globe,
        color: "text-success",
        bgColor: "bg-success/10",
        badgeVariant: "default" as const,
      };
    case "SECURE":
      return {
        label: visibilityT?.secure?.label || "Secure",
        description: visibilityT?.secure?.description || "Only registered users can view",
        icon: Shield,
        color: "text-warning",
        bgColor: "bg-warning/10",
        badgeVariant: "secondary" as const,
      };
    default:
      return {
        label: visibilityT?.personal?.label || "Personal",
        description: visibilityT?.personal?.description || "Hidden from everyone",
        icon: Lock,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        badgeVariant: "destructive" as const,
      };
  }
};

export function AgencyProfileClient({
  profile,
  clerkOrgName,
  clerkOrgSlug,
  dict,
  locale,
}: AgencyProfileClientProps) {
  const [isEditing, setIsEditing] = useState(!profile);
  const [fullProfileUrl, setFullProfileUrl] = useState(`/agency/${clerkOrgSlug}`);
  const t = dict?.profile;

  // Set full URL after mount to avoid hydration mismatch
  useEffect(() => {
    setFullProfileUrl(`${globalThis.location.origin}/agency/${clerkOrgSlug}`);
  }, [clerkOrgSlug]);

  const visibilityInfo = getVisibilityInfo(profile?.visibility ?? undefined, dict);
  const VisibilityIcon = visibilityInfo.icon;

  // Show setup prompt if no profile and not editing
  if (!profile && !isEditing) {
    return (
      <div className="text-center py-12 border rounded-lg bg-muted/20">
        <div className="max-w-md mx-auto space-y-4">
          <div className="rounded-full w-16 h-16 bg-primary/10 flex items-center justify-center mx-auto">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">
            {t?.preview?.createPublicProfile || "Create Your Agency's Public Profile"}
          </h3>
          <p className="text-muted-foreground">
            {t?.preview?.createPublicProfileDesc || "Set up your agency profile to showcase your properties and connect with clients."}
          </p>
          <Button onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            {dict?.common?.getStarted || "Get Started"}
          </Button>
        </div>
      </div>
    );
  }

  // If no profile but editing, show the editor directly
  if (!profile && isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-4 border-b">
          <h2 className="text-lg font-semibold">
            {t?.preview?.createProfile || "Create Agency Profile"}
          </h2>
        </div>
        <AgencyProfileEditor
          profile={null}
          clerkOrgName={clerkOrgName}
          clerkOrgSlug={clerkOrgSlug}
          onSave={() => {
            setIsEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with mode toggle */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className={`rounded-full p-2 ${visibilityInfo.bgColor}`}>
            <VisibilityIcon className={`h-5 w-5 ${visibilityInfo.color}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">
                {isEditing ? (t?.preview?.editProfile || "Edit Profile") : (t?.preview?.profilePreview || "Profile Preview")}
              </h2>
              <Badge variant={visibilityInfo.badgeVariant}>
                {visibilityInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {visibilityInfo.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {profile?.visibility !== "PERSONAL" && (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/agency/${clerkOrgSlug}`}
                target="_blank"
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                {t?.preview?.viewLiveProfile || "View Live"}
              </Link>
            </Button>
          )}

          <Button
            variant={isEditing ? "default" : "outline"}
            size="sm"
            leftIcon={isEditing ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? (t?.actions?.preview || "Preview") : (t?.actions?.edit || "Edit")}
          </Button>
        </div>
      </div>

      {/* Profile URL display */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <span className="text-sm text-muted-foreground">{t?.preview?.yourProfileUrl || "Your profile URL:"}</span>
          <code className="text-sm bg-background px-3 py-1 rounded border font-mono">
            {fullProfileUrl}
          </code>
        </div>
        <p className="text-xs text-muted-foreground">
          This URL is synced from your Clerk organization slug. To change it, update your organization settings in Clerk.
        </p>
      </div>

      {/* Content based on mode */}
      {isEditing ? (
        <AgencyProfileEditor
          profile={profile}
          clerkOrgName={clerkOrgName}
          clerkOrgSlug={clerkOrgSlug}
          onSave={() => {
            setIsEditing(false);
          }}
        />
      ) : (
        <AgencyProfilePreview profile={profile} dict={dict} locale={locale} />
      )}
    </div>
  );
}
