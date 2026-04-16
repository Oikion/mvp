// @ts-nocheck
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";

// Link properties or clients TO a mandate
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const { mandateId, propertyIds, clientIds } = body;

    if (!mandateId || (!Array.isArray(propertyIds) && !Array.isArray(clientIds))) {
      return NextResponse.json(
        { error: "Invalid request: mandateId and propertyIds or clientIds array required" },
        { status: 400 }
      );
    }

    // Verify mandate belongs to organization
    const mandate = await prismadb.mandate.findFirst({
      where: { id: mandateId, organizationId },
    });

    if (!mandate) {
      return NextResponse.json(
        { error: "Mandate not found or access denied" },
        { status: 404 }
      );
    }

    const links: unknown[] = [];

    // Link properties to mandate
    if (Array.isArray(propertyIds) && propertyIds.length > 0) {
      // Verify all properties belong to organization
      const properties = await prismadb.properties.findMany({
        where: { id: { in: propertyIds }, organizationId },
      });

      if (properties.length !== propertyIds.length) {
        return NextResponse.json(
          { error: "Some properties not found or access denied" },
          { status: 404 }
        );
      }

      const propertyLinks = await Promise.all(
        propertyIds.map((propertyId: string) =>
          prismadb.mandate_Properties.upsert({
            where: {
              mandateId_propertyId: {
                mandateId,
                propertyId,
              },
            },
            create: {
              id: crypto.randomUUID(),
              mandateId,
              propertyId,
            },
            update: {},
          })
        )
      );

      links.push(...propertyLinks);
    }

    // Link clients to mandate
    if (Array.isArray(clientIds) && clientIds.length > 0) {
      // Verify all clients belong to organization
      const clients = await prismadb.clients.findMany({
        where: { id: { in: clientIds }, organizationId },
      });

      if (clients.length !== clientIds.length) {
        return NextResponse.json(
          { error: "Some clients not found or access denied" },
          { status: 404 }
        );
      }

      const clientLinks = await Promise.all(
        clientIds.map((clientId: string) =>
          prismadb.mandate_Clients.upsert({
            where: {
              mandateId_clientId: {
                mandateId,
                clientId,
              },
            },
            create: {
              id: crypto.randomUUID(),
              mandateId,
              clientId,
            },
            update: {},
          })
        )
      );

      links.push(...clientLinks);
    }

    await invalidateCache([`mandate:${mandateId}`, "mandates:list"]);

    return NextResponse.json({ links }, { status: 200 });
  } catch (error) {
    console.error("[MANDATE_LINK_ENTITIES_POST]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Unlink properties or clients FROM a mandate
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { searchParams } = new URL(req.url);
    const mandateId = searchParams.get("mandateId");
    const propertyIds = searchParams.get("propertyIds")?.split(",") || [];
    const clientIds = searchParams.get("clientIds")?.split(",") || [];

    if (!mandateId) {
      return NextResponse.json(
        { error: "mandateId is required" },
        { status: 400 }
      );
    }

    // Verify mandate belongs to organization
    const mandate = await prismadb.mandate.findFirst({
      where: { id: mandateId, organizationId },
    });

    if (!mandate) {
      return NextResponse.json(
        { error: "Mandate not found or access denied" },
        { status: 404 }
      );
    }

    // Delete property links
    if (propertyIds.length > 0) {
      await prismadb.mandate_Properties.deleteMany({
        where: {
          mandateId,
          propertyId: { in: propertyIds },
        },
      });
    }

    // Delete client links
    if (clientIds.length > 0) {
      await prismadb.mandate_Clients.deleteMany({
        where: {
          mandateId,
          clientId: { in: clientIds },
        },
      });
    }

    await invalidateCache([`mandate:${mandateId}`, "mandates:list"]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[MANDATE_LINK_ENTITIES_DELETE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Reverse direction: link mandates to a property or client
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const { propertyId, clientId, mandateIds } = body;

    if ((!propertyId && !clientId) || !Array.isArray(mandateIds)) {
      return NextResponse.json(
        { error: "Invalid request: (propertyId or clientId) and mandateIds array required" },
        { status: 400 }
      );
    }

    // Verify all mandates belong to organization
    const mandates = await prismadb.mandate.findMany({
      where: { id: { in: mandateIds }, organizationId },
    });

    if (mandates.length !== mandateIds.length) {
      return NextResponse.json(
        { error: "Some mandates not found or access denied" },
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

      const propertyLinks = await Promise.all(
        mandateIds.map((mandateId: string) =>
          prismadb.mandate_Properties.upsert({
            where: {
              mandateId_propertyId: {
                mandateId,
                propertyId,
              },
            },
            create: {
              id: crypto.randomUUID(),
              mandateId,
              propertyId,
            },
            update: {},
          })
        )
      );

      links.push(...propertyLinks);
      await invalidateCache([`property:${propertyId}`, "properties:list"]);
    }

    if (clientId) {
      // Verify client belongs to organization
      const client = await prismadb.clients.findFirst({
        where: { id: clientId, organizationId },
      });

      if (!client) {
        return NextResponse.json(
          { error: "Client not found or access denied" },
          { status: 404 }
        );
      }

      const clientLinks = await Promise.all(
        mandateIds.map((mandateId: string) =>
          prismadb.mandate_Clients.upsert({
            where: {
              mandateId_clientId: {
                mandateId,
                clientId,
              },
            },
            create: {
              id: crypto.randomUUID(),
              mandateId,
              clientId,
            },
            update: {},
          })
        )
      );

      links.push(...clientLinks);
      await invalidateCache([`account:${clientId}`, "clients:list"]);
    }

    await invalidateCache(["mandates:list"]);

    return NextResponse.json({ links }, { status: 200 });
  } catch (error) {
    console.error("[MANDATE_LINK_ENTITIES_PUT]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
