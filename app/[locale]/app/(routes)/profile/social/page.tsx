import { getMyAgentProfile, generateUniqueSlug } from "@/actions/social/profile";
import { getUser } from "@/actions/get-user";
import Container from "../../components/ui/Container";
import { SocialProfileForm } from "./components/SocialProfileForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Eye, EyeOff, ExternalLink } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function SocialProfilePage() {
  const [profile, userData, t] = await Promise.all([
    getMyAgentProfile(),
    getUser(),
    getTranslations("profile.socialPage"),
  ]);

  // Generate a suggested slug if the user doesn't have a profile yet
  let suggestedSlug = "";
  if (!profile && userData?.name) {
    suggestedSlug = await generateUniqueSlug(userData.name);
  } else if (!profile && userData?.username) {
    suggestedSlug = await generateUniqueSlug(userData.username);
  }

  return (
    <Container
      title={t("title")}
      description={t("description")}
    >
      <div className="space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>{t("statusTitle")}</CardTitle>
                  <CardDescription>
                    {t("statusDescription")}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {profile?.visibility === "PUBLIC" ? (
                  <Badge className="bg-success/10 text-success hover:bg-success/10">
                    <Eye className="h-3 w-3 mr-1" />
                    {t("public")}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <EyeOff className="h-3 w-3 mr-1" />
                    {t("private")}
                  </Badge>
                )}
                {profile?.slug && profile?.visibility === "PUBLIC" && (
                  <Link
                    href={`/agent/${profile.slug}`}
                    target="_blank"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    {t("viewProfile")}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          </CardHeader>
          {profile?.slug && (
            <CardContent>
              <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t("yourProfileUrl")}</span>
                <code className="text-sm bg-white px-2 py-1 rounded border">
                  {`${process.env.NEXT_PUBLIC_APP_URL || ""}/agent/${profile.slug}`}
                </code>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle>{t("profileInfoTitle")}</CardTitle>
            <CardDescription>
              {t("profileInfoDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SocialProfileForm
              profile={profile}
              suggestedSlug={suggestedSlug}
              userEmail={userData?.email || ""}
            />
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}

