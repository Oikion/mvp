// @ts-nocheck
// TODO: Fix type errors
"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Building2, Check, X, Mail, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useInvitationAcceptance } from "@/hooks/useInvitationAcceptance";
import { DataPolicyConsentModal } from "@/components/data-ownership/DataPolicyConsentModal";

export function PendingOrgInvites() {
  const t = useTranslations("common");
  const { userInvitations, isLoaded } = useOrganizationList({
    userInvitations: { infinite: true },
  });

  const {
    initiateAcceptance,
    handleConsentAccept,
    handleConsentDecline,
    consentModalOpen,
    consentTarget,
    consentMode,
    isPolicyLoading,
    isProcessing,
  } = useInvitationAcceptance();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatRole = (role: string) => {
    return (
      role.replace("org:", "").charAt(0).toUpperCase() +
      role.replace("org:", "").slice(1)
    );
  };

  // The invitation currently being processed (policy loading or acceptance in flight)
  const processingId = consentTarget?.invitationId ?? null;

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const pendingInvitations = userInvitations?.data || [];

  if (pendingInvitations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t("organizationInvites.pendingInvites")}
          </CardTitle>
          <CardDescription>
            {t("organizationInvites.noPendingInvitesDescription")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {t("organizationInvites.pendingInvites")}
            <Badge variant="secondary" className="ml-2">
              {pendingInvitations.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            {t("organizationInvites.title")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingInvitations.map((invitation) => (
            <div
              key={invitation.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={invitation.publicOrganizationData.imageUrl}
                    alt={invitation.publicOrganizationData.name}
                  />
                  <AvatarFallback>
                    <Building2 className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {invitation.publicOrganizationData.name}
                  </span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{t("organizationInvites.invitedBy")}</span>
                    <Badge variant="outline" className="text-xs">
                      {formatRole(invitation.role)}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleConsentDecline()}
                  disabled={processingId === invitation.id}
                >
                  <X className="h-4 w-4 mr-1" />
                  {t("organizationInvites.decline")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => initiateAcceptance(invitation)}
                  disabled={processingId !== null}
                >
                  {processingId === invitation.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      {t("organizationInvites.accept")}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {consentModalOpen && consentTarget && consentMode && (
        <DataPolicyConsentModal
          open={consentModalOpen}
          orgName={consentTarget.orgName}
          mode={consentMode}
          variant="invitation"
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
          loading={isProcessing}
        />
      )}
    </>
  );
}

/**
 * Compact version for sidebar/dropdown display
 */
export function PendingOrgInvitesBadge() {
  const { userInvitations, isLoaded } = useOrganizationList({
    userInvitations: { infinite: true },
  });

  if (!isLoaded || !userInvitations?.data?.length) {
    return null;
  }

  return (
    <Badge
      variant="destructive"
      className="ml-auto text-xs px-1.5 py-0.5 min-w-[18px] flex items-center justify-center"
    >
      {userInvitations.data.length}
    </Badge>
  );
}
