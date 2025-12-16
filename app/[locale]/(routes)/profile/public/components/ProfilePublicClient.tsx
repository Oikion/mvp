"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Pencil, Eye, ExternalLink, Lock, Shield, Globe, AlertCircle, User } from "lucide-react";
import Link from "next/link";

import { ProfilePreview } from "./ProfilePreview";
import { ProfileEditor } from "./ProfileEditor";

interface ProfilePublicClientProps {
  userData: any;
  profile: any;
  showcaseProperties: any[];
  availableProperties: any[];
  dict?: any;
}

const getVisibilityInfo = (visibility: string | undefined, t?: any) => {
  const visibilityT = t?.profile?.visibility;
  switch (visibility) {
    case "PUBLIC":
      return {
        label: visibilityT?.public?.label || "Public",
        description: visibilityT?.public?.description || "Anyone can view your profile",
        icon: Globe,
        color: "text-green-600",
        bgColor: "bg-green-500/10",
        badgeVariant: "default" as const,
      };
    case "SECURE":
      return {
        label: visibilityT?.secure?.label || "Secure",
        description: visibilityT?.secure?.description || "Only registered users can view",
        icon: Shield,
        color: "text-amber-600",
        bgColor: "bg-amber-500/10",
        badgeVariant: "secondary" as const,
      };
    default:
      return {
        label: visibilityT?.personal?.label || "Personal",
        description: visibilityT?.personal?.description || "Hidden from everyone",
        icon: Lock,
        color: "text-red-600",
        bgColor: "bg-red-500/10",
        badgeVariant: "destructive" as const,
      };
  }
};

export function ProfilePublicClient({
  userData,
  profile,
  showcaseProperties,
  availableProperties,
  dict,
}: ProfilePublicClientProps) {
  const [isEditing, setIsEditing] = useState(!profile);
  const [fullProfileUrl, setFullProfileUrl] = useState(`/agent/${userData.username}`);
  const t = dict?.profile;

  // Set full URL after mount to avoid hydration mismatch
  useEffect(() => {
    setFullProfileUrl(`${window.location.origin}/agent/${userData.username}`);
  }, [userData.username]);

  const visibilityInfo = getVisibilityInfo(profile?.visibility, dict);
  const VisibilityIcon = visibilityInfo.icon;

  // Profile URL is based on username
  const profileUrl = userData.username;
  const hasUsername = !!userData.username;

  // Build profile data for preview
  const profileForPreview = profile
    ? {
        ...profile,
        slug: userData.username, // Use username as slug
        user: {
          ...profile.user,
          name: userData.name,
          avatar: userData.avatar,
          username: userData.username,
          properties: showcaseProperties.map((sp) => sp.property),
          _count: {
            properties: showcaseProperties.length,
            followers: 0,
          },
        },
      }
    : null;

  // Show username setup prompt if no username
  if (!hasUsername) {
    return (
      <div className="space-y-6">
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-5 w-5" />
              Username Required
            </CardTitle>
            <CardDescription className="text-amber-600 dark:text-amber-500">
              You need to set a username before you can create your public profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your username will be your public profile URL. For example, if your username is 
              <code className="mx-1 px-1.5 py-0.5 bg-muted rounded text-xs">john-doe</code> 
              your profile will be at 
              <code className="mx-1 px-1.5 py-0.5 bg-muted rounded text-xs">/agent/john-doe</code>
            </p>
            <p className="text-sm text-muted-foreground">
              You can change your username at any time in your account settings. When you change it, 
              your profile URL will automatically update.
            </p>
            <Link href="/profile">
              <Button>
                <User className="h-4 w-4 mr-2" />
                Set Username in Settings
              </Button>
            </Link>
          </CardContent>
        </Card>
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
          {profileUrl && profile?.visibility !== "PERSONAL" && profile && (
            <Link
              href={`/agent/${profileUrl}`}
              target="_blank"
              className="inline-flex items-center gap-1"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                {t?.preview?.viewLiveProfile || "View Live"}
              </Button>
            </Link>
          )}

          {profile && (
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  {t?.actions?.preview || "Preview"}
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4 mr-1" />
                  {t?.actions?.edit || "Edit"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Profile URL display - based on username */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <span className="text-sm text-muted-foreground">{t?.preview?.yourProfileUrl || "Your profile URL:"}</span>
          <code className="text-sm bg-background px-3 py-1 rounded border font-mono">
            {fullProfileUrl}
          </code>
        </div>
        <p className="text-xs text-muted-foreground">
          {t?.preview?.urlHint || "This URL is based on your username. To change it, update your username in"}{" "}
          <Link href="/profile" className="text-primary hover:underline">
            {t?.profileUrl?.accountSettings || "account settings"}
          </Link>
          .
        </p>
      </div>

      {/* Content based on mode */}
      {isEditing ? (
        <ProfileEditor
          profile={profile}
          username={userData.username}
          userEmail={userData?.email || ""}
          showcaseProperties={showcaseProperties}
          availableProperties={availableProperties}
          onSave={() => setIsEditing(false)}
        />
      ) : profileForPreview ? (
        <ProfilePreview profile={profileForPreview} dict={dict} />
      ) : (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <div className="max-w-md mx-auto space-y-4">
            <div className="rounded-full w-16 h-16 bg-primary/10 flex items-center justify-center mx-auto">
              <Globe className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">{t?.preview?.createPublicProfile || "Create Your Public Profile"}</h3>
            <p className="text-muted-foreground">
              {t?.preview?.createPublicProfileDesc || "Set up your public profile to showcase your properties and connect with potential clients."}
            </p>
            <Button onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              {dict?.common?.getStarted || "Get Started"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
