import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { syncClerkUser, deleteClerkUser } from "@/lib/clerk-sync";
import { restorePersonalWorkspaceIfNeeded } from "@/lib/personal-workspace-guard";

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
      await syncClerkUser(id);
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;
    if (id) {
      await deleteClerkUser(id);
    }
  }

  // Handle organization deletion - restore personal workspaces if accidentally deleted
  if (eventType === "organization.deleted") {
    const { id, public_metadata, created_by } = evt.data as {
      id: string;
      public_metadata?: Record<string, unknown>;
      created_by?: string;
    };
    
    if (id && created_by && public_metadata) {
      try {
        await restorePersonalWorkspaceIfNeeded(id, public_metadata, created_by);
      } catch (error) {
        console.error("Error handling organization deletion:", error);
      }
    }
  }

  // Handle membership removal from personal workspace - prevent leaving
  if (eventType === "organizationMembership.deleted") {
    const data = evt.data as {
      organization?: { id: string; public_metadata?: Record<string, unknown> };
      public_user_data?: { user_id: string };
    };
    
    const orgMetadata = data.organization?.public_metadata;
    const userId = data.public_user_data?.user_id;
    const orgId = data.organization?.id;
    
    // If this was a personal workspace membership deletion, restore it
    if (orgMetadata?.type === "personal" && userId && orgId) {
      console.log(`User ${userId} left personal workspace ${orgId}. This should not happen.`);
      // The user leaving their own personal workspace shouldn't happen via UI
      // but if it does, they can re-create it through ensure-personal-workspace
    }
  }

  return new Response("Webhook processed", { status: 200 });
}

