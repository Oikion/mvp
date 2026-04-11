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
    const contacts = await prismadb.client_Contacts.findMany({
      where: {
        organizationId,
        status: true,
      },
      select: {
        id: true,
        contact_first_name: true,
        contact_last_name: true,
        email: true,
        mobile_phone: true,
        position: true,
        Clients: {
          select: {
            id: true,
            client_name: true,
          },
        },
      },
      orderBy: [
        { contact_last_name: "asc" },
        { contact_first_name: "asc" },
      ],
      take: 100, // Limit for performance
    });

    // Format the response
    const formattedContacts = contacts.map((contact) => ({
      id: contact.id,
      name: [contact.contact_first_name, contact.contact_last_name]
        .filter(Boolean)
        .join(" ") || "Unknown",
      email: contact.email,
      phone: contact.mobile_phone,
      position: contact.position,
      clientName: contact.Clients?.client_name,
      clientId: contact.Clients?.id,
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
