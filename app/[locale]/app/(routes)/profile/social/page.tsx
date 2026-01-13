import { getMyAgentProfile, generateUniqueSlug } from "@/actions/social/profile";
import { getUser } from "@/actions/get-user";
import Container from "../../components/ui/Container";
import { SocialProfileForm } from "./components/SocialProfileForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Eye, EyeOff, ExternalLink } from "lucide-react";
import Link from "next/link";

export default async function SocialProfilePage() {
  const [profile, userData] = await Promise.all([
    getMyAgentProfile(),
    getUser(),
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
      title="Public Profile"
      description="Manage your public agent profile visible to the world"
    >
      <div className="space-y-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle>Profile Status</CardTitle>
                  <CardDescription>
                    Control your public presence
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {profile?.visibility === "PUBLIC" ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                    <Eye className="h-3 w-3 mr-1" />
                    Public
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <EyeOff className="h-3 w-3 mr-1" />
                    Private
                  </Badge>
                )}
                {profile?.slug && profile?.visibility === "PUBLIC" && (
                  <Link
                    href={`/agent/${profile.slug}`}
                    target="_blank"
                    className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    View Profile
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          </CardHeader>
          {profile?.slug && (
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                <span className="text-sm text-gray-500">Your profile URL:</span>
                <code className="text-sm bg-white px-2 py-1 rounded border">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/agent/${profile.slug}`
                    : `/agent/${profile.slug}`}
                </code>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              This information will be displayed publicly on your agent profile page
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

