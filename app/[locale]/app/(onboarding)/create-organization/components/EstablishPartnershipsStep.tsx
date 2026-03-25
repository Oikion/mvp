"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ConnectionAgency {
  connectionUserId: string;
  connectionName: string;
  connectionEmail: string;
  orgId: string;
  orgName: string;
  orgSlug: string;
  memberCount: number;
}

interface EstablishPartnershipsStepProps {
  data: { partnerOrgIds: string[] };
  connectionsData: { agencies: ConnectionAgency[] } | null;
  isLoadingConnections: boolean;
  onDataChange: (data: { partnerOrgIds: string[] }) => void;
}

export function EstablishPartnershipsStep({
  data,
  connectionsData,
  isLoadingConnections,
  onDataChange,
}: EstablishPartnershipsStepProps) {
  const t = useTranslations("createOrganization");

  // Deduplicate agencies by orgId, collecting all contacts per org
  const agencyMap = new Map<
    string,
    { agency: ConnectionAgency; contacts: string[] }
  >();
  for (const agency of connectionsData?.agencies ?? []) {
    if (agencyMap.has(agency.orgId)) {
      agencyMap.get(agency.orgId)!.contacts.push(agency.connectionName);
    } else {
      agencyMap.set(agency.orgId, {
        agency,
        contacts: [agency.connectionName],
      });
    }
  }
  const dedupedAgencies = Array.from(agencyMap.values());

  const selectedIds = new Set(data.partnerOrgIds);

  const toggleAgency = (orgId: string) => {
    if (selectedIds.has(orgId)) {
      onDataChange({
        partnerOrgIds: data.partnerOrgIds.filter((id) => id !== orgId),
      });
    } else {
      onDataChange({
        partnerOrgIds: [...data.partnerOrgIds, orgId],
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center flex-shrink-0 mb-4"
      >
        <h2 className="text-2xl font-bold mb-2">{t("partnerships.title")}</h2>
        <p className="text-muted-foreground">{t("partnerships.description")}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="flex-1 overflow-y-auto pr-2"
      >
        {isLoadingConnections ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border p-4 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        ) : dedupedAgencies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2
              className="h-10 w-10 text-muted-foreground/40 mb-3"
              aria-hidden="true"
            />
            <p className="text-sm text-muted-foreground">
              {t("partnerships.emptyState")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dedupedAgencies.map(({ agency, contacts }) => {
              const isSelected = selectedIds.has(agency.orgId);
              return (
                <button
                  key={agency.orgId}
                  type="button"
                  onClick={() => toggleAgency(agency.orgId)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                    "hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                  aria-pressed={isSelected}
                >
                  {/* Checkbox indicator */}
                  <div
                    className={cn(
                      "mt-0.5 h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors",
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-border"
                    )}
                    aria-hidden="true"
                  >
                    {isSelected && (
                      <svg
                        className="h-3 w-3 text-primary-foreground"
                        fill="none"
                        viewBox="0 0 12 12"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Agency icon */}
                  <div
                    className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">
                        {agency.orgName}
                      </span>
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Users className="h-3 w-3" aria-hidden="true" />
                        {t("partnerships.members", {
                          count: agency.memberCount,
                        })}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {agency.orgSlug}
                    </p>
                    {contacts.map((name, i) => (
                      <p key={i} className="text-xs text-muted-foreground mt-0.5">
                        {t("partnerships.yourContact", { name })}
                      </p>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Selection count */}
        {selectedIds.size > 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground text-center mt-4"
          >
            {t("partnerships.selected", { count: selectedIds.size })}
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
