"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { DataPolicyConsentModal } from "@/components/data-ownership/DataPolicyConsentModal";
import { recordConsent } from "@/actions/data-ownership/record-consent";
import { toast } from "sonner";
import type { DataOwnershipMode } from "@prisma/client";

interface ConsentRequiredClientProps {
  mode: DataOwnershipMode;
  orgName: string;
  originalMode: DataOwnershipMode | null;
  policyVersion: number;
}

export function ConsentRequiredClient({
  mode,
  orgName,
  originalMode,
  policyVersion,
}: ConsentRequiredClientProps) {
  const t = useTranslations("dataOwnership.consentRequired");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAccept() {
    setLoading(true);
    try {
      const result = await recordConsent();
      if (result.success) {
        // Set consent cookie so middleware doesn't redirect again
        document.cookie = `consent_v=${policyVersion}; path=/; max-age=86400`;
        toast.success("Consent recorded");
        router.push("/app");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to record consent");
    } finally {
      setLoading(false);
    }
  }

  async function handleLeave() {
    // Trigger departure via leaving the org — handled by Clerk webhook
    // For now, redirect to settings where they can formally leave
    router.push("/app/settings");
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      <DataPolicyConsentModal
        open={true}
        orgName={orgName}
        mode={mode}
        variant="policy-change"
        originalMode={originalMode ?? undefined}
        onAccept={handleAccept}
        onDecline={handleLeave}
        loading={loading}
      />
    </div>
  );
}
