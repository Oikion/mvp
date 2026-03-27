"use server";

// orgId accepted from client because the org was just created client-side.
// We verify the caller is the org owner via Clerk backend before proceeding.
// See: docs/decisions/2026-03-20-org-creation-wizard-and-onboarding-slimming-design.md

import { auth, clerkClient } from "@clerk/nextjs/server";
import { z } from "zod";

import { prismadb } from "@/lib/prisma";
import { requireAuth } from "@/lib/permissions/action-guards";
import { actionSuccess, actionError, type ActionResponse } from "@/lib/action-response";
import { getOrgDek } from "@/lib/key-management";

// =============================================================================
// Input schema
// =============================================================================

const wizardDataSchema = z
  .object({
    encryptionMode: z.enum(["STANDARD", "E2EE"]),
    dataOwnershipMode: z.enum(["AGENCY", "AGENT"]),
    teammates: z
      .array(
        z
          .object({
            email: z.string().email(),
            role: z.enum(["ADMIN", "AGENT", "VIEWER"]),
          })
          .strict()
      )
      .max(50),
    partnerOrgIds: z.array(z.string().min(1)).max(20),
    networkMembership: z.enum(["NONE", "POOL", "BILATERAL", "BOTH"]).optional(),
    networkPrivacy: z.enum(["ANONYMIZED", "AGENCY_IDENTIFIED", "FULL"]).optional(),
  })
  .strict();

// =============================================================================
// Action
// =============================================================================

