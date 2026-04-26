import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { logEntityLinkedSymmetric, logEntityUnlinkedSymmetric } from "@/lib/activity-logger";

/**
 * POST /api/requests/link-entities
 * Link properties or contacts TO a request
 * Body: { requestId, propertyIds?, contactIds? }
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const { requestId, propertyIds, contactIds } = body;

    if (!requestId || (!Array.isArray(propertyIds) && !Array.isArray(contactIds))) {
      return NextResponse.json(
        { error: "Invalid request: requestId and propertyIds or contactIds array required" },
        { status: 400 }
      );
    }

    // Verify request belongs to organization
    const request = await prismadb.request.findFirst({
      where: { id: requestId, organizationId },
    });

    if (!request) {
      return NextResponse.json(
        { error: "Request not found or access denied" },
        { status: 404 }
      );
    }

    const links: unknown[] = [];

    // Link properties to request via PropertyRequestMatch
    if (Array.isArray(propertyIds) && propertyIds.length > 0) {
      const properties = await prismadb.properties.findMany({
        where: { id: { in: propertyIds }, organizationId },
      });

      if (properties.length !== propertyIds.length) {
        return NextResponse.json(
          { error: "Some properties not found or access denied" },
          { status: 404 }
        );
      }

      const propertyLinks = await prismadb.propertyRequestMatch.createMany({
        data: propertyIds.map((propertyId: string) => ({
          organizationId,
          propertyId,
          requestId,
          matchMethod: "MANUAL",
          status: "PENDING",
        })),
        skipDuplicates: true,
      });

      links.push(propertyLinks);
    }

    // Link contacts to request via RequestContact
    if (Array.isArray(contactIds) && contactIds.length > 0) {
      const contacts = await prismadb.contact.findMany({
        where: { id: { in: contactIds }, organizationId },
      });

      if (contacts.length !== contactIds.length) {
        return NextResponse.json(
          { error: "Some contacts not found or access denied" },
          { status: 404 }
        );
      }

      const contactLinks = await prismadb.requestContact.createMany({
        data: contactIds.map((contactId: string) => ({
          organizationId,
          requestId,
          contactId,
        })),
        skipDuplicates: true,
      });

      links.push(contactLinks);

      // Activity log — symmetric link for each contact (fire-and-forget).
      // Labels stay generic because Request.title and Contact.displayName are
      // encrypted at rest.
      if (organizationId) {
        for (const contactId of contactIds as string[]) {
          void logEntityLinkedSymmetric({
            organizationId,
            aType: "REQUEST",
            aId: requestId,
            aLabel: "Request",
            aUrl: `/app/requests/${requestId}`,
            bType: "CONTACT",
            bId: contactId,
            bLabel: "Contact",
            bUrl: `/app/crm/contacts/${contactId}`,
            createdByUserId: user?.id,
          });
        }
      }
    }

    await invalidateCache([`request:${requestId}`, "requests:list"]);

    return NextResponse.json({ links }, { status: 200 });
  } catch (error) {
    console.error("[REQUEST_LINK_ENTITIES_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * DELETE /api/requests/link-entities
 * Unlink properties or contacts FROM a request
 * Query: ?requestId=<id>&propertyIds=<csv>&contactIds=<csv>
 */
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");
    const propertyIds = searchParams.get("propertyIds")?.split(",").filter(Boolean) || [];
    const contactIds = searchParams.get("contactIds")?.split(",").filter(Boolean) || [];

    if (!requestId) {
      return NextResponse.json(
        { error: "requestId is required" },
        { status: 400 }
      );
    }

    // Verify request belongs to organization
    const request = await prismadb.request.findFirst({
      where: { id: requestId, organizationId },
    });

    if (!request) {
      return NextResponse.json(
        { error: "Request not found or access denied" },
        { status: 404 }
      );
    }

    // Delete property links
    if (propertyIds.length > 0) {
      await prismadb.propertyRequestMatch.deleteMany({
        where: {
          requestId,
          propertyId: { in: propertyIds },
          organizationId,
        },
      });
    }

    // Delete contact links
    if (contactIds.length > 0) {
      await prismadb.requestContact.deleteMany({
        where: {
          requestId,
          contactId: { in: contactIds },
        },
      });

      // Activity log — symmetric unlink for each contact (fire-and-forget).
      if (organizationId) {
        for (const contactId of contactIds) {
          void logEntityUnlinkedSymmetric({
            organizationId,
            aType: "REQUEST",
            aId: requestId,
            aLabel: "Request",
            aUrl: `/app/requests/${requestId}`,
            bType: "CONTACT",
            bId: contactId,
            bLabel: "Contact",
            bUrl: `/app/crm/contacts/${contactId}`,
            createdByUserId: user?.id,
          });
        }
      }
    }

    await invalidateCache([`request:${requestId}`, "requests:list"]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[REQUEST_LINK_ENTITIES_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * PUT /api/requests/link-entities
 * Reverse direction: link requests to a property or contact
 * Body: { propertyId?, contactId?, requestIds[] }
 */
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const { propertyId, contactId, requestIds } = body;

    if ((!propertyId && !contactId) || !Array.isArray(requestIds)) {
      return NextResponse.json(
        { error: "Invalid request: (propertyId or contactId) and requestIds array required" },
        { status: 400 }
      );
    }

    // Verify all requests belong to organization
    const requests = await prismadb.request.findMany({
      where: { id: { in: requestIds }, organizationId },
    });

    if (requests.length !== requestIds.length) {
      return NextResponse.json(
        { error: "Some requests not found or access denied" },
        { status: 404 }
      );
    }

    const links: unknown[] = [];

    if (propertyId) {
      // Verify property belongs to organization
      const property = await prismadb.properties.findFirst({
        where: { id: propertyId, organizationId },
      });

      if (!property) {
        return NextResponse.json(
          { error: "Property not found or access denied" },
          { status: 404 }
        );
      }

      const propertyLinks = await prismadb.propertyRequestMatch.createMany({
        data: requestIds.map((reqId: string) => ({
          organizationId,
          propertyId,
          requestId: reqId,
          matchMethod: "MANUAL",
          status: "PENDING",
        })),
        skipDuplicates: true,
      });

      links.push(propertyLinks);
      await invalidateCache([`property:${propertyId}`, "properties:list"]);
    }

    if (contactId) {
      // Verify contact belongs to organization
      const contact = await prismadb.contact.findFirst({
        where: { id: contactId, organizationId },
      });

      if (!contact) {
        return NextResponse.json(
          { error: "Contact not found or access denied" },
          { status: 404 }
        );
      }

      const contactLinks = await prismadb.requestContact.createMany({
        data: requestIds.map((reqId: string) => ({
          organizationId,
          requestId: reqId,
          contactId,
        })),
        skipDuplicates: true,
      });

      links.push(contactLinks);

      // Activity log — symmetric link for each request (fire-and-forget).
      if (organizationId) {
        for (const reqId of requestIds as string[]) {
          void logEntityLinkedSymmetric({
            organizationId,
            aType: "REQUEST",
            aId: reqId,
            aLabel: "Request",
            aUrl: `/app/requests/${reqId}`,
            bType: "CONTACT",
            bId: contactId,
            bLabel: "Contact",
            bUrl: `/app/crm/contacts/${contactId}`,
            createdByUserId: user?.id,
          });
        }
      }

      await invalidateCache([`contact:${contactId}`, "contacts:list"]);
    }

    await invalidateCache(["requests:list"]);

    return NextResponse.json({ links }, { status: 200 });
  } catch (error) {
    console.error("[REQUEST_LINK_ENTITIES_PUT]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
