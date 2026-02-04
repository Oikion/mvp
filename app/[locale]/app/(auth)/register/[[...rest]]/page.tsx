import { SignUp } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";
import { ReferralCodeCapture } from "../components/ReferralCodeCapture";

interface RegisterPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ref?: string }>;
}

/**
 * Register page using Clerk's Account Portal
 * 
 * Uses Clerk's hosted sign-up page with virtual routing.
 * This provides:
 * - Full social authentication support (Google, GitHub, etc.)
 * - Automatic CAPTCHA handling
 * - Works seamlessly in development and production
 * - No custom SSO callback pages needed
 * - Referral code capture via ?ref= query parameter
 * 
 * After sign-up, new users are redirected to onboarding.
 */
export default async function RegisterPage({ params, searchParams }: RegisterPageProps) {
  const { locale } = await params;
  const { ref: referralCode } = await searchParams;

  return (
    <div className="flex justify-center items-center min-h-screen px-4">
      {/* Capture referral code from URL and store in localStorage */}
      <ReferralCodeCapture referralCode={referralCode} />
      
      <SignUp
        routing="virtual"
        fallbackRedirectUrl={`/${locale}/app/onboard`}
        signInUrl={`/${locale}/app/sign-in`}
      />
    </div>
  );
}
