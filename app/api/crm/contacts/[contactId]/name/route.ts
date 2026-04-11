import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { canPerformAction } from "@/lib/permissions";
import { getCurrentOrgId } from "@/lib/get-current-user";

/**
 * GET /api/crm/contacts/[contactId]/name
 *
 * Lightweight endpoint for fetching just the contact display name.
 * Used for breadcrumb navigation to display contact names instead of UUIDs.
 *
 * Response: { name: string, id: string }
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const readCheck = await canPerformAction("contact:read");
    if (!readCheck.allowed) {
      return NextResponse.json(
        { error: readCheck.reason || "Permission denied" },
        { status: 403 }
      );
    }

    const organizationId = await getCurrentOrgId();
    const { contactId } = await params;

    const contact = await prismadb.contact.findFirst({
      where: { id: contactId, organizationId },
      select: { id: true, displayName: true },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: contact.id,
      name: contact.displayName || "Unnamed Contact",
    });
  } catch (error) {
    console.error("[CONTACT_NAME_GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch contact name" },
      { status: 500 }
    );
  }
}
