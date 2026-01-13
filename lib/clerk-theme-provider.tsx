"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useClerkTheme } from "@/lib/clerk-theme";
import { useParams } from "next/navigation";

/**
 * ClerkThemeProvider - Wraps ClerkProvider with theme support
 * 
 * This provider:
 * 1. Configures Clerk appearance based on current theme
 * 2. Sets fallback redirect URLs for authentication
 * 
 * We use Clerk's Account Portal (accounts.oikion.com) for authentication.
 * The redirect URLs here are fallbacks - the main redirect is handled by:
 * 1. The redirect_url parameter in Account Portal links
 * 2. Clerk Dashboard → Paths settings
 * 
 * Redirect URLs:
 * - signInFallbackRedirectUrl: Dashboard after sign-in
 * - signUpFallbackRedirectUrl: Onboarding after sign-up (new users)
 * - afterSignOutUrl: Landing page after sign-out
 */
export function ClerkThemeProvider({ children }: { children: React.ReactNode }) {
  const { appearance } = useClerkTheme();
  const params = useParams();
  const locale = (params.locale as string) || "el";

  return (
    <ClerkProvider 
      appearance={appearance}
      // Fallback redirect URLs for authentication
      // Sign-in: Redirect to dashboard (layout handles onboarding check)
      signInFallbackRedirectUrl={`/${locale}/app`}
      // Sign-up: Redirect to onboarding for new users
      signUpFallbackRedirectUrl={`/${locale}/app/onboard`}
      // After sign-out: Redirect to landing page
      afterSignOutUrl={`/${locale}`}
    >
      {children}
    </ClerkProvider>
  );
}
