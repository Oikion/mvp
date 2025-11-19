import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { syncClerkUser, deleteClerkUser } from "@/lib/clerk-sync";

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

  // Organization events - log for auditing/debugging
  // Organizations are managed entirely through Clerk, so we don't need to sync them
  // but we log these events for debugging and auditing purposes
  if (
    eventType === "organization.created" ||
    eventType === "organization.updated" ||
    eventType === "organization.deleted"
  ) {
    const organization = evt.data;
    if (eventType === "organization.deleted") {
      console.log(`Organization ${eventType}:`, {
        id: organization.id,
      });
    } else {
      console.log(`Organization ${eventType}:`, {
        id: organization.id,
        name: "name" in organization ? organization.name : undefined,
        slug: "slug" in organization ? organization.slug : undefined,
      });
    }
  }

  // Organization membership events - log for auditing
  if (
    eventType === "organizationMembership.created" ||
    eventType === "organizationMembership.updated" ||
    eventType === "organizationMembership.deleted"
  ) {
    const membership = evt.data;
    console.log(`Organization membership ${eventType}:`, {
      organizationId: membership.organization?.id,
      userId: membership.public_user_data?.user_id,
      role: membership.role,
    });
  }

  return new Response("Webhook processed", { status: 200 });
}

