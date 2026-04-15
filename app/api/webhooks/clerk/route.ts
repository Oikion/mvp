import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { syncClerkUser } from "@/lib/clerk-sync";
import { restorePersonalWorkspaceIfNeeded } from "@/lib/personal-workspace-guard";
import { handleUserDeparture } from "@/lib/user-departure";
import { deleteOrgData } from "@/lib/delete-org-data";
import { syncUserToMessaging, disableUserMessaging } from "@/actions/messaging";
import { prismadb } from "@/lib/prisma";
import { createClerkClient } from "@clerk/backend";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  // Get the Svix headers for verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Get the secret from environment variable
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error("Please add CLERK_WEBHOOK_SECRET to your .env");
  }

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occurred", {
      status: 400,
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  // User events
  if (eventType === "user.created" || eventType === "user.updated") {
    const { id } = evt.data;
    if (id) {
      const user = await syncClerkUser(id);
      
      // Sync user to messaging service (non-blocking)
      if (user && user.id) {
        syncUserToMessaging().catch((err) => {
          console.error("[WEBHOOK] Failed to sync user to messaging:", err);
        });
      }
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;
    if (id) {
      const dbUser = await prismadb.users.findFirst({
        where: { clerkUserId: id },
      });

      if (dbUser) {
        // Disable messaging before departure processing
        await disableUserMessaging(dbUser.id).catch((err) => {
          console.error("[WEBHOOK] Failed to disable messaging:", err);
        });

        // Extract org IDs from the webhook payload
        // When user.deleted fires, the user is already gone from Clerk,
        // so we must rely on the payload's organization_memberships
        const orgMemberships = (evt.data as { organization_memberships?: Array<{ organization: { id: string } }> })
          .organization_memberships ?? [];
        const orgIds = orgMemberships.map((m) => m.organization.id);

        // Run departure for each org the user belonged to
        for (const orgId of orgIds) {
          try {
            const result = await handleUserDeparture(dbUser.id, orgId, "ACCOUNT_DELETED");
            console.log(`[WEBHOOK] Departure for user ${dbUser.id} from org ${orgId}:`, result);
          } catch (err) {
            console.error(`[WEBHOOK] Departure failed for org ${orgId}:`, err);
          }
        }

        // Finally, delete the Users row from DB
        await prismadb.users.delete({
          where: { id: dbUser.id },
        });
        console.log(`[WEBHOOK] Deleted Users row for ${dbUser.id} (clerk: ${id})`);
      }
    }
  }

  // Handle organization deletion — hard-delete all org data, restore personal workspaces
  if (eventType === "organization.deleted") {
    const { id, public_metadata, created_by } = evt.data as {
      id: string;
      public_metadata?: Record<string, unknown>;
      created_by?: string;
    };

    if (id) {
      // 1. Delete all tenant-scoped DB data for the deleted org
      try {
        await deleteOrgData(id);
      } catch (error) {
        console.error(`[WEBHOOK] Failed to delete data for org ${id}:`, error);
        // Non-fatal: continue so personal workspace restore still runs
      }

      // 2. If this was a personal workspace, re-create it for the owner
      if (created_by && public_metadata) {
        try {
          await restorePersonalWorkspaceIfNeeded(id, public_metadata, created_by);
        } catch (error) {
          console.error("[WEBHOOK] Error restoring personal workspace after org deletion:", error);
        }
      }
    }
  }

  // Handle membership removal — Pathway E (departure service)
  if (eventType === "organizationMembership.deleted") {
    const data = evt.data as {
      organization?: { id: string; public_metadata?: Record<string, unknown> };
      public_user_data?: { user_id: string };
    };

    const orgMetadata = data.organization?.public_metadata;
    const clerkUserId = data.public_user_data?.user_id;
    const orgId = data.organization?.id;

    if (clerkUserId && orgId) {
      // Block personal workspace removal — restore membership
      if (orgMetadata?.type === "personal") {
        console.warn(`[WEBHOOK] User ${clerkUserId} removed from personal workspace ${orgId}. Restoring...`);
        try {
          const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });
          await clerk.organizations.createOrganizationMembership({
            organizationId: orgId,
            userId: clerkUserId,
            role: "org:admin",
          });
          console.log(`[WEBHOOK] Restored personal workspace membership for ${clerkUserId}`);
        } catch (restoreErr) {
          console.error("[WEBHOOK] Failed to restore personal workspace membership:", restoreErr);
        }
        // Do NOT run departure for personal workspaces
      } else {
        // Regular org membership removal — run departure
        const dbUser = await prismadb.users.findFirst({
          where: { clerkUserId },
        });

        if (dbUser) {
          try {
            const result = await handleUserDeparture(dbUser.id, orgId, "REMOVED_FROM_ORG");
            console.log(`[WEBHOOK] Departure for user ${dbUser.id} from org ${orgId}:`, result);
          } catch (err) {
            console.error(`[WEBHOOK] Departure failed for user ${dbUser.id} from org ${orgId}:`, err);
          }
        } else {
          console.warn(`[WEBHOOK] No DB user found for clerk ID ${clerkUserId} during membership removal`);
        }
      }
    }
  }

  // Handle organization invitation created - send in-app notification
  if (eventType === "organizationInvitation.created") {
    const data = evt.data as {
      id: string;
      email_address: string;
      organization_id: string;
      role: string;
      status: string;
      public_metadata?: Record<string, unknown>;
    };

    try {
      // Find the user by email
      const invitedUser = await prismadb.users.findUnique({
        where: { email: data.email_address },
      });

      // Get organization details from Clerk
      const { createClerkClient } = await import("@clerk/backend");
      const clerk = createClerkClient({
        secretKey: process.env.CLERK_SECRET_KEY,
      });
      
      let organizationName = "an organization";
      try {
        const org = await clerk.organizations.getOrganization({
          organizationId: data.organization_id,
        });
        organizationName = org.name;
      } catch (orgError) {
        console.error("[WEBHOOK] Error fetching organization:", orgError);
      }

      // If the user exists in our database, create an in-app notification
      if (invitedUser) {
        // Use system org ID for invitations since user isn't part of the org yet
        const SYSTEM_ORG_ID = "00000000-0000-0000-0000-000000000000";
        
        await prismadb.notification.create({
          data: {
            id: randomUUID(),
            userId: invitedUser.id,
            organizationId: SYSTEM_ORG_ID,
            type: "ORGANIZATION_INVITE",
            title: "Organization Invitation",
            message: `You have been invited to join "${organizationName}" as ${data.role.replace("org:", "")}.`,
            entityType: "ORGANIZATION",
            entityId: data.organization_id,
            metadata: {
              invitationId: data.id,
              organizationId: data.organization_id,
              organizationName,
              role: data.role,
              email: data.email_address,
            },
            updatedAt: new Date(),
          },
        });
        console.log(`[WEBHOOK] Created organization invite notification for user ${invitedUser.id}`);
      } else {
        console.log(`[WEBHOOK] User with email ${data.email_address} not found in database. Skipping in-app notification.`);
      }
    } catch (error) {
      console.error("[WEBHOOK] Error handling organization invitation:", error);
    }
  }

  // Handle organization invitation accepted - mark notification as read
  if (eventType === "organizationInvitation.accepted") {
    const data = evt.data as {
      id: string;
      email_address: string;
      organization_id: string;
    };

    try {
      const user = await prismadb.users.findUnique({
        where: { email: data.email_address },
      });

      if (user) {
        // Mark the organization invite notification as read
        await prismadb.notification.updateMany({
          where: {
            userId: user.id,
            type: "ORGANIZATION_INVITE",
            entityId: data.organization_id,
            read: false,
          },
          data: {
            read: true,
            readAt: new Date(),
          },
        });
        console.log(`[WEBHOOK] Marked organization invite notification as read for user ${user.id}`);
      }
    } catch (error) {
      console.error("[WEBHOOK] Error handling invitation accepted:", error);
    }
  }

  // Handle organization invitation revoked - delete notification
  if (eventType === "organizationInvitation.revoked") {
    const data = evt.data as {
      id: string;
      email_address: string;
      organization_id: string;
    };

    try {
      const user = await prismadb.users.findUnique({
        where: { email: data.email_address },
      });

      if (user) {
        // Delete the organization invite notification
        await prismadb.notification.deleteMany({
          where: {
            userId: user.id,
            type: "ORGANIZATION_INVITE",
            entityId: data.organization_id,
          },
        });
        console.log(`[WEBHOOK] Deleted organization invite notification for user ${user.id}`);
      }
    } catch (error) {
      console.error("[WEBHOOK] Error handling invitation revoked:", error);
    }
  }

  return new Response("Webhook processed", { status: 200 });
}

