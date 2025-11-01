"use client";

import { OrganizationProfile } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useClerkTheme } from "@/lib/clerk-theme";

export default function OrganizationProfilePage() {
  const params = useParams();
  const locale = params.locale as string || "en";
  const { appearance } = useClerkTheme();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-2">
            Organization Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your organization settings, members, and invitations.
          </p>
        </div>
        <OrganizationProfile
          routing="path"
          path={`/${locale}/organization`}
          appearance={{
            ...appearance,
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg",
            },
          }}
        />
      </div>
    </div>
  );
}