export async function finalizeOrganizationSetup(
  orgId: string,
  wizardData: z.infer<typeof wizardDataSchema>
): Promise<ActionResponse<{ warnings: string[] }>> {
  // 1. Auth guard
  const guard = await requireAuth();
  if (guard) return guard;

  // 2. Get Clerk userId
  const { userId } = await auth();
  if (!userId) {
    return actionError("Authentication required", "UNAUTHENTICATED");
  }

  // 3. Validate orgId
  if (!orgId || typeof orgId !== "string" || orgId.trim().length === 0) {
    return actionError("Invalid organization ID", "VALIDATION_ERROR");
  }

  // 4. Validate wizard data
  const validation = wizardDataSchema.safeParse(wizardData);
  if (!validation.success) {
    return actionError(
      "Validation failed",
      "VALIDATION_ERROR"
    );
  }
  const validated = validation.data;

  const clerk = (await clerkClient()) as any;

  // 5. Verify caller is org owner via Clerk backend
  let memberships: any;
  try {
    memberships = await clerk.organizations.getOrganizationMembershipList({
      organizationId: orgId,
    });
  } catch (err) {
    console.error("[FINALIZE_ORG_SETUP] Failed to fetch org memberships", {
      orgId,
      err: String(err),
    });
    return actionError("Failed to verify organization ownership", "EXTERNAL_SERVICE_ERROR");
  }

  const callerMembership = memberships.data.find(
    (m: any) => m.publicUserData?.userId === userId
  );
  if (!callerMembership || callerMembership.role !== "org:admin") {
    return actionError("Not org owner", "FORBIDDEN");
  }

  // Ensure setup has not already been completed by another admin (org was just created)
  const adminMembers = memberships.data.filter((m: any) => m.role === "org:admin");
  if (adminMembers.length > 1) {
    return actionError("Organization setup already completed by another admin", "CONFLICT");
  }

  // 6. Check per-user agency quota (max 5)
  let userOrgs: any;
  try {
    userOrgs = await clerk.users.getOrganizationMembershipList({ userId });
  } catch (err) {
    console.error("[FINALIZE_ORG_SETUP] Failed to fetch user org memberships", {
      userId,
      err: String(err),
    });
    return actionError("Failed to verify organization quota", "EXTERNAL_SERVICE_ERROR");
  }

  const agencyCount = (userOrgs.data as any[]).filter(
    (m) => (m.organization?.publicMetadata as any)?.type === "agency"
  ).length;
  if (agencyCount >= 5) {
    return actionError("Organization limit reached (max 5 agencies)", "FORBIDDEN");
  }

  const warnings: string[] = [];

  // 7. Upsert OrganizationSettings with encryptionMode, dataOwnershipMode, policyHistory, policyVersion
  const now = new Date().toISOString();
  try {
    await prismadb.organizationSettings.upsert({
      where: { organizationId: orgId },
      create: {
        organizationId: orgId,
        createdBy: userId,
        encryptionMode: validated.encryptionMode,
        dataOwnershipMode: validated.dataOwnershipMode,
        dataOwnershipSetAt: new Date(),
        policyVersion: 1,
        policyHistory: [
          { mode: validated.dataOwnershipMode, from: now, to: null },
        ],
      },
      update: {
        // Intentionally empty — if settings already exist on a retry, preserve them as-is.
        // policyHistory intentionally omitted — do not overwrite on retry.
        // encryptionMode is immutable and must not be overwritten.
      },
    });
  } catch (err) {
    console.error("[FINALIZE_ORG_SETUP] Failed to upsert OrganizationSettings", {
      orgId,
      err: String(err),
    });
    return actionError("Failed to save organization settings", "INTERNAL_ERROR");
  }

  // 8. Update Clerk org metadata to mark as agency
  try {
    await clerk.organizations.updateOrganization({
      organizationId: orgId,
      publicMetadata: { type: "agency" },
    });
  } catch (err) {
    console.error("[FINALIZE_ORG_SETUP] Failed to update Clerk org metadata", {
      orgId,
      err: String(err),
    });
    warnings.push("Failed to update organization type metadata");
  }

  // 9. Send invitations (best-effort)
  if (validated.teammates.length > 0) {
    const inviteResults = await Promise.allSettled(
      validated.teammates.map((t) =>
        clerk.organizations.createOrganizationInvitation({
          organizationId: orgId,
          emailAddress: t.email,
          role: `org:${t.role.toLowerCase()}`,
          inviterUserId: userId,
        })
      )
    );

    const failedInvites = inviteResults
      .map((r, i) => ({ result: r, email: validated.teammates[i].email }))
      .filter(({ result }) => result.status === "rejected");

    if (failedInvites.length > 0) {
      const failedEmails = failedInvites.map(({ email }) => email).join(", ");
      console.error("[FINALIZE_ORG_SETUP] Some invitations failed", {
        orgId,
        failedEmails,
        errors: failedInvites.map(({ result }) =>
          result.status === "rejected" ? String(result.reason) : ""
        ),
      });
      warnings.push(`Failed to send invitations to: ${failedEmails}`);
    }
  }

  // 10. Create partnership records (best-effort, skip self + duplicates)
  const partnerIdsToProcess = validated.partnerOrgIds.filter((id) => id !== orgId);

  let partnershipCount = 0;

  if (partnerIdsToProcess.length > 0) {
    const partnerResults = await Promise.allSettled(
      partnerIdsToProcess.map(async (partnerOrgId) => {
        // Verify target org exists and is an agency
        try {
          const targetOrg = await clerk.organizations.getOrganization({ organizationId: partnerOrgId });
          if ((targetOrg?.publicMetadata as any)?.type !== "agency") {
            warnings.push(`Skipped partnership with ${partnerOrgId}: not an agency`);
            return;
          }
        } catch {
          warnings.push(`Skipped partnership with ${partnerOrgId}: org not found`);
          return;
        }

        // Create partnership record; handle unique constraint race gracefully
        try {
          await prismadb.orgNetworkPartner.create({
            data: { initiatorOrgId: orgId, partnerOrgId, status: "PENDING" },
          });
          partnershipCount++;
        } catch (err: any) {
          if (err?.code === "P2002") {
            // Already exists (duplicate or race condition) — skip silently
          } else {
            throw err;
          }
        }
      })
    );

    const failedPartners = partnerResults
      .map((r, i) => ({ result: r, orgId: partnerIdsToProcess[i] }))
      .filter(({ result }) => result.status === "rejected");

    if (failedPartners.length > 0) {
      console.error("[FINALIZE_ORG_SETUP] Some partnership requests failed", {
        orgId,
        failedPartnerOrgIds: failedPartners.map(({ orgId: id }) => id),
        errors: failedPartners.map(({ result }) =>
          result.status === "rejected" ? String(result.reason) : ""
        ),
      });
      warnings.push(
        `Failed to create ${failedPartners.length} partnership request(s)`
      );
    }
  }

  // 11. If E2EE mode, initialize DEK
  if (validated.encryptionMode === "E2EE") {
    try {
      await getOrgDek(orgId);
    } catch (err) {
      console.error("[FINALIZE_ORG_SETUP] Failed to initialize DEK for E2EE org", {
        orgId,
        err: String(err),
      });
      warnings.push("Failed to initialize encryption key — contact support if issues persist");
    }
  }

  // 12. Save Polis network settings (if provided and not NONE-only defaults)
  if (validated.networkMembership && validated.networkMembership !== "NONE") {
    try {
      await prismadb.orgNetworkSettings.upsert({
        where: { organizationId: orgId },
        create: {
          organizationId: orgId,
          membership: validated.networkMembership,
          propertyPrivacyLevel: validated.networkPrivacy ?? "ANONYMIZED",
          mandatePrivacyLevel: validated.networkPrivacy ?? "ANONYMIZED",
          shareProperties: true,
          shareMandates: true,
        },
        update: {
          membership: validated.networkMembership,
          propertyPrivacyLevel: validated.networkPrivacy ?? "ANONYMIZED",
          mandatePrivacyLevel: validated.networkPrivacy ?? "ANONYMIZED",
        },
      });
    } catch (err) {
      console.error("[FINALIZE_ORG_SETUP] Failed to save network settings", {
        orgId,
        err: String(err),
      });
      warnings.push("Failed to save matchmaking network settings — you can configure them later from Settings");
    }
  }

  return actionSuccess({ warnings });
}
