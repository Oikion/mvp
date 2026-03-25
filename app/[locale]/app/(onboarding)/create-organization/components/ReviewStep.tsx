"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import {
  Building2,
  UserCircle,
  Shield,
  ShieldCheck,
  Users,
  Handshake,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ReviewStepProps {
  data: {
    orgName: string;
    orgSlug: string;
    dataOwnershipMode: "AGENCY" | "AGENT" | null;
    encryptionMode: "STANDARD" | "E2EE" | null;
    teammates: Array<{ email: string; name?: string; role: string }>;
    partnerOrgIds: string[];
  };
  partnerNames: Map<string, string>;
  isCreating: boolean;
  onCreateOrganization: () => void;
}

export function ReviewStep({
  data,
  partnerNames,
  isCreating,
  onCreateOrganization,
}: ReviewStepProps) {
  const t = useTranslations("createOrganization");

  const DataOwnershipIcon =
    data.dataOwnershipMode === "AGENT" ? UserCircle : Building2;
  const EncryptionIcon =
    data.encryptionMode === "E2EE" ? ShieldCheck : Shield;

  return (
    <div className="flex flex-col h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center flex-shrink-0 mb-4"
      >
        <h2 className="text-2xl font-bold mb-2">{t("review.title")}</h2>
        <p className="text-muted-foreground">{t("review.description")}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1 overflow-y-auto space-y-3 pr-2"
      >
        {/* Organization card */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {t("review.orgSection")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-1">
            <p className="font-semibold">{data.orgName || "—"}</p>
            <p className="text-sm text-muted-foreground">{data.orgSlug || "—"}</p>
          </CardContent>
        </Card>

        {/* Data Policy card */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DataOwnershipIcon
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              {t("review.dataPolicySection")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {data.dataOwnershipMode ? (
              <Badge variant="secondary" className="capitalize">
                {data.dataOwnershipMode === "AGENCY" ? "Agency" : "Agent"}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>

        {/* Encryption card */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <EncryptionIcon
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              {t("review.encryptionSection")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {data.encryptionMode ? (
              <Badge variant="secondary">
                {data.encryptionMode === "E2EE" ? "Enhanced (E2EE)" : "Standard"}
              </Badge>
            ) : (
              <span className="text-sm text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>

        {/* Teammates card */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {t("review.teammatesSection")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {data.teammates.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("review.noneYet")}</p>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground mb-2">
                  {t("review.invitations", { count: data.teammates.length })}
                </p>
                {data.teammates.map((tm, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="flex-1 truncate">
                      {tm.name ? `${tm.name} (${tm.email})` : tm.email}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {tm.role.charAt(0) + tm.role.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Partnerships card */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Handshake className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {t("review.partnershipsSection")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {data.partnerOrgIds.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("review.noneYet")}</p>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground mb-2">
                  {t("review.partnerRequests", {
                    count: data.partnerOrgIds.length,
                  })}
                </p>
                {data.partnerOrgIds.map((orgId) => (
                  <p key={orgId} className="text-sm truncate">
                    {partnerNames.get(orgId) ?? orgId}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create button */}
        <div className="pt-2 pb-4">
          <Button
            onClick={onCreateOrganization}
            disabled={isCreating}
            className="w-full"
            size="lg"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                {t("review.creating")}
              </>
            ) : (
              t("review.createButton")
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
