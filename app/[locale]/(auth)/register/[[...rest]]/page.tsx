"use client";

import { SignUp } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useClerkTheme } from "@/lib/clerk-theme";

// Using Clerk's account portal with virtual routing
// This uses Clerk's hosted pages which handle social auth automatically
export default function RegisterPage() {
  const params = useParams();
  const locale = params.locale as string || "en";
  const { appearance } = useClerkTheme();

  return (
    <div className="flex justify-center items-center min-h-screen">
      <SignUp
        routing="path" // Uses path-based routing with Clerk's account portal features
        path={`/${locale}/register`}
        signInUrl={`/${locale}/sign-in`}
        afterSignUpUrl={`/${locale}/create-organization`}
        appearance={appearance}
      />
    </div>
  );
}


