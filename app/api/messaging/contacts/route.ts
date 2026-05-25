import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { decryptContactForOrg } from "@/lib/model-encryption";
import { logPiiAccess } from "@/lib/pii-access-log";

/**
 * GET /api/messaging/contacts
 *
 * Returns active (non-archived, non-deleted) contacts for the current organization
 * that can be messaged. Uses the v2.0 Contact model with field-level decryption.
 */
export async function GET() {
  try {
    const { userId, orgId: organizationId } = await auth();

    if (!userId || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contacts = await prismadb.contact.findMany({
      where: {
        organizationId,
        deletedAt: null,
        archivedAt: null,
        doNotContact: false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        displayName: true,
        email: true,
        primaryPhone: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 100,
    });

    const decrypted = await Promise.all(
      contacts.map(async (c) => {
        const dec = await decryptContactForOrg(c, organizationId);
        // fire-and-forget PII access log
        logPiiAccess({
          userId,
          organizationId,
          entityType: "CONTACT",
          entityId: c.id,
          action: "DECRYPT",
          fields: ["firstName", "lastName", "displayName", "email", "primaryPhone"],
          source: "GET /api/messaging/contacts",
        }).catch(() => {});
        return dec;
      })
    );

    const formattedContacts = decrypted.map((contact) => ({
      id: contact.id,
      name: contact.displayName || "Unknown",
      email: contact.email ?? null,
      phone: contact.primaryPhone ?? null,
      position: null,
      clientName: null,
      clientId: null,
    }));

    return NextResponse.json({ contacts: formattedContacts });
  } catch (error) {
    console.error("[MESSAGING_CONTACTS]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
