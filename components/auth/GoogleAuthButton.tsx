"use client";

import { useSignIn, useSignUp } from "@clerk/nextjs";
import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GoogleAuthButtonProps {
  /** Whether this is for sign-up or sign-in */
  readonly mode: "sign-up" | "sign-in";
  /** Button text (optional, defaults based on mode) */
  readonly buttonText?: string;
  /** Additional class names */
  readonly className?: string;
  /** Disabled state */
  readonly disabled?: boolean;
}

/**
 * Google OAuth authentication button
 * Uses Clerk's authenticateWithRedirect with oauth_google strategy
 * 
 * Redirect flow:
 * - Sign-up: After Google auth → SSO callback → Onboarding
 * - Sign-in: After Google auth → SSO callback → Dashboard (or Onboarding if not completed)
 */
export function GoogleAuthButton({
  mode,
  buttonText,
  className,
  disabled = false,
}: GoogleAuthButtonProps) {
  const { signIn, isLoaded: isSignInLoaded } = useSignIn();
  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();
  const params = useParams();
  const locale = (params.locale as string) || "el";
  const [isLoading, setIsLoading] = useState(false);

  const isLoaded = mode === "sign-in" ? isSignInLoaded : isSignUpLoaded;

  const handleGoogleAuth = async () => {
    if (!isLoaded) return;
    
    setIsLoading(true);

    try {
      if (mode === "sign-up" && signUp) {
        // Sign-up flow: Google → SSO callback → Onboarding
        await signUp.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: `/${locale}/app/register/sso-callback`,
          redirectUrlComplete: `/${locale}/app/onboard`,
        });
      } else if (mode === "sign-in" && signIn) {
        // Sign-in flow: Google → SSO callback → Dashboard
        // If user hasn't completed onboarding, the layout will redirect them
        await signIn.authenticateWithRedirect({
          strategy: "oauth_google",
          redirectUrl: `/${locale}/app/sign-in/sso-callback`,
          redirectUrlComplete: `/${locale}/app`,
        });
      }
    } catch (error) {
      console.error("Google auth error:", error);
      setIsLoading(false);
    }
  };

  const defaultText = mode === "sign-up" 
    ? "Continue with Google" 
    : "Sign in with Google";

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleAuth}
      disabled={disabled || isLoading || !isLoaded}
      className={cn(
        "w-full gap-3 h-11 font-medium",
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <GoogleIcon className="h-5 w-5" />
      )}
      {buttonText || defaultText}
    </Button>
  );
}

/**
 * Google icon SVG component
 */
function GoogleIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default GoogleAuthButton;
