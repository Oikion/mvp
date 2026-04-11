import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { decryptClientForOrg, decryptMandateForOrg, decryptDocumentForOrg } from "@/lib/model-encryption";

/**
 * GET /api/documents/[documentId]/linked
 * Fetch all linked entities for a document
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const { documentId } = await params;

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Verify document belongs to organization
    const document = await prismadb.documents.findFirst({
      where: {
        id: documentId,
        organizationId,
      },
      select: {
        id: true,
        friendlyId: true,
        document_name: true,
        Clients: {
          select: {
            id: true,
            friendlyId: true,
            client_name: true,
            client_type: true,
            client_status: true,
            primary_email: true,
            primary_phone: true,
            Users_Clients_assigned_toToUsers: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        Properties: {
          select: {
            id: true,
            friendlyId: true,
            property_name: true,
            property_type: true,
            property_status: true,
            address_street: true,
            address_city: true,
            area: true,
            price: true,
            bedrooms: true,
            bathrooms: true,
            Users_Properties_assigned_toToUsers: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        Mandates: {
          select: {
            id: true,
            friendlyId: true,
            title: true,
            transaction_type: true,
            status: true,
            urgency: true,
            budget_min: true,
            budget_max: true,
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found or access denied" },
        { status: 404 }
      );
    }

    // Decrypt client names
    const clients = await Promise.all(
      document.Clients.map(async (client) => {
        const decrypted = await decryptClientForOrg(client, organizationId);
        return {
          ...decrypted,
          assigned_to_user: client.Users_Clients_assigned_toToUsers,
        };
      })
    );

    // Map properties with assigned user
    const properties = document.Properties.map((property) => ({
      ...property,
      assigned_to_user: property.Users_Properties_assigned_toToUsers,
      Users_Properties_assigned_toToUsers: undefined,
    }));

    // Decrypt mandate titles
    const mandates = await Promise.all(
      document.Mandates.map(async (mandate) => {
        return decryptMandateForOrg(mandate, organizationId);
      })
    );

    // Serialize Prisma objects (Decimal, Date, etc.)
    const serializePrismaObject = (obj: any): any => {
      if (obj === null || obj === undefined) return obj;
      if (obj && typeof obj === "object" && "toNumber" in obj && typeof obj.toNumber === "function") {
        return obj.toNumber();
      }
      if (obj instanceof Date) return obj.toISOString();
      if (Array.isArray(obj)) return obj.map(serializePrismaObject);
      if (typeof obj === "object") {
        const serialized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          serialized[key] = serializePrismaObject(value);
        }
        return serialized;
      }
      return obj;
    };

    return NextResponse.json({
      document: { id: document.id, friendlyId: document.friendlyId },
      clients: serializePrismaObject(clients),
      properties: serializePrismaObject(properties),
      mandates: serializePrismaObject(mandates),
      counts: {
        clients: clients.length,
        properties: properties.length,
        mandates: mandates.length,
      },
    });
  } catch (error) {
    console.error("[DOCUMENT_LINKED_GET]", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch linked entities", details: errorMessage },
      { status: 500 }
    );
  }
}
