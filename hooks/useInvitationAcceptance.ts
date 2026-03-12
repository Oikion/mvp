"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useOrganizationList } from "@clerk/nextjs";
import { useAppToast } from "@/hooks/use-app-toast";
import { recordConsent } from "@/actions/data-ownership/record-consent";
import type { DataOwnershipMode } from "@prisma/client";

interface InvitationTarget {
  invitationId: string;
  orgId: string;
  orgName: string;
}

interface OrgPolicyResponse {
  mode: DataOwnershipMode;
  policyVersion: number;
  policyNotSet: boolean;
}

/**
 * Minimal type for the Clerk invitation object from useOrganizationList.
 * We use this instead of importing Clerk's internal types to avoid coupling.
 */
interface ClerkInvitation {
  id: string;
  publicOrganizationData: {
    id: string;
    name: string;
    imageUrl: string;
  };
  accept: () => Promise<unknown>;
  role: string;
}

export function useInvitationAcceptance() {
  const router = useRouter();
  const { toast } = useAppToast();
  const { setActive } = useOrganizationList({
    userInvitations: { infinite: true },
  });

  const [consentModalOpen, setConsentModalOpen] = useState(false);
  const [consentTarget, setConsentTarget] = useState<InvitationTarget | null>(null);
  const [consentMode, setConsentMode] = useState<DataOwnershipMode | null>(null);
  const [policyVersion, setPolicyVersion] = useState(0);
  const [isPolicyLoading, setIsPolicyLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Ref to hold the active Clerk invitation object for calling .accept()
  const activeInvitationRef = useRef<ClerkInvitation | null>(null);

  const executeAcceptance = useCallback(
    async (
      invitation: ClerkInvitation,
      orgId: string,
      skipConsent: boolean,
      version: number
    ) => {
      setIsProcessing(true);
      try {
        // Step 1: Record consent (unless org has no policy)
        if (!skipConsent) {
          const consentResult = await recordConsent(orgId);
          if (!consentResult.success) {
            toast.error("consentFailed");
            return;
          }
        }

        // Step 2: Set consent cookie before Clerk accept so middleware sees it
        if (!skipConsent && version > 0) {
          document.cookie = `consent_v=${version}; path=/; max-age=86400`;
        }

        // Step 3: Accept the Clerk invitation (client-side only)
        await invitation.accept();

        // Step 4: Switch to the new organization
        if (setActive) {
          await setActive({ organization: orgId });
        }

        toast.success("invitationAccepted");
        router.refresh();
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : String(error);
        if (message.toLowerCase().includes("expired")) {
          toast.error("invitationExpired");
        } else {
          toast.error("invitationFailed");
        }
        console.error("Error accepting invitation:", error);
      } finally {
        setIsProcessing(false);
        setConsentModalOpen(false);
        setConsentTarget(null);
        setConsentMode(null);
        activeInvitationRef.current = null;
      }
    },
    [router, setActive, toast]
  );

  const initiateAcceptance = useCallback(
    async (invitation: ClerkInvitation) => {
      const orgId = invitation.publicOrganizationData.id;
      const orgName = invitation.publicOrganizationData.name;

      activeInvitationRef.current = invitation;
      setConsentTarget({ invitationId: invitation.id, orgId, orgName });
      setIsPolicyLoading(true);

      try {
        const res = await fetch(`/api/organizations/${orgId}/policy`);

        if (!res.ok) {
          // Can't load policy — skip consent, accept directly
          await executeAcceptance(invitation, orgId, true, 0);
          return;
        }

        const data: OrgPolicyResponse = await res.json();

        if (data.policyNotSet) {
          // No policy set — skip consent modal, accept directly
          await executeAcceptance(invitation, orgId, true, 0);
          return;
        }

        // Policy exists — show consent modal
        setConsentMode(data.mode);
        setPolicyVersion(data.policyVersion);
        setConsentModalOpen(true);
      } catch (error) {
        console.error("Failed to fetch org policy:", error);
        toast.error("policyLoadFailed");
        setConsentTarget(null);
        activeInvitationRef.current = null;
      } finally {
        setIsPolicyLoading(false);
      }
    },
    [executeAcceptance, toast]
  );

  const handleConsentAccept = useCallback(async () => {
    const invitation = activeInvitationRef.current;
    if (!invitation || !consentTarget) return;
    await executeAcceptance(
      invitation,
      consentTarget.orgId,
      false,
      policyVersion
    );
  }, [consentTarget, policyVersion, executeAcceptance]);

  const handleConsentDecline = useCallback(() => {
    setConsentModalOpen(false);
    setConsentTarget(null);
    setConsentMode(null);
    activeInvitationRef.current = null;
    // Invitation stays pending in Clerk — no API call
  }, []);

  return {
    initiateAcceptance,
    handleConsentAccept,
    handleConsentDecline,
    consentModalOpen,
    consentTarget,
    consentMode,
    isPolicyLoading,
    isProcessing,
  };
}
