"use client";

import { SignIn } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useClerkTheme } from "@/lib/clerk-theme";
import { getClerkLocale } from "@/lib/locales";

export function LoginComponent() {
  const params = useParams();
  const locale = params.locale as string || "en";
  const { appearance } = useClerkTheme();

  // Map locale to Clerk locale format
  const clerkLocale = getClerkLocale(locale);

  return (
    <div className="flex justify-center items-center py-5">
      <SignIn
        routing="path"
        path={`/${locale}/sign-in`}
        signUpUrl={`/${locale}/register`}
        afterSignInUrl={`/${locale}`}
        forceRedirectUrl={`/${locale}`}
        localization={clerkLocale}
        appearance={{
          ...appearance,
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg",
          },
        }}
      />
    </div>
  );
}
