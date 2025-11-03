"use client";

import { SignUp } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { useClerkTheme } from "@/lib/clerk-theme";
import { availableLocales, getClerkLocale } from "@/lib/locales";

export function RegisterComponent() {
  const params = useParams();
  const locale = params.locale as string || "en";
  const { appearance } = useClerkTheme();

  // Map locale to Clerk locale format
  const clerkLocale = getClerkLocale(locale);

  return (
    <div className="flex justify-center items-center py-5">
      <SignUp
        routing="path"
        path={`/${locale}/register`}
        signInUrl={`/${locale}/sign-in`}
        afterSignUpUrl={`/${locale}/create-organization`}
        forceRedirectUrl={`/${locale}/create-organization`}
        localization={clerkLocale}
        additionalFields={[
          {
            name: "language",
            label: "Language",
            type: "select",
            required: true,
            options: availableLocales.map((locale) => ({
              value: locale.code,
              label: locale.name,
            })),
          },
        ]}
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
