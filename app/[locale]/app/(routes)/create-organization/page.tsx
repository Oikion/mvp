"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { CreateOrganizationForm } from "@/components/organization/CreateOrganizationForm";

export default function CreateOrganizationPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string || "en";
  const { orgId } = useAuth();

  // If user already has an organization, redirect to main app
  useEffect(() => {
    if (orgId) {
      router.push(`/${locale}/app`);
    }
  }, [orgId, locale, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mb-2">
            Create Your Organization
          </h1>
          <p className="text-muted-foreground text-lg">
            Get started by creating your organization. You'll be able to invite team members after setup.
          </p>
        </div>
        <div className="bg-card p-8 rounded-lg border shadow-lg">
          <CreateOrganizationForm />
        </div>
      </div>
    </div>
  );
}

