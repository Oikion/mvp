import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";

/**
 * GET /api/messaging/contacts
 *
 * Returns all contacts for the current organization that can be messaged.
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const organizationId = await getCurrentOrgId();

    // Get all active contacts for the organization
    const contacts = await prismadb.contact.findMany({
      where: {
        organizationId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        primaryPhone: true,
        displayName: true,
      },
      orderBy: [
        { lastName: "asc" },
        { firstName: "asc" },
      ],
      take: 100, // Limit for performance
    });

    // Format the response
    const formattedContacts = contacts.map((contact) => ({
      id: contact.id,
      name: contact.displayName || [contact.firstName, contact.lastName]
        .filter(Boolean)
        .join(" ") || "Unknown",
      email: contact.email,
      phone: contact.primaryPhone,
      position: null,
      clientName: null,
      clientId: null,
    }));

    return NextResponse.json({ contacts: formattedContacts });
  } catch (error) {
    console.error("[API] Get contacts error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
