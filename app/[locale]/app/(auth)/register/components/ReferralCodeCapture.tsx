"use client";

import { useEffect, useState } from "react";
import { validateReferralCode } from "@/actions/referrals/track-referral";
import { Badge } from "@/components/ui/badge";
import { Gift, CheckCircle } from "lucide-react";

interface ReferralCodeCaptureProps {
  referralCode?: string;
}

const REFERRAL_CODE_KEY = "oikion_referral_code";

/**
 * Component to capture and validate referral codes from URL
 * Stores valid codes in localStorage for processing after onboarding
 */
export function ReferralCodeCapture({ referralCode }: ReferralCodeCaptureProps) {
  const [validatedReferrer, setValidatedReferrer] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    async function captureReferralCode() {
      if (!referralCode) return;

      setIsValidating(true);
      try {
        // Validate the referral code
        const result = await validateReferralCode(referralCode);

        if (result.valid) {
          // Store in localStorage for processing after onboarding
          localStorage.setItem(REFERRAL_CODE_KEY, referralCode);
          setValidatedReferrer(result.referrerName || "A friend");
        } else {
          // Invalid code - remove any existing stored code
          localStorage.removeItem(REFERRAL_CODE_KEY);
        }
      } catch (error) {
        console.error("Failed to validate referral code:", error);
        localStorage.removeItem(REFERRAL_CODE_KEY);
      } finally {
        setIsValidating(false);
      }
    }

    captureReferralCode();
  }, [referralCode]);

  // Show a subtle indicator if referred
  if (!validatedReferrer || isValidating) {
    return null;
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
      <Badge variant="secondary" className="gap-2 px-4 py-2 text-sm shadow-lg">
        <Gift className="h-4 w-4 text-primary" />
        <span>Referred by {validatedReferrer}</span>
        <CheckCircle className="h-4 w-4 text-success" />
      </Badge>
    </div>
  );
}

/**
 * Get stored referral code from localStorage
 */
export function getStoredReferralCode(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFERRAL_CODE_KEY);
}

/**
 * Clear stored referral code from localStorage
 */
export function clearStoredReferralCode(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(REFERRAL_CODE_KEY);
}
