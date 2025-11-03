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
      // Redirect URLs are configured in Clerk Dashboard
      afterSignInUrl={`/${locale}`}
      afterSignUpUrl={`/${locale}/create-organization`}
    >
      {children}
    </ClerkProvider>
  );
}

