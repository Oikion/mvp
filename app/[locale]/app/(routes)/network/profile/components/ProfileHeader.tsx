"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppToast } from "@/hooks/use-app-toast";
import {
  Globe,
  Shield,
  Lock,
  ExternalLink,
  Copy,
  Check,
  Pencil,
  Eye,
  Users,
  AlertCircle,
  User,
} from "lucide-react";
import { Link } from "@/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfileHeaderProps {
  userData: any;
  profile: any;
  connectionsCount: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  dict: any;
}

const getVisibilityInfo = (visibility: string | undefined, dict?: any) => {
  const visibilityT = dict?.profile?.visibility;
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

export { getVisibilityInfo };

export function ProfileHeader({
  userData,
  profile,
  connectionsCount,
  isEditing,
  onToggleEdit,
  dict,
}: ProfileHeaderProps) {
  const [fullProfileUrl, setFullProfileUrl] = useState(`/agent/${userData.username}`);
  const [copied, setCopied] = useState(false);
  const { toast } = useAppToast();
  const t = dict?.profile;

  // Set full URL after mount to avoid hydration mismatch
  useEffect(() => {
    setFullProfileUrl(`${window.location.origin}/agent/${userData.username}`);
  }, [userData.username]);

  const visibilityInfo = getVisibilityInfo(profile?.visibility, dict);
  const VisibilityIcon = visibilityInfo.icon;
  const hasUsername = !!userData.username;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(fullProfileUrl);
      setCopied(true);
      toast.success("Copied!", { description: "Profile URL copied to clipboard", isTranslationKey: false });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Error", { description: "Failed to copy URL", isTranslationKey: false });
    }
  };

  // Show username setup prompt if no username
  if (!hasUsername) {
    return (
      <Card className="border-warning/30 bg-warning/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-warning dark:text-warning">
            <AlertCircle className="h-5 w-5" />
            Username Required
          </CardTitle>
          <CardDescription className="text-warning dark:text-warning">
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
          <Button asChild>
            <Link href="/app/profile">
              <User className="h-4 w-4 mr-2" />
              Set Username in Settings
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-xl border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        {/* Avatar */}
        <Avatar className="h-20 w-20 border-4 border-background shadow-lg">
          <AvatarImage src={userData.avatar || ""} alt={userData.name || "Agent"} />
          <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
            {userData.name?.charAt(0) || "A"}
          </AvatarFallback>
        </Avatar>

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Name + visibility badge */}
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold tracking-tight">{userData.name}</h2>
            <Badge variant={visibilityInfo.badgeVariant} className="gap-1">
              <VisibilityIcon className="h-3 w-3" />
              {visibilityInfo.label}
            </Badge>
          </div>

          {/* Visibility description */}
          <p className="text-sm text-muted-foreground">{visibilityInfo.description}</p>

          {/* Profile URL + connections stat */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            {userData.username && (
              <div className="flex items-center gap-2">
                <code className="text-xs bg-background/80 px-2.5 py-1 rounded border font-mono truncate max-w-xs">
                  {fullProfileUrl}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={handleCopyUrl}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="font-medium">{connectionsCount}</span>
              <span>{dict?.connections?.tabs?.connections || "connections"}</span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {profile?.visibility !== "PERSONAL" && profile && userData.username && (
            <Link
              href={`/agent/${userData.username}`}
              target="_blank"
              className="inline-flex"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                {t?.preview?.viewLiveProfile || "View Live"}
              </Button>
            </Link>
          )}

          {profile && (
            <Button
              variant={isEditing ? "default" : "outline"}
              size="sm"
              onClick={onToggleEdit}
            >
              {isEditing ? (
                <>
                  <Eye className="h-4 w-4 mr-1.5" />
                  {t?.actions?.preview || "Preview"}
                </>
              ) : (
                <>
                  <Pencil className="h-4 w-4 mr-1.5" />
                  {t?.actions?.edit || "Edit"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
