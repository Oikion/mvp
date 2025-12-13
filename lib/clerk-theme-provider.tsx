"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useClerkTheme } from "@/lib/clerk-theme";
import { useParams } from "next/navigation";

export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  const { appearance } = useClerkTheme();
  const params = useParams();
  const locale = params.locale as string || "en";

  return (
    <ClerkProvider 
      appearance={appearance}
      // Using Clerk's account portal (hosted pages)
      // Redirect to custom onboarding after sign up
      afterSignInUrl={`/${locale}`}
      afterSignUpUrl={`/${locale}/onboard`}
    >
      {children}
    </ClerkProvider>
  );
}

