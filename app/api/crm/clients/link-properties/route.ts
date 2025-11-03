import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";

// Link properties to a client
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const { clientId, propertyIds } = body;

    if (!clientId || !Array.isArray(propertyIds)) {
      return new NextResponse("Invalid request: clientId and propertyIds array required", { status: 400 });
    }

    // Verify client belongs to organization
    const client = await prismadb.clients.findFirst({
      where: { id: clientId, organizationId },
    });

    if (!client) {
      return new NextResponse("Client not found or access denied", { status: 404 });
    }

    // Verify all properties belong to organization
    const properties = await prismadb.properties.findMany({
      where: { id: { in: propertyIds }, organizationId },
    });

    if (properties.length !== propertyIds.length) {
      return new NextResponse("Some properties not found or access denied", { status: 404 });
    }

    // Create links (Prisma will handle duplicates via unique constraint)
    const links = await Promise.all(
      propertyIds.map((propertyId: string) =>
        prismadb.client_Properties.upsert({
          where: {
            clientId_propertyId: {
              clientId,
              propertyId,
            },
          },
          create: {
            clientId,
            propertyId,
          },
          update: {},
        })
      )
    );

    await invalidateCache([`account:${clientId}`, "clients:list"]);

    return NextResponse.json({ links }, { status: 200 });
  } catch (error) {
    console.log("[LINK_PROPERTIES_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// Unlink properties from a client
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const propertyIds = searchParams.get("propertyIds")?.split(",") || [];

    if (!clientId) {
      return new NextResponse("clientId is required", { status: 400 });
    }

    // Verify client belongs to organization
    const client = await prismadb.clients.findFirst({
      where: { id: clientId, organizationId },
    });

    if (!client) {
      return new NextResponse("Client not found or access denied", { status: 404 });
    }

    // Delete links
    await prismadb.client_Properties.deleteMany({
      where: {
        clientId,
        propertyId: { in: propertyIds },
      },
    });

    await invalidateCache([`account:${clientId}`, "clients:list"]);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.log("[UNLINK_PROPERTIES_DELETE]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

// Link clients to a property
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();
    const { propertyId, clientIds } = body;

    if (!propertyId || !Array.isArray(clientIds)) {
      return new NextResponse("Invalid request: propertyId and clientIds array required", { status: 400 });
    }

    // Verify property belongs to organization
    const property = await prismadb.properties.findFirst({
      where: { id: propertyId, organizationId },
    });

    if (!property) {
      return new NextResponse("Property not found or access denied", { status: 404 });
    }

    // Verify all clients belong to organization
    const clients = await prismadb.clients.findMany({
      where: { id: { in: clientIds }, organizationId },
    });

    if (clients.length !== clientIds.length) {
      return new NextResponse("Some clients not found or access denied", { status: 404 });
    }

    // Create links
    const links = await Promise.all(
      clientIds.map((clientId: string) =>
        prismadb.client_Properties.upsert({
          where: {
            clientId_propertyId: {
              clientId,
              propertyId,
            },
          },
          create: {
            clientId,
            propertyId,
          },
          update: {},
        })
      )
    );

    await invalidateCache([`property:${propertyId}`, "properties:list"]);

    return NextResponse.json({ links }, { status: 200 });
  } catch (error) {
    console.log("[LINK_CLIENTS_PUT]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

