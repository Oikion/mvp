"use client";

import { Users } from "@prisma/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { User, Sparkles } from "lucide-react";

import { ProfilePhotoUpload } from "./ProfilePhotoUpload";
import { ProfileForm } from "./ProfileForm";
import { OpenAiForm } from "./OpenAiForm";

interface ProfileTabProps {
  user: Users;
}

export function ProfileTab({ user }: ProfileTabProps) {
  return (
    <div className="space-y-6">
      {/* Profile Photo */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Profile Photo</CardTitle>
              <CardDescription>
                Upload a photo to personalize your profile
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ProfilePhotoUpload user={user} />
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            Update your name and account details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm data={user} />
        </CardContent>
      </Card>

      <Separator />

      {/* OpenAI Integration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>AI Integration</CardTitle>
              <CardDescription>
                Connect your OpenAI API key for AI-powered features
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <OpenAiForm userId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}



