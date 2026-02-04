"use client";

import { Users } from "@prisma/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { User } from "lucide-react";

import { ProfilePhotoUpload } from "./ProfilePhotoUpload";
import { ProfileForm } from "./ProfileForm";

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

    </div>
  );
}












