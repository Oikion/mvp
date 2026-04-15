"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, ExternalLink, Lock, Shield, Globe, AlertCircle, Building2 } from "lucide-react";
import { Link } from "@/navigation";
import { AgencyProfileView } from "@/app/[locale]/(public)/agency/[slug]/components/AgencyProfileView";
import type { getPublicAgencyProfile } from "@/actions/organization/agency-profile";
import type { AgencyProfile } from "@prisma/client";

type PublicAgencyProfile = NonNullable<Awaited<ReturnType<typeof getPublicAgencyProfile>>>;

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
}

interface AgencyProfilePreviewProps {
  profile: AgencyProfile | null;
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

export function AgencyProfilePreview({ profile, dict, locale }: AgencyProfilePreviewProps) {
  const [fullProfileUrl, setFullProfileUrl] = useState(profile?.slug ? `/agency/${profile.slug}` : "");
  const t = dict?.profile;

  // Set full URL after mount to avoid hydration mismatch
  useEffect(() => {
    if (profile?.slug) {
      setFullProfileUrl(`${window.location.origin}/agency/${profile.slug}`);
    }
  }, [profile?.slug]);

  const visibilityInfo = getVisibilityInfo(profile?.visibility ?? undefined, dict);
  const VisibilityIcon = visibilityInfo.icon;

  // Show setup prompt if no profile
  if (!profile) {
    return (
      <div className="space-y-6">
        <Card className="border-warning/30 bg-warning/10">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div className="flex-1">
                <CardTitle className="text-warning">
                  {t?.preview?.createPublicProfile || "Create Your Public Profile"}
                </CardTitle>
                <CardDescription className="text-warning/80 mt-1">
                  {t?.preview?.createPublicProfileDesc || "Set up your agency profile to showcase your properties and connect with clients."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {t?.agencyProfile?.description || "Create your agency profile in the Basic Info tab to get started."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const canViewLive = profile.visibility === "PUBLIC" || profile.visibility === "SECURE";

  return (
    <div className="space-y-6">
      {/* Profile Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                {t?.preview?.liveProfile || "Live Profile"}
              </CardTitle>
              <CardDescription className="mt-1">
                {t?.preview?.previewMode || "This is how visitors will see your agency profile"}
              </CardDescription>
            </div>
            <Badge variant={visibilityInfo.badgeVariant} className="gap-1.5">
              <VisibilityIcon className="h-3.5 w-3.5" />
              {visibilityInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Visibility Info */}
          <div className={`flex items-start gap-3 rounded-lg border p-4 ${visibilityInfo.bgColor}`}>
            <VisibilityIcon className={`h-5 w-5 ${visibilityInfo.color} mt-0.5`} />
            <div className="flex-1">
              <p className="text-sm font-medium">{visibilityInfo.label}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {visibilityInfo.description}
              </p>
            </div>
          </div>

          {/* Profile URL */}
          {profile.slug && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                {t?.preview?.yourProfileUrl || "Your profile URL:"}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm">
                  {fullProfileUrl}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(fullProfileUrl);
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}

          {/* View Live Button */}
          {canViewLive && profile.slug && (
            <Button asChild>
              <Link href={`/agency/${profile.slug}`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                {t?.preview?.viewLiveProfile || "View Live Profile"}
              </Link>
            </Button>
          )}

          {!canViewLive && (
            <div className="rounded-lg border border-dashed p-4 text-center">
              <Lock className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium">
                {t?.preview?.profileHidden || "Profile Hidden"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t?.preview?.profileHiddenDesc || "Your profile visibility is set to Personal. Make it Secure or Public to view your profile."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live Preview */}
      {canViewLive && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  {t?.preview?.profilePreview || "Profile Preview"}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t?.preview?.previewMode || "This is how visitors will see your agency profile"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <div className="bg-muted/30 border-b px-4 py-2 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-destructive/50" />
                  <div className="h-3 w-3 rounded-full bg-warning/50" />
                  <div className="h-3 w-3 rounded-full bg-success/50" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-muted-foreground font-mono">
                    {fullProfileUrl}
                  </span>
                </div>
              </div>
              <div className="bg-background max-h-[600px] overflow-y-auto">
                <AgencyProfileView profile={profile as unknown as PublicAgencyProfile} locale={locale} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
