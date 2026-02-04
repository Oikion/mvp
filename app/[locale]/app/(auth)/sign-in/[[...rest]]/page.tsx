import { SignIn } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";

interface SignInPageProps {
  params: Promise<{ locale: string }>;
}

/**
 * Sign-in page using Clerk's Account Portal
 * 
 * Uses Clerk's hosted sign-in page with virtual routing.
 * This provides:
 * - Full social authentication support (Google, GitHub, etc.)
 * - Automatic CAPTCHA handling
 * - Works seamlessly in development and production
 * - No custom SSO callback pages needed
 * 
 * After sign-in, users are redirected to the dashboard.
 * If user hasn't completed onboarding, the layout will redirect them.
 */
export default async function SignInPage({ params }: SignInPageProps) {
  const { locale } = await params;

  return (
    <div className="flex justify-center items-center min-h-screen px-4">
      <SignIn
        routing="virtual"
        fallbackRedirectUrl={`/${locale}/app`}
        signUpUrl={`/${locale}/app/register`}
      />
    </div>
  );
}
